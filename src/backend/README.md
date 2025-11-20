# Backend MVC Structure

Backend telah direstrukturisasi menggunakan pola MVC (Model-View-Controller).

## Struktur Direktori

```
src/backend/
├── models/          # Data access layer
│   ├── UserModel.js
│   ├── ConfigModel.js
│   ├── StateModel.js
│   └── LogModel.js
├── controllers/     # HTTP request handlers
│   ├── UserController.js
│   ├── WebhookController.js
│   ├── OverlayController.js
│   ├── SSEController.js
│   └── MusicController.js
├── services/        # Business logic
│   ├── EventService.js
│   └── FeatureService.js
├── routes/          # Route definitions
│   ├── userRoutes.js
│   ├── webhookRoutes.js
│   ├── overlayRoutes.js
│   ├── apiRoutes.js
│   ├── sseRoutes.js
│   └── index.js
├── security-middleware.js
├── tiktok-connector.js
└── webhook-server.js
```

## Models

### UserModel
- `loadUsers()` - Load users dari file
- `saveUsers(usersData)` - Save users ke file
- `getUserByUsername(username)` - Get user by username
- `getUserByCode(liveCode)` - Get user by live code
- `createUser(username, displayName, liveCode)` - Create new user
- `updateUser(username, updates)` - Update user
- `deleteUser(username)` - Delete user

### ConfigModel
- `loadUserConfig(username)` - Load config untuk user
- `saveUserConfig(username, config)` - Save config untuk user
- `getDefaultUserConfig()` - Get default config untuk user baru
- `getDefaultConfigValue()` - Get default config

### StateModel
- `getUserState(username)` - Get atau create user state
- `updateChatMessages(username, message)` - Update chat messages
- `updateViewerCount(username, count)` - Update viewer count
- `updateBannerText(username, text)` - Update banner text
- `getStateSyncData(username)` - Get state data untuk sync

### LogModel
- `addLog(username, type, message, data)` - Add log entry
- `getLogs(username, limit)` - Get logs untuk user
- `clearLogs(username)` - Clear logs untuk user

## Services

### EventService
- `addClient(client, username)` - Add SSE client
- `removeClient(client, username)` - Remove SSE client
- `broadcastToClients(event, username)` - Broadcast event ke clients
- `sendStateSync(client, stateData)` - Send state sync ke client

### FeatureService
- `isFeatureEnabled(featureName, defaultValue)` - Check feature flag

## Controllers

### UserController
- `getAllUsers(req, res)` - GET /api/users
- `getUser(req, res)` - GET /api/users/:username
- `createUser(req, res)` - POST /api/users
- `updateUser(req, res)` - PUT /api/users/:username
- `deleteUser(req, res)` - DELETE /api/users/:username
- `getUserConfig(req, res)` - GET /api/users/:username/config
- `saveUserConfig(req, res)` - PUT /api/users/:username/config
- `getUserLogs(req, res)` - GET /api/users/:username/logs
- `clearUserLogs(req, res)` - DELETE /api/users/:username/logs

### WebhookController
- `handleTikTokWebhook(req, res)` - POST /webhook/tiktok
- `handleFollower(req, res)` - POST /webhook/follower
- `handleGift(req, res)` - POST /webhook/gift
- `handleChat(req, res)` - POST /webhook/chat
- `handleViewer(req, res)` - POST /webhook/viewer
- `handleBanner(req, res)` - POST /webhook/banner
- `handleFloatingPhoto(req, res)` - POST /webhook/floating-photo
- `handleUserFollower(req, res)` - POST /webhook/:username/follower
- `handleUserGift(req, res)` - POST /webhook/:username/gift
- `handleUserChat(req, res)` - POST /webhook/:username/chat
- `handleUserViewer(req, res)` - POST /webhook/:username/viewer
- `handleUserBanner(req, res)` - POST /webhook/:username/banner
- `handleUserFloatingPhoto(req, res)` - POST /webhook/:username/floating-photo

### OverlayController
- `serveFloatingPhotos(req, res)` - GET /live/floating-photos/:id
- `serveFirework(req, res)` - GET /live/firework/:id
- `serveJedagJedug(req, res)` - GET /live/jedagjedug/:id
- `serveChat(req, res)` - GET /live/chat/:id
- `serveFollowerAlert(req, res)` - GET /live/follower-alert/:id
- `serveGiftAlert(req, res)` - GET /live/gift-alert/:id
- `serveMainOverlay(req, res)` - GET /live/:code

### SSEController
- `handleEventsByCode(req, res)` - GET /events/code/:code
- `handleEventsByUsername(req, res)` - GET /events/:username

### MusicController
- `getMusicList(req, res)` - GET /api/music

## Routes

Semua routes didefinisikan di folder `routes/` dan diregistrasikan di `routes/index.js`.

## Penggunaan

Untuk menggunakan struktur MVC ini di `webhook-server.js`, import routes:

```javascript
const routes = require('./routes');

// Gunakan routes
app.use(routes);
```

Atau import routes individual:

```javascript
const userRoutes = require('./routes/userRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
// ... dll

app.use('/api/users', userRoutes);
app.use('/webhook', webhookRoutes);
// ... dll
```

