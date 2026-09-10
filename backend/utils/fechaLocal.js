// Bolivia es UTC-4 fijo (sin horario de verano). Las funciones que calculan
// "ahora" NO pueden confiar en la zona horaria del proceso de Node: si corre
// en un contenedor Docker sin TZ configurado (el caso por defecto de la
// imagen node:alpine), el contenedor arranca en UTC sin importar la del
// host/VPS, aunque el host ya esté bien puesto en America/La_Paz. Por eso acá
// se calcula el offset fijo a mano a partir del instante absoluto
// (Date.now()), en vez de usar los getters locales de Date
// (getFullYear/getMonth/...) que sí dependen de esa configuración.
//
// `soloFechaLocal` y `fechaHoraSegundosLocal`, en cambio, siguen usando los
// getters locales normales porque se usan para reformatear un Date que YA
// vino de mysql2 (representa una fecha/hora leída de la base) — ahí lo que
// importa es reproducir los mismos dígitos con los que ese mismo proceso lo
// interpretó al leerlo, no recalcular la hora de Bolivia desde cero.

const OFFSET_BOLIVIA_MS = 4 * 60 * 60 * 1000; // UTC-4

const pad = n => String(n).padStart(2, '0');

// Instante `ms` (epoch) desplazado para que sus getters UTC*() den directamente
// el año/mes/día/hora de pared de Bolivia, sin importar la TZ del proceso.
const _bolivia = (ms) => new Date(ms - OFFSET_BOLIVIA_MS);
const _fechaDesde = (ms) => {
  const b = _bolivia(ms);
  return `${b.getUTCFullYear()}-${pad(b.getUTCMonth() + 1)}-${pad(b.getUTCDate())}`;
};

// "YYYY-MM-DD" a partir de los componentes LOCALES de `d` (tal como los
// interpretó el proceso actual, ej. un Date que viene de mysql2). No usar
// para "ahora mismo" — para eso está hoyLocal().
const soloFechaLocal = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Fecha de HOY en Bolivia, "YYYY-MM-DD" — calculada desde el instante
// absoluto, sin depender de la zona horaria del proceso/contenedor.
const hoyLocal = () => _fechaDesde(Date.now());

// Fecha de hace `n` días en Bolivia, "YYYY-MM-DD".
const fechaHaceDiasLocal = (n) => _fechaDesde(Date.now() - n * 86400000);

// Fecha dentro de `n` días en Bolivia, "YYYY-MM-DD" (vencimientos, plazos).
const fechaEnDiasLocal = (n) => _fechaDesde(Date.now() + n * 86400000);

// Primer día del mes actual en Bolivia, "YYYY-MM-DD".
const primerDiaMesLocal = () => {
  const b = _bolivia(Date.now());
  return `${b.getUTCFullYear()}-${pad(b.getUTCMonth() + 1)}-01`;
};

// "YYYY-MM-DD HH:MM:SS" a partir de los componentes LOCALES de `d` (un Date
// que viene de mysql2) — para volcar un DATETIME/TIMESTAMP a texto plano
// (ej. backups SQL) reproduciendo los mismos dígitos, sin recalcular nada.
const fechaHoraSegundosLocal = (d = new Date()) =>
  `${soloFechaLocal(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

module.exports = {
  soloFechaLocal, hoyLocal, fechaHaceDiasLocal, fechaEnDiasLocal,
  primerDiaMesLocal, fechaHoraSegundosLocal,
};
