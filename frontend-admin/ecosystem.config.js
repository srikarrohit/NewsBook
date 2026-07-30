module.exports = {
  apps: [{
    name: 'newsbook-admin-web',
    script: 'serve',
    args: '-s dist -l 4173',
    cwd: '/home/ec2-user/newsbook-admin-web',
    interpreter: 'none',
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
  }],
};
