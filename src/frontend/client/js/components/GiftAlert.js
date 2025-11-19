// Gift Alert Component
class GiftAlert {
    constructor(config = {}) {
        this.config = config;
        this.alert = document.getElementById('gift-alert');
        this.duration = config.duration || 6000;
        this.queue = [];
        this.isShowing = false;
        this.currentTimeout = null;
    }

    show(username, giftName, quantity, giftImageUrl = null) {
        if (!this.alert) return;
        
        // Tambahkan ke queue
        this.queue.push({
            username,
            giftName,
            quantity,
            giftImageUrl
        });
        
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
        const giftElement = this.alert.querySelector('.alert-gift');
        const giftIconImage = this.alert.querySelector('.alert-icon-gift');
        const giftIconFallback = this.alert.querySelector('.alert-icon-fallback');
        
        if (!nameElement || !giftElement) {
            this.isShowing = false;
            this.processQueue();
            return;
        }
        
        nameElement.textContent = alertData.username;
        giftElement.textContent = `${alertData.quantity}x ${alertData.giftName}`;
        
        // Handle gift image
        if (giftIconImage && giftIconFallback) {
            if (alertData.giftImageUrl && alertData.giftImageUrl.trim() !== '') {
                giftIconImage.src = alertData.giftImageUrl;
                giftIconImage.style.display = 'block';
                giftIconFallback.style.display = 'none';
                giftIconImage.onerror = () => {
                    giftIconImage.style.display = 'none';
                    giftIconFallback.style.display = 'block';
                };
            } else {
                giftIconImage.style.display = 'none';
                giftIconFallback.style.display = 'block';
            }
        }
        
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
    module.exports = GiftAlert;
}

