// Konfigurasi Overlay TikTok Live
// Konfigurasi diambil dari config.json

const OverlayConfig = {
    // Feature Flags - Gunakan untuk disable/enable fitur
    features: {
        // Follower alert feature
        followerAlert: true,
        
        // Gift alert feature
        giftAlert: true,
        
        // Chat overlay feature
        chatOverlay: true,
        
        // Stream timer widget
        streamTimer: true,
        
        // Viewer count widget
        viewerCount: true,
        
        // Custom banner feature
        customBanner: true,
        
        // Floating photos feature
        floatingPhotos: true,
        
        // Animations feature
        animations: true,
        
        // TikTok connector auto-connect
        tiktokConnector: true,
        
        // Webhook server connection
        webhookConnection: true
    },

    // Alert Settings
    alerts: {
        follower: {
            enabled: true, // Akan di-override oleh features.followerAlert
            duration: 5000, // milidetik
            position: {
                top: '50px',
                right: '50px'
            }
        },
        gift: {
            enabled: true, // Akan di-override oleh features.giftAlert
            duration: 6000,
            position: {
                top: '50px',
                right: '50px'
            }
        }
    },

    // Chat Settings
    chat: {
        enabled: true, // Akan di-override oleh features.chatOverlay
        maxMessages: 10,
        position: {
            bottom: '50px',
            left: '50px'
        },
        width: '500px',
        maxHeight: '400px'
    },

    // Widget Settings
    widgets: {
        streamStatus: {
            enabled: true,
            label: 'Streaming',
            defaultValue: 'LIVE'
        },
        streamTimer: {
            enabled: true, // Akan di-override oleh features.streamTimer
            position: {
                top: '50px',
                left: '50px'
            }
        },
        viewerCount: {
            enabled: true, // Akan di-override oleh features.viewerCount
            showInChat: true
        }
    },

    // Colors Theme
    theme: {
        primary: {
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            solid: '#667eea'
        },
        secondary: {
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            solid: '#f5576c'
        },
        background: 'rgba(0, 0, 0, 0.7)',
        text: '#ffffff'
    },

    // Animation Settings
    animations: {
        enabled: true, // Akan di-override oleh features.animations
        duration: 500,
        easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    },

    // Gift Floating Photos Effect Settings
    giftFloatingPhotos: {
        enabled: false,
        gifts: [] // Daftar gift yang akan memicu floating photos effect
    },

    // Gift Firework Effect Settings
    giftFirework: {
        enabled: false,
        gifts: ['Rose'], // Daftar gift yang akan memicu firework effect
        count: 20, // Jumlah foto dalam firework
        centerX: 960, // Posisi X center (0-1920), null untuk tengah layar
        centerY: 540, // Posisi Y center (0-1080), null untuk tengah layar
        fadeOutDuration: 5000, // Durasi sebelum fade out (dalam milidetik, default 5 detik)
        initialScale: 0.1, // Ukuran awal (dari 0.1 = kecil ke 1.0 = normal)
        scaleDuration: 300 // Durasi animasi scale (dalam milidetik)
    },

    // TikTok API Integration (jika ada)
    api: {
        enabled: false,
        endpoint: '',
        apiKey: '',
        pollInterval: 5000 // milidetik
    },

    // Helper method untuk check apakah fitur enabled
    isFeatureEnabled(featureName) {
        return this.features[featureName] === true;
    }
};

// Sync enabled flags dengan feature flags
OverlayConfig.alerts.follower.enabled = OverlayConfig.features.followerAlert;
OverlayConfig.alerts.gift.enabled = OverlayConfig.features.giftAlert;
OverlayConfig.chat.enabled = OverlayConfig.features.chatOverlay;
OverlayConfig.widgets.streamTimer.enabled = OverlayConfig.features.streamTimer;
OverlayConfig.widgets.viewerCount.enabled = OverlayConfig.features.viewerCount;
OverlayConfig.animations.enabled = OverlayConfig.features.animations;

// Export untuk digunakan di script.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OverlayConfig;
}

