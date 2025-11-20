// State Model - Data access layer untuk user state management
const MAX_CHAT_MESSAGES = 100;

class StateModel {
    constructor() {
        this.userState = new Map();
    }

    getUserState(username) {
        if (!this.userState.has(username)) {
            this.userState.set(username, {
                chatMessages: [],
                viewerCount: 0,
                bannerText: null,
                lastUpdate: Date.now()
            });
        }
        return this.userState.get(username);
    }

    updateChatMessages(username, message) {
        const state = this.getUserState(username);
        state.chatMessages.push({
            username: message.username,
            message: message.message,
            timestamp: Date.now()
        });
        
        // Batasi jumlah chat messages yang disimpan
        if (state.chatMessages.length > MAX_CHAT_MESSAGES) {
            state.chatMessages.shift(); // Hapus yang paling lama
        }
        state.lastUpdate = Date.now();
    }

    updateViewerCount(username, count) {
        const state = this.getUserState(username);
        state.viewerCount = count;
        state.lastUpdate = Date.now();
    }

    updateBannerText(username, text) {
        const state = this.getUserState(username);
        state.bannerText = text;
        state.lastUpdate = Date.now();
    }

    getStateSyncData(username) {
        const state = this.getUserState(username);
        return {
            chatMessages: state.chatMessages.slice(-MAX_CHAT_MESSAGES),
            viewerCount: state.viewerCount,
            bannerText: state.bannerText
        };
    }

    clearState(username) {
        if (this.userState.has(username)) {
            this.userState.delete(username);
        }
    }
}

module.exports = new StateModel();

