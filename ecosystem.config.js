/**
 * PM2 Ecosystem — Portal Sabaki Technologies
 *
 * Producción:   pm2 start ecosystem.config.js
 * Desarrollo:   pm2 start ecosystem.config.js --env development
 * Monitoreo:    pm2 monit
 * Logs:         pm2 logs sabaki-portal
 * Status:       pm2 status
 */
module.exports = {
  apps: [
    {
      name: "sabaki-portal",
      script: "node_modules/next/dist/bin/next",
      args: "start --port 4000",           // modo producción (requiere build previo)
      cwd: __dirname,

      // ── Variables de entorno ─────────────────────────────────────────────
      env: {
        NODE_ENV: "production",
        PORT: 4000,
        DATABASE_URL: "file:./dev.db",
        NEXTAUTH_URL: "http://localhost:4000",
        NEXTAUTH_SECRET: "sabaki-super-secret-key-change-in-production",
        NODE_OPTIONS: "--max-old-space-size=1536",   // 1.5 GB en producción (mucho menos que dev)
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 4000,
        DATABASE_URL: "file:./dev.db",
        NEXTAUTH_URL: "http://localhost:4000",
        NEXTAUTH_SECRET: "sabaki-super-secret-key-change-in-production",
        NODE_OPTIONS: "--max-old-space-size=2048",
      },

      // ── Reinicio automático ──────────────────────────────────────────────
      autorestart: true,             // reinicia si el proceso muere
      max_restarts: 10,              // máximo 10 reinicios seguidos
      min_uptime: "30s",             // si muere antes de 30s, cuenta como crash
      restart_delay: 3000,           // espera 3 segundos entre reinicios
      exp_backoff_restart_delay: 100,// backoff exponencial entre reinicios

      // ── Memoria ─────────────────────────────────────────────────────────
      max_memory_restart: "1400M",   // reinicia automáticamente si supera 1.4 GB

      // ── Logs de PM2 ─────────────────────────────────────────────────────
      out_file: "logs/pm2-out.log",
      error_file: "logs/pm2-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",

      // ── Ignorar cambios en estas carpetas ───────────────────────────────
      watch: false,                  // NO usar watch en producción
    },
  ],
};
