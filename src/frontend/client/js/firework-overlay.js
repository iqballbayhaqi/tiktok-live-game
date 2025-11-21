// Firework Overlay - Script khusus untuk firework effect
// Overlay ini HANYA menampilkan firework effect, tidak menampilkan:
// - Follower Alert
// - Gift Alert
// - Chat Overlay
// - Widget Container
// - Custom Banner
// - Floating Photos Effect (biasa)
// - Jedag Jedug Effect
// Hanya menerima dan memproses event 'firework'

class FireworkOverlay {
    constructor() {
        this.config = typeof OverlayConfig !== 'undefined' ? OverlayConfig : { features: {} };
        this.components = {};
        this.init();
    }

    async init() {
        // Load FloatingPhotosContainer component (firework menggunakan FloatingPhotos component)
        await ComponentLoader.loadComponents([
            { name: 'FloatingPhotosContainer', target: '#floating-photos-container-container' }
        ]);

        // Pastikan container sudah ada sebelum inisialisasi
        const container = document.getElementById('floating-photos-container');
        if (!container) {
            console.error('❌ FloatingPhotosContainer tidak ditemukan!');
            return;
        }
        console.log('✅ FloatingPhotosContainer ditemukan');

        // Initialize FloatingPhotos component untuk firework
        this.components.floatingPhotos = new FloatingPhotos({
            floatingPhotos: this.config?.floatingPhotos,
            giftFirework: this.config?.giftFirework,
            maxPhotos: this.config?.floatingPhotos?.maxPhotos || 100
        });

        this.loadConfig();
        this.applyTheme();
        this.initFloatingPhotos();
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

    initFloatingPhotos() {
        if (this.components.floatingPhotos) {
            console.log('✅ Initializing FloatingPhotos component...');
            this.components.floatingPhotos.init();
            console.log('✅ FloatingPhotos component initialized');
        } else {
            console.error('❌ FloatingPhotos component tidak tersedia untuk diinisialisasi!');
        }
    }

    addFirework(imageUrl = null, emoji = null, centerX = null, centerY = null, count = 20) {
        console.log('🎆 FireworkOverlay.addFirework called:', { imageUrl, emoji, centerX, centerY, count });
        if (!this.components.floatingPhotos) {
            console.error('❌ FloatingPhotos component tidak tersedia!');
            return;
        }
        if (!this.components.floatingPhotos.container) {
            console.error('❌ FloatingPhotos container tidak tersedia!');
            return;
        }
        console.log('✅ Memanggil FloatingPhotos.addFirework...');
        this.components.floatingPhotos.addFirework(imageUrl, emoji, centerX, centerY, count);
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
            if (e.key === 'f' || e.key === 'F') {
                this.addFirework(null, '🎉', null, null, 20);
            }
        });
    }

    triggerEvent(eventType, data) {
        // Proses event sesuai config trigger setting
        switch(eventType) {
            case 'firework':
                // Event firework langsung (dari API atau manual trigger)
                console.log('🎆 Triggering firework event with data:', data);
                const fireworkData = {
                    imageUrl: data.imageUrl || null,
                    emoji: data.emoji || null,
                    centerX: data.centerX !== undefined && data.centerX !== null ? parseInt(data.centerX) : null,
                    centerY: data.centerY !== undefined && data.centerY !== null ? parseInt(data.centerY) : null,
                    count: data.count !== undefined && data.count !== null ? parseInt(data.count) : 20
                };
                console.log('🎆 Firework data processed:', fireworkData);
                this.addFirework(fireworkData.imageUrl, fireworkData.emoji, fireworkData.centerX, fireworkData.centerY, fireworkData.count);
                break;
            
            case 'gift':
                // Trigger firework jika giftFirework enabled dan gift sesuai konfigurasi
                if (this.config?.giftFirework?.enabled) {
                    const giftName = data.giftName || '';
                    const selectionMode = this.config?.giftFirework?.selectionMode || 'manual';
                    let shouldTriggerFirework = false;
                    
                    if (selectionMode === 'coinRange') {
                        // Mode range coin
                        const coinMin = this.config?.giftFirework?.coinMin;
                        const coinMax = this.config?.giftFirework?.coinMax;
                        shouldTriggerFirework = this.isGiftInCoinRange(giftName, coinMin, coinMax);
                    } else {
                        // Mode manual (default)
                        const fireworkGifts = this.config?.giftFirework?.gifts || [];
                        // Cek apakah gift name ada dalam daftar gift firework (case insensitive)
                        shouldTriggerFirework = fireworkGifts.some(gift => 
                            gift.toLowerCase() === giftName.toLowerCase()
                        );
                    }
                    
                    if (shouldTriggerFirework) {
                        // Tentukan posisi center (bisa null untuk tengah layar)
                        const centerX = this.config?.giftFirework?.centerX !== undefined && this.config?.giftFirework?.centerX !== null 
                            ? this.config.giftFirework.centerX 
                            : null;
                        const centerY = this.config?.giftFirework?.centerY !== undefined && this.config?.giftFirework?.centerY !== null 
                            ? this.config.giftFirework.centerY 
                            : null;
                        const count = this.config?.giftFirework?.count || 20;
                        
                        // Gunakan avatarUrl jika ada, jika tidak gunakan emoji
                        const avatarUrl = data.avatarUrl || data.profilePictureUrl || null;
                        console.log('🎆 Triggering firework from gift event:', giftName);
                        this.addFirework(avatarUrl, '🎉', centerX, centerY, count);
                    } else {
                        console.log(`ℹ️ Gift event ignored - gift "${giftName}" not configured for firework`);
                    }
                } else {
                    console.log(`ℹ️ Gift event ignored - giftFirework not enabled in config`);
                }
                break;
            
            default:
                // Event lain diabaikan
                console.log(`ℹ️ Ignoring event type "${eventType}" - not configured for firework`);
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
                console.log('🎬 Initializing Firework Overlay...');
                overlay = new FireworkOverlay();
                window.fireworkOverlay = overlay;
                
                // Tunggu sedikit untuk memastikan window.currentLiveCode sudah diset oleh config-loader
                // atau ekstrak langsung dari URL jika belum tersedia
                const waitForLiveCode = () => {
                    const liveCode = window.currentLiveCode || (() => {
                        const pathname = window.location.pathname;
                        const pathMatch = pathname.match(/^\/live\/firework\/([^\/\?]+)/);
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
    
    overlay = new FireworkOverlay();
    window.fireworkOverlay = overlay;
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
    
    // Extract live code dari URL: /live/firework/:id
    const liveCode = window.currentLiveCode || (() => {
        // Pattern: /live/firework/{liveCode}
        const pathname = window.location.pathname;
        console.log('🔍 Extracting live code from pathname:', pathname);
        const pathMatch = pathname.match(/^\/live\/firework\/([^\/\?]+)/);
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
        console.error('   Expected pattern: /live/firework/{liveCode}');
        console.error('   Example: /live/firework/abc123xyz');
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
                    // Update FloatingPhotos component dengan config baru
                    if (overlay.components.floatingPhotos) {
                        overlay.components.floatingPhotos.config = {
                            floatingPhotos: overlay.config?.floatingPhotos,
                            giftFirework: overlay.config?.giftFirework,
                            maxPhotos: overlay.config?.floatingPhotos?.maxPhotos || 100
                        };
                    }
                }
                return;
            }
            
            // Proses event sesuai config trigger setting
            // Event yang didukung: firework, gift
            const supportedEvents = ['firework', 'gift'];
            if (supportedEvents.includes(data.type)) {
                console.log(`📥 Received ${data.type} event:`, data);
                if (data.data && overlay) {
                    overlay.triggerEvent(data.type, data.data);
                } else {
                    console.warn(`⚠️ ${data.type} event received but overlay or data is missing:`, { overlay: !!overlay, data: data.data });
                }
            } else {
                console.log(`ℹ️ Ignoring event type: ${data.type} (this overlay only processes firework trigger events)`);
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

