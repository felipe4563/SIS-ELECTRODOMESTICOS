-- =====================================================================
-- SISTEMA DE GESTIÓN PARA TIENDA DE ELECTRODOMÉSTICOS
-- Motor: MySQL 8.x / MariaDB 10.5+
-- Charset: utf8mb4
-- Autor: Diseño base de datos - Fase 1 (Estructura)
-- =====================================================================
-- Características principales:
--   * Multi-sucursal y multi-depósito
--   * Multi-moneda con tipos de cambio
--   * Roles y permisos (RBAC) escalable
--   * Auditoría de cambios
--   * Estados de compra: pre-pedido, por llegar, confirmado
--   * Ventas por mayor y menor, con múltiples puntos en red
--   * Inventario integral por depósito con Kardex
--   * Clientes y proveedores con condiciones de pago (contado/crédito)
--   * Gestión de gastos
--   * Alertas de stock mínimo
-- =====================================================================

DROP DATABASE IF EXISTS bd_bd_sistema_electrodomesticos;
CREATE DATABASE bd_bd_sistema_electrodomesticos
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE bd_bd_sistema_electrodomesticos;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- 1. MÓDULO DE CONFIGURACIÓN
-- =====================================================================

-- Empresa (por si en el futuro se manejan varias razones sociales)
CREATE TABLE empresas (
    id_empresa          INT AUTO_INCREMENT PRIMARY KEY,
    razon_social        VARCHAR(200) NOT NULL,
    nombre_comercial    VARCHAR(150),
    nit                 VARCHAR(20) UNIQUE,
    direccion           VARCHAR(255),
    telefono            VARCHAR(30),
    email               VARCHAR(120),
    logo_url            VARCHAR(255),
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Sucursales (Principal y Secundaria)
CREATE TABLE sucursales (
    id_sucursal         INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa          INT NOT NULL,
    codigo              VARCHAR(20) NOT NULL UNIQUE,
    nombre              VARCHAR(100) NOT NULL,
    tipo                ENUM('PRINCIPAL','SUCURSAL') NOT NULL,
    direccion           VARCHAR(255),
    ciudad              VARCHAR(80),
    telefono            VARCHAR(30),
    responsable         VARCHAR(120),
    es_punto_venta      TINYINT(1) NOT NULL DEFAULT 1,
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sucursal_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
) ENGINE=InnoDB;

-- Depósitos / Almacenes (Gallo, Victoria, Urkupiña, E. Arce, Pemosur, etc.)
CREATE TABLE depositos (
    id_deposito         INT AUTO_INCREMENT PRIMARY KEY,
    id_sucursal         INT NOT NULL,
    codigo              VARCHAR(20) NOT NULL UNIQUE,
    nombre              VARCHAR(100) NOT NULL,
    tipo                ENUM('ALMACEN','DEPOSITO_PEQUENO','PUNTO_VENTA','TRANSITO') NOT NULL DEFAULT 'DEPOSITO_PEQUENO',
    direccion           VARCHAR(255),
    encargado           VARCHAR(120),
    permite_venta       TINYINT(1) NOT NULL DEFAULT 1,
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_deposito_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursales(id_sucursal)
) ENGINE=InnoDB;

-- Monedas (multi-moneda)
CREATE TABLE monedas (
    id_moneda           INT AUTO_INCREMENT PRIMARY KEY,
    codigo              VARCHAR(5) NOT NULL UNIQUE COMMENT 'ISO 4217: BOB, USD, EUR',
    nombre              VARCHAR(50) NOT NULL,
    simbolo             VARCHAR(5) NOT NULL,
    decimales           TINYINT NOT NULL DEFAULT 2,
    es_moneda_base      TINYINT(1) NOT NULL DEFAULT 0,
    activo              TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Tipos de cambio diarios
CREATE TABLE tipos_cambio (
    id_tipo_cambio      INT AUTO_INCREMENT PRIMARY KEY,
    id_moneda_origen    INT NOT NULL,
    id_moneda_destino   INT NOT NULL,
    fecha               DATE NOT NULL,
    tasa_compra         DECIMAL(18,6) NOT NULL,
    tasa_venta          DECIMAL(18,6) NOT NULL,
    UNIQUE KEY uq_cambio (id_moneda_origen, id_moneda_destino, fecha),
    CONSTRAINT fk_tc_origen  FOREIGN KEY (id_moneda_origen)  REFERENCES monedas(id_moneda),
    CONSTRAINT fk_tc_destino FOREIGN KEY (id_moneda_destino) REFERENCES monedas(id_moneda)
) ENGINE=InnoDB;

-- Configuración general del sistema (clave-valor)
CREATE TABLE configuracion_sistema (
    id_config           INT AUTO_INCREMENT PRIMARY KEY,
    clave               VARCHAR(80) NOT NULL UNIQUE,
    valor               TEXT,
    descripcion         VARCHAR(255),
    tipo_dato           ENUM('STRING','INT','DECIMAL','BOOLEAN','JSON') DEFAULT 'STRING',
    fecha_modificacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================================
-- 2. MÓDULO DE ROLES Y PERMISOS (RBAC)
-- =====================================================================

CREATE TABLE roles (
    id_rol              INT AUTO_INCREMENT PRIMARY KEY,
    nombre              VARCHAR(60) NOT NULL UNIQUE,
    descripcion         VARCHAR(255),
    es_sistema          TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = no se puede eliminar',
    activo              TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE modulos (
    id_modulo           INT AUTO_INCREMENT PRIMARY KEY,
    codigo              VARCHAR(40) NOT NULL UNIQUE,
    nombre              VARCHAR(80) NOT NULL,
    icono               VARCHAR(40),
    orden               INT DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE permisos (
    id_permiso          INT AUTO_INCREMENT PRIMARY KEY,
    id_modulo           INT NOT NULL,
    codigo              VARCHAR(80) NOT NULL UNIQUE COMMENT 'ej: ventas.crear, compras.aprobar',
    nombre              VARCHAR(120) NOT NULL,
    descripcion         VARCHAR(255),
    CONSTRAINT fk_permiso_modulo FOREIGN KEY (id_modulo) REFERENCES modulos(id_modulo)
) ENGINE=InnoDB;

CREATE TABLE rol_permiso (
    id_rol              INT NOT NULL,
    id_permiso          INT NOT NULL,
    PRIMARY KEY (id_rol, id_permiso),
    CONSTRAINT fk_rp_rol     FOREIGN KEY (id_rol)     REFERENCES roles(id_rol) ON DELETE CASCADE,
    CONSTRAINT fk_rp_permiso FOREIGN KEY (id_permiso) REFERENCES permisos(id_permiso) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 3. MÓDULO DE USUARIOS Y AUDITORÍA
-- =====================================================================

CREATE TABLE usuarios (
    id_usuario          INT AUTO_INCREMENT PRIMARY KEY,
    username            VARCHAR(50) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    nombres             VARCHAR(100) NOT NULL,
    apellidos           VARCHAR(100) NOT NULL,
    documento           VARCHAR(20),
    email               VARCHAR(120) UNIQUE,
    telefono            VARCHAR(30),
    id_rol              INT NOT NULL,
    id_sucursal_default INT,
    foto_url            VARCHAR(255),
    debe_cambiar_pass   TINYINT(1) NOT NULL DEFAULT 1,
    ultimo_login        DATETIME,
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_rol      FOREIGN KEY (id_rol)              REFERENCES roles(id_rol),
    CONSTRAINT fk_usuario_sucursal FOREIGN KEY (id_sucursal_default) REFERENCES sucursales(id_sucursal)
) ENGINE=InnoDB;

-- Acceso de un usuario a múltiples sucursales (caja itinerante, supervisores)
CREATE TABLE usuario_sucursal (
    id_usuario          INT NOT NULL,
    id_sucursal         INT NOT NULL,
    PRIMARY KEY (id_usuario, id_sucursal),
    CONSTRAINT fk_us_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuarios(id_usuario)  ON DELETE CASCADE,
    CONSTRAINT fk_us_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursales(id_sucursal) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Sesiones activas (opcional, para control de tokens / login)
CREATE TABLE sesiones (
    id_sesion           BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_usuario          INT NOT NULL,
    token               VARCHAR(255) NOT NULL UNIQUE,
    ip_origen           VARCHAR(45),
    user_agent          VARCHAR(255),
    fecha_inicio        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion    DATETIME,
    cerrada             TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_sesion_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- Auditoría genérica de cambios
CREATE TABLE auditoria (
    id_auditoria        BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_usuario          INT,
    tabla               VARCHAR(80) NOT NULL,
    id_registro         BIGINT,
    accion              ENUM('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','OTRO') NOT NULL,
    datos_antes         JSON,
    datos_despues       JSON,
    ip_origen           VARCHAR(45),
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_aud_tabla (tabla, id_registro),
    INDEX idx_aud_fecha (fecha),
    CONSTRAINT fk_audit_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- =====================================================================
-- 4. CATÁLOGO DE PRODUCTOS
-- =====================================================================

CREATE TABLE marcas (
    id_marca            INT AUTO_INCREMENT PRIMARY KEY,
    nombre              VARCHAR(80) NOT NULL UNIQUE,
    pais_origen         VARCHAR(60),
    logo_url            VARCHAR(255),
    activo              TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE categorias (
    id_categoria        INT AUTO_INCREMENT PRIMARY KEY,
    id_categoria_padre  INT NULL,
    nombre              VARCHAR(80) NOT NULL,
    descripcion         VARCHAR(255),
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_categoria_padre FOREIGN KEY (id_categoria_padre) REFERENCES categorias(id_categoria)
) ENGINE=InnoDB;

CREATE TABLE unidades_medida (
    id_unidad           INT AUTO_INCREMENT PRIMARY KEY,
    codigo              VARCHAR(10) NOT NULL UNIQUE,
    nombre              VARCHAR(40) NOT NULL,
    activo              TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Tabla principal de productos
-- Refleja las columnas del Excel:
-- MARCA, PRODUCTO, DETALLE, CAP., CARACTERISTICAS, MODELO, COLOR,
-- REAL BS., LOG, MCM, PRECIO PUBLICO, UTILIDAD, BONO, PROVEEDOR
CREATE TABLE productos (
    id_producto         INT AUTO_INCREMENT PRIMARY KEY,
    codigo_interno      VARCHAR(40) NOT NULL UNIQUE,
    codigo_barras       VARCHAR(60) UNIQUE,
    id_marca            INT NOT NULL,
    id_categoria        INT NOT NULL,
    id_unidad           INT NOT NULL,
    -- Descripción / Excel
    producto            VARCHAR(120) NOT NULL COMMENT 'Tipo: COCINA DE PISO, FREIDORA DE AIRE, etc.',
    detalle             VARCHAR(255) COMMENT 'Ej: 4H MESAVIDRIO E.E. GRILL ELEC.',
    capacidad           VARCHAR(40)  COMMENT 'Ej: 2 Lts, 60 CM, 250 Lts',
    caracteristicas     VARCHAR(255),
    modelo              VARCHAR(80),
    color               VARCHAR(40),
    -- Precios (en moneda base, ver tabla monedas)
    id_moneda_costo     INT NOT NULL,
    precio_real         DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'REAL BS - costo base',
    costo_logistica     DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'LOG',
    costo_mcm           DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'MCM - carga adicional',
    costo_total         DECIMAL(14,2) GENERATED ALWAYS AS (precio_real + costo_logistica + costo_mcm) STORED,
    precio_publico      DECIMAL(14,2) NOT NULL DEFAULT 0,
    utilidad            DECIMAL(14,2) GENERATED ALWAYS AS (precio_publico - (precio_real + costo_logistica + costo_mcm)) STORED,
    bono                DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'Bono para vendedor',
    -- Precio mayorista (opcional)
    precio_mayor        DECIMAL(14,2) DEFAULT 0,
    -- Control
    id_proveedor_default INT,
    stock_minimo        DECIMAL(14,2) NOT NULL DEFAULT 0,
    stock_maximo        DECIMAL(14,2) DEFAULT 0,
    imagen_url          VARCHAR(255),
    notas               TEXT,
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_prod_modelo (modelo),
    INDEX idx_prod_marca  (id_marca),
    CONSTRAINT fk_prod_marca     FOREIGN KEY (id_marca)         REFERENCES marcas(id_marca),
    CONSTRAINT fk_prod_categoria FOREIGN KEY (id_categoria)     REFERENCES categorias(id_categoria),
    CONSTRAINT fk_prod_unidad    FOREIGN KEY (id_unidad)        REFERENCES unidades_medida(id_unidad),
    CONSTRAINT fk_prod_moneda    FOREIGN KEY (id_moneda_costo)  REFERENCES monedas(id_moneda)
) ENGINE=InnoDB;

-- Histórico de precios (para análisis y trazabilidad)
CREATE TABLE producto_precio_historico (
    id_historico        BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_producto         INT NOT NULL,
    precio_real_ant     DECIMAL(14,2),
    precio_real_nuevo   DECIMAL(14,2),
    precio_pub_ant      DECIMAL(14,2),
    precio_pub_nuevo    DECIMAL(14,2),
    id_usuario          INT,
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pph_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
    CONSTRAINT fk_pph_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- =====================================================================
-- 5. MÓDULO DE PROVEEDORES
-- =====================================================================

CREATE TABLE proveedores (
    id_proveedor        INT AUTO_INCREMENT PRIMARY KEY,
    codigo              VARCHAR(20) NOT NULL UNIQUE,
    razon_social        VARCHAR(200) NOT NULL,
    nombre_comercial    VARCHAR(150),
    nit                 VARCHAR(20),
    tipo_proveedor      ENUM('NACIONAL','INTERNACIONAL') DEFAULT 'NACIONAL',
    direccion           VARCHAR(255),
    ciudad              VARCHAR(80),
    pais                VARCHAR(80),
    telefono            VARCHAR(30),
    email               VARCHAR(120),
    contacto_principal  VARCHAR(120),
    plazo_credito_dias  INT DEFAULT 0,
    saldo_actual        DECIMAL(14,2) DEFAULT 0,
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Una vez creada proveedores, agregamos la FK desde productos
ALTER TABLE productos
    ADD CONSTRAINT fk_prod_proveedor FOREIGN KEY (id_proveedor_default) REFERENCES proveedores(id_proveedor);

CREATE TABLE proveedor_contactos (
    id_contacto         INT AUTO_INCREMENT PRIMARY KEY,
    id_proveedor        INT NOT NULL,
    nombre              VARCHAR(120) NOT NULL,
    cargo               VARCHAR(80),
    telefono            VARCHAR(30),
    email               VARCHAR(120),
    CONSTRAINT fk_pc_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Cuentas bancarias y QR del proveedor
CREATE TABLE proveedor_cuentas_pago (
    id_cuenta           INT AUTO_INCREMENT PRIMARY KEY,
    id_proveedor        INT NOT NULL,
    metodo              ENUM('EFECTIVO','TRANSFERENCIA','QR','CHEQUE','OTRO') NOT NULL,
    banco               VARCHAR(80),
    tipo_cuenta         VARCHAR(30),
    numero_cuenta       VARCHAR(60),
    titular             VARCHAR(150),
    qr_url              VARCHAR(255),
    id_moneda           INT,
    es_principal        TINYINT(1) NOT NULL DEFAULT 0,
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_pcp_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE CASCADE,
    CONSTRAINT fk_pcp_moneda    FOREIGN KEY (id_moneda)    REFERENCES monedas(id_moneda)
) ENGINE=InnoDB;

-- =====================================================================
-- 6. MÓDULO DE CLIENTES
-- =====================================================================

CREATE TABLE clientes (
    id_cliente          INT AUTO_INCREMENT PRIMARY KEY,
    codigo              VARCHAR(20) NOT NULL UNIQUE,
    tipo_cliente        ENUM('MAYORISTA','MINORISTA','VIP','OCASIONAL') NOT NULL DEFAULT 'MINORISTA',
    tipo_documento      ENUM('CI','NIT','PASAPORTE','RUC','OTRO') DEFAULT 'CI',
    documento           VARCHAR(20),
    razon_social        VARCHAR(200) COMMENT 'Para facturación',
    nombres             VARCHAR(120),
    apellidos           VARCHAR(120),
    telefono            VARCHAR(30),
    celular             VARCHAR(30),
    email               VARCHAR(120),
    fecha_nacimiento    DATE,
    -- Condiciones comerciales
    permite_credito     TINYINT(1) NOT NULL DEFAULT 0,
    limite_credito      DECIMAL(14,2) DEFAULT 0,
    saldo_actual        DECIMAL(14,2) DEFAULT 0 COMMENT 'Cuenta por cobrar',
    dias_credito        INT DEFAULT 0,
    descuento_default   DECIMAL(5,2) DEFAULT 0,
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cli_documento (documento)
) ENGINE=InnoDB;

CREATE TABLE cliente_direcciones (
    id_direccion        INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente          INT NOT NULL,
    etiqueta            VARCHAR(40) COMMENT 'Casa, Oficina, Bodega...',
    direccion           VARCHAR(255) NOT NULL,
    ciudad              VARCHAR(80),
    referencias         VARCHAR(255),
    es_principal        TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_cd_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 7. MÓDULO DE INVENTARIO MULTI-DEPÓSITO
-- =====================================================================

-- Stock actual por producto y depósito
CREATE TABLE stock (
    id_stock            BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_producto         INT NOT NULL,
    id_deposito         INT NOT NULL,
    cantidad            DECIMAL(14,2) NOT NULL DEFAULT 0,
    cantidad_reservada  DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'En proceso de venta/transferencia',
    cantidad_disponible DECIMAL(14,2) GENERATED ALWAYS AS (cantidad - cantidad_reservada) STORED,
    costo_promedio      DECIMAL(14,4) DEFAULT 0,
    fecha_ult_movimiento DATETIME,
    UNIQUE KEY uq_stock (id_producto, id_deposito),
    CONSTRAINT fk_stock_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
    CONSTRAINT fk_stock_deposito FOREIGN KEY (id_deposito) REFERENCES depositos(id_deposito)
) ENGINE=InnoDB;

CREATE TABLE tipos_movimiento (
    id_tipo_movimiento  INT AUTO_INCREMENT PRIMARY KEY,
    codigo              VARCHAR(20) NOT NULL UNIQUE,
    nombre              VARCHAR(80) NOT NULL,
    efecto              ENUM('ENTRADA','SALIDA','TRANSFERENCIA','AJUSTE') NOT NULL,
    afecta_costo        TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Kardex / Historial de movimientos
CREATE TABLE kardex (
    id_kardex           BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_producto         INT NOT NULL,
    id_deposito         INT NOT NULL,
    id_tipo_movimiento  INT NOT NULL,
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cantidad            DECIMAL(14,2) NOT NULL,
    costo_unitario      DECIMAL(14,4) DEFAULT 0,
    saldo_cantidad      DECIMAL(14,2) NOT NULL DEFAULT 0,
    saldo_costo         DECIMAL(14,4) NOT NULL DEFAULT 0,
    -- Referencia al documento que origina el movimiento
    documento_tipo      ENUM('COMPRA','VENTA','TRANSFERENCIA','AJUSTE','DEVOLUCION','APERTURA') NOT NULL,
    documento_id        BIGINT,
    documento_numero    VARCHAR(40),
    id_usuario          INT,
    observaciones       VARCHAR(255),
    INDEX idx_kardex_producto (id_producto, fecha),
    INDEX idx_kardex_deposito (id_deposito, fecha),
    CONSTRAINT fk_kardex_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
    CONSTRAINT fk_kardex_deposito FOREIGN KEY (id_deposito) REFERENCES depositos(id_deposito),
    CONSTRAINT fk_kardex_tipomov  FOREIGN KEY (id_tipo_movimiento) REFERENCES tipos_movimiento(id_tipo_movimiento),
    CONSTRAINT fk_kardex_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- Transferencias entre depósitos
CREATE TABLE transferencias (
    id_transferencia    BIGINT AUTO_INCREMENT PRIMARY KEY,
    numero              VARCHAR(30) NOT NULL UNIQUE,
    id_deposito_origen  INT NOT NULL,
    id_deposito_destino INT NOT NULL,
    fecha_solicitud     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_envio         DATETIME,
    fecha_recepcion     DATETIME,
    estado              ENUM('SOLICITADA','EN_TRANSITO','RECIBIDA','PARCIAL','ANULADA') NOT NULL DEFAULT 'SOLICITADA',
    id_usuario_solicita INT,
    id_usuario_envia    INT,
    id_usuario_recibe   INT,
    observaciones       TEXT,
    CONSTRAINT fk_tr_dep_origen  FOREIGN KEY (id_deposito_origen)  REFERENCES depositos(id_deposito),
    CONSTRAINT fk_tr_dep_destino FOREIGN KEY (id_deposito_destino) REFERENCES depositos(id_deposito),
    CONSTRAINT fk_tr_u_solicita  FOREIGN KEY (id_usuario_solicita) REFERENCES usuarios(id_usuario),
    CONSTRAINT fk_tr_u_envia     FOREIGN KEY (id_usuario_envia)    REFERENCES usuarios(id_usuario),
    CONSTRAINT fk_tr_u_recibe    FOREIGN KEY (id_usuario_recibe)   REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE transferencia_detalle (
    id_detalle          BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_transferencia    BIGINT NOT NULL,
    id_producto         INT NOT NULL,
    cantidad_enviada    DECIMAL(14,2) NOT NULL,
    cantidad_recibida   DECIMAL(14,2) DEFAULT 0,
    observacion         VARCHAR(255),
    CONSTRAINT fk_td_transferencia FOREIGN KEY (id_transferencia) REFERENCES transferencias(id_transferencia) ON DELETE CASCADE,
    CONSTRAINT fk_td_producto      FOREIGN KEY (id_producto)      REFERENCES productos(id_producto)
) ENGINE=InnoDB;

-- Ajustes de inventario manuales
CREATE TABLE ajustes_inventario (
    id_ajuste           BIGINT AUTO_INCREMENT PRIMARY KEY,
    numero              VARCHAR(30) NOT NULL UNIQUE,
    id_deposito         INT NOT NULL,
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo              VARCHAR(255),
    id_usuario          INT NOT NULL,
    estado              ENUM('BORRADOR','APROBADO','ANULADO') NOT NULL DEFAULT 'BORRADOR',
    CONSTRAINT fk_ai_deposito FOREIGN KEY (id_deposito) REFERENCES depositos(id_deposito),
    CONSTRAINT fk_ai_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE ajuste_inventario_detalle (
    id_detalle          BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_ajuste           BIGINT NOT NULL,
    id_producto         INT NOT NULL,
    cantidad_sistema    DECIMAL(14,2) NOT NULL,
    cantidad_fisica     DECIMAL(14,2) NOT NULL,
    diferencia          DECIMAL(14,2) GENERATED ALWAYS AS (cantidad_fisica - cantidad_sistema) STORED,
    observacion         VARCHAR(255),
    CONSTRAINT fk_aid_ajuste   FOREIGN KEY (id_ajuste)   REFERENCES ajustes_inventario(id_ajuste) ON DELETE CASCADE,
    CONSTRAINT fk_aid_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
) ENGINE=InnoDB;

-- Alertas de stock mínimo
CREATE TABLE alertas_stock (
    id_alerta           BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_producto         INT NOT NULL,
    id_deposito         INT NOT NULL,
    cantidad_actual     DECIMAL(14,2) NOT NULL,
    stock_minimo        DECIMAL(14,2) NOT NULL,
    fecha_generada      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atendida            TINYINT(1) NOT NULL DEFAULT 0,
    fecha_atendida      DATETIME,
    id_usuario_atendio  INT,
    INDEX idx_alerta_pendiente (atendida, fecha_generada),
    CONSTRAINT fk_al_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
    CONSTRAINT fk_al_deposito FOREIGN KEY (id_deposito) REFERENCES depositos(id_deposito),
    CONSTRAINT fk_al_usuario  FOREIGN KEY (id_usuario_atendio) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- =====================================================================
-- 8. MÓDULO DE COMPRAS
-- =====================================================================

CREATE TABLE compras (
    id_compra           BIGINT AUTO_INCREMENT PRIMARY KEY,
    numero              VARCHAR(30) NOT NULL UNIQUE COMMENT 'Numeración interna',
    numero_factura      VARCHAR(40) COMMENT 'Factura del proveedor',
    id_proveedor        INT NOT NULL,
    id_sucursal         INT NOT NULL,
    id_deposito_destino INT NOT NULL,
    id_moneda           INT NOT NULL,
    tipo_cambio         DECIMAL(18,6) NOT NULL DEFAULT 1,
    -- Estados del flujo: PRE-PEDIDO -> PEDIDO POR LLEGAR -> CONFIRMADO/RECIBIDO
    estado              ENUM('PRE_PEDIDO','POR_LLEGAR','CONFIRMADO','RECIBIDO','PARCIAL','ANULADO') NOT NULL DEFAULT 'PRE_PEDIDO',
    condicion_pago      ENUM('CONTADO','CREDITO') NOT NULL DEFAULT 'CONTADO',
    dias_credito        INT DEFAULT 0,
    fecha_pedido        DATE NOT NULL,
    fecha_estim_llegada DATE,
    fecha_confirmacion  DATE,
    fecha_recepcion     DATE,
    -- Totales
    subtotal            DECIMAL(14,2) NOT NULL DEFAULT 0,
    descuento           DECIMAL(14,2) NOT NULL DEFAULT 0,
    impuesto            DECIMAL(14,2) NOT NULL DEFAULT 0,
    flete               DECIMAL(14,2) NOT NULL DEFAULT 0,
    otros_costos        DECIMAL(14,2) NOT NULL DEFAULT 0,
    total               DECIMAL(14,2) NOT NULL DEFAULT 0,
    saldo_pendiente     DECIMAL(14,2) NOT NULL DEFAULT 0,
    -- Usuarios involucrados
    id_usuario_crea     INT NOT NULL,
    id_usuario_aprueba  INT,
    id_usuario_recibe   INT,
    observaciones       TEXT,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_compras_estado (estado),
    INDEX idx_compras_fecha  (fecha_pedido),
    CONSTRAINT fk_compra_proveedor FOREIGN KEY (id_proveedor)       REFERENCES proveedores(id_proveedor),
    CONSTRAINT fk_compra_sucursal  FOREIGN KEY (id_sucursal)        REFERENCES sucursales(id_sucursal),
    CONSTRAINT fk_compra_deposito  FOREIGN KEY (id_deposito_destino) REFERENCES depositos(id_deposito),
    CONSTRAINT fk_compra_moneda    FOREIGN KEY (id_moneda)          REFERENCES monedas(id_moneda),
    CONSTRAINT fk_compra_u_crea    FOREIGN KEY (id_usuario_crea)    REFERENCES usuarios(id_usuario),
    CONSTRAINT fk_compra_u_aprueba FOREIGN KEY (id_usuario_aprueba) REFERENCES usuarios(id_usuario),
    CONSTRAINT fk_compra_u_recibe  FOREIGN KEY (id_usuario_recibe)  REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE compra_detalle (
    id_detalle          BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_compra           BIGINT NOT NULL,
    id_producto         INT NOT NULL,
    cantidad            DECIMAL(14,2) NOT NULL,
    cantidad_recibida   DECIMAL(14,2) NOT NULL DEFAULT 0,
    precio_unitario     DECIMAL(14,4) NOT NULL,
    descuento_porc      DECIMAL(5,2) DEFAULT 0,
    descuento_monto     DECIMAL(14,2) DEFAULT 0,
    impuesto_porc       DECIMAL(5,2) DEFAULT 0,
    subtotal            DECIMAL(14,2) NOT NULL,
    observacion         VARCHAR(255),
    CONSTRAINT fk_cd_compra   FOREIGN KEY (id_compra)   REFERENCES compras(id_compra) ON DELETE CASCADE,
    CONSTRAINT fk_cd_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
) ENGINE=InnoDB;

-- Cuotas de compra (compras a crédito)
CREATE TABLE compra_cuotas (
    id_cuota            BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_compra           BIGINT NOT NULL,
    numero_cuota        INT NOT NULL,
    fecha_vencimiento   DATE NOT NULL,
    monto               DECIMAL(14,2) NOT NULL,
    monto_pagado        DECIMAL(14,2) NOT NULL DEFAULT 0,
    estado              ENUM('PENDIENTE','PARCIAL','PAGADA','VENCIDA') NOT NULL DEFAULT 'PENDIENTE',
    CONSTRAINT fk_cc_compra FOREIGN KEY (id_compra) REFERENCES compras(id_compra) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Pagos a proveedores
CREATE TABLE pagos_compra (
    id_pago             BIGINT AUTO_INCREMENT PRIMARY KEY,
    numero              VARCHAR(30) NOT NULL UNIQUE,
    id_compra           BIGINT,
    id_cuota            BIGINT,
    id_proveedor        INT NOT NULL,
    id_sucursal         INT NOT NULL,
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metodo_pago         ENUM('EFECTIVO','TRANSFERENCIA','QR','CHEQUE','TARJETA','OTRO') NOT NULL,
    id_cuenta_proveedor INT COMMENT 'Cuenta a la que se pagó',
    id_moneda           INT NOT NULL,
    tipo_cambio         DECIMAL(18,6) DEFAULT 1,
    monto               DECIMAL(14,2) NOT NULL,
    numero_referencia   VARCHAR(60) COMMENT 'N° transferencia, cheque, comprobante QR',
    comprobante_url     VARCHAR(255),
    id_usuario          INT NOT NULL,
    observaciones       TEXT,
    CONSTRAINT fk_pgc_compra    FOREIGN KEY (id_compra)    REFERENCES compras(id_compra),
    CONSTRAINT fk_pgc_cuota     FOREIGN KEY (id_cuota)     REFERENCES compra_cuotas(id_cuota),
    CONSTRAINT fk_pgc_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor),
    CONSTRAINT fk_pgc_sucursal  FOREIGN KEY (id_sucursal)  REFERENCES sucursales(id_sucursal),
    CONSTRAINT fk_pgc_cuenta    FOREIGN KEY (id_cuenta_proveedor) REFERENCES proveedor_cuentas_pago(id_cuenta),
    CONSTRAINT fk_pgc_moneda    FOREIGN KEY (id_moneda)    REFERENCES monedas(id_moneda),
    CONSTRAINT fk_pgc_usuario   FOREIGN KEY (id_usuario)   REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- =====================================================================
-- 9. MÓDULO DE VENTAS
-- =====================================================================

CREATE TABLE ventas (
    id_venta            BIGINT AUTO_INCREMENT PRIMARY KEY,
    numero              VARCHAR(30) NOT NULL UNIQUE,
    numero_factura      VARCHAR(40) UNIQUE,
    tipo_venta          ENUM('MAYOR','MENOR') NOT NULL DEFAULT 'MENOR',
    id_sucursal         INT NOT NULL,
    id_deposito         INT NOT NULL COMMENT 'Depósito desde donde se descarga el stock',
    id_cliente          INT NOT NULL,
    id_vendedor         INT NOT NULL,
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_moneda           INT NOT NULL,
    tipo_cambio         DECIMAL(18,6) DEFAULT 1,
    condicion_pago      ENUM('CONTADO','CREDITO') NOT NULL DEFAULT 'CONTADO',
    dias_credito        INT DEFAULT 0,
    fecha_vencimiento   DATE,
    -- Totales
    subtotal            DECIMAL(14,2) NOT NULL DEFAULT 0,
    descuento_porc      DECIMAL(5,2) DEFAULT 0,
    descuento_monto     DECIMAL(14,2) DEFAULT 0,
    impuesto            DECIMAL(14,2) DEFAULT 0,
    total               DECIMAL(14,2) NOT NULL DEFAULT 0,
    saldo_pendiente     DECIMAL(14,2) NOT NULL DEFAULT 0,
    -- Estado
    estado              ENUM('BORRADOR','EMITIDA','PAGADA','PARCIAL','ANULADA','DEVUELTA') NOT NULL DEFAULT 'BORRADOR',
    -- Despacho / Entrega
    requiere_entrega    TINYINT(1) NOT NULL DEFAULT 0,
    direccion_entrega   VARCHAR(255),
    fecha_entrega       DATETIME,
    observaciones       TEXT,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_venta_fecha    (fecha),
    INDEX idx_venta_cliente  (id_cliente),
    INDEX idx_venta_estado   (estado),
    CONSTRAINT fk_venta_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursales(id_sucursal),
    CONSTRAINT fk_venta_deposito FOREIGN KEY (id_deposito) REFERENCES depositos(id_deposito),
    CONSTRAINT fk_venta_cliente  FOREIGN KEY (id_cliente)  REFERENCES clientes(id_cliente),
    CONSTRAINT fk_venta_vendedor FOREIGN KEY (id_vendedor) REFERENCES usuarios(id_usuario),
    CONSTRAINT fk_venta_moneda   FOREIGN KEY (id_moneda)   REFERENCES monedas(id_moneda)
) ENGINE=InnoDB;

CREATE TABLE venta_detalle (
    id_detalle          BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_venta            BIGINT NOT NULL,
    id_producto         INT NOT NULL,
    cantidad            DECIMAL(14,2) NOT NULL,
    precio_unitario     DECIMAL(14,2) NOT NULL,
    descuento_porc      DECIMAL(5,2) DEFAULT 0,
    descuento_monto     DECIMAL(14,2) DEFAULT 0,
    impuesto_porc       DECIMAL(5,2) DEFAULT 0,
    subtotal            DECIMAL(14,2) NOT NULL,
    costo_unitario      DECIMAL(14,4) DEFAULT 0 COMMENT 'Costo al momento de venta para rentabilidad',
    bono_vendedor       DECIMAL(14,2) DEFAULT 0,
    observacion         VARCHAR(255),
    CONSTRAINT fk_vd_venta    FOREIGN KEY (id_venta)    REFERENCES ventas(id_venta) ON DELETE CASCADE,
    CONSTRAINT fk_vd_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
) ENGINE=InnoDB;

-- Cuotas de venta a crédito
CREATE TABLE venta_cuotas (
    id_cuota            BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_venta            BIGINT NOT NULL,
    numero_cuota        INT NOT NULL,
    fecha_vencimiento   DATE NOT NULL,
    monto               DECIMAL(14,2) NOT NULL,
    monto_pagado        DECIMAL(14,2) NOT NULL DEFAULT 0,
    estado              ENUM('PENDIENTE','PARCIAL','PAGADA','VENCIDA') NOT NULL DEFAULT 'PENDIENTE',
    CONSTRAINT fk_vc_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Pagos / Cobros de ventas
CREATE TABLE pagos_venta (
    id_pago             BIGINT AUTO_INCREMENT PRIMARY KEY,
    numero              VARCHAR(30) NOT NULL UNIQUE,
    id_venta            BIGINT,
    id_cuota            BIGINT,
    id_cliente          INT NOT NULL,
    id_sucursal         INT NOT NULL,
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metodo_pago         ENUM('EFECTIVO','TRANSFERENCIA','QR','CHEQUE','TARJETA_DEBITO','TARJETA_CREDITO','OTRO') NOT NULL,
    id_moneda           INT NOT NULL,
    tipo_cambio         DECIMAL(18,6) DEFAULT 1,
    monto               DECIMAL(14,2) NOT NULL,
    numero_referencia   VARCHAR(60),
    comprobante_url     VARCHAR(255),
    id_usuario          INT NOT NULL,
    observaciones       TEXT,
    CONSTRAINT fk_pv_venta    FOREIGN KEY (id_venta)    REFERENCES ventas(id_venta),
    CONSTRAINT fk_pv_cuota    FOREIGN KEY (id_cuota)    REFERENCES venta_cuotas(id_cuota),
    CONSTRAINT fk_pv_cliente  FOREIGN KEY (id_cliente)  REFERENCES clientes(id_cliente),
    CONSTRAINT fk_pv_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursales(id_sucursal),
    CONSTRAINT fk_pv_moneda   FOREIGN KEY (id_moneda)   REFERENCES monedas(id_moneda),
    CONSTRAINT fk_pv_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- Devoluciones de venta
CREATE TABLE devoluciones_venta (
    id_devolucion       BIGINT AUTO_INCREMENT PRIMARY KEY,
    numero              VARCHAR(30) NOT NULL UNIQUE,
    id_venta            BIGINT NOT NULL,
    id_deposito         INT NOT NULL COMMENT 'A qué depósito vuelve la mercadería',
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo              VARCHAR(255),
    total               DECIMAL(14,2) NOT NULL DEFAULT 0,
    estado              ENUM('PENDIENTE','APROBADA','RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
    id_usuario          INT NOT NULL,
    CONSTRAINT fk_dv_venta    FOREIGN KEY (id_venta)    REFERENCES ventas(id_venta),
    CONSTRAINT fk_dv_deposito FOREIGN KEY (id_deposito) REFERENCES depositos(id_deposito),
    CONSTRAINT fk_dv_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE devolucion_venta_detalle (
    id_detalle          BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_devolucion       BIGINT NOT NULL,
    id_producto         INT NOT NULL,
    cantidad            DECIMAL(14,2) NOT NULL,
    precio_unitario     DECIMAL(14,2) NOT NULL,
    subtotal            DECIMAL(14,2) NOT NULL,
    motivo              VARCHAR(255),
    CONSTRAINT fk_dvd_devolucion FOREIGN KEY (id_devolucion) REFERENCES devoluciones_venta(id_devolucion) ON DELETE CASCADE,
    CONSTRAINT fk_dvd_producto   FOREIGN KEY (id_producto)   REFERENCES productos(id_producto)
) ENGINE=InnoDB;

-- =====================================================================
-- 10. MÓDULO DE CAJA (por sucursal/turno) - opcional pero útil
-- =====================================================================

CREATE TABLE cajas (
    id_caja             INT AUTO_INCREMENT PRIMARY KEY,
    id_sucursal         INT NOT NULL,
    nombre              VARCHAR(60) NOT NULL,
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_caja_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursales(id_sucursal)
) ENGINE=InnoDB;

CREATE TABLE arqueos_caja (
    id_arqueo           BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_caja             INT NOT NULL,
    id_usuario          INT NOT NULL,
    fecha_apertura      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre        DATETIME,
    monto_apertura      DECIMAL(14,2) NOT NULL DEFAULT 0,
    monto_cierre_sistema DECIMAL(14,2) DEFAULT 0,
    monto_cierre_real   DECIMAL(14,2) DEFAULT 0,
    diferencia          DECIMAL(14,2) GENERATED ALWAYS AS (monto_cierre_real - monto_cierre_sistema) STORED,
    estado              ENUM('ABIERTA','CERRADA') NOT NULL DEFAULT 'ABIERTA',
    observaciones       TEXT,
    CONSTRAINT fk_arq_caja    FOREIGN KEY (id_caja)    REFERENCES cajas(id_caja),
    CONSTRAINT fk_arq_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- =====================================================================
-- 11. MÓDULO DE GASTOS
-- =====================================================================

CREATE TABLE categorias_gasto (
    id_categoria_gasto  INT AUTO_INCREMENT PRIMARY KEY,
    nombre              VARCHAR(80) NOT NULL UNIQUE,
    descripcion         VARCHAR(255),
    activo              TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE gastos (
    id_gasto            BIGINT AUTO_INCREMENT PRIMARY KEY,
    numero              VARCHAR(30) NOT NULL UNIQUE,
    id_categoria_gasto  INT NOT NULL,
    id_sucursal         INT NOT NULL,
    id_proveedor        INT COMMENT 'Opcional: si el gasto es a un proveedor registrado',
    descripcion         VARCHAR(255) NOT NULL,
    fecha               DATE NOT NULL,
    id_moneda           INT NOT NULL,
    tipo_cambio         DECIMAL(18,6) DEFAULT 1,
    monto               DECIMAL(14,2) NOT NULL,
    metodo_pago         ENUM('EFECTIVO','TRANSFERENCIA','QR','CHEQUE','TARJETA','OTRO') NOT NULL,
    numero_comprobante  VARCHAR(60),
    comprobante_url     VARCHAR(255),
    id_usuario          INT NOT NULL,
    estado              ENUM('REGISTRADO','APROBADO','PAGADO','ANULADO') NOT NULL DEFAULT 'REGISTRADO',
    observaciones       TEXT,
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_gasto_fecha (fecha),
    CONSTRAINT fk_gasto_categoria FOREIGN KEY (id_categoria_gasto) REFERENCES categorias_gasto(id_categoria_gasto),
    CONSTRAINT fk_gasto_sucursal  FOREIGN KEY (id_sucursal)        REFERENCES sucursales(id_sucursal),
    CONSTRAINT fk_gasto_proveedor FOREIGN KEY (id_proveedor)       REFERENCES proveedores(id_proveedor),
    CONSTRAINT fk_gasto_moneda    FOREIGN KEY (id_moneda)          REFERENCES monedas(id_moneda),
    CONSTRAINT fk_gasto_usuario   FOREIGN KEY (id_usuario)         REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- =====================================================================
-- 12. ÍNDICES ADICIONALES PARA PERFORMANCE
-- =====================================================================

CREATE INDEX idx_compras_proveedor   ON compras(id_proveedor);
CREATE INDEX idx_compras_sucursal    ON compras(id_sucursal);
CREATE INDEX idx_ventas_sucursal     ON ventas(id_sucursal);
CREATE INDEX idx_ventas_vendedor     ON ventas(id_vendedor);
CREATE INDEX idx_pagos_compra_fecha  ON pagos_compra(fecha);
CREATE INDEX idx_pagos_venta_fecha   ON pagos_venta(fecha);
CREATE INDEX idx_gastos_categoria    ON gastos(id_categoria_gasto);

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================
