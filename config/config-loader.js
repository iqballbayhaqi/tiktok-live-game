// Config Loader untuk Overlay TikTok Live
// Load config dari JSON file

// Default config jika gagal load
const defaultConfig = {
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
    puzzlePhoto: {
        coin3x3: 1,
        coin4x4: 10
    }
};

// Load config dari JSON file (untuk browser)
let OverlayConfig = null;

// Function untuk reload config secara dinamis (untuk real-time updates)
function reloadConfigFromServer() {
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        const liveCode = getLiveCodeFromUrl() || window.currentLiveCode;
        const username = getUsernameFromUrl() || window.currentUsername;
        let configUrl;
        let identifier = null;
        
        if (liveCode) {
            // Reload config berdasarkan live code
            fetch(`/api/users`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.users) {
                        const user = data.users.find(u => u.liveCode === liveCode);
                        if (user) {
                            identifier = user.username;
                            return fetch(`/api/users/${encodeURIComponent(user.username)}/config?` + Date.now());
                        }
                    }
                    throw new Error('User not found for live code');
                })
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    throw new Error('Config file not found');
                })
                .then(data => {
                    console.log('data config reload:', data);
                    
                    const config = data.config || data;
                    OverlayConfig = mergeConfig(config);
                    console.log('OverlayConfig:', OverlayConfig);
                    
                    syncConfigFlags();
                    if (typeof window !== 'undefined') {
                        window.OverlayConfig = OverlayConfig;
                        console.log(`✅ Config reloaded from server for live code: ${liveCode}`);
                        if (typeof window.dispatchEvent !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('configReloaded', { detail: { liveCode, username: identifier, config: OverlayConfig } }));
                        }
                    }
                })
                .catch(error => {
                    console.warn('⚠️ Failed to reload config from server:', error);
                });
            return; // Early return untuk live code
        } else if (username) {
            configUrl = `/api/users/${encodeURIComponent(username)}/config?` + Date.now();
            identifier = username;
        } else {
            configUrl = '/config/config.json?' + Date.now();
        }
        
        fetch(configUrl) // Cache busting
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Config file not found');
            })
            .then(data => {
                const config = data.config || data;
                OverlayConfig = mergeConfig(config);
                syncConfigFlags();
                if (typeof window !== 'undefined') {
                    window.OverlayConfig = OverlayConfig;
                    console.log(`✅ Config reloaded from server${identifier ? ` for user: ${identifier}` : ''}`);
                    // Trigger custom event untuk notify bahwa config sudah reloaded
                    if (typeof window.dispatchEvent !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('configReloaded', { detail: { username: identifier, config: OverlayConfig } }));
                    }
                }
            })
            .catch(error => {
                console.warn('⚠️ Failed to reload config from server:', error);
            });
    }
}

// Function untuk mendapatkan live code dari URL
function getLiveCodeFromUrl() {
    if (typeof window === 'undefined') return null;
    
    const pathname = window.location.pathname;
    
    // Cek pattern untuk overlay khusus: /live/floating-photos/:id, /live/firework/:id, /live/jedagjedug/:id, /live/chat/:id, /live/follower-alert/:id, /live/gift-alert/:id
    const specialOverlayMatch = pathname.match(/^\/live\/(floating-photos|firework|jedagjedug|chat|follower-alert|gift-alert|puzzle-photo)\/([^\/\?]+)/);
    if (specialOverlayMatch && specialOverlayMatch[2]) {
        // Return live code (ID) dari pattern khusus
        return specialOverlayMatch[2];
    }
    
    // Cek jika URL path adalah /live/:code (main overlay)
    const pathMatch = pathname.match(/^\/live\/([^\/\?]+)/);
    if (pathMatch && pathMatch[1]) {
        return pathMatch[1];
    }
    
    return null;
}

// Function untuk mendapatkan username dari URL (backward compatibility)
function getUsernameFromUrl() {
    if (typeof window === 'undefined') return null;
    
    // Cek jika URL path adalah /overlay/:username (backward compatibility)
    const pathMatch = window.location.pathname.match(/^\/overlay\/([^\/]+)/);
    if (pathMatch && pathMatch[1]) {
        return pathMatch[1];
    }
    
    return null;
}

// Function untuk load config
function loadConfig() {
    // Untuk browser: load dari fetch atau gunakan default
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        const liveCode = getLiveCodeFromUrl();
        const username = getUsernameFromUrl(); // Backward compatibility
        let configUrl;
        let identifier = null;
        
        if (liveCode) {
            // Load config berdasarkan live code
            // Pertama, cari user berdasarkan code untuk mendapatkan username
            fetch(`/api/users`)
                .then(response => response.json())
                .then(data => {
                    
                    if (data.success && data.users) {
                        const user = data.users.find(u => u.liveCode === liveCode);
                        
                        if (user) {
                            identifier = user.username;
                            window.currentUsername = user.username;
                            window.currentLiveCode = liveCode;
                            // Load config untuk user ini
                            
                            return fetch(`/api/users/${encodeURIComponent(user.username)}/config`);
                        }
                    }
                    throw new Error('User not found for live code');
                })
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    throw new Error('Config file not found');
                })
                .then(data => {
                    const config = data.config || data;
                    console.log('config => ', config);
                    
                    OverlayConfig = mergeConfig(config);
                    syncConfigFlags();
                    if (typeof window !== 'undefined') {
                        window.OverlayConfig = OverlayConfig;
                        console.log(`✅ Config berhasil dimuat untuk live code: ${liveCode}`);
                        if (typeof window.dispatchEvent !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('configLoaded', { detail: { liveCode, username: identifier, config: OverlayConfig } }));
                        }
                    }
                })
                .catch(error => {
                    console.warn(`⚠️ Failed to load config for live code ${liveCode}, using default config:`, error);
                    OverlayConfig = mergeConfig(defaultConfig);
                    syncConfigFlags();
                    if (typeof window !== 'undefined') {
                        window.OverlayConfig = OverlayConfig;
                        window.currentLiveCode = liveCode;
                        if (typeof window.dispatchEvent !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('configLoaded', { detail: { liveCode, config: OverlayConfig } }));
                        }
                    }
                });
            return; // Early return untuk live code
        } else if (username) {
            // Load config per user (backward compatibility)
            configUrl = `/api/users/${encodeURIComponent(username)}/config`;
            identifier = username;
            console.log(`📋 Loading config for user: ${username}`);
        } else {
            // Load default config
            configUrl = '/config/config.json';
        }
        
        // Try to load from config endpoint
        fetch(configUrl)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Config file not found');
            })
            .then(data => {
                // Jika dari API, data ada di property 'config'
                const config = data.config || data;
                console.log('config => ', config);
                
                OverlayConfig = mergeConfig(config);
                syncConfigFlags();
                if (typeof window !== 'undefined') {
                    window.OverlayConfig = OverlayConfig;
                    window.currentUsername = identifier; // Simpan username untuk digunakan di script.js
                    console.log(`✅ Config berhasil dimuat${identifier ? ` untuk user: ${identifier}` : ' dari config.json'}`);
                    // Trigger custom event untuk notify bahwa config sudah loaded
                    if (typeof window.dispatchEvent !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('configLoaded', { detail: { username: identifier, config: OverlayConfig } }));
                    }
                }
            })
            .catch(error => {
                console.warn(`⚠️ Failed to load config${identifier ? ` for user ${identifier}` : ''}, using default config:`, error);
                OverlayConfig = mergeConfig(defaultConfig);
                syncConfigFlags();
                if (typeof window !== 'undefined') {
                    window.OverlayConfig = OverlayConfig;
                    window.currentUsername = identifier;
                    // Trigger custom event untuk notify bahwa config sudah loaded
                    if (typeof window.dispatchEvent !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('configLoaded', { detail: { username: identifier, config: OverlayConfig } }));
                    }
                }
            });
    } else {
        // Untuk Node.js: load dari require
        try {
            const fs = require('fs');
            const path = require('path');
            const configPath = path.join(__dirname, 'config.json');
            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);
            OverlayConfig = mergeConfig(config);
            syncConfigFlags();
        } catch (error) {
            console.warn('⚠️ Failed to load config.json, using default config:', error);
            OverlayConfig = mergeConfig(defaultConfig);
            syncConfigFlags();
        }
    }
}

// Merge config dengan default values
function mergeConfig(config) {
    // Gunakan nilai dari config.json, atau default jika tidak ada
    const getDefaultValue = (configValue, defaultValue = true) => {
        return configValue !== undefined ? configValue : defaultValue;
    };
    
    const featureFlags = {
        followerAlert: getDefaultValue(config.features?.followerAlert, true),
        giftAlert: getDefaultValue(config.features?.giftAlert, true),
        chatOverlay: getDefaultValue(config.features?.chatOverlay, true),
        streamTimer: getDefaultValue(config.features?.streamTimer, true),
        viewerCount: getDefaultValue(config.features?.viewerCount, true),
        customBanner: getDefaultValue(config.features?.customBanner, true),
        floatingPhotos: getDefaultValue(config.features?.floatingPhotos, true),
        animations: getDefaultValue(config.features?.animations, true),
        tiktokConnector: getDefaultValue(config.features?.tiktokConnector, true),
        webhookConnection: getDefaultValue(config.features?.webhookConnection, true)
    };

    // Merge floatingPhotos config jika ada
    const floatingPhotosConfig = config.floatingPhotos || defaultConfig.floatingPhotos;

    // Merge alerts dengan default structure
    const alerts = {
        follower: {
            ...defaultConfig.alerts.follower,
            ...config.alerts?.follower,
            enabled: getDefaultValue(config.alerts?.follower?.enabled, defaultConfig.alerts.follower.enabled)
        },
        gift: {
            ...defaultConfig.alerts.gift,
            ...config.alerts?.gift,
            enabled: getDefaultValue(config.alerts?.gift?.enabled, defaultConfig.alerts.gift.enabled)
        }
    };

    // Merge chat dengan default structure
    const chat = {
        ...defaultConfig.chat,
        ...config.chat,
        enabled: getDefaultValue(config.chat?.enabled, defaultConfig.chat.enabled)
    };

    // Merge widgets dengan default structure
    const widgets = {
        ...defaultConfig.widgets,
        ...config.widgets,
        streamTimer: {
            ...defaultConfig.widgets.streamTimer,
            ...config.widgets?.streamTimer,
            enabled: getDefaultValue(config.widgets?.streamTimer?.enabled, defaultConfig.widgets.streamTimer.enabled)
        },
        viewerCount: {
            ...defaultConfig.widgets.viewerCount,
            ...config.widgets?.viewerCount,
            enabled: getDefaultValue(config.widgets?.viewerCount?.enabled, defaultConfig.widgets.viewerCount.enabled)
        }
    };

    // Merge animations dengan default structure
    const animations = {
        ...defaultConfig.animations,
        ...config.animations,
        enabled: getDefaultValue(config.animations?.enabled, defaultConfig.animations.enabled)
    };

    return {
        ...defaultConfig,
        ...config,
        features: featureFlags,
        alerts: alerts,
        chat: chat,
        widgets: widgets,
        animations: animations,
        floatingPhotos: floatingPhotosConfig,
        // Helper method untuk check apakah fitur enabled
        isFeatureEnabled: function(featureName) {
            return this.features[featureName] === true;
        }
    };
}

// Sync enabled flags dengan feature flags
function syncConfigFlags() {
    if (!OverlayConfig) return;
    
    // Pastikan semua property ada sebelum mengakses
    if (OverlayConfig.alerts?.follower) {
        OverlayConfig.alerts.follower.enabled = OverlayConfig.features?.followerAlert ?? true;
    }
    if (OverlayConfig.alerts?.gift) {
        OverlayConfig.alerts.gift.enabled = OverlayConfig.features?.giftAlert ?? true;
    }
    if (OverlayConfig.chat) {
        OverlayConfig.chat.enabled = OverlayConfig.features?.chatOverlay ?? true;
    }
    if (OverlayConfig.widgets?.streamTimer) {
        OverlayConfig.widgets.streamTimer.enabled = OverlayConfig.features?.streamTimer ?? true;
    }
    if (OverlayConfig.widgets?.viewerCount) {
        OverlayConfig.widgets.viewerCount.enabled = OverlayConfig.features?.viewerCount ?? true;
    }
    if (OverlayConfig.animations) {
        OverlayConfig.animations.enabled = OverlayConfig.features?.animations ?? true;
    }
}

// Load config saat file dimuat
if (typeof window !== 'undefined') {
    // Browser: set default config immediately untuk compatibility
    OverlayConfig = mergeConfig(defaultConfig);
    syncConfigFlags();
    window.OverlayConfig = OverlayConfig;
    
    // Load dari config.json (async, akan override default)
    loadConfig();
} else {
    // Node.js: load sync
    loadConfig();
}

// Export untuk Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OverlayConfig;
}

// Export reload function untuk browser
if (typeof window !== 'undefined') {
    window.reloadConfigFromServer = reloadConfigFromServer;
}

