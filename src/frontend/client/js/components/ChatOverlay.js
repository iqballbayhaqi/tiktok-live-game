// Chat Overlay Component
class ChatOverlay {
    constructor(config = {}) {
        this.config = config;
        this.chatMessages = document.getElementById('chat-messages');
        this.messages = [];
        this.maxMessages = config.maxMessages || 10;
    }

    addMessage(username, message) {
        if (!this.chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.innerHTML = `
            <span class="username">${this.escapeHtml(username)}:</span>
            <span class="message">${this.escapeHtml(message)}</span>
        `;
        
        this.chatMessages.appendChild(messageElement);
        this.messages.push({ username, message });
        
        // Limit messages
        if (this.chatMessages.children.length > this.maxMessages) {
            this.chatMessages.removeChild(this.chatMessages.firstChild);
        }
        
        // Auto scroll
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    clearMessages() {
        if (this.chatMessages) {
            this.chatMessages.innerHTML = '';
            this.messages = [];
        }
    }

    setMaxMessages(max) {
        this.maxMessages = max;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatOverlay;
}

