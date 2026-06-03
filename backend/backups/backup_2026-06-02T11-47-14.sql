-- Backup Megaelectra
-- Generado: 2026-06-02T11:47:14.831Z
-- Base: bd_electrodomesticos

SET FOREIGN_KEY_CHECKS=0;

-- ═══ empresas ═══
TRUNCATE TABLE `empresas`;
INSERT INTO `empresas` (`id_empresa`, `razon_social`, `nombre_comercial`, `nit`, `direccion`, `telefono`, `email`, `logo_url`, `activo`, `fecha_creacion`) VALUES (1, 'COMERCIAL ELECTRODOMÉSTICOS S.R.L.', 'ElectroHogar', '1234567890', 'Av. Principal #123, Santa Cruz', '74819122', 'ruben16felipe@gmail.com', '/uploads/logos/empresa_1.png', 1, '2026-05-31 19:10:30');

-- ═══ sucursales ═══
TRUNCATE TABLE `sucursales`;
INSERT INTO `sucursales` (`id_sucursal`, `id_empresa`, `codigo`, `nombre`, `tipo`, `direccion`, `ciudad`, `telefono`, `responsable`, `es_punto_venta`, `activo`, `fecha_creacion`) VALUES (1, 1, 'SUC-CEN', 'Sucursal Central', 'PRINCIPAL', 'Zona Centro - Multipunto', 'Cochabamba', '74819152', '', 1, 1, '2026-05-31 19:11:07');
INSERT INTO `sucursales` (`id_sucursal`, `id_empresa`, `codigo`, `nombre`, `tipo`, `direccion`, `ciudad`, `telefono`, `responsable`, `es_punto_venta`, `activo`, `fecha_creacion`) VALUES (2, 1, 'SUC-NOR', 'Sucursal Norte', 'SUCURSAL', 'sacaba', 'Cochabamba', '74819152', '', 1, 1, '2026-05-31 19:11:43');
INSERT INTO `sucursales` (`id_sucursal`, `id_empresa`, `codigo`, `nombre`, `tipo`, `direccion`, `ciudad`, `telefono`, `responsable`, `es_punto_venta`, `activo`, `fecha_creacion`) VALUES (3, 1, 'SUC-SUR', 'Sucursal Sur', 'SUCURSAL', 'Chapare', 'Cochabamba', '74819123', '', 1, 1, '2026-05-31 19:12:30');

-- ═══ depositos ═══
TRUNCATE TABLE `depositos`;
INSERT INTO `depositos` (`id_deposito`, `id_sucursal`, `codigo`, `nombre`, `tipo`, `direccion`, `encargado`, `permite_venta`, `activo`, `fecha_creacion`) VALUES (1, 1, 'DEP-01', 'Deposito Central', 'ALMACEN', 'Zona Centro - Multipunto', 'Por definir', 1, 1, '2026-05-31 19:13:26');
INSERT INTO `depositos` (`id_deposito`, `id_sucursal`, `codigo`, `nombre`, `tipo`, `direccion`, `encargado`, `permite_venta`, `activo`, `fecha_creacion`) VALUES (2, 3, 'DEP-02', 'Deposito Sur', 'PUNTO_VENTA', 'Centro comercial el Morro', 'Por definir', 1, 1, '2026-05-31 19:14:11');
INSERT INTO `depositos` (`id_deposito`, `id_sucursal`, `codigo`, `nombre`, `tipo`, `direccion`, `encargado`, `permite_venta`, `activo`, `fecha_creacion`) VALUES (3, 2, 'DEP-03', 'Deposito Norte', 'PUNTO_VENTA', 'sacaba', 'Por definir', 1, 1, '2026-05-31 19:14:57');

-- ═══ monedas ═══
TRUNCATE TABLE `monedas`;
INSERT INTO `monedas` (`id_moneda`, `codigo`, `nombre`, `simbolo`, `decimales`, `es_moneda_base`, `activo`) VALUES (1, 'BOB', 'Boliviano', 'Bs', 1, 1, 1);
INSERT INTO `monedas` (`id_moneda`, `codigo`, `nombre`, `simbolo`, `decimales`, `es_moneda_base`, `activo`) VALUES (2, 'DL', 'Dolar', '$', 1, 0, 0);

-- ═══ tipos_cambio ═══
TRUNCATE TABLE `tipos_cambio`;
INSERT INTO `tipos_cambio` (`id_tipo_cambio`, `id_moneda_origen`, `id_moneda_destino`, `fecha`, `tasa_compra`, `tasa_venta`) VALUES (1, 2, 1, '2026-05-31 04:00:00', '6.960000', '6.980000');

-- ═══ bancos ═══
TRUNCATE TABLE `bancos`;
INSERT INTO `bancos` (`id_banco`, `codigo`, `nombre`, `sigla`, `pais`, `activo`) VALUES (1, 'UNION', 'Banco Union', 'BUN', 'Bolivia', 1);

-- ═══ roles ═══
TRUNCATE TABLE `roles`;
INSERT INTO `roles` (`id_rol`, `nombre`, `descripcion`, `es_sistema`, `activo`) VALUES (1, 'ADMINISTRADOR', 'Dueño / Administrador del negocio. Acceso total al sistema.', 1, 1);
INSERT INTO `roles` (`id_rol`, `nombre`, `descripcion`, `es_sistema`, `activo`) VALUES (2, 'VENDEDOR', 'Realiza ventas al por mayor y menor, gestiona clientes y cobros.', 0, 1);
INSERT INTO `roles` (`id_rol`, `nombre`, `descripcion`, `es_sistema`, `activo`) VALUES (3, 'ALMACENERO', 'Controla inventario, recibe mercadería de compras y gestiona transferencias.', 0, 1);

-- ═══ modulos ═══
TRUNCATE TABLE `modulos`;
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (1, 'DASHBOARD', 'Dashboard', 'home', 1);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (2, 'CONFIGURACION', 'Configuración', 'settings', 2);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (3, 'USUARIOS', 'Usuarios y Roles', 'users', 3);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (4, 'PRODUCTOS', 'Productos', 'package', 4);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (5, 'PROVEEDORES', 'Proveedores', 'truck', 5);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (6, 'CLIENTES', 'Clientes', 'user-check', 6);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (7, 'COMPRAS', 'Compras', 'shopping-bag', 7);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (8, 'INVENTARIO', 'Inventario', 'archive', 8);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (9, 'VENTAS', 'Ventas', 'shopping-cart', 9);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (10, 'CAJA', 'Caja', 'dollar-sign', 10);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (11, 'GASTOS', 'Gastos', 'minus-circle', 11);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (12, 'REPORTES', 'Reportes', 'bar-chart', 12);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (13, 'AUDITORIA', 'Auditoría', 'shield', 13);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (14, 'COTIZACIONES', 'Cotizaciones', 'file-text', 14);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (15, 'COBROS', 'Cobros', 'credit-card', 15);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (16, 'COMBOS', 'Combos', 'gift', 16);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (17, 'PROMOCIONES', 'Promociones', 'tag', 17);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (18, 'BANCOS', 'Bancos', 'briefcase', 18);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (19, 'IMPUESTOS', 'Impuestos', 'percent', 19);
INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES (20, 'HERRAMIENTAS', 'Herramientas', 'tool', 20);

-- ═══ permisos ═══
TRUNCATE TABLE `permisos`;
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (1, 1, 'dashboard.ver', 'Ver Dashboard', 'Acceder al panel principal con indicadores');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (2, 1, 'dashboard.ver_todas_sucursales', 'Ver Dashboard de todas las sucursales', 'Consolidar indicadores de todas las sucursales');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (3, 2, 'configuracion.ver', 'Ver Configuración', 'Acceder al módulo de configuración');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (4, 2, 'empresa.editar', 'Editar datos de Empresa', 'Modificar razón social, NIT, logo');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (5, 2, 'sucursales.ver', 'Ver Sucursales', 'Listar sucursales');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (6, 2, 'sucursales.crear', 'Crear Sucursal', 'Registrar nueva sucursal');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (7, 2, 'sucursales.editar', 'Editar Sucursal', 'Modificar datos de sucursal');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (8, 2, 'sucursales.eliminar', 'Eliminar/Desactivar Sucursal', 'Dar de baja una sucursal');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (9, 2, 'depositos.ver', 'Ver Depósitos', 'Listar depósitos');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (10, 2, 'depositos.crear', 'Crear Depósito', 'Registrar nuevo depósito o almacén');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (11, 2, 'depositos.editar', 'Editar Depósito', 'Modificar datos de depósito');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (12, 2, 'depositos.eliminar', 'Eliminar/Desactivar Depósito', 'Dar de baja un depósito');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (13, 2, 'monedas.ver', 'Ver Monedas', 'Listar monedas configuradas');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (14, 2, 'monedas.gestionar', 'Gestionar Monedas', 'Crear, editar y desactivar monedas');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (15, 2, 'tipos_cambio.ver', 'Ver Tipos de Cambio', 'Consultar tipos de cambio');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (16, 2, 'tipos_cambio.gestionar', 'Gestionar Tipos de Cambio', 'Registrar y actualizar tasas diarias');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (17, 2, 'parametros.ver', 'Ver Parámetros del Sistema', 'Consultar configuración general');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (18, 2, 'parametros.editar', 'Editar Parámetros del Sistema', 'Modificar IVA, prefijos, días alerta, etc.');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (19, 3, 'usuarios.ver', 'Ver Usuarios', 'Listar usuarios del sistema');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (20, 3, 'usuarios.crear', 'Crear Usuario', 'Registrar nuevo usuario');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (21, 3, 'usuarios.editar', 'Editar Usuario', 'Modificar datos de usuario');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (22, 3, 'usuarios.eliminar', 'Eliminar/Desactivar Usuario', 'Dar de baja un usuario');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (23, 3, 'usuarios.resetear_password', 'Resetear Contraseña', 'Forzar cambio de contraseña a otro usuario');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (24, 3, 'usuarios.asignar_sucursales', 'Asignar Sucursales', 'Definir a qué sucursales puede acceder un usuario');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (25, 3, 'usuarios.cerrar_sesiones', 'Cerrar Sesiones', 'Invalidar sesiones activas de otros usuarios');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (26, 3, 'roles.ver', 'Ver Roles', 'Listar roles existentes');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (27, 3, 'roles.crear', 'Crear Rol', 'Registrar nuevo rol');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (28, 3, 'roles.editar', 'Editar Rol', 'Modificar nombre y descripción de rol');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (29, 3, 'roles.eliminar', 'Eliminar Rol', 'Eliminar un rol (no del sistema)');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (30, 3, 'roles.asignar_permisos', 'Asignar Permisos a Rol', 'Configurar permisos por rol');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (31, 3, 'permisos.ver', 'Ver Permisos', 'Consultar catálogo de permisos');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (32, 4, 'productos.ver', 'Ver Productos', 'Listar y buscar productos');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (33, 4, 'productos.crear', 'Crear Producto', 'Registrar nuevo producto');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (34, 4, 'productos.editar', 'Editar Producto', 'Modificar datos generales del producto');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (35, 4, 'productos.editar_precio', 'Editar Precio', 'Modificar precio real y precio público');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (36, 4, 'productos.editar_costos', 'Editar Costos (LOG, MCM)', 'Modificar costos de logística y MCM');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (37, 4, 'productos.editar_bono', 'Editar Bono Vendedor', 'Modificar bono asignado al producto');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (38, 4, 'productos.eliminar', 'Eliminar/Desactivar Producto', 'Dar de baja un producto');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (39, 4, 'productos.exportar', 'Exportar Productos', 'Exportar catálogo a Excel/PDF');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (40, 4, 'productos.importar', 'Importar Productos', 'Carga masiva desde Excel');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (41, 4, 'productos.ver_historico_precios', 'Ver Histórico de Precios', 'Consultar cambios históricos de precio');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (42, 4, 'marcas.ver', 'Ver Marcas', 'Listar marcas');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (43, 4, 'marcas.gestionar', 'Gestionar Marcas', 'Crear, editar y desactivar marcas');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (44, 4, 'categorias.ver', 'Ver Categorías', 'Listar categorías');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (45, 4, 'categorias.gestionar', 'Gestionar Categorías', 'Crear, editar y desactivar categorías');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (46, 4, 'unidades.ver', 'Ver Unidades de Medida', 'Listar unidades de medida');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (47, 4, 'unidades.gestionar', 'Gestionar Unidades de Medida', 'Crear, editar y desactivar unidades');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (48, 5, 'proveedores.ver', 'Ver Proveedores', 'Listar proveedores');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (49, 5, 'proveedores.crear', 'Crear Proveedor', 'Registrar nuevo proveedor');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (50, 5, 'proveedores.editar', 'Editar Proveedor', 'Modificar datos de proveedor');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (51, 5, 'proveedores.eliminar', 'Eliminar/Desactivar Proveedor', 'Dar de baja un proveedor');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (52, 5, 'proveedores.ver_saldo', 'Ver Saldo del Proveedor', 'Consultar cuenta por pagar');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (53, 5, 'proveedores.gestionar_cuentas', 'Gestionar Cuentas de Pago', 'Agregar/editar cuentas (efectivo, QR, banco)');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (54, 5, 'proveedores.gestionar_contactos', 'Gestionar Contactos', 'Agregar y editar contactos del proveedor');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (55, 5, 'proveedores.exportar', 'Exportar Proveedores', 'Exportar a Excel/PDF');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (56, 6, 'clientes.ver', 'Ver Clientes', 'Listar y buscar clientes');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (57, 6, 'clientes.crear', 'Crear Cliente', 'Registrar nuevo cliente');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (58, 6, 'clientes.editar', 'Editar Cliente', 'Modificar datos de cliente');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (59, 6, 'clientes.eliminar', 'Eliminar/Desactivar Cliente', 'Dar de baja un cliente');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (60, 6, 'clientes.dar_credito', 'Otorgar Crédito', 'Activar permite_credito y definir límite');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (61, 6, 'clientes.modificar_limite', 'Modificar Límite de Crédito', 'Cambiar el límite de crédito de un cliente');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (62, 6, 'clientes.ver_saldo', 'Ver Saldo del Cliente', 'Consultar cuenta por cobrar');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (63, 6, 'clientes.ver_historial', 'Ver Historial de Compras', 'Ver todas las ventas del cliente');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (64, 6, 'clientes.gestionar_direcciones', 'Gestionar Direcciones', 'Agregar/editar direcciones de entrega');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (65, 6, 'clientes.exportar', 'Exportar Clientes', 'Exportar a Excel/PDF');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (66, 7, 'compras.ver', 'Ver Compras', 'Listar compras de su sucursal');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (67, 7, 'compras.ver_todas', 'Ver Compras de Todas las Sucursales', 'Acceso a compras de cualquier sucursal');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (68, 7, 'compras.crear_pre_pedido', 'Crear Pre-Pedido', 'Iniciar un pre-pedido a proveedor');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (69, 7, 'compras.editar_pre_pedido', 'Editar Pre-Pedido', 'Modificar pre-pedido antes de confirmar');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (70, 7, 'compras.confirmar_pedido', 'Confirmar Pedido (Por Llegar)', 'Pasar pre-pedido a estado por llegar');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (71, 7, 'compras.aprobar', 'Aprobar Compra', 'Aprobar compras de alto monto');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (72, 7, 'compras.recibir', 'Recibir Mercadería', 'Confirmar recepción y actualizar stock');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (73, 7, 'compras.recibir_parcial', 'Recibir Mercadería Parcial', 'Permitir recepción parcial');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (74, 7, 'compras.anular', 'Anular Compra', 'Cancelar/anular una compra');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (75, 7, 'compras.ver_costos', 'Ver Costos de Compra', 'Visualizar precios reales y márgenes');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (76, 7, 'compras.pagar', 'Registrar Pago a Proveedor', 'Registrar pago de una compra');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (77, 7, 'compras.anular_pago', 'Anular Pago a Proveedor', 'Anular un pago registrado');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (78, 7, 'compras.gestionar_cuotas', 'Gestionar Cuotas de Compra', 'Modificar plan de cuotas');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (79, 7, 'compras.imprimir', 'Imprimir Documento de Compra', 'Generar PDF de orden de compra');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (80, 7, 'compras.exportar', 'Exportar Compras', 'Exportar listado a Excel/PDF');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (81, 8, 'inventario.ver', 'Ver Inventario', 'Consultar stock de su depósito asignado');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (82, 8, 'inventario.ver_todos_depositos', 'Ver Inventario de Todos los Depósitos', 'Stock consolidado multi-depósito');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (83, 8, 'inventario.ver_kardex', 'Ver Kardex', 'Consultar historial de movimientos');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (84, 8, 'inventario.transferir_solicitar', 'Solicitar Transferencia', 'Crear solicitud de transferencia entre depósitos');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (85, 8, 'inventario.transferir_enviar', 'Enviar Transferencia', 'Confirmar envío de mercadería');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (86, 8, 'inventario.transferir_recibir', 'Recibir Transferencia', 'Confirmar recepción en depósito destino');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (87, 8, 'inventario.transferir_anular', 'Anular Transferencia', 'Cancelar una transferencia');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (88, 8, 'inventario.ajuste_crear', 'Crear Ajuste de Inventario', 'Registrar ajuste por conteo físico');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (89, 8, 'inventario.ajuste_aprobar', 'Aprobar Ajuste de Inventario', 'Aprobar ajustes de stock');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (90, 8, 'inventario.ajuste_anular', 'Anular Ajuste de Inventario', 'Cancelar un ajuste pendiente');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (91, 8, 'inventario.stock_minimo_editar', 'Editar Stock Mínimo por Producto', 'Modificar umbral de alerta');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (92, 8, 'inventario.alertas_ver', 'Ver Alertas de Stock Mínimo', 'Listar productos bajo stock mínimo');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (93, 8, 'inventario.alertas_atender', 'Atender Alertas', 'Marcar alertas como atendidas');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (94, 8, 'inventario.exportar', 'Exportar Inventario', 'Exportar reporte de stock a Excel');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (95, 9, 'ventas.ver_propias', 'Ver Ventas Propias', 'Ver sólo las ventas que el vendedor realizó');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (96, 9, 'ventas.ver_sucursal', 'Ver Ventas de la Sucursal', 'Ver todas las ventas de su sucursal');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (97, 9, 'ventas.ver_todas', 'Ver Ventas de Todas las Sucursales', 'Ver ventas a nivel global');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (98, 9, 'ventas.crear_menor', 'Crear Venta al Por Menor', 'Registrar venta minorista');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (99, 9, 'ventas.crear_mayor', 'Crear Venta al Por Mayor', 'Registrar venta mayorista');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (100, 9, 'ventas.editar_borrador', 'Editar Venta en Borrador', 'Modificar venta antes de emitirla');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (101, 9, 'ventas.emitir', 'Emitir Venta', 'Confirmar y emitir la venta');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (102, 9, 'ventas.aplicar_descuento', 'Aplicar Descuento', 'Otorgar descuento dentro de margen permitido');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (103, 9, 'ventas.aplicar_descuento_alto', 'Aplicar Descuento Alto', 'Otorgar descuentos sobre el límite estándar');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (104, 9, 'ventas.vender_credito', 'Vender a Crédito', 'Realizar ventas a crédito');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (105, 9, 'ventas.aprobar_credito', 'Aprobar Crédito sobre Límite', 'Autorizar venta que excede el límite del cliente');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (106, 9, 'ventas.cobrar', 'Registrar Cobro', 'Registrar pagos de ventas');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (107, 9, 'ventas.anular_cobro', 'Anular Cobro', 'Anular un cobro registrado');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (108, 9, 'ventas.anular', 'Anular Venta', 'Anular una venta emitida');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (109, 9, 'ventas.devolucion_crear', 'Crear Devolución', 'Iniciar proceso de devolución');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (110, 9, 'ventas.devolucion_aprobar', 'Aprobar Devolución', 'Aprobar devolución y reingresar stock');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (111, 9, 'ventas.cambiar_vendedor', 'Cambiar Vendedor de la Venta', 'Reasignar vendedor');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (112, 9, 'ventas.ver_utilidad', 'Ver Utilidad de la Venta', 'Visualizar costo y rentabilidad');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (113, 9, 'ventas.imprimir', 'Imprimir/Reimprimir Factura', 'Generar PDF o reimprimir comprobante');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (114, 9, 'ventas.exportar', 'Exportar Ventas', 'Exportar a Excel/PDF');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (115, 10, 'caja.ver', 'Ver Cajas', 'Listar cajas configuradas');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (116, 10, 'caja.gestionar', 'Gestionar Cajas', 'Crear, editar y desactivar cajas');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (117, 10, 'caja.abrir', 'Abrir Caja', 'Iniciar turno de caja');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (118, 10, 'caja.cerrar', 'Cerrar Caja', 'Cerrar turno y registrar arqueo');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (119, 10, 'caja.ver_arqueo_propio', 'Ver Arqueo Propio', 'Ver sus propios arqueos');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (120, 10, 'caja.ver_arqueo_todos', 'Ver Arqueos de Todos', 'Ver arqueos de todos los cajeros');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (121, 10, 'caja.cuadrar_diferencia', 'Cuadrar Diferencia', 'Justificar diferencias en arqueo');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (122, 10, 'caja.forzar_cierre', 'Forzar Cierre de Caja', 'Cerrar caja de otro usuario en casos especiales');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (123, 10, 'caja.exportar', 'Exportar Arqueos', 'Exportar arqueos a Excel/PDF');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (124, 11, 'gastos.ver', 'Ver Gastos', 'Listar gastos de su sucursal');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (125, 11, 'gastos.ver_todos', 'Ver Gastos de Todas las Sucursales', 'Ver gastos a nivel global');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (126, 11, 'gastos.crear', 'Registrar Gasto', 'Crear nuevo gasto');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (127, 11, 'gastos.editar', 'Editar Gasto', 'Modificar gasto en estado REGISTRADO');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (128, 11, 'gastos.aprobar', 'Aprobar Gasto', 'Aprobar gastos registrados');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (129, 11, 'gastos.pagar', 'Marcar Gasto como Pagado', 'Registrar el pago del gasto');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (130, 11, 'gastos.anular', 'Anular Gasto', 'Anular un gasto');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (131, 11, 'gastos.categorias_ver', 'Ver Categorías de Gasto', 'Listar categorías');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (132, 11, 'gastos.categorias_gestionar', 'Gestionar Categorías de Gasto', 'Crear, editar y desactivar categorías');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (133, 11, 'gastos.adjuntar_comprobante', 'Adjuntar Comprobante', 'Subir comprobante de gasto');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (134, 11, 'gastos.exportar', 'Exportar Gastos', 'Exportar a Excel/PDF');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (135, 12, 'reportes.ver', 'Acceder a Reportes', 'Acceso general al módulo');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (136, 12, 'reportes.stock_consolidado', 'Reporte Stock Consolidado', 'Ver stock por depósito (formato Excel)');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (137, 12, 'reportes.ventas_periodo', 'Reporte Ventas por Período', 'Ventas filtradas por fecha');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (138, 12, 'reportes.ventas_vendedor', 'Reporte Ventas por Vendedor', 'Ranking y detalle por vendedor');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (139, 12, 'reportes.ventas_producto', 'Reporte Ventas por Producto', 'Top productos vendidos');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (140, 12, 'reportes.ventas_cliente', 'Reporte Ventas por Cliente', 'Compras por cliente');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (141, 12, 'reportes.compras_periodo', 'Reporte Compras por Período', 'Compras filtradas por fecha');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (142, 12, 'reportes.compras_proveedor', 'Reporte Compras por Proveedor', 'Total comprado por proveedor');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (143, 12, 'reportes.cuentas_cobrar', 'Reporte Cuentas por Cobrar', 'Clientes con saldo pendiente');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (144, 12, 'reportes.cuentas_pagar', 'Reporte Cuentas por Pagar', 'Proveedores con saldo pendiente');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (145, 12, 'reportes.alertas_stock', 'Reporte Alertas Stock Mínimo', 'Productos bajo stock mínimo');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (146, 12, 'reportes.kardex', 'Reporte Kardex por Producto', 'Movimientos detallados de un producto');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (147, 12, 'reportes.rentabilidad', 'Reporte Rentabilidad', 'Utilidad por producto/marca/categoría');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (148, 12, 'reportes.estado_resultados', 'Reporte Estado de Resultados', 'Ingresos - costos - gastos');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (149, 12, 'reportes.bonos_vendedores', 'Reporte Bonos a Vendedores', 'Bonos generados por vendedor');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (150, 12, 'reportes.arqueos_caja', 'Reporte Arqueos de Caja', 'Arqueos por sucursal/período');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (151, 12, 'reportes.gastos_categoria', 'Reporte Gastos por Categoría', 'Distribución de gastos');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (152, 12, 'reportes.transferencias', 'Reporte Transferencias', 'Histórico de transferencias entre depósitos');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (153, 12, 'reportes.devoluciones', 'Reporte Devoluciones', 'Devoluciones por período/causa');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (154, 12, 'reportes.exportar', 'Exportar Reportes', 'Descargar reportes en Excel/PDF');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (155, 12, 'reportes.dashboard_financiero', 'Dashboard Financiero', 'Indicadores financieros consolidados');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (156, 13, 'auditoria.ver', 'Ver Auditoría', 'Acceder al log de auditoría');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (157, 13, 'auditoria.filtrar', 'Filtrar Auditoría', 'Filtrar por usuario, tabla, fecha');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (158, 13, 'auditoria.exportar', 'Exportar Auditoría', 'Exportar log a Excel/PDF');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (159, 13, 'sesiones.ver', 'Ver Sesiones Activas', 'Ver usuarios conectados');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (160, 13, 'sesiones.cerrar', 'Cerrar Sesiones Activas', 'Forzar cierre de sesión');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (161, 14, 'cotizaciones.ver', 'Ver Cotizaciones', 'Listar cotizaciones de su sucursal');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (162, 14, 'cotizaciones.ver_todas', 'Ver Cotizaciones de Todas las Sucursales', 'Acceso global');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (163, 14, 'cotizaciones.crear', 'Crear Cotización', 'Generar nueva cotización');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (164, 14, 'cotizaciones.editar', 'Editar Cotización', 'Modificar cotización en borrador');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (165, 14, 'cotizaciones.emitir', 'Emitir Cotización', 'Confirmar y enviar al cliente');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (166, 14, 'cotizaciones.aprobar', 'Aprobar Cotización', 'Marcar como aprobada por cliente');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (167, 14, 'cotizaciones.rechazar', 'Rechazar Cotización', 'Marcar como rechazada');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (168, 14, 'cotizaciones.convertir_venta', 'Convertir en Venta', 'Generar venta a partir de cotización');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (169, 14, 'cotizaciones.anular', 'Anular Cotización', 'Anular cotización emitida');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (170, 14, 'cotizaciones.imprimir', 'Imprimir Cotización', 'Generar PDF de la cotización');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (171, 14, 'cotizaciones.exportar', 'Exportar Cotizaciones', 'Exportar listado a Excel/PDF');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (172, 15, 'cobros.ver', 'Ver Cobros', 'Listar cobros realizados');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (173, 15, 'cobros.ver_todos', 'Ver Cobros de Todas las Sucursales', 'Acceso global');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (174, 15, 'cobros.crear', 'Registrar Cobro', 'Registrar pago de venta a crédito');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (175, 15, 'cobros.editar', 'Editar Cobro', 'Modificar cobro en el mismo día');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (176, 15, 'cobros.anular', 'Anular Cobro', 'Anular un cobro registrado');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (177, 15, 'cobros.contado', 'Cobros al Contado', 'Gestionar cobros al contado');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (178, 15, 'cobros.credito', 'Cobros a Crédito', 'Gestionar cobros a crédito');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (179, 15, 'cobros.efectivo', 'Cobrar en Efectivo', 'Aceptar pagos en efectivo');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (180, 15, 'cobros.qr', 'Cobrar por QR', 'Aceptar pagos por QR');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (181, 15, 'cobros.imprimir', 'Imprimir Recibo', 'Generar recibo de cobro');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (182, 15, 'cobros.exportar', 'Exportar Cobros', 'Exportar a Excel/PDF');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (183, 16, 'combos.ver', 'Ver Combos', 'Listar combos activos');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (184, 16, 'combos.crear', 'Crear Combo', 'Definir nuevo pack de productos');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (185, 16, 'combos.editar', 'Editar Combo', 'Modificar combo');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (186, 16, 'combos.eliminar', 'Eliminar/Desactivar Combo', 'Dar de baja un combo');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (187, 16, 'combos.exportar', 'Exportar Combos', 'Exportar a Excel/PDF');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (188, 17, 'promociones.ver', 'Ver Promociones', 'Listar promociones');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (189, 17, 'promociones.crear', 'Crear Promoción', 'Definir nueva promoción');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (190, 17, 'promociones.editar', 'Editar Promoción', 'Modificar promoción vigente');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (191, 17, 'promociones.eliminar', 'Eliminar/Desactivar Promoción', 'Dar de baja una promoción');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (192, 17, 'promociones.aplicar', 'Aplicar Promoción Manual', 'Aplicar promoción a una venta manualmente');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (193, 17, 'promociones.exportar', 'Exportar Promociones', 'Exportar a Excel/PDF');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (194, 18, 'bancos.ver', 'Ver Bancos', 'Listar catálogo de bancos');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (195, 18, 'bancos.crear', 'Crear Banco', 'Registrar nuevo banco');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (196, 18, 'bancos.editar', 'Editar Banco', 'Modificar datos del banco');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (197, 18, 'bancos.eliminar', 'Eliminar/Desactivar Banco', 'Dar de baja un banco');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (198, 19, 'impuestos.ver', 'Ver Impuestos', 'Listar catálogo de impuestos');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (199, 19, 'impuestos.crear', 'Crear Impuesto', 'Registrar nuevo impuesto');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (200, 19, 'impuestos.editar', 'Editar Impuesto', 'Modificar porcentaje o nombre');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (201, 19, 'impuestos.eliminar', 'Eliminar/Desactivar Impuesto', 'Dar de baja un impuesto');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (202, 20, 'herramientas.ver', 'Acceder a Herramientas', 'Acceso al panel de herramientas');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (203, 20, 'backup.crear', 'Crear Copia de Seguridad', 'Generar backup de la BD');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (204, 20, 'backup.restaurar', 'Restaurar Copia de Seguridad', 'Restaurar BD desde backup');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (205, 20, 'backup.descargar', 'Descargar Backups', 'Descargar archivos de backup');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (206, 20, 'bd.eliminar_registros', 'Eliminar Registros de BD', 'Operación crítica: borrar datos masivos');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (207, 20, 'excel.exportar_planilla', 'Descargar Planilla Excel', 'Descargar plantilla para carga masiva');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (208, 20, 'excel.importar_productos', 'Importar Productos desde Excel', 'Cargar productos masivamente');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (209, 20, 'excel.exportar_productos', 'Exportar Productos a Excel', 'Exportar catálogo completo');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (210, 20, 'codigo_barras.generar', 'Generar Código de Barras', 'Generar y/o imprimir códigos de barra');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (211, 20, 'catalogo.generar_pdf', 'Generar Catálogo PDF', 'Generar catálogo de productos en PDF');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (212, 20, 'impresora.configurar', 'Configurar Impresora', 'Definir impresora por defecto y tipo');
INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES (213, 20, 'factura.editar_plantilla', 'Editar Plantilla de Factura', 'Personalizar diseño de factura');

-- ═══ rol_permiso ═══
TRUNCATE TABLE `rol_permiso`;
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 1);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 2);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 3);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 4);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 5);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 6);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 7);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 8);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 9);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 10);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 11);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 12);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 13);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 14);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 15);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 16);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 17);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 18);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 19);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 20);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 21);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 22);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 23);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 24);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 25);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 26);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 27);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 28);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 29);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 30);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 31);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 32);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 33);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 34);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 35);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 36);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 37);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 38);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 39);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 40);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 41);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 42);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 43);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 44);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 45);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 46);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 47);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 48);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 49);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 50);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 51);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 52);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 53);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 54);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 55);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 56);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 57);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 58);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 59);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 60);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 61);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 62);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 63);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 64);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 65);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 66);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 67);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 68);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 69);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 70);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 71);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 72);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 73);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 74);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 75);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 76);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 77);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 78);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 79);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 80);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 81);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 82);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 83);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 84);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 85);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 86);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 87);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 88);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 89);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 90);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 91);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 92);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 93);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 94);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 95);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 96);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 97);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 98);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 99);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 100);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 101);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 102);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 103);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 104);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 105);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 106);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 107);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 108);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 109);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 110);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 111);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 112);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 113);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 114);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 115);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 116);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 117);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 118);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 119);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 120);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 121);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 122);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 123);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 124);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 125);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 126);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 127);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 128);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 129);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 130);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 131);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 132);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 133);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 134);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 135);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 136);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 137);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 138);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 139);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 140);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 141);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 142);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 143);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 144);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 145);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 146);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 147);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 148);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 149);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 150);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 151);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 152);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 153);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 154);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 155);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 156);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 157);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 158);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 159);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 160);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 161);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 162);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 163);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 164);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 165);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 166);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 167);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 168);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 169);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 170);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 171);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 172);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 173);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 174);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 175);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 176);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 177);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 178);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 179);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 180);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 181);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 182);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 183);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 184);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 185);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 186);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 187);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 188);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 189);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 190);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 191);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 192);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 193);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 194);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 195);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 196);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 197);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 198);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 199);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 200);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 201);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 202);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 203);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 204);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 205);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 206);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 207);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 208);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 209);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 210);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 211);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 212);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (1, 213);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 1);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 32);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 42);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 44);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 46);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 56);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 57);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 58);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 60);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 62);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 63);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 64);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 65);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 81);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 82);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 92);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 95);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 96);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 98);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 99);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 100);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 101);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 102);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 104);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 106);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 109);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 113);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 114);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 115);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 117);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 118);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 119);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 121);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 135);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 137);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 139);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 140);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 150);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 154);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 161);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 163);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 164);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 165);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 166);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 167);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 168);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 170);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 171);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 172);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 174);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 177);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 178);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 179);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 180);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 181);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 182);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 183);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 188);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 192);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (2, 210);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 1);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 32);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 42);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 44);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 46);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 48);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 66);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 72);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 73);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 79);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 81);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 82);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 83);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 84);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 85);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 86);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 88);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 91);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 92);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 93);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 94);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 135);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 136);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 145);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 146);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 152);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 154);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 183);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 209);
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES (3, 210);

-- ═══ usuarios ═══
TRUNCATE TABLE `usuarios`;
INSERT INTO `usuarios` (`id_usuario`, `username`, `password_hash`, `nombres`, `apellidos`, `documento`, `email`, `telefono`, `id_rol`, `id_sucursal_default`, `foto_url`, `debe_cambiar_pass`, `ultimo_login`, `activo`, `fecha_creacion`) VALUES (1, 'admin', '$2b$10$4Y5AuM3I2pmNRRZgzN7R8eq4ODfoYvmKjUK3awQOgGrfC4zkUYWGu', 'Administrador', 'del Sistema', '00000000', 'admin@electrohogar.bo', '70000000', 1, 1, NULL, 0, '2026-06-02 10:48:38', 1, '2026-05-25 11:48:46');
INSERT INTO `usuarios` (`id_usuario`, `username`, `password_hash`, `nombres`, `apellidos`, `documento`, `email`, `telefono`, `id_rol`, `id_sucursal_default`, `foto_url`, `debe_cambiar_pass`, `ultimo_login`, `activo`, `fecha_creacion`) VALUES (2, 'vendedor1', '$2b$10$v9eKl1yIevok5lO/C8rsg.tGN/FS.QLUu6vCikf23PxBGqQPMEVjm', 'Vendedor', 'Uno', '11111111', 'vendedor1@electrohogar.bo', '71111111', 2, 1, NULL, 1, NULL, 1, '2026-05-25 11:48:46');
INSERT INTO `usuarios` (`id_usuario`, `username`, `password_hash`, `nombres`, `apellidos`, `documento`, `email`, `telefono`, `id_rol`, `id_sucursal_default`, `foto_url`, `debe_cambiar_pass`, `ultimo_login`, `activo`, `fecha_creacion`) VALUES (3, 'almacen1', '$2b$10$mWN4w1jnMGRo6qLd33L7N.Dpb5mNvxDul29YHzqYJ8IKYttatelQW', 'Almacenero', 'Uno', '22222222', 'almacen1@electrohogar.bo', '72222222', 3, 1, NULL, 1, NULL, 1, '2026-05-25 11:48:46');

-- ═══ usuario_sucursal ═══
TRUNCATE TABLE `usuario_sucursal`;

-- ═══ marcas ═══
TRUNCATE TABLE `marcas`;
INSERT INTO `marcas` (`id_marca`, `nombre`, `pais_origen`, `logo_url`, `activo`) VALUES (1, 'ABBA', 'Argentina', NULL, 1);
INSERT INTO `marcas` (`id_marca`, `nombre`, `pais_origen`, `logo_url`, `activo`) VALUES (2, 'CONSUL', 'BRASIL', NULL, 1);

-- ═══ categorias ═══
TRUNCATE TABLE `categorias`;
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (1, NULL, 'Cocinas', 'cocinas', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (2, NULL, 'Lavadoras', 'lavadora', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (3, NULL, 'Televisor', 'tv', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (4, NULL, 'Refrigerador', NULL, 1);

-- ═══ unidades_medida ═══
TRUNCATE TABLE `unidades_medida`;
INSERT INTO `unidades_medida` (`id_unidad`, `codigo`, `nombre`, `activo`) VALUES (1, 'CAJA', 'Caja', 1);
INSERT INTO `unidades_medida` (`id_unidad`, `codigo`, `nombre`, `activo`) VALUES (2, 'UND', 'Unidad', 1);

-- ═══ impuestos ═══
TRUNCATE TABLE `impuestos`;
INSERT INTO `impuestos` (`id_impuesto`, `codigo`, `nombre`, `porcentaje`, `tipo`, `es_default`, `activo`) VALUES (1, 'IVA', 'IVA', '13.00', 'AMBOS', 1, 1);

-- ═══ proveedores ═══
TRUNCATE TABLE `proveedores`;
INSERT INTO `proveedores` (`id_proveedor`, `codigo`, `razon_social`, `nombre_comercial`, `nit`, `tipo_proveedor`, `direccion`, `ciudad`, `pais`, `telefono`, `email`, `contacto_principal`, `plazo_credito_dias`, `saldo_actual`, `activo`, `fecha_creacion`) VALUES (1, 'PROV0001', 'DISMATEC', 'DISMATEC IMPORTACIONES', '1234567890', 'NACIONAL', 'Av. Eduardo Arce', 'Cochabamba', 'Bolivia', '74819152', 'david@megaelectra.com', 'JULIAN', 30, '0.00', 1, '2026-05-31 19:44:04');
INSERT INTO `proveedores` (`id_proveedor`, `codigo`, `razon_social`, `nombre_comercial`, `nit`, `tipo_proveedor`, `direccion`, `ciudad`, `pais`, `telefono`, `email`, `contacto_principal`, `plazo_credito_dias`, `saldo_actual`, `activo`, `fecha_creacion`) VALUES (2, 'PROV0002', 'ROSVANIA S.R.L', 'ROSVANIA', '89445548', 'NACIONAL', 'Zona Centro - Multipunto', 'Santa Cruz', 'Bolivia', '74819152', 'ruben16felipe2003@gmail.com', 'MENDEZ', 30, '0.00', 1, '2026-05-31 19:45:43');

-- ═══ proveedor_contactos ═══
TRUNCATE TABLE `proveedor_contactos`;

-- ═══ proveedor_cuentas_pago ═══
TRUNCATE TABLE `proveedor_cuentas_pago`;

-- ═══ clientes ═══
TRUNCATE TABLE `clientes`;
INSERT INTO `clientes` (`id_cliente`, `codigo`, `tipo_cliente`, `tipo_documento`, `documento`, `razon_social`, `nombres`, `apellidos`, `telefono`, `celular`, `email`, `fecha_nacimiento`, `permite_credito`, `limite_credito`, `saldo_actual`, `dias_credito`, `descuento_default`, `activo`, `fecha_creacion`) VALUES (1, 'CLI-0001', 'MINORISTA', 'CI', '9391668', 'CLIENTE OCASIONAL', 'Cliente', 'Ocasional', '74852612', '74819166', 'judi12341@gmail.com', '2002-01-29 04:00:00', 0, '0.00', '0.00', 0, '0.00', 1, '2026-05-31 19:47:12');
INSERT INTO `clientes` (`id_cliente`, `codigo`, `tipo_cliente`, `tipo_documento`, `documento`, `razon_social`, `nombres`, `apellidos`, `telefono`, `celular`, `email`, `fecha_nacimiento`, `permite_credito`, `limite_credito`, `saldo_actual`, `dias_credito`, `descuento_default`, `activo`, `fecha_creacion`) VALUES (2, 'CLI-00002', 'MINORISTA', 'CI', '9391669', 'Felipe', 'Ruben', 'Felipe', NULL, '74819123', 'ruben16felipe2003@gmail.com', '2004-07-15 04:00:00', 0, '0.00', '0.00', 0, '0.00', 1, '2026-05-31 20:05:56');

-- ═══ cliente_direcciones ═══
TRUNCATE TABLE `cliente_direcciones`;

-- ═══ configuracion_sistema ═══
TRUNCATE TABLE `configuracion_sistema`;

-- ═══ tipos_movimiento ═══
TRUNCATE TABLE `tipos_movimiento`;
INSERT INTO `tipos_movimiento` (`id_tipo_movimiento`, `codigo`, `nombre`, `efecto`, `afecta_costo`) VALUES (1, 'COMPRA', 'Entrada por Compra', 'ENTRADA', 1);
INSERT INTO `tipos_movimiento` (`id_tipo_movimiento`, `codigo`, `nombre`, `efecto`, `afecta_costo`) VALUES (2, 'VENTA', 'Salida por Venta', 'SALIDA', 0);
INSERT INTO `tipos_movimiento` (`id_tipo_movimiento`, `codigo`, `nombre`, `efecto`, `afecta_costo`) VALUES (3, 'DEVOLUCION_VTA', 'Entrada por Devolución de Venta', 'ENTRADA', 0);
INSERT INTO `tipos_movimiento` (`id_tipo_movimiento`, `codigo`, `nombre`, `efecto`, `afecta_costo`) VALUES (4, 'DEVOLUCION_CMP', 'Salida por Devolución a Proveedor', 'SALIDA', 1);
INSERT INTO `tipos_movimiento` (`id_tipo_movimiento`, `codigo`, `nombre`, `efecto`, `afecta_costo`) VALUES (5, 'TRANSFERENCIA_SAL', 'Salida por Transferencia', 'TRANSFERENCIA', 0);
INSERT INTO `tipos_movimiento` (`id_tipo_movimiento`, `codigo`, `nombre`, `efecto`, `afecta_costo`) VALUES (6, 'TRANSFERENCIA_ENT', 'Entrada por Transferencia', 'TRANSFERENCIA', 0);
INSERT INTO `tipos_movimiento` (`id_tipo_movimiento`, `codigo`, `nombre`, `efecto`, `afecta_costo`) VALUES (7, 'AJUSTE_POS', 'Ajuste Positivo de Inventario', 'AJUSTE', 1);
INSERT INTO `tipos_movimiento` (`id_tipo_movimiento`, `codigo`, `nombre`, `efecto`, `afecta_costo`) VALUES (8, 'AJUSTE_NEG', 'Ajuste Negativo de Inventario', 'AJUSTE', 1);
INSERT INTO `tipos_movimiento` (`id_tipo_movimiento`, `codigo`, `nombre`, `efecto`, `afecta_costo`) VALUES (9, 'APERTURA', 'Apertura/Inventario Inicial', 'ENTRADA', 1);
INSERT INTO `tipos_movimiento` (`id_tipo_movimiento`, `codigo`, `nombre`, `efecto`, `afecta_costo`) VALUES (10, 'MERMA', 'Salida por Merma o Pérdida', 'SALIDA', 1);

-- ═══ ajuste_inventario_detalle ═══
TRUNCATE TABLE `ajuste_inventario_detalle`;

-- ═══ ajustes_inventario ═══
TRUNCATE TABLE `ajustes_inventario`;

-- ═══ alertas_stock ═══
TRUNCATE TABLE `alertas_stock`;

-- ═══ arqueos_caja ═══
TRUNCATE TABLE `arqueos_caja`;

-- ═══ auditoria ═══
TRUNCATE TABLE `auditoria`;
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (1, 1, 'usuarios', 1, 'OTRO', '{"id_usuario":1,"username":"admin","nombres":"Administrador","apellidos":"del Sistema","documento":"00000000","email":"admin@electrohogar.bo","telefono":"70000000","id_rol":1,"id_sucursal_default":1,"debe_cambiar_pass":1,"activo":1,"accion_especifica":"RESET_PASSWORD"}', NULL, '127.0.0.1', '2026-05-31 16:00:48');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (2, 1, 'usuarios', 1, 'OTRO', '{"id_usuario":1,"username":"admin","nombres":"Administrador","apellidos":"del Sistema","documento":"00000000","email":"admin@electrohogar.bo","telefono":"70000000","id_rol":1,"id_sucursal_default":1,"debe_cambiar_pass":1,"activo":1,"accion_especifica":"RESET_PASSWORD"}', NULL, '127.0.0.1', '2026-05-31 16:01:02');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (3, 1, 'usuarios', 1, 'OTRO', '{"id_usuario":1,"username":"admin","nombres":"Administrador","apellidos":"del Sistema","documento":"00000000","email":"admin@electrohogar.bo","telefono":"70000000","id_rol":1,"id_sucursal_default":1,"debe_cambiar_pass":1,"activo":1,"accion_especifica":"RESET_PASSWORD"}', NULL, '127.0.0.1', '2026-05-31 16:01:24');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (4, 1, 'usuarios', 1, 'LOGOUT', NULL, NULL, '127.0.0.1', '2026-05-31 16:01:27');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (5, 1, 'usuarios', 1, 'LOGIN', NULL, NULL, '127.0.0.1', '2026-05-31 16:01:36');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (6, 1, 'usuarios', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-31 16:01:50');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (7, 1, 'usuarios', 1, 'LOGOUT', NULL, NULL, '127.0.0.1', '2026-05-31 16:29:41');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (8, 1, 'usuarios', 1, 'LOGIN', NULL, NULL, '127.0.0.1', '2026-05-31 16:29:47');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (9, 1, 'rol_permiso', 1, 'UPDATE', '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213]', '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213]', '127.0.0.1', '2026-05-31 16:32:37');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (10, 1, 'usuarios', 1, 'LOGOUT', NULL, NULL, '127.0.0.1', '2026-05-31 18:53:33');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (11, 1, 'usuarios', 1, 'LOGIN', NULL, NULL, '127.0.0.1', '2026-05-31 18:53:43');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (12, 1, 'usuarios', 1, 'LOGOUT', NULL, NULL, '127.0.0.1', '2026-05-31 19:01:36');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (13, 1, 'usuarios', 1, 'LOGIN', NULL, NULL, '127.0.0.1', '2026-05-31 19:02:00');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (14, 1, 'usuarios', 1, 'LOGOUT', NULL, NULL, '127.0.0.1', '2026-05-31 19:09:24');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (15, 1, 'usuarios', 1, 'LOGIN', NULL, NULL, '127.0.0.1', '2026-05-31 19:10:16');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (16, 1, 'empresas', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-31 19:10:30');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (17, 1, 'sucursales', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-31 19:11:07');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (18, 1, 'sucursales', 2, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-31 19:11:43');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (19, 1, 'sucursales', 3, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-31 19:12:30');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (20, 1, 'depositos', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-31 19:13:26');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (21, 1, 'depositos', 2, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-31 19:14:11');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (22, 1, 'depositos', 3, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-31 19:14:57');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (23, 1, 'monedas', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-31 19:25:12');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (24, 1, 'monedas', 2, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-31 19:26:04');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (25, 1, 'tipos_cambio', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-31 19:26:25');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (26, 1, 'bancos', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-31 19:35:37');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (27, 1, 'impuestos', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-31 19:36:13');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (28, 1, 'empresas', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-31 19:38:02');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (29, 1, 'empresas', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-31 19:38:05');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (30, 1, 'monedas', 2, 'DELETE', NULL, NULL, '127.0.0.1', '2026-05-31 19:38:22');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (31, 1, 'proveedores', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-31 19:44:04');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (32, 1, 'proveedores', 2, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-31 19:45:43');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (33, 1, 'clientes', 1, '', NULL, NULL, '127.0.0.1', '2026-05-31 19:47:12');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (34, 1, 'clientes', 2, '', NULL, NULL, '127.0.0.1', '2026-05-31 20:05:56');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (35, 1, 'usuarios', 1, 'LOGIN', NULL, NULL, '127.0.0.1', '2026-06-01 20:01:14');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (36, 1, 'usuarios', 1, 'LOGOUT', NULL, NULL, '127.0.0.1', '2026-06-02 01:33:30');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (37, 1, 'usuarios', 1, 'LOGIN', NULL, NULL, '127.0.0.1', '2026-06-02 10:48:38');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (38, 1, 'unidades_medida', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-06-02 10:51:14');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (39, 1, 'unidades_medida', 2, 'INSERT', NULL, NULL, '127.0.0.1', '2026-06-02 10:52:03');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (40, 1, 'unidades_medida', 1, 'DELETE', NULL, NULL, '127.0.0.1', '2026-06-02 10:52:13');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (41, 1, 'unidades_medida', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-06-02 10:52:18');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (42, 1, 'categorias', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-06-02 10:52:45');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (43, 1, 'categorias', 2, 'INSERT', NULL, NULL, '127.0.0.1', '2026-06-02 10:53:00');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (44, 1, 'categorias', 3, 'INSERT', NULL, NULL, '127.0.0.1', '2026-06-02 10:53:17');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (45, 1, 'categorias', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-06-02 10:53:24');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (46, 1, 'marcas', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-06-02 10:53:52');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (47, 1, 'marcas', 2, 'INSERT', NULL, NULL, '127.0.0.1', '2026-06-02 10:54:08');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (48, 1, 'categorias', 4, 'INSERT', NULL, NULL, '127.0.0.1', '2026-06-02 10:54:55');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (49, 1, 'categorias', 4, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-06-02 10:55:07');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (50, 1, 'productos', 1, '', NULL, NULL, '127.0.0.1', '2026-06-02 10:57:28');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (51, 1, 'productos', 2, '', NULL, NULL, '127.0.0.1', '2026-06-02 11:00:10');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (52, 1, 'compras', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-06-02 11:03:28');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (53, 1, 'compras', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-06-02 11:03:38');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (54, 1, 'pagos_compra', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-06-02 11:04:42');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (55, 1, 'compras', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-06-02 11:10:26');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (56, 1, 'compras', 2, 'INSERT', NULL, NULL, '127.0.0.1', '2026-06-02 11:44:14');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (57, 1, 'pagos_compra', 2, 'INSERT', NULL, NULL, '127.0.0.1', '2026-06-02 11:44:20');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (58, 1, 'compras', 2, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-06-02 11:44:23');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (59, 1, 'compras', 2, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-06-02 11:44:26');

-- ═══ cajas ═══
TRUNCATE TABLE `cajas`;

-- ═══ categorias_gasto ═══
TRUNCATE TABLE `categorias_gasto`;

-- ═══ combo_detalle ═══
TRUNCATE TABLE `combo_detalle`;

-- ═══ combos ═══
TRUNCATE TABLE `combos`;

-- ═══ compra_cuotas ═══
TRUNCATE TABLE `compra_cuotas`;

-- ═══ compra_detalle ═══
TRUNCATE TABLE `compra_detalle`;
INSERT INTO `compra_detalle` (`id_detalle`, `id_compra`, `id_producto`, `cantidad`, `cantidad_recibida`, `precio_unitario`, `descuento_porc`, `descuento_monto`, `id_impuesto`, `impuesto_porc`, `subtotal`, `observacion`) VALUES (1, 1, 2, '5.00', '5.00', '1200.0000', '0.00', '0.00', NULL, '0.00', '6000.00', NULL);
INSERT INTO `compra_detalle` (`id_detalle`, `id_compra`, `id_producto`, `cantidad`, `cantidad_recibida`, `precio_unitario`, `descuento_porc`, `descuento_monto`, `id_impuesto`, `impuesto_porc`, `subtotal`, `observacion`) VALUES (2, 1, 1, '8.00', '8.00', '1400.0000', '0.00', '0.00', NULL, '0.00', '11200.00', NULL);
INSERT INTO `compra_detalle` (`id_detalle`, `id_compra`, `id_producto`, `cantidad`, `cantidad_recibida`, `precio_unitario`, `descuento_porc`, `descuento_monto`, `id_impuesto`, `impuesto_porc`, `subtotal`, `observacion`) VALUES (3, 2, 1, '4.00', '4.00', '1500.0000', '0.00', '0.00', NULL, '0.00', '6000.00', NULL);
INSERT INTO `compra_detalle` (`id_detalle`, `id_compra`, `id_producto`, `cantidad`, `cantidad_recibida`, `precio_unitario`, `descuento_porc`, `descuento_monto`, `id_impuesto`, `impuesto_porc`, `subtotal`, `observacion`) VALUES (4, 2, 2, '10.00', '10.00', '1800.0000', '0.00', '0.00', NULL, '0.00', '18000.00', NULL);

-- ═══ compras ═══
TRUNCATE TABLE `compras`;
INSERT INTO `compras` (`id_compra`, `numero`, `numero_factura`, `id_proveedor`, `id_sucursal`, `id_deposito_destino`, `id_moneda`, `tipo_cambio`, `estado`, `condicion_pago`, `dias_credito`, `fecha_pedido`, `fecha_estim_llegada`, `fecha_confirmacion`, `fecha_recepcion`, `subtotal`, `descuento`, `impuesto`, `flete`, `otros_costos`, `total`, `saldo_pendiente`, `id_usuario_crea`, `id_usuario_aprueba`, `id_usuario_recibe`, `observaciones`, `fecha_creacion`) VALUES (1, 'CMP-202606-0001', NULL, 1, 1, 1, 1, '1.000000', 'RECIBIDO', 'CONTADO', 30, '2026-06-02 04:00:00', '2026-08-02 04:00:00', '2026-06-02 04:00:00', '2026-06-02 04:00:00', '17200.00', '0.00', '0.00', '0.00', '0.00', '17200.00', '0.00', 1, 1, 1, 'realizado', '2026-06-02 11:03:28');
INSERT INTO `compras` (`id_compra`, `numero`, `numero_factura`, `id_proveedor`, `id_sucursal`, `id_deposito_destino`, `id_moneda`, `tipo_cambio`, `estado`, `condicion_pago`, `dias_credito`, `fecha_pedido`, `fecha_estim_llegada`, `fecha_confirmacion`, `fecha_recepcion`, `subtotal`, `descuento`, `impuesto`, `flete`, `otros_costos`, `total`, `saldo_pendiente`, `id_usuario_crea`, `id_usuario_aprueba`, `id_usuario_recibe`, `observaciones`, `fecha_creacion`) VALUES (2, 'CMP-202606-0002', NULL, 1, 2, 3, 1, '1.000000', 'RECIBIDO', 'CONTADO', 30, '2026-06-02 04:00:00', '2026-08-02 04:00:00', '2026-06-02 04:00:00', '2026-06-02 04:00:00', '24000.00', '0.00', '0.00', '0.00', '0.00', '24000.00', '0.00', 1, 1, 1, NULL, '2026-06-02 11:44:14');

-- ═══ cotizacion_detalle ═══
TRUNCATE TABLE `cotizacion_detalle`;

-- ═══ cotizaciones ═══
TRUNCATE TABLE `cotizaciones`;

-- ═══ devolucion_venta_detalle ═══
TRUNCATE TABLE `devolucion_venta_detalle`;

-- ═══ devoluciones_venta ═══
TRUNCATE TABLE `devoluciones_venta`;

-- ═══ gastos ═══
TRUNCATE TABLE `gastos`;

-- ═══ kardex ═══
TRUNCATE TABLE `kardex`;
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (1, 2, 1, 1, '2026-06-02 11:10:25', '5.00', '1200.0000', '5.00', '6000.0000', 'COMPRA', 1, 'CMP-202606-0001', 1, NULL);
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (2, 1, 1, 1, '2026-06-02 11:10:26', '8.00', '1400.0000', '8.00', '11200.0000', 'COMPRA', 1, 'CMP-202606-0001', 1, NULL);
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (3, 1, 3, 1, '2026-06-02 11:44:26', '4.00', '1500.0000', '4.00', '6000.0000', 'COMPRA', 2, 'CMP-202606-0002', 1, NULL);
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (4, 2, 3, 1, '2026-06-02 11:44:26', '10.00', '1800.0000', '10.00', '18000.0000', 'COMPRA', 2, 'CMP-202606-0002', 1, NULL);

-- ═══ pagos_compra ═══
TRUNCATE TABLE `pagos_compra`;
INSERT INTO `pagos_compra` (`id_pago`, `numero`, `id_compra`, `id_cuota`, `id_proveedor`, `id_sucursal`, `fecha`, `metodo_pago`, `id_cuenta_proveedor`, `id_moneda`, `tipo_cambio`, `monto`, `numero_referencia`, `comprobante_url`, `id_usuario`, `observaciones`) VALUES (1, 'PAG-202606-0001', 1, NULL, 1, 1, '2026-06-02 00:00:00', 'EFECTIVO', NULL, 1, '1.000000', '17200.00', NULL, NULL, 1, NULL);
INSERT INTO `pagos_compra` (`id_pago`, `numero`, `id_compra`, `id_cuota`, `id_proveedor`, `id_sucursal`, `fecha`, `metodo_pago`, `id_cuenta_proveedor`, `id_moneda`, `tipo_cambio`, `monto`, `numero_referencia`, `comprobante_url`, `id_usuario`, `observaciones`) VALUES (2, 'PAG-202606-0002', 2, NULL, 1, 2, '2026-06-02 00:00:00', 'EFECTIVO', NULL, 1, '1.000000', '24000.00', NULL, NULL, 1, NULL);

-- ═══ pagos_venta ═══
TRUNCATE TABLE `pagos_venta`;

-- ═══ producto_precio_historico ═══
TRUNCATE TABLE `producto_precio_historico`;

-- ═══ productos ═══
TRUNCATE TABLE `productos`;
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (1, 'PROD-00001', 'BC00000001', 2, 4, 2, 'Refrigerador de dos puertas', 'Puertas de transparentes', '50kg', 'SIMPLE', 'CVG28HBDWX', 'Negro', 1, '1500.00', '200.00', '200.00', '1900.00', '2500.00', '600.00', '20.00', '2450.00', 1, NULL, '5.00', '50.00', NULL, 'NUEVO', NULL, 1, '2026-06-02 10:57:28', '2026-06-02 11:10:26');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (2, 'PROD-00002', 'BC00000002', 1, 2, 2, 'LAVADORA INDUSTRIAL', 'Lavadora con secado rapido', '9kg', 'Moderno', 'H', 'Blanco', 1, '1400.00', '250.00', '20.00', '1670.00', '1900.00', '230.00', '20.00', '1800.00', 1, NULL, '5.00', '50.00', NULL, 'NUEVO', NULL, 1, '2026-06-02 11:00:10', '2026-06-02 11:10:26');

-- ═══ promocion_producto ═══
TRUNCATE TABLE `promocion_producto`;

-- ═══ promociones ═══
TRUNCATE TABLE `promociones`;

-- ═══ stock ═══
TRUNCATE TABLE `stock`;
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (1, 1, 1, '8.00', '0.00', '8.00', '1400.0000', '2026-06-02 11:10:25');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (2, 1, 2, '0.00', '0.00', '0.00', '0.0000', NULL);
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (3, 1, 3, '4.00', '0.00', '4.00', '1500.0000', '2026-06-02 11:44:26');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (4, 2, 1, '5.00', '0.00', '5.00', '1200.0000', '2026-06-02 11:10:25');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (5, 2, 2, '0.00', '0.00', '0.00', '0.0000', NULL);
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (6, 2, 3, '10.00', '0.00', '10.00', '1800.0000', '2026-06-02 11:44:26');

-- ═══ transferencia_detalle ═══
TRUNCATE TABLE `transferencia_detalle`;

-- ═══ transferencias ═══
TRUNCATE TABLE `transferencias`;

-- ═══ venta_cuotas ═══
TRUNCATE TABLE `venta_cuotas`;

-- ═══ venta_detalle ═══
TRUNCATE TABLE `venta_detalle`;

-- ═══ ventas ═══
TRUNCATE TABLE `ventas`;

SET FOREIGN_KEY_CHECKS=1;
