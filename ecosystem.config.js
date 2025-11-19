module.exports = {
  apps: [{
    name: 'tiktok-overlay',
    script: 'src/backend/webhook-server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M',
    watch: false,
    // Restart jika file berubah (untuk development, set true)
    // watch: ['src', 'config'],
    // ignore_watch: ['node_modules', 'logs']
  }]
};

