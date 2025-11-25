// Puzzle Photo Overlay - Script khusus untuk puzzle photo effect
// Overlay ini HANYA menampilkan puzzle photo effect, tidak menampilkan:
// - Follower Alert
// - Gift Alert
// - Chat Overlay
// - Widget Container
// - Custom Banner
// - Floating Photos Effect
// - Firework Effect
// - Jedag Jedug Effect
// Hanya menerima dan memproses event 'puzzle-photo' atau 'gift' dengan konfigurasi puzzle photo

class PuzzlePhotoOverlay {
    constructor() {
        this.config = null;
        this.components = {};
        this.giftsData = {};
        this.init();
    }

    async init() {
        // Initialize PuzzlePhoto component
        this.components.puzzlePhoto = new PuzzlePhoto({
            puzzlePhoto: this.config?.puzzlePhoto
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.components.puzzlePhoto) {
                this.components.puzzlePhoto.resize();
            }
        });

        this.loadConfig();
        this.applyTheme();
        this.setupEventListeners();
        await this.loadGiftsData();
    }

    applyTheme() {
        if (!this.config) return;
        
        // Apply theme colors if needed
        const theme = this.config.theme || {};
        if (theme.backgroundColor) {
            document.body.style.backgroundColor = theme.backgroundColor;
        }
    }

    loadConfig() {
        if (typeof OverlayConfig !== 'undefined' && OverlayConfig) {
            this.config = OverlayConfig;
            console.log('✅ Config loaded for Puzzle Photo Overlay');
            
            // Update puzzle size from config
            if (this.config?.puzzlePhoto?.size) {
                const sizeStr = this.config.puzzlePhoto.size;
                const size = sizeStr === '4x4' ? 4 : 3;
                if (this.components.puzzlePhoto) {
                    this.components.puzzlePhoto.setSize(size);
                }
            }
        } else {
            console.warn('⚠️ OverlayConfig belum tersedia');
        }
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

    isGiftInCoinRange(giftName, coinMin, coinMax) {
        if (!this.giftsData || !giftName) return false;
        
        const gift = this.giftsData.gifts.find(g => 
            g.name && g.name.toLowerCase() === giftName.toLowerCase()
        );
        
        if (!gift || gift.coin === undefined) return false;
        
        const coin = parseInt(gift.coin);
        const min = coinMin !== null && coinMin !== undefined ? parseInt(coinMin) : 0;
        const max = coinMax !== null && coinMax !== undefined ? parseInt(coinMax) : Infinity;
        
        return coin >= min && coin <= max;
    }

    getGiftCoin(giftName) {
        if (!this.giftsData || !giftName) return 0;
        
        const gift = this.giftsData.gifts.find(g => 
            g.name && g.name.toLowerCase() === giftName.toLowerCase()
        );
        
        return gift && (gift.coins !== undefined) ? parseInt(gift.coins) : 0;
    }

    setupEventListeners() {
        // Keyboard shortcut untuk testing
        document.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') {
                // Test dengan gambar default
                this.triggerPuzzlePhoto('/assets/images/tiktok-default-photo.jpg');
            }
        });
    }

    triggerEvent(eventType, data) {
        console.log('this.config:', this.config);
        
        // Proses event sesuai config trigger setting
        switch(eventType) {
            case 'puzzle-photo':
                // Event puzzle-photo langsung (dari API atau manual trigger)
                console.log('🧩 Triggering puzzle-photo event with data:', data);
                this.triggerPuzzlePhoto(data.imageUrl || data.giftImageUrl);
                break;
            
            case 'gift':
                // Trigger puzzle photo jika puzzlePhoto enabled dan gift sesuai konfigurasi
                if (this.config?.puzzlePhoto) {
                    const giftName = data.giftName || '';
                    const giftCoin = this.getGiftCoin(giftName);
                    const giftImageUrl = data.giftImageUrl || null;
                    const avatarUrl = data.avatarUrl || data.profilePictureUrl || null;
                    
                    // Check coin requirement based on puzzle size
                    const puzzleSize = this.config?.puzzlePhoto?.size || '3x3';
                    const requiredCoin = puzzleSize === '4x4' 
                        ? (this.config?.puzzlePhoto?.coin4x4 || 10)
                        : (this.config?.puzzlePhoto?.coin3x3 || 5);
                    
                    if (giftCoin >= requiredCoin && avatarUrl) {
                        console.log(`🧩 Triggering puzzle-photo from gift event: ${giftName} (${giftCoin} coin, required: ${requiredCoin})`);
                        this.triggerPuzzlePhoto(avatarUrl);
                    } else {
                        console.log(`ℹ️ Gift event ignored - gift "${giftName}" coin (${giftCoin}) is less than required (${requiredCoin}) or no image`);
                    }
                } else {
                    console.log(`ℹ️ Gift event ignored - puzzlePhoto not configured`);
                }
                break;
        }
    }

    triggerPuzzlePhoto(imageUrl) {
        if (!imageUrl) {
            console.warn('⚠️ No image URL provided for puzzle photo');
            return;
        }

        if (!this.components.puzzlePhoto) {
            console.error('❌ PuzzlePhoto component not initialized');
            return;
        }

        // Set puzzle size from config
        const puzzleSize = this.config?.puzzlePhoto?.size || '3x3';
        const size = puzzleSize === '4x4' ? 4 : 3;
        this.components.puzzlePhoto.setSize(size);

        // Set image and create puzzle
        this.components.puzzlePhoto.setImage(imageUrl);
        console.log(`🧩 Puzzle photo created with size ${size}x${size} and image: ${imageUrl}`);
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
                console.log('🎬 Initializing Puzzle Photo Overlay...');
                overlay = new PuzzlePhotoOverlay();
                window.puzzlePhotoOverlay = overlay;
            }
        };
        
        // Tunggu sedikit untuk memastikan window.currentLiveCode sudah diset oleh config-loader
        const waitForLiveCode = () => {
            const liveCode = window.currentLiveCode || 
                (window.location.pathname.match(/\/live\/puzzle-photo\/([^\/]+)/) || [])[1];
            
            if (liveCode) {
                console.log(`📡 Live code detected: ${liveCode}`);
                connectWebhookServer();
                initWithConfig();
            } else {
                console.warn('⚠️ Live code belum ditemukan, menunggu...');
                setTimeout(waitForLiveCode, 100);
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', waitForLiveCode);
        } else {
            waitForLiveCode();
        }
    }
}

function connectWebhookServer() {
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
        return;
    }
    
    // Extract live code dari URL: /live/puzzle-photo/:id
    const liveCode = window.currentLiveCode || (() => {
        // Pattern: /live/puzzle-photo/{liveCode}
        const pathname = window.location.pathname;
        console.log('🔍 Extracting live code from pathname:', pathname);
        const pathMatch = pathname.match(/^\/live\/puzzle-photo\/([^\/\?]+)/);
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
        console.error('   Expected pattern: /live/puzzle-photo/{liveCode}');
        console.error('   Example: /live/puzzle-photo/abc123xyz');
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
                    // Update puzzle size if changed
                    if (overlay.config?.puzzlePhoto?.size && overlay.components.puzzlePhoto) {
                        const sizeStr = overlay.config.puzzlePhoto.size;
                        const size = sizeStr === '4x4' ? 4 : 3;
                        overlay.components.puzzlePhoto.setSize(size);
                    }
                }
                return;
            }
            
            // Proses event sesuai config trigger setting
            // Event yang didukung: puzzle-photo, gift
            const supportedEvents = ['puzzle-photo', 'gift'];
            if (supportedEvents.includes(data.type)) {
                console.log(`📥 Received ${data.type} event:`, data);
                if (data.data && overlay) {
                    overlay.triggerEvent(data.type, data.data);
                } else {
                    console.warn(`⚠️ ${data.type} event received but overlay or data is missing:`, { overlay: !!overlay, data: data.data });
                }
            } else {
                console.log(`ℹ️ Ignoring event type: ${data.type} (this overlay only processes puzzle-photo trigger events)`);
            }
        } catch (error) {
            console.error('Error processing webhook event:', error);
        }
    };
    
    eventSource.onerror = (error) => {
        console.error('❌ EventSource error:', error);
        // Reconnect after 3 seconds
        setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connectWebhookServer();
        }, 3000);
    };
}

// Initialize when script loads
initializeOverlay();

