# TikTok Live Overlay

Overlay profesional untuk TikTok Live Studio dengan fitur-fitur lengkap untuk meningkatkan pengalaman streaming.

## 🎯 Fitur

- ✅ **Follower Alert** - Notifikasi ketika ada follower baru
- ✅ **Gift/Donation Alert** - Alert untuk gift dan donation
- ✅ **Live Chat Overlay** - Tampilkan chat langsung di overlay
- ✅ **Viewer Count** - Menampilkan jumlah penonton
- ✅ **Stream Timer** - Timer durasi streaming
- ✅ **Custom Banner** - Banner kustom untuk event khusus
- ✅ **Floating Photos** - Foto bulat yang bergerak secara random
- ✅ **TikTok Live Integration** - Integrasi langsung dengan TikTok Live menggunakan [TikTok-Live-Connector](https://github.com/zerodytrash/TikTok-Live-Connector)
- ✅ **Animasi Modern** - Animasi smooth dan menarik
- ✅ **Responsive Design** - Disesuaikan untuk resolusi 1920x1080

## 📋 Persyaratan

- OBS Studio atau software streaming lainnya
- Browser modern (Chrome, Firefox, Edge)
- TikTok Live Studio
- Node.js (v14+) untuk webhook server (opsional)

## 🚀 Cara Menggunakan

### 1. Setup di OBS Studio

1. Buka OBS Studio
2. Tambahkan **Browser Source** baru
3. Set URL ke file `index.html` (gunakan path lokal atau host di web server)
4. Set width: **1920** dan height: **1080**
5. Centang **Shutdown source when not visible** (opsional)
6. Klik OK

### 2. Konfigurasi

Anda dapat mengkustomisasi overlay dengan mengedit file `script.js` atau menggunakan API yang tersedia.

### 3. Integrasi dengan TikTok API

Untuk integrasi dengan TikTok Live API, gunakan method `triggerEvent()`:

```javascript
// Contoh penggunaan
window.tiktokOverlay.triggerEvent('follower', { username: 'JohnDoe' });
window.tiktokOverlay.triggerEvent('gift', { username: 'JaneDoe', giftName: 'Rose', quantity: 10 });
window.tiktokOverlay.triggerEvent('chat', { username: 'User123', message: 'Halo semua!' });
window.tiktokOverlay.triggerEvent('viewer', { count: 150 });
window.tiktokOverlay.triggerEvent('banner', { text: 'Terima Kasih!' });
```

## 🎮 Testing

Untuk testing overlay, buka `index.html?demo=true` di browser. Anda juga bisa menggunakan keyboard shortcuts:

- **F** - Trigger follower alert
- **G** - Trigger gift alert
- **C** - Tambahkan chat message
- **B** - Tampilkan custom banner

## 🎨 Kustomisasi

### Mengubah Warna

Edit file `styles.css` untuk mengubah skema warna:

```css
/* Alert gradient */
.alert-box {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Gift alert gradient */
.alert-box.gift-box {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}
```

### Mengubah Posisi

Edit posisi elemen di `styles.css`:

```css
.alert-container {
    top: 50px;    /* Jarak dari atas */
    right: 50px;  /* Jarak dari kanan */
}

.chat-overlay {
    bottom: 50px; /* Jarak dari bawah */
    left: 50px;   /* Jarak dari kiri */
}
```

### Mengubah Durasi Alert

Edit timeout di `script.js`:

```javascript
setTimeout(() => {
    alert.classList.remove('show');
}, 5000); // Ubah 5000 menjadi durasi yang diinginkan (dalam milidetik)
```

## 📁 Struktur File

```
overlay-tiktok-live/
├── index.html      # File HTML utama
├── styles.css      # Styling dan animasi
├── script.js       # Logic dan event handling
└── README.md       # Dokumentasi
```

## 🔧 Integrasi dengan TikTok Live

### Setup TikTok Live Connector

1. Install dependencies:
```bash
npm install
```

2. Start webhook server:
```bash
npm start
```

3. Overlay akan otomatis terhubung ke webhook server via Server-Sent Events

### Connect ke TikTok Live

**Cara 1: Menggunakan Control Room (Disarankan)**
1. Buka Control Room di browser: `http://localhost:3000/control-room`
2. Buat atau pilih user
3. Klik tombol **Start** untuk menghubungkan ke TikTok Live
4. Masukkan username TikTok (tanpa @) dan klik Connect

**Cara 2: Menggunakan API Endpoint**
```bash
# Untuk user tertentu
curl -X POST http://localhost:3000/api/users/USERNAME/tiktok/connect \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "optional", "ttTargetIdc": "optional"}'
```

**Catatan**: Koneksi TikTok Live sekarang dilakukan manual via Control Room. Tidak perlu lagi menggunakan environment variables seperti `TIKTOK_USERNAME`.

### Event yang Didukung

Semua event dari TikTok Live akan otomatis muncul di overlay:
- 💬 Chat messages
- 🎁 Gifts/donations
- 👋 Followers
- ❤️ Likes (trigger floating photo)
- 👁️ Viewer count updates
- 📤 Shares
- ⭐ Subscriptions

Lihat `WEBHOOK.md` untuk dokumentasi lengkap integrasi TikTok Live.

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

