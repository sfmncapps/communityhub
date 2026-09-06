/**
 * PM2 Ecosystem Configuration (RFP §10 Production Infrastructure)
 * Manages zero-downtime clustering, automated restarts, and log rotation.
 */

module.exports = {
  apps: [
    {
      name: "commhub-backend",
      script: "../backend/server.js",
      cwd: __dirname,
      instances: 2,
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      env_test: {
        NODE_ENV: "test",
        PORT: 5000,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/pm2/commhub-error.log",
      out_file: "/var/log/pm2/commhub-out.log",
      merge_logs: true,
    },
  ],
};
