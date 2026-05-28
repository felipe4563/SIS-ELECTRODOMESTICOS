require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

// ── Rutas ─────────────────────────────────────────────────────────────────
const authRoutes          = require('./routes/auth.Routes');
const empresaRoutes       = require('./routes/empresa.Routes');
const sucursalesRoutes    = require('./routes/sucursales.Routes');
const depositosRoutes     = require('./routes/depositos.Routes');
const monedasRoutes       = require('./routes/monedas.Routes');
const tiposCambioRoutes   = require('./routes/tiposCambio.Routes');
const configuracionRoutes = require('./routes/configuracion.Routes');
const bancosRoutes        = require('./routes/bancos.Routes');
const impuestosRoutes     = require('./routes/impuestos.Routes');
const rolesRoutes         = require('./routes/roles.Routes');
const usuariosRoutes      = require('./routes/usuarios.Routes');
const marcasRoutes        = require('./routes/marcas.Routes');
const categoriasRoutes    = require('./routes/categorias.Routes');
const unidadesRoutes      = require('./routes/unidades.Routes');
const proveedoresRoutes   = require('./routes/proveedores.Routes');
const clientesRoutes      = require('./routes/clientes.Routes');
const productosRoutes     = require('./routes/productos.Routes');
const inventarioRoutes    = require('./routes/inventario.Routes');
const comprasRoutes       = require('./routes/compras.Routes');
const ventasRoutes        = require('./routes/ventas.Routes');
const cajaRoutes          = require('./routes/caja.Routes');
const reportesRoutes      = require('./routes/reportes.Routes');
const auditoriaRoutes     = require('./routes/auditoria.Routes');
const permisosRoutes      = require('./routes/permisos.Routes');
const combosRoutes        = require('./routes/combos.Routes');
const promocionesRoutes   = require('./routes/promociones.Routes');
const cotizacionesRoutes  = require('./routes/cotizaciones.Routes');
const cobrosRoutes        = require('./routes/cobros.Routes');
const gastosRoutes        = require('./routes/gastos.Routes');
const herramientasRoutes  = require('./routes/herramientas.Routes');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: [
    'https://megaelectra.rusoft.dev',
    'http://localhost:5173',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rutas API ─────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/empresa',       empresaRoutes);
app.use('/api/sucursales',    sucursalesRoutes);
app.use('/api/depositos',     depositosRoutes);
app.use('/api/monedas',       monedasRoutes);
app.use('/api/tipos-cambio',  tiposCambioRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/bancos',        bancosRoutes);
app.use('/api/impuestos',     impuestosRoutes);
app.use('/api/roles',         rolesRoutes);
app.use('/api/usuarios',      usuariosRoutes);
app.use('/api/marcas',        marcasRoutes);
app.use('/api/categorias',    categoriasRoutes);
app.use('/api/unidades',      unidadesRoutes);
app.use('/api/proveedores',   proveedoresRoutes);
app.use('/api/clientes',      clientesRoutes);
app.use('/api/productos',     productosRoutes);
app.use('/api/inventario',    inventarioRoutes);
app.use('/api/compras',       comprasRoutes);
app.use('/api/ventas',        ventasRoutes);
app.use('/api/caja',          cajaRoutes);
app.use('/api/reportes',      reportesRoutes);
app.use('/api/auditoria',     auditoriaRoutes);
app.use('/api/permisos',      permisosRoutes);
app.use('/api/combos',        combosRoutes);
app.use('/api/promociones',   promocionesRoutes);
app.use('/api/cotizaciones',  cotizacionesRoutes);
app.use('/api/cobros',        cobrosRoutes);
app.use('/api/gastos',        gastosRoutes);
app.use('/api/herramientas',  herramientasRoutes);


// ── Servidor ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Conectado a la base de datos MySQL`);
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});