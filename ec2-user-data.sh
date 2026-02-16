#!/bin/bash

################################################################################
# EC2 User Data Bootstrap Script for Anonymous Messaging Platform
# Target OS: Amazon Linux 2023
# This script installs Node.js, PM2, Nginx, Git, and configures the environment
################################################################################

# Log all output
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "=================================="
echo "Starting EC2 Bootstrap"
echo "=================================="

# Update system packages
echo "Updating system packages..."
dnf update -y

# Install Git
echo "Installing Git..."
dnf install -y git

# Install Node.js 20.x (LTS) directly from NodeSource
echo "Installing Node.js LTS..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# Verify Node.js installation
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install PM2 globally
echo "Installing PM2..."
npm install -g pm2

# Install Nginx
echo "Installing Nginx..."
dnf install -y nginx

# Install build tools (required for better-sqlite3)
echo "Installing build tools..."
dnf groupinstall -y "Development Tools"
dnf install -y python3

# Configure Nginx as reverse proxy
echo "Configuring Nginx..."
cat > /etc/nginx/conf.d/app.conf << 'EOF'
upstream nodejs_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name _;

    # Increase timeouts for WebSocket connections
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;

    # Client body size limit
    client_max_body_size 10M;

    location / {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Disable buffering for real-time features
        proxy_buffering off;
    }

    # Socket.io specific path
    location /socket.io/ {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        proxy_buffering off;
    }
}
EOF

# Enable and start Nginx
echo "Starting Nginx..."
systemctl enable nginx
systemctl start nginx

# Configure firewall (if firewalld is active)
if systemctl is-active --quiet firewalld; then
    echo "Configuring firewall..."
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
fi

# Setup PM2 startup script for ec2-user
echo "Configuring PM2 startup..."
su - ec2-user -c "pm2 startup systemd -u ec2-user --hp /home/ec2-user" | grep -v "^PM2" | bash

echo ""
echo "=================================="
echo "Bootstrap Complete!"
echo "=================================="
echo ""
echo "Installed components:"
echo "- Node.js $(node --version)"
echo "- npm $(npm --version)"
echo "- PM2 $(pm2 --version)"
echo "- Nginx"
echo "- Git"
echo "- Build tools (gcc, python3, etc.)"
echo ""
echo "Services running:"
echo "- Nginx on port 80"
echo ""
echo "Ready for application deployment!"
echo ""
