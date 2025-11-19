// Follower Alert Component
class FollowerAlert {
    constructor(config = {}) {
        this.config = config;
        this.alert = document.getElementById('follower-alert');
        this.duration = config.duration || 5000;
        this.queue = [];
        this.isShowing = false;
        this.currentTimeout = null;
    }

    show(username) {
        if (!this.alert) return;
        
        // Tambahkan ke queue
        this.queue.push({ username });
        
        // Jika tidak sedang menampilkan alert, tampilkan yang pertama
        if (!this.isShowing) {
            this.processQueue();
        }
    }

    processQueue() {
        if (this.queue.length === 0) {
            this.isShowing = false;
            return;
        }
        
        this.isShowing = true;
        const alertData = this.queue.shift();
        
        const nameElement = this.alert.querySelector('.alert-name');
        if (!nameElement) {
            this.isShowing = false;
            this.processQueue();
            return;
        }
        
        nameElement.textContent = alertData.username;
        this.alert.classList.add('show');
        
        // Clear timeout sebelumnya jika ada
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
        }
        
        this.currentTimeout = setTimeout(() => {
            this.alert.classList.remove('show');
            
            // Tunggu animasi keluar selesai sebelum menampilkan alert berikutnya
            setTimeout(() => {
                this.processQueue();
            }, 500); // Sesuaikan dengan durasi transition CSS
        }, this.duration);
    }

    hide() {
        if (this.alert) {
            this.alert.classList.remove('show');
        }
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }
        this.isShowing = false;
        this.queue = [];
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FollowerAlert;
}

