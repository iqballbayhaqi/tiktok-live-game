// SSE Routes
const express = require('express');
const router = express.Router();
const SSEController = require('../controllers/SSEController');
const {
    sseLimiter,
    validateLiveCodeParam,
    validateUsernameParam
} = require('../security-middleware');

// GET /events/code/:code
router.get('/code/:code', sseLimiter, validateLiveCodeParam, SSEController.handleEventsByCode.bind(SSEController));

// GET /events/:username (backward compatibility)
router.get('/:username', sseLimiter, validateUsernameParam, SSEController.handleEventsByUsername.bind(SSEController));

module.exports = router;

