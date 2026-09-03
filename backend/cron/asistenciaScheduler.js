const cron = require('node-cron');

async function ejecutarGeneracionFaltas() {
  try {
    const { generarFaltasDelDia } = require('../controllers/asistencia.Controller');
    const { total, fecha } = await generarFaltasDelDia();
    console.log(`✅ Faltas generadas para ${fecha}: ${total}`);
  } catch (e) {
    console.error('❌ Error al generar faltas automáticas:', e.message);
  }
}

function iniciar() {
  // Todos los días a las 00:30, genera las faltas del día anterior
  cron.schedule('30 0 * * *', ejecutarGeneracionFaltas, { timezone: 'America/La_Paz' });
  console.log('⏰ Generación de faltas automática programada: diario a las 00:30');
}

module.exports = { iniciar };
