module.exports = {
  apps: [
    {
      name: 'smt-backend',
      script: 'dist/server.js',
      cwd: './smt-pro-catalog/backend',
      interpreter: 'node',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'smt-web',
      script: 'C:/Users/Karwan Store/Documents/SMT cataloge/smt_web_server.js',
      interpreter: 'node',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
