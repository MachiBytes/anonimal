# EC2 Deployment Guide

This guide walks you through deploying the Anonymous Messaging Platform on an AWS EC2 instance using User Data for automated bootstrap.

## Prerequisites

1. AWS Account with EC2 access
2. Security group configured to allow:
   - Port 22 (SSH)
   - Port 80 (HTTP)
   - Port 443 (HTTPS) - optional for future SSL setup

## Launch EC2 Instance with User Data

### 1. Create EC2 Instance

When launching your EC2 instance:

1. Choose **Amazon Linux 2023** AMI
2. Select instance type (t2.micro for testing, t2.small+ for production)
3. Configure security group with ports 22, 80, 443
4. In **Advanced Details** → **User Data**, paste the contents of `ec2-user-data.sh`

The user data script will automatically install:
- Node.js 20.x LTS
- PM2 (process manager)
- Nginx (reverse proxy with WebSocket support)
- Git
- Build tools (for native dependencies like better-sqlite3)

### 2. Wait for Bootstrap to Complete

After instance launch, wait 3-5 minutes for the user data script to complete. You can check progress:

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
sudo tail -f /var/log/user-data.log
```

### 3. Clone Your Repository

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
cd ~
git clone <your-repository-url> app
cd app
```

### 4. Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

Update the following values in `.env`:

```bash
# Database
DB_PATH=./data/database.sqlite

# Server
PORT=3000
NODE_ENV=production
CORS_ORIGIN=*

# AWS Cognito
COGNITO_USER_POOL_ID=us-east-1_TPP8O3hv8
COGNITO_CLIENT_ID=7bogt18iuc9oihg3puvbcmksr1
COGNITO_CLIENT_SECRET=4bbhgcgkhj6h4h7op15p4hia53l1pso3ci6ahfj573nr7dvth2v
COGNITO_REGION=us-east-1
COGNITO_HOSTED_UI_DOMAIN=us-east-1tpp8o3hv8.auth.us-east-1.amazoncognito.com

# Application URLs (replace with your EC2 public IP)
NEXT_PUBLIC_API_URL=http://YOUR_EC2_PUBLIC_IP
NEXT_PUBLIC_WS_URL=http://YOUR_EC2_PUBLIC_IP
```

### 5. Install Dependencies

```bash
npm install
```

### 6. Initialize Database

```bash
npm run db:migrate
```

This will create the SQLite database at `./data/database.sqlite` with the required schema.

### 7. Build the Application

```bash
npm run build
```

### 8. Start with PM2

Create PM2 ecosystem file:

```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'anonymous-messaging',
    script: 'server.ts',
    interpreter: 'node',
    interpreter_args: '--import tsx',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
```

Create logs directory and start:

```bash
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
```

### 9. Verify Deployment

Check PM2 status:
```bash
pm2 status
pm2 logs anonymous-messaging
```

Check Nginx status:
```bash
sudo systemctl status nginx
```

Access your application:
```
http://YOUR_EC2_PUBLIC_IP
```

## Architecture

```
Internet → Nginx (Port 80) → Node.js/Next.js (Port 3000) → SQLite Database
                           ↓
                      Socket.io (WebSocket)
```

- **Nginx**: Reverse proxy handling HTTP requests and WebSocket upgrades
- **PM2**: Process manager keeping Node.js app running
- **Next.js**: Server-side rendering and API routes
- **Socket.io**: Real-time messaging via WebSockets
- **SQLite**: Local database for channels and messages

## Common Operations

### View Application Logs

```bash
pm2 logs anonymous-messaging
```

### Restart Application

```bash
pm2 restart anonymous-messaging
```

### Stop Application

```bash
pm2 stop anonymous-messaging
```

### Update Application

```bash
cd ~/app
git pull
npm install
npm run build
pm2 restart anonymous-messaging
```

### Monitor Resources

```bash
pm2 monit
```

### Check Nginx Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Updating Cognito Redirect URIs

After deployment, update your AWS Cognito app client settings:

1. Go to AWS Cognito Console
2. Select your User Pool
3. Go to App Integration → App clients
4. Edit your app client
5. Add callback URLs:
   - `http://YOUR_EC2_PUBLIC_IP/auth/callback`
   - `http://YOUR_EC2_PUBLIC_IP/api/auth/cognito-callback`
6. Add sign-out URL:
   - `http://YOUR_EC2_PUBLIC_IP`

## Security Considerations

### Current Setup (Development/Testing)
- HTTP only (no SSL)
- Accessing via EC2 public IP
- CORS set to `*` (allow all origins)

### Production Recommendations
1. **Use HTTPS**: Set up SSL certificate (Let's Encrypt or AWS Certificate Manager)
2. **Use Domain Name**: Point a domain to your EC2 instance
3. **Restrict CORS**: Set specific allowed origins
4. **Enable Security Groups**: Restrict SSH access to your IP
5. **Regular Updates**: Keep system and dependencies updated
6. **Database Backups**: Implement SQLite backup strategy
7. **Environment Variables**: Use AWS Secrets Manager for sensitive data
8. **Monitoring**: Set up CloudWatch for logs and metrics

## Troubleshooting

### Application Won't Start

Check PM2 logs:
```bash
pm2 logs anonymous-messaging --lines 100
```

Common issues:
- Missing `.env` file
- Database not initialized (run `npm run db:migrate`)
- Port 3000 already in use
- Missing dependencies (run `npm install`)

### Can't Access Application

1. Check EC2 Security Group allows port 80
2. Check Nginx is running: `sudo systemctl status nginx`
3. Check application is running: `pm2 status`
4. Test Nginx config: `sudo nginx -t`
5. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

### WebSocket Connection Issues

1. Verify Nginx WebSocket configuration is correct
2. Check Socket.io logs in PM2
3. Ensure CORS settings allow your origin
4. Test with browser console: `io.connect('http://YOUR_EC2_PUBLIC_IP')`

### Database Errors

1. Check database file exists: `ls -la ~/app/data/database.sqlite`
2. Check permissions: `chmod 644 ~/app/data/database.sqlite`
3. Re-run migration: `npm run db:migrate`

### Build Errors

If `better-sqlite3` fails to build:
```bash
# Ensure build tools are installed
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y python3

# Rebuild native modules
npm rebuild better-sqlite3
```

## Performance Tuning

### PM2 Cluster Mode (Optional)

For better performance, you can run multiple instances:

Edit `ecosystem.config.js`:
```javascript
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster'
```

Then restart:
```bash
pm2 restart ecosystem.config.js
```

### Nginx Optimization

For high traffic, consider adding to `/etc/nginx/nginx.conf`:
```nginx
worker_processes auto;
worker_connections 1024;
```

## Backup Strategy

### Database Backup

Create a backup script:
```bash
#!/bin/bash
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
cp ~/app/data/database.sqlite $BACKUP_DIR/database_$DATE.sqlite
# Keep only last 7 days
find $BACKUP_DIR -name "database_*.sqlite" -mtime +7 -delete
```

Add to crontab for daily backups:
```bash
crontab -e
# Add: 0 2 * * * /home/ec2-user/backup.sh
```

## Next Steps

1. Set up a domain name and point it to your EC2 Elastic IP
2. Configure SSL/TLS with Let's Encrypt
3. Set up CloudWatch monitoring
4. Implement automated backups
5. Configure log rotation
6. Set up CI/CD pipeline for automated deployments

## Support

For issues specific to:
- AWS EC2: Check AWS documentation
- Nginx: Check `/var/log/nginx/error.log`
- Application: Check `pm2 logs anonymous-messaging`
- Database: Check SQLite file permissions and migration status
