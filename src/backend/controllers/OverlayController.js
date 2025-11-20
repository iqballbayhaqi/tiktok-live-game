// Overlay Controller - HTTP request handlers untuk overlay pages
const path = require('path');
const fs = require('fs');
const { escapeHtml, validatePath } = require('../security-middleware');
const UserModel = require('../models/UserModel');

class OverlayController {
    renderLiveCodeNotFoundPage(code) {
        try {
            const errorPagePath = path.join(__dirname, '../../frontend/client/pages/live-code-not-found/index.html');
            const allowedBaseDir = path.join(__dirname, '../../frontend/client/pages/live-code-not-found');
            
            if (!validatePath(errorPagePath, allowedBaseDir)) {
                throw new Error('Invalid file path');
            }
            
            let html = fs.readFileSync(errorPagePath, 'utf8');
            const escapedCode = escapeHtml(code);
            html = html.replace('{{CODE}}', `"${escapedCode}"`);
            html = html.replace('href="styles.css"', 'href="/live-code-not-found/styles.css"');
            html = html.replace('src="script.js"', 'src="/live-code-not-found/script.js"');
            return html;
        } catch (error) {
            console.error('Error loading live-code-not-found/index.html:', error);
            const escapedCode = escapeHtml(code);
            return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
    <title>Live Code Tidak Ditemukan</title>
</head>
<body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #000; color: #fff;">
    <h1>Live code tidak ditemukan</h1>
    <p>Live code "${escapedCode}" tidak ditemukan atau tidak valid.</p>
    <a href="#" id="back-btn" style="color: #FE2C55; text-decoration: none; font-weight: 600;">Kembali</a>
    <script>
        (function() {
            const backBtn = document.getElementById('back-btn');
            function goBack() {
                if (document.referrer && document.referrer !== window.location.href) {
                    window.history.back();
                } else {
                    window.location.href = '/control-room';
                }
            }
            if (backBtn) {
                backBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    goBack();
                });
            }
        })();
    </script>
</body>
</html>`;
        }
    }

    serveOverlay(req, res, overlayPage) {
        const { id, code } = req.params;
        const liveCode = id || code;
        const user = UserModel.getUserByCode(liveCode);
        
        if (!user) {
            return res.status(404).send(this.renderLiveCodeNotFoundPage(liveCode));
        }
        
        if (!user.active) {
            const escapedCode = escapeHtml(liveCode);
            return res.status(403).send(`
                <html>
                    <head>
                        <title>User Inactive</title>
                        <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
                    </head>
                    <body>
                        <h1>User tidak aktif</h1>
                        <p>User dengan live code "${escapedCode}" tidak aktif.</p>
                    </body>
                </html>
            `);
        }
        
        const overlayPath = path.join(__dirname, '../../frontend/client/pages', overlayPage, 'index.html');
        const allowedBaseDir = path.join(__dirname, '../../frontend/client/pages', overlayPage);
        
        if (!validatePath(overlayPath, allowedBaseDir)) {
            return res.status(500).json({
                success: false,
                error: 'Invalid file path'
            });
        }
        
        res.sendFile(overlayPath);
    }

    // GET /live/floating-photos/:id
    serveFloatingPhotos(req, res) {
        this.serveOverlay(req, res, 'floating-photos');
    }

    // GET /live/firework/:id
    serveFirework(req, res) {
        this.serveOverlay(req, res, 'firework');
    }

    // GET /live/jedagjedug/:id
    serveJedagJedug(req, res) {
        this.serveOverlay(req, res, 'jedagjedug');
    }

    // GET /live/chat/:id
    serveChat(req, res) {
        this.serveOverlay(req, res, 'chat');
    }

    // GET /live/follower-alert/:id
    serveFollowerAlert(req, res) {
        this.serveOverlay(req, res, 'follower-alert');
    }

    // GET /live/gift-alert/:id
    serveGiftAlert(req, res) {
        this.serveOverlay(req, res, 'gift-alert');
    }

    // GET /live/:code
    serveMainOverlay(req, res) {
        this.serveOverlay(req, res, 'overlay');
    }
}

module.exports = new OverlayController();

