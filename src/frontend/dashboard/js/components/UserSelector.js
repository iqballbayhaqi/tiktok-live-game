// User Selector Component
class UserSelector {
    constructor() {
        this.usersList = [];
        this.currentUsername = null;
        this.onUserChange = null;
        this.logPollInterval = null;
        this.isLogSectionVisible = false;
        this.lastLogCount = 0;
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/users');
            const data = await response.json();

            if (data.success) {
                this.usersList = data.users || [];
                this.populateSelector();
                
                // Auto-select first user if available
                if (this.usersList.length > 0) {
                    const firstUser = this.usersList[0];
                    this.selectUser(firstUser.username);
                }
                
                return this.usersList;
            } else {
                throw new Error(data.error || 'Gagal memuat daftar users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            throw error;
        }
    }

    populateSelector() {
        const listContainer = document.getElementById('userSelectorList');
        const hiddenSelect = document.getElementById('user-selector');
        
        if (!listContainer || !hiddenSelect) return;
        
        // Clear existing items
        listContainer.innerHTML = '';
        hiddenSelect.innerHTML = '<option value="">-- Pilih User --</option>';
        
        // Add users to dropdown
        this.usersList.forEach(user => {
            // Create dropdown item
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.dataset.username = user.username;
            
            const label = document.createElement('label');
            label.textContent = `${user.displayName || user.username}${user.liveCode ? ` (${user.liveCode})` : ''}`;
            label.style.cursor = 'pointer';
            label.style.margin = '0';
            label.style.width = '100%';
            
            item.appendChild(label);
            listContainer.appendChild(item);

            // Create hidden option for form submission
            const option = document.createElement('option');
            option.value = user.username;
            option.textContent = `${user.displayName || user.username}${user.liveCode ? ` (${user.liveCode})` : ''}`;
            hiddenSelect.appendChild(option);

            // Add click handler for item
            item.addEventListener('click', () => {
                this.selectUser(user.username);
                this.closeDropdown();
            });
        });

        // Setup search functionality
        const searchInput = document.getElementById('userSelectorSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterUserItems(e.target.value);
            });
        }

        // Setup dropdown toggle
        this.setupDropdownToggle();
    }

    setupDropdownToggle() {
        const trigger = document.getElementById('userSelectorTrigger');
        const menu = document.getElementById('userSelectorMenu');
        const dropdown = document.getElementById('userSelectorDropdown');
        const searchInput = document.getElementById('userSelectorSearch');

        if (!trigger || !menu || !dropdown) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = menu.classList.contains('show');
            
            // Close all dropdowns first
            document.querySelectorAll('.dropdown-menu').forEach(m => {
                m.classList.remove('show');
                // Reset search when closing
                const search = m.querySelector('.dropdown-search-input');
                if (search) {
                    search.value = '';
                    this.filterUserItems('');
                }
            });
            document.querySelectorAll('.dropdown-trigger').forEach(t => t.classList.remove('active'));

            if (!isOpen) {
                menu.classList.add('show');
                trigger.classList.add('active');
                // Update selected item styling when opening
                if (this.currentUsername) {
                    document.querySelectorAll('#userSelectorList .dropdown-item').forEach(item => {
                        if (item.dataset.username === this.currentUsername) {
                            item.classList.add('selected');
                        } else {
                            item.classList.remove('selected');
                        }
                    });
                }
                // Focus search input when opening
                if (searchInput) {
                    setTimeout(() => searchInput.focus(), 100);
                }
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    closeDropdown() {
        const menu = document.getElementById('userSelectorMenu');
        const trigger = document.getElementById('userSelectorTrigger');
        const searchInput = document.getElementById('userSelectorSearch');
        
        if (menu) menu.classList.remove('show');
        if (trigger) trigger.classList.remove('active');
        if (searchInput) {
            searchInput.value = '';
            this.filterUserItems('');
        }
    }

    filterUserItems(searchTerm) {
        const items = document.querySelectorAll('#userSelectorList .dropdown-item');
        const term = searchTerm.toLowerCase().trim();

        items.forEach(item => {
            const label = item.querySelector('label');
            const text = label ? label.textContent.toLowerCase() : '';
            
            if (text.includes(term)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    selectUser(username) {
        this.currentUsername = username;
        const hiddenSelect = document.getElementById('user-selector');
        const trigger = document.getElementById('userSelectorTrigger');
        const textSpan = trigger ? trigger.querySelector('.dropdown-text') : null;
        const user = this.usersList.find(u => u.username === username);
        
        if (hiddenSelect) {
            hiddenSelect.value = username;
        }
        
        // Update trigger text
        if (textSpan && user) {
            textSpan.textContent = `${user.displayName || user.username}${user.liveCode ? ` (${user.liveCode})` : ''}`;
        }
        
        // Update selected item styling
        document.querySelectorAll('#userSelectorList .dropdown-item').forEach(item => {
            if (item.dataset.username === username) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        if (this.onUserChange) {
            this.onUserChange(username);
        }
        
        this.updateUserInfo();
        this.setupLogSection();
    }

    setupLogSection() {
        const toggleBtn = document.getElementById('toggle-log-section-btn');
        const logContent = document.getElementById('log-section-content');
        const clearBtn = document.getElementById('clear-log-btn');
        
        if (!toggleBtn || !logContent) return;
        
        // Setup toggle button (hanya sekali)
        if (!toggleBtn.dataset.listenerAdded) {
            toggleBtn.addEventListener('click', () => {
                this.toggleLogSection();
            });
            toggleBtn.dataset.listenerAdded = 'true';
        }
        
        // Setup clear button (hanya sekali)
        if (clearBtn && !clearBtn.dataset.listenerAdded) {
            clearBtn.addEventListener('click', () => {
                this.clearLogs();
            });
            clearBtn.dataset.listenerAdded = 'true';
        }
        
        // Load logs when section is shown
        if (this.isLogSectionVisible) {
            this.loadLogs();
            this.startLogPolling();
        }
    }
    
    toggleLogSection() {
        const toggleBtn = document.getElementById('toggle-log-section-btn');
        const logContent = document.getElementById('log-section-content');
        const icon = toggleBtn ? toggleBtn.querySelector('i') : null;
        
        if (!logContent) return;
        
        this.isLogSectionVisible = !this.isLogSectionVisible;
        
        if (this.isLogSectionVisible) {
            logContent.style.display = 'block';
            if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Sembunyikan';
            this.loadLogs();
            this.startLogPolling();
        } else {
            logContent.style.display = 'none';
            if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Tampilkan';
            this.stopLogPolling();
        }
    }
    
    async loadLogs() {
        if (!this.currentUsername) return;
        
        try {
            const response = await fetch(`/api/users/${encodeURIComponent(this.currentUsername)}/logs?limit=100`);
            const data = await response.json();
            
            if (data.success) {
                this.renderLogs(data.logs);
                this.lastLogCount = data.logs.length;
            }
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    }
    
    renderLogs(logs) {
        const container = document.getElementById('log-container');
        if (!container) return;
        
        if (logs.length === 0) {
            container.innerHTML = `
                <div class="log-empty" style="text-align: center; padding: 20px; color: #657786; font-size: 13px;">
                    <i class="fas fa-info-circle"></i> Belum ada log. Log akan muncul saat live streaming aktif.
                </div>
            `;
            return;
        }
        
        const autoScroll = document.getElementById('auto-scroll-log')?.checked ?? true;
        const wasScrolledToBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
        
        container.innerHTML = '';
        
        logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry log-${log.type}`;
            
            const timestamp = new Date(log.timestamp).toLocaleTimeString('id-ID');
            const icon = this.getLogIcon(log.type);
            
            logEntry.innerHTML = `
                <span class="log-time">${timestamp}</span>
                <span class="log-icon">${icon}</span>
                <span class="log-message">${this.escapeHtml(log.message)}</span>
            `;
            
            container.appendChild(logEntry);
        });
        
        // Auto scroll jika enabled dan user sudah di bottom
        if (autoScroll && wasScrolledToBottom) {
            container.scrollTop = container.scrollHeight;
        }
    }
    
    getLogIcon(type) {
        const icons = {
            'chat': '💬',
            'gift': '🎁',
            'follower': '👋',
            'viewer': '👁️',
            'success': '✅',
            'error': '❌',
            'info': 'ℹ️',
            'banner': '📢',
            'floating-photo': '🖼️'
        };
        return icons[type] || '📝';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    startLogPolling() {
        this.stopLogPolling(); // Stop existing polling if any
        
        // Poll setiap 2 detik
        this.logPollInterval = setInterval(() => {
            if (this.isLogSectionVisible && this.currentUsername) {
                this.loadLogs();
            }
        }, 2000);
    }
    
    stopLogPolling() {
        if (this.logPollInterval) {
            clearInterval(this.logPollInterval);
            this.logPollInterval = null;
        }
    }
    
    async clearLogs() {
        if (!this.currentUsername) return;
        
        if (!confirm('Apakah Anda yakin ingin menghapus semua log?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/users/${encodeURIComponent(this.currentUsername)}/logs`, {
                method: 'DELETE'
            });
            const data = await response.json();
            
            if (data.success) {
                this.loadLogs();
            }
        } catch (error) {
            console.error('Error clearing logs:', error);
        }
    }

    updateUserInfo() {
        const user = this.usersList.find(u => u.username === this.currentUsername);
        if (user && user.liveCode) {
            const userInfo = document.getElementById('user-info');
            const liveCodeSpan = document.getElementById('user-live-code');
            const overlayLink = document.getElementById('overlay-link');
            
            if (liveCodeSpan) liveCodeSpan.textContent = user.liveCode;
            if (overlayLink) overlayLink.href = `/live/${user.liveCode}`;
            if (userInfo) userInfo.style.display = 'block';
            
            // Setup open live TikTok button handler
            this.setupOpenLiveTikTokButton(user.username);
        } else {
            this.hideUserInfo();
        }
    }
    
    setupOpenLiveTikTokButton(username) {
        const openLiveBtn = document.getElementById('open-live-tiktok-btn');
        if (!openLiveBtn) return;
        
        // Remove existing handler if any
        const newBtn = openLiveBtn.cloneNode(true);
        openLiveBtn.parentNode.replaceChild(newBtn, openLiveBtn);
        
        // Add click handler
        newBtn.addEventListener('click', () => {
            // Format username: remove @ if present, then add it back
            const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
            const tiktokLiveUrl = `https://www.tiktok.com/@${cleanUsername}/live`;
            window.open(tiktokLiveUrl, '_blank');
        });
    }

    hideUserInfo() {
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.style.display = 'none';
        }
        
        // Stop log polling
        this.stopLogPolling();
        
        // Reset trigger text
        const trigger = document.getElementById('userSelectorTrigger');
        const textSpan = trigger ? trigger.querySelector('.dropdown-text') : null;
        if (textSpan) {
            textSpan.textContent = 'Klik untuk memilih user';
        }
        
        // Remove selected class from all items
        document.querySelectorAll('#userSelectorList .dropdown-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

    getCurrentUser() {
        return this.currentUsername;
    }

    getUsersList() {
        return this.usersList;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserSelector;
}

