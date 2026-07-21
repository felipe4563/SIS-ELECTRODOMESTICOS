-- ============================================================
--  MIGRACIÓN: Módulo Servicio Técnico
--  Aplicar sobre: bd_electrodomesticos
--  Fecha: 2026-07-19
-- ============================================================

START TRANSACTION;

-- ─────────────────────────────────────────────────────────────
-- 1. MÓDULO
-- ─────────────────────────────────────────────────────────────

INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES
(21, 'SERVICIO_TECNICO', 'Servicio Técnico', 'wrench', 21);


-- ─────────────────────────────────────────────────────────────
-- 2. TÉCNICOS EXTERNOS (centros de servicio, talleres)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `tecnicos_externos` (
  `id_tecnico`    int(11)      NOT NULL AUTO_INCREMENT,
  `nombre`        varchar(150) NOT NULL COMMENT 'Nombre del taller / técnico',
  `contacto`      varchar(120) DEFAULT NULL COMMENT 'Persona de contacto',
  `telefono`      varchar(30)  DEFAULT NULL,
  `direccion`     varchar(255) DEFAULT NULL,
  `especialidad`  varchar(120) DEFAULT NULL COMMENT 'Ej: Samsung, Refrigeración, Electrónica',
  `notas`         text         DEFAULT NULL,
  `activo`        tinyint(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_tecnico`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ─────────────────────────────────────────────────────────────
-- 3. ÓRDENES DE SERVICIO TÉCNICO
-- ─────────────────────────────────────────────────────────────
--
-- Flujo de estados:
--
--   RECIBIDO
--     → EN_DIAGNOSTICO
--       → ESPERANDO_REPUESTO   (opcional: hay que pedir pieza)
--       → EN_REPARACION
--         → REPARADO
--           → LISTO_ENTREGA    (avisado al cliente)
--             → ENTREGADO      ← fin normal
--         → SIN_REPARACION     ← no se pudo reparar
--   ANULADO                    ← cancelado desde cualquier estado
--
-- tipo_origen:
--   CLIENTE   = el cliente trae su propio equipo para reparar
--   INVENTARIO = el equipo es de la tienda (exhibición, devuelto, etc.)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `servicios_tecnicos` (
  -- Identificación
  `id_servicio`             bigint(20)   NOT NULL AUTO_INCREMENT,
  `numero`                  varchar(30)  NOT NULL COMMENT 'Ej: ST-2026-00001',

  -- Origen
  `tipo_origen`             enum('CLIENTE','INVENTARIO') NOT NULL DEFAULT 'CLIENTE',
  `id_cliente`              int(11)      DEFAULT NULL  COMMENT 'Si tipo_origen = CLIENTE',
  `id_venta_origen`         bigint(20)   DEFAULT NULL  COMMENT 'Venta donde se compró el equipo (opcional)',

  -- Producto
  `id_producto`             int(11)      DEFAULT NULL  COMMENT 'Si el equipo está en el catálogo',
  `descripcion_producto`    varchar(200) NOT NULL      COMMENT 'Nombre/descripción del equipo (siempre requerido)',
  `marca_producto`          varchar(80)  DEFAULT NULL,
  `modelo_producto`         varchar(80)  DEFAULT NULL,
  `numero_serie`            varchar(80)  DEFAULT NULL,
  `color_producto`          varchar(40)  DEFAULT NULL,

  -- Recepción
  `id_sucursal`             int(11)      NOT NULL,
  `id_usuario_recibe`       int(11)      NOT NULL,
  `fecha_recepcion`         datetime     NOT NULL DEFAULT current_timestamp(),
  `falla_reportada`         text         NOT NULL COMMENT 'Lo que el cliente o tienda describe como problema',
  `accesorios_recibidos`    varchar(255) DEFAULT NULL COMMENT 'Ej: control, cables, tapa, manual',
  `condicion_fisica`        varchar(255) DEFAULT NULL COMMENT 'Golpes, rayones, daños visibles al recibir',
  `garantia`                tinyint(1)   NOT NULL DEFAULT 0 COMMENT '1 = bajo garantía del fabricante o tienda',
  `prioridad`               enum('BAJA','NORMAL','ALTA','URGENTE') NOT NULL DEFAULT 'NORMAL',

  -- Servicio
  `id_tecnico_externo`      int(11)      DEFAULT NULL COMMENT 'Taller o técnico al que se envía (puede ser NULL si es interno)',
  `fecha_envio_tecnico`     datetime     DEFAULT NULL COMMENT 'Cuando salió físicamente al taller',
  `fecha_estimada_entrega`  date         DEFAULT NULL COMMENT 'Fecha prometida al cliente',

  -- Diagnóstico y trabajo
  `diagnostico`             text         DEFAULT NULL COMMENT 'Diagnóstico técnico',
  `trabajo_realizado`       text         DEFAULT NULL COMMENT 'Descripción de la reparación efectuada',
  `repuestos_usados`        varchar(255) DEFAULT NULL,
  `costo_estimado`          decimal(14,2) NOT NULL DEFAULT 0.00,
  `costo_final`             decimal(14,2) NOT NULL DEFAULT 0.00,

  -- Estado y cierre
  `estado`                  enum(
                              'RECIBIDO',
                              'EN_DIAGNOSTICO',
                              'ESPERANDO_REPUESTO',
                              'EN_REPARACION',
                              'REPARADO',
                              'LISTO_ENTREGA',
                              'ENTREGADO',
                              'SIN_REPARACION',
                              'ANULADO'
                            ) NOT NULL DEFAULT 'RECIBIDO',
  `fecha_real_entrega`      datetime     DEFAULT NULL,
  `id_usuario_cierre`       int(11)      DEFAULT NULL COMMENT 'Quien registró la entrega o cierre',
  `observaciones`           text         DEFAULT NULL,

  `fecha_creacion`          datetime     NOT NULL DEFAULT current_timestamp(),

  PRIMARY KEY (`id_servicio`),
  UNIQUE KEY `uk_st_numero` (`numero`),

  KEY `fk_st_cliente`         (`id_cliente`),
  KEY `fk_st_producto`        (`id_producto`),
  KEY `fk_st_venta`           (`id_venta_origen`),
  KEY `fk_st_sucursal`        (`id_sucursal`),
  KEY `fk_st_usuario_recibe`  (`id_usuario_recibe`),
  KEY `fk_st_tecnico`         (`id_tecnico_externo`),
  KEY `fk_st_usuario_cierre`  (`id_usuario_cierre`),
  KEY `idx_st_estado`         (`estado`),
  KEY `idx_st_fecha`          (`fecha_recepcion`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ─────────────────────────────────────────────────────────────
-- 4. SEGUIMIENTO / HISTORIAL DE ESTADOS
--    Cada vez que cambia el estado se inserta una fila aquí.
--    Permite saber quién cambió qué y cuándo, y sirve de
--    base para los reportes de tiempo por etapa.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `servicio_tecnico_seguimiento` (
  `id_seguimiento`  bigint(20) NOT NULL AUTO_INCREMENT,
  `id_servicio`     bigint(20) NOT NULL,
  `estado_anterior` enum(
                      'RECIBIDO','EN_DIAGNOSTICO','ESPERANDO_REPUESTO',
                      'EN_REPARACION','REPARADO','LISTO_ENTREGA',
                      'ENTREGADO','SIN_REPARACION','ANULADO'
                    ) DEFAULT NULL,
  `estado_nuevo`    enum(
                      'RECIBIDO','EN_DIAGNOSTICO','ESPERANDO_REPUESTO',
                      'EN_REPARACION','REPARADO','LISTO_ENTREGA',
                      'ENTREGADO','SIN_REPARACION','ANULADO'
                    ) NOT NULL,
  `observacion`     text  DEFAULT NULL,
  `id_usuario`      int(11) NOT NULL,
  `fecha`           datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_seguimiento`),
  KEY `fk_seg_servicio` (`id_servicio`),
  KEY `fk_seg_usuario`  (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ─────────────────────────────────────────────────────────────
-- 5. CLAVES FORÁNEAS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE `servicios_tecnicos`
  ADD CONSTRAINT `fk_st_cliente`
    FOREIGN KEY (`id_cliente`)        REFERENCES `clientes`         (`id_cliente`),
  ADD CONSTRAINT `fk_st_producto`
    FOREIGN KEY (`id_producto`)       REFERENCES `productos`        (`id_producto`),
  ADD CONSTRAINT `fk_st_venta`
    FOREIGN KEY (`id_venta_origen`)   REFERENCES `ventas`           (`id_venta`),
  ADD CONSTRAINT `fk_st_sucursal`
    FOREIGN KEY (`id_sucursal`)       REFERENCES `sucursales`       (`id_sucursal`),
  ADD CONSTRAINT `fk_st_usuario_recibe`
    FOREIGN KEY (`id_usuario_recibe`) REFERENCES `usuarios`         (`id_usuario`),
  ADD CONSTRAINT `fk_st_tecnico`
    FOREIGN KEY (`id_tecnico_externo`) REFERENCES `tecnicos_externos` (`id_tecnico`),
  ADD CONSTRAINT `fk_st_usuario_cierre`
    FOREIGN KEY (`id_usuario_cierre`) REFERENCES `usuarios`         (`id_usuario`);

ALTER TABLE `servicio_tecnico_seguimiento`
  ADD CONSTRAINT `fk_seg_servicio`
    FOREIGN KEY (`id_servicio`) REFERENCES `servicios_tecnicos` (`id_servicio`),
  ADD CONSTRAINT `fk_seg_usuario`
    FOREIGN KEY (`id_usuario`)  REFERENCES `usuarios`           (`id_usuario`);


-- ─────────────────────────────────────────────────────────────
-- 6. PERMISOS
--    Continuando desde id_permiso 214 (último existente)
-- ─────────────────────────────────────────────────────────────

INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES

-- Módulo: SERVICIO TÉCNICO (id_modulo = 21)
(215, 21, 'servicio_tecnico.ver',
    'Ver Órdenes de Servicio',
    'Listar y consultar órdenes de servicio técnico de su sucursal'),

(216, 21, 'servicio_tecnico.ver_todas',
    'Ver Órdenes de Todas las Sucursales',
    'Acceder a órdenes de cualquier sucursal'),

(217, 21, 'servicio_tecnico.crear',
    'Crear Orden de Servicio',
    'Registrar nuevo ingreso de equipo a servicio técnico'),

(218, 21, 'servicio_tecnico.editar',
    'Editar Orden de Servicio',
    'Modificar datos de una orden (mientras no esté ENTREGADO/ANULADO)'),

(219, 21, 'servicio_tecnico.cambiar_estado',
    'Cambiar Estado de Orden',
    'Registrar avances: diagnóstico, en reparación, reparado, etc.'),

(220, 21, 'servicio_tecnico.entregar',
    'Registrar Entrega al Cliente',
    'Marcar orden como ENTREGADO y cerrarla'),

(221, 21, 'servicio_tecnico.anular',
    'Anular Orden de Servicio',
    'Cancelar una orden de servicio técnico'),

(222, 21, 'servicio_tecnico.imprimir',
    'Imprimir Recibo de Servicio',
    'Generar PDF del recibo de ingreso o entrega'),

(223, 21, 'servicio_tecnico.ver_costos',
    'Ver Costos de Reparación',
    'Visualizar costo estimado y costo final de reparación'),

(224, 21, 'servicio_tecnico.gestionar_tecnicos',
    'Gestionar Técnicos Externos',
    'Crear, editar y desactivar talleres/técnicos externos'),

-- Reportes de Servicio Técnico (id_modulo = 12 = REPORTES)
(225, 12, 'reportes.servicio_tecnico',
    'Reporte Servicio Técnico',
    'Ver reportes de órdenes por estado, período, técnico y cliente');


-- ─────────────────────────────────────────────────────────────
-- 7. ASIGNACIÓN DE PERMISOS A ROLES
--
--   ROL 1 - ADMINISTRADOR: todos los permisos
--   ROL 2 - VENDEDOR: recibe equipos, ve órdenes propias, imprime
--   ROL 3 - ALMACENERO: recibe, cambia estado, ve todas en su suc.
-- ─────────────────────────────────────────────────────────────

INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES

-- ADMINISTRADOR (acceso total)
(1, 215), (1, 216), (1, 217), (1, 218), (1, 219),
(1, 220), (1, 221), (1, 222), (1, 223), (1, 224), (1, 225),

-- VENDEDOR
-- Puede registrar ingreso, ver órdenes de su sucursal, imprimir recibo,
-- registrar entrega al cliente (él/ella suele ser quien entrega).
(2, 215),  -- ver órdenes de su sucursal
(2, 217),  -- crear orden (registrar ingreso)
(2, 218),  -- editar orden (ej: actualizar accesorios)
(2, 220),  -- registrar entrega
(2, 222),  -- imprimir recibo

-- ALMACENERO
-- Controla el flujo físico: recibe, envía al técnico, actualiza estados.
(3, 215),  -- ver órdenes de su sucursal
(3, 217),  -- crear orden (ingresa equipo)
(3, 219),  -- cambiar estado (clave: él actualiza EN_REPARACION, REPARADO, etc.)
(3, 222);  -- imprimir recibo


-- ─────────────────────────────────────────────────────────────
-- 8. TIPO DE MOVIMIENTO KARDEX  (si se necesita descontar stock
--    cuando un equipo de inventario entra a servicio técnico)
-- ─────────────────────────────────────────────────────────────

INSERT INTO `tipos_movimiento` (`id_tipo_movimiento`, `codigo`, `nombre`, `efecto`, `afecta_costo`) VALUES
(11, 'SERV_TECNICO_SAL', 'Salida a Servicio Técnico',  'SALIDA',  0),
(12, 'SERV_TECNICO_ENT', 'Retorno de Servicio Técnico', 'ENTRADA', 0);

-- Nota: estos movimientos se usan SOLO cuando tipo_origen = 'INVENTARIO'.
-- El backend debe registrar en kardex el movimiento y actualizar stock.
-- documento_tipo en kardex = 'SERVICIO_TECNICO' (ver nota al final).


COMMIT;


-- ─────────────────────────────────────────────────────────────
-- PENDIENTE PARA EL BACKEND
-- ─────────────────────────────────────────────────────────────
-- 1. En el campo `documento_tipo` del kardex (ENUM) agregar el valor
--    'SERVICIO_TECNICO'. Correr este ALTER antes del COMMIT si aplica:
--
--    ALTER TABLE kardex MODIFY COLUMN documento_tipo
--      ENUM('COMPRA','VENTA','TRANSFERENCIA','AJUSTE','DEVOLUCION',
--           'APERTURA','SERVICIO_TECNICO') NOT NULL;
--
-- 2. La numeración automática del campo `numero` debe seguir el
--    patrón: ST-{YYYY}-{secuencia 5 dígitos}, ej: ST-2026-00001.
--    Implementar en el controlador del backend al hacer INSERT.
--
-- 3. Al cambiar estado, el backend debe:
--    a) UPDATE servicios_tecnicos SET estado = nuevo_estado
--    b) INSERT INTO servicio_tecnico_seguimiento (estado_anterior, estado_nuevo, ...)
--    c) Si nuevo_estado = 'ENTREGADO': setear fecha_real_entrega = NOW()
--    d) Si nuevo_estado = 'LISTO_ENTREGA': puede disparar notificación al cliente
-- ─────────────────────────────────────────────────────────────
