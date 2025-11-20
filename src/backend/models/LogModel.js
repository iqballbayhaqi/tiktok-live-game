// Log Model - Data access layer untuk log management
const MAX_LOG_ENTRIES = 1000;

class LogModel {
    constructor() {
        this.userLogs = new Map();
    }

    addLog(username, type, message, data = null) {
        if (!username) return;
        
        if (!this.userLogs.has(username)) {
            this.userLogs.set(username, []);
        }
        
        const logs = this.userLogs.get(username);
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: type,
            message: message,
            data: data
        };
        
        logs.push(logEntry);
        
        // Batasi jumlah log entries
        if (logs.length > MAX_LOG_ENTRIES) {
            logs.shift(); // Hapus log tertua
        }
    }

    getLogs(username, limit = 100) {
        if (!username || !this.userLogs.has(username)) {
            return [];
        }
        
        const logs = this.userLogs.get(username);
        // Return log terbaru (limit terakhir)
        return logs.slice(-limit);
    }

    clearLogs(username) {
        if (username && this.userLogs.has(username)) {
            this.userLogs.set(username, []);
            return true;
        }
        return false;
    }
}

module.exports = new LogModel();

