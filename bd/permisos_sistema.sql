-- =====================================================================
-- SCRIPT DE PERMISOS Y MÓDULOS DEL SISTEMA
-- Sistema de Gestión - Tienda de Electrodomésticos
-- Ejecutar DESPUÉS de sistema_electrodomesticos.sql
-- =====================================================================

USE bd_sistema_electrodomesticos;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE rol_permiso;
TRUNCATE TABLE permisos;
TRUNCATE TABLE modulos;
TRUNCATE TABLE roles;
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- 1. MÓDULOS DEL SISTEMA
-- =====================================================================

INSERT INTO modulos (id_modulo, codigo, nombre, icono, orden) VALUES
(1,  'DASHBOARD',     'Dashboard',                'home',        1),
(2,  'CONFIGURACION', 'Configuración',            'settings',    2),
(3,  'USUARIOS',      'Usuarios y Roles',         'users',       3),
(4,  'PRODUCTOS',     'Productos',                'package',     4),
(5,  'PROVEEDORES',   'Proveedores',              'truck',       5),
(6,  'CLIENTES',      'Clientes',                 'user-check',  6),
(7,  'COMPRAS',       'Compras',                  'shopping-bag',7),
(8,  'INVENTARIO',    'Inventario',               'archive',     8),
(9,  'VENTAS',        'Ventas',                   'shopping-cart',9),
(10, 'CAJA',          'Caja',                     'dollar-sign', 10),
(11, 'GASTOS',        'Gastos',                   'credit-card', 11),
(12, 'REPORTES',      'Reportes',                 'bar-chart',   12),
(13, 'AUDITORIA',     'Auditoría',                'shield',      13);

-- =====================================================================
-- 2. PERMISOS POR MÓDULO
-- =====================================================================

-- ----- DASHBOARD -----
INSERT INTO permisos (id_modulo, codigo, nombre, descripcion) VALUES
(1, 'dashboard.ver',                  'Ver Dashboard',                       'Acceder al panel principal con indicadores'),
(1, 'dashboard.ver_todas_sucursales', 'Ver Dashboard de todas las sucursales','Consolidar indicadores de todas las sucursales');

-- ----- CONFIGURACIÓN -----
INSERT INTO permisos (id_modulo, codigo, nombre, descripcion) VALUES
(2, 'configuracion.ver',              'Ver Configuración',                   'Acceder al módulo de configuración'),
(2, 'empresa.editar',                 'Editar datos de Empresa',             'Modificar razón social, NIT, logo'),
(2, 'sucursales.ver',                 'Ver Sucursales',                      'Listar sucursales'),
(2, 'sucursales.crear',               'Crear Sucursal',                      'Registrar nueva sucursal'),
(2, 'sucursales.editar',              'Editar Sucursal',                     'Modificar datos de sucursal'),
(2, 'sucursales.eliminar',            'Eliminar/Desactivar Sucursal',        'Dar de baja una sucursal'),
(2, 'depositos.ver',                  'Ver Depósitos',                       'Listar depósitos'),
(2, 'depositos.crear',                'Crear Depósito',                      'Registrar nuevo depósito o almacén'),
(2, 'depositos.editar',               'Editar Depósito',                     'Modificar datos de depósito'),
(2, 'depositos.eliminar',             'Eliminar/Desactivar Depósito',        'Dar de baja un depósito'),
(2, 'monedas.ver',                    'Ver Monedas',                         'Listar monedas configuradas'),
(2, 'monedas.gestionar',              'Gestionar Monedas',                   'Crear, editar y desactivar monedas'),
(2, 'tipos_cambio.ver',               'Ver Tipos de Cambio',                 'Consultar tipos de cambio'),
(2, 'tipos_cambio.gestionar',         'Gestionar Tipos de Cambio',           'Registrar y actualizar tasas diarias'),
(2, 'parametros.ver',                 'Ver Parámetros del Sistema',          'Consultar configuración general'),
(2, 'parametros.editar',              'Editar Parámetros del Sistema',       'Modificar IVA, prefijos, días alerta, etc.');

-- ----- USUARIOS Y ROLES -----
INSERT INTO permisos (id_modulo, codigo, nombre, descripcion) VALUES
(3, 'usuarios.ver',                   'Ver Usuarios',                        'Listar usuarios del sistema'),
(3, 'usuarios.crear',                 'Crear Usuario',                       'Registrar nuevo usuario'),
(3, 'usuarios.editar',                'Editar Usuario',                      'Modificar datos de usuario'),
(3, 'usuarios.eliminar',              'Eliminar/Desactivar Usuario',         'Dar de baja un usuario'),
(3, 'usuarios.resetear_password',     'Resetear Contraseña',                 'Forzar cambio de contraseña a otro usuario'),
(3, 'usuarios.asignar_sucursales',    'Asignar Sucursales',                  'Definir a qué sucursales puede acceder un usuario'),
(3, 'usuarios.cerrar_sesiones',       'Cerrar Sesiones',                     'Invalidar sesiones activas de otros usuarios'),
(3, 'roles.ver',                      'Ver Roles',                           'Listar roles existentes'),
(3, 'roles.crear',                    'Crear Rol',                           'Registrar nuevo rol'),
(3, 'roles.editar',                   'Editar Rol',                          'Modificar nombre y descripción de rol'),
(3, 'roles.eliminar',                 'Eliminar Rol',                        'Eliminar un rol (no del sistema)'),
(3, 'roles.asignar_permisos',         'Asignar Permisos a Rol',              'Configurar permisos por rol'),
(3, 'permisos.ver',                   'Ver Permisos',                        'Consultar catálogo de permisos');

-- ----- PRODUCTOS -----
INSERT INTO permisos (id_modulo, codigo, nombre, descripcion) VALUES
(4, 'productos.ver',                  'Ver Productos',                       'Listar y buscar productos'),
(4, 'productos.crear',                'Crear Producto',                      'Registrar nuevo producto'),
(4, 'productos.editar',               'Editar Producto',                     'Modificar datos generales del producto'),
(4, 'productos.editar_precio',        'Editar Precio',                       'Modificar precio real y precio público'),
(4, 'productos.editar_costos',        'Editar Costos (LOG, MCM)',            'Modificar costos de logística y MCM'),
(4, 'productos.editar_bono',          'Editar Bono Vendedor',                'Modificar bono asignado al producto'),
(4, 'productos.eliminar',             'Eliminar/Desactivar Producto',        'Dar de baja un producto'),
(4, 'productos.exportar',             'Exportar Productos',                  'Exportar catálogo a Excel/PDF'),
(4, 'productos.importar',             'Importar Productos',                  'Carga masiva desde Excel'),
(4, 'productos.ver_historico_precios','Ver Histórico de Precios',            'Consultar cambios históricos de precio'),
(4, 'marcas.ver',                     'Ver Marcas',                          'Listar marcas'),
(4, 'marcas.gestionar',               'Gestionar Marcas',                    'Crear, editar y desactivar marcas'),
(4, 'categorias.ver',                 'Ver Categorías',                      'Listar categorías'),
(4, 'categorias.gestionar',           'Gestionar Categorías',                'Crear, editar y desactivar categorías'),
(4, 'unidades.ver',                   'Ver Unidades de Medida',              'Listar unidades de medida'),
(4, 'unidades.gestionar',             'Gestionar Unidades de Medida',        'Crear, editar y desactivar unidades');

-- ----- PROVEEDORES -----
INSERT INTO permisos (id_modulo, codigo, nombre, descripcion) VALUES
(5, 'proveedores.ver',                'Ver Proveedores',                     'Listar proveedores'),
(5, 'proveedores.crear',              'Crear Proveedor',                     'Registrar nuevo proveedor'),
(5, 'proveedores.editar',             'Editar Proveedor',                    'Modificar datos de proveedor'),
(5, 'proveedores.eliminar',           'Eliminar/Desactivar Proveedor',       'Dar de baja un proveedor'),
(5, 'proveedores.ver_saldo',          'Ver Saldo del Proveedor',             'Consultar cuenta por pagar'),
(5, 'proveedores.gestionar_cuentas',  'Gestionar Cuentas de Pago',           'Agregar/editar cuentas (efectivo, QR, banco)'),
(5, 'proveedores.gestionar_contactos','Gestionar Contactos',                 'Agregar y editar contactos del proveedor'),
(5, 'proveedores.exportar',           'Exportar Proveedores',                'Exportar a Excel/PDF');

-- ----- CLIENTES -----
INSERT INTO permisos (id_modulo, codigo, nombre, descripcion) VALUES
(6, 'clientes.ver',                   'Ver Clientes',                        'Listar y buscar clientes'),
(6, 'clientes.crear',                 'Crear Cliente',                       'Registrar nuevo cliente'),
(6, 'clientes.editar',                'Editar Cliente',                      'Modificar datos de cliente'),
(6, 'clientes.eliminar',              'Eliminar/Desactivar Cliente',         'Dar de baja un cliente'),
(6, 'clientes.dar_credito',           'Otorgar Crédito',                     'Activar permite_credito y definir límite'),
(6, 'clientes.modificar_limite',      'Modificar Límite de Crédito',         'Cambiar el límite de crédito de un cliente'),
(6, 'clientes.ver_saldo',             'Ver Saldo del Cliente',               'Consultar cuenta por cobrar'),
(6, 'clientes.ver_historial',         'Ver Historial de Compras',            'Ver todas las ventas del cliente'),
(6, 'clientes.gestionar_direcciones', 'Gestionar Direcciones',               'Agregar/editar direcciones de entrega'),
(6, 'clientes.exportar',              'Exportar Clientes',                   'Exportar a Excel/PDF');

-- ----- COMPRAS -----
INSERT INTO permisos (id_modulo, codigo, nombre, descripcion) VALUES
(7, 'compras.ver',                    'Ver Compras',                         'Listar compras de su sucursal'),
(7, 'compras.ver_todas',              'Ver Compras de Todas las Sucursales', 'Acceso a compras de cualquier sucursal'),
(7, 'compras.crear_pre_pedido',       'Crear Pre-Pedido',                    'Iniciar un pre-pedido a proveedor'),
(7, 'compras.editar_pre_pedido',      'Editar Pre-Pedido',                   'Modificar pre-pedido antes de confirmar'),
(7, 'compras.confirmar_pedido',       'Confirmar Pedido (Por Llegar)',       'Pasar pre-pedido a estado por llegar'),
(7, 'compras.aprobar',                'Aprobar Compra',                      'Aprobar compras de alto monto'),
(7, 'compras.recibir',                'Recibir Mercadería',                  'Confirmar recepción y actualizar stock'),
(7, 'compras.recibir_parcial',        'Recibir Mercadería Parcial',          'Permitir recepción parcial'),
(7, 'compras.anular',                 'Anular Compra',                       'Cancelar/anular una compra'),
(7, 'compras.ver_costos',             'Ver Costos de Compra',                'Visualizar precios reales y márgenes'),
(7, 'compras.pagar',                  'Registrar Pago a Proveedor',          'Registrar pago de una compra'),
(7, 'compras.anular_pago',            'Anular Pago a Proveedor',             'Anular un pago registrado'),
(7, 'compras.gestionar_cuotas',       'Gestionar Cuotas de Compra',          'Modificar plan de cuotas'),
(7, 'compras.imprimir',               'Imprimir Documento de Compra',        'Generar PDF de orden de compra'),
(7, 'compras.exportar',               'Exportar Compras',                    'Exportar listado a Excel/PDF');

-- ----- INVENTARIO -----
INSERT INTO permisos (id_modulo, codigo, nombre, descripcion) VALUES
(8, 'inventario.ver',                 'Ver Inventario',                      'Consultar stock de su depósito asignado'),
(8, 'inventario.ver_todos_depositos', 'Ver Inventario de Todos los Depósitos','Stock consolidado multi-depósito'),
(8, 'inventario.ver_kardex',          'Ver Kardex',                          'Consultar historial de movimientos'),
(8, 'inventario.transferir_solicitar','Solicitar Transferencia',             'Crear solicitud de transferencia entre depósitos'),
(8, 'inventario.transferir_enviar',   'Enviar Transferencia',                'Confirmar envío de mercadería'),
(8, 'inventario.transferir_recibir',  'Recibir Transferencia',               'Confirmar recepción en depósito destino'),
(8, 'inventario.transferir_anular',   'Anular Transferencia',                'Cancelar una transferencia'),
(8, 'inventario.ajuste_crear',        'Crear Ajuste de Inventario',          'Registrar ajuste por conteo físico'),
(8, 'inventario.ajuste_aprobar',      'Aprobar Ajuste de Inventario',        'Aprobar ajustes de stock'),
(8, 'inventario.ajuste_anular',       'Anular Ajuste de Inventario',         'Cancelar un ajuste pendiente'),
(8, 'inventario.stock_minimo_editar', 'Editar Stock Mínimo por Producto',    'Modificar umbral de alerta'),
(8, 'inventario.alertas_ver',         'Ver Alertas de Stock Mínimo',         'Listar productos bajo stock mínimo'),
(8, 'inventario.alertas_atender',     'Atender Alertas',                     'Marcar alertas como atendidas'),
(8, 'inventario.exportar',            'Exportar Inventario',                 'Exportar reporte de stock a Excel');

-- ----- VENTAS -----
INSERT INTO permisos (id_modulo, codigo, nombre, descripcion) VALUES
(9, 'ventas.ver_propias',             'Ver Ventas Propias',                  'Ver sólo las ventas que el vendedor realizó'),
(9, 'ventas.ver_sucursal',            'Ver Ventas de la Sucursal',           'Ver todas las ventas de su sucursal'),
(9, 'ventas.ver_todas',               'Ver Ventas de Todas las Sucursales',  'Ver ventas a nivel global'),
(9, 'ventas.crear_menor',             'Crear Venta al Por Menor',            'Registrar venta minorista'),
(9, 'ventas.crear_mayor',             'Crear Venta al Por Mayor',            'Registrar venta mayorista'),
(9, 'ventas.editar_borrador',         'Editar Venta en Borrador',            'Modificar venta antes de emitirla'),
(9, 'ventas.emitir',                  'Emitir Venta',                        'Confirmar y emitir la venta'),
(9, 'ventas.aplicar_descuento',       'Aplicar Descuento',                   'Otorgar descuento dentro de margen permitido'),
(9, 'ventas.aplicar_descuento_alto',  'Aplicar Descuento Alto',              'Otorgar descuentos sobre el límite estándar'),
(9, 'ventas.vender_credito',          'Vender a Crédito',                    'Realizar ventas a crédito'),
(9, 'ventas.aprobar_credito',         'Aprobar Crédito sobre Límite',        'Autorizar venta que excede el límite del cliente'),
(9, 'ventas.cobrar',                  'Registrar Cobro',                     'Registrar pagos de ventas'),
(9, 'ventas.anular_cobro',            'Anular Cobro',                        'Anular un cobro registrado'),
(9, 'ventas.anular',                  'Anular Venta',                        'Anular una venta emitida'),
(9, 'ventas.devolucion_crear',        'Crear Devolución',                    'Iniciar proceso de devolución'),
(9, 'ventas.devolucion_aprobar',      'Aprobar Devolución',                  'Aprobar devolución y reingresar stock'),
(9, 'ventas.cambiar_vendedor',        'Cambiar Vendedor de la Venta',        'Reasignar vendedor'),
(9, 'ventas.ver_utilidad',            'Ver Utilidad de la Venta',            'Visualizar costo y rentabilidad'),
(9, 'ventas.imprimir',                'Imprimir/Reimprimir Factura',         'Generar PDF o reimprimir comprobante'),
(9, 'ventas.exportar',                'Exportar Ventas',                     'Exportar a Excel/PDF');

-- ----- CAJA -----
INSERT INTO permisos (id_modulo, codigo, nombre, descripcion) VALUES
(10, 'caja.ver',                      'Ver Cajas',                           'Listar cajas configuradas'),
(10, 'caja.gestionar',                'Gestionar Cajas',                     'Crear, editar y desactivar cajas'),
(10, 'caja.abrir',                    'Abrir Caja',                          'Iniciar turno de caja'),
(10, 'caja.cerrar',                   'Cerrar Caja',                         'Cerrar turno y registrar arqueo'),
(10, 'caja.ver_arqueo_propio',        'Ver Arqueo Propio',                   'Ver sus propios arqueos'),
(10, 'caja.ver_arqueo_todos',         'Ver Arqueos de Todos',                'Ver arqueos de todos los cajeros'),
(10, 'caja.cuadrar_diferencia',       'Cuadrar Diferencia',                  'Justificar diferencias en arqueo'),
(10, 'caja.forzar_cierre',            'Forzar Cierre de Caja',               'Cerrar caja de otro usuario en casos especiales'),
(10, 'caja.exportar',                 'Exportar Arqueos',                    'Exportar arqueos a Excel/PDF');

-- ----- GASTOS -----
INSERT INTO permisos (id_modulo, codigo, nombre, descripcion) VALUES
(11, 'gastos.ver',                    'Ver Gastos',                          'Listar gastos de su sucursal'),
(11, 'gastos.ver_todos',              'Ver Gastos de Todas las Sucursales',  'Ver gastos a nivel global'),
(11, 'gastos.crear',                  'Registrar Gasto',                     'Crear nuevo gasto'),
(11, 'gastos.editar',                 'Editar Gasto',                        'Modificar gasto en estado REGISTRADO'),
(11, 'gastos.aprobar',                'Aprobar Gasto',                       'Aprobar gastos registrados'),
(11, 'gastos.pagar',                  'Marcar Gasto como Pagado',            'Registrar el pago del gasto'),
(11, 'gastos.anular',                 'Anular Gasto',                        'Anular un gasto'),
(11, 'gastos.categorias_ver',         'Ver Categorías de Gasto',             'Listar categorías'),
(11, 'gastos.categorias_gestionar',   'Gestionar Categorías de Gasto',       'Crear, editar y desactivar categorías'),
(11, 'gastos.adjuntar_comprobante',   'Adjuntar Comprobante',                'Subir comprobante de gasto'),
(11, 'gastos.exportar',               'Exportar Gastos',                     'Exportar a Excel/PDF');

-- ----- REPORTES -----
INSERT INTO permisos (id_modulo, codigo, nombre, descripcion) VALUES
(12, 'reportes.ver',                                    'Acceder a Reportes',              'Acceso general al módulo'),
(12, 'reportes.stock_consolidado',                      'Reporte Stock Consolidado',       'Ver stock por depósito (formato Excel)'),
(12, 'reportes.ventas_periodo',                         'Reporte Ventas por Período',      'Ventas filtradas por fecha'),
(12, 'reportes.ventas_vendedor',                        'Reporte Ventas por Vendedor',     'Ranking y detalle por vendedor'),
(12, 'reportes.ventas_producto',                        'Reporte Ventas por Producto',     'Top productos vendidos'),
(12, 'reportes.ventas_cliente',                         'Reporte Ventas por Cliente',      'Compras por cliente'),
(12, 'reportes.compras_periodo',                        'Reporte Compras por Período',     'Compras filtradas por fecha'),
(12, 'reportes.compras_proveedor',                      'Reporte Compras por Proveedor',   'Total comprado por proveedor'),
(12, 'reportes.cuentas_cobrar',                         'Reporte Cuentas por Cobrar',      'Clientes con saldo pendiente'),
(12, 'reportes.cuentas_pagar',                          'Reporte Cuentas por Pagar',       'Proveedores con saldo pendiente'),
(12, 'reportes.alertas_stock',                          'Reporte Alertas Stock Mínimo',    'Productos bajo stock mínimo'),
(12, 'reportes.kardex',                                 'Reporte Kardex por Producto',     'Movimientos detallados de un producto'),
(12, 'reportes.rentabilidad',                           'Reporte Rentabilidad',            'Utilidad por producto/marca/categoría'),
(12, 'reportes.estado_resultados',                      'Reporte Estado de Resultados',    'Ingresos - costos - gastos'),
(12, 'reportes.bonos_vendedores',                       'Reporte Bonos a Vendedores',      'Bonos generados por vendedor'),
(12, 'reportes.arqueos_caja',                           'Reporte Arqueos de Caja',         'Arqueos por sucursal/período'),
(12, 'reportes.gastos_categoria',                       'Reporte Gastos por Categoría',    'Distribución de gastos'),
(12, 'reportes.transferencias',                         'Reporte Transferencias',          'Histórico de transferencias entre depósitos'),
(12, 'reportes.devoluciones',                           'Reporte Devoluciones',            'Devoluciones por período/causa'),
(12, 'reportes.exportar',                               'Exportar Reportes',               'Descargar reportes en Excel/PDF'),
(12, 'reportes.dashboard_financiero',                   'Dashboard Financiero',            'Indicadores financieros consolidados');

-- ----- AUDITORÍA -----
INSERT INTO permisos (id_modulo, codigo, nombre, descripcion) VALUES
(13, 'auditoria.ver',                 'Ver Auditoría',                       'Acceder al log de auditoría'),
(13, 'auditoria.filtrar',             'Filtrar Auditoría',                   'Filtrar por usuario, tabla, fecha'),
(13, 'auditoria.exportar',            'Exportar Auditoría',                  'Exportar log a Excel/PDF'),
(13, 'sesiones.ver',                  'Ver Sesiones Activas',                'Ver usuarios conectados'),
(13, 'sesiones.cerrar',               'Cerrar Sesiones Activas',             'Forzar cierre de sesión');

-- =====================================================================
-- 3. ROLES DEL SISTEMA
-- =====================================================================
-- Sólo 3 roles según definición del dueño del negocio:
--   1. ADMINISTRADOR (dueño) - acceso total
--   2. VENDEDOR              - ventas mayor/menor, clientes, cobros
--   3. ALMACENERO            - inventario, recepción de compras, transferencias

INSERT INTO roles (id_rol, nombre, descripcion, es_sistema, activo) VALUES
(1, 'ADMINISTRADOR', 'Dueño / Administrador del negocio. Acceso total al sistema.',                  1, 1),
(2, 'VENDEDOR',      'Realiza ventas al por mayor y menor, gestiona clientes y cobros.',             0, 1),
(3, 'ALMACENERO',    'Controla inventario, recibe mercadería de compras y gestiona transferencias.', 0, 1);

-- =====================================================================
-- 4. ASIGNACIÓN DE PERMISOS A ROLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) ADMINISTRADOR (dueño): TODOS los permisos del sistema
-- ---------------------------------------------------------------------
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT 1, id_permiso FROM permisos;

-- ---------------------------------------------------------------------
-- 2) VENDEDOR: ventas (mayor y menor), clientes, cobros, caja propia
-- ---------------------------------------------------------------------
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT 2, id_permiso FROM permisos
WHERE codigo IN (
    -- Dashboard
    'dashboard.ver',
    -- Productos (sólo consulta)
    'productos.ver',
    'marcas.ver','categorias.ver','unidades.ver',
    -- Clientes (gestión completa, incluye crédito)
    'clientes.ver','clientes.crear','clientes.editar',
    'clientes.dar_credito','clientes.ver_saldo','clientes.ver_historial',
    'clientes.gestionar_direcciones','clientes.exportar',
    -- Inventario (consulta del stock en todos los depósitos)
    'inventario.ver','inventario.ver_todos_depositos','inventario.alertas_ver',
    -- Ventas (mayor y menor + cobros + devoluciones)
    'ventas.ver_propias','ventas.ver_sucursal',
    'ventas.crear_menor','ventas.crear_mayor',
    'ventas.editar_borrador','ventas.emitir',
    'ventas.aplicar_descuento','ventas.vender_credito',
    'ventas.cobrar','ventas.devolucion_crear','ventas.imprimir','ventas.exportar',
    -- Caja (apertura/cierre del propio turno)
    'caja.ver','caja.abrir','caja.cerrar',
    'caja.ver_arqueo_propio','caja.cuadrar_diferencia',
    -- Reportes propios de ventas
    'reportes.ver',
    'reportes.ventas_periodo','reportes.ventas_producto','reportes.ventas_cliente',
    'reportes.arqueos_caja','reportes.exportar'
);

-- ---------------------------------------------------------------------
-- 3) ALMACENERO: inventario, recepción de compras, transferencias
-- ---------------------------------------------------------------------
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT 3, id_permiso FROM permisos
WHERE codigo IN (
    -- Dashboard
    'dashboard.ver',
    -- Productos (consulta)
    'productos.ver',
    'marcas.ver','categorias.ver','unidades.ver',
    -- Proveedores (sólo consulta, para ver de quién llega la mercadería)
    'proveedores.ver',
    -- Compras (sólo ver y recibir)
    'compras.ver','compras.recibir','compras.recibir_parcial','compras.imprimir',
    -- Inventario (control completo: stock, kardex, transferencias, ajustes)
    'inventario.ver','inventario.ver_todos_depositos','inventario.ver_kardex',
    'inventario.transferir_solicitar','inventario.transferir_enviar','inventario.transferir_recibir',
    'inventario.ajuste_crear','inventario.stock_minimo_editar',
    'inventario.alertas_ver','inventario.alertas_atender','inventario.exportar',
    -- Reportes operativos de almacén
    'reportes.ver',
    'reportes.stock_consolidado','reportes.kardex',
    'reportes.transferencias','reportes.alertas_stock','reportes.exportar'
);

-- =====================================================================
-- FIN DEL SCRIPT DE PERMISOS
-- =====================================================================

-- Verificación
SELECT
    m.nombre AS modulo,
    COUNT(p.id_permiso) AS total_permisos
FROM modulos m
LEFT JOIN permisos p ON p.id_modulo = m.id_modulo
GROUP BY m.id_modulo, m.nombre
ORDER BY m.orden;

SELECT
    r.nombre AS rol,
    COUNT(rp.id_permiso) AS permisos_asignados
FROM roles r
LEFT JOIN rol_permiso rp ON rp.id_rol = r.id_rol
GROUP BY r.id_rol, r.nombre
ORDER BY r.id_rol;
