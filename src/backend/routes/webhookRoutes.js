// Webhook Routes
const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/WebhookController');
const {
    webhookLimiter,
    validateUsernameParam,
    validateWebhookFollower,
    validateWebhookGift,
    validateWebhookChat,
    validateWebhookBanner,
    validateWebhookFloatingPhoto
} = require('../security-middleware');
const { body, validationResult } = require('express-validator');

// POST /webhook/tiktok
router.post('/tiktok', webhookLimiter, WebhookController.handleTikTokWebhook.bind(WebhookController));

// POST /webhook/follower
router.post('/follower', webhookLimiter, validateWebhookFollower, WebhookController.handleFollower.bind(WebhookController));

// POST /webhook/gift
router.post('/gift', webhookLimiter, validateWebhookGift, WebhookController.handleGift.bind(WebhookController));

// POST /webhook/chat
router.post('/chat', webhookLimiter, validateWebhookChat, WebhookController.handleChat.bind(WebhookController));

// POST /webhook/viewer
router.post('/viewer', webhookLimiter, [
    body('count')
        .notEmpty()
        .withMessage('Count wajib diisi')
        .isInt({ min: 0, max: 100000000 })
        .withMessage('Count harus berupa angka antara 0-100000000')
], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: errors.array()[0].msg
        });
    }
    next();
}, WebhookController.handleViewer.bind(WebhookController));

// POST /webhook/banner
router.post('/banner', webhookLimiter, validateWebhookBanner, WebhookController.handleBanner.bind(WebhookController));

// POST /webhook/floating-photo
router.post('/floating-photo', webhookLimiter, validateWebhookFloatingPhoto, WebhookController.handleFloatingPhoto.bind(WebhookController));

// User-specific webhook routes
// POST /webhook/:username/follower
router.post('/:username/follower', webhookLimiter, validateUsernameParam, validateWebhookFollower, WebhookController.handleUserFollower.bind(WebhookController));

// POST /webhook/:username/gift
router.post('/:username/gift', webhookLimiter, validateUsernameParam, validateWebhookGift, WebhookController.handleUserGift.bind(WebhookController));

// POST /webhook/:username/chat
router.post('/:username/chat', webhookLimiter, validateUsernameParam, validateWebhookChat, WebhookController.handleUserChat.bind(WebhookController));

// POST /webhook/:username/viewer
router.post('/:username/viewer', webhookLimiter, validateUsernameParam, [
    body('count')
        .notEmpty()
        .withMessage('Count wajib diisi')
        .isInt({ min: 0, max: 100000000 })
        .withMessage('Count harus berupa angka antara 0-100000000')
], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: errors.array()[0].msg
        });
    }
    next();
}, WebhookController.handleUserViewer.bind(WebhookController));

// POST /webhook/:username/banner
router.post('/:username/banner', webhookLimiter, validateUsernameParam, validateWebhookBanner, WebhookController.handleUserBanner.bind(WebhookController));

// POST /webhook/:username/floating-photo
router.post('/:username/floating-photo', webhookLimiter, validateUsernameParam, validateWebhookFloatingPhoto, WebhookController.handleUserFloatingPhoto.bind(WebhookController));

module.exports = router;

