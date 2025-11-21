// Security Middleware untuk Webhook Server
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');

// Security headers dengan helmet
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-inline/eval diperlukan untuk beberapa overlay
            imgSrc: ["'self'", "data:", "https:", "http:"], // Allow external images untuk avatar/gift images
            connectSrc: ["'self'", "https:", "http:"], // Allow SSE connections
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
    },
    crossOriginEmbedderPolicy: false, // Disable untuk compatibility dengan overlay
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow untuk assets
});

// Rate limiting untuk API endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 500, // Maksimal 500 requests per IP per window (dinaikkan dari 100)
    message: {
        success: false,
        error: 'Terlalu banyak request dari IP ini, coba lagi dalam beberapa menit.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting untuk health check
        return req.path === '/health';
    }
});

// Rate limiting untuk webhook endpoints (lebih longgar)
const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 menit
    max: 300, // Maksimal 300 requests per IP per menit (dinaikkan dari 60)
    message: {
        success: false,
        error: 'Terlalu banyak webhook request, coba lagi dalam beberapa saat.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting untuk user management endpoints (lebih ketat)
const userManagementLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 100, // Maksimal 100 requests per IP per window (dinaikkan dari 20)
    message: {
        success: false,
        error: 'Terlalu banyak request untuk user management, coba lagi dalam beberapa menit.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting untuk SSE connections (lebih longgar)
const sseLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 menit
    max: 50, // Maksimal 50 connections per IP per menit (dinaikkan dari 10)
    message: {
        success: false,
        error: 'Terlalu banyak koneksi SSE, coba lagi dalam beberapa saat.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Helper function untuk sanitize string input
function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/[<>]/g, '') // Remove < dan >
        .trim();
}

// Helper function untuk sanitize HTML
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Helper function untuk validate dan sanitize username
function sanitizeUsername(username) {
    if (typeof username !== 'string') return null;
    
    // Normalize: ensure starts with @
    let normalized = username.trim();
    if (!normalized.startsWith('@')) {
        normalized = `@${normalized}`;
    }
    
    // Validate format: alphanumeric, titik (.), dan underscore (_)
    const usernameWithoutAt = normalized.substring(1);
    const validUsernamePattern = /^[a-zA-Z0-9._]+$/;
    
    if (!validUsernamePattern.test(usernameWithoutAt)) {
        return null;
    }
    
    if (normalized === '@' || normalized.length < 2 || normalized.length > 50) {
        return null;
    }
    
    return normalized;
}

// Helper function untuk validate path (prevent path traversal)
function validatePath(filePath, allowedBaseDir) {
    const path = require('path');
    const normalizedPath = path.normalize(filePath);
    const resolvedPath = path.resolve(allowedBaseDir, normalizedPath);
    const resolvedBase = path.resolve(allowedBaseDir);
    
    // Pastikan resolved path masih dalam allowed base directory
    if (!resolvedPath.startsWith(resolvedBase)) {
        return false;
    }
    
    // Cek untuk path traversal attempts
    if (normalizedPath.includes('..')) {
        return false;
    }
    
    return true;
}

// Validation middleware untuk username parameter
const validateUsernameParam = [
    param('username')
        .notEmpty()
        .withMessage('Username tidak boleh kosong')
        .custom((value) => {
            const sanitized = sanitizeUsername(value);
            if (!sanitized) {
                throw new Error('Format username tidak valid');
            }
            return true;
        }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg
            });
        }
        // Sanitize username
        req.params.username = sanitizeUsername(req.params.username);
        next();
    }
];

// Validation middleware untuk live code parameter
const validateLiveCodeParam = [
    param('code')
        .notEmpty()
        .withMessage('Live code tidak boleh kosong')
        .isLength({ min: 8, max: 50 })
        .withMessage('Live code harus antara 8-50 karakter')
        .matches(/^[a-zA-Z0-9]+$/)
        .withMessage('Live code hanya boleh mengandung huruf dan angka'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg
            });
        }
        next();
    }
];

// Validation middleware untuk live code parameter dengan nama 'id'
const validateLiveCodeIdParam = [
    param('id')
        .notEmpty()
        .withMessage('Live code tidak boleh kosong')
        .isLength({ min: 8, max: 50 })
        .withMessage('Live code harus antara 8-50 karakter')
        .matches(/^[a-zA-Z0-9]+$/)
        .withMessage('Live code hanya boleh mengandung huruf dan angka'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg
            });
        }
        next();
    }
];

// Validation middleware untuk create user
const validateCreateUser = [
    body('username')
        .notEmpty()
        .withMessage('Username wajib diisi')
        .custom((value) => {
            const sanitized = sanitizeUsername(value);
            if (!sanitized) {
                throw new Error('Format username tidak valid. Username hanya boleh mengandung huruf, angka, titik (.), dan underscore (_)');
            }
            return true;
        }),
    body('displayName')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Display name maksimal 100 karakter')
        .customSanitizer(sanitizeString),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg
            });
        }
        // Sanitize username
        if (req.body.username) {
            req.body.username = sanitizeUsername(req.body.username);
        }
        next();
    }
];

// Validation middleware untuk webhook follower
const validateWebhookFollower = [
    body('username')
        .notEmpty()
        .withMessage('Username wajib diisi')
        .isLength({ max: 100 })
        .withMessage('Username maksimal 100 karakter')
        .customSanitizer(sanitizeString),
    body('avatarUrl')
        .optional()
        .isURL({ protocols: ['http', 'https'] })
        .withMessage('Avatar URL harus valid')
        .isLength({ max: 500 })
        .withMessage('Avatar URL maksimal 500 karakter'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg
            });
        }
        next();
    }
];

// Validation middleware untuk webhook gift
const validateWebhookGift = [
    body('username')
        .notEmpty()
        .withMessage('Username wajib diisi')
        .isLength({ max: 100 })
        .withMessage('Username maksimal 100 karakter')
        .customSanitizer(sanitizeString),
    body('giftName')
        .notEmpty()
        .withMessage('Gift name wajib diisi')
        .isLength({ max: 100 })
        .withMessage('Gift name maksimal 100 karakter')
        .customSanitizer(sanitizeString),
    body('quantity')
        .notEmpty()
        .withMessage('Quantity wajib diisi')
        .isInt({ min: 1, max: 1000000 })
        .withMessage('Quantity harus berupa angka antara 1-1000000'),
    body('avatarUrl')
        .optional()
        .isURL({ protocols: ['http', 'https'] })
        .withMessage('Avatar URL harus valid')
        .isLength({ max: 500 }),
    body('giftImageUrl')
        .optional()
        .isURL({ protocols: ['http', 'https'] })
        .withMessage('Gift image URL harus valid')
        .isLength({ max: 500 }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg
            });
        }
        next();
    }
];

// Validation middleware untuk webhook chat
const validateWebhookChat = [
    body('username')
        .notEmpty()
        .withMessage('Username wajib diisi')
        .isLength({ max: 100 })
        .withMessage('Username maksimal 100 karakter')
        .customSanitizer(sanitizeString),
    body('message')
        .notEmpty()
        .withMessage('Message wajib diisi')
        .isLength({ max: 1000 })
        .withMessage('Message maksimal 1000 karakter')
        .customSanitizer(sanitizeString),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg
            });
        }
        next();
    }
];

// Validation middleware untuk webhook banner
const validateWebhookBanner = [
    body('text')
        .notEmpty()
        .withMessage('Text wajib diisi')
        .isLength({ max: 500 })
        .withMessage('Text maksimal 500 karakter')
        .customSanitizer(sanitizeString),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg
            });
        }
        next();
    }
];

// Validation middleware untuk webhook floating photo
const validateWebhookFloatingPhoto = [
    body('imageUrl')
        .optional()
        .custom((value) => {
            if (!value) return true; // Optional field, boleh kosong
            // Cek apakah itu URL valid (http/https)
            const isUrl = /^https?:\/\/.+/.test(value);
            // Cek apakah itu path lokal yang dimulai dengan /assets/
            const isLocalPath = /^\/assets\/.+/.test(value);
            if (isUrl || isLocalPath) {
                return true;
            }
            throw new Error('Image URL harus berupa URL valid (http/https) atau path lokal (/assets/...)');
        })
        .isLength({ max: 500 }),
    body('emoji')
        .optional()
        .isLength({ max: 10 })
        .withMessage('Emoji maksimal 10 karakter'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg
            });
        }
        next();
    }
];

// Error handler untuk validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: errors.array()[0].msg
        });
    }
    next();
};

module.exports = {
    securityHeaders,
    apiLimiter,
    webhookLimiter,
    userManagementLimiter,
    sseLimiter,
    sanitizeString,
    escapeHtml,
    validateLiveCodeIdParam,
    sanitizeUsername,
    validatePath,
    validateUsernameParam,
    validateLiveCodeParam,
    validateCreateUser,
    validateWebhookFollower,
    validateWebhookGift,
    validateWebhookChat,
    validateWebhookBanner,
    validateWebhookFloatingPhoto,
    handleValidationErrors
};

