// Viewer Count Component
class ViewerCount {
    constructor() {
        this.count = 0;
        this.viewerCountEl = document.getElementById('viewer-count');
    }

    update(count) {
        this.count = count;
        if (this.viewerCountEl) {
            this.viewerCountEl.textContent = count.toLocaleString('id-ID');
        }
    }

    increment() {
        this.update(this.count + 1);
    }

    decrement() {
        this.update(Math.max(0, this.count - 1));
    }

    getCount() {
        return this.count;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ViewerCount;
}

