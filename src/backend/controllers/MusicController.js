// Music Controller - HTTP request handlers untuk music API
const fs = require('fs');
const path = require('path');
const { validatePath } = require('../security-middleware');

class MusicController {
    // GET /api/music
    getMusicList(req, res) {
        try {
            const musicDir = path.join(__dirname, '../../assets/music');
            const allowedBaseDir = path.join(__dirname, '../../assets/music');
            
            // Check if directory exists
            if (!fs.existsSync(musicDir)) {
                return res.status(200).json({ success: true, music: [] });
            }
            
            // Read directory and filter for audio files
            const files = fs.readdirSync(musicDir);
            const musicFiles = files
                .filter(file => {
                    // Validate filename untuk mencegah path traversal
                    if (file.includes('..') || file.includes('/') || file.includes('\\')) {
                        return false;
                    }
                    
                    const ext = path.extname(file).toLowerCase();
                    return ['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext);
                })
                .map(file => {
                    const fullPath = path.join(musicDir, file);
                    
                    // Validate path
                    if (!validatePath(fullPath, allowedBaseDir)) {
                        return null;
                    }
                    
                    const stats = fs.statSync(fullPath);
                    const filePath = `/assets/music/${encodeURIComponent(file)}`;
                    
                    return {
                        path: filePath,
                        name: file,
                        filename: path.basename(file, path.extname(file)),
                        size: stats.size,
                        modified: stats.mtime
                    };
                })
                .filter(file => file !== null);
            
            res.status(200).json({ success: true, music: musicFiles });
        } catch (error) {
            console.error('Error reading music directory:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        }
    }
}

module.exports = new MusicController();

