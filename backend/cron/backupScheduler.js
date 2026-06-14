const cron = require('node-cron');
const path = require('path');
const fs   = require('fs');

const BACKUP_DIR  = path.join(__dirname, '..', 'backups');
const MAX_BACKUPS = 10;

async function ejecutarBackupAuto() {
  try {
    const { generarSQLDump } = require('../controllers/herramientas.Controller');
    const ts       = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup_auto_${ts}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    const sql = await generarSQLDump();
    fs.writeFileSync(filepath, sql, 'utf8');

    const viejos = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup_auto_') && f.endsWith('.sql'))
      .sort()
      .reverse()
      .slice(MAX_BACKUPS);
    for (const f of viejos) fs.unlinkSync(path.join(BACKUP_DIR, f));

    console.log(`✅ Backup automático creado: ${filename}`);
  } catch (e) {
    console.error('❌ Error en backup automático:', e.message);
  }
}

function iniciar() {
  // Todos los días a las 02:00, conserva solo los últimos 10
  cron.schedule('0 2 * * *', ejecutarBackupAuto, { timezone: 'America/La_Paz' });
  console.log('⏰ Backup automático programado: diario a las 02:00');
}

module.exports = { iniciar };
