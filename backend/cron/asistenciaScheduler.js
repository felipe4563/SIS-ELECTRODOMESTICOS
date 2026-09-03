const cron = require('node-cron');

async function ejecutarGeneracionFaltas() {
  try {
    const { generarFaltasDelDia } = require('../controllers/asistencia.Controller');
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const fechaISO = ayer.toISOString().slice(0, 10);

    const total = await generarFaltasDelDia(fechaISO);
    console.log(`✅ Faltas generadas para ${fechaISO}: ${total}`);
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
