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
        this.queue = []; // Antrian untuk puzzle photo
        this.isProcessing = false; // Flag untuk mengetahui apakah puzzle sedang diproses
        this.init();
    }

    async init() {
        // Initialize PuzzlePhoto component dengan callback ketika puzzle selesai
        this.components.puzzlePhoto = new PuzzlePhoto({
            puzzlePhoto: this.config?.puzzlePhoto,
            onPuzzleComplete: () => {
                this.onPuzzleComplete();
            }
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
            
            // Puzzle size will be determined dynamically based on gift coin
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
                this.triggerPuzzlePhoto('/assets/images/tiktok-default-photo.jpg', 3, 'Test User', '/assets/images/tiktok-default-photo.jpg', 'Test Gift');
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
                const imageUrl = data.imageUrl || data.giftImageUrl;
                const size = data.size || null; // Size bisa dikirim dari event (3 atau 4)
                const username = data.username || 'User';
                const avatarUrl = data.avatarUrl || data.profilePictureUrl || imageUrl;
                this.triggerPuzzlePhoto(imageUrl, size, username, avatarUrl);
                break;
            
            case 'gift':
                // Trigger puzzle photo jika gift sesuai konfigurasi
                if (this.config?.puzzlePhoto) {
                    const giftName = data.giftName || '';
                    const giftCoin = this.getGiftCoin(giftName);
                    const avatarUrl = data.avatarUrl || data.profilePictureUrl || null;
                    const username = data.username || 'User';
                    
                    if (!avatarUrl) {
                        console.log(`ℹ️ Gift event ignored - no avatar image available`);
                        break;
                    }
                    
                    // Check coin requirement for both sizes
                    const coin3x3 = this.config?.puzzlePhoto?.coin3x3 || 1;
                    const coin4x4 = this.config?.puzzlePhoto?.coin4x4 || 10;
                    
                    // Determine which puzzle size to trigger (prioritize larger if coin is enough)
                    let puzzleSize = null;
                    if (giftCoin >= coin4x4) {
                        puzzleSize = 4; // Trigger 4x4
                        console.log(`🧩 Triggering puzzle-photo 4x4 from gift event: ${giftName} (${giftCoin} coin, required: ${coin4x4})`);
                    } else if (giftCoin >= coin3x3) {
                        puzzleSize = 3; // Trigger 3x3
                        console.log(`🧩 Triggering puzzle-photo 3x3 from gift event: ${giftName} (${giftCoin} coin, required: ${coin3x3})`);
                    }
                    
                    if (puzzleSize) {
                        this.triggerPuzzlePhoto(avatarUrl, puzzleSize, username, avatarUrl, giftName);
                    } else {
                        console.log(`ℹ️ Gift event ignored - gift "${giftName}" coin (${giftCoin}) is less than required (3x3: ${coin3x3}, 4x4: ${coin4x4}) or sizes disabled`);
                    }
                } else {
                    console.log(`ℹ️ Gift event ignored - puzzlePhoto not configured`);
                }
                break;
        }
    }

    triggerPuzzlePhoto(imageUrl, size = null, username = 'User', avatarUrl = null, giftName = null) {
        if (!imageUrl) {
            console.warn('⚠️ No image URL provided for puzzle photo');
            return;
        }

        if (!this.components.puzzlePhoto) {
            console.error('❌ PuzzlePhoto component not initialized');
            return;
        }

        // Tambahkan ke antrian
        const puzzleSize = size || 3;
        this.queue.push({
            imageUrl: imageUrl,
            size: puzzleSize,
            username: username,
            avatarUrl: avatarUrl || imageUrl,
            giftName: giftName
        });
        
        console.log(`📋 Puzzle photo ditambahkan ke antrian (user: ${username}, ukuran: ${puzzleSize}x${puzzleSize}, total dalam antrian: ${this.queue.length})`);
        
        // Update tampilan avatar dari antrian
        this.updateQueueAvatars();
        
        // Proses antrian jika belum ada yang diproses
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    processQueue() {
        // Jika antrian kosong atau sedang memproses, return
        if (this.queue.length === 0 || this.isProcessing) {
            return;
        }

        // Ambil item pertama dari antrian (jangan shift, biarkan di queue untuk ditampilkan)
        const item = this.queue[0];
        this.isProcessing = true;

        console.log(`🔄 Memproses puzzle photo dari antrian (user: ${item.username}, ukuran: ${item.size}x${item.size}, tersisa: ${this.queue.length})`);

        // Update tampilan avatar dari antrian (skip yang sedang diproses)
        this.updateQueueAvatars();

        // Tampilkan user info
        this.showUserInfo(item.username, item.giftName);

        // Set puzzle size
        this.components.puzzlePhoto.setSize(item.size);

        // Set image and create puzzle
        this.components.puzzlePhoto.setImage(item.imageUrl);
        console.log(`🧩 Puzzle photo dibuat dengan ukuran ${item.size}x${item.size} dan gambar: ${item.imageUrl}`);
    }

    onPuzzleComplete() {
        console.log('✅ Puzzle selesai, menunggu beberapa detik sebelum memproses antrian berikutnya...');
        
        // Hapus item yang sudah selesai dari antrian
        if (this.queue.length > 0) {
            this.queue.shift();
        }
        
        // Update tampilan avatar dari antrian
        this.updateQueueAvatars();
        
        // Tunggu beberapa detik sebelum memproses item berikutnya (untuk menampilkan hasil)
        setTimeout(() => {
            this.isProcessing = false;
            
            // Sembunyikan user info jika tidak ada item lagi
            if (this.queue.length === 0) {
                this.hideUserInfo();
            }
            
            // Proses item berikutnya dalam antrian jika ada
            if (this.queue.length > 0) {
                console.log(`📋 Masih ada ${this.queue.length} item dalam antrian, melanjutkan...`);
                this.processQueue();
            } else {
                console.log('📋 Antrian kosong, menunggu puzzle photo berikutnya...');
            }
        }, 3000); // Tunggu 3 detik sebelum memproses berikutnya
    }

    showUserInfo(username, giftName) {
        const userInfoEl = document.getElementById('puzzle-user-info');
        if (!userInfoEl) return;

        const userNameEl = userInfoEl.querySelector('.user-name');
        const userGiftEl = userInfoEl.querySelector('.user-gift');

        if (userNameEl) {
            userNameEl.textContent = username;
        }

        if (userGiftEl) {
            if (giftName) {
                userGiftEl.textContent = `Mengirim ${giftName}`;
            } else {
                userGiftEl.textContent = '';
            }
        }

        userInfoEl.classList.add('active');
    }

    hideUserInfo() {
        const userInfoEl = document.getElementById('puzzle-user-info');
        if (userInfoEl) {
            userInfoEl.classList.remove('active');
        }
    }

    updateQueueAvatars() {
        const containerLeft = document.getElementById('puzzle-avatars-container-left');
        const containerBottom = document.getElementById('puzzle-avatars-container-bottom');
        const containerRight = document.getElementById('puzzle-avatars-container-right');
        
        if (!containerLeft || !containerBottom || !containerRight) return;

        // Hapus semua avatar yang ada dari semua container
        containerLeft.innerHTML = '';
        containerBottom.innerHTML = '';
        containerRight.innerHTML = '';

        // Tampilkan avatar dari antrian yang belum diproses (skip yang sedang diproses)
        // Mulai dari index 1 karena index 0 sedang diproses
        const avatarsToShow = this.isProcessing ? this.queue.slice(1) : this.queue;
        
        // Deteksi mobile (max-width 768px)
        const isMobile = window.innerWidth <= 768;
        const maxAvatarsPerContainer = isMobile ? 7 : 8;
        const totalMaxAvatars = maxAvatarsPerContainer * 3; // Mobile: 21 total (7 kiri, 7 bawah, 7 kanan), Desktop: 24 total (8 kiri, 8 bawah, 8 kanan)

        // Hitung jumlah avatar yang tidak terlihat
        const remainingCount = avatarsToShow.length - totalMaxAvatars;
        const shouldShowIndicator = remainingCount > 0;

        // Tentukan berapa banyak avatar yang akan ditampilkan
        // Jika ada sisa, hanya tampilkan (totalMaxAvatars - 1) avatar + 1 indikator
        const avatarsToDisplay = shouldShowIndicator ? totalMaxAvatars - 1 : totalMaxAvatars;

        avatarsToShow.slice(0, avatarsToDisplay).forEach((item, index) => {
            const avatarEl = document.createElement('img');
            avatarEl.className = `queue-avatar position-${index % maxAvatarsPerContainer} active`;
            avatarEl.src = item.avatarUrl || item.imageUrl;
            avatarEl.alt = item.username || 'User';
            avatarEl.title = item.username || 'User';

            // Distribusikan ke container yang sesuai
            if (index < maxAvatarsPerContainer) {
                // Container kiri: index 0-7
                containerLeft.appendChild(avatarEl);
            } else if (index < maxAvatarsPerContainer * 2) {
                // Container bawah: index 8-15
                containerBottom.appendChild(avatarEl);
            } else {
                // Container kanan: index 16-22 (jika ada indikator) atau 16-23 (jika tidak ada)
                containerRight.appendChild(avatarEl);
            }
        });

        // Tambahkan indikator "+X" di container kanan jika ada sisa
        if (shouldShowIndicator) {
            const indicatorEl = document.createElement('div');
            indicatorEl.className = `queue-avatar position-${maxAvatarsPerContainer - 1} active queue-avatar-indicator`;
            indicatorEl.textContent = `+${remainingCount}`;
            
            const avatarSize = isMobile ? '40px' : '60px';
            
            indicatorEl.style.cssText = `
                width: ${avatarSize};
                height: ${avatarSize};
                border-radius: 50%;
                border: 3px solid #fff;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Poppins', sans-serif;
                font-size: 18px;
                font-weight: 600;
                color: #fff;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
                transition: opacity 0.3s ease, transform 0.3s ease;
            `;
            indicatorEl.classList.add('active');
            containerRight.appendChild(indicatorEl);
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
                    // Puzzle size will be determined dynamically based on gift coin
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
                // console.log(`ℹ️ Ignoring event type: ${data.type} (this overlay only processes puzzle-photo trigger events)`);
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

