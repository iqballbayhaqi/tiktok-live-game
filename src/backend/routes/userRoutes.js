// User Routes
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const {
    userManagementLimiter,
    validateUsernameParam,
    validateCreateUser
} = require('../security-middleware');

// GET /api/users
router.get('/', userManagementLimiter, UserController.getAllUsers.bind(UserController));

// GET /api/users/:username
router.get('/:username', userManagementLimiter, validateUsernameParam, UserController.getUser.bind(UserController));

// POST /api/users
router.post('/', userManagementLimiter, validateCreateUser, UserController.createUser.bind(UserController));

// PUT /api/users/:username
router.put('/:username', userManagementLimiter, validateUsernameParam, UserController.updateUser.bind(UserController));

// DELETE /api/users/:username
router.delete('/:username', userManagementLimiter, validateUsernameParam, UserController.deleteUser.bind(UserController));

// GET /api/users/:username/config
router.get('/:username/config', userManagementLimiter, validateUsernameParam, UserController.getUserConfig.bind(UserController));

// PUT /api/users/:username/config
router.put('/:username/config', userManagementLimiter, validateUsernameParam, UserController.saveUserConfig.bind(UserController));

// GET /api/users/:username/logs
router.get('/:username/logs', userManagementLimiter, validateUsernameParam, UserController.getUserLogs.bind(UserController));

// DELETE /api/users/:username/logs
router.delete('/:username/logs', userManagementLimiter, validateUsernameParam, UserController.clearUserLogs.bind(UserController));

module.exports = router;

