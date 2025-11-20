// Overlay TikTok Live - Main Script (Component-based)

class TikTokOverlay {
    constructor() {
        this.config = typeof OverlayConfig !== 'undefined' ? OverlayConfig : { features: {} };
        this.components = {};
        this.giftsData = null;
        this.init();
    }

    async init() {
        // Load all HTML components
        await ComponentLoader.loadComponents([
            { name: 'FollowerAlert', target: '#follower-alert-container' },
            { name: 'GiftAlert', target: '#gift-alert-container' },
            { name: 'ChatOverlay', target: '#chat-overlay-container' },
            { name: 'WidgetContainer', target: '#widget-container-container' },
            { name: 'CustomBanner', target: '#custom-banner-container' },
            { name: 'FloatingPhotosContainer', target: '#floating-photos-container-container' }
        ]);

        // Initialize components
        this.components.followerAlert = new FollowerAlert({
            duration: this.config?.alerts?.follower?.duration || 5000
        });

        this.components.giftAlert = new GiftAlert({
            duration: this.config?.alerts?.gift?.duration || 6000
        });

        this.components.chatOverlay = new ChatOverlay({
            maxMessages: this.config?.chat?.maxMessages || 10
        });

        this.components.streamTimer = new StreamTimer();
        this.components.viewerCount = new ViewerCount();
        this.components.customBanner = new CustomBanner();
        this.components.floatingPhotos = new FloatingPhotos({
            floatingPhotos: this.config?.floatingPhotos,
            giftFirework: this.config?.giftFirework,
            maxPhotos: this.config?.floatingPhotos?.maxPhotos || 100
        });

        this.components.jedagJedug = new JedagJedug({
            jedagJedug: this.config?.giftJedagJedug
        });

        this.loadConfig();
        this.loadGiftsData();
        this.initViewerCountWidget();
        this.applyFeatureFlags();
        this.applyThemeAndPositions();
        this.startStreamTimer();
        this.setupEventListeners();
        this.initFloatingPhotos();
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

    // Apply theme colors dan positions dari config
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
        if (this.config.alerts) {
            const followerAlert = document.getElementById('follower-alert');
            if (followerAlert && this.config.alerts.follower?.position) {
                if (this.config.alerts.follower.position.top) {
                    followerAlert.style.top = this.config.alerts.follower.position.top;
                }
                if (this.config.alerts.follower.position.right) {
                    followerAlert.style.right = this.config.alerts.follower.position.right;
                }
            }
            
            const giftAlert = document.getElementById('gift-alert');
            if (giftAlert && this.config.alerts.gift?.position) {
                if (this.config.alerts.gift.position.top) {
                    giftAlert.style.top = this.config.alerts.gift.position.top;
                }
                if (this.config.alerts.gift.position.right) {
                    giftAlert.style.right = this.config.alerts.gift.position.right;
                }
            }
        }
        
        // Apply chat position dan size (dengan pertimbangan responsive)
        if (this.config.chat) {
            const chatOverlay = document.getElementById('chat-overlay');
            if (chatOverlay) {
                // Cek apakah kita di mobile viewport
                const isMobile = window.innerWidth <= 768;
                const isSmallMobile = window.innerWidth <= 480;
                
                // Di mobile, biarkan CSS media queries yang mengatur
                if (!isMobile) {
                    if (this.config.chat.position) {
                        if (this.config.chat.position.bottom) {
                            chatOverlay.style.bottom = this.config.chat.position.bottom;
                        }
                        if (this.config.chat.position.left) {
                            chatOverlay.style.left = this.config.chat.position.left;
                        }
                    }
                    if (this.config.chat.width) {
                        chatOverlay.style.width = this.config.chat.width;
                    }
                    if (this.config.chat.maxHeight) {
                        chatOverlay.style.maxHeight = this.config.chat.maxHeight;
                    }
                } else {
                    // Di mobile, hapus inline styles yang mungkin mengganggu responsive
                    chatOverlay.style.bottom = '';
                    chatOverlay.style.left = '';
                    chatOverlay.style.right = '';
                    chatOverlay.style.width = '';
                    chatOverlay.style.maxHeight = '';
                }
            }
        }
        
        // Apply stream timer position
        if (this.config.widgets?.streamTimer?.position) {
            const timerWidget = document.getElementById('stream-duration')?.closest('.widget-box');
            if (timerWidget) {
                if (this.config.widgets.streamTimer.position.top) {
                    timerWidget.style.top = this.config.widgets.streamTimer.position.top;
                }
                if (this.config.widgets.streamTimer.position.left) {
                    timerWidget.style.left = this.config.widgets.streamTimer.position.left;
                }
            }
        }
        
        // Apply theme gradients ke alert boxes
        const followerAlertBox = document.querySelector('#follower-alert .alert-box');
        if (followerAlertBox && this.config.theme?.primary?.gradient) {
            followerAlertBox.style.background = this.config.theme.primary.gradient;
        }
        
        const giftAlertBox = document.querySelector('#gift-alert .alert-box');
        if (giftAlertBox && this.config.theme?.secondary?.gradient) {
            giftAlertBox.style.background = this.config.theme.secondary.gradient;
        }
        
        const chatHeader = document.querySelector('.chat-header');
        if (chatHeader && this.config.theme?.primary?.gradient) {
            chatHeader.style.background = this.config.theme.primary.gradient;
        }
        
        const bannerContent = document.querySelector('.banner-content');
        if (bannerContent && this.config.theme?.primary?.gradient) {
            bannerContent.style.background = this.config.theme.primary.gradient;
        }
    }

    // Apply feature flags untuk hide/show elemen
    applyFeatureFlags() {
        const followerAlert = document.getElementById('follower-alert');
        if (followerAlert) {
            followerAlert.style.display = this.isFeatureEnabled('followerAlert') ? 'block' : 'none';
        }

        const giftAlert = document.getElementById('gift-alert');
        if (giftAlert) {
            giftAlert.style.display = this.isFeatureEnabled('giftAlert') ? 'block' : 'none';
        }
        
        // Update scale untuk floating photos jika ada
        if (this.components.floatingPhotos && this.config?.floatingPhotos?.scale) {
            const scale = this.config.floatingPhotos.scale;
            if (this.components.floatingPhotos.config) {
                this.components.floatingPhotos.config.scale = scale;
            }
        }

        const chatOverlay = document.getElementById('chat-overlay');
        if (chatOverlay) {
            chatOverlay.style.display = this.isFeatureEnabled('chatOverlay') ? 'block' : 'none';
        }

        const streamStatus = document.getElementById('stream-status');
        if (streamStatus) {
            const streamStatusWidget = streamStatus.closest('.widget-box');
            if (streamStatusWidget) {
                const streamStatusConfig = this.config?.widgets?.streamStatus;
                const isEnabled = streamStatusConfig?.enabled !== false;
                streamStatusWidget.style.display = isEnabled ? 'block' : 'none';
                
                if (isEnabled && streamStatusConfig) {
                    const labelEl = streamStatusWidget.querySelector('.widget-label');
                    if (labelEl && streamStatusConfig.label) {
                        labelEl.textContent = streamStatusConfig.label;
                    }
                    if (streamStatusConfig.defaultValue) {
                        streamStatus.textContent = streamStatusConfig.defaultValue;
                    }
                }
            }
        }
        
        const streamTimer = document.getElementById('stream-duration');
        if (streamTimer) {
            const timerWidget = streamTimer.closest('.widget-box');
            if (timerWidget) {
                timerWidget.style.display = this.isFeatureEnabled('streamTimer') ? 'block' : 'none';
            }
        }

        const viewerCountEl = document.getElementById('viewer-count');
        if (viewerCountEl) {
            const viewerWidget = viewerCountEl.closest('.widget-box');
            if (viewerWidget) {
                viewerWidget.style.display = this.isFeatureEnabled('viewerCount') ? 'block' : 'none';
            }
            const viewerCountInChat = document.querySelector('.viewer-count');
            if (viewerCountInChat) {
                viewerCountInChat.style.display = this.isFeatureEnabled('viewerCount') ? 'block' : 'none';
            }
        }

        const customBanner = document.getElementById('custom-banner');
        if (customBanner) {
            customBanner.style.display = this.isFeatureEnabled('customBanner') ? 'block' : 'none';
        }

        const floatingPhotosContainer = document.getElementById('floating-photos-container');
        if (floatingPhotosContainer) {
            floatingPhotosContainer.style.display = this.isFeatureEnabled('floatingPhotos') ? 'block' : 'none';
        }
    }

    isFeatureEnabled(featureName) {
        if (this.config && this.config.features) {
            return this.config.features[featureName] !== false;
        }
        return true;
    }

    startStreamTimer() {
        if (!this.isFeatureEnabled('streamTimer')) {
            return;
        }
        if (this.components.streamTimer) {
            this.components.streamTimer.start();
        }
    }

    setupEventListeners() {
        // Keyboard shortcuts untuk testing
        document.addEventListener('keydown', (e) => {
            if (e.key === 'f' || e.key === 'F') {
                this.showFollowerAlert('TestUser' + Math.floor(Math.random() * 1000));
            }
            if (e.key === 'g' || e.key === 'G') {
                this.showGiftAlert('TestUser' + Math.floor(Math.random() * 1000), 'Rose', 10);
            }
            if (e.key === 'c' || e.key === 'C') {
                this.addChatMessage('TestUser' + Math.floor(Math.random() * 1000), 'Halo semua!');
            }
            if (e.key === 'b' || e.key === 'B') {
                this.showCustomBanner('Terima Kasih Sudah Menonton!');
            }
            if (e.key === 'p' || e.key === 'P') {
                const emojis = ['👤', '😊', '🎉', '⭐', '💫', '🌟', '✨'];
                this.addFloatingPhoto(null, emojis[Math.floor(Math.random() * emojis.length)]);
            }
        });
        
        // Handle window resize untuk responsive chat
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.applyThemeAndPositions();
            }, 250);
        });
    }

    showFollowerAlert(username) {
        if (!this.isFeatureEnabled('followerAlert')) return;
        if (this.components.followerAlert) {
            this.components.followerAlert.show(username);
        }
    }

    showGiftAlert(username, giftName, quantity, giftImageUrl = null) {
        if (!this.isFeatureEnabled('giftAlert')) return;
        if (this.components.giftAlert) {
            this.components.giftAlert.show(username, giftName, quantity, giftImageUrl);
        }
    }

    addChatMessage(username, message) {
        if (!this.isFeatureEnabled('chatOverlay')) return;
        if (this.components.chatOverlay) {
            this.components.chatOverlay.addMessage(username, message);
        }
    }

    showCustomBanner(text) {
        if (!this.isFeatureEnabled('customBanner')) return;
        if (this.components.customBanner) {
            this.components.customBanner.show(text);
        }
    }

    initViewerCountWidget() {
        // Tambahkan widget viewer count ke WidgetContainer jika enabled
        // Tunggu sedikit untuk memastikan komponen HTML sudah dimuat
        setTimeout(() => {
            if (!this.isFeatureEnabled('viewerCount')) return;
            
            const widgetContainer = document.querySelector('.widget-container');
            if (!widgetContainer) return;
            
            // Cek apakah widget viewer count sudah ada
            const existingWidget = widgetContainer.querySelector('#viewer-count-widget');
            if (existingWidget) return;
            
            // Cek konfigurasi widget
            const widgetConfig = this.config?.widgets?.viewerCount;
            if (widgetConfig?.enabled !== false) {
                // Buat widget viewer count
                const widgetBox = document.createElement('div');
                widgetBox.className = 'widget-box';
                widgetBox.id = 'viewer-count-widget';
                widgetBox.innerHTML = `
                    <div class="widget-label">Penonton</div>
                    <div class="widget-value" id="viewer-count">0</div>
                `;
                
                widgetContainer.appendChild(widgetBox);
                
                // Update viewer count jika sudah ada nilai
                if (this.components.viewerCount && this.components.viewerCount.count > 0) {
                    this.components.viewerCount.update(this.components.viewerCount.count);
                }
            }
        }, 200);
    }

    updateViewerCount(count) {
        if (!this.isFeatureEnabled('viewerCount')) return;
        if (this.components.viewerCount) {
            this.components.viewerCount.update(count);
        }
    }

    loadConfig() {
        const config = JSON.parse(localStorage.getItem('tiktok-overlay-config') || '{}');
        
        if (config.maxChatMessages && this.components.chatOverlay) {
            this.components.chatOverlay.setMaxMessages(config.maxChatMessages);
        }
        
        if (config.viewerCount && this.components.viewerCount) {
            this.components.viewerCount.update(config.viewerCount);
        }
    }

    initFloatingPhotos() {
        if (!this.isFeatureEnabled('floatingPhotos')) return;
        if (this.components.floatingPhotos) {
            // Update scale dari config
            const scale = this.config?.floatingPhotos?.scale || 1.0;
            if (this.components.floatingPhotos.config) {
                this.components.floatingPhotos.config.scale = scale;
            }
            this.components.floatingPhotos.init();
        }
    }

    addFloatingPhoto(imageUrl = null, emoji = null, scale = null) {
        if (!this.isFeatureEnabled('floatingPhotos')) return;
        if (this.components.floatingPhotos) {
            // Jika scale tidak diberikan, gunakan scale default dari config
            const finalScale = scale !== null ? scale : (this.config?.floatingPhotos?.scale || 1.0);
            this.components.floatingPhotos.addPhoto(imageUrl, emoji, finalScale);
        }
    }

    shouldTriggerFloatingPhoto(triggerType) {
        if (!this.isFeatureEnabled('floatingPhotos')) return false;
        const triggers = this.config?.floatingPhotos?.triggers || {};
        return triggers[triggerType] === true;
    }

    addFirework(imageUrl = null, emoji = null, centerX = null, centerY = null, count = 20) {
        if (!this.isFeatureEnabled('floatingPhotos')) return;
        if (this.components.floatingPhotos) {
            this.components.floatingPhotos.addFirework(imageUrl, emoji, centerX, centerY, count);
        }
    }

    triggerEvent(eventType, data) {
        switch(eventType) {
            case 'follower':
                this.showFollowerAlert(data.username);
                if (this.shouldTriggerFloatingPhoto('follow')) {
                    const avatarUrl = data.avatarUrl || data.profilePictureUrl || null;
                    const scale = this.config?.floatingPhotos?.triggers?.followScale || 1.0;
                    this.addFloatingPhoto(avatarUrl, '👤', scale);
                }
                break;
            case 'gift':
                this.showGiftAlert(data.username, data.giftName, data.quantity, data.giftImageUrl);
                
                // Cek apakah gift ini memicu floating photo effect (bukan firework)
                if (this.isFeatureEnabled('floatingPhotos') && this.config?.giftFloatingPhotos?.enabled) {
                    const giftName = data.giftName || '';
                    const selectionMode = this.config?.giftFloatingPhotos?.selectionMode || 'manual';
                    let shouldTriggerFloatingPhoto = false;
                    
                    if (selectionMode === 'coinRange') {
                        // Mode range coin
                        const coinMin = this.config?.giftFloatingPhotos?.coinMin;
                        const coinMax = this.config?.giftFloatingPhotos?.coinMax;
                        shouldTriggerFloatingPhoto = this.isGiftInCoinRange(giftName, coinMin, coinMax);
                    } else {
                        // Mode manual (default)
                        const floatingPhotosGifts = this.config?.giftFloatingPhotos?.gifts || [];
                        // Cek apakah gift name ada dalam daftar gift floating photos (case insensitive)
                        shouldTriggerFloatingPhoto = floatingPhotosGifts.some(gift => 
                            gift.toLowerCase() === giftName.toLowerCase()
                        );
                    }
                    
                    if (shouldTriggerFloatingPhoto) {
                        const avatarUrl = data.avatarUrl || data.profilePictureUrl || null;
                        const scale = this.config?.floatingPhotos?.triggers?.giftScale || 1.0;
                        this.addFloatingPhoto(avatarUrl, '🎁', scale);
                    }
                }
                
                // Cek apakah gift ini memicu firework effect
                if (this.isFeatureEnabled('floatingPhotos') && this.config?.giftFirework?.enabled) {
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
                        this.addFirework(avatarUrl, '🎉', centerX, centerY, count);
                    }
                }
                
                // Cek apakah gift ini memicu jedag jedug effect
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
                    
                    if (shouldTriggerJedagJedug && this.components.jedagJedug) {
                        // Tentukan posisi center (bisa null untuk tengah layar)
                        const centerX = this.config?.giftJedagJedug?.centerX !== undefined && this.config?.giftJedagJedug?.centerX !== null 
                            ? this.config.giftJedagJedug.centerX 
                            : null;
                        const centerY = this.config?.giftJedagJedug?.centerY !== undefined && this.config?.giftJedagJedug?.centerY !== null 
                            ? this.config.giftJedagJedug.centerY 
                            : null;
                        
                        // Gunakan avatarUrl jika ada
                        const avatarUrl = data.avatarUrl || data.profilePictureUrl || null;
                        this.components.jedagJedug.trigger(avatarUrl, centerX, centerY);
                    }
                }
                break;
            case 'chat':
                this.addChatMessage(data.username, data.message);
                if (this.shouldTriggerFloatingPhoto('chat')) {
                    const avatarUrl = data.avatarUrl || null;
                    const scale = this.config?.floatingPhotos?.triggers?.chatScale || 1.0;
                    this.addFloatingPhoto(avatarUrl, '💬', scale);
                }
                break;
            case 'share':
                // Handle share event jika ada
                if (this.shouldTriggerFloatingPhoto('share')) {
                    const avatarUrl = data.avatarUrl || data.profilePictureUrl || null;
                    const scale = this.config?.floatingPhotos?.triggers?.shareScale || 1.0;
                    this.addFloatingPhoto(avatarUrl, '📤', scale);
                }
                break;
            case 'viewer':
                this.updateViewerCount(data.count);
                break;
            case 'banner':
                this.showCustomBanner(data.text);
                break;
            case 'floating-photo':
                this.addFloatingPhoto(data.imageUrl, data.emoji);
                break;
            case 'firework':
                this.addFirework(data.imageUrl, data.emoji, data.centerX, data.centerY, data.count);
                break;
            case 'jedag-jedug':
                if (this.components.jedagJedug) {
                    this.components.jedagJedug.trigger(data.imageUrl, data.centerX, data.centerY);
                }
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
                console.log('🎬 Initializing TikTok Overlay...');
                overlay = new TikTokOverlay();
                window.tiktokOverlay = overlay;
                
                setTimeout(() => {
                    connectWebhookServer();
                }, 100);
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
    
    overlay = new TikTokOverlay();
    window.tiktokOverlay = overlay;
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
        
        if (newConfig.chat && newConfig.chat.maxMessages && overlay.components.chatOverlay) {
            overlay.components.chatOverlay.setMaxMessages(newConfig.chat.maxMessages);
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
    
    const liveCode = window.currentLiveCode || (() => {
        const pathMatch = window.location.pathname.match(/^\/live\/([^\/]+)/);
        return pathMatch ? pathMatch[1] : null;
    })();
    
    const username = window.currentUsername || (() => {
        const pathMatch = window.location.pathname.match(/^\/overlay\/([^\/]+)/);
        return pathMatch ? pathMatch[1] : null;
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
            
            if (data.type && data.data && overlay) {
                overlay.triggerEvent(data.type, data.data);
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
        }, 2000);
        
        setTimeout(() => {
            overlay.addChatMessage('Viewer1', 'Halo streamer!');
        }, 3000);
        
        setTimeout(() => {
            overlay.addChatMessage('Viewer2', 'Stream bagus!');
        }, 4000);
        
        setTimeout(() => {
            overlay.showGiftAlert('Viewer3', 'Rose', 5);
        }, 5000);
        
        overlay.updateViewerCount(125);
    }
    
    runDemo();
}

