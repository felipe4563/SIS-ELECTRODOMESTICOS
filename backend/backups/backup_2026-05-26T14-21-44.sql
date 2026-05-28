-- Backup Megaelectra
-- Generado: 2026-05-26T14:21:44.908Z
-- Base: bd_electrodomesticos

SET FOREIGN_KEY_CHECKS=0;

-- ═══ empresas ═══
TRUNCATE TABLE `empresas`;
INSERT INTO `empresas` (`id_empresa`, `razon_social`, `nombre_comercial`, `nit`, `direccion`, `telefono`, `email`, `logo_url`, `activo`, `fecha_creacion`) VALUES (1, 'COMERCIAL ELECTRODOMÉSTICOS S.R.L.', 'ElectroHogar', '1234567890', 'Av. Principal #123, Santa Cruz', '74819122', 'contacto@electrohogar.bo', NULL, 1, '2026-05-25 11:45:15');

-- ═══ sucursales ═══
TRUNCATE TABLE `sucursales`;
INSERT INTO `sucursales` (`id_sucursal`, `id_empresa`, `codigo`, `nombre`, `tipo`, `direccion`, `ciudad`, `telefono`, `responsable`, `es_punto_venta`, `activo`, `fecha_creacion`) VALUES (1, 1, 'SUC-PRI', 'Sucursal Principal Gallo', 'PRINCIPAL', 'Av. Gallo #18-20', 'Santa Cruz', '3-3334444', 'Por definir', 1, 1, '2026-05-25 11:45:27');
INSERT INTO `sucursales` (`id_sucursal`, `id_empresa`, `codigo`, `nombre`, `tipo`, `direccion`, `ciudad`, `telefono`, `responsable`, `es_punto_venta`, `activo`, `fecha_creacion`) VALUES (2, 1, 'SUC-CEN', 'Sucursal Centro', 'SUCURSAL', 'Zona Centro - Multipunto', 'Santa Cruz', '3-3335555', 'Por definir', 1, 1, '2026-05-25 11:45:27');
INSERT INTO `sucursales` (`id_sucursal`, `id_empresa`, `codigo`, `nombre`, `tipo`, `direccion`, `ciudad`, `telefono`, `responsable`, `es_punto_venta`, `activo`, `fecha_creacion`) VALUES (3, 1, 'SACA 18', 'Sacaba 18', 'SUCURSAL', 'Centro comercial el Morro', 'Cochabamba', '74819122', 'Por definir', 1, 1, '2026-05-26 10:08:46');

-- ═══ depositos ═══
TRUNCATE TABLE `depositos`;
INSERT INTO `depositos` (`id_deposito`, `id_sucursal`, `codigo`, `nombre`, `tipo`, `direccion`, `encargado`, `permite_venta`, `activo`, `fecha_creacion`) VALUES (1, 1, 'GALLO18', 'Gallo 18 (Almacén)', 'ALMACEN', 'Calle Gallo #18', 'Por definir', 1, 1, '2026-05-25 11:45:45');
INSERT INTO `depositos` (`id_deposito`, `id_sucursal`, `codigo`, `nombre`, `tipo`, `direccion`, `encargado`, `permite_venta`, `activo`, `fecha_creacion`) VALUES (2, 1, 'GALLO20', 'Gallo 20 (Depósito)', 'DEPOSITO_PEQUENO', 'Calle Gallo #20', 'Por definir', 1, 1, '2026-05-25 11:45:45');
INSERT INTO `depositos` (`id_deposito`, `id_sucursal`, `codigo`, `nombre`, `tipo`, `direccion`, `encargado`, `permite_venta`, `activo`, `fecha_creacion`) VALUES (3, 2, 'VICTORIA', 'Punto de Venta Victoria', 'PUNTO_VENTA', 'Av. Victoria', 'Por definir', 1, 1, '2026-05-25 11:45:45');
INSERT INTO `depositos` (`id_deposito`, `id_sucursal`, `codigo`, `nombre`, `tipo`, `direccion`, `encargado`, `permite_venta`, `activo`, `fecha_creacion`) VALUES (4, 2, 'URKUPINA', 'Punto de Venta Urkupiña', 'PUNTO_VENTA', 'Av. Urkupiña', 'Por definir', 1, 1, '2026-05-25 11:45:45');
INSERT INTO `depositos` (`id_deposito`, `id_sucursal`, `codigo`, `nombre`, `tipo`, `direccion`, `encargado`, `permite_venta`, `activo`, `fecha_creacion`) VALUES (5, 2, 'EARCE', 'Punto de Venta E. Arce', 'PUNTO_VENTA', 'Av. Eduardo Arce', 'Por definir', 1, 1, '2026-05-25 11:45:45');
INSERT INTO `depositos` (`id_deposito`, `id_sucursal`, `codigo`, `nombre`, `tipo`, `direccion`, `encargado`, `permite_venta`, `activo`, `fecha_creacion`) VALUES (6, 2, 'PEMOSUR', 'Punto de Venta Pemosur', 'PUNTO_VENTA', 'Av. Pemosur', 'Por definir', 1, 1, '2026-05-25 11:45:45');
INSERT INTO `depositos` (`id_deposito`, `id_sucursal`, `codigo`, `nombre`, `tipo`, `direccion`, `encargado`, `permite_venta`, `activo`, `fecha_creacion`) VALUES (7, 3, 'ALM-SACABA', 'Almacen de sacaba', 'PUNTO_VENTA', 'Zona Centro - Multipunto', 'Por definir', 1, 1, '2026-05-26 10:10:36');

-- ═══ monedas ═══
TRUNCATE TABLE `monedas`;
INSERT INTO `monedas` (`id_moneda`, `codigo`, `nombre`, `simbolo`, `decimales`, `es_moneda_base`, `activo`) VALUES (1, 'BOB', 'Boliviano', 'Bs', 2, 1, 1);
INSERT INTO `monedas` (`id_moneda`, `codigo`, `nombre`, `simbolo`, `decimales`, `es_moneda_base`, `activo`) VALUES (2, 'USD', 'Dólar EE.UU.', '$', 2, 0, 1);

-- ═══ tipos_cambio ═══
TRUNCATE TABLE `tipos_cambio`;
INSERT INTO `tipos_cambio` (`id_tipo_cambio`, `id_moneda_origen`, `id_moneda_destino`, `fecha`, `tasa_compra`, `tasa_venta`) VALUES (1, 2, 1, '2026-05-25 04:00:00', '6.860000', '6.960000');

-- ═══ bancos ═══
TRUNCATE TABLE `bancos`;
INSERT INTO `bancos` (`id_banco`, `codigo`, `nombre`, `sigla`, `pais`, `activo`) VALUES (1, 'BMSC', 'Banco Mercantil Santa Cruz', 'BMSC', 'Bolivia', 1);
INSERT INTO `bancos` (`id_banco`, `codigo`, `nombre`, `sigla`, `pais`, `activo`) VALUES (2, 'BNB', 'Banco Nacional de Bolivia', 'BNB', 'Bolivia', 1);
INSERT INTO `bancos` (`id_banco`, `codigo`, `nombre`, `sigla`, `pais`, `activo`) VALUES (3, 'BUN', 'Banco Unión', 'BU', 'Bolivia', 1);
INSERT INTO `bancos` (`id_banco`, `codigo`, `nombre`, `sigla`, `pais`, `activo`) VALUES (4, 'BCP', 'Banco de Crédito BCP', 'BCP', 'Bolivia', 1);
INSERT INTO `bancos` (`id_banco`, `codigo`, `nombre`, `sigla`, `pais`, `activo`) VALUES (5, 'BBVA', 'Banco BISA', 'BISA', 'Bolivia', 1);
INSERT INTO `bancos` (`id_banco`, `codigo`, `nombre`, `sigla`, `pais`, `activo`) VALUES (6, 'BGA', 'Banco Ganadero', 'BG', 'Bolivia', 1);
INSERT INTO `bancos` (`id_banco`, `codigo`, `nombre`, `sigla`, `pais`, `activo`) VALUES (7, 'BEC', 'Banco Económico', 'BEC', 'Bolivia', 1);
INSERT INTO `bancos` (`id_banco`, `codigo`, `nombre`, `sigla`, `pais`, `activo`) VALUES (8, 'BSO', 'Banco Sol', 'BS', 'Bolivia', 1);
INSERT INTO `bancos` (`id_banco`, `codigo`, `nombre`, `sigla`, `pais`, `activo`) VALUES (9, 'BFO', 'Banco Fortaleza', 'BF', 'Bolivia', 1);
INSERT INTO `bancos` (`id_banco`, `codigo`, `nombre`, `sigla`, `pais`, `activo`) VALUES (10, 'BPR', 'Banco Prodem', 'BP', 'Bolivia', 1);
INSERT INTO `bancos` (`id_banco`, `codigo`, `nombre`, `sigla`, `pais`, `activo`) VALUES (11, 'BFA', 'Banco Fassil', 'BFA', 'Bolivia', 1);
INSERT INTO `bancos` (`id_banco`, `codigo`, `nombre`, `sigla`, `pais`, `activo`) VALUES (12, 'BME', 'Banco Mercantil', 'BME', 'Bolivia', 1);

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
INSERT INTO `usuarios` (`id_usuario`, `username`, `password_hash`, `nombres`, `apellidos`, `documento`, `email`, `telefono`, `id_rol`, `id_sucursal_default`, `foto_url`, `debe_cambiar_pass`, `ultimo_login`, `activo`, `fecha_creacion`) VALUES (1, 'admin', '$2b$10$0mJZMb0UdWEo.0.4bbmIauwGq6EtZ3sCiQJZkJFL19UZPI68m/xie', 'Administrador', 'del Sistema', '00000000', 'admin@electrohogar.bo', '70000000', 1, 1, NULL, 0, '2026-05-26 13:00:56', 1, '2026-05-25 11:48:46');
INSERT INTO `usuarios` (`id_usuario`, `username`, `password_hash`, `nombres`, `apellidos`, `documento`, `email`, `telefono`, `id_rol`, `id_sucursal_default`, `foto_url`, `debe_cambiar_pass`, `ultimo_login`, `activo`, `fecha_creacion`) VALUES (2, 'vendedor1', '$2b$10$v9eKl1yIevok5lO/C8rsg.tGN/FS.QLUu6vCikf23PxBGqQPMEVjm', 'Vendedor', 'Uno', '11111111', 'vendedor1@electrohogar.bo', '71111111', 2, 1, NULL, 1, NULL, 1, '2026-05-25 11:48:46');
INSERT INTO `usuarios` (`id_usuario`, `username`, `password_hash`, `nombres`, `apellidos`, `documento`, `email`, `telefono`, `id_rol`, `id_sucursal_default`, `foto_url`, `debe_cambiar_pass`, `ultimo_login`, `activo`, `fecha_creacion`) VALUES (3, 'almacen1', '$2b$10$mWN4w1jnMGRo6qLd33L7N.Dpb5mNvxDul29YHzqYJ8IKYttatelQW', 'Almacenero', 'Uno', '22222222', 'almacen1@electrohogar.bo', '72222222', 3, 1, NULL, 1, NULL, 1, '2026-05-25 11:48:46');

-- ═══ usuario_sucursal ═══
TRUNCATE TABLE `usuario_sucursal`;
INSERT INTO `usuario_sucursal` (`id_usuario`, `id_sucursal`) VALUES (1, 1);
INSERT INTO `usuario_sucursal` (`id_usuario`, `id_sucursal`) VALUES (1, 2);
INSERT INTO `usuario_sucursal` (`id_usuario`, `id_sucursal`) VALUES (2, 1);
INSERT INTO `usuario_sucursal` (`id_usuario`, `id_sucursal`) VALUES (2, 2);
INSERT INTO `usuario_sucursal` (`id_usuario`, `id_sucursal`) VALUES (3, 1);
INSERT INTO `usuario_sucursal` (`id_usuario`, `id_sucursal`) VALUES (3, 2);

-- ═══ marcas ═══
TRUNCATE TABLE `marcas`;
INSERT INTO `marcas` (`id_marca`, `nombre`, `pais_origen`, `logo_url`, `activo`) VALUES (1, 'ABBA', 'Bolivia', NULL, 1);
INSERT INTO `marcas` (`id_marca`, `nombre`, `pais_origen`, `logo_url`, `activo`) VALUES (2, 'BRASLAR', 'Brasil', NULL, 1);
INSERT INTO `marcas` (`id_marca`, `nombre`, `pais_origen`, `logo_url`, `activo`) VALUES (3, 'BLACK&DECKER', 'Estados Unidos', NULL, 1);
INSERT INTO `marcas` (`id_marca`, `nombre`, `pais_origen`, `logo_url`, `activo`) VALUES (4, 'CHALLENGER', 'Colombia', NULL, 1);
INSERT INTO `marcas` (`id_marca`, `nombre`, `pais_origen`, `logo_url`, `activo`) VALUES (5, 'CADSA', 'Bolivia', NULL, 1);
INSERT INTO `marcas` (`id_marca`, `nombre`, `pais_origen`, `logo_url`, `activo`) VALUES (6, 'CONSUL', 'Brasil', NULL, 1);
INSERT INTO `marcas` (`id_marca`, `nombre`, `pais_origen`, `logo_url`, `activo`) VALUES (7, 'WHIRLPOOL', 'Estados Unidos', NULL, 1);
INSERT INTO `marcas` (`id_marca`, `nombre`, `pais_origen`, `logo_url`, `activo`) VALUES (8, 'LG', 'Corea del Sur', NULL, 1);
INSERT INTO `marcas` (`id_marca`, `nombre`, `pais_origen`, `logo_url`, `activo`) VALUES (9, 'SAMSUNG', 'Corea del Sur', NULL, 1);
INSERT INTO `marcas` (`id_marca`, `nombre`, `pais_origen`, `logo_url`, `activo`) VALUES (10, 'MABE', 'México', NULL, 1);
INSERT INTO `marcas` (`id_marca`, `nombre`, `pais_origen`, `logo_url`, `activo`) VALUES (11, 'NIKE', 'ARGENTINA', NULL, 1);

-- ═══ categorias ═══
TRUNCATE TABLE `categorias`;
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (1, NULL, 'Cocinas', 'Todas las cocinas', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (2, 1, 'Cocinas de Piso', 'Cocinas grandes de pedestal', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (3, 1, 'Cocinas de Mesa', 'Cocinas pequeñas para mesa', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (4, NULL, 'Hornos', 'Hornos eléctricos y empotrables', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (5, NULL, 'Refrigeración', 'Refrigeradores y congeladores', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (6, 5, 'Congeladores', 'Congeladores horizontales y verticales', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (7, 5, 'Refrigeradores', 'Refrigeradores domésticos', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (8, NULL, 'Pequeños Electros', 'Electrodomésticos menores', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (9, 8, 'Freidoras', 'Freidoras de aire y eléctricas', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (10, 8, 'Licuadoras', 'Licuadoras y procesadores', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (11, NULL, 'Ventilación', 'Equipos de ventilación y extracción', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (12, 11, 'Extractoras', 'Extractoras de grasa / campanas', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (13, NULL, 'Lavado', 'Lavadoras y secadoras', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (14, NULL, 'Climatización', 'Aires acondicionados y calefactores', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (15, NULL, 'Lavadora', 'Lavadoras', 1);
INSERT INTO `categorias` (`id_categoria`, `id_categoria_padre`, `nombre`, `descripcion`, `activo`) VALUES (16, 13, 'Lg', NULL, 1);

-- ═══ unidades_medida ═══
TRUNCATE TABLE `unidades_medida`;
INSERT INTO `unidades_medida` (`id_unidad`, `codigo`, `nombre`, `activo`) VALUES (1, 'UND', 'Unidad', 1);
INSERT INTO `unidades_medida` (`id_unidad`, `codigo`, `nombre`, `activo`) VALUES (2, 'CAJA', 'Caja', 1);
INSERT INTO `unidades_medida` (`id_unidad`, `codigo`, `nombre`, `activo`) VALUES (3, 'PAR', 'Par', 1);
INSERT INTO `unidades_medida` (`id_unidad`, `codigo`, `nombre`, `activo`) VALUES (4, 'SET', 'Conjunto', 1);
INSERT INTO `unidades_medida` (`id_unidad`, `codigo`, `nombre`, `activo`) VALUES (5, 'KIT', 'Kit', 1);
INSERT INTO `unidades_medida` (`id_unidad`, `codigo`, `nombre`, `activo`) VALUES (6, 'KG', 'Kilogramo', 1);
INSERT INTO `unidades_medida` (`id_unidad`, `codigo`, `nombre`, `activo`) VALUES (7, 'LT', 'Litro', 1);

-- ═══ impuestos ═══
TRUNCATE TABLE `impuestos`;
INSERT INTO `impuestos` (`id_impuesto`, `codigo`, `nombre`, `porcentaje`, `tipo`, `es_default`, `activo`) VALUES (1, 'IVA13', 'IVA 13%', '13.00', 'AMBOS', 1, 1);
INSERT INTO `impuestos` (`id_impuesto`, `codigo`, `nombre`, `porcentaje`, `tipo`, `es_default`, `activo`) VALUES (2, 'IT3', 'IT 3%', '3.00', 'VENTA', 0, 1);
INSERT INTO `impuestos` (`id_impuesto`, `codigo`, `nombre`, `porcentaje`, `tipo`, `es_default`, `activo`) VALUES (3, 'IUE25', 'IUE 25%', '25.00', 'AMBOS', 0, 1);
INSERT INTO `impuestos` (`id_impuesto`, `codigo`, `nombre`, `porcentaje`, `tipo`, `es_default`, `activo`) VALUES (4, 'EXENTO', 'Exento de Impuestos', '0.00', 'AMBOS', 0, 1);
INSERT INTO `impuestos` (`id_impuesto`, `codigo`, `nombre`, `porcentaje`, `tipo`, `es_default`, `activo`) VALUES (5, 'ICE10', 'ICE 10% (consumo específico)', '10.00', 'VENTA', 0, 1);

-- ═══ proveedores ═══
TRUNCATE TABLE `proveedores`;
INSERT INTO `proveedores` (`id_proveedor`, `codigo`, `razon_social`, `nombre_comercial`, `nit`, `tipo_proveedor`, `direccion`, `ciudad`, `pais`, `telefono`, `email`, `contacto_principal`, `plazo_credito_dias`, `saldo_actual`, `activo`, `fecha_creacion`) VALUES (1, 'PROV-001', 'ROSVANIA S.R.L.', 'ROSVANIA', '1111111111', 'NACIONAL', 'Av. Comercial #100', 'Santa Cruz', 'Bolivia', '3-3001001', 'ventas@rosvania.bo', 'Por definir', 30, '0.00', 1, '2026-05-25 11:48:12');
INSERT INTO `proveedores` (`id_proveedor`, `codigo`, `razon_social`, `nombre_comercial`, `nit`, `tipo_proveedor`, `direccion`, `ciudad`, `pais`, `telefono`, `email`, `contacto_principal`, `plazo_credito_dias`, `saldo_actual`, `activo`, `fecha_creacion`) VALUES (2, 'PROV-002', 'DISMATEC IMPORTACIONES', 'DISMATEC', '2222222222', 'NACIONAL', 'Av. Industrial #50', 'La Paz', 'Bolivia', '2-2002002', 'ventas@dismatec.bo', 'Por definir', 45, '0.00', 1, '2026-05-25 11:48:12');
INSERT INTO `proveedores` (`id_proveedor`, `codigo`, `razon_social`, `nombre_comercial`, `nit`, `tipo_proveedor`, `direccion`, `ciudad`, `pais`, `telefono`, `email`, `contacto_principal`, `plazo_credito_dias`, `saldo_actual`, `activo`, `fecha_creacion`) VALUES (3, 'PROV-003', 'SOTO DISTRIBUCIONES', 'SOTO', '3333333333', 'NACIONAL', 'Calle Comercio #25', 'Santa Cruz', 'Bolivia', '3-3003003', 'ventas@soto.bo', 'Por definir', 30, '0.00', 1, '2026-05-25 11:48:12');
INSERT INTO `proveedores` (`id_proveedor`, `codigo`, `razon_social`, `nombre_comercial`, `nit`, `tipo_proveedor`, `direccion`, `ciudad`, `pais`, `telefono`, `email`, `contacto_principal`, `plazo_credito_dias`, `saldo_actual`, `activo`, `fecha_creacion`) VALUES (4, 'PROV0002', 'CLIENTE OCASIONALIUI', 'ElectroHogarUI', '89445548', 'NACIONAL', 'Av. Principal #123, Santa Cruz', 'Cochabamba', 'Bolivia', '74852612', 'contacto@electrohogar.bo', 'JULIAN', 0, '0.00', 1, '2026-05-26 11:15:42');

-- ═══ proveedor_contactos ═══
TRUNCATE TABLE `proveedor_contactos`;
INSERT INTO `proveedor_contactos` (`id_contacto`, `id_proveedor`, `nombre`, `cargo`, `telefono`, `email`) VALUES (1, 4, 'Felipe', 'GERENTE', '74819123', NULL);

-- ═══ proveedor_cuentas_pago ═══
TRUNCATE TABLE `proveedor_cuentas_pago`;
INSERT INTO `proveedor_cuentas_pago` (`id_cuenta`, `id_proveedor`, `metodo`, `id_banco`, `tipo_cuenta`, `numero_cuenta`, `titular`, `qr_url`, `id_moneda`, `es_principal`, `activo`) VALUES (1, 1, 'TRANSFERENCIA', 1, 'CORRIENTE', '0000000001', 'ROSVANIA S.R.L.', NULL, 1, 1, 1);
INSERT INTO `proveedor_cuentas_pago` (`id_cuenta`, `id_proveedor`, `metodo`, `id_banco`, `tipo_cuenta`, `numero_cuenta`, `titular`, `qr_url`, `id_moneda`, `es_principal`, `activo`) VALUES (2, 1, 'QR', NULL, NULL, NULL, 'ROSVANIA S.R.L.', NULL, 1, 0, 1);
INSERT INTO `proveedor_cuentas_pago` (`id_cuenta`, `id_proveedor`, `metodo`, `id_banco`, `tipo_cuenta`, `numero_cuenta`, `titular`, `qr_url`, `id_moneda`, `es_principal`, `activo`) VALUES (3, 1, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, 1, 0, 1);
INSERT INTO `proveedor_cuentas_pago` (`id_cuenta`, `id_proveedor`, `metodo`, `id_banco`, `tipo_cuenta`, `numero_cuenta`, `titular`, `qr_url`, `id_moneda`, `es_principal`, `activo`) VALUES (4, 2, 'TRANSFERENCIA', 2, 'CORRIENTE', '0000000002', 'DISMATEC IMPORTACIONES', NULL, 1, 1, 1);
INSERT INTO `proveedor_cuentas_pago` (`id_cuenta`, `id_proveedor`, `metodo`, `id_banco`, `tipo_cuenta`, `numero_cuenta`, `titular`, `qr_url`, `id_moneda`, `es_principal`, `activo`) VALUES (5, 2, 'QR', NULL, NULL, NULL, 'DISMATEC IMPORTACIONES', NULL, 1, 0, 1);
INSERT INTO `proveedor_cuentas_pago` (`id_cuenta`, `id_proveedor`, `metodo`, `id_banco`, `tipo_cuenta`, `numero_cuenta`, `titular`, `qr_url`, `id_moneda`, `es_principal`, `activo`) VALUES (6, 3, 'TRANSFERENCIA', 3, 'CORRIENTE', '0000000003', 'SOTO DISTRIBUCIONES', NULL, 1, 1, 1);
INSERT INTO `proveedor_cuentas_pago` (`id_cuenta`, `id_proveedor`, `metodo`, `id_banco`, `tipo_cuenta`, `numero_cuenta`, `titular`, `qr_url`, `id_moneda`, `es_principal`, `activo`) VALUES (7, 3, 'EFECTIVO', NULL, NULL, NULL, NULL, NULL, 1, 0, 1);
INSERT INTO `proveedor_cuentas_pago` (`id_cuenta`, `id_proveedor`, `metodo`, `id_banco`, `tipo_cuenta`, `numero_cuenta`, `titular`, `qr_url`, `id_moneda`, `es_principal`, `activo`) VALUES (8, 4, 'TRANSFERENCIA', 5, 'CAJA DD AHORRO', '58628', 'FELIPE', NULL, 2, 1, 1);

-- ═══ clientes ═══
TRUNCATE TABLE `clientes`;
INSERT INTO `clientes` (`id_cliente`, `codigo`, `tipo_cliente`, `tipo_documento`, `documento`, `razon_social`, `nombres`, `apellidos`, `telefono`, `celular`, `email`, `fecha_nacimiento`, `permite_credito`, `limite_credito`, `saldo_actual`, `dias_credito`, `descuento_default`, `activo`, `fecha_creacion`) VALUES (1, 'CLI-0001', 'OCASIONAL', 'CI', '0000000', 'CLIENTE OCASIONAL', 'Cliente', 'Ocasional', NULL, NULL, NULL, NULL, 0, '0.00', '0.00', 0, '0.00', 1, '2026-05-25 11:50:03');
INSERT INTO `clientes` (`id_cliente`, `codigo`, `tipo_cliente`, `tipo_documento`, `documento`, `razon_social`, `nombres`, `apellidos`, `telefono`, `celular`, `email`, `fecha_nacimiento`, `permite_credito`, `limite_credito`, `saldo_actual`, `dias_credito`, `descuento_default`, `activo`, `fecha_creacion`) VALUES (2, 'SUC-CEN', 'MINORISTA', 'CI', '9391668', 'COMERCIAL ELECTRODOMÉSTICOS S.R.L.', 'Administrador', 'Ocasional', NULL, '74819166', NULL, '2020-02-26 04:00:00', 1, '10000.00', '0.00', 20, '0.00', 1, '2026-05-26 11:26:34');

-- ═══ cliente_direcciones ═══
TRUNCATE TABLE `cliente_direcciones`;
INSERT INTO `cliente_direcciones` (`id_direccion`, `id_cliente`, `etiqueta`, `direccion`, `ciudad`, `referencias`, `es_principal`) VALUES (1, 2, 'casa ', 'saca', 'Cochabamba', 'fachada de or', 0);

-- ═══ configuracion_sistema ═══
TRUNCATE TABLE `configuracion_sistema`;
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (1, 'IVA_PORCENTAJE', '13', 'Porcentaje de IVA aplicado', 'DECIMAL', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (2, 'MONEDA_BASE', 'BOB', 'Código de la moneda base', 'STRING', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (3, 'PREFIJO_VENTA', 'V-', 'Prefijo para numeración de ventas', 'STRING', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (4, 'PREFIJO_COMPRA', 'C-', 'Prefijo para numeración de compras', 'STRING', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (5, 'PREFIJO_TRANSFERENCIA', 'T-', 'Prefijo para transferencias', 'STRING', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (6, 'PREFIJO_AJUSTE', 'AJ-', 'Prefijo para ajustes de inventario', 'STRING', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (7, 'PREFIJO_GASTO', 'G-', 'Prefijo para gastos', 'STRING', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (8, 'PREFIJO_PAGO_COMPRA', 'PC-', 'Prefijo para pagos a proveedores', 'STRING', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (9, 'PREFIJO_PAGO_VENTA', 'PV-', 'Prefijo para pagos/cobros de ventas', 'STRING', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (10, 'PREFIJO_DEVOLUCION', 'DV-', 'Prefijo para devoluciones', 'STRING', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (11, 'DIAS_ALERTA_VENCIMIENTO', '7', 'Días antes de vencimiento para alertar', 'INT', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (12, 'PERMITIR_VENTA_SIN_STOCK', 'false', 'Permitir vender productos sin stock', 'BOOLEAN', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (13, 'VALIDAR_LIMITE_CREDITO', 'true', 'Validar límite de crédito en ventas', 'BOOLEAN', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (14, 'IMPRIMIR_AUTOMATICO', 'false', 'Imprimir factura automáticamente al emitir', 'BOOLEAN', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (15, 'FORMATO_FACTURA', 'A4', 'Tamaño de impresión: A4 o TICKET', 'STRING', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (16, 'CLIENTE_DEFAULT_ID', '1', 'ID del cliente por defecto para ventas rápidas', 'INT', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (17, 'IMPUESTO_DEFAULT_ID', '1', 'ID del impuesto aplicado por defecto (IVA)', 'INT', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (18, 'IMPRESORA_NOMBRE', 'POS-58', 'Nombre de la impresora de tickets', 'STRING', '2026-05-26 11:44:43');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (19, 'IMPRESORA_PUERTO', 'USB001', 'Puerto de la impresora', 'STRING', '2026-05-26 11:44:43');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (20, 'IMPRESORA_TIPO', 'TICKET', 'Tipo de impresora: TICKET o A4', 'STRING', '2026-05-26 11:44:43');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (21, 'GENERAR_CB_AUTO', 'true', 'Generar código de barras automáticamente', 'BOOLEAN', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (22, 'LOGO_FACTURA_URL', '', 'URL del logo para impresión de factura', 'STRING', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (23, 'PIE_FACTURA', 'Gracias por su compra', 'Texto del pie de página de la factura', 'STRING', '2026-05-25 11:46:52');
INSERT INTO `configuracion_sistema` (`id_config`, `clave`, `valor`, `descripcion`, `tipo_dato`, `fecha_modificacion`) VALUES (27, 'factura_plantilla', '{"encabezado":"","pie_pagina":"","mostrar_logo":true,"mostrar_qr":true,"color_primario":"#18181b","logo_url":""}', 'Plantilla de factura', 'JSON', '2026-05-26 11:44:36');

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
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (1, 1, 'usuarios', 1, 'LOGIN', NULL, NULL, '127.0.0.1', '2026-05-26 02:24:52');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (2, 1, 'usuarios', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 02:25:10');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (3, 1, 'configuracion_sistema', 13, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 02:27:40');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (4, 1, 'clientes', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 02:28:33');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (5, 1, 'promociones', 3, '', NULL, NULL, '127.0.0.1', '2026-05-26 02:32:10');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (6, 1, 'promocion_producto', 3, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 02:32:10');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (7, 1, 'cotizaciones', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 02:34:36');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (8, 1, 'cotizaciones', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 02:35:08');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (9, 1, 'cotizaciones', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 02:35:13');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (10, 1, 'cotizaciones', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 02:35:17');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (11, 1, 'usuarios', 1, 'LOGOUT', NULL, NULL, '127.0.0.1', '2026-05-26 09:56:18');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (12, 1, 'usuarios', 1, 'LOGIN', NULL, NULL, '127.0.0.1', '2026-05-26 09:56:24');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (13, 1, 'empresas', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 10:07:55');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (14, 1, 'sucursales', 3, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 10:08:46');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (15, 1, 'sucursales', 3, 'DELETE', NULL, NULL, '127.0.0.1', '2026-05-26 10:09:19');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (16, 1, 'sucursales', 3, 'DELETE', NULL, NULL, '127.0.0.1', '2026-05-26 10:09:27');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (17, 1, 'sucursales', 3, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 10:09:31');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (18, 1, 'depositos', 7, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 10:10:36');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (19, 1, 'monedas', 2, 'DELETE', NULL, NULL, '127.0.0.1', '2026-05-26 10:13:22');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (20, 1, 'monedas', 2, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 10:13:27');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (21, 1, 'tipos_cambio', 2, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 10:14:00');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (22, 1, 'tipos_cambio', 2, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 10:14:10');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (23, 1, 'tipos_cambio', 2, 'DELETE', NULL, NULL, '127.0.0.1', '2026-05-26 10:14:13');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (24, 1, 'proveedores', 4, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 11:15:42');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (25, 1, 'proveedor_contactos', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 11:16:03');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (26, 1, 'usuarios', 1, 'LOGOUT', NULL, NULL, '127.0.0.1', '2026-05-26 11:18:35');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (27, 1, 'usuarios', 1, 'LOGIN', NULL, NULL, '127.0.0.1', '2026-05-26 11:18:42');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (28, 1, 'proveedor_cuentas_pago', 8, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 11:25:01');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (29, 1, 'proveedor_cuentas_pago', 8, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:25:06');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (30, 1, 'proveedor_contactos', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:25:28');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (31, 1, 'proveedor_cuentas_pago', 8, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:25:36');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (32, 1, 'clientes', 2, '', NULL, NULL, '127.0.0.1', '2026-05-26 11:26:34');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (33, 1, 'cliente_direcciones', 1, '', NULL, NULL, '127.0.0.1', '2026-05-26 11:27:17');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (34, 1, 'cliente_direcciones', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:27:22');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (35, 1, 'clientes', 2, '', NULL, NULL, '127.0.0.1', '2026-05-26 11:27:46');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (36, 1, 'unidades_medida', 6, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 11:30:05');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (37, 1, 'unidades_medida', 6, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:30:13');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (38, 1, 'unidades_medida', 7, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 11:30:30');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (39, 1, 'unidades_medida', 7, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:30:42');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (40, 1, 'categorias', 15, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 11:31:20');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (41, 1, 'categorias', 16, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 11:31:44');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (42, 1, 'categorias', 16, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:32:06');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (43, 1, 'categorias', 16, 'DELETE', NULL, NULL, '127.0.0.1', '2026-05-26 11:32:20');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (44, 1, 'categorias', 16, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:32:26');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (45, 1, 'marcas', 11, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 11:32:45');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (46, 1, 'marcas', 11, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:32:58');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (47, 1, 'productos', 16, '', NULL, NULL, '127.0.0.1', '2026-05-26 11:35:39');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (48, 1, 'compras', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 11:37:16');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (49, 1, 'compras', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:38:42');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (50, 1, 'compras', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:38:47');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (51, 1, 'pagos_compra', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 11:38:56');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (52, 1, 'compras', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:39:09');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (53, 1, 'compras', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:39:27');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (54, 1, 'compras', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:39:29');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (55, 1, 'ventas', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 11:40:33');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (56, 1, 'ventas', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:40:36');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (57, 1, 'pagos_venta', 1, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 11:40:41');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (58, 1, 'cotizaciones', 2, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 11:41:47');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (59, 1, 'cotizaciones', 2, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:41:52');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (60, 1, 'cotizaciones', 2, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 11:42:10');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (61, 1, 'usuarios', 1, 'LOGOUT', NULL, NULL, '127.0.0.1', '2026-05-26 13:00:48');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (62, 1, 'usuarios', 1, 'LOGIN', NULL, NULL, '127.0.0.1', '2026-05-26 13:00:56');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (63, 1, 'combos', 3, '', NULL, NULL, '127.0.0.1', '2026-05-26 13:10:35');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (64, 1, 'combos', 2, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 13:10:46');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (65, 1, 'combo_detalle', 2, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 13:10:46');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (66, 1, 'promociones', 3, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 13:13:41');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (67, 1, 'promocion_producto', 3, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 13:13:41');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (68, 1, 'ventas', 2, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 13:36:14');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (69, 1, 'ventas', 2, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-26 13:36:16');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (70, 1, 'pagos_venta', 2, 'INSERT', NULL, NULL, '127.0.0.1', '2026-05-26 13:36:18');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (71, NULL, 'backup', 0, 'OTRO', NULL, NULL, '127.0.0.1', '2026-05-26 14:16:13');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (72, NULL, 'backup', 0, 'OTRO', NULL, NULL, '127.0.0.1', '2026-05-26 14:17:20');
INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES (73, NULL, 'backup', 0, 'OTRO', NULL, NULL, '127.0.0.1', '2026-05-26 14:21:40');

-- ═══ cajas ═══
TRUNCATE TABLE `cajas`;
INSERT INTO `cajas` (`id_caja`, `id_sucursal`, `nombre`, `activo`) VALUES (1, 1, 'Caja Principal - Gallo', 1);
INSERT INTO `cajas` (`id_caja`, `id_sucursal`, `nombre`, `activo`) VALUES (2, 2, 'Caja Sucursal - Centro', 1);

-- ═══ categorias_gasto ═══
TRUNCATE TABLE `categorias_gasto`;
INSERT INTO `categorias_gasto` (`id_categoria_gasto`, `nombre`, `descripcion`, `activo`) VALUES (1, 'Alquiler', 'Alquiler de local comercial o depósito', 1);
INSERT INTO `categorias_gasto` (`id_categoria_gasto`, `nombre`, `descripcion`, `activo`) VALUES (2, 'Servicios Básicos', 'Luz, agua, gas', 1);
INSERT INTO `categorias_gasto` (`id_categoria_gasto`, `nombre`, `descripcion`, `activo`) VALUES (3, 'Internet y Teléfono', 'Servicios de telecomunicaciones', 1);
INSERT INTO `categorias_gasto` (`id_categoria_gasto`, `nombre`, `descripcion`, `activo`) VALUES (4, 'Sueldos y Salarios', 'Pago a empleados', 1);
INSERT INTO `categorias_gasto` (`id_categoria_gasto`, `nombre`, `descripcion`, `activo`) VALUES (5, 'Transporte', 'Combustible, fletes, mantenimiento vehículos', 1);
INSERT INTO `categorias_gasto` (`id_categoria_gasto`, `nombre`, `descripcion`, `activo`) VALUES (6, 'Impuestos', 'IVA, IT, IUE y otros impuestos', 1);
INSERT INTO `categorias_gasto` (`id_categoria_gasto`, `nombre`, `descripcion`, `activo`) VALUES (7, 'Publicidad', 'Marketing, redes sociales, letreros', 1);
INSERT INTO `categorias_gasto` (`id_categoria_gasto`, `nombre`, `descripcion`, `activo`) VALUES (8, 'Mantenimiento', 'Reparaciones de local, equipos, mobiliario', 1);
INSERT INTO `categorias_gasto` (`id_categoria_gasto`, `nombre`, `descripcion`, `activo`) VALUES (9, 'Papelería', 'Útiles de oficina e insumos', 1);
INSERT INTO `categorias_gasto` (`id_categoria_gasto`, `nombre`, `descripcion`, `activo`) VALUES (10, 'Limpieza', 'Productos y servicio de limpieza', 1);
INSERT INTO `categorias_gasto` (`id_categoria_gasto`, `nombre`, `descripcion`, `activo`) VALUES (11, 'Comisiones Bancarias', 'Cargos bancarios, transferencias, mantenimiento cuenta', 1);
INSERT INTO `categorias_gasto` (`id_categoria_gasto`, `nombre`, `descripcion`, `activo`) VALUES (12, 'Otros', 'Gastos varios sin clasificación específica', 1);

-- ═══ combo_detalle ═══
TRUNCATE TABLE `combo_detalle`;
INSERT INTO `combo_detalle` (`id_combo_detalle`, `id_combo`, `id_producto`, `cantidad`) VALUES (1, 1, 2, '1.00');
INSERT INTO `combo_detalle` (`id_combo_detalle`, `id_combo`, `id_producto`, `cantidad`) VALUES (2, 1, 8, '1.00');
INSERT INTO `combo_detalle` (`id_combo_detalle`, `id_combo`, `id_producto`, `cantidad`) VALUES (3, 1, 9, '1.00');
INSERT INTO `combo_detalle` (`id_combo_detalle`, `id_combo`, `id_producto`, `cantidad`) VALUES (6, 3, 5, '1.00');
INSERT INTO `combo_detalle` (`id_combo_detalle`, `id_combo`, `id_producto`, `cantidad`) VALUES (7, 3, 3, '1.00');
INSERT INTO `combo_detalle` (`id_combo_detalle`, `id_combo`, `id_producto`, `cantidad`) VALUES (8, 2, 1, '1.00');
INSERT INTO `combo_detalle` (`id_combo_detalle`, `id_combo`, `id_producto`, `cantidad`) VALUES (9, 2, 7, '1.00');

-- ═══ combos ═══
TRUNCATE TABLE `combos`;
INSERT INTO `combos` (`id_combo`, `codigo`, `nombre`, `descripcion`, `precio_combo`, `fecha_inicio`, `fecha_fin`, `imagen_url`, `activo`, `fecha_creacion`) VALUES (1, 'CMB-001', 'Combo Cocina Pro', 'Cocina ABBA 6H + Horno CHALLENGER + Extractora', '7500.00', '2026-05-25 04:00:00', '2026-08-23 04:00:00', NULL, 1, '2026-05-25 11:50:29');
INSERT INTO `combos` (`id_combo`, `codigo`, `nombre`, `descripcion`, `precio_combo`, `fecha_inicio`, `fecha_fin`, `imagen_url`, `activo`, `fecha_creacion`) VALUES (2, 'CMB-002', 'Combo Cocina Familia', 'Cocina ABBA 4H + Freidora Black&Decker', '4000.00', '2026-05-25 04:00:00', '2026-07-24 04:00:00', NULL, 1, '2026-05-25 11:50:29');
INSERT INTO `combos` (`id_combo`, `codigo`, `nombre`, `descripcion`, `precio_combo`, `fecha_inicio`, `fecha_fin`, `imagen_url`, `activo`, `fecha_creacion`) VALUES (3, 'COMBO-VAGO', 'PACK COCINA COMPLETA', 'PARA OS MAS VAGIS', '1500.00', '2026-05-26 04:00:00', '2026-06-30 04:00:00', NULL, 1, '2026-05-26 13:10:35');

-- ═══ compra_cuotas ═══
TRUNCATE TABLE `compra_cuotas`;

-- ═══ compra_detalle ═══
TRUNCATE TABLE `compra_detalle`;
INSERT INTO `compra_detalle` (`id_detalle`, `id_compra`, `id_producto`, `cantidad`, `cantidad_recibida`, `precio_unitario`, `descuento_porc`, `descuento_monto`, `id_impuesto`, `impuesto_porc`, `subtotal`, `observacion`) VALUES (2, 1, 16, '15.00', '15.00', '1000.0000', '0.00', '0.00', NULL, '0.00', '15000.00', NULL);

-- ═══ compras ═══
TRUNCATE TABLE `compras`;
INSERT INTO `compras` (`id_compra`, `numero`, `numero_factura`, `id_proveedor`, `id_sucursal`, `id_deposito_destino`, `id_moneda`, `tipo_cambio`, `estado`, `condicion_pago`, `dias_credito`, `fecha_pedido`, `fecha_estim_llegada`, `fecha_confirmacion`, `fecha_recepcion`, `subtotal`, `descuento`, `impuesto`, `flete`, `otros_costos`, `total`, `saldo_pendiente`, `id_usuario_crea`, `id_usuario_aprueba`, `id_usuario_recibe`, `observaciones`, `fecha_creacion`) VALUES (1, 'CMP-202605-0001', NULL, 1, 3, 7, 1, '1.000000', 'RECIBIDO', 'CONTADO', 30, '2026-05-26 04:00:00', '2026-05-31 04:00:00', '2026-05-26 04:00:00', '2026-05-26 04:00:00', '15000.00', '0.00', '0.00', '0.00', '0.00', '15000.00', '0.00', 1, 1, 1, NULL, '2026-05-26 11:37:16');

-- ═══ cotizacion_detalle ═══
TRUNCATE TABLE `cotizacion_detalle`;
INSERT INTO `cotizacion_detalle` (`id_detalle`, `id_cotizacion`, `id_producto`, `cantidad`, `precio_unitario`, `descuento_porc`, `descuento_monto`, `id_impuesto`, `impuesto_porc`, `subtotal`, `observacion`) VALUES (2, 1, 11, '1.00', '4803.00', '0.00', '0.00', NULL, '0.00', '4803.00', NULL);
INSERT INTO `cotizacion_detalle` (`id_detalle`, `id_cotizacion`, `id_producto`, `cantidad`, `precio_unitario`, `descuento_porc`, `descuento_monto`, `id_impuesto`, `impuesto_porc`, `subtotal`, `observacion`) VALUES (3, 2, 16, '5.00', '1200.00', '0.00', '0.00', NULL, '0.00', '6000.00', NULL);

-- ═══ cotizaciones ═══
TRUNCATE TABLE `cotizaciones`;
INSERT INTO `cotizaciones` (`id_cotizacion`, `numero`, `id_cliente`, `id_sucursal`, `id_vendedor`, `fecha`, `fecha_vencimiento`, `id_moneda`, `tipo_cambio`, `tipo_cotizacion`, `subtotal`, `descuento_porc`, `descuento_monto`, `impuesto`, `total`, `estado`, `id_venta_generada`, `observaciones`, `fecha_creacion`) VALUES (1, 'COT-202605-0001', 1, 2, 1, '2026-05-26 02:34:36', '2026-05-30 04:00:00', 1, '1.000000', 'CONTADO', '4803.00', '0.00', '0.00', '0.00', '4803.00', 'RECHAZADA', NULL, '', '2026-05-26 02:34:36');
INSERT INTO `cotizaciones` (`id_cotizacion`, `numero`, `id_cliente`, `id_sucursal`, `id_vendedor`, `fecha`, `fecha_vencimiento`, `id_moneda`, `tipo_cambio`, `tipo_cotizacion`, `subtotal`, `descuento_porc`, `descuento_monto`, `impuesto`, `total`, `estado`, `id_venta_generada`, `observaciones`, `fecha_creacion`) VALUES (2, 'COT-202605-0002', 1, 3, 1, '2026-05-26 11:41:47', '2026-06-26 04:00:00', 1, '1.000000', 'CONTADO', '6000.00', '0.00', '0.00', '0.00', '6000.00', 'APROBADA', NULL, '', '2026-05-26 11:41:47');

-- ═══ devolucion_venta_detalle ═══
TRUNCATE TABLE `devolucion_venta_detalle`;

-- ═══ devoluciones_venta ═══
TRUNCATE TABLE `devoluciones_venta`;

-- ═══ gastos ═══
TRUNCATE TABLE `gastos`;

-- ═══ kardex ═══
TRUNCATE TABLE `kardex`;
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (1, 1, 3, 9, '2026-05-25 11:49:52', '1.00', '3526.0000', '1.00', '3526.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (2, 1, 4, 9, '2026-05-25 11:49:52', '3.00', '3526.0000', '3.00', '3526.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (3, 2, 1, 9, '2026-05-25 11:49:52', '1.00', '4232.0000', '1.00', '4232.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (4, 2, 4, 9, '2026-05-25 11:49:52', '10.00', '4232.0000', '10.00', '4232.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (5, 3, 3, 9, '2026-05-25 11:49:52', '1.00', '529.0000', '1.00', '529.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (6, 3, 4, 9, '2026-05-25 11:49:52', '2.00', '529.0000', '2.00', '529.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (7, 4, 3, 9, '2026-05-25 11:49:52', '1.00', '458.0000', '1.00', '458.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (8, 4, 4, 9, '2026-05-25 11:49:52', '2.00', '458.0000', '2.00', '458.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (9, 5, 1, 9, '2026-05-25 11:49:52', '1.00', '247.0000', '1.00', '247.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (10, 5, 3, 9, '2026-05-25 11:49:52', '1.00', '247.0000', '1.00', '247.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (11, 5, 4, 9, '2026-05-25 11:49:52', '7.00', '247.0000', '7.00', '247.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (12, 6, 1, 9, '2026-05-25 11:49:52', '1.00', '353.0000', '1.00', '353.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (13, 6, 4, 9, '2026-05-25 11:49:52', '2.00', '353.0000', '2.00', '353.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (14, 7, 1, 9, '2026-05-25 11:49:52', '1.00', '504.0000', '1.00', '504.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (15, 7, 4, 9, '2026-05-25 11:49:52', '25.00', '504.0000', '25.00', '504.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (16, 8, 3, 9, '2026-05-25 11:49:52', '1.00', '3325.0000', '1.00', '3325.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (17, 8, 4, 9, '2026-05-25 11:49:52', '1.00', '3325.0000', '1.00', '3325.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (18, 9, 1, 9, '2026-05-25 11:49:52', '1.00', '554.0000', '1.00', '554.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (19, 10, 1, 9, '2026-05-25 11:49:52', '1.00', '247.0000', '1.00', '247.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (20, 10, 3, 9, '2026-05-25 11:49:52', '1.00', '247.0000', '1.00', '247.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (21, 10, 4, 9, '2026-05-25 11:49:52', '3.00', '247.0000', '3.00', '247.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (22, 11, 1, 9, '2026-05-25 11:49:52', '1.00', '4565.0000', '1.00', '4565.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (23, 11, 4, 9, '2026-05-25 11:49:52', '1.00', '4565.0000', '1.00', '4565.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (24, 12, 1, 9, '2026-05-25 11:49:52', '1.00', '4993.0000', '1.00', '4993.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (25, 12, 4, 9, '2026-05-25 11:49:52', '2.00', '4993.0000', '2.00', '4993.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (26, 13, 1, 9, '2026-05-25 11:49:52', '1.00', '5706.0000', '1.00', '5706.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (27, 13, 3, 9, '2026-05-25 11:49:52', '1.00', '5706.0000', '1.00', '5706.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (28, 13, 4, 9, '2026-05-25 11:49:52', '6.00', '5706.0000', '6.00', '5706.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (29, 14, 1, 9, '2026-05-25 11:49:52', '1.00', '6491.0000', '1.00', '6491.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (30, 14, 4, 9, '2026-05-25 11:49:52', '3.00', '6491.0000', '3.00', '6491.0000', 'APERTURA', NULL, 'INV-INICIAL', 1, 'Inventario inicial cargado desde Excel');
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (32, 16, 7, 1, '2026-05-26 11:39:09', '1.00', '1000.0000', '1.00', '1000.0000', 'COMPRA', 1, 'CMP-202605-0001', 1, NULL);
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (33, 16, 7, 1, '2026-05-26 11:39:27', '10.00', '1000.0000', '11.00', '11000.0000', 'COMPRA', 1, 'CMP-202605-0001', 1, NULL);
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (34, 16, 7, 1, '2026-05-26 11:39:29', '4.00', '1000.0000', '15.00', '15000.0000', 'COMPRA', 1, 'CMP-202605-0001', 1, NULL);
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (35, 16, 7, 2, '2026-05-26 11:40:36', '1.00', '1000.0000', '14.00', '1000.0000', 'VENTA', 1, 'VEN-202605-0001', 1, NULL);
INSERT INTO `kardex` (`id_kardex`, `id_producto`, `id_deposito`, `id_tipo_movimiento`, `fecha`, `cantidad`, `costo_unitario`, `saldo_cantidad`, `saldo_costo`, `documento_tipo`, `documento_id`, `documento_numero`, `id_usuario`, `observaciones`) VALUES (36, 16, 7, 2, '2026-05-26 13:36:16', '1.00', '1000.0000', '13.00', '1000.0000', 'VENTA', 2, 'VEN-202605-0002', 1, NULL);

-- ═══ pagos_compra ═══
TRUNCATE TABLE `pagos_compra`;
INSERT INTO `pagos_compra` (`id_pago`, `numero`, `id_compra`, `id_cuota`, `id_proveedor`, `id_sucursal`, `fecha`, `metodo_pago`, `id_cuenta_proveedor`, `id_moneda`, `tipo_cambio`, `monto`, `numero_referencia`, `comprobante_url`, `id_usuario`, `observaciones`) VALUES (1, 'PAG-202605-0001', 1, NULL, 1, 3, '2026-05-26 00:00:00', 'EFECTIVO', NULL, 1, '1.000000', '15000.00', NULL, NULL, 1, NULL);

-- ═══ pagos_venta ═══
TRUNCATE TABLE `pagos_venta`;
INSERT INTO `pagos_venta` (`id_pago`, `numero`, `id_venta`, `id_cuota`, `id_cliente`, `id_sucursal`, `fecha`, `metodo_pago`, `id_moneda`, `tipo_cambio`, `monto`, `numero_referencia`, `comprobante_url`, `id_usuario`, `observaciones`) VALUES (1, 'COB-202605-0001', 1, 1, 2, 3, '2026-05-26 11:40:41', 'EFECTIVO', 1, '1.000000', '1200.00', '', NULL, 1, '');
INSERT INTO `pagos_venta` (`id_pago`, `numero`, `id_venta`, `id_cuota`, `id_cliente`, `id_sucursal`, `fecha`, `metodo_pago`, `id_moneda`, `tipo_cambio`, `monto`, `numero_referencia`, `comprobante_url`, `id_usuario`, `observaciones`) VALUES (2, 'COB-202605-0002', 2, NULL, 1, 3, '2026-05-26 13:36:18', 'EFECTIVO', 1, '1.000000', '1080.00', '', NULL, 1, '');

-- ═══ producto_precio_historico ═══
TRUNCATE TABLE `producto_precio_historico`;

-- ═══ productos ═══
TRUNCATE TABLE `productos`;
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (1, 'P0001', NULL, 1, 2, 1, 'COCINA DE PISO 4H', 'MESAVIDRIO E.E. GRILL ELEC.', NULL, NULL, 'AG202-3TC', 'NEGRO', 1, '3500.00', '26.00', '0.00', '3526.00', '3710.00', '184.00', '30.00', '0.00', 1, 1, '2.00', '0.00', NULL, 'NUEVO', NULL, 1, '2026-05-25 11:49:13', '2026-05-25 11:49:13');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (2, 'P0002', NULL, 1, 2, 1, 'COCINA DE PISO 6H', 'MESAVIDRIO E.E. GRILL ELEC.', NULL, NULL, 'RG803-5GT', 'NEGRO', 1, '4200.00', '32.00', '0.00', '4232.00', '4452.00', '220.00', '30.00', '0.00', 1, 1, '2.00', '0.00', NULL, 'NUEVO', NULL, 1, '2026-05-25 11:49:13', '2026-05-25 11:49:13');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (3, 'P0003', NULL, 1, 3, 1, 'COCINA DE MESA 4H', 'E.E. MESON DE LOZA', NULL, NULL, 'SG-400NEE', 'NEGRO', 1, '525.00', '4.00', '0.00', '529.00', '600.00', '71.00', '10.00', '0.00', 1, 1, '2.00', '0.00', NULL, 'NUEVO', NULL, 1, '2026-05-25 11:49:13', '2026-05-25 11:49:13');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (4, 'P0004', NULL, 1, 3, 1, 'COCINA DE MESA 4H', 'S/E.E. MESON DE LOZA', NULL, NULL, 'SB-400QL', 'NEGRO', 1, '455.00', '3.00', '0.00', '458.00', '500.00', '42.00', '10.00', '0.00', 1, 1, '2.00', '0.00', NULL, 'NUEVO', NULL, 1, '2026-05-25 11:49:13', '2026-05-25 11:49:13');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (5, 'P0005', NULL, 1, 3, 1, 'COCINA DE MESA 2H', 'MESON DE LOZA', NULL, NULL, 'ST-200', 'NEGRO', 1, '245.00', '2.00', '0.00', '247.00', '300.00', '53.00', '10.00', '0.00', 1, 1, '3.00', '0.00', NULL, 'NUEVO', NULL, 1, '2026-05-25 11:49:13', '2026-05-25 11:49:13');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (6, 'P0006', NULL, 2, 3, 1, 'COCINA DE MESA 4H', 'MESON DE ACERO INOX.', NULL, NULL, 'JUNIOR', 'BLANCO', 1, '350.00', '3.00', '0.00', '353.00', '400.00', '47.00', '10.00', '0.00', 1, 1, '2.00', '0.00', NULL, 'NUEVO', NULL, 1, '2026-05-25 11:49:13', '2026-05-25 11:49:13');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (7, 'P0007', NULL, 3, 9, 1, 'FREIDORA DE AIRE', 'CIRCULACION AIRE RAPIDO', '2 Lts', NULL, 'HF-100WDCL', 'BLANCO', 1, '500.00', '4.00', '0.00', '504.00', '530.00', '26.00', '10.00', '0.00', 1, 1, '5.00', '0.00', NULL, 'NUEVO', NULL, 1, '2026-05-25 11:49:13', '2026-05-25 11:49:13');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (8, 'P0008', NULL, 4, 4, 1, 'HORNO DE EMPOTRAR', 'ELEC. C/VENTILADOR', '60 CM', NULL, 'HG-2562', 'NEGRO', 1, '3300.00', '25.00', '0.00', '3325.00', '3498.00', '173.00', '50.00', '0.00', 1, 1, '1.00', '0.00', NULL, 'NUEVO', NULL, 1, '2026-05-25 11:49:13', '2026-05-25 11:49:13');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (9, 'P0009', NULL, 4, 12, 1, 'EXTRACTORA DE GRASA', '1 MOTOR, 3 VEL. ANALÓGICO', '76 CM', NULL, 'CX-4500', 'INOX', 1, '550.00', '4.00', '0.00', '554.00', '600.00', '46.00', '20.00', '0.00', 1, 1, '1.00', '0.00', NULL, 'NUEVO', NULL, 1, '2026-05-25 11:49:13', '2026-05-25 11:49:13');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (10, 'P0010', NULL, 5, 3, 1, 'COCINA DE MESA 2H', 'MESA DE ACERO INOX.', NULL, NULL, 'CM-02', 'BLANCO', 1, '245.00', '2.00', '0.00', '247.00', '300.00', '53.00', '10.00', '0.00', 3, 1, '2.00', '0.00', NULL, 'NUEVO', NULL, 1, '2026-05-25 11:49:13', '2026-05-25 11:49:13');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (11, 'P0011', NULL, 6, 6, 1, 'CONGELADOR HORIZONTAL', '1 PUERTA DUAL INT. BLANCO', '250 Lts', NULL, 'CHA-22BDWX', 'BLANCO', 1, '4531.00', '34.00', '0.00', '4565.00', '4803.00', '238.00', '50.00', '0.00', 2, 1, '1.00', '0.00', NULL, 'NUEVO', NULL, 1, '2026-05-25 11:49:13', '2026-05-25 11:49:13');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (12, 'P0012', NULL, 6, 6, 1, 'CONGELADOR HORIZONTAL', '1 PUERTA DUAL INT. BLANCO', '310 Lts', NULL, 'CHA-31BDWX', 'BLANCO', 1, '4956.00', '37.00', '0.00', '4993.00', '5253.00', '260.00', '50.00', '0.00', 2, 1, '1.00', '0.00', NULL, 'NUEVO', NULL, 1, '2026-05-25 11:49:13', '2026-05-25 11:49:13');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (13, 'P0013', NULL, 6, 6, 1, 'CONGELADOR HORIZONTAL', '1 PUERTA DUAL INT. BLANCO', '420 Lts', NULL, 'CHB-42BDWX', 'BLANCO', 1, '5664.00', '42.00', '0.00', '5706.00', '6004.00', '298.00', '50.00', '0.00', 2, 1, '1.00', '0.00', NULL, 'NUEVO', NULL, 1, '2026-05-25 11:49:13', '2026-05-25 11:49:13');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (14, 'P0014', NULL, 6, 6, 1, 'CONGELADOR HORIZONTAL', '1 PUERTA DUAL INT. BLANCO', '530 Lts', NULL, 'CHB-53BDWX', 'BLANCO', 1, '6443.00', '48.00', '0.00', '6491.00', '6830.00', '339.00', '50.00', '0.00', 2, 1, '1.00', '0.00', NULL, 'NUEVO', NULL, 1, '2026-05-25 11:49:13', '2026-05-25 11:49:13');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (15, 'P0015', NULL, 6, 6, 1, 'CONGELADOR VERTICAL', '1 PUERTA DUAL INT. BLANCO', '280 Lts', NULL, 'CVG28HBDWX', 'BLANCO', 1, '5522.00', '41.00', '0.00', '5563.00', '5853.00', '290.00', '50.00', '0.00', 2, 1, '1.00', '0.00', NULL, 'NUEVO', NULL, 1, '2026-05-25 11:49:13', '2026-05-25 11:49:13');
INSERT INTO `productos` (`id_producto`, `codigo_interno`, `codigo_barras`, `id_marca`, `id_categoria`, `id_unidad`, `producto`, `detalle`, `capacidad`, `caracteristicas`, `modelo`, `color`, `id_moneda_costo`, `precio_real`, `costo_logistica`, `costo_mcm`, `costo_total`, `precio_publico`, `utilidad`, `bono`, `precio_mayor`, `id_proveedor_default`, `id_impuesto_default`, `stock_minimo`, `stock_maximo`, `imagen_url`, `estado`, `notas`, `activo`, `fecha_creacion`, `fecha_modificacion`) VALUES (16, 'GNHJTFH', 'VHP', 11, 13, 6, 'LAVADORA INDUSTRIAL', 'LAVADORA', '10KG', 'SIMPLE', 'CVG28HBDWX', 'Negro', 1, '1000.00', '20.00', '20.00', '1040.00', '1200.00', '160.00', '10.00', '1150.00', 1, NULL, '2.00', '50.00', NULL, 'NUEVO', NULL, 1, '2026-05-26 11:35:39', '2026-05-26 11:35:39');

-- ═══ promocion_producto ═══
TRUNCATE TABLE `promocion_producto`;
INSERT INTO `promocion_producto` (`id_promo_prod`, `id_promocion`, `id_producto`, `id_categoria`, `id_marca`) VALUES (1, 1, NULL, NULL, 6);
INSERT INTO `promocion_producto` (`id_promo_prod`, `id_promocion`, `id_producto`, `id_categoria`, `id_marca`) VALUES (2, 2, NULL, NULL, 1);
INSERT INTO `promocion_producto` (`id_promo_prod`, `id_promocion`, `id_producto`, `id_categoria`, `id_marca`) VALUES (4, 3, 5, NULL, NULL);
INSERT INTO `promocion_producto` (`id_promo_prod`, `id_promocion`, `id_producto`, `id_categoria`, `id_marca`) VALUES (5, 3, 16, NULL, NULL);

-- ═══ promociones ═══
TRUNCATE TABLE `promociones`;
INSERT INTO `promociones` (`id_promocion`, `codigo`, `nombre`, `descripcion`, `tipo_descuento`, `valor_descuento`, `fecha_inicio`, `fecha_fin`, `cantidad_minima`, `aplica_a`, `activo`, `fecha_creacion`) VALUES (1, 'PROM-001', 'Descuento 10% CONSUL', 'Descuento del 10% en línea CONSUL', 'PORCENTAJE', '10.00', '2026-05-25 04:00:00', '2026-06-24 04:00:00', '1.00', 'MARCA', 1, '2026-05-25 11:50:44');
INSERT INTO `promociones` (`id_promocion`, `codigo`, `nombre`, `descripcion`, `tipo_descuento`, `valor_descuento`, `fecha_inicio`, `fecha_fin`, `cantidad_minima`, `aplica_a`, `activo`, `fecha_creacion`) VALUES (2, 'PROM-002', 'Descuento 5% Cocinas ABBA', 'Descuento del 5% en cocinas ABBA', 'PORCENTAJE', '5.00', '2026-05-25 04:00:00', '2026-06-09 04:00:00', '1.00', 'MARCA', 1, '2026-05-25 11:50:44');
INSERT INTO `promociones` (`id_promocion`, `codigo`, `nombre`, `descripcion`, `tipo_descuento`, `valor_descuento`, `fecha_inicio`, `fecha_fin`, `cantidad_minima`, `aplica_a`, `activo`, `fecha_creacion`) VALUES (3, 'PROMO MAMA', 'DESCUENTO POR DIA DE LA MADRE', NULL, 'PORCENTAJE', '10.00', '2026-05-25 04:00:00', '2026-05-30 04:00:00', '1.00', 'PRODUCTO', 1, '2026-05-26 02:32:10');

-- ═══ stock ═══
TRUNCATE TABLE `stock`;
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (1, 1, 1, '0.00', '0.00', '0.00', '3526.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (2, 1, 2, '0.00', '0.00', '0.00', '3526.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (3, 1, 3, '1.00', '0.00', '1.00', '3526.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (4, 1, 4, '3.00', '0.00', '3.00', '3526.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (5, 1, 5, '0.00', '0.00', '0.00', '3526.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (6, 1, 6, '0.00', '0.00', '0.00', '3526.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (7, 2, 1, '1.00', '0.00', '1.00', '4232.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (8, 2, 2, '0.00', '0.00', '0.00', '4232.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (9, 2, 3, '0.00', '0.00', '0.00', '4232.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (10, 2, 4, '10.00', '0.00', '10.00', '4232.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (11, 2, 5, '0.00', '0.00', '0.00', '4232.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (12, 2, 6, '0.00', '0.00', '0.00', '4232.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (13, 3, 1, '0.00', '0.00', '0.00', '529.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (14, 3, 2, '0.00', '0.00', '0.00', '529.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (15, 3, 3, '1.00', '0.00', '1.00', '529.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (16, 3, 4, '2.00', '0.00', '2.00', '529.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (17, 3, 5, '0.00', '0.00', '0.00', '529.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (18, 3, 6, '0.00', '0.00', '0.00', '529.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (19, 4, 1, '0.00', '0.00', '0.00', '458.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (20, 4, 2, '0.00', '0.00', '0.00', '458.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (21, 4, 3, '1.00', '0.00', '1.00', '458.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (22, 4, 4, '2.00', '0.00', '2.00', '458.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (23, 4, 5, '0.00', '0.00', '0.00', '458.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (24, 4, 6, '0.00', '0.00', '0.00', '458.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (25, 5, 1, '1.00', '0.00', '1.00', '247.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (26, 5, 2, '0.00', '0.00', '0.00', '247.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (27, 5, 3, '1.00', '0.00', '1.00', '247.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (28, 5, 4, '7.00', '0.00', '7.00', '247.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (29, 5, 5, '0.00', '0.00', '0.00', '247.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (30, 5, 6, '0.00', '0.00', '0.00', '247.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (31, 6, 1, '1.00', '0.00', '1.00', '353.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (32, 6, 2, '0.00', '0.00', '0.00', '353.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (33, 6, 3, '0.00', '0.00', '0.00', '353.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (34, 6, 4, '2.00', '0.00', '2.00', '353.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (35, 6, 5, '0.00', '0.00', '0.00', '353.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (36, 6, 6, '0.00', '0.00', '0.00', '353.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (37, 7, 1, '1.00', '0.00', '1.00', '504.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (38, 7, 2, '0.00', '0.00', '0.00', '504.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (39, 7, 3, '0.00', '0.00', '0.00', '504.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (40, 7, 4, '25.00', '0.00', '25.00', '504.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (41, 7, 5, '0.00', '0.00', '0.00', '504.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (42, 7, 6, '0.00', '0.00', '0.00', '504.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (43, 8, 1, '0.00', '0.00', '0.00', '3325.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (44, 8, 2, '0.00', '0.00', '0.00', '3325.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (45, 8, 3, '1.00', '0.00', '1.00', '3325.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (46, 8, 4, '1.00', '0.00', '1.00', '3325.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (47, 8, 5, '0.00', '0.00', '0.00', '3325.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (48, 8, 6, '0.00', '0.00', '0.00', '3325.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (49, 9, 1, '1.00', '0.00', '1.00', '554.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (50, 9, 2, '0.00', '0.00', '0.00', '554.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (51, 9, 3, '0.00', '0.00', '0.00', '554.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (52, 9, 4, '0.00', '0.00', '0.00', '554.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (53, 9, 5, '0.00', '0.00', '0.00', '554.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (54, 9, 6, '0.00', '0.00', '0.00', '554.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (55, 10, 1, '1.00', '0.00', '1.00', '247.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (56, 10, 2, '0.00', '0.00', '0.00', '247.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (57, 10, 3, '1.00', '0.00', '1.00', '247.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (58, 10, 4, '3.00', '0.00', '3.00', '247.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (59, 10, 5, '0.00', '0.00', '0.00', '247.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (60, 10, 6, '0.00', '0.00', '0.00', '247.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (61, 11, 1, '1.00', '0.00', '1.00', '4565.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (62, 11, 2, '0.00', '0.00', '0.00', '4565.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (63, 11, 3, '0.00', '0.00', '0.00', '4565.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (64, 11, 4, '1.00', '0.00', '1.00', '4565.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (65, 11, 5, '0.00', '0.00', '0.00', '4565.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (66, 11, 6, '0.00', '0.00', '0.00', '4565.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (67, 12, 1, '1.00', '0.00', '1.00', '4993.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (68, 12, 2, '0.00', '0.00', '0.00', '4993.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (69, 12, 3, '0.00', '0.00', '0.00', '4993.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (70, 12, 4, '2.00', '0.00', '2.00', '4993.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (71, 12, 5, '0.00', '0.00', '0.00', '4993.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (72, 12, 6, '0.00', '0.00', '0.00', '4993.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (73, 13, 1, '1.00', '0.00', '1.00', '5706.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (74, 13, 2, '0.00', '0.00', '0.00', '5706.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (75, 13, 3, '1.00', '0.00', '1.00', '5706.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (76, 13, 4, '6.00', '0.00', '6.00', '5706.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (77, 13, 5, '0.00', '0.00', '0.00', '5706.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (78, 13, 6, '0.00', '0.00', '0.00', '5706.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (79, 14, 1, '1.00', '0.00', '1.00', '6491.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (80, 14, 2, '0.00', '0.00', '0.00', '6491.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (81, 14, 3, '0.00', '0.00', '0.00', '6491.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (82, 14, 4, '3.00', '0.00', '3.00', '6491.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (83, 14, 5, '0.00', '0.00', '0.00', '6491.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (84, 14, 6, '0.00', '0.00', '0.00', '6491.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (85, 15, 1, '0.00', '0.00', '0.00', '5563.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (86, 15, 2, '0.00', '0.00', '0.00', '5563.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (87, 15, 3, '0.00', '0.00', '0.00', '5563.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (88, 15, 4, '0.00', '0.00', '0.00', '5563.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (89, 15, 5, '0.00', '0.00', '0.00', '5563.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (90, 15, 6, '0.00', '0.00', '0.00', '5563.0000', '2026-05-25 11:49:29');
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (91, 16, 1, '0.00', '0.00', '0.00', '0.0000', NULL);
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (92, 16, 2, '0.00', '0.00', '0.00', '0.0000', NULL);
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (93, 16, 3, '0.00', '0.00', '0.00', '0.0000', NULL);
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (94, 16, 4, '0.00', '0.00', '0.00', '0.0000', NULL);
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (95, 16, 5, '0.00', '0.00', '0.00', '0.0000', NULL);
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (96, 16, 6, '0.00', '0.00', '0.00', '0.0000', NULL);
INSERT INTO `stock` (`id_stock`, `id_producto`, `id_deposito`, `cantidad`, `cantidad_reservada`, `cantidad_disponible`, `costo_promedio`, `fecha_ult_movimiento`) VALUES (97, 16, 7, '13.00', '0.00', '13.00', '1000.0000', '2026-05-26 13:36:16');

-- ═══ transferencia_detalle ═══
TRUNCATE TABLE `transferencia_detalle`;

-- ═══ transferencias ═══
TRUNCATE TABLE `transferencias`;

-- ═══ venta_cuotas ═══
TRUNCATE TABLE `venta_cuotas`;
INSERT INTO `venta_cuotas` (`id_cuota`, `id_venta`, `numero_cuota`, `fecha_vencimiento`, `monto`, `monto_pagado`, `estado`) VALUES (1, 1, 1, '2026-06-15 04:00:00', '1200.00', '1200.00', 'PAGADA');

-- ═══ venta_detalle ═══
TRUNCATE TABLE `venta_detalle`;
INSERT INTO `venta_detalle` (`id_detalle`, `id_venta`, `id_producto`, `cantidad`, `precio_unitario`, `descuento_porc`, `descuento_monto`, `id_impuesto`, `impuesto_porc`, `subtotal`, `costo_unitario`, `bono_vendedor`, `id_promocion`, `id_combo`, `observacion`) VALUES (1, 1, 16, '1.00', '1200.00', '0.00', '0.00', NULL, '0.00', '1200.00', '1000.0000', '10.00', NULL, NULL, NULL);
INSERT INTO `venta_detalle` (`id_detalle`, `id_venta`, `id_producto`, `cantidad`, `precio_unitario`, `descuento_porc`, `descuento_monto`, `id_impuesto`, `impuesto_porc`, `subtotal`, `costo_unitario`, `bono_vendedor`, `id_promocion`, `id_combo`, `observacion`) VALUES (2, 2, 16, '1.00', '1200.00', '10.00', '120.00', NULL, '0.00', '1080.00', '1000.0000', '10.00', NULL, NULL, NULL);

-- ═══ ventas ═══
TRUNCATE TABLE `ventas`;
INSERT INTO `ventas` (`id_venta`, `numero`, `numero_factura`, `tipo_venta`, `id_sucursal`, `id_deposito`, `id_cliente`, `id_vendedor`, `fecha`, `id_moneda`, `tipo_cambio`, `condicion_pago`, `dias_credito`, `fecha_vencimiento`, `subtotal`, `descuento_porc`, `descuento_monto`, `impuesto`, `total`, `saldo_pendiente`, `estado`, `requiere_entrega`, `direccion_entrega`, `fecha_entrega`, `observaciones`, `fecha_creacion`) VALUES (1, 'VEN-202605-0001', NULL, 'MENOR', 3, 7, 2, 1, '2026-05-26 11:40:36', 1, '1.000000', 'CREDITO', 20, '2026-06-15 04:00:00', '1200.00', '0.00', '0.00', '0.00', '1200.00', '0.00', 'PAGADA', 0, NULL, NULL, '', '2026-05-26 11:40:33');
INSERT INTO `ventas` (`id_venta`, `numero`, `numero_factura`, `tipo_venta`, `id_sucursal`, `id_deposito`, `id_cliente`, `id_vendedor`, `fecha`, `id_moneda`, `tipo_cambio`, `condicion_pago`, `dias_credito`, `fecha_vencimiento`, `subtotal`, `descuento_porc`, `descuento_monto`, `impuesto`, `total`, `saldo_pendiente`, `estado`, `requiere_entrega`, `direccion_entrega`, `fecha_entrega`, `observaciones`, `fecha_creacion`) VALUES (2, 'VEN-202605-0002', NULL, 'MENOR', 3, 7, 1, 1, '2026-05-26 13:36:16', 1, '1.000000', 'CONTADO', 0, NULL, '1080.00', '0.00', '0.00', '0.00', '1080.00', '0.00', 'PAGADA', 0, NULL, NULL, '', '2026-05-26 13:36:14');

SET FOREIGN_KEY_CHECKS=1;
