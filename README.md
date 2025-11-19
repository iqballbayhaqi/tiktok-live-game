# TikTok Live Overlay

Overlay profesional untuk TikTok Live Studio dengan fitur-fitur lengkap untuk meningkatkan pengalaman streaming.

## 📁 Struktur Project

```
overlay-tiktok-live/
├── src/
│   ├── frontend/          # File frontend overlay
│   │   ├── pages/         # Halaman HTML
│   │   │   ├── index.html        # HTML utama overlay
│   │   │   ├── landing.html      # Halaman landing
│   │   │   └── control-room.html # Control room dashboard
│   │   ├── css/           # File stylesheet
│   │   │   ├── styles.css        # Styling dan animasi overlay
│   │   │   └── control-room.css  # Styling control room
│   │   └── js/            # File JavaScript
│   │       ├── script.js         # Logic dan event handling overlay
│   │       └── control-room.js   # Logic control room
│   └── backend/           # File backend server
│       ├── webhook-server.js      # Express server untuk webhook
│       └── tiktok-connector.js    # TikTok Live connector integration
├── config/                # File konfigurasi
│   ├── config.json        # Konfigurasi utama (JSON)
│   ├── config.js          # Konfigurasi (JavaScript)
│   ├── config-loader.js   # Loader untuk config di browser
│   ├── users.json         # Daftar users
│   └── users/             # Konfigurasi per user
│       └── *.json          # File konfigurasi user
├── tests/                 # File test
│   ├── test-webhook.js            # Test webhook endpoints
│   ├── test-with-server.js        # Test dengan auto-start server
│   └── tiktok-connector-test.js   # Test TikTok connector
├── docs/                  # Dokumentasi
│   ├── README.md          # Dokumentasi utama (detail)
│   ├── WEBHOOK.md         # Dokumentasi webhook API
│   └── VPS-INSTALLATION.md # Panduan instalasi VPS dengan HTTPS
├── .env.example           # Contoh environment variables
├── ecosystem.config.js    # Konfigurasi PM2 untuk production
├── nodemon.json           # Konfigurasi nodemon
├── package.json           # Dependencies dan scripts
└── node_modules/         # Dependencies (auto-generated)
```

## 🎯 Fitur

- ✅ **Follower Alert** - Notifikasi ketika ada follower baru
- ✅ **Gift/Donation Alert** - Alert untuk gift dan donation
- ✅ **Live Chat Overlay** - Tampilkan chat langsung di overlay
- ✅ **Viewer Count** - Menampilkan jumlah penonton
- ✅ **Stream Timer** - Timer durasi streaming
- ✅ **Custom Banner** - Banner kustom untuk event khusus
- ✅ **Floating Photos** - Foto bulat yang bergerak secara random
- ✅ **TikTok Live Integration** - Integrasi langsung dengan TikTok Live
- ✅ **Animasi Modern** - Animasi smooth dan menarik
- ✅ **Responsive Design** - Disesuaikan untuk resolusi 1920x1080

## 📋 Persyaratan

- OBS Studio atau software streaming lainnya
- Browser modern (Chrome, Firefox, Edge)
- TikTok Live Studio
- Node.js (v14+) untuk webhook server (opsional)

## 🚀 Cara Menggunakan

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` ke `.env` di root project dan sesuaikan:

```bash
cp .env.example .env
```

### 3. Setup di OBS Studio

1. Buka OBS Studio
2. Tambahkan **Browser Source** baru
3. Set URL ke `http://localhost:3000` (jika server running) atau path lokal ke `src/frontend/pages/index.html`
4. Set width: **1920** dan height: **1080**
5. Centang **Shutdown source when not visible** (opsional)
6. Klik OK

### 4. Start Server

```bash
npm start
```

Server akan berjalan di `http://localhost:3000` dan overlay akan otomatis terbuka di browser.

## 🔧 Scripts

- `npm start` - Start server dan buka overlay di browser (production mode)
- `npm run start:server` - Start server saja
- `npm run dev` - Start server dengan auto-reload (development mode, tidak auto-open browser)
- `npm run dev:open` - Start server dengan auto-reload dan auto-open browser
- `npm test` - Run test webhook (server harus running terlebih dahulu)
- `npm run test:with-server` - Run test dengan auto-start server (recommended)

### 🛠️ Development Mode

Gunakan `npm run dev` atau `npm run dev:open` untuk development. Server akan otomatis restart ketika ada perubahan di:
- File backend (`src/backend/*.js`)
- File frontend (`src/frontend/*.js`, `*.html`, `*.css`)
- File konfigurasi (`config/*.js`, `config/*.json`)
- Environment variables (`.env`)

**Tidak perlu kill dan restart manual lagi!** 🎉

### 🧪 Testing

Ada dua cara untuk menjalankan test:

1. **Test dengan server yang sudah running** (jika server sudah jalan):
   ```bash
   npm test
   ```

2. **Test dengan auto-start server** (recommended - otomatis start, test, lalu stop):
   ```bash
   npm run test:with-server
   ```

## 📖 Dokumentasi Lengkap

- **Dokumentasi Detail**: Lihat `docs/README.md` untuk dokumentasi lengkap
- **Webhook API**: Lihat `docs/WEBHOOK.md` untuk dokumentasi API webhook
- **Instalasi VPS dengan HTTPS**: Lihat `docs/VPS-INSTALLATION.md` untuk panduan instalasi di VPS dengan konfigurasi HTTPS

## 📝 Catatan

- Overlay dirancang untuk resolusi 1920x1080 (Full HD)
- Pastikan browser source di OBS menggunakan hardware acceleration untuk performa optimal
- Untuk production, hapus keyboard shortcuts di `script.js`

## 🤝 Kontribusi

Silakan buat issue atau pull request jika ingin berkontribusi!

## 📄 Lisensi

Project ini bebas digunakan untuk keperluan pribadi maupun komersial.

---

**Selamat Streaming! 🎉**
