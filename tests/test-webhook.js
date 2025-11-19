// Script untuk testing webhook endpoints
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const SERVER_PORT = 3000;

// Helper function untuk check apakah server running
function checkServerRunning() {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${SERVER_PORT}/health`, (res) => {
            resolve(true);
        });
        
        req.on('error', () => {
            resolve(false);
        });
        
        req.setTimeout(2000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

// Helper function untuk wait server ready
async function waitForServer(maxAttempts = 10, delay = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
        const isRunning = await checkServerRunning();
        if (isRunning) {
            return true;
        }
        if (i < maxAttempts - 1) {
            process.stdout.write('.');
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    return false;
}

// Helper function untuk membuat POST request
function postRequest(path, data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        
        const options = {
            hostname: 'localhost',
            port: SERVER_PORT,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.write(postData);
        req.end();
    });
}

// Test functions
async function testFollower() {
    console.log('\n🧪 Testing Follower Webhook...');
    const result = await postRequest('/webhook/follower', {
        username: 'TestUser123',
        avatarUrl: 'https://example.com/avatar.jpg'
    });
    console.log('Result:', result);
}

async function testGift() {
    console.log('\n🧪 Testing Gift Webhook...');
    const result = await postRequest('/webhook/gift', {
        username: 'GiftGiver',
        giftName: 'Rose',
        quantity: 10,
        avatarUrl: 'https://example.com/avatar.jpg'
    });
    console.log('Result:', result);
}

async function testChat() {
    console.log('\n🧪 Testing Chat Webhook...');
    const result = await postRequest('/webhook/chat', {
        username: 'ChatUser',
        message: 'Halo semua! Stream bagus!'
    });
    console.log('Result:', result);
}

async function testViewer() {
    console.log('\n🧪 Testing Viewer Count Webhook...');
    const result = await postRequest('/webhook/viewer', {
        count: 150
    });
    console.log('Result:', result);
}

async function testBanner() {
    console.log('\n🧪 Testing Banner Webhook...');
    const result = await postRequest('/webhook/banner', {
        text: 'Terima Kasih Sudah Menonton!'
    });
    console.log('Result:', result);
}

async function testFloatingPhoto() {
    console.log('\n🧪 Testing Floating Photo Webhook...');
    const result = await postRequest('/webhook/floating-photo', {
        emoji: '🎉'
    });
    console.log('Result:', result);
}

// Run all tests
async function runTests() {
    console.log('🚀 Starting Webhook Tests...\n');
    
    // Check if server is running
    console.log('🔍 Checking if server is running...');
    const isRunning = await checkServerRunning();
    
    if (!isRunning) {
        console.error('\n❌ Server tidak berjalan di http://localhost:3000');
        console.error('\n💡 Solusi:');
        console.error('   1. Jalankan server terlebih dahulu:');
        console.error('      npm run start:server');
        console.error('      atau');
        console.error('      npm run dev');
        console.error('\n   2. Atau gunakan script yang otomatis start server:');
        console.error('      npm run test:with-server');
        process.exit(1);
    }
    
    console.log('✅ Server is running!\n');
    
    try {
        await testFollower();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testGift();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testChat();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testViewer();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testBanner();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await testFloatingPhoto();
        
        console.log('\n✅ All tests completed!');
    } catch (error) {
        console.error('❌ Test error:', error.message || error);
        process.exit(1);
    }
}

// Run tests
runTests();

