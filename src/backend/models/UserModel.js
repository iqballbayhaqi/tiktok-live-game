// User Model - Data access layer untuk user management
const fs = require('fs');
const path = require('path');
const { sanitizeUsername, validatePath } = require('../security-middleware');

class UserModel {
    constructor() {
        this.usersFilePath = path.join(__dirname, '../../../config/users.json');
    }

    getUsersFilePath() {
        return this.usersFilePath;
    }

    getUserConfigPath(username) {
        // Sanitize username untuk mencegah path traversal
        const sanitized = sanitizeUsername(username);
        if (!sanitized) {
            throw new Error('Invalid username');
        }
        
        // Remove @ dari username untuk filename
        const filename = sanitized.substring(1) + '.json';
        
        // Validate path
        const configPath = path.join(__dirname, '../../../config/users', filename);
        const allowedBaseDir = path.join(__dirname, '../../../config/users');
        
        if (!validatePath(configPath, allowedBaseDir)) {
            throw new Error('Invalid file path');
        }
        
        return configPath;
    }

    generateLiveCode() {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 12; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    generateUniqueLiveCode() {
        const usersData = this.loadUsers();
        let code;
        let attempts = 0;
        const maxAttempts = 100;
        
        do {
            code = this.generateLiveCode();
            attempts++;
            if (attempts > maxAttempts) {
                throw new Error('Failed to generate unique live code after multiple attempts');
            }
        } while (usersData.users.some(u => u.liveCode === code));
        
        return code;
    }

    loadUsers() {
        try {
            if (fs.existsSync(this.usersFilePath)) {
                const data = fs.readFileSync(this.usersFilePath, 'utf8');
                return JSON.parse(data);
            }
            return { users: [] };
        } catch (error) {
            console.error('Error loading users:', error);
            return { users: [] };
        }
    }

    saveUsers(usersData) {
        try {
            fs.writeFileSync(this.usersFilePath, JSON.stringify(usersData, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('Error saving users:', error);
            return false;
        }
    }

    getUserByUsername(username) {
        const usersData = this.loadUsers();
        return usersData.users.find(u => u.username === username);
    }

    getUserByCode(liveCode) {
        const usersData = this.loadUsers();
        return usersData.users.find(u => u.liveCode === liveCode);
    }

    createUser(username, displayName = null, liveCode = null) {
        // Validate username format
        if (!username || typeof username !== 'string') {
            return { success: false, error: 'Username is required' };
        }
        
        // Normalize username: ensure it starts with @
        let normalizedUsername = username.trim();
        if (!normalizedUsername.startsWith('@')) {
            normalizedUsername = `@${normalizedUsername}`;
        }
        
        // Validate username format
        const usernameWithoutAt = normalizedUsername.substring(1);
        const validUsernamePattern = /^[a-zA-Z0-9._]+$/;
        if (!validUsernamePattern.test(usernameWithoutAt)) {
            return { success: false, error: 'Username hanya boleh mengandung huruf, angka, titik (.), dan underscore (_)' };
        }
        
        if (normalizedUsername === '@' || normalizedUsername.length < 2) {
            return { success: false, error: 'Username tidak valid. Minimal 1 karakter setelah @' };
        }
        
        const usersData = this.loadUsers();
        const existingUser = usersData.users.find(u => u.username === normalizedUsername);
        
        if (existingUser) {
            return { success: false, error: 'User already exists' };
        }
        
        // Generate live code jika tidak disediakan
        if (!liveCode) {
            try {
                liveCode = this.generateUniqueLiveCode();
            } catch (error) {
                return { success: false, error: error.message };
            }
        } else {
            // Cek jika code sudah digunakan
            const codeExists = usersData.users.some(u => u.liveCode === liveCode);
            if (codeExists) {
                return { success: false, error: 'Live code already exists' };
            }
        }
        
        const newUser = {
            username: normalizedUsername,
            displayName: displayName || normalizedUsername,
            liveCode: liveCode,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            active: true
        };
        
        usersData.users.push(newUser);
        
        if (this.saveUsers(usersData)) {
            return { success: true, user: newUser };
        }
        
        return { success: false, error: 'Failed to save user' };
    }

    updateUser(username, updates) {
        const usersData = this.loadUsers();
        const userIndex = usersData.users.findIndex(u => u.username === username);
        
        if (userIndex === -1) {
            return { success: false, error: 'User not found' };
        }
        
        usersData.users[userIndex] = {
            ...usersData.users[userIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        if (this.saveUsers(usersData)) {
            return { success: true, user: usersData.users[userIndex] };
        }
        
        return { success: false, error: 'Failed to update user' };
    }

    deleteUser(username) {
        const usersData = this.loadUsers();
        const userIndex = usersData.users.findIndex(u => u.username === username);
        
        if (userIndex === -1) {
            return { success: false, error: 'User not found' };
        }
        
        usersData.users.splice(userIndex, 1);
        
        if (this.saveUsers(usersData)) {
            // Hapus config file user
            try {
                const configPath = this.getUserConfigPath(username);
                if (fs.existsSync(configPath)) {
                    fs.unlinkSync(configPath);
                }
            } catch (error) {
                console.error(`Error deleting config for user ${username}:`, error);
            }
            
            return { success: true };
        }
        
        return { success: false, error: 'Failed to delete user' };
    }
}

module.exports = new UserModel();

