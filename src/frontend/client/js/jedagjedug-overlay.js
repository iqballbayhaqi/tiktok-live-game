// Jedag Jedug Overlay - Script khusus untuk jedagjedug effect
// Overlay ini HANYA menampilkan jedag jedug effect, tidak menampilkan:
// - Follower Alert
// - Gift Alert
// - Chat Overlay
// - Widget Container
// - Custom Banner
// - Floating Photos Effect
// - Firework Effect
// Hanya menerima dan memproses event 'jedag-jedug'

class JedagJedugOverlay {
    constructor() {
        this.config = typeof OverlayConfig !== 'undefined' ? OverlayConfig : { features: {} };
        this.components = {};
        this.init();
    }

    async init() {
        // Initialize JedagJedug component
        this.components.jedagJedug = new JedagJedug({
            jedagJedug: this.config?.giftJedagJedug
        });

        this.loadConfig();
        this.applyTheme();
        this.setupEventListeners();
        await this.loadGiftsData();
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

    triggerJedagJedug(imageUrl = null, centerX = null, centerY = null) {
        if (this.components.jedagJedug) {
            this.components.jedagJedug.trigger(imageUrl, centerX, centerY);
        }
    }

    getGiftCoin(giftName) {
        if (!this.giftsData || !this.giftsData.gifts || !giftName) {
            return null;
        }
        
        const gift = this.giftsData.gifts.find(g => 
            g.name.toLowerCase() === giftName.toLowerCase()
        );
        
        return gift ? gift.coins : null;
    }

    isGiftInCoinRange(giftName, coinMin, coinMax) {
        const coin = this.getGiftCoin(giftName);
        if (coin === null) {
            return false; // Jika gift tidak ditemukan, return false
        }
        
        if (coinMin !== null && coinMin !== undefined && coin < coinMin) {
            return false;
        }
        
        if (coinMax !== null && coinMax !== undefined && coin > coinMax) {
            return false;
        }
        
        return true;
    }

    async loadGiftsData() {
        try {
            const response = await fetch('/config/tiktok-gifts.json');
            if (response.ok) {
                this.giftsData = await response.json();
            }
        } catch (error) {
            console.error('Error loading gifts data:', error);
        }
    }

    setupEventListeners() {
        // Keyboard shortcut untuk testing
        document.addEventListener('keydown', (e) => {
            if (e.key === 'j' || e.key === 'J') {
                this.triggerJedagJedug(null, null, null);
            }
        });
    }

    triggerEvent(eventType, data) {
        // Proses event sesuai config trigger setting
        switch(eventType) {
            case 'jedag-jedug':
                // Event jedag-jedug langsung (dari API atau manual trigger)
                console.log('🎵 Triggering jedag-jedug event with data:', data);
                this.triggerJedagJedug(data.imageUrl, data.centerX, data.centerY);
                break;
            
            case 'gift':
                // Trigger jedag jedug jika giftJedagJedug enabled dan gift sesuai konfigurasi
                if (this.config?.giftJedagJedug?.enabled) {
                    const giftName = data.giftName || '';
                    const selectionMode = this.config?.giftJedagJedug?.selectionMode || 'manual';
                    let shouldTriggerJedagJedug = false;
                    
                    if (selectionMode === 'coinRange') {
                        // Mode range coin
                        const coinMin = this.config?.giftJedagJedug?.coinMin;
                        const coinMax = this.config?.giftJedagJedug?.coinMax;
                        // Jika coinMin dan coinMax kosong, trigger untuk semua gift
                        if ((coinMin === null || coinMin === undefined) && (coinMax === null || coinMax === undefined)) {
                            shouldTriggerJedagJedug = true;
                        } else {
                            shouldTriggerJedagJedug = this.isGiftInCoinRange(giftName, coinMin, coinMax);
                        }
                    } else {
                        // Mode manual (default)
                        const jedagJedugGifts = this.config?.giftJedagJedug?.gifts || [];
                        // Jika gifts array kosong, trigger untuk semua gift
                        // Jika ada isi, cek apakah gift name ada dalam daftar (case insensitive)
                        shouldTriggerJedagJedug = jedagJedugGifts.length === 0 || jedagJedugGifts.some(gift => 
                            gift.toLowerCase() === giftName.toLowerCase()
                        );
                    }
                    
                    if (shouldTriggerJedagJedug) {
                        // Tentukan posisi center (bisa null untuk tengah layar)
                        const centerX = this.config?.giftJedagJedug?.centerX !== undefined && this.config?.giftJedagJedug?.centerX !== null 
                            ? this.config.giftJedagJedug.centerX 
                            : null;
                        const centerY = this.config?.giftJedagJedug?.centerY !== undefined && this.config?.giftJedagJedug?.centerY !== null 
                            ? this.config.giftJedagJedug.centerY 
                            : null;
                        
                        // Gunakan avatarUrl jika ada
                        const avatarUrl = data.avatarUrl || data.profilePictureUrl || null;
                        console.log('🎵 Triggering jedag-jedug from gift event:', giftName);
                        this.triggerJedagJedug(avatarUrl, centerX, centerY);
                    } else {
                        console.log(`ℹ️ Gift event ignored - gift "${giftName}" not configured for jedag-jedug`);
                    }
                } else {
                    console.log(`ℹ️ Gift event ignored - giftJedagJedug not enabled in config`);
                }
                break;
            
            default:
                // Event lain diabaikan
                console.log(`ℹ️ Ignoring event type "${eventType}" - not configured for jedag-jedug`);
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
                console.log('🎬 Initializing Jedag Jedug Overlay...');
                overlay = new JedagJedugOverlay();
                window.jedagJedugOverlay = overlay;
                
                // Tunggu sedikit untuk memastikan window.currentLiveCode sudah diset oleh config-loader
                // atau ekstrak langsung dari URL jika belum tersedia
                const waitForLiveCode = () => {
                    const liveCode = window.currentLiveCode || (() => {
                        const pathname = window.location.pathname;
                        const pathMatch = pathname.match(/^\/live\/jedagjedug\/([^\/\?]+)/);
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
    
    overlay = new JedagJedugOverlay();
    window.jedagJedugOverlay = overlay;
}

function connectWebhookServer() {
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
        return;
    }
    
    // Extract live code dari URL: /live/jedagjedug/:id
    const liveCode = window.currentLiveCode || (() => {
        // Pattern: /live/jedagjedug/{liveCode}
        const pathname = window.location.pathname;
        console.log('🔍 Extracting live code from pathname:', pathname);
        const pathMatch = pathname.match(/^\/live\/jedagjedug\/([^\/\?]+)/);
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
        console.error('   Expected pattern: /live/jedagjedug/{liveCode}');
        console.error('   Example: /live/jedagjedug/abc123xyz');
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
                    // Update JedagJedug component dengan config baru
                    if (overlay.components.jedagJedug && overlay.components.jedagJedug.config) {
                        overlay.components.jedagJedug.config = overlay.config?.giftJedagJedug;
                    }
                }
                return;
            }
            
            // Proses event sesuai config trigger setting
            // Event yang didukung: jedag-jedug, gift
            const supportedEvents = ['jedag-jedug', 'gift'];
            if (supportedEvents.includes(data.type)) {
                console.log(`📥 Received ${data.type} event:`, data);
                if (data.data && overlay) {
                    overlay.triggerEvent(data.type, data.data);
                } else {
                    console.warn(`⚠️ ${data.type} event received but overlay or data is missing:`, { overlay: !!overlay, data: data.data });
                }
            } else {
                console.log(`ℹ️ Ignoring event type: ${data.type} (this overlay only processes jedag-jedug trigger events)`);
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

