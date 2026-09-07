// `Date#toISOString()` siempre convierte a UTC antes de formatear. En Bolivia
// (UTC-4), entre las 20:00 y 23:59 hora local ya es "mañana" en UTC, así que
// `new Date().toISOString().slice(0, 10)` calculaba la fecha equivocada durante
// esas horas (fechas por defecto de filtros, "vencido"/"vigente", nombres de
// archivo, etc). Estas funciones arman el string a partir de los componentes
// locales del Date, sin pasar por UTC.

const pad = n => String(n).padStart(2, '0');

// "YYYY-MM-DD" en hora local.
export const soloFechaLocal = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Fecha de hoy, "YYYY-MM-DD" en hora local.
export const hoyLocal = () => soloFechaLocal(new Date());

// Fecha de hace `n` días, "YYYY-MM-DD" en hora local.
export const fechaHaceDiasLocal = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return soloFechaLocal(d);
};

// Primer día del mes que contiene `d` (o el mes actual), "YYYY-MM-DD".
export const primerDiaMesLocal = (d = new Date()) =>
  soloFechaLocal(new Date(d.getFullYear(), d.getMonth(), 1));

// "YYYY-MM-DDTHH:MM" en hora local, para inputs <input type="datetime-local">.
export const fechaHoraLocal = (d = new Date()) =>
  `${soloFechaLocal(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
