// Feature Service - Business logic untuk feature flags
const ConfigModel = require('../models/ConfigModel');

class FeatureService {
    isFeatureEnabled(featureName, defaultValue = true) {
        // Check environment variable first
        const envVar = process.env[`FEATURE_${featureName}`];
        if (envVar !== undefined) {
            return envVar === 'true' || envVar === '1';
        }
        
        // Check config
        const config = ConfigModel.getDefaultConfigValue();
        const featureMap = {
            'FOLLOWER_ALERT': config.features?.followerAlert,
            'GIFT_ALERT': config.features?.giftAlert,
            'CHAT_OVERLAY': config.features?.chatOverlay,
            'STREAM_TIMER': config.features?.streamTimer,
            'VIEWER_COUNT': config.features?.viewerCount,
            'CUSTOM_BANNER': config.features?.customBanner,
            'FLOATING_PHOTOS': config.features?.floatingPhotos,
            'ANIMATIONS': config.features?.animations,
            'TIKTOK_CONNECTOR': config.features?.tiktokConnector
        };
        
        const featureValue = featureMap[featureName];
        return featureValue !== undefined ? featureValue : defaultValue;
    }
}

module.exports = new FeatureService();

