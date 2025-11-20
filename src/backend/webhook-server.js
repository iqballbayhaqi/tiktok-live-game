// Webhook Server untuk TikTok Live Overlay
// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const TikTokConnector = require('./tiktok-connector');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Landing page - route utama (harus sebelum static files)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/client/pages/landing.html'));
});

// Serve static files untuk Dashboard
app.use('/dashboard/css', express.static(path.join(__dirname, '../frontend/dashboard/css')));
app.use('/dashboard/js', express.static(path.join(__dirname, '../frontend/dashboard/js')));
app.use('/dashboard/components', express.static(path.join(__dirname, '../frontend/dashboard/components')));

// Serve static files untuk Client
app.use('/css', express.static(path.join(__dirname, '../frontend/client/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/client/js')));
app.use('/components', express.static(path.join(__dirname, '../frontend/client/components')));

// Serve shared files
app.use('/shared/js', express.static(path.join(__dirname, '../frontend/shared/js')));

// Serve config files
app.use('/config', express.static(path.join(__dirname, '../../config')));

// Serve static files untuk src (untuk file musik dan assets lainnya)
app.use('/src', express.static(path.join(__dirname, '../')));

// Serve static files untuk assets (musik, images, dll)
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Store connected clients (untuk WebSocket atau Server-Sent Events)
// Struktur: { username: Set<client> }
const clientsByUser = new Map();
const clients = new Set(); // Untuk backward compatibility

// TikTok Live Connector instances per user
// Struktur: { username: TikTokConnector }
const tiktokConnectors = new Map();
let tiktokConnector = null; // Untuk backward compatibility

// Log storage per user
// Struktur: { username: Array<{timestamp, type, message, data}> }
const userLogs = new Map();
const MAX_LOG_ENTRIES = 500; // Maksimal 500 log entries per user

// Helper functions untuk manage users
function getUsersFilePath() {
    return path.join(__dirname, '../../config/users.json');
}

function getUserConfigPath(username) {
    return path.join(__dirname, '../../config/users', `${username}.json`);
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

// Broadcast function untuk TikTok events
function broadcastToClients(event, username = null) {
    const message = `data: ${JSON.stringify(event)}\n\n`;
    
    if (username) {
        // Broadcast ke clients untuk user tertentu
        const userClients = clientsByUser.get(username);
        if (userClients) {
            console.log(`📤 Broadcasting event "${event.type}" to ${userClients.size} client(s) for user: ${username}`);
            userClients.forEach(client => {
                try {
                    client.write(message);
                } catch (error) {
                    console.error(`Error broadcasting to client for ${username}:`, error);
                    userClients.delete(client);
                }
            });
        } else {
            console.warn(`⚠️ No clients found for user: ${username}. Available users: ${Array.from(clientsByUser.keys()).join(', ')}`);
        }
    } else {
        // Broadcast ke semua clients (backward compatibility)
        clients.forEach(client => {
            try {
                client.write(message);
            } catch (error) {
                console.error('Error broadcasting to client:', error);
                clients.delete(client);
            }
        });
        
        // Juga broadcast ke semua user-specific clients
        clientsByUser.forEach((userClients, user) => {
            userClients.forEach(client => {
                try {
                    client.write(message);
                } catch (error) {
                    console.error(`Error broadcasting to client for ${user}:`, error);
                    userClients.delete(client);
                }
            });
        });
    }
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
        
        const options = {
            sessionId: process.env.TIKTOK_SESSION_ID || null,
            ttTargetIdc: process.env.TIKTOK_TT_TARGET_IDC || null
        };
        
        tiktokConnector.connect(tiktokUsername, options).catch(err => {
            console.error('Failed to connect to TikTok Live:', err);
        });
    } else {
        console.log('ℹ️ TikTok username not set. Set TIKTOK_USERNAME environment variable to enable auto-connect.');
    }
}

// Webhook endpoint untuk TikTok Live events
app.post('/webhook/tiktok', (req, res) => {
    try {
        const event = req.body;
        
        console.log('📥 Webhook received:', event);
        
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
            error: error.message 
        });
    }
});

// Endpoint untuk follower event
app.post('/webhook/follower', (req, res) => {
    // Check feature flag
    if (!isFeatureEnabled('FOLLOWER_ALERT', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Follower alert disabled via feature flag',
            skipped: true 
        });
    }
    
    const { username, avatarUrl } = req.body;
    
    if (!username) {
        return res.status(400).json({ 
            success: false, 
            error: 'Username is required' 
        });
    }
    
    const event = {
        type: 'follower',
        data: {
            username: username,
            avatarUrl: avatarUrl || null
        }
    };
    
    broadcastToClients(event);
    console.log(`👋 Follower event: ${username}`);
    
    res.status(200).json({ success: true, event });
});

// Endpoint untuk gift event
app.post('/webhook/gift', (req, res) => {
    // Check feature flag
    if (!isFeatureEnabled('GIFT_ALERT', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Gift alert disabled via feature flag',
            skipped: true 
        });
    }
    
    const { username, giftName, quantity, avatarUrl, giftImageUrl } = req.body;
    
    if (!username || !giftName || !quantity) {
        return res.status(400).json({ 
            success: false, 
            error: 'Username, giftName, and quantity are required' 
        });
    }
    
    const event = {
        type: 'gift',
        data: {
            username: username,
            giftName: giftName,
            quantity: parseInt(quantity),
            avatarUrl: avatarUrl || null,
            giftImageUrl: giftImageUrl || null
        }
    };
    
    broadcastToClients(event);
    console.log(`🎁 Gift event: ${username} - ${quantity}x ${giftName}`);
    
    res.status(200).json({ success: true, event });
});

// Endpoint untuk chat event
app.post('/webhook/chat', (req, res) => {
    // Check feature flag
    if (!isFeatureEnabled('CHAT_OVERLAY', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Chat overlay disabled via feature flag',
            skipped: true 
        });
    }
    
    const { username, message } = req.body;
    
    if (!username || !message) {
        return res.status(400).json({ 
            success: false, 
            error: 'Username and message are required' 
        });
    }
    
    const event = {
        type: 'chat',
        data: {
            username: username,
            message: message
        }
    };
    
    broadcastToClients(event);
    console.log(`💬 Chat event: ${username}: ${message}`);
    
    res.status(200).json({ success: true, event });
});

// Endpoint untuk viewer count update
app.post('/webhook/viewer', (req, res) => {
    // Check feature flag
    if (!isFeatureEnabled('VIEWER_COUNT', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Viewer count disabled via feature flag',
            skipped: true 
        });
    }
    
    const { count } = req.body;
    
    if (count === undefined) {
        return res.status(400).json({ 
            success: false, 
            error: 'Count is required' 
        });
    }
    
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
app.post('/webhook/banner', (req, res) => {
    // Check feature flag
    if (!isFeatureEnabled('CUSTOM_BANNER', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Custom banner disabled via feature flag',
            skipped: true 
        });
    }
    
    const { text } = req.body;
    
    if (!text) {
        return res.status(400).json({ 
            success: false, 
            error: 'Text is required' 
        });
    }
    
    const event = {
        type: 'banner',
        data: {
            text: text
        }
    };
    
    broadcastToClients(event);
    console.log(`📢 Banner: ${text}`);
    
    res.status(200).json({ success: true, event });
});

// Endpoint untuk floating photo
app.post('/webhook/floating-photo', (req, res) => {
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
            emoji: emoji || null
        }
    };
    
    broadcastToClients(event);
    console.log(`🖼️ Floating photo event`);
    
    res.status(200).json({ success: true, event });
});

// Server-Sent Events untuk real-time updates ke overlay
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    clients.add(res);
    
    console.log(`✅ Client connected. Total clients: ${clients.size}`);
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to webhook server' })}\n\n`);
    
    // Handle client disconnect
    req.on('close', () => {
        clients.delete(res);
        console.log(`❌ Client disconnected. Total clients: ${clients.size}`);
    });
});

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
app.get('/api/config', (req, res) => {
    try {
        const configPath = path.join(__dirname, '../../config/config.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        res.status(200).json({ success: true, config });
    } catch (error) {
        console.error('Error reading config:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get list of music files
app.get('/api/music', (req, res) => {
    try {
        const musicDir = path.join(__dirname, '../assets/music');
        
        // Check if directory exists
        if (!fs.existsSync(musicDir)) {
            return res.status(200).json({ success: true, music: [] });
        }
        
        // Read directory and filter for audio files
        const files = fs.readdirSync(musicDir);
        const musicFiles = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext);
            })
            .map(file => {
                const filePath = `/assets/music/${file}`;
                const fullPath = path.join(musicDir, file);
                const stats = fs.statSync(fullPath);
                
                // Try to get duration from filename or metadata (simplified - actual duration detection would need audio library)
                // For now, we'll return the file info and let frontend handle duration detection
                return {
                    path: filePath,
                    name: file,
                    filename: path.basename(file, path.extname(file)),
                    size: stats.size,
                    modified: stats.mtime
                };
            });
        
        res.status(200).json({ success: true, music: musicFiles });
    } catch (error) {
        console.error('Error reading music directory:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Save config.json
app.put('/api/config', (req, res) => {
    try {
        const { config } = req.body;
        
        if (!config) {
            return res.status(400).json({ 
                success: false, 
                error: 'Config data is required' 
            });
        }

        // Validate JSON structure
        JSON.stringify(config);

        const configPath = path.join(__dirname, '../../config/config.json');
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
            error: error.message 
        });
    }
});

// ============================================
// API Endpoints untuk User Management
// ============================================

// Get all users
app.get('/api/users', (req, res) => {
    try {
        const usersData = loadUsers();
        res.status(200).json({ success: true, users: usersData.users });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get user by username
app.get('/api/users/:username', (req, res) => {
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
            error: error.message 
        });
    }
});

// Create new user
app.post('/api/users', (req, res) => {
    try {
        const { username, displayName } = req.body;
        
        if (!username) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username is required' 
            });
        }
        
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
            error: error.message 
        });
    }
});

// Update user
app.put('/api/users/:username', (req, res) => {
    try {
        const { username } = req.params;
        const updates = req.body;
        
        // Jangan izinkan update username
        delete updates.username;
        
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
            error: error.message 
        });
    }
});

// Delete user
app.delete('/api/users/:username', (req, res) => {
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
            error: error.message 
        });
    }
});

// ============================================
// API Endpoints untuk Config per User
// ============================================

// Get config untuk user tertentu
app.get('/api/users/:username/config', (req, res) => {
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
            error: error.message 
        });
    }
});

// Save config untuk user tertentu
app.put('/api/users/:username/config', (req, res) => {
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
        JSON.stringify(config);

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
            error: error.message 
        });
    }
});

// ============================================
// API Endpoints untuk Log per User
// ============================================

// Get logs untuk user tertentu
app.get('/api/users/:username/logs', (req, res) => {
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
            error: error.message 
        });
    }
});

// Clear logs untuk user tertentu
app.delete('/api/users/:username/logs', (req, res) => {
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
            error: error.message 
        });
    }
});

// ============================================
// Route Dinamis untuk Overlay per User
// ============================================

// IMPORTANT: Route yang lebih spesifik harus didefinisikan SEBELUM route yang lebih umum
// Urutan: /live/floating-photos/:id, /live/firework/:id, /live/jedagjedug/:id, /live/chat/:id, /live/follower-alert/:id, /live/gift-alert/:id, kemudian /live/:code

// Route untuk floating-photos overlay: /live/floating-photos/:id
app.get('/live/floating-photos/:id', (req, res) => {
    const { id } = req.params;
    const user = getUserByCode(id);
    
    if (!user) {
        return res.status(404).send(`
            <html>
                <head><title>Live Code Not Found</title></head>
                <body>
                    <h1>Live code tidak ditemukan</h1>
                    <p>Live code "${id}" tidak ditemukan atau tidak valid.</p>
                    <p><a href="/api/users">Lihat daftar users</a></p>
                </body>
            </html>
        `);
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
    
    // Serve floating-photos overlay HTML
    res.sendFile(path.join(__dirname, '../frontend/client/pages/floating-photos.html'));
});

// Route untuk firework overlay: /live/firework/:id
app.get('/live/firework/:id', (req, res) => {
    const { id } = req.params;
    const user = getUserByCode(id);
    
    if (!user) {
        return res.status(404).send(`
            <html>
                <head><title>Live Code Not Found</title></head>
                <body>
                    <h1>Live code tidak ditemukan</h1>
                    <p>Live code "${id}" tidak ditemukan atau tidak valid.</p>
                    <p><a href="/api/users">Lihat daftar users</a></p>
                </body>
            </html>
        `);
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
    res.sendFile(path.join(__dirname, '../frontend/client/pages/firework.html'));
});

// Route untuk jedagjedug overlay: /live/jedagjedug/:id
app.get('/live/jedagjedug/:id', (req, res) => {
    const { id } = req.params;
    const user = getUserByCode(id);
    
    if (!user) {
        return res.status(404).send(`
            <html>
                <head><title>Live Code Not Found</title></head>
                <body>
                    <h1>Live code tidak ditemukan</h1>
                    <p>Live code "${id}" tidak ditemukan atau tidak valid.</p>
                    <p><a href="/api/users">Lihat daftar users</a></p>
                </body>
            </html>
        `);
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
    res.sendFile(path.join(__dirname, '../frontend/client/pages/jedagjedug.html'));
});

// Route untuk chat overlay: /live/chat/:id
app.get('/live/chat/:id', (req, res) => {
    const { id } = req.params;
    const user = getUserByCode(id);
    
    if (!user) {
        return res.status(404).send(`
            <html>
                <head><title>Live Code Not Found</title></head>
                <body>
                    <h1>Live code tidak ditemukan</h1>
                    <p>Live code "${id}" tidak ditemukan atau tidak valid.</p>
                    <p><a href="/api/users">Lihat daftar users</a></p>
                </body>
            </html>
        `);
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
    res.sendFile(path.join(__dirname, '../frontend/client/pages/chat.html'));
});

// Route untuk follower alert overlay: /live/follower-alert/:id
app.get('/live/follower-alert/:id', (req, res) => {
    const { id } = req.params;
    const user = getUserByCode(id);
    
    if (!user) {
        return res.status(404).send(`
            <html>
                <head><title>Live Code Not Found</title></head>
                <body>
                    <h1>Live code tidak ditemukan</h1>
                    <p>Live code "${id}" tidak ditemukan atau tidak valid.</p>
                    <p><a href="/api/users">Lihat daftar users</a></p>
                </body>
            </html>
        `);
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
    res.sendFile(path.join(__dirname, '../frontend/client/pages/follower-alert.html'));
});

// Route untuk gift alert overlay: /live/gift-alert/:id
app.get('/live/gift-alert/:id', (req, res) => {
    const { id } = req.params;
    const user = getUserByCode(id);
    
    if (!user) {
        return res.status(404).send(`
            <html>
                <head><title>Live Code Not Found</title></head>
                <body>
                    <h1>Live code tidak ditemukan</h1>
                    <p>Live code "${id}" tidak ditemukan atau tidak valid.</p>
                    <p><a href="/api/users">Lihat daftar users</a></p>
                </body>
            </html>
        `);
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
    res.sendFile(path.join(__dirname, '../frontend/client/pages/gift-alert.html'));
});

// Route dinamis untuk overlay per user: /live/:code
// HARUS didefinisikan SETELAH route spesifik di atas agar tidak conflict
app.get('/live/:code', (req, res) => {
    const { code } = req.params;
    const user = getUserByCode(code);
    
    if (!user) {
        return res.status(404).send(`
            <html>
                <head><title>Live Code Not Found</title></head>
                <body>
                    <h1>Live code tidak ditemukan</h1>
                    <p>Live code "${code}" tidak ditemukan atau tidak valid.</p>
                    <p><a href="/api/users">Lihat daftar users</a></p>
                </body>
            </html>
        `);
    }
    
    if (!user.active) {
        return res.status(403).send(`
            <html>
                <head><title>User Inactive</title></head>
                <body>
                    <h1>User tidak aktif</h1>
                    <p>User dengan live code "${code}" tidak aktif.</p>
                </body>
            </html>
        `);
    }
    
    // Serve overlay HTML dengan parameter code
    res.sendFile(path.join(__dirname, '../frontend/client/pages/index.html'));
});

// Server-Sent Events untuk user tertentu berdasarkan code: /events/code/:code
app.get('/events/code/:code', (req, res) => {
    const { code } = req.params;
    const user = getUserByCode(code);
    
    if (!user) {
        return res.status(404).json({ 
            success: false, 
            error: 'Live code not found' 
        });
    }
    
    if (!user.active) {
        return res.status(403).json({ 
            success: false, 
            error: 'User is not active' 
        });
    }
    
    const username = user.username;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Tambahkan client ke Set untuk user ini (menggunakan username sebagai key)
    if (!clientsByUser.has(username)) {
        clientsByUser.set(username, new Set());
    }
    clientsByUser.get(username).add(res);
    
    console.log(`✅ Client connected for user ${username} (code: ${code}). Total clients for this user: ${clientsByUser.get(username).size}`);
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: `Connected to webhook server for user: ${username}`, username: username, liveCode: code })}\n\n`);
    
    // Handle client disconnect
    req.on('close', () => {
        const userClients = clientsByUser.get(username);
        if (userClients) {
            userClients.delete(res);
            console.log(`❌ Client disconnected for user ${username} (code: ${code}). Total clients for this user: ${userClients.size}`);
            
            // Hapus Set jika kosong
            if (userClients.size === 0) {
                clientsByUser.delete(username);
            }
        }
    });
});

// Backward compatibility: /events/:username (masih support untuk compatibility)
app.get('/events/:username', (req, res) => {
    const { username } = req.params;
    const user = getUserByUsername(username);
    
    if (!user) {
        return res.status(404).json({ 
            success: false, 
            error: 'User not found' 
        });
    }
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Tambahkan client ke Set untuk user ini
    if (!clientsByUser.has(username)) {
        clientsByUser.set(username, new Set());
    }
    clientsByUser.get(username).add(res);
    
    console.log(`✅ Client connected for user ${username}. Total clients for this user: ${clientsByUser.get(username).size}`);
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: `Connected to webhook server for user: ${username}`, username: username })}\n\n`);
    
    // Handle client disconnect
    req.on('close', () => {
        const userClients = clientsByUser.get(username);
        if (userClients) {
            userClients.delete(res);
            console.log(`❌ Client disconnected for user ${username}. Total clients for this user: ${userClients.size}`);
            
            // Hapus Set jika kosong
            if (userClients.size === 0) {
                clientsByUser.delete(username);
            }
        }
    });
});

// Webhook endpoints dengan support username parameter
// Format: POST /webhook/:username/follower, /webhook/:username/gift, dll
app.post('/webhook/:username/follower', (req, res) => {
    const { username: targetUsername } = req.params;
    
    if (!isFeatureEnabled('FOLLOWER_ALERT', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Follower alert disabled via feature flag',
            skipped: true 
        });
    }
    
    const { username, avatarUrl } = req.body;
    
    if (!username) {
        return res.status(400).json({ 
            success: false, 
            error: 'Username is required' 
        });
    }
    
    const event = {
        type: 'follower',
        data: {
            username: username,
            avatarUrl: avatarUrl || null
        }
    };
    
    broadcastToClients(event, targetUsername);
    console.log(`👋 Follower event for ${targetUsername}: ${username}`);
    addLog(targetUsername, 'follower', `${username} mengikuti live`, { username, avatarUrl });
    
    res.status(200).json({ success: true, event });
});

app.post('/webhook/:username/gift', (req, res) => {
    const { username: targetUsername } = req.params;
    
    if (!isFeatureEnabled('GIFT_ALERT', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Gift alert disabled via feature flag',
            skipped: true 
        });
    }
    
    const { username, giftName, quantity, avatarUrl, giftImageUrl } = req.body;
    
    if (!username || !giftName || !quantity) {
        return res.status(400).json({ 
            success: false, 
            error: 'Username, giftName, and quantity are required' 
        });
    }
    
    const event = {
        type: 'gift',
        data: {
            username: username,
            giftName: giftName,
            quantity: parseInt(quantity),
            avatarUrl: avatarUrl || null,
            giftImageUrl: giftImageUrl || null
        }
    };
    
    broadcastToClients(event, targetUsername);
    console.log(`🎁 Gift event for ${targetUsername}: ${username} - ${quantity}x ${giftName}`);
    addLog(targetUsername, 'gift', `${username} mengirim ${quantity}x ${giftName}`, { username, giftName, quantity, avatarUrl, giftImageUrl });
    
    res.status(200).json({ success: true, event });
});

app.post('/webhook/:username/chat', (req, res) => {
    const { username: targetUsername } = req.params;
    
    if (!isFeatureEnabled('CHAT_OVERLAY', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Chat overlay disabled via feature flag',
            skipped: true 
        });
    }
    
    const { username, message } = req.body;
    
    if (!username || !message) {
        return res.status(400).json({ 
            success: false, 
            error: 'Username and message are required' 
        });
    }
    
    const event = {
        type: 'chat',
        data: {
            username: username,
            message: message
        }
    };
    
    broadcastToClients(event, targetUsername);
    console.log(`💬 Chat event for ${targetUsername}: ${username}: ${message}`);
    addLog(targetUsername, 'chat', `${username}: ${message}`, { username, message });
    
    res.status(200).json({ success: true, event });
});

app.post('/webhook/:username/viewer', (req, res) => {
    const { username: targetUsername } = req.params;
    
    if (!isFeatureEnabled('VIEWER_COUNT', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Viewer count disabled via feature flag',
            skipped: true 
        });
    }
    
    const { count } = req.body;
    
    if (count === undefined) {
        return res.status(400).json({ 
            success: false, 
            error: 'Count is required' 
        });
    }
    
    const event = {
        type: 'viewer',
        data: {
            count: parseInt(count)
        }
    };
    
    broadcastToClients(event, targetUsername);
    console.log(`👁️ Viewer count for ${targetUsername}: ${count}`);
    addLog(targetUsername, 'viewer', `Viewer count: ${count}`, { count });
    
    res.status(200).json({ success: true, event });
});

app.post('/webhook/:username/banner', (req, res) => {
    const { username: targetUsername } = req.params;
    
    if (!isFeatureEnabled('CUSTOM_BANNER', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Custom banner disabled via feature flag',
            skipped: true 
        });
    }
    
    const { text } = req.body;
    
    if (!text) {
        return res.status(400).json({ 
            success: false, 
            error: 'Text is required' 
        });
    }
    
    const event = {
        type: 'banner',
        data: {
            text: text
        }
    };
    
    broadcastToClients(event, targetUsername);
    console.log(`📢 Banner for ${targetUsername}: ${text}`);
    
    res.status(200).json({ success: true, event });
});

app.post('/webhook/:username/floating-photo', (req, res) => {
    const { username: targetUsername } = req.params;
    
    if (!isFeatureEnabled('FLOATING_PHOTOS', true)) {
        return res.status(200).json({ 
            success: true, 
            message: 'Floating photos disabled via feature flag',
            skipped: true 
        });
    }
    
    const { imageUrl, emoji } = req.body;
    
    // Tidak perlu validasi strict, biarkan null jika tidak ada
    const event = {
        type: 'floating-photo',
        data: {
            imageUrl: imageUrl || null,
            emoji: emoji || null
        }
    };
    
    console.log(`🖼️ Floating photo event for ${targetUsername}:`, event);
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
        connectedClients: clients.size
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

// Start server
app.listen(PORT, () => {
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

