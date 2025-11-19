# 📦 Panduan Instalasi di VPS dengan HTTPS

Dokumentasi lengkap untuk menginstall TikTok Live Overlay di VPS (Ubuntu/Debian) dengan konfigurasi HTTPS menggunakan Let's Encrypt.

## 📋 Daftar Isi

1. [Persyaratan Sistem](#persyaratan-sistem)
2. [Persiapan VPS](#persiapan-vps)
3. [Instalasi Node.js](#instalasi-nodejs)
4. [Setup Aplikasi](#setup-aplikasi)
5. [Konfigurasi Nginx sebagai Reverse Proxy](#konfigurasi-nginx-sebagai-reverse-proxy)
6. [Setup SSL/HTTPS dengan Let's Encrypt](#setup-sslhttps-dengan-lets-encrypt)
7. [Setup PM2 untuk Process Management](#setup-pm2-untuk-process-management)
8. [Konfigurasi Firewall](#konfigurasi-firewall)
9. [Verifikasi Instalasi](#verifikasi-instalasi)
10. [Troubleshooting](#troubleshooting)

---

## 📋 Persyaratan Sistem

- **OS**: Ubuntu 20.04+ atau Debian 11+
- **RAM**: Minimal 512MB (disarankan 1GB+)
- **Storage**: Minimal 5GB
- **Domain**: Domain yang sudah diarahkan ke IP VPS (untuk HTTPS)
- **Akses**: Root atau user dengan sudo privileges

---

## 🚀 Persiapan VPS

### 1. Update Sistem

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Install Dependencies Dasar

```bash
sudo apt install -y curl wget git build-essential
```

### 3. Buat User Baru (Opsional, Disarankan)

```bash
# Buat user baru
sudo adduser overlay-user

# Tambahkan ke sudo group
sudo usermod -aG sudo overlay-user

# Switch ke user baru
su - overlay-user
```

---

## 📦 Instalasi Node.js

### Metode 1: Menggunakan NodeSource (Disarankan)

```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi instalasi
node --version
npm --version
```

### Metode 2: Menggunakan NVM (Node Version Manager)

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# Verifikasi
node --version
npm --version
```

---

## 📥 Setup Aplikasi

### 1. Clone atau Upload Project

**Opsi A: Clone dari Git (jika menggunakan Git)**

```bash
cd ~
git clone <repository-url> overlay-tiktok-live
cd overlay-tiktok-live
```

**Opsi B: Upload via SCP/SFTP**

```bash
# Dari komputer lokal (Windows PowerShell atau Linux/Mac)
scp -r overlay-tiktok-live user@your-vps-ip:~/
```

### 2. Install Dependencies

```bash
cd ~/overlay-tiktok-live
npm install
```

### 3. Buat File Environment Variables

```bash
# Buat file .env
nano .env
```

Tambahkan konfigurasi berikut (sesuaikan dengan kebutuhan):

```env
# Port aplikasi (default: 3000)
PORT=3000

# Environment
NODE_ENV=production

# Debug mode (opsional, untuk development/debugging)
# DEBUG=true
```

**Catatan**: 
- Koneksi TikTok Live sekarang dilakukan manual via Control Room, tidak lagi menggunakan environment variables
- Untuk menghubungkan ke TikTok Live, gunakan fitur di Control Room (`/control-room`) setelah aplikasi berjalan

Simpan dengan `Ctrl+O`, lalu `Enter`, dan `Ctrl+X`.

### 4. Test Aplikasi

```bash
# Test apakah aplikasi berjalan
npm run start:server
```

Tekan `Ctrl+C` untuk stop. Jika berjalan tanpa error, lanjut ke langkah berikutnya.

---

## 🔧 Konfigurasi Nginx sebagai Reverse Proxy

### 1. Install Nginx

```bash
sudo apt install -y nginx
```

### 2. Buat Konfigurasi Nginx

```bash
sudo nano /etc/nginx/sites-available/overlay-tiktok-live
```

Tambahkan konfigurasi berikut (ganti `yourdomain.com` dengan domain Anda):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Log files
    access_log /var/log/nginx/overlay-access.log;
    error_log /var/log/nginx/overlay-error.log;

    # Proxy ke aplikasi Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout untuk Server-Sent Events
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # WebSocket support (jika diperlukan)
    location /events {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

Simpan file dengan `Ctrl+O`, `Enter`, dan `Ctrl+X`.

### 3. Aktifkan Konfigurasi

```bash
# Buat symbolic link
sudo ln -s /etc/nginx/sites-available/overlay-tiktok-live /etc/nginx/sites-enabled/

# Test konfigurasi Nginx
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 4. Verifikasi Nginx

```bash
# Cek status Nginx
sudo systemctl status nginx

# Test dari browser atau curl
curl http://yourdomain.com/health
```

---

## 🔒 Setup SSL/HTTPS dengan Let's Encrypt

### 1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Generate SSL Certificate

```bash
# Generate certificate (ganti yourdomain.com dengan domain Anda)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot akan:
- Meminta email untuk notifikasi
- Meminta persetujuan Terms of Service
- Meminta izin untuk redirect HTTP ke HTTPS
- Otomatis mengupdate konfigurasi Nginx

### 3. Verifikasi Auto-Renewal

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Cek cron job (seharusnya sudah otomatis dibuat)
sudo systemctl status certbot.timer
```

### 4. Konfigurasi Nginx Setelah SSL

Setelah SSL terpasang, konfigurasi Nginx akan otomatis diupdate oleh Certbot. File konfigurasi akan terlihat seperti ini:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Configuration (otomatis ditambahkan oleh Certbot)
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Log files
    access_log /var/log/nginx/overlay-access.log;
    error_log /var/log/nginx/overlay-error.log;

    # Proxy ke aplikasi Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout untuk Server-Sent Events
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    location /events {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

### 5. Restart Nginx

```bash
sudo systemctl restart nginx
```

---

## 🔄 Setup PM2 untuk Process Management

PM2 memastikan aplikasi tetap berjalan dan restart otomatis jika crash.

### 1. Install PM2

```bash
sudo npm install -g pm2
```

### 2. Buat File Ecosystem untuk PM2

```bash
cd ~/overlay-tiktok-live
nano ecosystem.config.js
```

Tambahkan konfigurasi berikut:

```javascript
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
    watch: false
  }]
};
```

### 3. Buat Folder Logs

```bash
mkdir -p ~/overlay-tiktok-live/logs
```

### 4. Start Aplikasi dengan PM2

```bash
cd ~/overlay-tiktok-live
pm2 start ecosystem.config.js
```

### 5. Setup PM2 Startup Script

```bash
# Generate startup script
pm2 startup

# Simpan konfigurasi PM2
pm2 save
```

Perintah `pm2 startup` akan memberikan perintah yang harus dijalankan sebagai root. Jalankan perintah yang diberikan.

### 6. Perintah PM2 yang Berguna

```bash
# Lihat status aplikasi
pm2 status

# Lihat logs
pm2 logs tiktok-overlay

# Restart aplikasi
pm2 restart tiktok-overlay

# Stop aplikasi
pm2 stop tiktok-overlay

# Hapus dari PM2
pm2 delete tiktok-overlay

# Monitor resource
pm2 monit
```

---

## 🔥 Konfigurasi Firewall

### 1. Setup UFW (Uncomplicated Firewall)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (PENTING! Jangan skip ini)
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Cek status
sudo ufw status
```

### 2. (Opsional) Jika Menggunakan Firewall Lain

**Firewalld (CentOS/RHEL):**
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

**iptables:**
```bash
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables-save
```

---

## ✅ Verifikasi Instalasi

### 1. Cek Status Aplikasi

```bash
# Cek PM2
pm2 status

# Cek Nginx
sudo systemctl status nginx

# Cek aplikasi via curl
curl https://yourdomain.com/health
```

### 2. Test Endpoint

```bash
# Health check
curl https://yourdomain.com/health

# Test endpoint
curl https://yourdomain.com/test

# Control room
curl https://yourdomain.com/control-room
```

### 3. Akses dari Browser

Buka browser dan akses:
- **Landing Page**: `https://yourdomain.com`
- **Control Room**: `https://yourdomain.com/control-room`
- **Health Check**: `https://yourdomain.com/health`

### 4. Test Overlay dengan Live Code

Jika sudah membuat user, akses overlay dengan:
```
https://yourdomain.com/live/YOUR_LIVE_CODE
```

---

## 🔧 Troubleshooting

### Aplikasi Tidak Berjalan

```bash
# Cek logs PM2
pm2 logs tiktok-overlay

# Cek apakah port 3000 sudah digunakan
sudo lsof -i :3000

# Restart PM2
pm2 restart tiktok-overlay
```

### Nginx Error

```bash
# Cek konfigurasi Nginx
sudo nginx -t

# Cek logs Nginx
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Error

```bash
# Cek status certificate
sudo certbot certificates

# Renew certificate manual
sudo certbot renew

# Cek auto-renewal
sudo systemctl status certbot.timer
```

### Port 3000 Tidak Bisa Diakses

```bash
# Cek apakah aplikasi berjalan
pm2 status

# Cek firewall
sudo ufw status

# Test koneksi lokal
curl http://localhost:3000/health
```

### Server-Sent Events (SSE) Tidak Berfungsi

Pastikan konfigurasi Nginx memiliki:
```nginx
proxy_read_timeout 86400;
proxy_send_timeout 86400;
```

Dan header yang benar:
```nginx
proxy_set_header Connection 'upgrade';
proxy_set_header Upgrade $http_upgrade;
```

### Aplikasi Crash Terus Menerus

```bash
# Cek logs untuk error
pm2 logs tiktok-overlay --lines 100

# Cek memory usage
pm2 monit

# Restart dengan memory limit
pm2 restart tiktok-overlay --update-env
```

### Domain Tidak Terhubung

1. **Cek DNS**: Pastikan A record domain mengarah ke IP VPS
   ```bash
   dig yourdomain.com
   nslookup yourdomain.com
   ```

2. **Cek Nginx**: Pastikan `server_name` di konfigurasi Nginx sesuai dengan domain

3. **Cek Firewall**: Pastikan port 80 dan 443 terbuka

---

## 📝 Catatan Penting

1. **Backup**: Selalu backup file konfigurasi dan data penting
   ```bash
   # Backup config
   tar -czf backup-$(date +%Y%m%d).tar.gz ~/overlay-tiktok-live/config/
   ```

2. **Update Berkala**: Update sistem dan dependencies secara berkala
   ```bash
   sudo apt update && sudo apt upgrade -y
   npm update
   ```

3. **Monitoring**: Gunakan PM2 monitoring atau setup monitoring eksternal
   ```bash
   pm2 install pm2-logrotate
   ```

4. **Security**: 
   - Jangan expose port 3000 langsung ke internet
   - Gunakan HTTPS selalu
   - Update sistem secara berkala
   - Gunakan strong password untuk SSH

5. **Performance**:
   - Monitor memory usage dengan `pm2 monit`
   - Sesuaikan `max_memory_restart` di ecosystem.config.js jika perlu
   - Pertimbangkan menggunakan CDN untuk static files

---

## 🎉 Selesai!

Aplikasi TikTok Live Overlay Anda sekarang sudah berjalan di VPS dengan HTTPS!

**URL Akses:**
- **Landing Page**: `https://yourdomain.com`
- **Control Room**: `https://yourdomain.com/control-room`
- **Overlay (dengan live code)**: `https://yourdomain.com/live/YOUR_LIVE_CODE`

**Perintah Berguna:**
```bash
# Restart aplikasi
pm2 restart tiktok-overlay

# Lihat logs
pm2 logs tiktok-overlay

# Restart Nginx
sudo systemctl restart nginx

# Cek status semua service
pm2 status && sudo systemctl status nginx
```

Selamat streaming! 🎬✨

