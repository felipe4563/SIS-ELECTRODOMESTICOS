const mysql = require('mysql2');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// El servidor de MySQL puede correr con reloj en UTC (contenedor/VPS) mientras
// el negocio opera en hora de Bolivia (UTC-4). Sin esto, NOW()/CURTIME()/
// CURDATE() usados en asistencia, cierres de caja, etc. quedan 4h adelantados.
db.on('connection', (connection) => {
  connection.query("SET time_zone = '-04:00'");
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error al conectar a MySQL:', err.message);
  } else {
    console.log('✅ Conexión exitosa a la base de datos MySQL');
    connection.release();
  }
});

console.log('✅ Conectado a la base de datos MySQL');
module.exports = db;
