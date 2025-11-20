// Routes Index - Central route registration
const express = require('express');
const router = express.Router();

// Import route modules
const userRoutes = require('./userRoutes');
const webhookRoutes = require('./webhookRoutes');
const overlayRoutes = require('./overlayRoutes');
const apiRoutes = require('./apiRoutes');
const sseRoutes = require('./sseRoutes');

// Register routes
router.use('/api/users', userRoutes);
router.use('/webhook', webhookRoutes);
router.use('/live', overlayRoutes);
router.use('/api', apiRoutes);
router.use('/events', sseRoutes);

module.exports = router;

