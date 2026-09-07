// `Date#toISOString()` siempre convierte a UTC antes de formatear. El proceso
// de Node corre en hora local (Bolivia, UTC-4), así que entre las 20:00 y
// 23:59 hora local ya es "mañana" en UTC — usar toISOString().slice(0,10)
// para fechas de negocio (vencimientos de cuotas, vigencia de promos/combos,
// cortes de reportes "hoy") corría esas fechas un día en esa franja horaria.
// Estas funciones arman el string a partir de los componentes locales del
// Date, sin pasar por UTC.

const pad = n => String(n).padStart(2, '0');

// "YYYY-MM-DD" en hora local.
const soloFechaLocal = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Fecha de hoy, "YYYY-MM-DD" en hora local.
const hoyLocal = () => soloFechaLocal(new Date());

// Fecha de hace `n` días, "YYYY-MM-DD" en hora local.
const fechaHaceDiasLocal = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return soloFechaLocal(d);
};

// Fecha dentro de `n` días, "YYYY-MM-DD" en hora local (vencimientos, plazos).
const fechaEnDiasLocal = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return soloFechaLocal(d);
};

// Primer día del mes que contiene `d` (o el mes actual), "YYYY-MM-DD".
const primerDiaMesLocal = (d = new Date()) =>
  soloFechaLocal(new Date(d.getFullYear(), d.getMonth(), 1));

// "YYYY-MM-DD HH:MM:SS" en hora local — para volcar un DATETIME/TIMESTAMP a
// texto plano (ej. backups SQL) sin correrlo a UTC.
const fechaHoraSegundosLocal = (d = new Date()) =>
  `${soloFechaLocal(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

module.exports = {
  soloFechaLocal, hoyLocal, fechaHaceDiasLocal, fechaEnDiasLocal,
  primerDiaMesLocal, fechaHoraSegundosLocal,
};
