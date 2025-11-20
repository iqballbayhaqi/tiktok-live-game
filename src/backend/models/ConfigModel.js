// Config Model - Data access layer untuk config management
const fs = require('fs');
const path = require('path');
const UserModel = require('./UserModel');

class ConfigModel {
    constructor() {
        this.configPath = path.join(__dirname, '../../../config/config.json');
        this.defaultConfig = null;
        this.loadDefaultConfig();
    }

    loadDefaultConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                this.defaultConfig = JSON.parse(data);
                console.log('✅ Config loaded from config.json');
            } else {
                this.defaultConfig = this.getDefaultConfig();
                console.warn('⚠️ config.json not found, using default values');
            }
        } catch (error) {
            console.warn('⚠️ Failed to load config.json, using default values:', error.message);
            this.defaultConfig = this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            features: {
                followerAlert: true,
                giftAlert: true,
                chatOverlay: true,
                streamTimer: true,
                viewerCount: true,
                customBanner: true,
                floatingPhotos: true,
                animations: true,
                tiktokConnector: true,
                webhookConnection: true
            },
            alerts: {
                follower: { enabled: true, duration: 5000, position: { top: '50px', right: '50px' } },
                gift: { enabled: true, duration: 6000, position: { top: '50px', right: '50px' } }
            },
            chat: { enabled: true, maxMessages: 10, position: { bottom: '50px', left: '50px' }, width: '500px', maxHeight: '400px' },
            widgets: {
                streamStatus: { enabled: true, label: 'Streaming', defaultValue: 'LIVE' },
                streamTimer: { enabled: true, position: { top: '50px', left: '50px' } },
                viewerCount: { enabled: true, showInChat: true }
            },
            theme: {
                primary: { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', solid: '#667eea' },
                secondary: { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', solid: '#f5576c' },
                background: 'rgba(0, 0, 0, 0.7)',
                text: '#ffffff'
            },
            animations: { enabled: true, duration: 500, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' },
            api: { enabled: false, endpoint: '', apiKey: '', pollInterval: 5000 },
            floatingPhotos: {
                randomColor: true,
                colorPalette: [
                    { name: 'Purple', primary: '#667eea', secondary: '#764ba2' },
                    { name: 'Pink', primary: '#f093fb', secondary: '#f5576c' },
                    { name: 'Blue', primary: '#4facfe', secondary: '#00f2fe' },
                    { name: 'Green', primary: '#43e97b', secondary: '#38f9d7' },
                    { name: 'Orange', primary: '#fa709a', secondary: '#fee140' },
                    { name: 'Cyan', primary: '#30cfd0', secondary: '#330867' },
                    { name: 'Red', primary: '#f83600', secondary: '#f9d423' },
                    { name: 'Yellow', primary: '#f6d365', secondary: '#fda085' },
                    { name: 'Indigo', primary: '#667eea', secondary: '#764ba2' },
                    { name: 'Teal', primary: '#0ba360', secondary: '#3cba92' }
                ]
            }
        };
    }

    getDefaultUserConfig() {
        const defaultConfig = this.defaultConfig || this.getDefaultConfig();
        return {
            ...defaultConfig,
            giftFloatingPhotos: { enabled: false },
            giftFirework: { enabled: false },
            giftJedagJedug: { enabled: false }
        };
    }

    getDefaultConfigValue() {
        return this.defaultConfig || this.getDefaultConfig();
    }

    loadUserConfig(username) {
        try {
            const configPath = UserModel.getUserConfigPath(username);
            if (fs.existsSync(configPath)) {
                const data = fs.readFileSync(configPath, 'utf8');
                return JSON.parse(data);
            }
            // Jika tidak ada config per user, gunakan default config
            return this.defaultConfig;
        } catch (error) {
            console.error(`Error loading config for user ${username}:`, error);
            return this.defaultConfig;
        }
    }

    saveUserConfig(username, config) {
        try {
            const configPath = UserModel.getUserConfigPath(username);
            // Pastikan folder users ada
            const usersDir = path.dirname(configPath);
            if (!fs.existsSync(usersDir)) {
                fs.mkdirSync(usersDir, { recursive: true });
            }
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error(`Error saving config for user ${username}:`, error);
            return false;
        }
    }

    getDefaultConfig() {
        return this.defaultConfig;
    }
}

module.exports = new ConfigModel();

