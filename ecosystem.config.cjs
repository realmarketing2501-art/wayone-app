module.exports = {
  apps: [
    {
      name: 'wayone-api',
      script: '/var/www/wayone/backend/dist/index.js',
      cwd: '/var/www/wayone/backend',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      time: true,
    },
  ],
};
