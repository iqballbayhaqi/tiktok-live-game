// API Routes
const express = require('express');
const router = express.Router();
const MusicController = require('../controllers/MusicController');
const { apiLimiter } = require('../security-middleware');

// GET /api/music
router.get('/music', apiLimiter, MusicController.getMusicList.bind(MusicController));

module.exports = router;

