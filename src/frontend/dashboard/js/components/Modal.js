// Modal Component Base
class Modal {
    constructor(modalId) {
        this.modalId = modalId;
        this.modal = document.getElementById(modalId);
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (!this.modal) return;

        // Close buttons
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Close when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Close with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                this.close();
            }
        });
    }

    open() {
        if (this.modal) {
            this.modal.classList.add('show');
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('show');
        }
    }

    isOpen() {
        return this.modal && this.modal.classList.contains('show');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Modal;
}

