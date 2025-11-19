// TikTok Live Connector Integration
// Menggunakan library: https://github.com/zerodytrash/TikTok-Live-Connector

const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');

class TikTokConnector {
    constructor(broadcastCallback) {
        this.connection = null;
        this.broadcastCallback = broadcastCallback;
        this.isConnected = false;
        this.username = null;
    }

    // Connect ke TikTok Live
    async connect(username, options = {}) {
        try {
            this.username = username;
            
            // Pastikan username dimulai dengan @
            if (!username.startsWith('@')) {
                username = '@' + username;
            }

            console.log(`🔗 Connecting to TikTok Live: ${username}`);

            // Buat koneksi baru
            this.connection = new TikTokLiveConnection(username, {
                sessionId: options.sessionId || null,
                ttTargetIdc: options.ttTargetIdc || null,
                ...options
            });

            // Setup event listeners
            this.setupEventListeners();

            // Connect
            await this.connection.connect();
            this.isConnected = true;
            
            console.log(`✅ Connected to TikTok Live: ${username}`);
            
            return true;
        } catch (error) {
            console.error('❌ Error connecting to TikTok Live:', error);
            this.isConnected = false;
            throw error;
        }
    }

    // Helper function untuk extract username dari data
    extractUsername(data) {
        return data.uniqueId || 
               data.nickname || 
               data.user?.uniqueId || 
               data.user?.nickname ||
               data.user?.displayName ||
               (data.user && data.user.uniqueId) ||
               'Anonymous';
    }

    // Helper function untuk extract avatar URL dari data
    extractAvatarUrl(data) {
        // Coba berbagai kemungkinan lokasi avatar URL
        
        const possiblePaths = [
            data.profilePictureUrl,
            data.avatarUrl,
            data.avatar,
            data.profilePicture,
            data.user?.profilePictureUrl,
            data.user?.avatarUrl,
            data.user?.avatar,
            data.user?.profilePicture,
            data.user?.profilePicture.url[0],
            data.user?.avatarMedium?.urlList?.[0],
            data.user?.avatarLarger?.urlList?.[0],
            data.user?.avatarThumb?.urlList?.[0],
            data.userInfo?.profilePictureUrl,
            data.userInfo?.avatarUrl,
            data.userInfo?.avatar,
            data.userInfo?.avatarMedium?.urlList?.[0],
            data.userInfo?.avatarLarger?.urlList?.[0],
            data.userInfo?.avatarThumb?.urlList?.[0],
            // Cek nested objects
            data.user?.user?.profilePictureUrl,
            data.user?.user?.avatarUrl,
            data.user?.user?.avatarMedium?.urlList?.[0],
        ];
        
        // Cari URL pertama yang valid
        for (const url of possiblePaths) {
            if (url && typeof url === 'string' && url.trim() !== '' && url !== 'null') {
                return url;
            }
        }
        
        return null;
    }

    // Setup semua event listeners
    setupEventListeners() {
        if (!this.connection) return;

        // Chat Message Event
        this.connection.on(WebcastEvent.CHAT, (data) => {
            // Log full data untuk debugging (hanya di development)
            if (process.env.DEBUG === 'true') {
                console.log('💬 Chat Event Data:', JSON.stringify(data, null, 2));
            }
            
            const username = this.extractUsername(data);
            const avatarUrl = data.user.profilePicture.url[0];
            
            console.log(`💬 Chat: ${username}: ${data.comment || data.text || ''}`);
            if (avatarUrl && process.env.DEBUG === 'true') {
                console.log(`   Avatar URL: ${avatarUrl}`);
            }
            
            this.broadcastCallback({
                type: 'chat',
                data: {
                    username: username,
                    message: data.comment || data.text || '',
                    avatarUrl: avatarUrl,
                }
            });
        });

        // Gift Event
        this.connection.on(WebcastEvent.GIFT, (data) => {
            // Log full data untuk debugging (hanya di development)
            if (process.env.DEBUG === 'true') {
                console.log('🎁 Gift Event Data:', JSON.stringify(data, null, 2));
            }
            
            const username = this.extractUsername(data);
            const avatarUrl = this.extractAvatarUrl(data);
            
            // Extract gift name dari giftDetails.giftName
            let giftName = null;
            if (data.giftDetails && data.giftDetails.giftName) {
                giftName = data.giftDetails.giftName;
            }
            
            // Fallback: coba path alternatif jika giftDetails tidak ada
            if (!giftName) {
                giftName = data.giftName || data.giftId || 'Gift';
            }
            
            // Extract gift image URL dari giftDetails.icon.url[0]
            let giftImageUrl = null;
            if (data.giftDetails && data.giftDetails.icon && data.giftDetails.icon.url) {
                if (Array.isArray(data.giftDetails.icon.url) && data.giftDetails.icon.url.length > 0) {
                    giftImageUrl = data.giftDetails.icon.url[0];
                } else if (typeof data.giftDetails.icon.url === 'string') {
                    giftImageUrl = data.giftDetails.icon.url;
                }
            }
            
            // Fallback: coba path alternatif jika giftDetails tidak ada
            if (!giftImageUrl) {
                if (data.gift?.icon?.url?.[0]) {
                    giftImageUrl = data.gift.icon.url[0];
                } else if (data.icon?.url?.[0]) {
                    giftImageUrl = data.icon.url[0];
                }
            }
            
            console.log(`🎁 Gift: ${username} sent ${data.giftCount || data.repeatCount || 1}x ${giftName}`);
            if (avatarUrl && process.env.DEBUG === 'true') {
                console.log(`   Avatar URL: ${avatarUrl}`);
            }
            if (giftImageUrl && process.env.DEBUG === 'true') {
                console.log(`   Gift Image URL: ${giftImageUrl}`);
            }
            
            this.broadcastCallback({
                type: 'gift',
                data: {
                    username: username,
                    giftName: giftName,
                    quantity: data.giftCount || data.repeatCount || 1,
                    avatarUrl: avatarUrl,
                    giftImageUrl: giftImageUrl,
                    giftId: data.giftId,
                    diamondCount: data.diamondCount
                }
            });
        });

        // Follow Event
        this.connection.on(WebcastEvent.FOLLOW, (data) => {
            // Log full data untuk debugging (hanya di development)
            if (process.env.DEBUG === 'true') {
                console.log('👋 Follow Event Data:', JSON.stringify(data, null, 2));
            }
            
            const username = this.extractUsername(data);
            const avatarUrl = this.extractAvatarUrl(data);
            
            console.log(`👋 Follow: ${username} followed!`);
            
            this.broadcastCallback({
                type: 'follower',
                data: {
                    username: username,
                    avatarUrl: avatarUrl
                }
            });
        });

        // Like Event
        this.connection.on(WebcastEvent.LIKE, (data) => {
            // Bisa digunakan untuk floating photo atau efek visual
            if (data.likeCount > 100) {
                this.broadcastCallback({
                    type: 'floating-photo',
                    data: {
                        emoji: '❤️'
                    }
                });
            }
        });

        // Viewer Count Update
        this.connection.on(WebcastEvent.VIEWER_UPDATE, (data) => {
            console.log(`👁️ Viewer count: ${data.viewerCount}`);
            
            this.broadcastCallback({
                type: 'viewer',
                data: {
                    count: data.viewerCount || 0
                }
            });
        });

        // Share Event
        this.connection.on(WebcastEvent.SHARE, (data) => {
            const username = this.extractUsername(data);
            
            console.log(`📤 Share: ${username} shared the stream!`);
            
            this.broadcastCallback({
                type: 'banner',
                data: {
                    text: `${username} shared the stream! 🎉`
                }
            });
        });

        // Subscribe Event (Membership)
        this.connection.on(WebcastEvent.SUBSCRIBE, (data) => {
            const username = this.extractUsername(data);
            
            console.log(`⭐ Subscribe: ${username} subscribed!`);
            
            this.broadcastCallback({
                type: 'banner',
                data: {
                    text: `🎉 ${username} subscribed! Thank you!`
                }
            });
        });

        // Error handling
        this.connection.on(WebcastEvent.ERROR, (error) => {
            console.error('❌ TikTok Live Error:', error);
        });

        // Disconnect handling
        this.connection.on(WebcastEvent.DISCONNECTED, () => {
            console.log('⚠️ Disconnected from TikTok Live');
            this.isConnected = false;
        });

        // Connection state
        this.connection.on(WebcastEvent.CONNECTED, () => {
            console.log('✅ TikTok Live connection established');
            this.isConnected = true;
        });
    }

    // Disconnect
    async disconnect() {
        if (this.connection) {
            try {
                await this.connection.disconnect();
                this.isConnected = false;
                console.log('👋 Disconnected from TikTok Live');
            } catch (error) {
                console.error('Error disconnecting:', error);
            }
        }
    }

    // Get connection state
    getState() {
        return {
            isConnected: this.isConnected,
            username: this.username
        };
    }

    // Fetch room info
    async fetchRoomInfo() {
        if (!this.connection) {
            throw new Error('Not connected to TikTok Live');
        }

        try {
            const roomInfo = await this.connection.fetchRoomInfo();
            return roomInfo;
        } catch (error) {
            console.error('Error fetching room info:', error);
            throw error;
        }
    }

    // Fetch available gifts
    async fetchAvailableGifts() {
        if (!this.connection) {
            throw new Error('Not connected to TikTok Live');
        }

        try {
            const gifts = await this.connection.fetchAvailableGifts();
            return gifts;
        } catch (error) {
            console.error('Error fetching gifts:', error);
            throw error;
        }
    }
}

module.exports = TikTokConnector;

