// Webhook Server untuk TikTok Live Overlay
// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { body, query, validationResult } = require('express-validator');
const TikTokConnector = require('./tiktok-connector');
const EventService = require('./services/EventService');
const {
    securityHeaders,
    apiLimiter,
    webhookLimiter,
    userManagementLimiter,
    sseLimiter,
    sanitizeString,
    escapeHtml,
    sanitizeUsername,
    validatePath,
    validateUsernameParam,
    validateLiveCodeParam,
    validateLiveCodeIdParam,
    validateCreateUser,
    validateWebhookFollower,
    validateWebhookGift,
    validateWebhookChat,
    validateWebhookBanner,
    validateWebhookFloatingPhoto
} = require('./security-middleware');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
const PORT = process.env.PORT || 3000;

// JSON payload size limit (10MB)
const JSON_SIZE_LIMIT = '10mb';

// Load config dari config.json
let overlayConfig = null;
try {
    const configPath = path.join(__dirname, '../../config/config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    overlayConfig = JSON.parse(configData);
    console.log('✅ Config loaded from config.json');
} catch (error) {
    console.warn('⚠️ Failed to load config.json, using default values:', error.message);
    overlayConfig = {
        features: {
            followerAlert: true,
            giftAlert: true,
            chatOverlay: true,
            streamTimer: true,
            viewerCount: true,
            customBanner: true,
            floatingPhotos: true,
            animations: true,
            tiktokConnector: true,
            webhookConnection: true
        }
    };
}

// Helper function untuk mendapatkan default config untuk user baru
function getDefaultUserConfig() {
    return {
        features: {
            followerAlert: true,
            giftAlert: true,
            chatOverlay: true,
            streamTimer: true,
            viewerCount: true,
            customBanner: true,
            floatingPhotos: true,
            animations: true,
            tiktokConnector: true,
            webhookConnection: true
        },
        alerts: {
            follower: { enabled: true, duration: 5000, position: { top: '50px', right: '50px' } },
            gift: { enabled: true, duration: 6000, position: { top: '50px', right: '50px' } }
        },
        chat: { enabled: true, maxMessages: 10, position: { bottom: '50px', left: '50px' }, width: '500px', maxHeight: '400px' },
        widgets: {
            streamStatus: { enabled: true, label: 'Streaming', defaultValue: 'LIVE' },
            streamTimer: { enabled: true, position: { top: '50px', left: '50px' } },
            viewerCount: { enabled: true, showInChat: true }
        },
        theme: {
            primary: { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', solid: '#667eea' },
            secondary: { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', solid: '#f5576c' },
            background: 'rgba(0, 0, 0, 0.7)',
            text: '#ffffff'
        },
        animations: { enabled: true, duration: 500, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' },
        api: { enabled: false, endpoint: '', apiKey: '', pollInterval: 5000 },
        floatingPhotos: {
            randomColor: true,
            colorPalette: [
                { name: 'Purple', primary: '#667eea', secondary: '#764ba2' },
                { name: 'Pink', primary: '#f093fb', secondary: '#f5576c' },
                { name: 'Blue', primary: '#4facfe', secondary: '#00f2fe' },
                { name: 'Green', primary: '#43e97b', secondary: '#38f9d7' },
                { name: 'Orange', primary: '#fa709a', secondary: '#fee140' },
                { name: 'Cyan', primary: '#30cfd0', secondary: '#330867' },
                { name: 'Red', primary: '#f83600', secondary: '#f9d423' },
                { name: 'Yellow', primary: '#f6d365', secondary: '#fda085' },
                { name: 'Indigo', primary: '#667eea', secondary: '#764ba2' },
                { name: 'Teal', primary: '#0ba360', secondary: '#3cba92' }
            ]
        },
        giftFirework: {
            enabled: false,
            count: 20,
            centerX: 960,
            centerY: 540
        }
    };
}

// Helper function untuk check feature flag dari config.json
function isFeatureEnabled(featureName, defaultValue = true) {
    // Mapping feature name ke config key
    const featureMap = {
        'FOLLOWER_ALERT': 'followerAlert',
        'GIFT_ALERT': 'giftAlert',
        'CHAT_OVERLAY': 'chatOverlay',
        'STREAM_TIMER': 'streamTimer',
        'VIEWER_COUNT': 'viewerCount',
        'CUSTOM_BANNER': 'customBanner',
        'FLOATING_PHOTOS': 'floatingPhotos',
        'ANIMATIONS': 'animations',
        'TIKTOK_CONNECTOR': 'tiktokConnector',
        'WEBHOOK_CONNECTION': 'webhookConnection'
    };
    
    const configKey = featureMap[featureName] || featureName.toLowerCase();
    if (overlayConfig && overlayConfig.features && overlayConfig.features[configKey] !== undefined) {
        return overlayConfig.features[configKey] === true;
    }
    return defaultValue;
}

// Security Middleware - HARUS di awal
app.use(securityHeaders);

// CORS Configuration - lebih aman
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['*']; // Default allow all untuk development

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Body parser dengan size limit
app.use(bodyParser.json({ limit: JSON_SIZE_LIMIT }));
app.use(bodyParser.urlencoded({ extended: true, limit: JSON_SIZE_LIMIT }));

// Error handler untuk JSON parsing errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: 'Invalid JSON payload atau payload terlalu besar'
        });
    }
    next(err);
});

// Landing page - route utama (harus sebelum static files)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/client/pages/landing/index.html'));
});

// Serve static files untuk Dashboard
app.use('/dashboard/css', express.static(path.join(__dirname, '../frontend/dashboard/css')));
app.use('/dashboard/js', express.static(path.join(__dirname, '../frontend/dashboard/js')));
app.use('/dashboard/components', express.static(path.join(__dirname, '../frontend/dashboard/components')));

// Serve static files untuk Client
app.use('/css', express.static(path.join(__dirname, '../frontend/client/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/client/js')));
app.use('/components', express.static(path.join(__dirname, '../frontend/client/components')));
// Serve static files untuk live-code-not-found
app.use('/live-code-not-found', express.static(path.join(__dirname, '../frontend/client/pages/live-code-not-found')));
// Serve static files untuk landing page
app.use('/landing', express.static(path.join(__dirname, '../frontend/client/pages/landing')));

// Serve shared files
app.use('/shared/js', express.static(path.join(__dirname, '../frontend/shared/js')));

// Serve config files
app.use('/config', express.static(path.join(__dirname, '../../config')));

// Serve static files untuk src (untuk file musik dan assets lainnya)
app.use('/src', express.static(path.join(__dirname, '../')));

// Serve static files untuk assets (musik, images, dll)
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Routes dari routes/index.js (SSE routes, API routes, dll)
// HARUS di-mount sebelum route overlay untuk memastikan route SSE dipanggil dengan benar
const routes = require('./routes');
app.use(routes);

// Store connected socket clients (untuk Socket.IO)
// Struktur: { username: Set<socketId> }
const socketsByUser = new Map();
const allSockets = new Map(); // Map socketId -> { socket, username, liveCode }

// TikTok Live Connector instances per user
// Struktur: { username: TikTokConnector }
const tiktokConnectors = new Map();
let tiktokConnector = null; // Untuk backward compatibility

// Log storage per user
// Struktur: { username: Array<{timestamp, type, message, data}> }
const userLogs = new Map();
const MAX_LOG_ENTRIES = 500; // Maksimal 500 log entries per user

// State storage per user untuk sinkronisasi antar overlay
// Struktur: { username: { chatMessages: [], viewerCount: 0, bannerText: null, ... } }
const userState = new Map();
const MAX_CHAT_MESSAGES = 100; // Maksimal chat messages yang disimpan per user

// Helper functions untuk manage users
function getUsersFilePath() {
    return path.join(__dirname, '../../config/users.json');
}

function getUserConfigPath(username) {
    // Sanitize username untuk mencegah path traversal
    const sanitized = sanitizeUsername(username);
    if (!sanitized) {
        throw new Error('Invalid username');
    }
    
    // Remove @ dari username untuk filename
    const filename = sanitized.substring(1) + '.json';
    
    // Validate path
    const configPath = path.join(__dirname, '../../config/users', filename);
    const allowedBaseDir = path.join(__dirname, '../../config/users');
    
    if (!validatePath(configPath, allowedBaseDir)) {
        throw new Error('Invalid file path');
    }
    
    return configPath;
}

// Generate unique live code untuk user
function generateLiveCode() {
    // Generate random string dengan kombinasi huruf dan angka
    // Format: random string dengan panjang 12 karakter
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Generate unique live code yang belum digunakan
function generateUniqueLiveCode() {
    const usersData = loadUsers();
    let code;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
        code = generateLiveCode();
        attempts++;
        if (attempts > maxAttempts) {
            throw new Error('Failed to generate unique live code after multiple attempts');
        }
    } while (usersData.users.some(u => u.liveCode === code));
    
    return code;
}

function loadUsers() {
    try {
        const usersPath = getUsersFilePath();
        if (fs.existsSync(usersPath)) {
            const data = fs.readFileSync(usersPath, 'utf8');
            return JSON.parse(data);
        }
        return { users: [] };
    } catch (error) {
        console.error('Error loading users:', error);
        return { users: [] };
    }
}

function saveUsers(usersData) {
    try {
        const usersPath = getUsersFilePath();
        fs.writeFileSync(usersPath, JSON.stringify(usersData, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving users:', error);
        return false;
    }
}

// Helper functions untuk manage logs
function addLog(username, type, message, data = null) {
    if (!username) return;
    
    if (!userLogs.has(username)) {
        userLogs.set(username, []);
    }
    
    const logs = userLogs.get(username);
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: type, // 'info', 'success', 'error', 'chat', 'gift', 'follower', 'viewer', etc.
        message: message,
        data: data
    };
    
    logs.push(logEntry);
    
    // Batasi jumlah log entries
    if (logs.length > MAX_LOG_ENTRIES) {
        logs.shift(); // Hapus log tertua
    }
}

function getLogs(username, limit = 100) {
    if (!username || !userLogs.has(username)) {
        return [];
    }
    
    const logs = userLogs.get(username);
    // Return log terbaru (limit terakhir)
    return logs.slice(-limit);
}

function clearLogs(username) {
    if (username && userLogs.has(username)) {
        userLogs.set(username, []);
        return true;
    }
    return false;
}

function loadUserConfig(username) {
    try {
        const configPath = getUserConfigPath(username);
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(data);
        }
        // Jika tidak ada config per user, gunakan default config
        return overlayConfig;
    } catch (error) {
        console.error(`Error loading config for user ${username}:`, error);
        return overlayConfig;
    }
}

function saveUserConfig(username, config) {
    try {
        const configPath = getUserConfigPath(username);
        // Pastikan folder users ada
        const usersDir = path.dirname(configPath);
        if (!fs.existsSync(usersDir)) {
            fs.mkdirSync(usersDir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error saving config for user ${username}:`, error);
        return false;
    }
}

function getUserByUsername(username) {
    const usersData = loadUsers();
    return usersData.users.find(u => u.username === username);
}

function getUserByCode(liveCode) {
    const usersData = loadUsers();
    return usersData.users.find(u => u.liveCode === liveCode);
}

// Helper function untuk mendapatkan atau menginisialisasi state user
function getUserState(username) {
    if (!userState.has(username)) {
        userState.set(username, {
            chatMessages: [],
            viewerCount: 0,
            bannerText: null,
            lastUpdate: Date.now()
        });
    }
    return userState.get(username);
}

// Helper function untuk mengirim state sync ke socket
function sendStateSync(socket, username) {
    const state = getUserState(username);
    const syncEvent = {
        type: 'state-sync',
        data: {
            chatMessages: state.chatMessages.slice(-MAX_CHAT_MESSAGES), // Kirim maksimal MAX_CHAT_MESSAGES terakhir
            viewerCount: state.viewerCount,
            bannerText: state.bannerText
        }
    };
    
    try {
        socket.emit('event', syncEvent);
        console.log(`📤 State sync sent to new client for user: ${username}`);
    } catch (error) {
        console.error(`Error sending state sync to client for ${username}:`, error);
    }
}

// Helper function untuk membuat halaman error "Live code tidak ditemukan"
function renderLiveCodeNotFoundPage(code) {
    try {
        // Validate path untuk mencegah path traversal
        const errorPagePath = path.join(__dirname, '../frontend/client/pages/live-code-not-found/index.html');
        const allowedBaseDir = path.join(__dirname, '../frontend/client/pages/live-code-not-found');
        
        if (!validatePath(errorPagePath, allowedBaseDir)) {
            throw new Error('Invalid file path');
        }
        
        let html = fs.readFileSync(errorPagePath, 'utf8');
        // Escape HTML untuk mencegah XSS
        const escapedCode = escapeHtml(code);
        // Replace placeholder dengan code yang sudah di-escape
        html = html.replace('{{CODE}}', `"${escapedCode}"`);
        // Update path CSS dan JS agar relatif terhadap folder live-code-not-found
        html = html.replace('href="styles.css"', 'href="/live-code-not-found/styles.css"');
        html = html.replace('src="script.js"', 'src="/live-code-not-found/script.js"');
        return html;
    } catch (error) {
        console.error('Error loading live-code-not-found/index.html:', error);
        // Fallback jika file tidak ditemukan - dengan XSS protection
        const escapedCode = escapeHtml(code);
        return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
    <title>Live Code Tidak Ditemukan</title>
</head>
<body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #000; color: #fff;">
    <h1>Live code tidak ditemukan</h1>
    <p>Live code "${escapedCode}" tidak ditemukan atau tidak valid.</p>
    <a href="#" id="back-btn" style="color: #FE2C55; text-decoration: none; font-weight: 600;">Kembali</a>
    <script>
        (function() {
            const backBtn = document.getElementById('back-btn');
            
            function goBack() {
                // Cek apakah ada referrer (halaman sebelumnya)
                if (document.referrer && document.referrer !== window.location.href) {
                    // Ada halaman sebelumnya, kembali
                    window.history.back();
                } else {
                    // Tidak ada referrer (direct link), redirect ke dashboard
                    window.location.href = '/control-room';
                }
            }
            
            if (backBtn) {
                backBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    goBack();
                });
            }
        })();
    </script>
</body>
</html>`;
    }
}

function createUser(username, displayName = null, liveCode = null) {
    // Validate username format
    if (!username || typeof username !== 'string') {
        return { success: false, error: 'Username is required' };
    }
    
    // Normalize username: ensure it starts with @
    let normalizedUsername = username.trim();
    if (!normalizedUsername.startsWith('@')) {
        normalizedUsername = `@${normalizedUsername}`;
    }
    
    // Validate username format: alphanumeric, titik (.), dan underscore (_)
    const usernameWithoutAt = normalizedUsername.substring(1);
    const validUsernamePattern = /^[a-zA-Z0-9._]+$/;
    if (!validUsernamePattern.test(usernameWithoutAt)) {
        return { success: false, error: 'Username hanya boleh mengandung huruf, angka, titik (.), dan underscore (_)' };
    }
    
    if (normalizedUsername === '@' || normalizedUsername.length < 2) {
        return { success: false, error: 'Username tidak valid. Minimal 1 karakter setelah @' };
    }
    
    const usersData = loadUsers();
    const existingUser = usersData.users.find(u => u.username === normalizedUsername);
    
    if (existingUser) {
        return { success: false, error: 'User already exists' };
    }
    
    // Generate live code jika tidak disediakan
    if (!liveCode) {
        try {
            liveCode = generateUniqueLiveCode();
        } catch (error) {
            return { success: false, error: error.message };
        }
    } else {
        // Cek jika code sudah digunakan
        const codeExists = usersData.users.some(u => u.liveCode === liveCode);
        if (codeExists) {
            return { success: false, error: 'Live code already exists' };
        }
    }
    
    const newUser = {
        username: normalizedUsername,
        displayName: displayName || normalizedUsername,
        liveCode: liveCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        active: true
    };
    
    usersData.users.push(newUser);
    
    if (saveUsers(usersData)) {
        // Buat default config untuk user baru dengan semua feature enabled
        const defaultConfig = getDefaultUserConfig();
        saveUserConfig(username, defaultConfig);
        return { success: true, user: newUser };
    }
    
    return { success: false, error: 'Failed to save user' };
}

function updateUser(username, updates) {
    const usersData = loadUsers();
    const userIndex = usersData.users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
        return { success: false, error: 'User not found' };
    }
    
    usersData.users[userIndex] = {
        ...usersData.users[userIndex],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    if (saveUsers(usersData)) {
        return { success: true, user: usersData.users[userIndex] };
    }
    
    return { success: false, error: 'Failed to update user' };
}

function deleteUser(username) {
    const usersData = loadUsers();
    const userIndex = usersData.users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
        return { success: false, error: 'User not found' };
    }
    
    usersData.users.splice(userIndex, 1);
    
    if (saveUsers(usersData)) {
        // Hapus config file user
        try {
            const configPath = getUserConfigPath(username);
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
            }
        } catch (error) {
            console.error(`Error deleting config for user ${username}:`, error);
        }
        
        // Disconnect TikTok connector jika ada
        if (tiktokConnectors.has(username)) {
            const connector = tiktokConnectors.get(username);
            if (connector && connector.disconnect) {
                connector.disconnect().catch(console.error);
            }
            tiktokConnectors.delete(username);
        }
        
        return { success: true };
    }
    
    return { success: false, error: 'Failed to delete user' };
}

// Broadcast function untuk TikTok events menggunakan Socket.IO dan SSE
function broadcastToClients(event, username = null) {
    // Broadcast ke SSE clients (untuk overlay yang menggunakan EventSource)
    EventService.broadcastToClients(event, username);
    
    // Broadcast ke Socket.IO clients
    if (username) {
        // Broadcast ke sockets untuk user tertentu
        const userSocketIds = socketsByUser.get(username);
        if (userSocketIds && userSocketIds.size > 0) {
            console.log(`📤 Broadcasting event "${event.type}" to ${userSocketIds.size} Socket.IO client(s) for user: ${username}`);
            userSocketIds.forEach(socketId => {
                const socketData = allSockets.get(socketId);
                if (socketData && socketData.socket) {
                    try {
                        socketData.socket.emit('event', event);
                    } catch (error) {
                        console.error(`Error broadcasting to socket ${socketId} for ${username}:`, error);
                        // Cleanup socket yang error
                        cleanupSocket(socketId, username);
                    }
                }
            });
        } else {
            console.warn(`⚠️ No Socket.IO clients found for user: ${username}. Available users: ${Array.from(socketsByUser.keys()).join(', ')}`);
        }
    } else {
        // Broadcast ke semua sockets (backward compatibility)
        let broadcastCount = 0;
        allSockets.forEach((socketData, socketId) => {
            if (socketData && socketData.socket) {
                try {
                    socketData.socket.emit('event', event);
                    broadcastCount++;
                } catch (error) {
                    console.error(`Error broadcasting to socket ${socketId}:`, error);
                    // Cleanup socket yang error
                    if (socketData.username) {
                        cleanupSocket(socketId, socketData.username);
                    }
                }
            }
        });
        console.log(`📤 Broadcasting event "${event.type}" to ${broadcastCount} Socket.IO client(s)`);
    }
}

// Helper function untuk cleanup socket
function cleanupSocket(socketId, username = null) {
    const socketData = allSockets.get(socketId);
    if (socketData) {
        const targetUsername = username || socketData.username;
        if (targetUsername) {
            const userSocketIds = socketsByUser.get(targetUsername);
            if (userSocketIds) {
                userSocketIds.delete(socketId);
                if (userSocketIds.size === 0) {
                    socketsByUser.delete(targetUsername);
                }
            }
        }
    }
    allSockets.delete(socketId);
}

// Initialize TikTok Connector
function initTikTokConnector() {
    // Check feature flag
    if (!isFeatureEnabled('TIKTOK_CONNECTOR', true)) {
        console.log('ℹ️ TikTok Connector disabled via FEATURE_TIKTOK_CONNECTOR flag');
        return;
    }
    
    const tiktokUsername = process.env.TIKTOK_USERNAME;
    
    if (tiktokUsername) {
        tiktokConnector = new TikTokConnector(broadcastToClients);

        console.log('TIKTOK_SIGN_API_KEY', process.env.TIKTOK_SIGN_API_KEY);
        
        const options = {
            sessionId: process.env.TIKTOK_SESSION_ID || null,
            ttTargetIdc: process.env.TIKTOK_TT_TARGET_IDC || null,
            signApiKey: process.env.TIKTOK_SIGN_API_KEY || null,
        };
        
        tiktokConnector.connect(tiktokUsername, options).catch(err => {
            console.error('Failed to connect to TikTok Live:', err);
        });
    } else {
        console.log('ℹ️ TikTok username not set. Set TIKTOK_USERNAME environment variable to enable auto-connect.');
    }
}

// Webhook endpoint untuk TikTok Live events
app.post('/webhook/tiktok', webhookLimiter, (req, res) => {
    try {
        const event = req.body;
        
        // Validate event structure
        if (!event || typeof event !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid event data'
            });
        }
        
        console.log('📥 Webhook received:', event.type || 'unknown');
        
        // Broadcast ke semua connected clients
        broadcastToClients(event);
        
        res.status(200).json({ 
            success: true, 
            message: 'Event received',
            event: event.type 
        });
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' // Jangan expose error message detail
        });
    }
});

// Endpoint untuk follower event
app.post('/webhook/follower', webhookLimiter, validateWebhookFollower, (req, res) => {
    // Check feature flag
    if (!isFeatureEnabled('FOLLOWER_ALERT', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Follower alert disabled via feature flag',
            skipped: true 
        });
    }
    
    const { username, avatarUrl } = req.body;
    
    const event = {
        type: 'follower',
        data: {
            username: sanitizeString(username),
            avatarUrl: avatarUrl || null
        }
    };
    
    broadcastToClients(event);
    console.log(`👋 Follower event: ${sanitizeString(username)}`);
    
    res.status(200).json({ success: true, event });
});

// Endpoint untuk gift event
app.post('/webhook/gift', webhookLimiter, validateWebhookGift, (req, res) => {
    // Check feature flag
    if (!isFeatureEnabled('GIFT_ALERT', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Gift alert disabled via feature flag',
            skipped: true 
        });
    }
    
    const { username, giftName, quantity, avatarUrl, giftImageUrl } = req.body;
    
    const event = {
        type: 'gift',
        data: {
            username: sanitizeString(username),
            giftName: sanitizeString(giftName),
            quantity: parseInt(quantity),
            avatarUrl: avatarUrl || null,
            giftImageUrl: giftImageUrl || null
        }
    };
    
    broadcastToClients(event);
    console.log(`🎁 Gift event: ${sanitizeString(username)} - ${quantity}x ${sanitizeString(giftName)}`);
    
    res.status(200).json({ success: true, event });
});

// Endpoint untuk chat event
app.post('/webhook/chat', webhookLimiter, validateWebhookChat, (req, res) => {
    // Check feature flag
    if (!isFeatureEnabled('CHAT_OVERLAY', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Chat overlay disabled via feature flag',
            skipped: true 
        });
    }
    
    const { username, message } = req.body;
    
    const event = {
        type: 'chat',
        data: {
            username: sanitizeString(username),
            message: sanitizeString(message)
        }
    };
    
    broadcastToClients(event);
    console.log(`💬 Chat event: ${sanitizeString(username)}: ${sanitizeString(message)}`);
    
    res.status(200).json({ success: true, event });
});

// Endpoint untuk viewer count update
app.post('/webhook/viewer', webhookLimiter, [
    body('count')
        .notEmpty()
        .withMessage('Count wajib diisi')
        .isInt({ min: 0, max: 100000000 })
        .withMessage('Count harus berupa angka antara 0-100000000')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: errors.array()[0].msg
        });
    }
    
    // Check feature flag
    if (!isFeatureEnabled('VIEWER_COUNT', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Viewer count disabled via feature flag',
            skipped: true 
        });
    }
    
    const { count } = req.body;
    
    const event = {
        type: 'viewer',
        data: {
            count: parseInt(count)
        }
    };
    
    broadcastToClients(event);
    console.log(`👁️ Viewer count: ${count}`);
    
    res.status(200).json({ success: true, event });
});

// Endpoint untuk custom banner
app.post('/webhook/banner', webhookLimiter, validateWebhookBanner, (req, res) => {
    // Check feature flag
    if (!isFeatureEnabled('CUSTOM_BANNER', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Custom banner disabled via feature flag',
            skipped: true 
        });
    }
    
    const { text } = req.body;
    
    const event = {
        type: 'banner',
        data: {
            text: sanitizeString(text)
        }
    };
    
    broadcastToClients(event);
    console.log(`📢 Banner: ${sanitizeString(text)}`);
    
    res.status(200).json({ success: true, event });
});

// Endpoint untuk floating photo
app.post('/webhook/floating-photo', webhookLimiter, validateWebhookFloatingPhoto, (req, res) => {
    // Check feature flag
    if (!isFeatureEnabled('FLOATING_PHOTOS', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Floating photos disabled via feature flag',
            skipped: true 
        });
    }
    
    const { imageUrl, emoji } = req.body;
    
    if (!imageUrl && !emoji) {
        return res.status(400).json({ 
            success: false, 
            error: 'Either imageUrl or emoji is required' 
        });
    }
    
    const event = {
        type: 'floating-photo',
        data: {
            imageUrl: imageUrl || null,
            emoji: emoji ? sanitizeString(emoji) : null
        }
    };
    
    broadcastToClients(event);
    console.log(`🖼️ Floating photo event`);
    
    res.status(200).json({ success: true, event });
});

// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);
    
    // Handle join by live code
    socket.on('join-by-code', (data) => {
        const { code } = data;
        if (!code) {
            socket.emit('error', { message: 'Live code is required' });
            return;
        }
        
        const user = getUserByCode(code);
        if (!user) {
            socket.emit('error', { message: 'Live code not found' });
            return;
        }
        
        if (!user.active) {
            socket.emit('error', { message: 'User is not active' });
            return;
        }
        
        const username = user.username;
        joinSocketToUser(socket, username, code);
    });
    
    // Handle join by username (backward compatibility)
    socket.on('join-by-username', (data) => {
        const { username } = data;
        if (!username) {
            socket.emit('error', { message: 'Username is required' });
            return;
        }
        
        const user = getUserByUsername(username);
        if (!user) {
            socket.emit('error', { message: 'User not found' });
            return;
        }
        
        joinSocketToUser(socket, username, null);
    });
    
    // Handle generic join (backward compatibility)
    socket.on('join', () => {
        // Add to all sockets without specific user
        allSockets.set(socket.id, { socket, username: null, liveCode: null });
        socket.emit('event', { 
            type: 'connected', 
            message: 'Connected to webhook server' 
        });
        console.log(`✅ Socket ${socket.id} joined (generic). Total sockets: ${allSockets.size}`);
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        const socketData = allSockets.get(socket.id);
        if (socketData && socketData.username) {
            cleanupSocket(socket.id, socketData.username);
            console.log(`❌ Socket ${socket.id} disconnected for user ${socketData.username}`);
        } else {
            allSockets.delete(socket.id);
            console.log(`❌ Socket ${socket.id} disconnected. Total sockets: ${allSockets.size}`);
        }
    });
});

// Helper function untuk join socket ke user
function joinSocketToUser(socket, username, liveCode) {
    // Remove dari semua tempat sebelumnya
    cleanupSocket(socket.id, null);
    
    // Add ke user-specific sockets
    if (!socketsByUser.has(username)) {
        socketsByUser.set(username, new Set());
    }
    socketsByUser.get(username).add(socket.id);
    
    // Add ke allSockets
    allSockets.set(socket.id, { socket, username, liveCode });
    
    // Send connection confirmation
    socket.emit('event', {
        type: 'connected',
        message: `Connected to webhook server for user: ${username}`,
        username: username,
        liveCode: liveCode
    });
    
    // Send state sync
    sendStateSync(socket, username);
    
    const userSocketIds = socketsByUser.get(username);
    console.log(`✅ Socket ${socket.id} joined for user ${username}${liveCode ? ` (code: ${liveCode})` : ''}. Total sockets for this user: ${userSocketIds ? userSocketIds.size : 0}`);
}

// TikTok Live Connector Endpoints (per user)
app.post('/api/users/:username/tiktok/connect', async (req, res) => {
    try {
        const { username } = req.params;
        const { sessionId, ttTargetIdc } = req.body;
        
        // Cek apakah user ada
        const user = getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // Disconnect existing connection untuk user ini jika ada
        if (tiktokConnectors.has(username)) {
            const existingConnector = tiktokConnectors.get(username);
            if (existingConnector.isConnected) {
                await existingConnector.disconnect();
            }
            tiktokConnectors.delete(username);
        }

        // Create new connection untuk user ini
        const connector = new TikTokConnector((event) => {
            broadcastToClients(event, username);
            
            // Tambahkan log berdasarkan event type
            if (event.type === 'chat' && event.data) {
                addLog(username, 'chat', `${event.data.username}: ${event.data.message}`, event.data);
            } else if (event.type === 'gift' && event.data) {
                addLog(username, 'gift', `${event.data.username} mengirim ${event.data.quantity}x ${event.data.giftName}`, event.data);
            } else if (event.type === 'follower' && event.data) {
                addLog(username, 'follower', `${event.data.username} mengikuti live`, event.data);
            } else if (event.type === 'viewer' && event.data) {
                addLog(username, 'viewer', `Viewer count: ${event.data.count}`, event.data);
            } else if (event.type === 'banner' && event.data) {
                addLog(username, 'banner', event.data.text || 'Banner event', event.data);
            } else if (event.type === 'floating-photo' && event.data) {
                addLog(username, 'floating-photo', 'Floating photo event', event.data);
            }
        });
        
        await connector.connect(username, {
            sessionId: sessionId || null,
            ttTargetIdc: ttTargetIdc || null
        });

        // Simpan connector ke Map
        tiktokConnectors.set(username, connector);
        
        addLog(username, 'success', `Terhubung ke TikTok Live: ${username}`, { username, connected: true });

        res.status(200).json({ 
            success: true, 
            message: `Connected to TikTok Live: ${username}`,
            state: connector.getState()
        });
    } catch (error) {
        console.error(`Error connecting to TikTok for user ${req.params.username}:`, error);
        addLog(req.params.username, 'error', `Gagal terhubung ke TikTok Live: ${error.message}`, { error: error.message });
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/users/:username/tiktok/disconnect', async (req, res) => {
    try {
        const { username } = req.params;
        
        // Cek apakah user ada
        const user = getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        if (tiktokConnectors.has(username)) {
            const connector = tiktokConnectors.get(username);
            await connector.disconnect();
            tiktokConnectors.delete(username);
            addLog(username, 'info', `Terputus dari TikTok Live: ${username}`, { username, connected: false });
            res.status(200).json({ 
                success: true, 
                message: `Disconnected from TikTok Live: ${username}` 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                error: 'Not connected to TikTok Live' 
            });
        }
    } catch (error) {
        console.error(`Error disconnecting from TikTok for user ${req.params.username}:`, error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/users/:username/tiktok/state', (req, res) => {
    try {
        const { username } = req.params;
        
        // Cek apakah user ada
        const user = getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        if (tiktokConnectors.has(username)) {
            const connector = tiktokConnectors.get(username);
            res.status(200).json({ 
                success: true, 
                state: connector.getState() 
            });
        } else {
            res.status(200).json({ 
                success: true, 
                state: { isConnected: false, username: null } 
            });
        }
    } catch (error) {
        console.error(`Error getting TikTok state for user ${req.params.username}:`, error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// TikTok Live Connector Endpoints (backward compatibility)
app.post('/tiktok/connect', async (req, res) => {
    try {
        const { username, sessionId, ttTargetIdc } = req.body;
        
        if (!username) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username is required' 
            });
        }

        // Disconnect existing connection
        if (tiktokConnector && tiktokConnector.isConnected) {
            await tiktokConnector.disconnect();
        }

        // Create new connection
        tiktokConnector = new TikTokConnector(broadcastToClients);
        
        await tiktokConnector.connect(username, {
            sessionId: sessionId || null,
            ttTargetIdc: ttTargetIdc || null
        });

        res.status(200).json({ 
            success: true, 
            message: `Connected to TikTok Live: ${username}`,
            state: tiktokConnector.getState()
        });
    } catch (error) {
        console.error('Error connecting to TikTok:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/tiktok/disconnect', async (req, res) => {
    try {
        if (tiktokConnector) {
            await tiktokConnector.disconnect();
            res.status(200).json({ 
                success: true, 
                message: 'Disconnected from TikTok Live' 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                error: 'Not connected to TikTok Live' 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/tiktok/state', (req, res) => {
    if (tiktokConnector) {
        res.status(200).json({ 
            success: true, 
            state: tiktokConnector.getState() 
        });
    } else {
        res.status(200).json({ 
            success: true, 
            state: { isConnected: false, username: null } 
        });
    }
});

app.get('/tiktok/room-info', async (req, res) => {
    try {
        if (!tiktokConnector || !tiktokConnector.isConnected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Not connected to TikTok Live' 
            });
        }

        const roomInfo = await tiktokConnector.fetchRoomInfo();
        res.status(200).json({ 
            success: true, 
            roomInfo 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/tiktok/gifts', async (req, res) => {
    try {
        if (!tiktokConnector || !tiktokConnector.isConnected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Not connected to TikTok Live' 
            });
        }

        const gifts = await tiktokConnector.fetchAvailableGifts();
        res.status(200).json({ 
            success: true, 
            gifts 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// API endpoints untuk config management
// Get config.json
app.get('/api/config', apiLimiter, (req, res) => {
    try {
        const configPath = path.join(__dirname, '../../config/config.json');
        const allowedBaseDir = path.join(__dirname, '../../config');
        
        if (!validatePath(configPath, allowedBaseDir)) {
            return res.status(500).json({
                success: false,
                error: 'Invalid file path'
            });
        }
        
        const configData = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        res.status(200).json({ success: true, config });
    } catch (error) {
        console.error('Error reading config:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Get list of music files
app.get('/api/music', apiLimiter, (req, res) => {
    try {
        const musicDir = path.join(__dirname, '../assets/music');
        const allowedBaseDir = path.join(__dirname, '../assets/music');
        
        // Check if directory exists
        if (!fs.existsSync(musicDir)) {
            return res.status(200).json({ success: true, music: [] });
        }
        
        // Read directory and filter for audio files
        const files = fs.readdirSync(musicDir);
        const musicFiles = files
            .filter(file => {
                // Validate filename untuk mencegah path traversal
                if (file.includes('..') || file.includes('/') || file.includes('\\')) {
                    return false;
                }
                
                const ext = path.extname(file).toLowerCase();
                return ['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext);
            })
            .map(file => {
                const fullPath = path.join(musicDir, file);
                
                // Validate path
                if (!validatePath(fullPath, allowedBaseDir)) {
                    return null;
                }
                
                const stats = fs.statSync(fullPath);
                const filePath = `/assets/music/${encodeURIComponent(file)}`;
                
                return {
                    path: filePath,
                    name: file,
                    filename: path.basename(file, path.extname(file)),
                    size: stats.size,
                    modified: stats.mtime
                };
            })
            .filter(file => file !== null); // Remove invalid files
        
        res.status(200).json({ success: true, music: musicFiles });
    } catch (error) {
        console.error('Error reading music directory:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Save config.json
app.put('/api/config', userManagementLimiter, (req, res) => {
    try {
        const { config } = req.body;
        
        if (!config) {
            return res.status(400).json({ 
                success: false, 
                error: 'Config data is required' 
            });
        }

        // Validate JSON structure
        try {
            JSON.stringify(config);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid config structure'
            });
        }

        const configPath = path.join(__dirname, '../../config/config.json');
        const allowedBaseDir = path.join(__dirname, '../../config');
        
        if (!validatePath(configPath, allowedBaseDir)) {
            return res.status(500).json({
                success: false,
                error: 'Invalid file path'
            });
        }
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        
        // Reload config in memory
        overlayConfig = config;
        
        // Broadcast config update ke semua connected clients
        const configUpdateEvent = {
            type: 'config-updated',
            data: {
                config: config,
                timestamp: new Date().toISOString()
            }
        };
        broadcastToClients(configUpdateEvent);
        
        console.log('✅ Config updated successfully and broadcasted to clients');
        res.status(200).json({ 
            success: true, 
            message: 'Config berhasil disimpan' 
        });
    } catch (error) {
        console.error('Error saving config:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// ============================================
// API Endpoints untuk User Management
// ============================================

// Get all users
app.get('/api/users', apiLimiter, (req, res) => {
    try {
        const usersData = loadUsers();
        res.status(200).json({ success: true, users: usersData.users });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Get user by username
app.get('/api/users/:username', apiLimiter, validateUsernameParam, (req, res) => {
    try {
        const { username } = req.params;
        const user = getUserByUsername(username);
        
        if (user) {
            res.status(200).json({ success: true, user });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
    } catch (error) {
        console.error('Error loading user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Create new user
app.post('/api/users', userManagementLimiter, validateCreateUser, (req, res) => {
    try {
        const { username, displayName } = req.body;
        
        const result = createUser(username, displayName);
        
        if (result.success) {
            res.status(201).json({ 
                success: true, 
                user: result.user,
                message: 'User berhasil dibuat' 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                error: result.error 
            });
        }
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Update user
app.put('/api/users/:username', userManagementLimiter, validateUsernameParam, (req, res) => {
    try {
        const { username } = req.params;
        const updates = req.body;
        
        // Jangan izinkan update username
        delete updates.username;
        
        // Sanitize displayName jika ada
        if (updates.displayName) {
            updates.displayName = sanitizeString(updates.displayName);
        }
        
        const result = updateUser(username, updates);
        
        if (result.success) {
            res.status(200).json({ 
                success: true, 
                user: result.user,
                message: 'User berhasil diupdate' 
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: result.error 
            });
        }
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Delete user
app.delete('/api/users/:username', userManagementLimiter, validateUsernameParam, (req, res) => {
    try {
        const { username } = req.params;
        const result = deleteUser(username);
        
        if (result.success) {
            res.status(200).json({ 
                success: true, 
                message: 'User berhasil dihapus' 
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: result.error 
            });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// ============================================
// API Endpoints untuk Config per User
// ============================================

// Get config untuk user tertentu
app.get('/api/users/:username/config', apiLimiter, validateUsernameParam, (req, res) => {
    try {
        const { username } = req.params;
        const user = getUserByUsername(username);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        const config = loadUserConfig(username);
        res.status(200).json({ success: true, config });
    } catch (error) {
        console.error('Error loading user config:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Save config untuk user tertentu
app.put('/api/users/:username/config', userManagementLimiter, validateUsernameParam, (req, res) => {
    try {
        const { username } = req.params;
        const { config } = req.body;
        
        const user = getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        if (!config) {
            return res.status(400).json({ 
                success: false, 
                error: 'Config data is required' 
            });
        }

        // Validate JSON structure
        try {
            JSON.stringify(config);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid config structure'
            });
        }

        if (saveUserConfig(username, config)) {
            // Broadcast config update ke clients untuk user ini
            const configUpdateEvent = {
                type: 'config-updated',
                data: {
                    config: config,
                    username: username,
                    timestamp: new Date().toISOString()
                }
            };
            broadcastToClients(configUpdateEvent, username);
            
            console.log(`✅ Config updated for user ${username}`);
            res.status(200).json({ 
                success: true, 
                message: 'Config berhasil disimpan' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Failed to save config' 
            });
        }
    } catch (error) {
        console.error('Error saving user config:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// ============================================
// API Endpoints untuk Log per User
// ============================================

// Get logs untuk user tertentu
app.get('/api/users/:username/logs', apiLimiter, validateUsernameParam, [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Limit harus antara 1-1000')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: errors.array()[0].msg
        });
    }
    
    try {
        const { username } = req.params;
        const limit = parseInt(req.query.limit) || 100;
        
        const user = getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        const logs = getLogs(username, limit);
        res.status(200).json({ success: true, logs });
    } catch (error) {
        console.error('Error loading user logs:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Clear logs untuk user tertentu
app.delete('/api/users/:username/logs', userManagementLimiter, validateUsernameParam, (req, res) => {
    try {
        const { username } = req.params;
        
        const user = getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        const cleared = clearLogs(username);
        if (cleared) {
            res.status(200).json({ success: true, message: 'Logs berhasil dihapus' });
        } else {
            res.status(200).json({ success: true, message: 'Tidak ada log untuk dihapus' });
        }
    } catch (error) {
        console.error('Error clearing user logs:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// ============================================
// Route Dinamis untuk Overlay per User
// ============================================

// IMPORTANT: Route yang lebih spesifik harus didefinisikan SEBELUM route yang lebih umum
// Urutan: /live/floating-photos/:id, /live/firework/:id, /live/jedagjedug/:id, /live/chat/:id, /live/follower-alert/:id, /live/gift-alert/:id, kemudian /live/:code

// Route untuk floating-photos overlay: /live/floating-photos/:id
app.get('/live/floating-photos/:id', validateLiveCodeIdParam, (req, res) => {
    const { id } = req.params;
    const user = getUserByCode(id);
    
    if (!user) {
        return res.status(404).send(renderLiveCodeNotFoundPage(id));
    }
    
    if (!user.active) {
        const escapedId = escapeHtml(id);
        return res.status(403).send(`
            <html>
                <head>
                    <title>User Inactive</title>
                    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
                </head>
                <body>
                    <h1>User tidak aktif</h1>
                    <p>User dengan live code "${escapedId}" tidak aktif.</p>
                </body>
            </html>
        `);
    }
    
    // Validate path
    const overlayPath = path.join(__dirname, '../frontend/client/pages/floating-photos/index.html');
    const allowedBaseDir = path.join(__dirname, '../frontend/client/pages/floating-photos');
    
    if (!validatePath(overlayPath, allowedBaseDir)) {
        return res.status(500).json({
            success: false,
            error: 'Invalid file path'
        });
    }
    
    // Serve floating-photos overlay HTML
    res.sendFile(overlayPath);
});

// Route untuk firework overlay: /live/firework/:id
app.get('/live/firework/:id', (req, res) => {
    const { id } = req.params;
    const user = getUserByCode(id);
    
    if (!user) {
        return res.status(404).send(renderLiveCodeNotFoundPage(id));
    }
    
    if (!user.active) {
        return res.status(403).send(`
            <html>
                <head><title>User Inactive</title></head>
                <body>
                    <h1>User tidak aktif</h1>
                    <p>User dengan live code "${id}" tidak aktif.</p>
                </body>
            </html>
        `);
    }
    
    // Serve firework overlay HTML
    res.sendFile(path.join(__dirname, '../frontend/client/pages/firework/index.html'));
});

// Route untuk jedagjedug overlay: /live/jedagjedug/:id
app.get('/live/jedagjedug/:id', (req, res) => {
    const { id } = req.params;
    const user = getUserByCode(id);
    
    if (!user) {
        return res.status(404).send(renderLiveCodeNotFoundPage(id));
    }
    
    if (!user.active) {
        return res.status(403).send(`
            <html>
                <head><title>User Inactive</title></head>
                <body>
                    <h1>User tidak aktif</h1>
                    <p>User dengan live code "${id}" tidak aktif.</p>
                </body>
            </html>
        `);
    }
    
    // Serve jedagjedug overlay HTML
    res.sendFile(path.join(__dirname, '../frontend/client/pages/jedagjedug/index.html'));
});

// Route untuk chat overlay: /live/chat/:id
app.get('/live/chat/:id', (req, res) => {
    const { id } = req.params;
    const user = getUserByCode(id);
    
    if (!user) {
        return res.status(404).send(renderLiveCodeNotFoundPage(id));
    }
    
    if (!user.active) {
        return res.status(403).send(`
            <html>
                <head><title>User Inactive</title></head>
                <body>
                    <h1>User tidak aktif</h1>
                    <p>User dengan live code "${id}" tidak aktif.</p>
                </body>
            </html>
        `);
    }
    
    // Serve chat overlay HTML
    res.sendFile(path.join(__dirname, '../frontend/client/pages/chat/index.html'));
});

// Route untuk follower alert overlay: /live/follower-alert/:id
app.get('/live/follower-alert/:id', (req, res) => {
    const { id } = req.params;
    const user = getUserByCode(id);
    
    if (!user) {
        return res.status(404).send(renderLiveCodeNotFoundPage(id));
    }
    
    if (!user.active) {
        return res.status(403).send(`
            <html>
                <head><title>User Inactive</title></head>
                <body>
                    <h1>User tidak aktif</h1>
                    <p>User dengan live code "${id}" tidak aktif.</p>
                </body>
            </html>
        `);
    }
    
    // Serve follower alert overlay HTML
    res.sendFile(path.join(__dirname, '../frontend/client/pages/follower-alert/index.html'));
});

// Route untuk gift alert overlay: /live/gift-alert/:id
app.get('/live/gift-alert/:id', (req, res) => {
    const { id } = req.params;
    const user = getUserByCode(id);
    
    if (!user) {
        return res.status(404).send(renderLiveCodeNotFoundPage(id));
    }
    
    if (!user.active) {
        return res.status(403).send(`
            <html>
                <head><title>User Inactive</title></head>
                <body>
                    <h1>User tidak aktif</h1>
                    <p>User dengan live code "${id}" tidak aktif.</p>
                </body>
            </html>
        `);
    }
    
    // Serve gift alert overlay HTML
    res.sendFile(path.join(__dirname, '../frontend/client/pages/gift-alert/index.html'));
});

// Route dinamis untuk overlay per user: /live/:code
// HARUS didefinisikan SETELAH route spesifik di atas agar tidak conflict
app.get('/live/:code', validateLiveCodeParam, (req, res) => {
    const { code } = req.params;
    const user = getUserByCode(code);
    
    if (!user) {
        return res.status(404).send(renderLiveCodeNotFoundPage(code));
    }
    
    if (!user.active) {
        const escapedCode = escapeHtml(code);
        return res.status(403).send(`
            <html>
                <head>
                    <title>User Inactive</title>
                    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
                </head>
                <body>
                    <h1>User tidak aktif</h1>
                    <p>User dengan live code "${escapedCode}" tidak aktif.</p>
                </body>
            </html>
        `);
    }
    
    // Validate path untuk mencegah path traversal
    const overlayPath = path.join(__dirname, '../frontend/client/pages/overlay/index.html');
    const allowedBaseDir = path.join(__dirname, '../frontend/client/pages/overlay');
    
    if (!validatePath(overlayPath, allowedBaseDir)) {
        return res.status(500).json({
            success: false,
            error: 'Invalid file path'
        });
    }
    
    // Serve overlay HTML dengan parameter code
    res.sendFile(overlayPath);
});

// Webhook endpoints dengan support username parameter
// Format: POST /webhook/:username/follower, /webhook/:username/gift, dll
app.post('/webhook/:username/follower', webhookLimiter, validateUsernameParam, validateWebhookFollower, (req, res) => {
    const { username: targetUsername } = req.params;
    
    if (!isFeatureEnabled('FOLLOWER_ALERT', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Follower alert disabled via feature flag',
            skipped: true 
        });
    }
    
    const { username, avatarUrl } = req.body;
    
    const event = {
        type: 'follower',
        data: {
            username: sanitizeString(username),
            avatarUrl: avatarUrl || null
        }
    };
    
    broadcastToClients(event, targetUsername);
    console.log(`👋 Follower event for ${targetUsername}: ${sanitizeString(username)}`);
    addLog(targetUsername, 'follower', `${sanitizeString(username)} mengikuti live`, { username: sanitizeString(username), avatarUrl });
    
    res.status(200).json({ success: true, event });
});

app.post('/webhook/:username/gift', webhookLimiter, validateUsernameParam, validateWebhookGift, (req, res) => {
    const { username: targetUsername } = req.params;
    
    if (!isFeatureEnabled('GIFT_ALERT', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Gift alert disabled via feature flag',
            skipped: true 
        });
    }
    
    const { username, giftName, quantity, avatarUrl, giftImageUrl } = req.body;
    
    const event = {
        type: 'gift',
        data: {
            username: sanitizeString(username),
            giftName: sanitizeString(giftName),
            quantity: parseInt(quantity),
            avatarUrl: avatarUrl || null,
            giftImageUrl: giftImageUrl || null
        }
    };
    
    broadcastToClients(event, targetUsername);
    console.log(`🎁 Gift event for ${targetUsername}: ${sanitizeString(username)} - ${quantity}x ${sanitizeString(giftName)}`);
    addLog(targetUsername, 'gift', `${sanitizeString(username)} mengirim ${quantity}x ${sanitizeString(giftName)}`, { username: sanitizeString(username), giftName: sanitizeString(giftName), quantity, avatarUrl, giftImageUrl });
    
    res.status(200).json({ success: true, event });
});

app.post('/webhook/:username/chat', webhookLimiter, validateUsernameParam, validateWebhookChat, (req, res) => {
    const { username: targetUsername } = req.params;
    
    if (!isFeatureEnabled('CHAT_OVERLAY', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Chat overlay disabled via feature flag',
            skipped: true 
        });
    }
    
    const { username, message } = req.body;
    
    const event = {
        type: 'chat',
        data: {
            username: sanitizeString(username),
            message: sanitizeString(message)
        }
    };
    
    // Update state: tambahkan chat message ke state user
    const state = getUserState(targetUsername);
    state.chatMessages.push({
        username: sanitizeString(username),
        message: sanitizeString(message),
        timestamp: Date.now()
    });
    // Batasi jumlah chat messages yang disimpan
    if (state.chatMessages.length > MAX_CHAT_MESSAGES) {
        state.chatMessages.shift(); // Hapus yang paling lama
    }
    state.lastUpdate = Date.now();
    
    broadcastToClients(event, targetUsername);
    console.log(`💬 Chat event for ${targetUsername}: ${sanitizeString(username)}: ${sanitizeString(message)}`);
    addLog(targetUsername, 'chat', `${sanitizeString(username)}: ${sanitizeString(message)}`, { username: sanitizeString(username), message: sanitizeString(message) });
    
    res.status(200).json({ success: true, event });
});

app.post('/webhook/:username/viewer', webhookLimiter, validateUsernameParam, [
    body('count')
        .notEmpty()
        .withMessage('Count wajib diisi')
        .isInt({ min: 0, max: 100000000 })
        .withMessage('Count harus berupa angka antara 0-100000000')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: errors.array()[0].msg
        });
    }
    
    const { username: targetUsername } = req.params;
    
    if (!isFeatureEnabled('VIEWER_COUNT', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Viewer count disabled via feature flag',
            skipped: true 
        });
    }
    
    const { count } = req.body;
    
    const event = {
        type: 'viewer',
        data: {
            count: parseInt(count)
        }
    };
    
    // Update state: update viewer count
    const state = getUserState(targetUsername);
    state.viewerCount = parseInt(count);
    state.lastUpdate = Date.now();
    
    broadcastToClients(event, targetUsername);
    console.log(`👁️ Viewer count for ${targetUsername}: ${count}`);
    addLog(targetUsername, 'viewer', `Viewer count: ${count}`, { count });
    
    res.status(200).json({ success: true, event });
});

app.post('/webhook/:username/banner', webhookLimiter, validateUsernameParam, validateWebhookBanner, (req, res) => {
    const { username: targetUsername } = req.params;
    
    if (!isFeatureEnabled('CUSTOM_BANNER', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Custom banner disabled via feature flag',
            skipped: true 
        });
    }
    
    const { text } = req.body;
    
    const event = {
        type: 'banner',
        data: {
            text: sanitizeString(text)
        }
    };
    
    // Update state: update banner text
    const state = getUserState(targetUsername);
    state.bannerText = sanitizeString(text);
    state.lastUpdate = Date.now();
    
    broadcastToClients(event, targetUsername);
    console.log(`📢 Banner for ${targetUsername}: ${sanitizeString(text)}`);
    
    res.status(200).json({ success: true, event });
});

app.post('/webhook/:username/floating-photo', webhookLimiter, validateUsernameParam, validateWebhookFloatingPhoto, (req, res) => {
    const { username: targetUsername } = req.params;
    
    if (!isFeatureEnabled('FLOATING_PHOTOS', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Floating photos disabled via feature flag',
            skipped: true 
        });
    }
    
    const { imageUrl, emoji } = req.body;
    
    const event = {
        type: 'floating-photo',
        data: {
            imageUrl: imageUrl || null,
            emoji: emoji ? sanitizeString(emoji) : null
        }
    };
    
    console.log(`🖼️ Floating photo event for ${targetUsername}`);
    broadcastToClients(event, targetUsername);
    console.log(`📡 Broadcasted to clients for user: ${targetUsername}`);
    
    res.status(200).json({ success: true, event });
});

// Endpoint untuk simulasi firework
app.post('/webhook/:username/firework', (req, res) => {
    const { username: targetUsername } = req.params;
    
    if (!isFeatureEnabled('FLOATING_PHOTOS', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Floating photos disabled via feature flag',
            skipped: true 
        });
    }
    
    const { imageUrl, emoji, centerX, centerY, count } = req.body;
    
    const event = {
        type: 'firework',
        data: {
            imageUrl: imageUrl || null,
            emoji: emoji || null,
            centerX: centerX !== undefined && centerX !== null ? parseInt(centerX) : null,
            centerY: centerY !== undefined && centerY !== null ? parseInt(centerY) : null,
            count: count !== undefined && count !== null ? parseInt(count) : 20
        }
    };
    
    console.log(`🎆 Firework event for ${targetUsername}:`, event);
    broadcastToClients(event, targetUsername);
    console.log(`📡 Broadcasted to clients for user: ${targetUsername}`);
    
    res.status(200).json({ success: true, event });
});

// Endpoint untuk simulasi jedag jedug
app.post('/webhook/:username/jedag-jedug', (req, res) => {
    const { username: targetUsername } = req.params;
    
    const { imageUrl, centerX, centerY } = req.body;
    
    const event = {
        type: 'jedag-jedug',
        data: {
            imageUrl: imageUrl || null,
            centerX: centerX !== undefined && centerX !== null ? parseInt(centerX) : null,
            centerY: centerY !== undefined && centerY !== null ? parseInt(centerY) : null
        }
    };
    
    broadcastToClients(event, targetUsername);
    console.log(`🎵 Jedag jedug event for ${targetUsername}`);
    
    res.status(200).json({ success: true, event });
});

// Serve control room dashboard
app.get('/control-room', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard/pages/control-room.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        connectedClients: allSockets.size,
        connectedUsers: Array.from(socketsByUser.keys()).map(username => ({
            username,
            socketCount: socketsByUser.get(username).size
        }))
    });
});

// Test endpoint untuk testing webhook
app.get('/test', (req, res) => {
    res.json({
        message: 'Webhook server is running!',
        endpoints: {
            // Default webhook endpoints (backward compatibility)
            webhook: 'POST /webhook/tiktok',
            follower: 'POST /webhook/follower',
            gift: 'POST /webhook/gift',
            chat: 'POST /webhook/chat',
            viewer: 'POST /webhook/viewer',
            banner: 'POST /webhook/banner',
            floatingPhoto: 'POST /webhook/floating-photo',
            events: 'GET /events (SSE)',
            
            // User-specific webhook endpoints
            userFollower: 'POST /webhook/:username/follower',
            userGift: 'POST /webhook/:username/gift',
            userChat: 'POST /webhook/:username/chat',
            userViewer: 'POST /webhook/:username/viewer',
            userBanner: 'POST /webhook/:username/banner',
            userFloatingPhoto: 'POST /webhook/:username/floating-photo',
            userEvents: 'GET /events/:username (SSE)',
            
            // User management endpoints
            listUsers: 'GET /api/users',
            getUser: 'GET /api/users/:username',
            createUser: 'POST /api/users',
            updateUser: 'PUT /api/users/:username',
            deleteUser: 'DELETE /api/users/:username',
            
            // User config endpoints
            getUserConfig: 'GET /api/users/:username/config',
            saveUserConfig: 'PUT /api/users/:username/config',
            
            // Overlay routes
            live: 'GET /live/:code',
            liveEvents: 'GET /events/code/:code',
            
            // Other endpoints
            health: 'GET /health',
            controlRoom: 'GET /control-room'
        }
    });
});

// Start server dengan Socket.IO
server.listen(PORT, () => {
    console.log(`🚀 Webhook server running on http://localhost:${PORT}`);
    console.log(`📡 Webhook endpoints available at http://localhost:${PORT}/webhook/*`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
    console.log(`\n🎬 TikTok Live Connector endpoints:`);
    console.log(`   POST /tiktok/connect - Connect to TikTok Live`);
    console.log(`   POST /tiktok/disconnect - Disconnect from TikTok Live`);
    console.log(`   GET /tiktok/state - Get connection state`);
    console.log(`   GET /tiktok/room-info - Get room information`);
    console.log(`   GET /tiktok/gifts - Get available gifts`);
    console.log(`\n👥 Multi-User Endpoints:`);
    console.log(`   GET /api/users - List all users`);
    console.log(`   POST /api/users - Create new user`);
    console.log(`   GET /api/users/:username - Get user info`);
    console.log(`   PUT /api/users/:username - Update user`);
    console.log(`   DELETE /api/users/:username - Delete user`);
    console.log(`   GET /api/users/:username/config - Get user config`);
    console.log(`   PUT /api/users/:username/config - Save user config`);
    console.log(`   GET /live/:code - Overlay page for user (using live code)`);
    console.log(`   GET /events/code/:code - SSE events for user (using live code)`);
    console.log(`   GET /events/:username - SSE events for user (backward compatibility)`);
    console.log(`   POST /webhook/:username/* - Webhook endpoints for user`);
    console.log(`\n💡 TikTok connector tidak lagi auto-connect. Gunakan tombol Start di Control Room untuk connect.`);
    console.log(`   Endpoint: POST /api/users/:username/tiktok/connect`);
    
    // TikTok connector tidak lagi auto-connect saat startup
    // Gunakan tombol Start di Control Room untuk connect secara manual
    // initTikTokConnector(); // Disabled - use manual connect via Control Room
});

