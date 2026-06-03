-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 31-05-2026 a las 18:02:02
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `bd_electrodomesticos`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ajustes_inventario`
--

CREATE TABLE `ajustes_inventario` (
  `id_ajuste` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `id_deposito` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `motivo` varchar(255) DEFAULT NULL,
  `id_usuario` int(11) NOT NULL,
  `estado` enum('BORRADOR','APROBADO','ANULADO') NOT NULL DEFAULT 'BORRADOR'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ajuste_inventario_detalle`
--

CREATE TABLE `ajuste_inventario_detalle` (
  `id_detalle` bigint(20) NOT NULL,
  `id_ajuste` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad_sistema` decimal(14,2) NOT NULL,
  `cantidad_fisica` decimal(14,2) NOT NULL,
  `diferencia` decimal(14,2) GENERATED ALWAYS AS (`cantidad_fisica` - `cantidad_sistema`) STORED,
  `observacion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alertas_stock`
--

CREATE TABLE `alertas_stock` (
  `id_alerta` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `id_deposito` int(11) NOT NULL,
  `cantidad_actual` decimal(14,2) NOT NULL,
  `stock_minimo` decimal(14,2) NOT NULL,
  `fecha_generada` datetime NOT NULL DEFAULT current_timestamp(),
  `atendida` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_atendida` datetime DEFAULT NULL,
  `id_usuario_atendio` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `arqueos_caja`
--

CREATE TABLE `arqueos_caja` (
  `id_arqueo` bigint(20) NOT NULL,
  `id_caja` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha_apertura` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_cierre` datetime DEFAULT NULL,
  `monto_apertura` decimal(14,2) NOT NULL DEFAULT 0.00,
  `monto_cierre_sistema` decimal(14,2) DEFAULT 0.00,
  `monto_cierre_real` decimal(14,2) DEFAULT 0.00,
  `diferencia` decimal(14,2) GENERATED ALWAYS AS (`monto_cierre_real` - `monto_cierre_sistema`) STORED,
  `estado` enum('ABIERTA','CERRADA') NOT NULL DEFAULT 'ABIERTA',
  `observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `auditoria`
--

CREATE TABLE `auditoria` (
  `id_auditoria` bigint(20) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `tabla` varchar(80) NOT NULL,
  `id_registro` bigint(20) DEFAULT NULL,
  `accion` enum('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','OTRO') NOT NULL,
  `datos_antes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_antes`)),
  `datos_despues` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_despues`)),
  `ip_origen` varchar(45) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `auditoria`
--

INSERT INTO `auditoria` (`id_auditoria`, `id_usuario`, `tabla`, `id_registro`, `accion`, `datos_antes`, `datos_despues`, `ip_origen`, `fecha`) VALUES
(1, 1, 'usuarios', 1, 'OTRO', '{\"id_usuario\":1,\"username\":\"admin\",\"nombres\":\"Administrador\",\"apellidos\":\"del Sistema\",\"documento\":\"00000000\",\"email\":\"admin@electrohogar.bo\",\"telefono\":\"70000000\",\"id_rol\":1,\"id_sucursal_default\":1,\"debe_cambiar_pass\":1,\"activo\":1,\"accion_especifica\":\"RESET_PASSWORD\"}', NULL, '127.0.0.1', '2026-05-31 12:00:48'),
(2, 1, 'usuarios', 1, 'OTRO', '{\"id_usuario\":1,\"username\":\"admin\",\"nombres\":\"Administrador\",\"apellidos\":\"del Sistema\",\"documento\":\"00000000\",\"email\":\"admin@electrohogar.bo\",\"telefono\":\"70000000\",\"id_rol\":1,\"id_sucursal_default\":1,\"debe_cambiar_pass\":1,\"activo\":1,\"accion_especifica\":\"RESET_PASSWORD\"}', NULL, '127.0.0.1', '2026-05-31 12:01:02'),
(3, 1, 'usuarios', 1, 'OTRO', '{\"id_usuario\":1,\"username\":\"admin\",\"nombres\":\"Administrador\",\"apellidos\":\"del Sistema\",\"documento\":\"00000000\",\"email\":\"admin@electrohogar.bo\",\"telefono\":\"70000000\",\"id_rol\":1,\"id_sucursal_default\":1,\"debe_cambiar_pass\":1,\"activo\":1,\"accion_especifica\":\"RESET_PASSWORD\"}', NULL, '127.0.0.1', '2026-05-31 12:01:24'),
(4, 1, 'usuarios', 1, 'LOGOUT', NULL, NULL, '127.0.0.1', '2026-05-31 12:01:27'),
(5, 1, 'usuarios', 1, 'LOGIN', NULL, NULL, '127.0.0.1', '2026-05-31 12:01:36'),
(6, 1, 'usuarios', 1, 'UPDATE', NULL, NULL, '127.0.0.1', '2026-05-31 12:01:50');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `bancos`
--

CREATE TABLE `bancos` (
  `id_banco` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `sigla` varchar(15) DEFAULT NULL,
  `pais` varchar(60) DEFAULT 'Bolivia',
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cajas`
--

CREATE TABLE `cajas` (
  `id_caja` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id_categoria` int(11) NOT NULL,
  `id_categoria_padre` int(11) DEFAULT NULL,
  `nombre` varchar(80) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias_gasto`
--

CREATE TABLE `categorias_gasto` (
  `id_categoria_gasto` int(11) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id_cliente` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `tipo_cliente` enum('MAYORISTA','MINORISTA','VIP','OCASIONAL') NOT NULL DEFAULT 'MINORISTA',
  `tipo_documento` enum('CI','NIT','PASAPORTE','RUC','OTRO') DEFAULT 'CI',
  `documento` varchar(20) DEFAULT NULL,
  `razon_social` varchar(200) DEFAULT NULL COMMENT 'Para facturación',
  `nombres` varchar(120) DEFAULT NULL,
  `apellidos` varchar(120) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `celular` varchar(30) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `permite_credito` tinyint(1) NOT NULL DEFAULT 0,
  `limite_credito` decimal(14,2) DEFAULT 0.00,
  `saldo_actual` decimal(14,2) DEFAULT 0.00 COMMENT 'Cuenta por cobrar',
  `dias_credito` int(11) DEFAULT 0,
  `descuento_default` decimal(5,2) DEFAULT 0.00,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cliente_direcciones`
--

CREATE TABLE `cliente_direcciones` (
  `id_direccion` int(11) NOT NULL,
  `id_cliente` int(11) NOT NULL,
  `etiqueta` varchar(40) DEFAULT NULL COMMENT 'Casa, Oficina, Bodega...',
  `direccion` varchar(255) NOT NULL,
  `ciudad` varchar(80) DEFAULT NULL,
  `referencias` varchar(255) DEFAULT NULL,
  `es_principal` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `combos`
--

CREATE TABLE `combos` (
  `id_combo` int(11) NOT NULL,
  `codigo` varchar(40) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio_combo` decimal(14,2) NOT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `imagen_url` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `combo_detalle`
--

CREATE TABLE `combo_detalle` (
  `id_combo_detalle` int(11) NOT NULL,
  `id_combo` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` decimal(14,2) NOT NULL DEFAULT 1.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compras`
--

CREATE TABLE `compras` (
  `id_compra` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL COMMENT 'Numeración interna',
  `numero_factura` varchar(40) DEFAULT NULL COMMENT 'Factura del proveedor',
  `id_proveedor` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `id_deposito_destino` int(11) NOT NULL,
  `id_moneda` int(11) NOT NULL,
  `tipo_cambio` decimal(18,6) NOT NULL DEFAULT 1.000000,
  `estado` enum('PRE_PEDIDO','POR_LLEGAR','CONFIRMADO','RECIBIDO','PARCIAL','ANULADO') NOT NULL DEFAULT 'PRE_PEDIDO',
  `condicion_pago` enum('CONTADO','CREDITO') NOT NULL DEFAULT 'CONTADO',
  `dias_credito` int(11) DEFAULT 0,
  `fecha_pedido` date NOT NULL,
  `fecha_estim_llegada` date DEFAULT NULL,
  `fecha_confirmacion` date DEFAULT NULL,
  `fecha_recepcion` date DEFAULT NULL,
  `subtotal` decimal(14,2) NOT NULL DEFAULT 0.00,
  `descuento` decimal(14,2) NOT NULL DEFAULT 0.00,
  `impuesto` decimal(14,2) NOT NULL DEFAULT 0.00,
  `flete` decimal(14,2) NOT NULL DEFAULT 0.00,
  `otros_costos` decimal(14,2) NOT NULL DEFAULT 0.00,
  `total` decimal(14,2) NOT NULL DEFAULT 0.00,
  `saldo_pendiente` decimal(14,2) NOT NULL DEFAULT 0.00,
  `id_usuario_crea` int(11) NOT NULL,
  `id_usuario_aprueba` int(11) DEFAULT NULL,
  `id_usuario_recibe` int(11) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compra_cuotas`
--

CREATE TABLE `compra_cuotas` (
  `id_cuota` bigint(20) NOT NULL,
  `id_compra` bigint(20) NOT NULL,
  `numero_cuota` int(11) NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `monto` decimal(14,2) NOT NULL,
  `monto_pagado` decimal(14,2) NOT NULL DEFAULT 0.00,
  `estado` enum('PENDIENTE','PARCIAL','PAGADA','VENCIDA') NOT NULL DEFAULT 'PENDIENTE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compra_detalle`
--

CREATE TABLE `compra_detalle` (
  `id_detalle` bigint(20) NOT NULL,
  `id_compra` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` decimal(14,2) NOT NULL,
  `cantidad_recibida` decimal(14,2) NOT NULL DEFAULT 0.00,
  `precio_unitario` decimal(14,4) NOT NULL,
  `descuento_porc` decimal(5,2) DEFAULT 0.00,
  `descuento_monto` decimal(14,2) DEFAULT 0.00,
  `id_impuesto` int(11) DEFAULT NULL,
  `impuesto_porc` decimal(5,2) DEFAULT 0.00,
  `subtotal` decimal(14,2) NOT NULL,
  `observacion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion_sistema`
--

CREATE TABLE `configuracion_sistema` (
  `id_config` int(11) NOT NULL,
  `clave` varchar(80) NOT NULL,
  `valor` text DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `tipo_dato` enum('STRING','INT','DECIMAL','BOOLEAN','JSON') DEFAULT 'STRING',
  `fecha_modificacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cotizaciones`
--

CREATE TABLE `cotizaciones` (
  `id_cotizacion` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `id_cliente` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `id_vendedor` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_vencimiento` date DEFAULT NULL COMMENT 'Hasta cuándo es válida la cotización',
  `id_moneda` int(11) NOT NULL,
  `tipo_cambio` decimal(18,6) DEFAULT 1.000000,
  `tipo_cotizacion` enum('CONTADO','CREDITO') NOT NULL DEFAULT 'CONTADO',
  `subtotal` decimal(14,2) NOT NULL DEFAULT 0.00,
  `descuento_porc` decimal(5,2) DEFAULT 0.00,
  `descuento_monto` decimal(14,2) DEFAULT 0.00,
  `impuesto` decimal(14,2) DEFAULT 0.00,
  `total` decimal(14,2) NOT NULL DEFAULT 0.00,
  `estado` enum('BORRADOR','EMITIDA','APROBADA','RECHAZADA','VENCIDA','CONVERTIDA') NOT NULL DEFAULT 'BORRADOR',
  `id_venta_generada` bigint(20) DEFAULT NULL COMMENT 'Si se convirtió en venta, referencia',
  `observaciones` text DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cotizacion_detalle`
--

CREATE TABLE `cotizacion_detalle` (
  `id_detalle` bigint(20) NOT NULL,
  `id_cotizacion` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` decimal(14,2) NOT NULL,
  `precio_unitario` decimal(14,2) NOT NULL,
  `descuento_porc` decimal(5,2) DEFAULT 0.00,
  `descuento_monto` decimal(14,2) DEFAULT 0.00,
  `id_impuesto` int(11) DEFAULT NULL,
  `impuesto_porc` decimal(5,2) DEFAULT 0.00,
  `subtotal` decimal(14,2) NOT NULL,
  `observacion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `depositos`
--

CREATE TABLE `depositos` (
  `id_deposito` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('ALMACEN','DEPOSITO_PEQUENO','PUNTO_VENTA','TRANSITO') NOT NULL DEFAULT 'DEPOSITO_PEQUENO',
  `direccion` varchar(255) DEFAULT NULL,
  `encargado` varchar(120) DEFAULT NULL,
  `permite_venta` tinyint(1) NOT NULL DEFAULT 1,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `devoluciones_venta`
--

CREATE TABLE `devoluciones_venta` (
  `id_devolucion` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `id_venta` bigint(20) NOT NULL,
  `id_deposito` int(11) NOT NULL COMMENT 'A qué depósito vuelve la mercadería',
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `motivo` varchar(255) DEFAULT NULL,
  `total` decimal(14,2) NOT NULL DEFAULT 0.00,
  `estado` enum('PENDIENTE','APROBADA','RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
  `id_usuario` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `devolucion_venta_detalle`
--

CREATE TABLE `devolucion_venta_detalle` (
  `id_detalle` bigint(20) NOT NULL,
  `id_devolucion` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` decimal(14,2) NOT NULL,
  `precio_unitario` decimal(14,2) NOT NULL,
  `subtotal` decimal(14,2) NOT NULL,
  `motivo` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `empresas`
--

CREATE TABLE `empresas` (
  `id_empresa` int(11) NOT NULL,
  `razon_social` varchar(200) NOT NULL,
  `nombre_comercial` varchar(150) DEFAULT NULL,
  `nit` varchar(20) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `gastos`
--

CREATE TABLE `gastos` (
  `id_gasto` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `id_categoria_gasto` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `id_proveedor` int(11) DEFAULT NULL COMMENT 'Opcional: si el gasto es a un proveedor registrado',
  `descripcion` varchar(255) NOT NULL,
  `fecha` date NOT NULL,
  `id_moneda` int(11) NOT NULL,
  `tipo_cambio` decimal(18,6) DEFAULT 1.000000,
  `monto` decimal(14,2) NOT NULL,
  `metodo_pago` enum('EFECTIVO','TRANSFERENCIA','QR','CHEQUE','TARJETA','OTRO') NOT NULL,
  `numero_comprobante` varchar(60) DEFAULT NULL,
  `comprobante_url` varchar(255) DEFAULT NULL,
  `id_usuario` int(11) NOT NULL,
  `estado` enum('REGISTRADO','APROBADO','PAGADO','ANULADO') NOT NULL DEFAULT 'REGISTRADO',
  `observaciones` text DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `impuestos`
--

CREATE TABLE `impuestos` (
  `id_impuesto` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `porcentaje` decimal(5,2) NOT NULL,
  `tipo` enum('VENTA','COMPRA','AMBOS','RETENCION') NOT NULL DEFAULT 'AMBOS',
  `es_default` tinyint(1) NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `kardex`
--

CREATE TABLE `kardex` (
  `id_kardex` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `id_deposito` int(11) NOT NULL,
  `id_tipo_movimiento` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `cantidad` decimal(14,2) NOT NULL,
  `costo_unitario` decimal(14,4) DEFAULT 0.0000,
  `saldo_cantidad` decimal(14,2) NOT NULL DEFAULT 0.00,
  `saldo_costo` decimal(14,4) NOT NULL DEFAULT 0.0000,
  `documento_tipo` enum('COMPRA','VENTA','TRANSFERENCIA','AJUSTE','DEVOLUCION','APERTURA') NOT NULL,
  `documento_id` bigint(20) DEFAULT NULL,
  `documento_numero` varchar(40) DEFAULT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `marcas`
--

CREATE TABLE `marcas` (
  `id_marca` int(11) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `pais_origen` varchar(60) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `modulos`
--

CREATE TABLE `modulos` (
  `id_modulo` int(11) NOT NULL,
  `codigo` varchar(40) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `icono` varchar(40) DEFAULT NULL,
  `orden` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `modulos`
--

INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES
(1, 'DASHBOARD', 'Dashboard', 'home', 1),
(2, 'CONFIGURACION', 'Configuración', 'settings', 2),
(3, 'USUARIOS', 'Usuarios y Roles', 'users', 3),
(4, 'PRODUCTOS', 'Productos', 'package', 4),
(5, 'PROVEEDORES', 'Proveedores', 'truck', 5),
(6, 'CLIENTES', 'Clientes', 'user-check', 6),
(7, 'COMPRAS', 'Compras', 'shopping-bag', 7),
(8, 'INVENTARIO', 'Inventario', 'archive', 8),
(9, 'VENTAS', 'Ventas', 'shopping-cart', 9),
(10, 'CAJA', 'Caja', 'dollar-sign', 10),
(11, 'GASTOS', 'Gastos', 'minus-circle', 11),
(12, 'REPORTES', 'Reportes', 'bar-chart', 12),
(13, 'AUDITORIA', 'Auditoría', 'shield', 13),
(14, 'COTIZACIONES', 'Cotizaciones', 'file-text', 14),
(15, 'COBROS', 'Cobros', 'credit-card', 15),
(16, 'COMBOS', 'Combos', 'gift', 16),
(17, 'PROMOCIONES', 'Promociones', 'tag', 17),
(18, 'BANCOS', 'Bancos', 'briefcase', 18),
(19, 'IMPUESTOS', 'Impuestos', 'percent', 19),
(20, 'HERRAMIENTAS', 'Herramientas', 'tool', 20);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `monedas`
--

CREATE TABLE `monedas` (
  `id_moneda` int(11) NOT NULL,
  `codigo` varchar(5) NOT NULL COMMENT 'ISO 4217: BOB, USD, EUR',
  `nombre` varchar(50) NOT NULL,
  `simbolo` varchar(5) NOT NULL,
  `decimales` tinyint(4) NOT NULL DEFAULT 2,
  `es_moneda_base` tinyint(1) NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos_compra`
--

CREATE TABLE `pagos_compra` (
  `id_pago` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `id_compra` bigint(20) DEFAULT NULL,
  `id_cuota` bigint(20) DEFAULT NULL,
  `id_proveedor` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `metodo_pago` enum('EFECTIVO','TRANSFERENCIA','QR','CHEQUE','TARJETA','OTRO') NOT NULL,
  `id_cuenta_proveedor` int(11) DEFAULT NULL COMMENT 'Cuenta a la que se pagó',
  `id_moneda` int(11) NOT NULL,
  `tipo_cambio` decimal(18,6) DEFAULT 1.000000,
  `monto` decimal(14,2) NOT NULL,
  `numero_referencia` varchar(60) DEFAULT NULL COMMENT 'N° transferencia, cheque, comprobante QR',
  `comprobante_url` varchar(255) DEFAULT NULL,
  `id_usuario` int(11) NOT NULL,
  `observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos_venta`
--

CREATE TABLE `pagos_venta` (
  `id_pago` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `id_venta` bigint(20) DEFAULT NULL,
  `id_cuota` bigint(20) DEFAULT NULL,
  `id_cliente` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `metodo_pago` enum('EFECTIVO','TRANSFERENCIA','QR','CHEQUE','TARJETA_DEBITO','TARJETA_CREDITO','OTRO') NOT NULL,
  `id_moneda` int(11) NOT NULL,
  `tipo_cambio` decimal(18,6) DEFAULT 1.000000,
  `monto` decimal(14,2) NOT NULL,
  `numero_referencia` varchar(60) DEFAULT NULL,
  `comprobante_url` varchar(255) DEFAULT NULL,
  `id_usuario` int(11) NOT NULL,
  `observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permisos`
--

CREATE TABLE `permisos` (
  `id_permiso` int(11) NOT NULL,
  `id_modulo` int(11) NOT NULL,
  `codigo` varchar(80) NOT NULL COMMENT 'ej: ventas.crear, compras.aprobar',
  `nombre` varchar(120) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `permisos`
--

INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES
(1, 1, 'dashboard.ver', 'Ver Dashboard', 'Acceder al panel principal con indicadores'),
(2, 1, 'dashboard.ver_todas_sucursales', 'Ver Dashboard de todas las sucursales', 'Consolidar indicadores de todas las sucursales'),
(3, 2, 'configuracion.ver', 'Ver Configuración', 'Acceder al módulo de configuración'),
(4, 2, 'empresa.editar', 'Editar datos de Empresa', 'Modificar razón social, NIT, logo'),
(5, 2, 'sucursales.ver', 'Ver Sucursales', 'Listar sucursales'),
(6, 2, 'sucursales.crear', 'Crear Sucursal', 'Registrar nueva sucursal'),
(7, 2, 'sucursales.editar', 'Editar Sucursal', 'Modificar datos de sucursal'),
(8, 2, 'sucursales.eliminar', 'Eliminar/Desactivar Sucursal', 'Dar de baja una sucursal'),
(9, 2, 'depositos.ver', 'Ver Depósitos', 'Listar depósitos'),
(10, 2, 'depositos.crear', 'Crear Depósito', 'Registrar nuevo depósito o almacén'),
(11, 2, 'depositos.editar', 'Editar Depósito', 'Modificar datos de depósito'),
(12, 2, 'depositos.eliminar', 'Eliminar/Desactivar Depósito', 'Dar de baja un depósito'),
(13, 2, 'monedas.ver', 'Ver Monedas', 'Listar monedas configuradas'),
(14, 2, 'monedas.gestionar', 'Gestionar Monedas', 'Crear, editar y desactivar monedas'),
(15, 2, 'tipos_cambio.ver', 'Ver Tipos de Cambio', 'Consultar tipos de cambio'),
(16, 2, 'tipos_cambio.gestionar', 'Gestionar Tipos de Cambio', 'Registrar y actualizar tasas diarias'),
(17, 2, 'parametros.ver', 'Ver Parámetros del Sistema', 'Consultar configuración general'),
(18, 2, 'parametros.editar', 'Editar Parámetros del Sistema', 'Modificar IVA, prefijos, días alerta, etc.'),
(19, 3, 'usuarios.ver', 'Ver Usuarios', 'Listar usuarios del sistema'),
(20, 3, 'usuarios.crear', 'Crear Usuario', 'Registrar nuevo usuario'),
(21, 3, 'usuarios.editar', 'Editar Usuario', 'Modificar datos de usuario'),
(22, 3, 'usuarios.eliminar', 'Eliminar/Desactivar Usuario', 'Dar de baja un usuario'),
(23, 3, 'usuarios.resetear_password', 'Resetear Contraseña', 'Forzar cambio de contraseña a otro usuario'),
(24, 3, 'usuarios.asignar_sucursales', 'Asignar Sucursales', 'Definir a qué sucursales puede acceder un usuario'),
(25, 3, 'usuarios.cerrar_sesiones', 'Cerrar Sesiones', 'Invalidar sesiones activas de otros usuarios'),
(26, 3, 'roles.ver', 'Ver Roles', 'Listar roles existentes'),
(27, 3, 'roles.crear', 'Crear Rol', 'Registrar nuevo rol'),
(28, 3, 'roles.editar', 'Editar Rol', 'Modificar nombre y descripción de rol'),
(29, 3, 'roles.eliminar', 'Eliminar Rol', 'Eliminar un rol (no del sistema)'),
(30, 3, 'roles.asignar_permisos', 'Asignar Permisos a Rol', 'Configurar permisos por rol'),
(31, 3, 'permisos.ver', 'Ver Permisos', 'Consultar catálogo de permisos'),
(32, 4, 'productos.ver', 'Ver Productos', 'Listar y buscar productos'),
(33, 4, 'productos.crear', 'Crear Producto', 'Registrar nuevo producto'),
(34, 4, 'productos.editar', 'Editar Producto', 'Modificar datos generales del producto'),
(35, 4, 'productos.editar_precio', 'Editar Precio', 'Modificar precio real y precio público'),
(36, 4, 'productos.editar_costos', 'Editar Costos (LOG, MCM)', 'Modificar costos de logística y MCM'),
(37, 4, 'productos.editar_bono', 'Editar Bono Vendedor', 'Modificar bono asignado al producto'),
(38, 4, 'productos.eliminar', 'Eliminar/Desactivar Producto', 'Dar de baja un producto'),
(39, 4, 'productos.exportar', 'Exportar Productos', 'Exportar catálogo a Excel/PDF'),
(40, 4, 'productos.importar', 'Importar Productos', 'Carga masiva desde Excel'),
(41, 4, 'productos.ver_historico_precios', 'Ver Histórico de Precios', 'Consultar cambios históricos de precio'),
(42, 4, 'marcas.ver', 'Ver Marcas', 'Listar marcas'),
(43, 4, 'marcas.gestionar', 'Gestionar Marcas', 'Crear, editar y desactivar marcas'),
(44, 4, 'categorias.ver', 'Ver Categorías', 'Listar categorías'),
(45, 4, 'categorias.gestionar', 'Gestionar Categorías', 'Crear, editar y desactivar categorías'),
(46, 4, 'unidades.ver', 'Ver Unidades de Medida', 'Listar unidades de medida'),
(47, 4, 'unidades.gestionar', 'Gestionar Unidades de Medida', 'Crear, editar y desactivar unidades'),
(48, 5, 'proveedores.ver', 'Ver Proveedores', 'Listar proveedores'),
(49, 5, 'proveedores.crear', 'Crear Proveedor', 'Registrar nuevo proveedor'),
(50, 5, 'proveedores.editar', 'Editar Proveedor', 'Modificar datos de proveedor'),
(51, 5, 'proveedores.eliminar', 'Eliminar/Desactivar Proveedor', 'Dar de baja un proveedor'),
(52, 5, 'proveedores.ver_saldo', 'Ver Saldo del Proveedor', 'Consultar cuenta por pagar'),
(53, 5, 'proveedores.gestionar_cuentas', 'Gestionar Cuentas de Pago', 'Agregar/editar cuentas (efectivo, QR, banco)'),
(54, 5, 'proveedores.gestionar_contactos', 'Gestionar Contactos', 'Agregar y editar contactos del proveedor'),
(55, 5, 'proveedores.exportar', 'Exportar Proveedores', 'Exportar a Excel/PDF'),
(56, 6, 'clientes.ver', 'Ver Clientes', 'Listar y buscar clientes'),
(57, 6, 'clientes.crear', 'Crear Cliente', 'Registrar nuevo cliente'),
(58, 6, 'clientes.editar', 'Editar Cliente', 'Modificar datos de cliente'),
(59, 6, 'clientes.eliminar', 'Eliminar/Desactivar Cliente', 'Dar de baja un cliente'),
(60, 6, 'clientes.dar_credito', 'Otorgar Crédito', 'Activar permite_credito y definir límite'),
(61, 6, 'clientes.modificar_limite', 'Modificar Límite de Crédito', 'Cambiar el límite de crédito de un cliente'),
(62, 6, 'clientes.ver_saldo', 'Ver Saldo del Cliente', 'Consultar cuenta por cobrar'),
(63, 6, 'clientes.ver_historial', 'Ver Historial de Compras', 'Ver todas las ventas del cliente'),
(64, 6, 'clientes.gestionar_direcciones', 'Gestionar Direcciones', 'Agregar/editar direcciones de entrega'),
(65, 6, 'clientes.exportar', 'Exportar Clientes', 'Exportar a Excel/PDF'),
(66, 7, 'compras.ver', 'Ver Compras', 'Listar compras de su sucursal'),
(67, 7, 'compras.ver_todas', 'Ver Compras de Todas las Sucursales', 'Acceso a compras de cualquier sucursal'),
(68, 7, 'compras.crear_pre_pedido', 'Crear Pre-Pedido', 'Iniciar un pre-pedido a proveedor'),
(69, 7, 'compras.editar_pre_pedido', 'Editar Pre-Pedido', 'Modificar pre-pedido antes de confirmar'),
(70, 7, 'compras.confirmar_pedido', 'Confirmar Pedido (Por Llegar)', 'Pasar pre-pedido a estado por llegar'),
(71, 7, 'compras.aprobar', 'Aprobar Compra', 'Aprobar compras de alto monto'),
(72, 7, 'compras.recibir', 'Recibir Mercadería', 'Confirmar recepción y actualizar stock'),
(73, 7, 'compras.recibir_parcial', 'Recibir Mercadería Parcial', 'Permitir recepción parcial'),
(74, 7, 'compras.anular', 'Anular Compra', 'Cancelar/anular una compra'),
(75, 7, 'compras.ver_costos', 'Ver Costos de Compra', 'Visualizar precios reales y márgenes'),
(76, 7, 'compras.pagar', 'Registrar Pago a Proveedor', 'Registrar pago de una compra'),
(77, 7, 'compras.anular_pago', 'Anular Pago a Proveedor', 'Anular un pago registrado'),
(78, 7, 'compras.gestionar_cuotas', 'Gestionar Cuotas de Compra', 'Modificar plan de cuotas'),
(79, 7, 'compras.imprimir', 'Imprimir Documento de Compra', 'Generar PDF de orden de compra'),
(80, 7, 'compras.exportar', 'Exportar Compras', 'Exportar listado a Excel/PDF'),
(81, 8, 'inventario.ver', 'Ver Inventario', 'Consultar stock de su depósito asignado'),
(82, 8, 'inventario.ver_todos_depositos', 'Ver Inventario de Todos los Depósitos', 'Stock consolidado multi-depósito'),
(83, 8, 'inventario.ver_kardex', 'Ver Kardex', 'Consultar historial de movimientos'),
(84, 8, 'inventario.transferir_solicitar', 'Solicitar Transferencia', 'Crear solicitud de transferencia entre depósitos'),
(85, 8, 'inventario.transferir_enviar', 'Enviar Transferencia', 'Confirmar envío de mercadería'),
(86, 8, 'inventario.transferir_recibir', 'Recibir Transferencia', 'Confirmar recepción en depósito destino'),
(87, 8, 'inventario.transferir_anular', 'Anular Transferencia', 'Cancelar una transferencia'),
(88, 8, 'inventario.ajuste_crear', 'Crear Ajuste de Inventario', 'Registrar ajuste por conteo físico'),
(89, 8, 'inventario.ajuste_aprobar', 'Aprobar Ajuste de Inventario', 'Aprobar ajustes de stock'),
(90, 8, 'inventario.ajuste_anular', 'Anular Ajuste de Inventario', 'Cancelar un ajuste pendiente'),
(91, 8, 'inventario.stock_minimo_editar', 'Editar Stock Mínimo por Producto', 'Modificar umbral de alerta'),
(92, 8, 'inventario.alertas_ver', 'Ver Alertas de Stock Mínimo', 'Listar productos bajo stock mínimo'),
(93, 8, 'inventario.alertas_atender', 'Atender Alertas', 'Marcar alertas como atendidas'),
(94, 8, 'inventario.exportar', 'Exportar Inventario', 'Exportar reporte de stock a Excel'),
(95, 9, 'ventas.ver_propias', 'Ver Ventas Propias', 'Ver sólo las ventas que el vendedor realizó'),
(96, 9, 'ventas.ver_sucursal', 'Ver Ventas de la Sucursal', 'Ver todas las ventas de su sucursal'),
(97, 9, 'ventas.ver_todas', 'Ver Ventas de Todas las Sucursales', 'Ver ventas a nivel global'),
(98, 9, 'ventas.crear_menor', 'Crear Venta al Por Menor', 'Registrar venta minorista'),
(99, 9, 'ventas.crear_mayor', 'Crear Venta al Por Mayor', 'Registrar venta mayorista'),
(100, 9, 'ventas.editar_borrador', 'Editar Venta en Borrador', 'Modificar venta antes de emitirla'),
(101, 9, 'ventas.emitir', 'Emitir Venta', 'Confirmar y emitir la venta'),
(102, 9, 'ventas.aplicar_descuento', 'Aplicar Descuento', 'Otorgar descuento dentro de margen permitido'),
(103, 9, 'ventas.aplicar_descuento_alto', 'Aplicar Descuento Alto', 'Otorgar descuentos sobre el límite estándar'),
(104, 9, 'ventas.vender_credito', 'Vender a Crédito', 'Realizar ventas a crédito'),
(105, 9, 'ventas.aprobar_credito', 'Aprobar Crédito sobre Límite', 'Autorizar venta que excede el límite del cliente'),
(106, 9, 'ventas.cobrar', 'Registrar Cobro', 'Registrar pagos de ventas'),
(107, 9, 'ventas.anular_cobro', 'Anular Cobro', 'Anular un cobro registrado'),
(108, 9, 'ventas.anular', 'Anular Venta', 'Anular una venta emitida'),
(109, 9, 'ventas.devolucion_crear', 'Crear Devolución', 'Iniciar proceso de devolución'),
(110, 9, 'ventas.devolucion_aprobar', 'Aprobar Devolución', 'Aprobar devolución y reingresar stock'),
(111, 9, 'ventas.cambiar_vendedor', 'Cambiar Vendedor de la Venta', 'Reasignar vendedor'),
(112, 9, 'ventas.ver_utilidad', 'Ver Utilidad de la Venta', 'Visualizar costo y rentabilidad'),
(113, 9, 'ventas.imprimir', 'Imprimir/Reimprimir Factura', 'Generar PDF o reimprimir comprobante'),
(114, 9, 'ventas.exportar', 'Exportar Ventas', 'Exportar a Excel/PDF'),
(115, 10, 'caja.ver', 'Ver Cajas', 'Listar cajas configuradas'),
(116, 10, 'caja.gestionar', 'Gestionar Cajas', 'Crear, editar y desactivar cajas'),
(117, 10, 'caja.abrir', 'Abrir Caja', 'Iniciar turno de caja'),
(118, 10, 'caja.cerrar', 'Cerrar Caja', 'Cerrar turno y registrar arqueo'),
(119, 10, 'caja.ver_arqueo_propio', 'Ver Arqueo Propio', 'Ver sus propios arqueos'),
(120, 10, 'caja.ver_arqueo_todos', 'Ver Arqueos de Todos', 'Ver arqueos de todos los cajeros'),
(121, 10, 'caja.cuadrar_diferencia', 'Cuadrar Diferencia', 'Justificar diferencias en arqueo'),
(122, 10, 'caja.forzar_cierre', 'Forzar Cierre de Caja', 'Cerrar caja de otro usuario en casos especiales'),
(123, 10, 'caja.exportar', 'Exportar Arqueos', 'Exportar arqueos a Excel/PDF'),
(124, 11, 'gastos.ver', 'Ver Gastos', 'Listar gastos de su sucursal'),
(125, 11, 'gastos.ver_todos', 'Ver Gastos de Todas las Sucursales', 'Ver gastos a nivel global'),
(126, 11, 'gastos.crear', 'Registrar Gasto', 'Crear nuevo gasto'),
(127, 11, 'gastos.editar', 'Editar Gasto', 'Modificar gasto en estado REGISTRADO'),
(128, 11, 'gastos.aprobar', 'Aprobar Gasto', 'Aprobar gastos registrados'),
(129, 11, 'gastos.pagar', 'Marcar Gasto como Pagado', 'Registrar el pago del gasto'),
(130, 11, 'gastos.anular', 'Anular Gasto', 'Anular un gasto'),
(131, 11, 'gastos.categorias_ver', 'Ver Categorías de Gasto', 'Listar categorías'),
(132, 11, 'gastos.categorias_gestionar', 'Gestionar Categorías de Gasto', 'Crear, editar y desactivar categorías'),
(133, 11, 'gastos.adjuntar_comprobante', 'Adjuntar Comprobante', 'Subir comprobante de gasto'),
(134, 11, 'gastos.exportar', 'Exportar Gastos', 'Exportar a Excel/PDF'),
(135, 12, 'reportes.ver', 'Acceder a Reportes', 'Acceso general al módulo'),
(136, 12, 'reportes.stock_consolidado', 'Reporte Stock Consolidado', 'Ver stock por depósito (formato Excel)'),
(137, 12, 'reportes.ventas_periodo', 'Reporte Ventas por Período', 'Ventas filtradas por fecha'),
(138, 12, 'reportes.ventas_vendedor', 'Reporte Ventas por Vendedor', 'Ranking y detalle por vendedor'),
(139, 12, 'reportes.ventas_producto', 'Reporte Ventas por Producto', 'Top productos vendidos'),
(140, 12, 'reportes.ventas_cliente', 'Reporte Ventas por Cliente', 'Compras por cliente'),
(141, 12, 'reportes.compras_periodo', 'Reporte Compras por Período', 'Compras filtradas por fecha'),
(142, 12, 'reportes.compras_proveedor', 'Reporte Compras por Proveedor', 'Total comprado por proveedor'),
(143, 12, 'reportes.cuentas_cobrar', 'Reporte Cuentas por Cobrar', 'Clientes con saldo pendiente'),
(144, 12, 'reportes.cuentas_pagar', 'Reporte Cuentas por Pagar', 'Proveedores con saldo pendiente'),
(145, 12, 'reportes.alertas_stock', 'Reporte Alertas Stock Mínimo', 'Productos bajo stock mínimo'),
(146, 12, 'reportes.kardex', 'Reporte Kardex por Producto', 'Movimientos detallados de un producto'),
(147, 12, 'reportes.rentabilidad', 'Reporte Rentabilidad', 'Utilidad por producto/marca/categoría'),
(148, 12, 'reportes.estado_resultados', 'Reporte Estado de Resultados', 'Ingresos - costos - gastos'),
(149, 12, 'reportes.bonos_vendedores', 'Reporte Bonos a Vendedores', 'Bonos generados por vendedor'),
(150, 12, 'reportes.arqueos_caja', 'Reporte Arqueos de Caja', 'Arqueos por sucursal/período'),
(151, 12, 'reportes.gastos_categoria', 'Reporte Gastos por Categoría', 'Distribución de gastos'),
(152, 12, 'reportes.transferencias', 'Reporte Transferencias', 'Histórico de transferencias entre depósitos'),
(153, 12, 'reportes.devoluciones', 'Reporte Devoluciones', 'Devoluciones por período/causa'),
(154, 12, 'reportes.exportar', 'Exportar Reportes', 'Descargar reportes en Excel/PDF'),
(155, 12, 'reportes.dashboard_financiero', 'Dashboard Financiero', 'Indicadores financieros consolidados'),
(156, 13, 'auditoria.ver', 'Ver Auditoría', 'Acceder al log de auditoría'),
(157, 13, 'auditoria.filtrar', 'Filtrar Auditoría', 'Filtrar por usuario, tabla, fecha'),
(158, 13, 'auditoria.exportar', 'Exportar Auditoría', 'Exportar log a Excel/PDF'),
(159, 13, 'sesiones.ver', 'Ver Sesiones Activas', 'Ver usuarios conectados'),
(160, 13, 'sesiones.cerrar', 'Cerrar Sesiones Activas', 'Forzar cierre de sesión'),
(161, 14, 'cotizaciones.ver', 'Ver Cotizaciones', 'Listar cotizaciones de su sucursal'),
(162, 14, 'cotizaciones.ver_todas', 'Ver Cotizaciones de Todas las Sucursales', 'Acceso global'),
(163, 14, 'cotizaciones.crear', 'Crear Cotización', 'Generar nueva cotización'),
(164, 14, 'cotizaciones.editar', 'Editar Cotización', 'Modificar cotización en borrador'),
(165, 14, 'cotizaciones.emitir', 'Emitir Cotización', 'Confirmar y enviar al cliente'),
(166, 14, 'cotizaciones.aprobar', 'Aprobar Cotización', 'Marcar como aprobada por cliente'),
(167, 14, 'cotizaciones.rechazar', 'Rechazar Cotización', 'Marcar como rechazada'),
(168, 14, 'cotizaciones.convertir_venta', 'Convertir en Venta', 'Generar venta a partir de cotización'),
(169, 14, 'cotizaciones.anular', 'Anular Cotización', 'Anular cotización emitida'),
(170, 14, 'cotizaciones.imprimir', 'Imprimir Cotización', 'Generar PDF de la cotización'),
(171, 14, 'cotizaciones.exportar', 'Exportar Cotizaciones', 'Exportar listado a Excel/PDF'),
(172, 15, 'cobros.ver', 'Ver Cobros', 'Listar cobros realizados'),
(173, 15, 'cobros.ver_todos', 'Ver Cobros de Todas las Sucursales', 'Acceso global'),
(174, 15, 'cobros.crear', 'Registrar Cobro', 'Registrar pago de venta a crédito'),
(175, 15, 'cobros.editar', 'Editar Cobro', 'Modificar cobro en el mismo día'),
(176, 15, 'cobros.anular', 'Anular Cobro', 'Anular un cobro registrado'),
(177, 15, 'cobros.contado', 'Cobros al Contado', 'Gestionar cobros al contado'),
(178, 15, 'cobros.credito', 'Cobros a Crédito', 'Gestionar cobros a crédito'),
(179, 15, 'cobros.efectivo', 'Cobrar en Efectivo', 'Aceptar pagos en efectivo'),
(180, 15, 'cobros.qr', 'Cobrar por QR', 'Aceptar pagos por QR'),
(181, 15, 'cobros.imprimir', 'Imprimir Recibo', 'Generar recibo de cobro'),
(182, 15, 'cobros.exportar', 'Exportar Cobros', 'Exportar a Excel/PDF'),
(183, 16, 'combos.ver', 'Ver Combos', 'Listar combos activos'),
(184, 16, 'combos.crear', 'Crear Combo', 'Definir nuevo pack de productos'),
(185, 16, 'combos.editar', 'Editar Combo', 'Modificar combo'),
(186, 16, 'combos.eliminar', 'Eliminar/Desactivar Combo', 'Dar de baja un combo'),
(187, 16, 'combos.exportar', 'Exportar Combos', 'Exportar a Excel/PDF'),
(188, 17, 'promociones.ver', 'Ver Promociones', 'Listar promociones'),
(189, 17, 'promociones.crear', 'Crear Promoción', 'Definir nueva promoción'),
(190, 17, 'promociones.editar', 'Editar Promoción', 'Modificar promoción vigente'),
(191, 17, 'promociones.eliminar', 'Eliminar/Desactivar Promoción', 'Dar de baja una promoción'),
(192, 17, 'promociones.aplicar', 'Aplicar Promoción Manual', 'Aplicar promoción a una venta manualmente'),
(193, 17, 'promociones.exportar', 'Exportar Promociones', 'Exportar a Excel/PDF'),
(194, 18, 'bancos.ver', 'Ver Bancos', 'Listar catálogo de bancos'),
(195, 18, 'bancos.crear', 'Crear Banco', 'Registrar nuevo banco'),
(196, 18, 'bancos.editar', 'Editar Banco', 'Modificar datos del banco'),
(197, 18, 'bancos.eliminar', 'Eliminar/Desactivar Banco', 'Dar de baja un banco'),
(198, 19, 'impuestos.ver', 'Ver Impuestos', 'Listar catálogo de impuestos'),
(199, 19, 'impuestos.crear', 'Crear Impuesto', 'Registrar nuevo impuesto'),
(200, 19, 'impuestos.editar', 'Editar Impuesto', 'Modificar porcentaje o nombre'),
(201, 19, 'impuestos.eliminar', 'Eliminar/Desactivar Impuesto', 'Dar de baja un impuesto'),
(202, 20, 'herramientas.ver', 'Acceder a Herramientas', 'Acceso al panel de herramientas'),
(203, 20, 'backup.crear', 'Crear Copia de Seguridad', 'Generar backup de la BD'),
(204, 20, 'backup.restaurar', 'Restaurar Copia de Seguridad', 'Restaurar BD desde backup'),
(205, 20, 'backup.descargar', 'Descargar Backups', 'Descargar archivos de backup'),
(206, 20, 'bd.eliminar_registros', 'Eliminar Registros de BD', 'Operación crítica: borrar datos masivos'),
(207, 20, 'excel.exportar_planilla', 'Descargar Planilla Excel', 'Descargar plantilla para carga masiva'),
(208, 20, 'excel.importar_productos', 'Importar Productos desde Excel', 'Cargar productos masivamente'),
(209, 20, 'excel.exportar_productos', 'Exportar Productos a Excel', 'Exportar catálogo completo'),
(210, 20, 'codigo_barras.generar', 'Generar Código de Barras', 'Generar y/o imprimir códigos de barra'),
(211, 20, 'catalogo.generar_pdf', 'Generar Catálogo PDF', 'Generar catálogo de productos en PDF'),
(212, 20, 'impresora.configurar', 'Configurar Impresora', 'Definir impresora por defecto y tipo'),
(213, 20, 'factura.editar_plantilla', 'Editar Plantilla de Factura', 'Personalizar diseño de factura');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id_producto` int(11) NOT NULL,
  `codigo_interno` varchar(40) NOT NULL,
  `codigo_barras` varchar(60) DEFAULT NULL,
  `id_marca` int(11) NOT NULL,
  `id_categoria` int(11) NOT NULL,
  `id_unidad` int(11) NOT NULL,
  `producto` varchar(120) NOT NULL COMMENT 'Tipo: COCINA DE PISO, FREIDORA DE AIRE, etc.',
  `detalle` varchar(255) DEFAULT NULL COMMENT 'Ej: 4H MESAVIDRIO E.E. GRILL ELEC.',
  `capacidad` varchar(40) DEFAULT NULL COMMENT 'Ej: 2 Lts, 60 CM, 250 Lts',
  `caracteristicas` varchar(255) DEFAULT NULL,
  `modelo` varchar(80) DEFAULT NULL,
  `color` varchar(40) DEFAULT NULL,
  `id_moneda_costo` int(11) NOT NULL,
  `precio_real` decimal(14,2) NOT NULL DEFAULT 0.00 COMMENT 'REAL BS - costo base',
  `costo_logistica` decimal(14,2) NOT NULL DEFAULT 0.00 COMMENT 'LOG',
  `costo_mcm` decimal(14,2) NOT NULL DEFAULT 0.00 COMMENT 'MCM - carga adicional',
  `costo_total` decimal(14,2) GENERATED ALWAYS AS (`precio_real` + `costo_logistica` + `costo_mcm`) STORED,
  `precio_publico` decimal(14,2) NOT NULL DEFAULT 0.00,
  `utilidad` decimal(14,2) GENERATED ALWAYS AS (`precio_publico` - (`precio_real` + `costo_logistica` + `costo_mcm`)) STORED,
  `bono` decimal(14,2) NOT NULL DEFAULT 0.00 COMMENT 'Bono para vendedor',
  `precio_mayor` decimal(14,2) DEFAULT 0.00,
  `id_proveedor_default` int(11) DEFAULT NULL,
  `id_impuesto_default` int(11) DEFAULT NULL COMMENT 'Impuesto por defecto del producto',
  `stock_minimo` decimal(14,2) NOT NULL DEFAULT 0.00,
  `stock_maximo` decimal(14,2) DEFAULT 0.00,
  `imagen_url` varchar(255) DEFAULT NULL,
  `estado` enum('NUEVO','USADO','EXHIBICION','RECONDICIONADO','DESCONTINUADO') NOT NULL DEFAULT 'NUEVO',
  `notas` text DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_modificacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `producto_precio_historico`
--

CREATE TABLE `producto_precio_historico` (
  `id_historico` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `precio_real_ant` decimal(14,2) DEFAULT NULL,
  `precio_real_nuevo` decimal(14,2) DEFAULT NULL,
  `precio_pub_ant` decimal(14,2) DEFAULT NULL,
  `precio_pub_nuevo` decimal(14,2) DEFAULT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `promociones`
--

CREATE TABLE `promociones` (
  `id_promocion` int(11) NOT NULL,
  `codigo` varchar(40) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo_descuento` enum('PORCENTAJE','MONTO_FIJO') NOT NULL DEFAULT 'PORCENTAJE',
  `valor_descuento` decimal(10,2) NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `cantidad_minima` decimal(14,2) DEFAULT 1.00 COMMENT 'Cantidad mínima a comprar para aplicar',
  `aplica_a` enum('PRODUCTO','CATEGORIA','MARCA','TODOS') NOT NULL DEFAULT 'PRODUCTO',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `promocion_producto`
--

CREATE TABLE `promocion_producto` (
  `id_promo_prod` bigint(20) NOT NULL,
  `id_promocion` int(11) NOT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `id_categoria` int(11) DEFAULT NULL,
  `id_marca` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedores`
--

CREATE TABLE `proveedores` (
  `id_proveedor` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `razon_social` varchar(200) NOT NULL,
  `nombre_comercial` varchar(150) DEFAULT NULL,
  `nit` varchar(20) DEFAULT NULL,
  `tipo_proveedor` enum('NACIONAL','INTERNACIONAL') DEFAULT 'NACIONAL',
  `direccion` varchar(255) DEFAULT NULL,
  `ciudad` varchar(80) DEFAULT NULL,
  `pais` varchar(80) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `contacto_principal` varchar(120) DEFAULT NULL,
  `plazo_credito_dias` int(11) DEFAULT 0,
  `saldo_actual` decimal(14,2) DEFAULT 0.00,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedor_contactos`
--

CREATE TABLE `proveedor_contactos` (
  `id_contacto` int(11) NOT NULL,
  `id_proveedor` int(11) NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `cargo` varchar(80) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedor_cuentas_pago`
--

CREATE TABLE `proveedor_cuentas_pago` (
  `id_cuenta` int(11) NOT NULL,
  `id_proveedor` int(11) NOT NULL,
  `metodo` enum('EFECTIVO','TRANSFERENCIA','QR','CHEQUE','OTRO') NOT NULL,
  `id_banco` int(11) DEFAULT NULL,
  `tipo_cuenta` varchar(30) DEFAULT NULL,
  `numero_cuenta` varchar(60) DEFAULT NULL,
  `titular` varchar(150) DEFAULT NULL,
  `qr_url` varchar(255) DEFAULT NULL,
  `id_moneda` int(11) DEFAULT NULL,
  `es_principal` tinyint(1) NOT NULL DEFAULT 0,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id_rol` int(11) NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `es_sistema` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = no se puede eliminar',
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id_rol`, `nombre`, `descripcion`, `es_sistema`, `activo`) VALUES
(1, 'ADMINISTRADOR', 'Dueño / Administrador del negocio. Acceso total al sistema.', 1, 1),
(2, 'VENDEDOR', 'Realiza ventas al por mayor y menor, gestiona clientes y cobros.', 0, 1),
(3, 'ALMACENERO', 'Controla inventario, recibe mercadería de compras y gestiona transferencias.', 0, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rol_permiso`
--

CREATE TABLE `rol_permiso` (
  `id_rol` int(11) NOT NULL,
  `id_permiso` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `rol_permiso`
--

INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 4),
(1, 5),
(1, 6),
(1, 7),
(1, 8),
(1, 9),
(1, 10),
(1, 11),
(1, 12),
(1, 13),
(1, 14),
(1, 15),
(1, 16),
(1, 17),
(1, 18),
(1, 19),
(1, 20),
(1, 21),
(1, 22),
(1, 23),
(1, 24),
(1, 25),
(1, 26),
(1, 27),
(1, 28),
(1, 29),
(1, 30),
(1, 31),
(1, 32),
(1, 33),
(1, 34),
(1, 35),
(1, 36),
(1, 37),
(1, 38),
(1, 39),
(1, 40),
(1, 41),
(1, 42),
(1, 43),
(1, 44),
(1, 45),
(1, 46),
(1, 47),
(1, 48),
(1, 49),
(1, 50),
(1, 51),
(1, 52),
(1, 53),
(1, 54),
(1, 55),
(1, 56),
(1, 57),
(1, 58),
(1, 59),
(1, 60),
(1, 61),
(1, 62),
(1, 63),
(1, 64),
(1, 65),
(1, 66),
(1, 67),
(1, 68),
(1, 69),
(1, 70),
(1, 71),
(1, 72),
(1, 73),
(1, 74),
(1, 75),
(1, 76),
(1, 77),
(1, 78),
(1, 79),
(1, 80),
(1, 81),
(1, 82),
(1, 83),
(1, 84),
(1, 85),
(1, 86),
(1, 87),
(1, 88),
(1, 89),
(1, 90),
(1, 91),
(1, 92),
(1, 93),
(1, 94),
(1, 95),
(1, 96),
(1, 97),
(1, 98),
(1, 99),
(1, 100),
(1, 101),
(1, 102),
(1, 103),
(1, 104),
(1, 105),
(1, 106),
(1, 107),
(1, 108),
(1, 109),
(1, 110),
(1, 111),
(1, 112),
(1, 113),
(1, 114),
(1, 115),
(1, 116),
(1, 117),
(1, 118),
(1, 119),
(1, 120),
(1, 121),
(1, 122),
(1, 123),
(1, 124),
(1, 125),
(1, 126),
(1, 127),
(1, 128),
(1, 129),
(1, 130),
(1, 131),
(1, 132),
(1, 133),
(1, 134),
(1, 135),
(1, 136),
(1, 137),
(1, 138),
(1, 139),
(1, 140),
(1, 141),
(1, 142),
(1, 143),
(1, 144),
(1, 145),
(1, 146),
(1, 147),
(1, 148),
(1, 149),
(1, 150),
(1, 151),
(1, 152),
(1, 153),
(1, 154),
(1, 155),
(1, 156),
(1, 157),
(1, 158),
(1, 159),
(1, 160),
(1, 161),
(1, 162),
(1, 163),
(1, 164),
(1, 165),
(1, 166),
(1, 167),
(1, 168),
(1, 169),
(1, 170),
(1, 171),
(1, 172),
(1, 173),
(1, 174),
(1, 175),
(1, 176),
(1, 177),
(1, 178),
(1, 179),
(1, 180),
(1, 181),
(1, 182),
(1, 183),
(1, 184),
(1, 185),
(1, 186),
(1, 187),
(1, 188),
(1, 189),
(1, 190),
(1, 191),
(1, 192),
(1, 193),
(1, 194),
(1, 195),
(1, 196),
(1, 197),
(1, 198),
(1, 199),
(1, 200),
(1, 201),
(1, 202),
(1, 203),
(1, 204),
(1, 205),
(1, 206),
(1, 207),
(1, 208),
(1, 209),
(1, 210),
(1, 211),
(1, 212),
(1, 213),
(2, 1),
(2, 32),
(2, 42),
(2, 44),
(2, 46),
(2, 56),
(2, 57),
(2, 58),
(2, 60),
(2, 62),
(2, 63),
(2, 64),
(2, 65),
(2, 81),
(2, 82),
(2, 92),
(2, 95),
(2, 96),
(2, 98),
(2, 99),
(2, 100),
(2, 101),
(2, 102),
(2, 104),
(2, 106),
(2, 109),
(2, 113),
(2, 114),
(2, 115),
(2, 117),
(2, 118),
(2, 119),
(2, 121),
(2, 135),
(2, 137),
(2, 139),
(2, 140),
(2, 150),
(2, 154),
(2, 161),
(2, 163),
(2, 164),
(2, 165),
(2, 166),
(2, 167),
(2, 168),
(2, 170),
(2, 171),
(2, 172),
(2, 174),
(2, 177),
(2, 178),
(2, 179),
(2, 180),
(2, 181),
(2, 182),
(2, 183),
(2, 188),
(2, 192),
(2, 210),
(3, 1),
(3, 32),
(3, 42),
(3, 44),
(3, 46),
(3, 48),
(3, 66),
(3, 72),
(3, 73),
(3, 79),
(3, 81),
(3, 82),
(3, 83),
(3, 84),
(3, 85),
(3, 86),
(3, 88),
(3, 91),
(3, 92),
(3, 93),
(3, 94),
(3, 135),
(3, 136),
(3, 145),
(3, 146),
(3, 152),
(3, 154),
(3, 183),
(3, 209),
(3, 210);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sesiones`
--

CREATE TABLE `sesiones` (
  `id_sesion` bigint(20) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `ip_origen` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `fecha_inicio` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_expiracion` datetime DEFAULT NULL,
  `cerrada` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `sesiones`
--

INSERT INTO `sesiones` (`id_sesion`, `id_usuario`, `token`, `ip_origen`, `user_agent`, `fecha_inicio`, `fecha_expiracion`, `cerrada`) VALUES
(1, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjMDIyM2JiOS00ODkyLTQ2OGUtOGFjYy00MTY2NTY5YTdiNmUiLCJpZF91c3VhcmlvIjoxLCJyb2wiOjEsInJvbF9ub21icmUiOiJBRE1JTklTVFJBRE9SIiwiaWRfc3VjdXJzYWwiOjEsImRlYmVfY2FtYmlhcl9wYXNzIjp0cnVlLCJwZXJtaXNvcyI6WyJkYXNoYm9hcmQudm', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-31 12:01:36', '2026-05-31 20:01:36', 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `stock`
--

CREATE TABLE `stock` (
  `id_stock` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `id_deposito` int(11) NOT NULL,
  `cantidad` decimal(14,2) NOT NULL DEFAULT 0.00,
  `cantidad_reservada` decimal(14,2) NOT NULL DEFAULT 0.00 COMMENT 'En proceso de venta/transferencia',
  `cantidad_disponible` decimal(14,2) GENERATED ALWAYS AS (`cantidad` - `cantidad_reservada`) STORED,
  `costo_promedio` decimal(14,4) DEFAULT 0.0000,
  `fecha_ult_movimiento` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sucursales`
--

CREATE TABLE `sucursales` (
  `id_sucursal` int(11) NOT NULL,
  `id_empresa` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('PRINCIPAL','SUCURSAL') NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `ciudad` varchar(80) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `responsable` varchar(120) DEFAULT NULL,
  `es_punto_venta` tinyint(1) NOT NULL DEFAULT 1,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipos_cambio`
--

CREATE TABLE `tipos_cambio` (
  `id_tipo_cambio` int(11) NOT NULL,
  `id_moneda_origen` int(11) NOT NULL,
  `id_moneda_destino` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `tasa_compra` decimal(18,6) NOT NULL,
  `tasa_venta` decimal(18,6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipos_movimiento`
--

CREATE TABLE `tipos_movimiento` (
  `id_tipo_movimiento` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `efecto` enum('ENTRADA','SALIDA','TRANSFERENCIA','AJUSTE') NOT NULL,
  `afecta_costo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `tipos_movimiento`
--

INSERT INTO `tipos_movimiento` (`id_tipo_movimiento`, `codigo`, `nombre`, `efecto`, `afecta_costo`) VALUES
(1, 'COMPRA', 'Entrada por Compra', 'ENTRADA', 1),
(2, 'VENTA', 'Salida por Venta', 'SALIDA', 0),
(3, 'DEVOLUCION_VTA', 'Entrada por Devolución de Venta', 'ENTRADA', 0),
(4, 'DEVOLUCION_CMP', 'Salida por Devolución a Proveedor', 'SALIDA', 1),
(5, 'TRANSFERENCIA_SAL', 'Salida por Transferencia', 'TRANSFERENCIA', 0),
(6, 'TRANSFERENCIA_ENT', 'Entrada por Transferencia', 'TRANSFERENCIA', 0),
(7, 'AJUSTE_POS', 'Ajuste Positivo de Inventario', 'AJUSTE', 1),
(8, 'AJUSTE_NEG', 'Ajuste Negativo de Inventario', 'AJUSTE', 1),
(9, 'APERTURA', 'Apertura/Inventario Inicial', 'ENTRADA', 1),
(10, 'MERMA', 'Salida por Merma o Pérdida', 'SALIDA', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `transferencias`
--

CREATE TABLE `transferencias` (
  `id_transferencia` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `id_deposito_origen` int(11) NOT NULL,
  `id_deposito_destino` int(11) NOT NULL,
  `fecha_solicitud` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_envio` datetime DEFAULT NULL,
  `fecha_recepcion` datetime DEFAULT NULL,
  `estado` enum('SOLICITADA','EN_TRANSITO','RECIBIDA','PARCIAL','ANULADA') NOT NULL DEFAULT 'SOLICITADA',
  `id_usuario_solicita` int(11) DEFAULT NULL,
  `id_usuario_envia` int(11) DEFAULT NULL,
  `id_usuario_recibe` int(11) DEFAULT NULL,
  `observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `transferencia_detalle`
--

CREATE TABLE `transferencia_detalle` (
  `id_detalle` bigint(20) NOT NULL,
  `id_transferencia` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad_enviada` decimal(14,2) NOT NULL,
  `cantidad_recibida` decimal(14,2) DEFAULT 0.00,
  `observacion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `unidades_medida`
--

CREATE TABLE `unidades_medida` (
  `id_unidad` int(11) NOT NULL,
  `codigo` varchar(10) NOT NULL,
  `nombre` varchar(40) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `documento` varchar(20) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `id_rol` int(11) NOT NULL,
  `id_sucursal_default` int(11) DEFAULT NULL,
  `foto_url` varchar(255) DEFAULT NULL,
  `debe_cambiar_pass` tinyint(1) NOT NULL DEFAULT 1,
  `ultimo_login` datetime DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `username`, `password_hash`, `nombres`, `apellidos`, `documento`, `email`, `telefono`, `id_rol`, `id_sucursal_default`, `foto_url`, `debe_cambiar_pass`, `ultimo_login`, `activo`, `fecha_creacion`) VALUES
(1, 'admin', '$2b$10$4Y5AuM3I2pmNRRZgzN7R8eq4ODfoYvmKjUK3awQOgGrfC4zkUYWGu', 'Administrador', 'del Sistema', '00000000', 'admin@electrohogar.bo', '70000000', 1, 1, NULL, 0, '2026-05-31 12:01:36', 1, '2026-05-25 07:48:46'),
(2, 'vendedor1', '$2b$10$v9eKl1yIevok5lO/C8rsg.tGN/FS.QLUu6vCikf23PxBGqQPMEVjm', 'Vendedor', 'Uno', '11111111', 'vendedor1@electrohogar.bo', '71111111', 2, 1, NULL, 1, NULL, 1, '2026-05-25 07:48:46'),
(3, 'almacen1', '$2b$10$mWN4w1jnMGRo6qLd33L7N.Dpb5mNvxDul29YHzqYJ8IKYttatelQW', 'Almacenero', 'Uno', '22222222', 'almacen1@electrohogar.bo', '72222222', 3, 1, NULL, 1, NULL, 1, '2026-05-25 07:48:46');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario_sucursal`
--

CREATE TABLE `usuario_sucursal` (
  `id_usuario` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `id_venta` bigint(20) NOT NULL,
  `numero` varchar(30) NOT NULL,
  `numero_factura` varchar(40) DEFAULT NULL,
  `tipo_venta` enum('MAYOR','MENOR') NOT NULL DEFAULT 'MENOR',
  `id_sucursal` int(11) NOT NULL,
  `id_deposito` int(11) NOT NULL COMMENT 'Depósito desde donde se descarga el stock',
  `id_cliente` int(11) NOT NULL,
  `id_vendedor` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `id_moneda` int(11) NOT NULL,
  `tipo_cambio` decimal(18,6) DEFAULT 1.000000,
  `condicion_pago` enum('CONTADO','CREDITO') NOT NULL DEFAULT 'CONTADO',
  `dias_credito` int(11) DEFAULT 0,
  `fecha_vencimiento` date DEFAULT NULL,
  `subtotal` decimal(14,2) NOT NULL DEFAULT 0.00,
  `descuento_porc` decimal(5,2) DEFAULT 0.00,
  `descuento_monto` decimal(14,2) DEFAULT 0.00,
  `impuesto` decimal(14,2) DEFAULT 0.00,
  `total` decimal(14,2) NOT NULL DEFAULT 0.00,
  `saldo_pendiente` decimal(14,2) NOT NULL DEFAULT 0.00,
  `estado` enum('BORRADOR','EMITIDA','PAGADA','PARCIAL','ANULADA','DEVUELTA') NOT NULL DEFAULT 'BORRADOR',
  `requiere_entrega` tinyint(1) NOT NULL DEFAULT 0,
  `direccion_entrega` varchar(255) DEFAULT NULL,
  `fecha_entrega` datetime DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `venta_cuotas`
--

CREATE TABLE `venta_cuotas` (
  `id_cuota` bigint(20) NOT NULL,
  `id_venta` bigint(20) NOT NULL,
  `numero_cuota` int(11) NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `monto` decimal(14,2) NOT NULL,
  `monto_pagado` decimal(14,2) NOT NULL DEFAULT 0.00,
  `estado` enum('PENDIENTE','PARCIAL','PAGADA','VENCIDA') NOT NULL DEFAULT 'PENDIENTE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `venta_detalle`
--

CREATE TABLE `venta_detalle` (
  `id_detalle` bigint(20) NOT NULL,
  `id_venta` bigint(20) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad` decimal(14,2) NOT NULL,
  `precio_unitario` decimal(14,2) NOT NULL,
  `descuento_porc` decimal(5,2) DEFAULT 0.00,
  `descuento_monto` decimal(14,2) DEFAULT 0.00,
  `id_impuesto` int(11) DEFAULT NULL,
  `impuesto_porc` decimal(5,2) DEFAULT 0.00,
  `subtotal` decimal(14,2) NOT NULL,
  `costo_unitario` decimal(14,4) DEFAULT 0.0000 COMMENT 'Costo al momento de venta para rentabilidad',
  `bono_vendedor` decimal(14,2) DEFAULT 0.00,
  `id_promocion` int(11) DEFAULT NULL COMMENT 'Promoción aplicada al ítem',
  `id_combo` int(11) DEFAULT NULL COMMENT 'Combo asociado',
  `observacion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `ajustes_inventario`
--
ALTER TABLE `ajustes_inventario`
  ADD PRIMARY KEY (`id_ajuste`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `fk_ai_deposito` (`id_deposito`),
  ADD KEY `fk_ai_usuario` (`id_usuario`);

--
-- Indices de la tabla `ajuste_inventario_detalle`
--
ALTER TABLE `ajuste_inventario_detalle`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `fk_aid_ajuste` (`id_ajuste`),
  ADD KEY `fk_aid_producto` (`id_producto`);

--
-- Indices de la tabla `alertas_stock`
--
ALTER TABLE `alertas_stock`
  ADD PRIMARY KEY (`id_alerta`),
  ADD KEY `idx_alerta_pendiente` (`atendida`,`fecha_generada`),
  ADD KEY `fk_al_producto` (`id_producto`),
  ADD KEY `fk_al_deposito` (`id_deposito`),
  ADD KEY `fk_al_usuario` (`id_usuario_atendio`);

--
-- Indices de la tabla `arqueos_caja`
--
ALTER TABLE `arqueos_caja`
  ADD PRIMARY KEY (`id_arqueo`),
  ADD KEY `fk_arq_caja` (`id_caja`),
  ADD KEY `fk_arq_usuario` (`id_usuario`);

--
-- Indices de la tabla `auditoria`
--
ALTER TABLE `auditoria`
  ADD PRIMARY KEY (`id_auditoria`),
  ADD KEY `idx_aud_tabla` (`tabla`,`id_registro`),
  ADD KEY `idx_aud_fecha` (`fecha`),
  ADD KEY `fk_audit_usuario` (`id_usuario`);

--
-- Indices de la tabla `bancos`
--
ALTER TABLE `bancos`
  ADD PRIMARY KEY (`id_banco`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `cajas`
--
ALTER TABLE `cajas`
  ADD PRIMARY KEY (`id_caja`),
  ADD KEY `fk_caja_sucursal` (`id_sucursal`);

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id_categoria`),
  ADD KEY `fk_categoria_padre` (`id_categoria_padre`);

--
-- Indices de la tabla `categorias_gasto`
--
ALTER TABLE `categorias_gasto`
  ADD PRIMARY KEY (`id_categoria_gasto`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id_cliente`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `idx_cli_documento` (`documento`);

--
-- Indices de la tabla `cliente_direcciones`
--
ALTER TABLE `cliente_direcciones`
  ADD PRIMARY KEY (`id_direccion`),
  ADD KEY `fk_cd_cliente` (`id_cliente`);

--
-- Indices de la tabla `combos`
--
ALTER TABLE `combos`
  ADD PRIMARY KEY (`id_combo`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `combo_detalle`
--
ALTER TABLE `combo_detalle`
  ADD PRIMARY KEY (`id_combo_detalle`),
  ADD UNIQUE KEY `uq_combo_prod` (`id_combo`,`id_producto`),
  ADD KEY `fk_cmbd_producto` (`id_producto`);

--
-- Indices de la tabla `compras`
--
ALTER TABLE `compras`
  ADD PRIMARY KEY (`id_compra`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `idx_compras_estado` (`estado`),
  ADD KEY `idx_compras_fecha` (`fecha_pedido`),
  ADD KEY `fk_compra_deposito` (`id_deposito_destino`),
  ADD KEY `fk_compra_moneda` (`id_moneda`),
  ADD KEY `fk_compra_u_crea` (`id_usuario_crea`),
  ADD KEY `fk_compra_u_aprueba` (`id_usuario_aprueba`),
  ADD KEY `fk_compra_u_recibe` (`id_usuario_recibe`),
  ADD KEY `idx_compras_proveedor` (`id_proveedor`),
  ADD KEY `idx_compras_sucursal` (`id_sucursal`);

--
-- Indices de la tabla `compra_cuotas`
--
ALTER TABLE `compra_cuotas`
  ADD PRIMARY KEY (`id_cuota`),
  ADD KEY `fk_cc_compra` (`id_compra`);

--
-- Indices de la tabla `compra_detalle`
--
ALTER TABLE `compra_detalle`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `fk_cd_compra` (`id_compra`),
  ADD KEY `fk_cd_producto` (`id_producto`),
  ADD KEY `fk_cd_impuesto` (`id_impuesto`);

--
-- Indices de la tabla `configuracion_sistema`
--
ALTER TABLE `configuracion_sistema`
  ADD PRIMARY KEY (`id_config`),
  ADD UNIQUE KEY `clave` (`clave`);

--
-- Indices de la tabla `cotizaciones`
--
ALTER TABLE `cotizaciones`
  ADD PRIMARY KEY (`id_cotizacion`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `idx_cot_fecha` (`fecha`),
  ADD KEY `idx_cot_cliente` (`id_cliente`),
  ADD KEY `idx_cot_estado` (`estado`),
  ADD KEY `fk_cot_sucursal` (`id_sucursal`),
  ADD KEY `fk_cot_vendedor` (`id_vendedor`),
  ADD KEY `fk_cot_moneda` (`id_moneda`),
  ADD KEY `fk_cot_venta` (`id_venta_generada`);

--
-- Indices de la tabla `cotizacion_detalle`
--
ALTER TABLE `cotizacion_detalle`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `fk_cotd_cotizacion` (`id_cotizacion`),
  ADD KEY `fk_cotd_producto` (`id_producto`),
  ADD KEY `fk_cotd_impuesto` (`id_impuesto`);

--
-- Indices de la tabla `depositos`
--
ALTER TABLE `depositos`
  ADD PRIMARY KEY (`id_deposito`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `fk_deposito_sucursal` (`id_sucursal`);

--
-- Indices de la tabla `devoluciones_venta`
--
ALTER TABLE `devoluciones_venta`
  ADD PRIMARY KEY (`id_devolucion`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `fk_dv_venta` (`id_venta`),
  ADD KEY `fk_dv_deposito` (`id_deposito`),
  ADD KEY `fk_dv_usuario` (`id_usuario`);

--
-- Indices de la tabla `devolucion_venta_detalle`
--
ALTER TABLE `devolucion_venta_detalle`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `fk_dvd_devolucion` (`id_devolucion`),
  ADD KEY `fk_dvd_producto` (`id_producto`);

--
-- Indices de la tabla `empresas`
--
ALTER TABLE `empresas`
  ADD PRIMARY KEY (`id_empresa`),
  ADD UNIQUE KEY `nit` (`nit`);

--
-- Indices de la tabla `gastos`
--
ALTER TABLE `gastos`
  ADD PRIMARY KEY (`id_gasto`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `idx_gasto_fecha` (`fecha`),
  ADD KEY `fk_gasto_sucursal` (`id_sucursal`),
  ADD KEY `fk_gasto_proveedor` (`id_proveedor`),
  ADD KEY `fk_gasto_moneda` (`id_moneda`),
  ADD KEY `fk_gasto_usuario` (`id_usuario`),
  ADD KEY `idx_gastos_categoria` (`id_categoria_gasto`);

--
-- Indices de la tabla `impuestos`
--
ALTER TABLE `impuestos`
  ADD PRIMARY KEY (`id_impuesto`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `kardex`
--
ALTER TABLE `kardex`
  ADD PRIMARY KEY (`id_kardex`),
  ADD KEY `idx_kardex_producto` (`id_producto`,`fecha`),
  ADD KEY `idx_kardex_deposito` (`id_deposito`,`fecha`),
  ADD KEY `fk_kardex_tipomov` (`id_tipo_movimiento`),
  ADD KEY `fk_kardex_usuario` (`id_usuario`);

--
-- Indices de la tabla `marcas`
--
ALTER TABLE `marcas`
  ADD PRIMARY KEY (`id_marca`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `modulos`
--
ALTER TABLE `modulos`
  ADD PRIMARY KEY (`id_modulo`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `monedas`
--
ALTER TABLE `monedas`
  ADD PRIMARY KEY (`id_moneda`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `pagos_compra`
--
ALTER TABLE `pagos_compra`
  ADD PRIMARY KEY (`id_pago`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `fk_pgc_compra` (`id_compra`),
  ADD KEY `fk_pgc_cuota` (`id_cuota`),
  ADD KEY `fk_pgc_proveedor` (`id_proveedor`),
  ADD KEY `fk_pgc_sucursal` (`id_sucursal`),
  ADD KEY `fk_pgc_cuenta` (`id_cuenta_proveedor`),
  ADD KEY `fk_pgc_moneda` (`id_moneda`),
  ADD KEY `fk_pgc_usuario` (`id_usuario`),
  ADD KEY `idx_pagos_compra_fecha` (`fecha`);

--
-- Indices de la tabla `pagos_venta`
--
ALTER TABLE `pagos_venta`
  ADD PRIMARY KEY (`id_pago`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `fk_pv_venta` (`id_venta`),
  ADD KEY `fk_pv_cuota` (`id_cuota`),
  ADD KEY `fk_pv_cliente` (`id_cliente`),
  ADD KEY `fk_pv_sucursal` (`id_sucursal`),
  ADD KEY `fk_pv_moneda` (`id_moneda`),
  ADD KEY `fk_pv_usuario` (`id_usuario`),
  ADD KEY `idx_pagos_venta_fecha` (`fecha`);

--
-- Indices de la tabla `permisos`
--
ALTER TABLE `permisos`
  ADD PRIMARY KEY (`id_permiso`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `fk_permiso_modulo` (`id_modulo`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id_producto`),
  ADD UNIQUE KEY `codigo_interno` (`codigo_interno`),
  ADD UNIQUE KEY `codigo_barras` (`codigo_barras`),
  ADD KEY `idx_prod_modelo` (`modelo`),
  ADD KEY `idx_prod_marca` (`id_marca`),
  ADD KEY `idx_prod_estado` (`estado`),
  ADD KEY `fk_prod_categoria` (`id_categoria`),
  ADD KEY `fk_prod_unidad` (`id_unidad`),
  ADD KEY `fk_prod_moneda` (`id_moneda_costo`),
  ADD KEY `fk_prod_impuesto` (`id_impuesto_default`),
  ADD KEY `fk_prod_proveedor` (`id_proveedor_default`);

--
-- Indices de la tabla `producto_precio_historico`
--
ALTER TABLE `producto_precio_historico`
  ADD PRIMARY KEY (`id_historico`),
  ADD KEY `fk_pph_producto` (`id_producto`),
  ADD KEY `fk_pph_usuario` (`id_usuario`);

--
-- Indices de la tabla `promociones`
--
ALTER TABLE `promociones`
  ADD PRIMARY KEY (`id_promocion`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `idx_prom_vigencia` (`fecha_inicio`,`fecha_fin`,`activo`);

--
-- Indices de la tabla `promocion_producto`
--
ALTER TABLE `promocion_producto`
  ADD PRIMARY KEY (`id_promo_prod`),
  ADD KEY `idx_pp_promocion` (`id_promocion`),
  ADD KEY `idx_pp_producto` (`id_producto`),
  ADD KEY `idx_pp_categoria` (`id_categoria`),
  ADD KEY `idx_pp_marca` (`id_marca`);

--
-- Indices de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`id_proveedor`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `proveedor_contactos`
--
ALTER TABLE `proveedor_contactos`
  ADD PRIMARY KEY (`id_contacto`),
  ADD KEY `fk_pc_proveedor` (`id_proveedor`);

--
-- Indices de la tabla `proveedor_cuentas_pago`
--
ALTER TABLE `proveedor_cuentas_pago`
  ADD PRIMARY KEY (`id_cuenta`),
  ADD KEY `fk_pcp_proveedor` (`id_proveedor`),
  ADD KEY `fk_pcp_banco` (`id_banco`),
  ADD KEY `fk_pcp_moneda` (`id_moneda`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id_rol`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `rol_permiso`
--
ALTER TABLE `rol_permiso`
  ADD PRIMARY KEY (`id_rol`,`id_permiso`),
  ADD KEY `fk_rp_permiso` (`id_permiso`);

--
-- Indices de la tabla `sesiones`
--
ALTER TABLE `sesiones`
  ADD PRIMARY KEY (`id_sesion`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `fk_sesion_usuario` (`id_usuario`);

--
-- Indices de la tabla `stock`
--
ALTER TABLE `stock`
  ADD PRIMARY KEY (`id_stock`),
  ADD UNIQUE KEY `uq_stock` (`id_producto`,`id_deposito`),
  ADD KEY `fk_stock_deposito` (`id_deposito`);

--
-- Indices de la tabla `sucursales`
--
ALTER TABLE `sucursales`
  ADD PRIMARY KEY (`id_sucursal`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `fk_sucursal_empresa` (`id_empresa`);

--
-- Indices de la tabla `tipos_cambio`
--
ALTER TABLE `tipos_cambio`
  ADD PRIMARY KEY (`id_tipo_cambio`),
  ADD UNIQUE KEY `uq_cambio` (`id_moneda_origen`,`id_moneda_destino`,`fecha`),
  ADD KEY `fk_tc_destino` (`id_moneda_destino`);

--
-- Indices de la tabla `tipos_movimiento`
--
ALTER TABLE `tipos_movimiento`
  ADD PRIMARY KEY (`id_tipo_movimiento`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `transferencias`
--
ALTER TABLE `transferencias`
  ADD PRIMARY KEY (`id_transferencia`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD KEY `fk_tr_dep_origen` (`id_deposito_origen`),
  ADD KEY `fk_tr_dep_destino` (`id_deposito_destino`),
  ADD KEY `fk_tr_u_solicita` (`id_usuario_solicita`),
  ADD KEY `fk_tr_u_envia` (`id_usuario_envia`),
  ADD KEY `fk_tr_u_recibe` (`id_usuario_recibe`);

--
-- Indices de la tabla `transferencia_detalle`
--
ALTER TABLE `transferencia_detalle`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `fk_td_transferencia` (`id_transferencia`),
  ADD KEY `fk_td_producto` (`id_producto`);

--
-- Indices de la tabla `unidades_medida`
--
ALTER TABLE `unidades_medida`
  ADD PRIMARY KEY (`id_unidad`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_usuario_rol` (`id_rol`),
  ADD KEY `fk_usuario_sucursal` (`id_sucursal_default`);

--
-- Indices de la tabla `usuario_sucursal`
--
ALTER TABLE `usuario_sucursal`
  ADD PRIMARY KEY (`id_usuario`,`id_sucursal`),
  ADD KEY `fk_us_sucursal` (`id_sucursal`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`id_venta`),
  ADD UNIQUE KEY `numero` (`numero`),
  ADD UNIQUE KEY `numero_factura` (`numero_factura`),
  ADD KEY `idx_venta_fecha` (`fecha`),
  ADD KEY `idx_venta_cliente` (`id_cliente`),
  ADD KEY `idx_venta_estado` (`estado`),
  ADD KEY `fk_venta_deposito` (`id_deposito`),
  ADD KEY `fk_venta_moneda` (`id_moneda`),
  ADD KEY `idx_ventas_sucursal` (`id_sucursal`),
  ADD KEY `idx_ventas_vendedor` (`id_vendedor`);

--
-- Indices de la tabla `venta_cuotas`
--
ALTER TABLE `venta_cuotas`
  ADD PRIMARY KEY (`id_cuota`),
  ADD KEY `fk_vc_venta` (`id_venta`);

--
-- Indices de la tabla `venta_detalle`
--
ALTER TABLE `venta_detalle`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `fk_vd_venta` (`id_venta`),
  ADD KEY `fk_vd_producto` (`id_producto`),
  ADD KEY `fk_vd_impuesto` (`id_impuesto`),
  ADD KEY `fk_vd_promocion` (`id_promocion`),
  ADD KEY `fk_vd_combo` (`id_combo`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `ajustes_inventario`
--
ALTER TABLE `ajustes_inventario`
  MODIFY `id_ajuste` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `ajuste_inventario_detalle`
--
ALTER TABLE `ajuste_inventario_detalle`
  MODIFY `id_detalle` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `alertas_stock`
--
ALTER TABLE `alertas_stock`
  MODIFY `id_alerta` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `arqueos_caja`
--
ALTER TABLE `arqueos_caja`
  MODIFY `id_arqueo` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `auditoria`
--
ALTER TABLE `auditoria`
  MODIFY `id_auditoria` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `bancos`
--
ALTER TABLE `bancos`
  MODIFY `id_banco` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cajas`
--
ALTER TABLE `cajas`
  MODIFY `id_caja` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id_categoria` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `categorias_gasto`
--
ALTER TABLE `categorias_gasto`
  MODIFY `id_categoria_gasto` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id_cliente` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cliente_direcciones`
--
ALTER TABLE `cliente_direcciones`
  MODIFY `id_direccion` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `combos`
--
ALTER TABLE `combos`
  MODIFY `id_combo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `combo_detalle`
--
ALTER TABLE `combo_detalle`
  MODIFY `id_combo_detalle` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `compras`
--
ALTER TABLE `compras`
  MODIFY `id_compra` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `compra_cuotas`
--
ALTER TABLE `compra_cuotas`
  MODIFY `id_cuota` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `compra_detalle`
--
ALTER TABLE `compra_detalle`
  MODIFY `id_detalle` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `configuracion_sistema`
--
ALTER TABLE `configuracion_sistema`
  MODIFY `id_config` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cotizaciones`
--
ALTER TABLE `cotizaciones`
  MODIFY `id_cotizacion` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cotizacion_detalle`
--
ALTER TABLE `cotizacion_detalle`
  MODIFY `id_detalle` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `depositos`
--
ALTER TABLE `depositos`
  MODIFY `id_deposito` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `devoluciones_venta`
--
ALTER TABLE `devoluciones_venta`
  MODIFY `id_devolucion` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `devolucion_venta_detalle`
--
ALTER TABLE `devolucion_venta_detalle`
  MODIFY `id_detalle` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `empresas`
--
ALTER TABLE `empresas`
  MODIFY `id_empresa` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `gastos`
--
ALTER TABLE `gastos`
  MODIFY `id_gasto` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `impuestos`
--
ALTER TABLE `impuestos`
  MODIFY `id_impuesto` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `kardex`
--
ALTER TABLE `kardex`
  MODIFY `id_kardex` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `marcas`
--
ALTER TABLE `marcas`
  MODIFY `id_marca` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `modulos`
--
ALTER TABLE `modulos`
  MODIFY `id_modulo` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de la tabla `monedas`
--
ALTER TABLE `monedas`
  MODIFY `id_moneda` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pagos_compra`
--
ALTER TABLE `pagos_compra`
  MODIFY `id_pago` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pagos_venta`
--
ALTER TABLE `pagos_venta`
  MODIFY `id_pago` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `permisos`
--
ALTER TABLE `permisos`
  MODIFY `id_permiso` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=214;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `producto_precio_historico`
--
ALTER TABLE `producto_precio_historico`
  MODIFY `id_historico` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `promociones`
--
ALTER TABLE `promociones`
  MODIFY `id_promocion` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `promocion_producto`
--
ALTER TABLE `promocion_producto`
  MODIFY `id_promo_prod` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  MODIFY `id_proveedor` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `proveedor_contactos`
--
ALTER TABLE `proveedor_contactos`
  MODIFY `id_contacto` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `proveedor_cuentas_pago`
--
ALTER TABLE `proveedor_cuentas_pago`
  MODIFY `id_cuenta` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id_rol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `sesiones`
--
ALTER TABLE `sesiones`
  MODIFY `id_sesion` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `stock`
--
ALTER TABLE `stock`
  MODIFY `id_stock` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `sucursales`
--
ALTER TABLE `sucursales`
  MODIFY `id_sucursal` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `tipos_cambio`
--
ALTER TABLE `tipos_cambio`
  MODIFY `id_tipo_cambio` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `tipos_movimiento`
--
ALTER TABLE `tipos_movimiento`
  MODIFY `id_tipo_movimiento` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `transferencias`
--
ALTER TABLE `transferencias`
  MODIFY `id_transferencia` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `transferencia_detalle`
--
ALTER TABLE `transferencia_detalle`
  MODIFY `id_detalle` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `unidades_medida`
--
ALTER TABLE `unidades_medida`
  MODIFY `id_unidad` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id_venta` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `venta_cuotas`
--
ALTER TABLE `venta_cuotas`
  MODIFY `id_cuota` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `venta_detalle`
--
ALTER TABLE `venta_detalle`
  MODIFY `id_detalle` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `ajustes_inventario`
--
ALTER TABLE `ajustes_inventario`
  ADD CONSTRAINT `fk_ai_deposito` FOREIGN KEY (`id_deposito`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_ai_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `ajuste_inventario_detalle`
--
ALTER TABLE `ajuste_inventario_detalle`
  ADD CONSTRAINT `fk_aid_ajuste` FOREIGN KEY (`id_ajuste`) REFERENCES `ajustes_inventario` (`id_ajuste`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_aid_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `alertas_stock`
--
ALTER TABLE `alertas_stock`
  ADD CONSTRAINT `fk_al_deposito` FOREIGN KEY (`id_deposito`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_al_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `fk_al_usuario` FOREIGN KEY (`id_usuario_atendio`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `arqueos_caja`
--
ALTER TABLE `arqueos_caja`
  ADD CONSTRAINT `fk_arq_caja` FOREIGN KEY (`id_caja`) REFERENCES `cajas` (`id_caja`),
  ADD CONSTRAINT `fk_arq_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `auditoria`
--
ALTER TABLE `auditoria`
  ADD CONSTRAINT `fk_audit_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `cajas`
--
ALTER TABLE `cajas`
  ADD CONSTRAINT `fk_caja_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`);

--
-- Filtros para la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD CONSTRAINT `fk_categoria_padre` FOREIGN KEY (`id_categoria_padre`) REFERENCES `categorias` (`id_categoria`);

--
-- Filtros para la tabla `cliente_direcciones`
--
ALTER TABLE `cliente_direcciones`
  ADD CONSTRAINT `fk_cd_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`) ON DELETE CASCADE;

--
-- Filtros para la tabla `combo_detalle`
--
ALTER TABLE `combo_detalle`
  ADD CONSTRAINT `fk_cmbd_combo` FOREIGN KEY (`id_combo`) REFERENCES `combos` (`id_combo`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cmbd_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `compras`
--
ALTER TABLE `compras`
  ADD CONSTRAINT `fk_compra_deposito` FOREIGN KEY (`id_deposito_destino`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_compra_moneda` FOREIGN KEY (`id_moneda`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_compra_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`),
  ADD CONSTRAINT `fk_compra_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`),
  ADD CONSTRAINT `fk_compra_u_aprueba` FOREIGN KEY (`id_usuario_aprueba`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `fk_compra_u_crea` FOREIGN KEY (`id_usuario_crea`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `fk_compra_u_recibe` FOREIGN KEY (`id_usuario_recibe`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `compra_cuotas`
--
ALTER TABLE `compra_cuotas`
  ADD CONSTRAINT `fk_cc_compra` FOREIGN KEY (`id_compra`) REFERENCES `compras` (`id_compra`) ON DELETE CASCADE;

--
-- Filtros para la tabla `compra_detalle`
--
ALTER TABLE `compra_detalle`
  ADD CONSTRAINT `fk_cd_compra` FOREIGN KEY (`id_compra`) REFERENCES `compras` (`id_compra`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cd_impuesto` FOREIGN KEY (`id_impuesto`) REFERENCES `impuestos` (`id_impuesto`),
  ADD CONSTRAINT `fk_cd_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `cotizaciones`
--
ALTER TABLE `cotizaciones`
  ADD CONSTRAINT `fk_cot_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  ADD CONSTRAINT `fk_cot_moneda` FOREIGN KEY (`id_moneda`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_cot_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`),
  ADD CONSTRAINT `fk_cot_vendedor` FOREIGN KEY (`id_vendedor`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `fk_cot_venta` FOREIGN KEY (`id_venta_generada`) REFERENCES `ventas` (`id_venta`);

--
-- Filtros para la tabla `cotizacion_detalle`
--
ALTER TABLE `cotizacion_detalle`
  ADD CONSTRAINT `fk_cotd_cotizacion` FOREIGN KEY (`id_cotizacion`) REFERENCES `cotizaciones` (`id_cotizacion`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cotd_impuesto` FOREIGN KEY (`id_impuesto`) REFERENCES `impuestos` (`id_impuesto`),
  ADD CONSTRAINT `fk_cotd_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `depositos`
--
ALTER TABLE `depositos`
  ADD CONSTRAINT `fk_deposito_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`);

--
-- Filtros para la tabla `devoluciones_venta`
--
ALTER TABLE `devoluciones_venta`
  ADD CONSTRAINT `fk_dv_deposito` FOREIGN KEY (`id_deposito`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_dv_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `fk_dv_venta` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`);

--
-- Filtros para la tabla `devolucion_venta_detalle`
--
ALTER TABLE `devolucion_venta_detalle`
  ADD CONSTRAINT `fk_dvd_devolucion` FOREIGN KEY (`id_devolucion`) REFERENCES `devoluciones_venta` (`id_devolucion`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_dvd_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `gastos`
--
ALTER TABLE `gastos`
  ADD CONSTRAINT `fk_gasto_categoria` FOREIGN KEY (`id_categoria_gasto`) REFERENCES `categorias_gasto` (`id_categoria_gasto`),
  ADD CONSTRAINT `fk_gasto_moneda` FOREIGN KEY (`id_moneda`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_gasto_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`),
  ADD CONSTRAINT `fk_gasto_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`),
  ADD CONSTRAINT `fk_gasto_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `kardex`
--
ALTER TABLE `kardex`
  ADD CONSTRAINT `fk_kardex_deposito` FOREIGN KEY (`id_deposito`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_kardex_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `fk_kardex_tipomov` FOREIGN KEY (`id_tipo_movimiento`) REFERENCES `tipos_movimiento` (`id_tipo_movimiento`),
  ADD CONSTRAINT `fk_kardex_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `pagos_compra`
--
ALTER TABLE `pagos_compra`
  ADD CONSTRAINT `fk_pgc_compra` FOREIGN KEY (`id_compra`) REFERENCES `compras` (`id_compra`),
  ADD CONSTRAINT `fk_pgc_cuenta` FOREIGN KEY (`id_cuenta_proveedor`) REFERENCES `proveedor_cuentas_pago` (`id_cuenta`),
  ADD CONSTRAINT `fk_pgc_cuota` FOREIGN KEY (`id_cuota`) REFERENCES `compra_cuotas` (`id_cuota`),
  ADD CONSTRAINT `fk_pgc_moneda` FOREIGN KEY (`id_moneda`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_pgc_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`),
  ADD CONSTRAINT `fk_pgc_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`),
  ADD CONSTRAINT `fk_pgc_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `pagos_venta`
--
ALTER TABLE `pagos_venta`
  ADD CONSTRAINT `fk_pv_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  ADD CONSTRAINT `fk_pv_cuota` FOREIGN KEY (`id_cuota`) REFERENCES `venta_cuotas` (`id_cuota`),
  ADD CONSTRAINT `fk_pv_moneda` FOREIGN KEY (`id_moneda`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_pv_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`),
  ADD CONSTRAINT `fk_pv_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `fk_pv_venta` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`);

--
-- Filtros para la tabla `permisos`
--
ALTER TABLE `permisos`
  ADD CONSTRAINT `fk_permiso_modulo` FOREIGN KEY (`id_modulo`) REFERENCES `modulos` (`id_modulo`);

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `fk_prod_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id_categoria`),
  ADD CONSTRAINT `fk_prod_impuesto` FOREIGN KEY (`id_impuesto_default`) REFERENCES `impuestos` (`id_impuesto`),
  ADD CONSTRAINT `fk_prod_marca` FOREIGN KEY (`id_marca`) REFERENCES `marcas` (`id_marca`),
  ADD CONSTRAINT `fk_prod_moneda` FOREIGN KEY (`id_moneda_costo`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_prod_proveedor` FOREIGN KEY (`id_proveedor_default`) REFERENCES `proveedores` (`id_proveedor`),
  ADD CONSTRAINT `fk_prod_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades_medida` (`id_unidad`);

--
-- Filtros para la tabla `producto_precio_historico`
--
ALTER TABLE `producto_precio_historico`
  ADD CONSTRAINT `fk_pph_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `fk_pph_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `promocion_producto`
--
ALTER TABLE `promocion_producto`
  ADD CONSTRAINT `fk_pp_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id_categoria`),
  ADD CONSTRAINT `fk_pp_marca` FOREIGN KEY (`id_marca`) REFERENCES `marcas` (`id_marca`),
  ADD CONSTRAINT `fk_pp_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `fk_pp_promocion` FOREIGN KEY (`id_promocion`) REFERENCES `promociones` (`id_promocion`) ON DELETE CASCADE;

--
-- Filtros para la tabla `proveedor_contactos`
--
ALTER TABLE `proveedor_contactos`
  ADD CONSTRAINT `fk_pc_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`) ON DELETE CASCADE;

--
-- Filtros para la tabla `proveedor_cuentas_pago`
--
ALTER TABLE `proveedor_cuentas_pago`
  ADD CONSTRAINT `fk_pcp_banco` FOREIGN KEY (`id_banco`) REFERENCES `bancos` (`id_banco`),
  ADD CONSTRAINT `fk_pcp_moneda` FOREIGN KEY (`id_moneda`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_pcp_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`) ON DELETE CASCADE;

--
-- Filtros para la tabla `rol_permiso`
--
ALTER TABLE `rol_permiso`
  ADD CONSTRAINT `fk_rp_permiso` FOREIGN KEY (`id_permiso`) REFERENCES `permisos` (`id_permiso`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rp_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON DELETE CASCADE;

--
-- Filtros para la tabla `sesiones`
--
ALTER TABLE `sesiones`
  ADD CONSTRAINT `fk_sesion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `stock`
--
ALTER TABLE `stock`
  ADD CONSTRAINT `fk_stock_deposito` FOREIGN KEY (`id_deposito`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_stock_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `sucursales`
--
ALTER TABLE `sucursales`
  ADD CONSTRAINT `fk_sucursal_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresas` (`id_empresa`);

--
-- Filtros para la tabla `tipos_cambio`
--
ALTER TABLE `tipos_cambio`
  ADD CONSTRAINT `fk_tc_destino` FOREIGN KEY (`id_moneda_destino`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_tc_origen` FOREIGN KEY (`id_moneda_origen`) REFERENCES `monedas` (`id_moneda`);

--
-- Filtros para la tabla `transferencias`
--
ALTER TABLE `transferencias`
  ADD CONSTRAINT `fk_tr_dep_destino` FOREIGN KEY (`id_deposito_destino`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_tr_dep_origen` FOREIGN KEY (`id_deposito_origen`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_tr_u_envia` FOREIGN KEY (`id_usuario_envia`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `fk_tr_u_recibe` FOREIGN KEY (`id_usuario_recibe`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `fk_tr_u_solicita` FOREIGN KEY (`id_usuario_solicita`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `transferencia_detalle`
--
ALTER TABLE `transferencia_detalle`
  ADD CONSTRAINT `fk_td_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `fk_td_transferencia` FOREIGN KEY (`id_transferencia`) REFERENCES `transferencias` (`id_transferencia`) ON DELETE CASCADE;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`),
  ADD CONSTRAINT `fk_usuario_sucursal` FOREIGN KEY (`id_sucursal_default`) REFERENCES `sucursales` (`id_sucursal`);

--
-- Filtros para la tabla `usuario_sucursal`
--
ALTER TABLE `usuario_sucursal`
  ADD CONSTRAINT `fk_us_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_us_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE;

--
-- Filtros para la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `fk_venta_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  ADD CONSTRAINT `fk_venta_deposito` FOREIGN KEY (`id_deposito`) REFERENCES `depositos` (`id_deposito`),
  ADD CONSTRAINT `fk_venta_moneda` FOREIGN KEY (`id_moneda`) REFERENCES `monedas` (`id_moneda`),
  ADD CONSTRAINT `fk_venta_sucursal` FOREIGN KEY (`id_sucursal`) REFERENCES `sucursales` (`id_sucursal`),
  ADD CONSTRAINT `fk_venta_vendedor` FOREIGN KEY (`id_vendedor`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `venta_cuotas`
--
ALTER TABLE `venta_cuotas`
  ADD CONSTRAINT `fk_vc_venta` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`) ON DELETE CASCADE;

--
-- Filtros para la tabla `venta_detalle`
--
ALTER TABLE `venta_detalle`
  ADD CONSTRAINT `fk_vd_combo` FOREIGN KEY (`id_combo`) REFERENCES `combos` (`id_combo`),
  ADD CONSTRAINT `fk_vd_impuesto` FOREIGN KEY (`id_impuesto`) REFERENCES `impuestos` (`id_impuesto`),
  ADD CONSTRAINT `fk_vd_producto` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `fk_vd_promocion` FOREIGN KEY (`id_promocion`) REFERENCES `promociones` (`id_promocion`),
  ADD CONSTRAINT `fk_vd_venta` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
