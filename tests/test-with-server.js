// Script untuk testing webhook endpoints dengan auto-start server
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const SERVER_PORT = 3000;
let serverProcess = null;

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
async function waitForServer(maxAttempts = 30, delay = 500) {
    process.stdout.write('⏳ Waiting for server to start');
    for (let i = 0; i < maxAttempts; i++) {
        const isRunning = await checkServerRunning();
        if (isRunning) {
            console.log(' ✅\n');
            return true;
        }
        process.stdout.write('.');
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    console.log(' ❌\n');
    return false;
}

// Start server
function startServer() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Starting server...');
        
        const serverPath = path.join(__dirname, '../src/backend/webhook-server.js');
        serverProcess = spawn('node', [serverPath], {
            stdio: 'pipe',
            cwd: path.join(__dirname, '..')
        });
        
        // Capture server output
        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            // Only show important messages
            if (output.includes('Webhook server running') || output.includes('error')) {
                process.stdout.write(output);
            }
        });
        
        serverProcess.stderr.on('data', (data) => {
            process.stderr.write(data);
        });
        
        serverProcess.on('error', (error) => {
            reject(error);
        });
        
        // Wait a bit for server to start
        setTimeout(() => {
            resolve();
        }, 1000);
    });
}

// Stop server
function stopServer() {
    return new Promise((resolve) => {
        if (serverProcess) {
            console.log('\n🛑 Stopping server...');
            serverProcess.kill('SIGTERM');
            
            serverProcess.on('exit', () => {
                console.log('✅ Server stopped');
                resolve();
            });
            
            // Force kill after 5 seconds
            setTimeout(() => {
                if (!serverProcess.killed) {
                    serverProcess.kill('SIGKILL');
                    resolve();
                }
            }, 5000);
        } else {
            resolve();
        }
    });
}

// Run test script
function runTestScript() {
    return new Promise((resolve, reject) => {
        const testPath = path.join(__dirname, 'test-webhook.js');
        const testProcess = spawn('node', [testPath], {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
        
        testProcess.on('exit', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Test exited with code ${code}`));
            }
        });
        
        testProcess.on('error', (error) => {
            reject(error);
        });
    });
}

// Main function
async function main() {
    try {
        // Start server
        await startServer();
        
        // Wait for server to be ready
        const isReady = await waitForServer();
        if (!isReady) {
            throw new Error('Server failed to start');
        }
        
        // Run tests
        await runTestScript();
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    } finally {
        // Always stop server
        await stopServer();
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    await stopServer();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await stopServer();
    process.exit(0);
});

// Run main
main();

