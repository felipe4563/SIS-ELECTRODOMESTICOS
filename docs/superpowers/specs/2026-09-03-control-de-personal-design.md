# Control de personal: Asistencia con geolocalización + Historial laboral

Fecha: 2026-09-03

## Contexto y objetivo

El módulo de Usuarios ya tiene una ficha de datos personales (cargo, contacto
de emergencia, fecha de nacimiento, fecha de ingreso — migración 21). El
siguiente paso es "control de personal" propiamente dicho:

1. **Asistencia**: que cada empleado marque su entrada/salida desde el
   sistema, validando por GPS que está físicamente en su sucursal, y que se
   detecten automáticamente tardanzas y faltas.
2. **Historial laboral**: dejar registro automático de cuándo cambia el
   cargo, la sucursal o el porcentaje de comisión de un empleado.

No incluye (fuera de alcance de este spec): vacaciones/permisos formales,
documentos adjuntos del empleado, llamadas de atención/sanciones, notas
libres de RRHH. Se puede retomar como una fase posterior.

## Modelo de datos

### `sucursales` (ALTER)

Se agregan columnas para poder geolocalizar cada sucursal:

- `latitud` decimal(10,7) NULL
- `longitud` decimal(10,7) NULL
- `radio_metros` int NOT NULL DEFAULT 100

Si `latitud`/`longitud` son NULL para una sucursal, la marcación de
asistencia de los empleados de esa sucursal queda bloqueada (no se puede
validar la ubicación) — se avisa al admin desde el formulario de Sucursales
que falta configurar la ubicación.

### `usuarios` (ALTER)

- `hora_entrada_esperada` time NULL
- `hora_salida_esperada` time NULL

Si un usuario no tiene horario asignado, no participa del cálculo
automático de tardanzas/faltas (se asume que ese usuario no está sujeto a
control de asistencia, p. ej. el dueño).

### `asistencias` (nueva tabla)

| Columna              | Tipo                                              | Notas                                    |
|----------------------|----------------------------------------------------|-------------------------------------------|
| id_asistencia        | int PK AI                                          |                                            |
| id_usuario           | int FK usuarios                                    |                                            |
| fecha                | date                                                | una fila por usuario por día              |
| hora_entrada         | time NULL                                          |                                            |
| hora_salida          | time NULL                                          |                                            |
| lat_entrada, lng_entrada | decimal(10,7) NULL                            | ubicación capturada al marcar entrada     |
| lat_salida, lng_salida   | decimal(10,7) NULL                            | ubicación capturada al marcar salida      |
| estado               | enum('PRESENTE','TARDANZA','FALTA','JUSTIFICADA')  |                                            |
| motivo_falta         | varchar(255) NULL                                  | se llena al justificar                    |
| id_usuario_edito     | int FK usuarios NULL                               | quién corrigió/justificó                  |
| fecha_edicion        | datetime NULL                                      |                                            |

Único `(id_usuario, fecha)`.

### `usuario_historial` (nueva tabla)

| Columna          | Tipo                                    | Notas                                  |
|------------------|-------------------------------------------|------------------------------------------|
| id_historial     | int PK AI                                |                                          |
| id_usuario       | int FK usuarios                          |                                          |
| campo            | enum('CARGO','SUCURSAL','COMISION')      |                                          |
| valor_anterior   | varchar(255) NULL                        | texto plano (nombre de sucursal, etc.)  |
| valor_nuevo      | varchar(255) NULL                        |                                          |
| id_usuario_edito | int FK usuarios                          | quién hizo el cambio                    |
| fecha            | datetime DEFAULT now()                   |                                          |

## Permisos nuevos (módulo `asistencia`)

- `marcar` — marcar la propia entrada/salida. Todos los roles.
- `ver` — ver el listado/reporte de asistencia de todos los empleados. Solo ADMINISTRADOR.
- `editar` — justificar faltas y corregir horas. Solo ADMINISTRADOR.

El historial laboral no requiere permiso nuevo: se muestra dentro de la
ficha de Usuarios, ya protegida por los permisos existentes de gestión de
usuarios.

## Flujos

### Configurar ubicación de sucursal

En el formulario de Sucursales (Configuración/Empresa):
- Botón "Usar mi ubicación actual" → `navigator.geolocation.getCurrentPosition`
  llena `latitud`/`longitud`.
- Campos editables a mano para pegar coordenadas de Google Maps.
- Campo numérico `radio_metros` (default 100), documentado como "radio en
  metros dentro del cual se permite marcar asistencia".

### Marcar entrada/salida (empleado)

Pantalla "Mi Asistencia", accesible a cualquier usuario logueado:

1. Muestra el estado del día: sin marcar / "Entrada: HH:MM" / turno cerrado.
2. Al tocar "Marcar entrada" o "Marcar salida":
   - Pide `navigator.geolocation.getCurrentPosition`.
   - Si el usuario niega el permiso o el dispositivo no tiene GPS → error,
     no se guarda nada.
   - Si lo concede: se calcula la distancia (fórmula haversine) contra la
     sucursal (`id_sucursal_default`) del usuario.
   - Si la sucursal no tiene `latitud/longitud` configurada → error claro
     ("Esta sucursal no tiene ubicación configurada, contactá al
     administrador").
   - Si la distancia > `radio_metros` de esa sucursal → bloqueado, mensaje
     con la distancia detectada.
   - Si está dentro del radio → se guarda `hora_entrada`/`hora_salida` +
     lat/lng capturados.
3. Al marcar entrada: si `hora_entrada` > `hora_entrada_esperada` + 10 min
   de tolerancia → `estado = TARDANZA`, si no → `PRESENTE`.
4. No se puede marcar una segunda entrada el mismo día sin haber marcado
   salida antes; no se puede marcar salida sin haber marcado entrada.

### Faltas automáticas

Proceso diario (job / endpoint disparado por cron del servidor, corre poco
después de medianoche): para cada usuario activo con
`hora_entrada_esperada` configurada que no tenga fila de `asistencias` para
el día anterior, crea una con `estado = FALTA`.

### Justificar falta / corregir asistencia (admin)

Desde la pantalla "Asistencia" (permiso `editar` de módulo `asistencia`):
un admin abre una fila en estado FALTA, escribe `motivo_falta`, guarda →
`estado = JUSTIFICADA`, `id_usuario_edito`/`fecha_edicion` registrados.
También puede corregir manualmente una hora mal marcada por error técnico.

### Reporte/listado de asistencia

Nueva página "Asistencia" (permiso `ver`):
- Filtros: rango de fechas, sucursal, empleado, estado.
- Resumen de contadores del período filtrado: total días, presentes,
  tardanzas, faltas, justificadas.
- Tabla/cards con fecha, empleado, sucursal, hora entrada, hora salida,
  estado (badge de color), indicador si la marcación fue fuera de rango
  (dato ya bloqueado en origen, pero se puede señalar informativamente si
  quedó una marcación antigua sin GPS).
- Botón "Justificar" en filas con FALTA.

### Historial laboral

Dentro de la ficha de cada usuario en `Usuarios.jsx` (botón/pestaña
"Historial" en la tarjeta o modal del usuario): lista de eventos más
reciente primero — fecha, campo cambiado, valor anterior → valor nuevo,
quién lo hizo.

Se genera automáticamente: en `updateUsuario`, antes de aplicar el UPDATE,
el backend compara `cargo`, `id_sucursal_default` y `porcentaje_comision`
actuales contra los nuevos valores recibidos; por cada campo que cambió,
inserta una fila en `usuario_historial`. Sin pasos ni pantallas extra para
el admin.

## Fuera de alcance / decisiones explícitas

- No se implementa un kiosko/PIN compartido para marcar asistencia — cada
  empleado marca desde su propia sesión logueada.
- No se valida el radio de forma "flexible" (marcar igual pero señalar
  sospechosa): fuera de rango bloquea directamente, sin excepciones.
- El radio de geocerca es configurable por sucursal, no un valor global.
- No se cubre en esta fase: vacaciones/permisos, documentos adjuntos,
  sanciones, notas libres de RRHH.
