// Test script untuk TikTok Live Connector
const TikTokConnector = require('../src/backend/tiktok-connector');

// Ganti dengan username TikTok Anda (dengan atau tanpa @)
const username = process.env.TIKTOK_USERNAME || '@username';

console.log('🧪 Testing TikTok Live Connector...');
console.log(`Connecting to: ${username}\n`);

const connector = new TikTokConnector((event) => {
    console.log('📡 Event received:', JSON.stringify(event, null, 2));
});

connector.connect(username)
    .then(() => {
        console.log('\n✅ Successfully connected!');
        console.log('Waiting for events...\n');
        
        // Test fetch room info setelah 5 detik
        setTimeout(async () => {
            try {
                const roomInfo = await connector.fetchRoomInfo();
                console.log('📊 Room Info:', {
                    owner: roomInfo.owner?.nickname,
                    viewerCount: roomInfo.viewer_count,
                    streamUrl: roomInfo.stream_url?.hls_pull_url
                });
            } catch (error) {
                console.error('Error fetching room info:', error.message);
            }
        }, 5000);
    })
    .catch((error) => {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    });

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n👋 Disconnecting...');
    await connector.disconnect();
    process.exit(0);
});

