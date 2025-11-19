# Webhook Setup Guide

Panduan lengkap untuk setup dan menggunakan webhook server untuk TikTok Live Overlay.

## 📋 Prasyarat

- Node.js (v14 atau lebih baru)
- npm atau yarn

## 🚀 Instalasi

1. Install dependencies:
```bash
npm install
```

2. Start webhook server:
```bash
npm start
```

Atau untuk development dengan auto-reload:
```bash
npm run dev
```

Server akan berjalan di `http://localhost:3000`

**Catatan:** Koneksi TikTok Live sekarang dilakukan manual via Control Room (`/control-room`). Tidak perlu lagi menggunakan environment variables seperti `TIKTOK_USERNAME`. Untuk menghubungkan ke TikTok Live, buka Control Room dan gunakan fitur connect di sana.

## 📡 Endpoint Webhook

### 1. Follower Event
**POST** `/webhook/follower`

Mengirim notifikasi ketika ada follower baru.

**Request Body:**
```json
{
  "username": "JohnDoe",
  "avatarUrl": "https://example.com/avatar.jpg" // optional
}
```

**Contoh cURL:**
```bash
curl -X POST http://localhost:3000/webhook/follower \
  -H "Content-Type: application/json" \
  -d '{"username": "JohnDoe", "avatarUrl": "https://example.com/avatar.jpg"}'
```

### 2. Gift Event
**POST** `/webhook/gift`

Mengirim notifikasi ketika ada gift/donation.

**Request Body:**
```json
{
  "username": "GiftGiver",
  "giftName": "Rose",
  "quantity": 10,
  "avatarUrl": "https://example.com/avatar.jpg" // optional
}
```

**Contoh cURL:**
```bash
curl -X POST http://localhost:3000/webhook/gift \
  -H "Content-Type: application/json" \
  -d '{"username": "GiftGiver", "giftName": "Rose", "quantity": 10}'
```

### 3. Chat Event
**POST** `/webhook/chat`

Mengirim pesan chat ke overlay.

**Request Body:**
```json
{
  "username": "ChatUser",
  "message": "Halo semua! Stream bagus!"
}
```

**Contoh cURL:**
```bash
curl -X POST http://localhost:3000/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{"username": "ChatUser", "message": "Halo semua!"}'
```

### 4. Viewer Count
**POST** `/webhook/viewer`

Update jumlah penonton.

**Request Body:**
```json
{
  "count": 150
}
```

**Contoh cURL:**
```bash
curl -X POST http://localhost:3000/webhook/viewer \
  -H "Content-Type: application/json" \
  -d '{"count": 150}'
```

### 5. Custom Banner
**POST** `/webhook/banner`

Menampilkan custom banner.

**Request Body:**
```json
{
  "text": "Terima Kasih Sudah Menonton!"
}
```

**Contoh cURL:**
```bash
curl -X POST http://localhost:3000/webhook/banner \
  -H "Content-Type: application/json" \
  -d '{"text": "Terima Kasih Sudah Menonton!"}'
```

### 6. Floating Photo
**POST** `/webhook/floating-photo`

Menambahkan foto bulat yang bergerak.

**Request Body:**
```json
{
  "imageUrl": "https://example.com/photo.jpg", // optional
  "emoji": "🎉" // optional (jika tidak ada imageUrl)
}
```

**Contoh cURL:**
```bash
curl -X POST http://localhost:3000/webhook/floating-photo \
  -H "Content-Type: application/json" \
  -d '{"emoji": "🎉"}'
```

### 7. Generic TikTok Webhook
**POST** `/webhook/tiktok`

Endpoint generik untuk menerima event dari TikTok API.

**Request Body:**
```json
{
  "type": "follower",
  "data": {
    "username": "JohnDoe",
    "avatarUrl": "https://example.com/avatar.jpg"
  }
}
```

## 🔌 Integrasi dengan Overlay

Overlay secara otomatis terhubung ke webhook server via Server-Sent Events (SSE) saat halaman dimuat. Pastikan:

1. Webhook server sudah running di `http://localhost:3000`
2. Overlay dibuka di browser (bisa via OBS Browser Source)
3. Keduanya dalam network yang sama

## 🧪 Testing

### Manual Testing

Gunakan script test yang sudah disediakan:

```bash
npm test
```

Atau test secara manual dengan cURL atau Postman.

### Test dengan Browser

1. Buka `index.html` di browser
2. Buka Developer Console (F12)
3. Kirim test request ke webhook server
4. Lihat event muncul di overlay

## 🔗 Integrasi dengan TikTok Live API

Untuk integrasi dengan TikTok Live API, Anda perlu:

1. **Setup TikTok Developer Account**
   - Daftar di TikTok Developer Portal
   - Buat aplikasi
   - Dapatkan API credentials

2. **Setup Webhook Receiver**
   - Deploy webhook server ke server publik (atau gunakan ngrok untuk local testing)
   - Daftarkan webhook URL di TikTok Developer Portal

3. **Handle TikTok Events**
   - TikTok akan mengirim POST request ke webhook URL Anda
   - Parse event data
   - Forward ke overlay via SSE

### Contoh Handler untuk TikTok Event

```javascript
app.post('/webhook/tiktok', (req, res) => {
    const event = req.body;
    
    // Parse TikTok event format
    if (event.event_type === 'follow') {
        broadcastToClients({
            type: 'follower',
            data: {
                username: event.user_info.display_name,
                avatarUrl: event.user_info.avatar_url
            }
        });
    } else if (event.event_type === 'gift') {
        broadcastToClients({
            type: 'gift',
            data: {
                username: event.user_info.display_name,
                giftName: event.gift_info.gift_name,
                quantity: event.gift_info.quantity,
                avatarUrl: event.user_info.avatar_url
            }
        });
    }
    
    res.status(200).json({ success: true });
});
```

## 🌐 Deploy ke Production

### Menggunakan ngrok (untuk testing lokal)

1. Install ngrok: https://ngrok.com/
2. Start webhook server: `npm start`
3. Start ngrok: `ngrok http 3000`
4. Gunakan URL ngrok sebagai webhook URL di TikTok

### Deploy ke Server

1. Deploy ke platform seperti:
   - Heroku
   - Railway
   - DigitalOcean
   - AWS
   - VPS

2. Update URL di `script.js`:
```javascript
const eventSource = new EventSource('https://your-server.com/events');
```

3. Setup environment variables jika diperlukan

## 🔒 Security

Untuk production, pertimbangkan:

1. **Authentication**: Tambahkan API key atau token authentication
2. **HTTPS**: Gunakan SSL/TLS untuk semua komunikasi
3. **Rate Limiting**: Batasi jumlah request per IP
4. **Validation**: Validasi semua input data
5. **CORS**: Konfigurasi CORS dengan benar

### Contoh dengan API Key

```javascript
app.post('/webhook/*', (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    next();
});
```

## 📊 Monitoring

- Health check: `GET http://localhost:3000/health`
- Test endpoint: `GET http://localhost:3000/test`
- Logs: Monitor console output untuk debugging

## 🐛 Troubleshooting

### Overlay tidak menerima event

1. Pastikan webhook server running
2. Check browser console untuk error
3. Pastikan URL di `script.js` benar
4. Check CORS settings

### Webhook tidak menerima request

1. Check firewall settings
2. Pastikan port 3000 tidak digunakan aplikasi lain
3. Check logs untuk error
4. Test dengan curl atau Postman

## 📝 Catatan

- Server menggunakan Server-Sent Events (SSE) untuk real-time communication
- Overlay akan otomatis reconnect jika connection terputus
- Semua event di-broadcast ke semua connected clients
- Webhook server bisa handle multiple overlay instances

---

**Selamat Streaming! 🎉**

