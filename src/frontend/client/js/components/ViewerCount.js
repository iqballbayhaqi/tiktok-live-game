// Viewer Count Component
class ViewerCount {
    constructor() {
        this.count = 0;
    }

    update(count) {
        this.count = count;
        const formattedCount = count.toLocaleString('id-ID');
        
        // Cari semua elemen dengan id viewer-count (bisa ada di chat overlay atau widget container)
        const elements = document.querySelectorAll('#viewer-count');
        
        if (elements.length > 0) {
            elements.forEach(el => {
                el.textContent = formattedCount;
            });
        } else {
            // Jika elemen belum tersedia, coba lagi setelah delay singkat
            setTimeout(() => {
                const retryElements = document.querySelectorAll('#viewer-count');
                retryElements.forEach(el => {
                    el.textContent = formattedCount;
                });
            }, 100);
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

