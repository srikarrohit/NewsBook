#!/bin/bash
# One-time setup of the Newsbook app server (Amazon Linux 2023, arm64, t4g.nano).
# Passed as EC2 user-data at launch, so it runs as root on first boot. Safe to re-run.
#
# Nothing is ever compiled here (512 MB RAM): GitHub Actions builds the Rust binary and
# the admin web bundle and copies the finished files over (.github/workflows/deploy.yml).
set -euxo pipefail

# 1 GB swap so short spikes (dnf, certbot's pip install) can't OOM-kill the backend.
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=1024
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
fi

dnf install -y nginx python3 augeas-libs rsync
systemctl enable --now nginx

# certbot (AL2023 doesn't package it) plus a twice-daily renewal timer.
if [ ! -x /opt/certbot/bin/certbot ]; then
  python3 -m venv /opt/certbot
  /opt/certbot/bin/pip install --upgrade pip
  /opt/certbot/bin/pip install certbot certbot-nginx
  ln -sf /opt/certbot/bin/certbot /usr/bin/certbot
fi
cat > /etc/systemd/system/certbot-renew.service <<'EOF'
[Unit]
Description=Renew Let's Encrypt certificates

[Service]
Type=oneshot
ExecStart=/opt/certbot/bin/certbot renew -q --deploy-hook "systemctl reload nginx"
EOF
cat > /etc/systemd/system/certbot-renew.timer <<'EOF'
[Unit]
Description=Renew Let's Encrypt certificates twice a day

[Timer]
OnCalendar=*-*-* 03,15:00:00
RandomizedDelaySec=1h
Persistent=true

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now certbot-renew.timer

# App directories; the deploy workflow fills them.
install -d -o ec2-user -g ec2-user /home/ec2-user/newsbook-backend
install -d -m 755 /var/www/newsbook-site /var/www/newsbook-admin

# Config dir: backend.env (DB/S3/Gemini secrets) is written by each deploy from GitHub
# secrets; rds-ca.pem lets the backend verify the RDS server's TLS certificate.
install -d -m 750 -o root -g ec2-user /etc/newsbook
curl -sfL -o /etc/newsbook/rds-ca.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
chmod 644 /etc/newsbook/rds-ca.pem

# Server clock in UTC, same as the old Java server, so post publish times line up.
timedatectl set-timezone UTC
