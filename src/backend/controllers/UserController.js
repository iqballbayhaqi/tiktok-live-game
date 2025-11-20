// User Controller - HTTP request handlers untuk user management
const UserModel = require('../models/UserModel');
const ConfigModel = require('../models/ConfigModel');
const LogModel = require('../models/LogModel');
const StateModel = require('../models/StateModel');
const EventService = require('../services/EventService');

class UserController {
    // GET /api/users
    getAllUsers(req, res) {
        try {
            const usersData = UserModel.loadUsers();
            res.status(200).json({ success: true, users: usersData.users });
        } catch (error) {
            console.error('Error loading users:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    }

    // GET /api/users/:username
    getUser(req, res) {
        try {
            const { username } = req.params;
            const user = UserModel.getUserByUsername(username);
            
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }
            
            res.status(200).json({ success: true, user });
        } catch (error) {
            console.error('Error loading user:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    }

    // POST /api/users
    createUser(req, res) {
        try {
            const { username, displayName, liveCode } = req.body;
            const result = UserModel.createUser(username, displayName, liveCode);
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            
            // Buat default config untuk user baru
            const defaultConfig = ConfigModel.getDefaultUserConfig();
            ConfigModel.saveUserConfig(result.user.username, defaultConfig);
            
            res.status(201).json(result);
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    }

    // PUT /api/users/:username
    updateUser(req, res) {
        try {
            const { username } = req.params;
            const updates = req.body;
            
            const result = UserModel.updateUser(username, updates);
            
            if (!result.success) {
                return res.status(404).json(result);
            }
            
            res.status(200).json(result);
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    }

    // DELETE /api/users/:username
    deleteUser(req, res) {
        try {
            const { username } = req.params;
            const result = UserModel.deleteUser(username);
            
            if (!result.success) {
                return res.status(404).json(result);
            }
            
            // Clear logs dan state
            LogModel.clearLogs(username);
            StateModel.clearState(username);
            
            res.status(200).json(result);
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    }

    // GET /api/users/:username/config
    getUserConfig(req, res) {
        try {
            const { username } = req.params;
            const user = UserModel.getUserByUsername(username);
            
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }
            
            const config = ConfigModel.loadUserConfig(username);
            res.status(200).json({ success: true, config });
        } catch (error) {
            console.error('Error loading user config:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    }

    // PUT /api/users/:username/config
    saveUserConfig(req, res) {
        try {
            const { username } = req.params;
            const config = req.body;
            
            const user = UserModel.getUserByUsername(username);
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }
            
            const saved = ConfigModel.saveUserConfig(username, config);
            
            if (!saved) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'Failed to save config' 
                });
            }
            
            // Broadcast config update ke semua clients user
            EventService.broadcastToClients({
                type: 'config-updated',
                data: { config }
            }, username);
            
            res.status(200).json({ success: true, message: 'Config saved successfully' });
        } catch (error) {
            console.error('Error saving user config:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    }

    // GET /api/users/:username/logs
    getUserLogs(req, res) {
        try {
            const { username } = req.params;
            const limit = parseInt(req.query.limit) || 100;
            
            const user = UserModel.getUserByUsername(username);
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }
            
            const logs = LogModel.getLogs(username, limit);
            res.status(200).json({ success: true, logs });
        } catch (error) {
            console.error('Error loading user logs:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    }

    // DELETE /api/users/:username/logs
    clearUserLogs(req, res) {
        try {
            const { username } = req.params;
            const user = UserModel.getUserByUsername(username);
            
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }
            
            LogModel.clearLogs(username);
            res.status(200).json({ success: true, message: 'Logs cleared successfully' });
        } catch (error) {
            console.error('Error clearing user logs:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    }
}

module.exports = new UserController();

