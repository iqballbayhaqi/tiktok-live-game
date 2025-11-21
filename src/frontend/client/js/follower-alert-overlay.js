// Follower Alert Overlay - Script khusus untuk follower alert overlay
// Overlay ini HANYA menampilkan follower alert, tidak menampilkan:
// - Gift Alert
// - Chat Overlay
// - Widget Container
// - Custom Banner
// - Floating Photos Effect
// - Firework Effect
// - Jedag Jedug Effect
// Hanya menerima dan memproses event 'follower'

class FollowerAlertOverlay {
    constructor() {
        this.config = typeof OverlayConfig !== 'undefined' ? OverlayConfig : { features: {} };
        this.components = {};
        this.init();
    }

    async init() {
        // Load FollowerAlert component
        await ComponentLoader.loadComponents([
            { name: 'FollowerAlert', target: '#follower-alert-container' }
        ]);

        // Initialize FollowerAlert component
        this.components.followerAlert = new FollowerAlert({
            duration: this.config?.alerts?.follower?.duration || 5000
        });

        this.loadConfig();
        this.applyThemeAndPositions();
        this.applyFeatureFlags();
        this.setupEventListeners();
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
        if (this.config.alerts?.follower) {
            const followerAlert = document.getElementById('follower-alert');
            if (followerAlert && this.config.alerts.follower.position) {
                if (this.config.alerts.follower.position.top) {
                    followerAlert.style.top = this.config.alerts.follower.position.top;
                }
                if (this.config.alerts.follower.position.right) {
                    followerAlert.style.right = this.config.alerts.follower.position.right;
                }
                if (this.config.alerts.follower.position.left) {
                    followerAlert.style.left = this.config.alerts.follower.position.left;
                }
                if (this.config.alerts.follower.position.bottom) {
                    followerAlert.style.bottom = this.config.alerts.follower.position.bottom;
                }
            }
        }
        
        // Apply theme gradients ke alert box
        const followerAlertBox = document.querySelector('#follower-alert .alert-box');
        if (followerAlertBox && this.config.theme?.primary?.gradient) {
            followerAlertBox.style.background = this.config.theme.primary.gradient;
        }
    }

    // Apply feature flags untuk hide/show elemen
    applyFeatureFlags() {
        const followerAlert = document.getElementById('follower-alert');
        if (followerAlert) {
            followerAlert.style.display = this.isFeatureEnabled('followerAlert') ? 'block' : 'none';
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
            if (e.key === 'f' || e.key === 'F') {
                this.showFollowerAlert('TestUser' + Math.floor(Math.random() * 1000));
            }
        });
    }

    showFollowerAlert(username) {
        if (!this.isFeatureEnabled('followerAlert')) return;
        if (this.components.followerAlert) {
            this.components.followerAlert.show(username);
        }
    }

    loadConfig() {
        // Config sudah dimuat oleh config-loader.js
        // Update duration jika ada perubahan
        if (this.config?.alerts?.follower?.duration && this.components.followerAlert) {
            this.components.followerAlert.duration = this.config.alerts.follower.duration;
        }
    }

    triggerEvent(eventType, data) {
        switch(eventType) {
            case 'follower':
                this.showFollowerAlert(data.username);
                break;
            default:
                // Event lain diabaikan
                console.log(`ℹ️ Ignoring event type "${eventType}" - follower alert overlay only processes follower events`);
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
                console.log('🎬 Initializing Follower Alert Overlay...');
                overlay = new FollowerAlertOverlay();
                window.followerAlertOverlay = overlay;
                
                // Tunggu sedikit untuk memastikan window.currentLiveCode sudah diset oleh config-loader
                // atau ekstrak langsung dari URL jika belum tersedia
                const waitForLiveCode = () => {
                    const liveCode = window.currentLiveCode || (() => {
                        const pathname = window.location.pathname;
                        const pathMatch = pathname.match(/^\/live\/follower-alert\/([^\/\?]+)/);
                        return pathMatch && pathMatch[1] ? pathMatch[1] : null;
                    })();
                    
                    const username = window.currentUsername || (() => {
                        const pathname = window.location.pathname;
                        const pathMatch = pathname.match(/^\/overlay\/follower-alert\/([^\/\?]+)/);
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
    
    overlay = new FollowerAlertOverlay();
    window.followerAlertOverlay = overlay;
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
        
        if (newConfig.alerts?.follower?.duration && overlay.components.followerAlert) {
            overlay.components.followerAlert.duration = newConfig.alerts.follower.duration;
        }
        
        console.log('✅ Config reloaded and applied');
    } else {
        console.warn('⚠️ Overlay not initialized yet, config will be applied on init');
    }
}

function connectWebhookServer() {
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
        return;
    }
    
    // Extract live code atau username dari URL
    const liveCode = window.currentLiveCode || (() => {
        // Pattern: /live/follower-alert/{liveCode}
        const pathname = window.location.pathname;
        console.log('🔍 Extracting live code from pathname:', pathname);
        const pathMatch = pathname.match(/^\/live\/follower-alert\/([^\/\?]+)/);
        if (pathMatch && pathMatch[1]) {
            const extractedCode = pathMatch[1];
            console.log('✅ Extracted live code:', extractedCode);
            return extractedCode;
        }
        console.warn('⚠️ Failed to extract live code from pathname:', pathname);
        return null;
    })();
    
    const username = window.currentUsername || (() => {
        // Pattern: /overlay/follower-alert/{username}
        const pathname = window.location.pathname;
        console.log('🔍 Extracting username from pathname:', pathname);
        const pathMatch = pathname.match(/^\/overlay\/follower-alert\/([^\/\?]+)/);
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
            // Event yang didukung: follower
            const supportedEvents = ['follower'];
            if (supportedEvents.includes(data.type)) {
                console.log(`📥 Received ${data.type} event:`, data);
                if (data.data && overlay) {
                    overlay.triggerEvent(data.type, data.data);
                } else {
                    console.warn(`⚠️ ${data.type} event received but overlay or data is missing:`, { overlay: !!overlay, data: data.data });
                }
            } else {
                console.log(`ℹ️ Ignoring event type: ${data.type} (follower alert overlay only processes follower events)`);
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
            overlay.showFollowerAlert('User123');
        }, 1000);
        
        setTimeout(() => {
            overlay.showFollowerAlert('User456');
        }, 3000);
        
        setTimeout(() => {
            overlay.showFollowerAlert('User789');
        }, 5000);
    }
    
    runDemo();
}

