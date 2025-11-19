// Custom Banner Component
class CustomBanner {
    constructor() {
        this.banner = document.getElementById('custom-banner');
        this.duration = 4000;
    }

    show(text, duration = null) {
        if (!this.banner) return;
        
        const content = this.banner.querySelector('.banner-content');
        if (!content) return;
        
        content.textContent = text;
        this.banner.classList.add('show');
        
        setTimeout(() => {
            this.banner.classList.remove('show');
        }, duration || this.duration);
    }

    hide() {
        if (this.banner) {
            this.banner.classList.remove('show');
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CustomBanner;
}

