// TikTok Connector Component
class TikTokConnector {
    constructor() {
        this.currentUsername = null;
    }

    setUsername(username) {
        this.currentUsername = username;
    }

    async loadState() {
        if (!this.currentUsername) return null;
        
        try {
            const response = await fetch(`/api/users/${encodeURIComponent(this.currentUsername)}/tiktok/state`);
            const data = await response.json();
            
            if (data.success) {
                this.updateUI(data.state);
                return data.state;
            }
        } catch (error) {
            console.error('Error loading TikTok state:', error);
        }
        return null;
    }

    updateUI(state) {
        const statusBadge = document.getElementById('tiktok-status');
        const toggleBtn = document.getElementById('tiktok-toggle-btn');
        
        if (!statusBadge || !toggleBtn) return;
        
        if (state.isConnected) {
            statusBadge.textContent = 'Terhubung';
            statusBadge.className = 'status-badge status-connected';
            toggleBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            toggleBtn.onclick = () => this.disconnect();
        } else {
            statusBadge.textContent = 'Tidak Terhubung';
            statusBadge.className = 'status-badge status-disconnected';
            toggleBtn.innerHTML = '<i class="fas fa-play"></i> Start';
            toggleBtn.onclick = () => this.connect();
        }
    }

    async connect() {
        if (!this.currentUsername) {
            throw new Error('Silakan pilih user terlebih dahulu');
        }
        
        const toggleBtn = document.getElementById('tiktok-toggle-btn');
        const statusBadge = document.getElementById('tiktok-status');
        
        try {
            if (toggleBtn) toggleBtn.disabled = true;
            if (toggleBtn) toggleBtn.textContent = '🔄 Menghubungkan...';
            if (statusBadge) {
                statusBadge.textContent = 'Menghubungkan...';
                statusBadge.className = 'status-badge status-connecting';
            }
            
            const response = await fetch(`/api/users/${encodeURIComponent(this.currentUsername)}/tiktok/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            if (!response.ok) {
                let errorMessage = `Gagal menghubungkan (Status: ${response.status})`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                    // Jika parsing JSON gagal, gunakan error message default
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.updateUI(data.state);
                Notification.success('Berhasil terhubung ke TikTok Live!');
                return data.state;
            } else {
                throw new Error(data.error || 'Gagal terhubung ke TikTok Live');
            }
        } catch (error) {
            console.error('Error connecting to TikTok:', error);
            this.updateUI({ isConnected: false, username: null });
            const errorMessage = error.message || 'Terjadi kesalahan saat menghubungkan';
            Notification.error('Gagal menghubungkan ke TikTok Live: ' + errorMessage);
            throw error;
        } finally {
            if (toggleBtn) toggleBtn.disabled = false;
        }
    }

    async disconnect() {
        if (!this.currentUsername) {
            throw new Error('Silakan pilih user terlebih dahulu');
        }
        
        const toggleBtn = document.getElementById('tiktok-toggle-btn');
        
        try {
            if (toggleBtn) toggleBtn.disabled = true;
            if (toggleBtn) toggleBtn.textContent = '🔄 Memutuskan...';
            
            const response = await fetch(`/api/users/${encodeURIComponent(this.currentUsername)}/tiktok/disconnect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                let errorMessage = `Gagal memutuskan koneksi (Status: ${response.status})`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                    // Jika parsing JSON gagal, gunakan error message default
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.updateUI({ isConnected: false, username: null });
                Notification.success('Koneksi berhasil diputuskan');
                return true;
            } else {
                throw new Error(data.error || 'Gagal memutuskan koneksi');
            }
        } catch (error) {
            console.error('Error disconnecting from TikTok:', error);
            const errorMessage = error.message || 'Terjadi kesalahan saat memutuskan koneksi';
            Notification.error('Gagal memutuskan koneksi: ' + errorMessage);
            throw error;
        } finally {
            if (toggleBtn) toggleBtn.disabled = false;
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TikTokConnector;
}

