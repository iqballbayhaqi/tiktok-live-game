// SSE Controller - HTTP request handlers untuk Server-Sent Events
const UserModel = require('../models/UserModel');
const StateModel = require('../models/StateModel');
const EventService = require('../services/EventService');

class SSEController {
    // GET /events/code/:code
    handleEventsByCode(req, res) {
        const { code } = req.params;
        const user = UserModel.getUserByCode(code);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Live code not found' 
            });
        }
        
        if (!user.active) {
            return res.status(403).json({ 
                success: false, 
                error: 'User is not active' 
            });
        }
        
        const username = user.username;
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        
        // Tambahkan client ke EventService
        EventService.addClient(res, username);
        
        console.log(`✅ Client connected for user ${username} (code: ${code}). Total clients for this user: ${EventService.clientsByUser.get(username)?.size || 0}`);
        
        // Send initial connection message
        res.write(`data: ${JSON.stringify({ type: 'connected', message: `Connected to webhook server for user: ${username}`, username: username, liveCode: code })}\n\n`);
        
        // Send state sync
        const stateData = StateModel.getStateSyncData(username);
        EventService.sendStateSync(res, stateData);
        
        // Handle client disconnect
        req.on('close', () => {
            EventService.removeClient(res, username);
            console.log(`❌ Client disconnected for user ${username} (code: ${code})`);
        });
    }

    // GET /events/:username (backward compatibility)
    handleEventsByUsername(req, res) {
        const { username } = req.params;
        const user = UserModel.getUserByUsername(username);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        
        // Tambahkan client ke EventService
        EventService.addClient(res, username);
        
        const userClients = EventService.clientsByUser.get(username);
        console.log(`✅ Client connected for user ${username}. Total clients for this user: ${userClients?.size || 0}`);
        
        // Send initial connection message
        res.write(`data: ${JSON.stringify({ type: 'connected', message: `Connected to webhook server for user: ${username}`, username: username })}\n\n`);
        
        // Send state sync
        const stateData = StateModel.getStateSyncData(username);
        EventService.sendStateSync(res, stateData);
        
        // Handle client disconnect
        req.on('close', () => {
            EventService.removeClient(res, username);
            console.log(`❌ Client disconnected for user ${username}`);
        });
    }
}

module.exports = new SSEController();

