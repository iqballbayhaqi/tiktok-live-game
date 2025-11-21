// Floating Photos Overlay - Script khusus untuk floating-photos effect
// Overlay ini HANYA menampilkan floating photos effect, tidak menampilkan:
// - Follower Alert
// - Gift Alert
// - Chat Overlay
// - Widget Container
// - Custom Banner
// - Firework Effect
// - Jedag Jedug Effect
// Hanya menerima dan memproses event 'floating-photo'

class FloatingPhotosOverlay {
    constructor() {
        this.config = typeof OverlayConfig !== 'undefined' ? OverlayConfig : { features: {} };
        this.components = {};
        this.init();
    }

    async init() {
        // HANYA Load FloatingPhotosContainer component
        // Tidak memuat komponen lain seperti FollowerAlert, GiftAlert, ChatOverlay, dll
        await ComponentLoader.loadComponents([
            { name: 'FloatingPhotosContainer', target: '#floating-photos-container-container' }
        ]);

        // Initialize HANYA FloatingPhotos component
        this.components.floatingPhotos = new FloatingPhotos({
            floatingPhotos: this.config?.floatingPhotos,
            maxPhotos: this.config?.floatingPhotos?.maxPhotos || 100
        });

        this.loadConfig();
        this.applyTheme();
        this.initFloatingPhotos();
        this.setupEventListeners();
    }

    applyTheme() {
        if (!this.config) return;
        
        // Apply theme colors
        if (this.config.theme) {
            const root = document.documentElement;
            
            if (this.config.theme.primary?.gradient) {
                root.style.setProperty('--primary-gradient', this.config.theme.primary.gradient);
            }
            if (this.config.theme.primary?.solid) {
                root.style.setProperty('--primary-color', this.config.theme.primary.solid);
            }
            
            if (this.config.theme.secondary?.gradient) {
                root.style.setProperty('--secondary-gradient', this.config.theme.secondary.gradient);
            }
            if (this.config.theme.secondary?.solid) {
                root.style.setProperty('--secondary-color', this.config.theme.secondary.solid);
            }
        }
    }

    loadConfig() {
        // Config sudah dimuat oleh config-loader.js
    }

    initFloatingPhotos() {
        if (this.components.floatingPhotos) {
            const scale = this.config?.floatingPhotos?.scale || 1.0;
            if (this.components.floatingPhotos.config) {
                this.components.floatingPhotos.config.scale = scale;
            }
            this.components.floatingPhotos.init();
        }
    }

    addFloatingPhoto(imageUrl = null, emoji = null, scale = null) {
        if (this.components.floatingPhotos) {
            const finalScale = scale !== null ? scale : (this.config?.floatingPhotos?.scale || 1.0);
            this.components.floatingPhotos.addPhoto(imageUrl, emoji, finalScale);
        }
    }

    shouldTriggerFloatingPhoto(triggerType) {
        if (!this.config?.floatingPhotos) return false;
        const triggers = this.config.floatingPhotos.triggers || {};
        return triggers[triggerType] === true;
    }

    setupEventListeners() {
        // Keyboard shortcut untuk testing
        document.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') {
                const emojis = ['👤', '😊', '🎉', '⭐', '💫', '🌟', '✨'];
                this.addFloatingPhoto(null, emojis[Math.floor(Math.random() * emojis.length)]);
            }
        });
    }

    triggerEvent(eventType, data) {
        // Proses event sesuai config trigger setting
        switch(eventType) {
            case 'floating-photo':
                // Event floating-photo langsung (dari API atau manual trigger)
                console.log('📸 Triggering floating-photo event with data:', data);
                const directScale = data.scale || this.config?.floatingPhotos?.scale || 1.0;
                this.addFloatingPhoto(data.imageUrl, data.emoji, directScale);
                break;
            
            case 'follower':
                // Trigger floating photo jika follow trigger aktif
                if (this.shouldTriggerFloatingPhoto('follow')) {
                    const avatarUrl = data.avatarUrl || data.profilePictureUrl || null;
                    const scale = this.config?.floatingPhotos?.triggers?.followScale || 1.0;
                    console.log('👤 Triggering floating-photo from follow event');
                    this.addFloatingPhoto(avatarUrl, '👤', scale);
                } else {
                    console.log(`ℹ️ Follow event ignored - trigger not enabled in config`);
                }
                break;
            
            case 'gift':
                // Trigger floating photo jika gift trigger aktif
                if (this.shouldTriggerFloatingPhoto('gift')) {
                    const avatarUrl = data.avatarUrl || data.profilePictureUrl || null;
                    const scale = this.config?.floatingPhotos?.triggers?.giftScale || 1.0;
                    console.log('🎁 Triggering floating-photo from gift event');
                    this.addFloatingPhoto(avatarUrl, '🎁', scale);
                } else {
                    console.log(`ℹ️ Gift event ignored - trigger not enabled in config`);
                }
                break;
            
            case 'chat':
                // Trigger floating photo jika chat trigger aktif
                if (this.shouldTriggerFloatingPhoto('chat')) {
                    const avatarUrl = data.avatarUrl || null;
                    const scale = this.config?.floatingPhotos?.triggers?.chatScale || 1.0;
                    console.log('💬 Triggering floating-photo from chat event');
                    this.addFloatingPhoto(avatarUrl, '💬', scale);
                } else {
                    console.log(`ℹ️ Chat event ignored - trigger not enabled in config`);
                }
                break;
            
            case 'share':
                // Trigger floating photo jika share trigger aktif
                if (this.shouldTriggerFloatingPhoto('share')) {
                    const avatarUrl = data.avatarUrl || data.profilePictureUrl || null;
                    const scale = this.config?.floatingPhotos?.triggers?.shareScale || 1.0;
                    console.log('📤 Triggering floating-photo from share event');
                    this.addFloatingPhoto(avatarUrl, '📤', scale);
                } else {
                    console.log(`ℹ️ Share event ignored - trigger not enabled in config`);
                }
                break;
            
            default:
                // Event lain diabaikan
                console.log(`ℹ️ Ignoring event type "${eventType}" - not configured for floating photos`);
                break;
        }
    }
}

// Initialize overlay
let overlay = null;

function initializeOverlay() {
    if (typeof window !== 'undefined') {
        const initWithConfig = () => {
            if (typeof OverlayConfig === 'undefined' || !OverlayConfig) {
                console.warn('⚠️ OverlayConfig belum tersedia, menunggu...');
                setTimeout(initWithConfig, 100);
                return;
            }
            
            if (overlay) {
                overlay.config = OverlayConfig;
                overlay.applyTheme();
            } else {
                console.log('🎬 Initializing Floating Photos Overlay...');
                overlay = new FloatingPhotosOverlay();
                window.floatingPhotosOverlay = overlay;
                
                // Tunggu sedikit untuk memastikan window.currentLiveCode sudah diset oleh config-loader
                // atau ekstrak langsung dari URL jika belum tersedia
                const waitForLiveCode = () => {
                    const liveCode = window.currentLiveCode || (() => {
                        const pathname = window.location.pathname;
                        const pathMatch = pathname.match(/^\/live\/floating-photos\/([^\/\?]+)/);
                        return pathMatch && pathMatch[1] ? pathMatch[1] : null;
                    })();
                    
                    if (liveCode) {
                        console.log('✅ Live code tersedia:', liveCode);
                        connectWebhookServer();
                    } else {
                        console.log('⏳ Menunggu live code tersedia...');
                        setTimeout(waitForLiveCode, 100);
                    }
                };
                
                setTimeout(waitForLiveCode, 200);
            }
        };
        
        if (window._configLoaded) {
            initWithConfig();
        } else {
            window.addEventListener('configLoaded', function onConfigLoaded() {
                window._configLoaded = true;
                window.removeEventListener('configLoaded', onConfigLoaded);
                console.log('✅ Config loaded event received, initializing overlay...');
                initWithConfig();
            }, { once: true });
            
            setTimeout(() => {
                if (!window._configLoaded) {
                    console.warn('⚠️ Config loaded event tidak terpicu dalam 3 detik, menggunakan config yang tersedia');
                    window._configLoaded = true;
                    initWithConfig();
                }
            }, 3000);
        }
        return;
    }
    
    overlay = new FloatingPhotosOverlay();
    window.floatingPhotosOverlay = overlay;
}

function connectWebhookServer() {
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
        return;
    }
    
    // Extract live code dari URL: /live/floating-photos/:id
    const liveCode = window.currentLiveCode || (() => {
        // Pattern: /live/floating-photos/{liveCode}
        const pathname = window.location.pathname;
        console.log('🔍 Extracting live code from pathname:', pathname);
        const pathMatch = pathname.match(/^\/live\/floating-photos\/([^\/\?]+)/);
        if (pathMatch && pathMatch[1]) {
            const extractedCode = pathMatch[1];
            console.log('✅ Extracted live code:', extractedCode);
            return extractedCode;
        }
        console.warn('⚠️ Failed to extract live code from pathname:', pathname);
        return null;
    })();
    
    if (!liveCode) {
        console.error('❌ Live code tidak ditemukan dari URL:', window.location.pathname);
        console.error('   Expected pattern: /live/floating-photos/{liveCode}');
        console.error('   Example: /live/floating-photos/abc123xyz');
        return;
    }
    
    const eventsUrl = `/events/code/${encodeURIComponent(liveCode)}`;
    console.log(`🔌 Connecting to webhook server for live code: ${liveCode}...`);
    console.log(`   Events URL: ${eventsUrl}`);
    
    if (window.currentEventSource) {
        window.currentEventSource.close();
    }
    
    const eventSource = new EventSource(eventsUrl);
    window.currentEventSource = eventSource;
    
    eventSource.onopen = () => {
        console.log(`✅ Connected to webhook server for live code: ${liveCode}`);
    };
    
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('📥 Received SSE event:', data);
            
            if (data.type === 'connected') {
                if (data.liveCode) {
                    console.log(`📡 Webhook connection established for live code: ${data.liveCode}${data.username ? ` (user: ${data.username})` : ''}`);
                }
                return;
            }
            
            if (data.type === 'config-updated' && data.data && data.data.config) {
                console.log('🔄 Config updated, reloading...');
                if (overlay) {
                    overlay.config = data.data.config;
                    overlay.applyTheme();
                }
                return;
            }
            
            // Proses event sesuai config trigger setting
            // Event yang didukung: floating-photo, follower, gift, chat, share
            const supportedEvents = ['floating-photo', 'follower', 'gift', 'chat', 'share'];
            if (supportedEvents.includes(data.type)) {
                console.log(`📥 Received ${data.type} event:`, data);
                if (data.data && overlay) {
                    overlay.triggerEvent(data.type, data.data);
                } else {
                    console.warn(`⚠️ ${data.type} event received but overlay or data is missing:`, { overlay: !!overlay, data: data.data });
                }
            } else {
                // Event lain diabaikan - ini adalah overlay khusus untuk floating photos saja
                console.log(`ℹ️ Ignoring event type: ${data.type} (this overlay only processes floating photo trigger events)`);
            }
        } catch (error) {
            console.error('Error processing webhook event:', error);
        }
    };
    
    eventSource.onerror = (error) => {
        console.error('❌ Webhook connection error:', error);
        setTimeout(() => {
            if (eventSource.readyState === EventSource.CLOSED) {
                console.log('🔄 Retrying webhook connection...');
                connectWebhookServer();
            }
        }, 5000);
    };
}

// Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOverlay);
} else {
    initializeOverlay();
}

