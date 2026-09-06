# CommunityHub v1.0 — Production Deployment Guide

This guide details the complete procedure for deploying **CommunityHub v1.0** to **AWS EC2** / Linux VPS instances for the target environments defined in the RFP:
- **Test Environment:** `commhub.heconf.net`
- **Production Customer Environment:** `hapacgh.org`

---

## 1. System Architecture Overview

```
                          Internet / Users
                                 │
                   HTTPS (Port 443) / HTTP (Port 80)
                                 ▼
                     ┌───────────────────────┐
                     │   Nginx Reverse Proxy │ (HTTP/2, SSL Termination via Let's Encrypt)
                     └───────────┬───────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
     ┌───────────────────────┐       ┌───────────────────────┐
     │ Static Frontend Build │       │ Node.js Backend API   │
     │ (/var/www/dist)       │       │ (PM2 Cluster :5000)   │
     └───────────────────────┘       └───────────┬───────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │  Supabase PostgreSQL  │
                                     │  (Auth, RLS, Storage) │
                                     └───────────────────────┘
```

---

## 2. Server Prerequisites

### Recommended Server Specs
- **Cloud Provider:** AWS EC2 (or equivalent VPS)
- **Instance Type:** `t3.medium` (2 vCPU, 4GB RAM, 40GB+ gp3 EBS SSD)
- **Operating System:** Ubuntu 22.04 LTS (Jammy Jellyfish)
- **Firewall (AWS Security Groups / UFW):**
  - Port `22` (SSH - restricted to administrator IP)
  - Port `80` (HTTP - open to world)
  - Port `443` (HTTPS - open to world)

### Base System Installation
Connect via SSH and update packages:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx certbot python3-certbot-nginx
```

Configure UFW Firewall:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Install Node.js 20 LTS & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

---

## 3. Repository Setup

Clone the repository into the standard web root:
```bash
sudo mkdir -p /var/www/communityhub
sudo chown -R $USER:$USER /var/www/communityhub
git clone <YOUR_GIT_REPOSITORY_URL> /var/www/communityhub
cd /var/www/communityhub
```

---

## 4. Environment Configuration

### Backend Environment Variables
Navigate to `projects/backend` and initialize `.env`:
```bash
cd /var/www/communityhub/projects/backend
cp .env.production.example .env
nano .env
```
Populate the required credentials:
```ini
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
JWT_SECRET=<secure_random_64_char_secret>
FRONTEND_URL=https://hapacgh.org
ADDITIONAL_ORIGINS=https://commhub.heconf.net,https://www.hapacgh.org
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<smtp_email>
SMTP_PASS=<smtp_app_password>
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
TWILIO_PHONE_NUMBER=<number>
```

### Frontend Environment Variables
Navigate to `projects/frontend` and initialize `.env`:
```bash
cd /var/www/communityhub/projects/frontend
cp .env.production.example .env
nano .env
```
```ini
VITE_API_BASE_URL=/api
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<public_anon_key>
```

---

## 5. Build and Start Services

### Install Dependencies & Build
```bash
# Backend
cd /var/www/communityhub/projects/backend
npm ci --omit=dev

# Frontend
cd /var/www/communityhub/projects/frontend
npm ci
npm run build
```

### Launch Backend via PM2
```bash
cd /var/www/communityhub/projects/deployment
pm2 start ecosystem.config.cjs --env production
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
```

---

## 6. Nginx & SSL Setup

1. Copy the Nginx configuration file:
   ```bash
   sudo cp /var/www/communityhub/projects/deployment/nginx/commhub.conf /etc/nginx/sites-available/commhub.conf
   sudo ln -s /etc/nginx/sites-available/commhub.conf /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   ```

2. Test Nginx syntax:
   ```bash
   sudo nginx -t
   ```

3. Provision SSL certificates with Certbot:
   ```bash
   # For Test Instance:
   sudo certbot --nginx -d commhub.heconf.net

   # For Production Instance:
   sudo certbot --nginx -d hapacgh.org -d www.hapacgh.org
   ```

4. Reload Nginx:
   ```bash
   sudo systemctl reload nginx
   ```

---

## 7. Automated Deployments

An automated deployment script is located at `projects/deployment/scripts/deploy.sh`.

To deploy future updates:
```bash
# Deploy to test instance
/var/www/communityhub/projects/deployment/scripts/deploy.sh test

# Deploy to production instance
/var/www/communityhub/projects/deployment/scripts/deploy.sh production
```

---

## 8. Verification & Diagnostics

Verify system health:
```bash
curl -i https://hapacgh.org/api/health
```
Expected response:
```json
{
  "ok": true,
  "service": "CommunityHub API",
  "version": "1.0.0",
  "environment": "production",
  "uptimeSeconds": 45,
  "timestamp": "2026-09-06T12:00:00.000Z",
  "database": { "status": "connected" }
}
```
