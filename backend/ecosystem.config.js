module.exports = {
  apps: [
    {
      name: 'megaelectra-api',
      script: './index.js',
      cwd: __dirname,

      instances: 1,          // Aumenta a 'max' si quieres cluster mode
      exec_mode: 'fork',

      // Variables de entorno
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },

      // Reinicio automático
      watch: false,           // No observar archivos en producción
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 10,

      // Logs
      error_file: './logs/pm2-error.log',
      out_file:   './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Tiempo de gracia para restart suave
      kill_timeout: 5000,
      listen_timeout: 8000,
    },
  ],
};
