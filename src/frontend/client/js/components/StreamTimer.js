// Stream Timer Component
class StreamTimer {
    constructor() {
        this.startTime = Date.now();
        this.intervalId = null;
        this.durationElement = document.getElementById('stream-duration');
    }

    start() {
        this.startTime = Date.now();
        this.update();
        this.intervalId = setInterval(() => this.update(), 1000);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    reset() {
        this.stop();
        this.startTime = Date.now();
        this.update();
    }

    update() {
        if (!this.durationElement) return;
        
        const elapsed = Date.now() - this.startTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        this.durationElement.textContent = timeString;
    }

    getElapsedTime() {
        return Date.now() - this.startTime;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StreamTimer;
}

