// Add User Modal Component
class AddUserModal {
    constructor() {
        this.modal = new Modal('add-user-modal');
        this.addUserBtn = document.getElementById('add-user-btn');
        this.cancelBtn = document.getElementById('cancel-add-user-btn');
        this.addUserForm = document.getElementById('add-user-form');
        this.onUserAdded = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.modal.setupEventListeners();
        
        if (this.addUserBtn) {
            this.addUserBtn.addEventListener('click', () => {
                this.open();
                const usernameInput = document.getElementById('new-username');
                if (usernameInput) usernameInput.focus();
            });
        }

        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => this.close());
        }

        if (this.addUserForm) {
            this.addUserForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSubmit();
            });
        }
    }

    open() {
        this.modal.open();
    }

    close() {
        this.modal.close();
        if (this.addUserForm) {
            this.addUserForm.reset();
        }
    }

    async handleSubmit() {
        const usernameInput = document.getElementById('new-username');
        const displayNameInput = document.getElementById('new-display-name');
        const submitBtn = this.addUserForm.querySelector('button[type="submit"]');
        
        let username = usernameInput.value.trim();
        const displayName = displayNameInput.value.trim();

        // Validate username
        if (!username) {
            Notification.error('Username wajib diisi');
            usernameInput.focus();
            return;
        }

        // Normalize username
        if (!username.startsWith('@')) {
            username = `@${username}`;
        }

        if (username === '@' || username.length < 2) {
            Notification.error('Username tidak valid. Minimal 1 karakter setelah @');
            usernameInput.focus();
            return;
        }

        try {
            if (submitBtn) submitBtn.disabled = true;
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    displayName: displayName || null
                })
            });

            const data = await response.json();

            if (data.success) {
                Notification.success(`User ${data.user.username} berhasil ditambahkan!`);
                this.close();
                
                if (this.onUserAdded) {
                    this.onUserAdded(data.user);
                }
            } else {
                throw new Error(data.error || 'Gagal menambahkan user');
            }
        } catch (error) {
            console.error('Error adding user:', error);
            Notification.error('Gagal menambahkan user: ' + error.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan User';
            }
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AddUserModal;
}

