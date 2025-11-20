// Gift Alert Overlay - Script khusus untuk gift alert overlay
// Overlay ini HANYA menampilkan gift alert, tidak menampilkan:
// - Follower Alert
// - Chat Overlay
// - Widget Container
// - Custom Banner
// - Floating Photos Effect
// - Firework Effect
// - Jedag Jedug Effect
// Hanya menerima dan memproses event 'gift'

class GiftAlertOverlay {
    constructor() {
        this.config = typeof OverlayConfig !== 'undefined' ? OverlayConfig : { features: {} };
        this.components = {};
        this.giftsData = null;
        this.init();
    }

    async init() {
        // Load GiftAlert component
        await ComponentLoader.loadComponents([
            { name: 'GiftAlert', target: '#gift-alert-container' }
        ]);

        // Initialize GiftAlert component
        this.components.giftAlert = new GiftAlert({
            duration: this.config?.alerts?.gift?.duration || 6000
        });

        this.loadConfig();
        this.applyThemeAndPositions();
        this.applyFeatureFlags();
        this.setupEventListeners();
        await this.loadGiftsData();
    }

    async loadGiftsData() {
        try {
            const response = await fetch('/config/tiktok-gifts.json');
            if (response.ok) {
                this.giftsData = await response.json();
            } else {
                console.warn('Gagal memuat data gift');
            }
        } catch (error) {
            console.error('Error loading gifts data:', error);
        }
    }

    applyThemeAndPositions() {
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
            
            if (this.config.theme.background) {
                root.style.setProperty('--background-color', this.config.theme.background);
            }
            if (this.config.theme.text) {
                root.style.setProperty('--text-color', this.config.theme.text);
            }
        }
        
        // Apply alert positions
        if (this.config.alerts?.gift) {
            const giftAlert = document.getElementById('gift-alert');
            if (giftAlert && this.config.alerts.gift.position) {
                if (this.config.alerts.gift.position.top) {
                    giftAlert.style.top = this.config.alerts.gift.position.top;
                }
                if (this.config.alerts.gift.position.right) {
                    giftAlert.style.right = this.config.alerts.gift.position.right;
                }
                if (this.config.alerts.gift.position.left) {
                    giftAlert.style.left = this.config.alerts.gift.position.left;
                }
                if (this.config.alerts.gift.position.bottom) {
                    giftAlert.style.bottom = this.config.alerts.gift.position.bottom;
                }
            }
        }
        
        // Apply theme gradients ke alert box
        const giftAlertBox = document.querySelector('#gift-alert .alert-box');
        if (giftAlertBox && this.config.theme?.secondary?.gradient) {
            giftAlertBox.style.background = this.config.theme.secondary.gradient;
        }
    }

    // Apply feature flags untuk hide/show elemen
    applyFeatureFlags() {
        const giftAlert = document.getElementById('gift-alert');
        if (giftAlert) {
            giftAlert.style.display = this.isFeatureEnabled('giftAlert') ? 'block' : 'none';
        }
    }

    isFeatureEnabled(featureName) {
        if (this.config && this.config.features) {
            return this.config.features[featureName] !== false;
        }
        return true;
    }

    setupEventListeners() {
        // Keyboard shortcuts untuk testing
        document.addEventListener('keydown', (e) => {
            if (e.key === 'g' || e.key === 'G') {
                this.showGiftAlert('TestUser' + Math.floor(Math.random() * 1000), 'Rose', 10);
            }
        });
    }

    showGiftAlert(username, giftName, quantity, giftImageUrl = null) {
        if (!this.isFeatureEnabled('giftAlert')) return;
        if (this.components.giftAlert) {
            this.components.giftAlert.show(username, giftName, quantity, giftImageUrl);
        }
    }

    loadConfig() {
        // Config sudah dimuat oleh config-loader.js
        // Update duration jika ada perubahan
        if (this.config?.alerts?.gift?.duration && this.components.giftAlert) {
            this.components.giftAlert.duration = this.config.alerts.gift.duration;
        }
    }

    triggerEvent(eventType, data) {
        switch(eventType) {
            case 'gift':
                this.showGiftAlert(data.username, data.giftName, data.quantity, data.giftImageUrl);
                break;
            default:
                // Event lain diabaikan
                console.log(`ℹ️ Ignoring event type "${eventType}" - gift alert overlay only processes gift events`);
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
                overlay.applyFeatureFlags();
                overlay.applyThemeAndPositions();
            } else {
                console.log('🎬 Initializing Gift Alert Overlay...');
                overlay = new GiftAlertOverlay();
                window.giftAlertOverlay = overlay;
                
                // Tunggu sedikit untuk memastikan window.currentLiveCode sudah diset oleh config-loader
                // atau ekstrak langsung dari URL jika belum tersedia
                const waitForLiveCode = () => {
                    const liveCode = window.currentLiveCode || (() => {
                        const pathname = window.location.pathname;
                        const pathMatch = pathname.match(/^\/live\/gift-alert\/([^\/\?]+)/);
                        return pathMatch && pathMatch[1] ? pathMatch[1] : null;
                    })();
                    
                    const username = window.currentUsername || (() => {
                        const pathname = window.location.pathname;
                        const pathMatch = pathname.match(/^\/overlay\/gift-alert\/([^\/\?]+)/);
                        return pathMatch && pathMatch[1] ? pathMatch[1] : null;
                    })();
                    
                    if (liveCode || username) {
                        // Set window.currentLiveCode dan window.currentUsername untuk digunakan di connectWebhookServer
                        if (liveCode && !window.currentLiveCode) {
                            window.currentLiveCode = liveCode;
                        }
                        if (username && !window.currentUsername) {
                            window.currentUsername = username;
                        }
                        console.log('✅ Live code/username tersedia:', liveCode || username);
                        connectWebhookServer();
                    } else {
                        console.log('⏳ Menunggu live code/username tersedia...');
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
    
    overlay = new GiftAlertOverlay();
    window.giftAlertOverlay = overlay;
}

function reloadConfig(newConfig) {
    if (!newConfig) {
        console.warn('⚠️ No config provided for reload');
        return;
    }
    
    if (typeof window !== 'undefined') {
        window.OverlayConfig = newConfig;
        OverlayConfig = newConfig;
    }
    
    if (overlay) {
        overlay.config = newConfig;
        overlay.applyFeatureFlags();
        overlay.applyThemeAndPositions();
        
        if (newConfig.alerts?.gift?.duration && overlay.components.giftAlert) {
            overlay.components.giftAlert.duration = newConfig.alerts.gift.duration;
        }
        
        console.log('✅ Config reloaded and applied');
    } else {
        console.warn('⚠️ Overlay not initialized yet, config will be applied on init');
    }
}

function connectWebhookServer() {
    const config = typeof OverlayConfig !== 'undefined' ? OverlayConfig : { features: {} };
    if (config.features && config.features.webhookConnection === false) {
        console.log('ℹ️ Webhook connection disabled via feature flag');
        return;
    }
    
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
        return;
    }
    
    // Extract live code atau username dari URL
    const liveCode = window.currentLiveCode || (() => {
        // Pattern: /live/gift-alert/{liveCode}
        const pathname = window.location.pathname;
        console.log('🔍 Extracting live code from pathname:', pathname);
        const pathMatch = pathname.match(/^\/live\/gift-alert\/([^\/\?]+)/);
        if (pathMatch && pathMatch[1]) {
            const extractedCode = pathMatch[1];
            console.log('✅ Extracted live code:', extractedCode);
            return extractedCode;
        }
        console.warn('⚠️ Failed to extract live code from pathname:', pathname);
        return null;
    })();
    
    const username = window.currentUsername || (() => {
        // Pattern: /overlay/gift-alert/{username}
        const pathname = window.location.pathname;
        console.log('🔍 Extracting username from pathname:', pathname);
        const pathMatch = pathname.match(/^\/overlay\/gift-alert\/([^\/\?]+)/);
        if (pathMatch && pathMatch[1]) {
            const extractedUsername = pathMatch[1];
            console.log('✅ Extracted username:', extractedUsername);
            return extractedUsername;
        }
        return null;
    })();
    
    let eventsUrl;
    if (liveCode) {
        eventsUrl = `/events/code/${encodeURIComponent(liveCode)}`;
        console.log(`🔌 Connecting to webhook server for live code: ${liveCode}...`);
    } else if (username) {
        eventsUrl = `/events/${encodeURIComponent(username)}`;
        console.log(`🔌 Connecting to webhook server for user: ${username}...`);
    } else {
        eventsUrl = '/events';
        console.log(`🔌 Connecting to webhook server...`);
    }
    
    if (window.currentEventSource) {
        window.currentEventSource.close();
    }
    
    const eventSource = new EventSource(eventsUrl);
    window.currentEventSource = eventSource;
    
    eventSource.onopen = () => {
        if (liveCode) {
            console.log(`✅ Connected to webhook server for live code: ${liveCode}`);
        } else if (username) {
            console.log(`✅ Connected to webhook server for user: ${username}`);
        } else {
            console.log(`✅ Connected to webhook server`);
        }
    };
    
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('📥 Received SSE event:', data);
            
            if (data.type === 'connected') {
                if (data.liveCode) {
                    console.log(`📡 Webhook connection established for live code: ${data.liveCode}${data.username ? ` (user: ${data.username})` : ''}`);
                } else if (data.username) {
                    console.log(`📡 Webhook connection established for user: ${data.username}`);
                } else {
                    console.log(`📡 Webhook connection established`);
                }
                return;
            }
            
            if (data.type === 'config-updated' && data.data && data.data.config) {
                console.log('🔄 Config updated, reloading...');
                reloadConfig(data.data.config);
                return;
            }
            
            // Proses event sesuai config trigger setting
            // Event yang didukung: gift
            const supportedEvents = ['gift'];
            if (supportedEvents.includes(data.type)) {
                console.log(`📥 Received ${data.type} event:`, data);
                if (data.data && overlay) {
                    overlay.triggerEvent(data.type, data.data);
                } else {
                    console.warn(`⚠️ ${data.type} event received but overlay or data is missing:`, { overlay: !!overlay, data: data.data });
                }
            } else {
                console.log(`ℹ️ Ignoring event type: ${data.type} (gift alert overlay only processes gift events)`);
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

// Demo mode
if (window.location.search.includes('demo=true')) {
    function runDemo() {
        if (!overlay) {
            setTimeout(runDemo, 100);
            return;
        }
        
        setTimeout(() => {
            overlay.showGiftAlert('User123', 'Rose', 5);
        }, 1000);
        
        setTimeout(() => {
            overlay.showGiftAlert('User456', 'Diamond', 10);
        }, 3000);
        
        setTimeout(() => {
            overlay.showGiftAlert('User789', 'Heart', 20);
        }, 5000);
    }
    
    runDemo();
}

