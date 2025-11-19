// Delete User Modal Component
class DeleteUserModal {
    constructor() {
        this.modal = new Modal('delete-user-modal');
        this.deleteUserBtn = document.getElementById('delete-user-btn');
        this.cancelBtn = document.getElementById('cancel-delete-user-btn');
        this.confirmBtn = document.getElementById('confirm-delete-user-btn');
        this.onUserDeleted = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.modal.setupEventListeners();
        
        if (this.deleteUserBtn) {
            this.deleteUserBtn.addEventListener('click', () => {
                const username = this.getCurrentUsername();
                if (!username) {
                    Notification.error('Silakan pilih user terlebih dahulu');
                    return;
                }
                
                const usernameText = document.getElementById('delete-username-text');
                if (usernameText) {
                    usernameText.textContent = username;
                }
                this.modal.open();
            });
        }

        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => this.modal.close());
        }

        if (this.confirmBtn) {
            this.confirmBtn.addEventListener('click', async () => {
                await this.handleDelete();
            });
        }
    }

    getCurrentUsername() {
        const selector = document.getElementById('user-selector');
        return selector ? selector.value : null;
    }

    async handleDelete() {
        const username = this.getCurrentUsername();
        if (!username) {
            Notification.error('Silakan pilih user terlebih dahulu');
            return;
        }

        try {
            if (this.confirmBtn) this.confirmBtn.disabled = true;
            if (this.confirmBtn) this.confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menghapus...';

            const response = await fetch(`/api/users/${encodeURIComponent(username)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                Notification.success(`User ${username} berhasil dihapus!`);
                this.modal.close();
                
                if (this.onUserDeleted) {
                    this.onUserDeleted(username);
                }
            } else {
                throw new Error(data.error || 'Gagal menghapus user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            Notification.error('Gagal menghapus user: ' + error.message);
        } finally {
            if (this.confirmBtn) {
                this.confirmBtn.disabled = false;
                this.confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Ya, Hapus User';
            }
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeleteUserModal;
}

