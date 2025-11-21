// Chat Overlay - Script khusus untuk live chat overlay
// Overlay ini HANYA menampilkan chat overlay, tidak menampilkan:
// - Follower Alert
// - Gift Alert
// - Widget Container
// - Custom Banner
// - Floating Photos Effect
// - Firework Effect
// - Jedag Jedug Effect
// Hanya menerima dan memproses event 'chat' dan 'viewer'

class ChatOverlayManager {
    constructor() {
        this.config = typeof OverlayConfig !== 'undefined' ? OverlayConfig : { features: {} };
        this.components = {};
        this.init();
    }

    async init() {
        // Add class to body based on pathname for specific styling
        const pathname = window.location.pathname;
        if (pathname.match(/^\/live\/chat\//)) {
            document.body.classList.add('live-chat-overlay');
        }

        // Load ChatOverlay component
        await ComponentLoader.loadComponents([
            { name: 'ChatOverlay', target: '#chat-overlay-container' }
        ]);

        // Initialize ChatOverlay component
        this.components.chatOverlay = new ChatOverlay({
            maxMessages: this.config?.chat?.maxMessages || 10
        });

        // Initialize ViewerCount component (untuk viewer count di chat header)
        this.components.viewerCount = new ViewerCount();

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
                        if (this.config.chat.position.right) {
                            chatOverlay.style.right = this.config.chat.position.right;
                        }
                        if (this.config.chat.position.top) {
                            chatOverlay.style.top = this.config.chat.position.top;
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
        
        // Apply theme gradients ke chat header
        const chatHeader = document.querySelector('.chat-header');
        if (chatHeader && this.config.theme?.primary?.gradient) {
            chatHeader.style.background = this.config.theme.primary.gradient;
        }
    }

    // Apply feature flags untuk hide/show elemen
    applyFeatureFlags() {
        const chatOverlay = document.getElementById('chat-overlay');
        if (chatOverlay) {
            chatOverlay.style.display = this.isFeatureEnabled('chatOverlay') ? 'block' : 'none';
        }

        const viewerCountInChat = document.querySelector('.viewer-count');
        if (viewerCountInChat) {
            viewerCountInChat.style.display = this.isFeatureEnabled('viewerCount') ? 'block' : 'none';
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
            if (e.key === 'c' || e.key === 'C') {
                this.addChatMessage('TestUser' + Math.floor(Math.random() * 1000), 'Halo semua!');
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

    addChatMessage(username, message) {
        if (!this.isFeatureEnabled('chatOverlay')) return;
        if (this.components.chatOverlay) {
            this.components.chatOverlay.addMessage(username, message);
        }
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

    triggerEvent(eventType, data) {
        switch(eventType) {
            case 'chat':
                this.addChatMessage(data.username, data.message);
                break;
            case 'viewer':
                this.updateViewerCount(data.count);
                break;
            default:
                // Event lain diabaikan
                console.log(`ℹ️ Ignoring event type "${eventType}" - chat overlay only processes chat and viewer events`);
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
                console.log('🎬 Initializing Chat Overlay...');
                overlay = new ChatOverlayManager();
                window.chatOverlay = overlay;
                
                // Tunggu sedikit untuk memastikan window.currentLiveCode sudah diset oleh config-loader
                // atau ekstrak langsung dari URL jika belum tersedia
                const waitForLiveCode = () => {
                    const liveCode = window.currentLiveCode || (() => {
                        const pathname = window.location.pathname;
                        const pathMatch = pathname.match(/^\/live\/chat\/([^\/\?]+)/);
                        return pathMatch && pathMatch[1] ? pathMatch[1] : null;
                    })();
                    
                    const username = window.currentUsername || (() => {
                        const pathname = window.location.pathname;
                        const pathMatch = pathname.match(/^\/overlay\/chat\/([^\/\?]+)/);
                        return pathMatch && pathMatch[1] ? pathMatch[1] : null;
                    })();
                    
                    if (liveCode || username) {
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
    
    overlay = new ChatOverlayManager();
    window.chatOverlay = overlay;
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
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
        return;
    }
    
    // Check if socket.io is available
    if (typeof io === 'undefined') {
        console.error('❌ Socket.IO client library not loaded');
        return;
    }
    
    // Extract live code atau username dari URL
    const liveCode = window.currentLiveCode || (() => {
        // Pattern: /live/chat/{liveCode}
        const pathname = window.location.pathname;
        console.log('🔍 Extracting live code from pathname:', pathname);
        const pathMatch = pathname.match(/^\/live\/chat\/([^\/\?]+)/);
        if (pathMatch && pathMatch[1]) {
            const extractedCode = pathMatch[1];
            console.log('✅ Extracted live code:', extractedCode);
            return extractedCode;
        }
        console.warn('⚠️ Failed to extract live code from pathname:', pathname);
        return null;
    })();
    
    const username = window.currentUsername || (() => {
        // Pattern: /overlay/chat/{username}
        const pathname = window.location.pathname;
        console.log('🔍 Extracting username from pathname:', pathname);
        const pathMatch = pathname.match(/^\/overlay\/chat\/([^\/\?]+)/);
        if (pathMatch && pathMatch[1]) {
            const extractedUsername = pathMatch[1];
            console.log('✅ Extracted username:', extractedUsername);
            return extractedUsername;
        }
        return null;
    })();
    
    // Disconnect existing socket if any
    if (window.currentSocket) {
        window.currentSocket.disconnect();
    }
    
    // Connect to Socket.IO server
    const socket = io();
    window.currentSocket = socket;
    
    // Handle connection
    socket.on('connect', () => {
        if (liveCode) {
            console.log(`🔌 Connecting to webhook server for live code: ${liveCode}...`);
            socket.emit('join-by-code', { code: liveCode });
        } else if (username) {
            console.log(`🔌 Connecting to webhook server for user: ${username}...`);
            socket.emit('join-by-username', { username: username });
        } else {
            console.log(`🔌 Connecting to webhook server...`);
            socket.emit('join');
        }
    });
    
    // Handle events from server
    socket.on('event', (data) => {
        try {
            console.log('📥 Received Socket.IO event:', data);
            
            if (data.type === 'connected') {
                if (data.liveCode) {
                    console.log(`✅ Connected to webhook server for live code: ${data.liveCode}${data.username ? ` (user: ${data.username})` : ''}`);
                } else if (data.username) {
                    console.log(`✅ Connected to webhook server for user: ${data.username}`);
                } else {
                    console.log(`✅ Connected to webhook server`);
                }
                return;
            }
            
            if (data.type === 'config-updated' && data.data && data.data.config) {
                console.log('🔄 Config updated, reloading...');
                reloadConfig(data.data.config);
                return;
            }
            
            if (data.type === 'state-sync' && data.data && overlay) {
                console.log('🔄 State sync received, synchronizing chat overlay...');
                // Sync chat messages
                if (data.data.chatMessages && Array.isArray(data.data.chatMessages) && overlay.components.chatOverlay) {
                    overlay.components.chatOverlay.clearMessages();
                    data.data.chatMessages.forEach(msg => {
                        overlay.components.chatOverlay.addMessage(msg.username, msg.message);
                    });
                    console.log(`✅ Synced ${data.data.chatMessages.length} chat messages`);
                }
                // Sync viewer count
                if (data.data.viewerCount !== undefined && overlay.components.viewerCount) {
                    overlay.components.viewerCount.update(data.data.viewerCount);
                    console.log(`✅ Synced viewer count: ${data.data.viewerCount}`);
                }
                return;
            }
            
            // Proses event sesuai config trigger setting
            // Event yang didukung: chat, viewer
            const supportedEvents = ['chat', 'viewer'];
            if (supportedEvents.includes(data.type)) {
                console.log(`📥 Received ${data.type} event:`, data);
                if (data.data && overlay) {
                    overlay.triggerEvent(data.type, data.data);
                } else {
                    console.warn(`⚠️ ${data.type} event received but overlay or data is missing:`, { overlay: !!overlay, data: data.data });
                }
            } else {
                console.log(`ℹ️ Ignoring event type: ${data.type} (chat overlay only processes chat and viewer events)`);
            }
        } catch (error) {
            console.error('Error processing webhook event:', error);
        }
    });
    
    // Handle errors
    socket.on('error', (error) => {
        console.error('❌ Socket.IO error:', error);
    });
    
    // Handle disconnect
    socket.on('disconnect', (reason) => {
        console.warn(`❌ Webhook connection disconnected: ${reason}`);
        // Auto-reconnect is handled by socket.io by default
        if (reason === 'io server disconnect') {
            // Server disconnected, reconnect manually
            setTimeout(() => {
                console.log('🔄 Retrying webhook connection...');
                connectWebhookServer();
            }, 5000);
        }
    });
    
    // Handle reconnect
    socket.on('reconnect', (attemptNumber) => {
        console.log(`✅ Reconnected to webhook server after ${attemptNumber} attempts`);
        // Re-join after reconnection
        if (liveCode) {
            socket.emit('join-by-code', { code: liveCode });
        } else if (username) {
            socket.emit('join-by-username', { username: username });
        } else {
            socket.emit('join');
        }
    });
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
            overlay.addChatMessage('Viewer1', 'Halo streamer!');
        }, 1000);
        
        setTimeout(() => {
            overlay.addChatMessage('Viewer2', 'Stream bagus!');
        }, 2000);
        
        setTimeout(() => {
            overlay.addChatMessage('Viewer3', 'Keep it up!');
        }, 3000);
        
        overlay.updateViewerCount(125);
    }
    
    runDemo();
}

