module.exports = {
  apps: [{
    name: 'newsbook-backend',
    script: 'java',
    args: '-jar app.jar',
    cwd: '/home/ec2-user/newsbook-backend',
    interpreter: 'none',
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
  }],
};
