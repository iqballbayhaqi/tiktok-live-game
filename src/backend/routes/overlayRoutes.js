// Overlay Routes
const express = require('express');
const router = express.Router();
const OverlayController = require('../controllers/OverlayController');
const {
    validateLiveCodeParam,
    validateLiveCodeIdParam
} = require('../security-middleware');

// Route spesifik harus didefinisikan SEBELUM route umum
// GET /live/floating-photos/:id
router.get('/floating-photos/:id', validateLiveCodeIdParam, OverlayController.serveFloatingPhotos.bind(OverlayController));

// GET /live/firework/:id
router.get('/firework/:id', validateLiveCodeIdParam, OverlayController.serveFirework.bind(OverlayController));

// GET /live/jedagjedug/:id
router.get('/jedagjedug/:id', validateLiveCodeIdParam, OverlayController.serveJedagJedug.bind(OverlayController));

// GET /live/chat/:id
router.get('/chat/:id', validateLiveCodeIdParam, OverlayController.serveChat.bind(OverlayController));

// GET /live/follower-alert/:id
router.get('/follower-alert/:id', validateLiveCodeIdParam, OverlayController.serveFollowerAlert.bind(OverlayController));

// GET /live/gift-alert/:id
router.get('/gift-alert/:id', validateLiveCodeIdParam, OverlayController.serveGiftAlert.bind(OverlayController));

// GET /live/:code (HARUS di akhir karena lebih umum)
router.get('/:code', validateLiveCodeParam, OverlayController.serveMainOverlay.bind(OverlayController));

module.exports = router;

