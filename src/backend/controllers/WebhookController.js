// Webhook Controller - HTTP request handlers untuk webhook endpoints
const { sanitizeString } = require('../security-middleware');
const EventService = require('../services/EventService');
const FeatureService = require('../services/FeatureService');
const StateModel = require('../models/StateModel');
const LogModel = require('../models/LogModel');
const UserModel = require('../models/UserModel');

class WebhookController {
    // POST /webhook/tiktok
    handleTikTokWebhook(req, res) {
        try {
            const event = req.body;
            
            // Validate event structure
            if (!event || typeof event !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid event data'
                });
            }
            
            console.log('📥 Webhook received:', event.type || 'unknown');
            
            // Broadcast ke semua connected clients
            EventService.broadcastToClients(event);
            
            res.status(200).json({ 
                success: true, 
                message: 'Event received',
                event: event.type 
            });
        } catch (error) {
            console.error('❌ Webhook error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error'
            });
        }
    }

    // POST /webhook/follower
    handleFollower(req, res) {
        if (!FeatureService.isFeatureEnabled('FOLLOWER_ALERT', true)) {
            return res.status(200).json({ 
                success: true, 
                message: 'Follower alert disabled via feature flag',
                skipped: true 
            });
        }
        
        const { username, avatarUrl } = req.body;
        
        const event = {
            type: 'follower',
            data: {
                username: sanitizeString(username),
                avatarUrl: avatarUrl || null
            }
        };
        
        EventService.broadcastToClients(event);
        console.log(`👋 Follower event: ${sanitizeString(username)}`);
        
        res.status(200).json({ success: true, event });
    }

    // POST /webhook/gift
    handleGift(req, res) {
        if (!FeatureService.isFeatureEnabled('GIFT_ALERT', true)) {
            return res.status(200).json({ 
                success: true, 
                message: 'Gift alert disabled via feature flag',
                skipped: true 
            });
        }
        
        const { username, giftName, quantity, avatarUrl, giftImageUrl } = req.body;
        
        const event = {
            type: 'gift',
            data: {
                username: sanitizeString(username),
                giftName: sanitizeString(giftName),
                quantity: parseInt(quantity),
                avatarUrl: avatarUrl || null,
                giftImageUrl: giftImageUrl || null
            }
        };
        
        EventService.broadcastToClients(event);
        console.log(`🎁 Gift event: ${sanitizeString(username)} - ${quantity}x ${sanitizeString(giftName)}`);
        
        res.status(200).json({ success: true, event });
    }

    // POST /webhook/chat
    handleChat(req, res) {
        if (!FeatureService.isFeatureEnabled('CHAT_OVERLAY', true)) {
            return res.status(200).json({ 
                success: true, 
                message: 'Chat overlay disabled via feature flag',
                skipped: true 
            });
        }
        
        const { username, message } = req.body;
        
        const event = {
            type: 'chat',
            data: {
                username: sanitizeString(username),
                message: sanitizeString(message)
            }
        };
        
        EventService.broadcastToClients(event);
        console.log(`💬 Chat event: ${sanitizeString(username)}: ${sanitizeString(message)}`);
        
        res.status(200).json({ success: true, event });
    }

    // POST /webhook/viewer
    handleViewer(req, res) {
        const { count } = req.body;
        
        const event = {
            type: 'viewer',
            data: {
                count: parseInt(count)
            }
        };
        
        EventService.broadcastToClients(event);
        console.log(`👥 Viewer count: ${count}`);
        
        res.status(200).json({ success: true, event });
    }

    // POST /webhook/banner
    handleBanner(req, res) {
        if (!FeatureService.isFeatureEnabled('CUSTOM_BANNER', true)) {
            return res.status(200).json({ 
                success: true, 
                message: 'Custom banner disabled via feature flag',
                skipped: true 
            });
        }
        
        const { text } = req.body;
        
        const event = {
            type: 'banner',
            data: {
                text: sanitizeString(text)
            }
        };
        
        EventService.broadcastToClients(event);
        console.log(`📢 Banner event: ${sanitizeString(text)}`);
        
        res.status(200).json({ success: true, event });
    }

    // POST /webhook/floating-photo
    handleFloatingPhoto(req, res) {
        if (!FeatureService.isFeatureEnabled('FLOATING_PHOTOS', true)) {
            return res.status(200).json({ 
                success: true, 
                message: 'Floating photos disabled via feature flag',
                skipped: true 
            });
        }
        
        const { username, avatarUrl } = req.body;
        
        const event = {
            type: 'floating-photo',
            data: {
                username: sanitizeString(username),
                avatarUrl: avatarUrl || null
            }
        };
        
        EventService.broadcastToClients(event);
        console.log(`📸 Floating photo event: ${sanitizeString(username)}`);
        
        res.status(200).json({ success: true, event });
    }

    // POST /webhook/:username/follower
    handleUserFollower(req, res) {
        const { username: targetUsername } = req.params;
        
        if (!FeatureService.isFeatureEnabled('FOLLOWER_ALERT', true)) {
            return res.status(200).json({ 
                success: true, 
                message: 'Follower alert disabled via feature flag',
                skipped: true 
            });
        }
        
        const { username, avatarUrl } = req.body;
        
        const event = {
            type: 'follower',
            data: {
                username: sanitizeString(username),
                avatarUrl: avatarUrl || null
            }
        };
        
        EventService.broadcastToClients(event, targetUsername);
        console.log(`👋 Follower event for ${targetUsername}: ${sanitizeString(username)}`);
        LogModel.addLog(targetUsername, 'follower', `${sanitizeString(username)} mengikuti live`, { username: sanitizeString(username), avatarUrl });
        
        res.status(200).json({ success: true, event });
    }

    // POST /webhook/:username/gift
    handleUserGift(req, res) {
        const { username: targetUsername } = req.params;
        
        if (!FeatureService.isFeatureEnabled('GIFT_ALERT', true)) {
            return res.status(200).json({ 
                success: true, 
                message: 'Gift alert disabled via feature flag',
                skipped: true 
            });
        }
        
        const { username, giftName, quantity, avatarUrl, giftImageUrl } = req.body;
        
        const event = {
            type: 'gift',
            data: {
                username: sanitizeString(username),
                giftName: sanitizeString(giftName),
                quantity: parseInt(quantity),
                avatarUrl: avatarUrl || null,
                giftImageUrl: giftImageUrl || null
            }
        };
        
        EventService.broadcastToClients(event, targetUsername);
        console.log(`🎁 Gift event for ${targetUsername}: ${sanitizeString(username)} - ${quantity}x ${sanitizeString(giftName)}`);
        LogModel.addLog(targetUsername, 'gift', `${sanitizeString(username)} mengirim ${quantity}x ${sanitizeString(giftName)}`, { username: sanitizeString(username), giftName: sanitizeString(giftName), quantity: parseInt(quantity) });
        
        res.status(200).json({ success: true, event });
    }

    // POST /webhook/:username/chat
    handleUserChat(req, res) {
        const { username: targetUsername } = req.params;
        
        if (!FeatureService.isFeatureEnabled('CHAT_OVERLAY', true)) {
            return res.status(200).json({ 
                success: true, 
                message: 'Chat overlay disabled via feature flag',
                skipped: true 
            });
        }
        
        const { username, message } = req.body;
        
        const event = {
            type: 'chat',
            data: {
                username: sanitizeString(username),
                message: sanitizeString(message)
            }
        };
        
        // Update state: tambahkan chat message ke state user
        StateModel.updateChatMessages(targetUsername, {
            username: sanitizeString(username),
            message: sanitizeString(message)
        });
        
        EventService.broadcastToClients(event, targetUsername);
        console.log(`💬 Chat event for ${targetUsername}: ${sanitizeString(username)}: ${sanitizeString(message)}`);
        LogModel.addLog(targetUsername, 'chat', `${sanitizeString(username)}: ${sanitizeString(message)}`, { username: sanitizeString(username), message: sanitizeString(message) });
        
        res.status(200).json({ success: true, event });
    }

    // POST /webhook/:username/viewer
    handleUserViewer(req, res) {
        const { username: targetUsername } = req.params;
        const { count } = req.body;
        
        // Update state
        StateModel.updateViewerCount(targetUsername, parseInt(count));
        
        const event = {
            type: 'viewer',
            data: {
                count: parseInt(count)
            }
        };
        
        EventService.broadcastToClients(event, targetUsername);
        console.log(`👥 Viewer count for ${targetUsername}: ${count}`);
        LogModel.addLog(targetUsername, 'viewer', `Viewer count: ${count}`, { count: parseInt(count) });
        
        res.status(200).json({ success: true, event });
    }

    // POST /webhook/:username/banner
    handleUserBanner(req, res) {
        const { username: targetUsername } = req.params;
        
        if (!FeatureService.isFeatureEnabled('CUSTOM_BANNER', true)) {
            return res.status(200).json({ 
                success: true, 
                message: 'Custom banner disabled via feature flag',
                skipped: true 
            });
        }
        
        const { text } = req.body;
        
        // Update state
        StateModel.updateBannerText(targetUsername, sanitizeString(text));
        
        const event = {
            type: 'banner',
            data: {
                text: sanitizeString(text)
            }
        };
        
        EventService.broadcastToClients(event, targetUsername);
        console.log(`📢 Banner event for ${targetUsername}: ${sanitizeString(text)}`);
        LogModel.addLog(targetUsername, 'banner', `Banner: ${sanitizeString(text)}`, { text: sanitizeString(text) });
        
        res.status(200).json({ success: true, event });
    }

    // POST /webhook/:username/floating-photo
    handleUserFloatingPhoto(req, res) {
        const { username: targetUsername } = req.params;
        
        if (!FeatureService.isFeatureEnabled('FLOATING_PHOTOS', true)) {
            return res.status(200).json({ 
                success: true, 
                message: 'Floating photos disabled via feature flag',
                skipped: true 
            });
        }
        
        const { username, avatarUrl } = req.body;
        
        const event = {
            type: 'floating-photo',
            data: {
                username: sanitizeString(username),
                avatarUrl: avatarUrl || null
            }
        };
        
        EventService.broadcastToClients(event, targetUsername);
        console.log(`📸 Floating photo event for ${targetUsername}: ${sanitizeString(username)}`);
        LogModel.addLog(targetUsername, 'floating-photo', `Floating photo: ${sanitizeString(username)}`, { username: sanitizeString(username), avatarUrl });
        
        res.status(200).json({ success: true, event });
    }
}

module.exports = new WebhookController();

