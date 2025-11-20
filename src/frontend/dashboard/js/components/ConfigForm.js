// Config Form Component
class ConfigForm {
    constructor() {
        this.currentConfig = null;
        this.form = document.getElementById('config-form');
        this.giftsData = null;
        this.musicData = null;
        this.loadGiftsData();
        this.loadMusicData();
        // Setup mode selection handlers setelah DOM siap
        setTimeout(() => {
            this.setupModeSelectionHandlers();
        }, 100);
    }

    async loadGiftsData() {
        try {
            const response = await fetch('/config/tiktok-gifts.json');
            if (response.ok) {
                this.giftsData = await response.json();
                // Tunggu sebentar untuk memastikan DOM sudah siap
                setTimeout(() => {
                    this.populateGiftSelects();
                    // Jika ada config yang sudah dimuat, populate ulang untuk set nilai select
                    if (this.currentConfig) {
                        this.setGiftSelectValues('giftFloatingPhotosGifts', this.currentConfig.giftFloatingPhotos?.gifts);
                        this.setGiftSelectValues('giftFireworkGifts', this.currentConfig.giftFirework?.gifts);
                        this.setGiftSelectValues('giftJedagJedugGifts', this.currentConfig.giftJedagJedug?.gifts);
                    }
                }, 100);
            } else {
                console.warn('Gagal memuat data gift, menggunakan fallback');
            }
        } catch (error) {
            console.error('Error loading gifts data:', error);
        }
    }

    async loadMusicData() {
        try {
            const response = await fetch('/api/music');
            if (response.ok) {
                const data = await response.json();
                this.musicData = data.music || [];
                // Tunggu sebentar untuk memastikan DOM sudah siap
                setTimeout(async () => {
                    await this.populateMusicSelect();
                    // Jika ada config yang sudah dimuat, set nilai select musik
                    if (this.currentConfig && this.currentConfig.giftJedagJedug?.musicPath) {
                        const musicSelect = document.getElementById('giftJedagJedugMusicPath');
                        if (musicSelect) {
                            // Check if the value exists in options, if not add it
                            const optionExists = Array.from(musicSelect.options).some(opt => opt.value === this.currentConfig.giftJedagJedug.musicPath);
                            if (!optionExists && this.currentConfig.giftJedagJedug.musicPath) {
                                // Add custom option if it doesn't exist
                                const option = document.createElement('option');
                                option.value = this.currentConfig.giftJedagJedug.musicPath;
                                option.textContent = this.currentConfig.giftJedagJedug.musicPath;
                                musicSelect.appendChild(option);
                            }
                            musicSelect.value = this.currentConfig.giftJedagJedug.musicPath;
                        }
                    }
                }, 100);
            } else {
                console.warn('Gagal memuat data musik, menggunakan fallback');
            }
        } catch (error) {
            console.error('Error loading music data:', error);
        }
    }

    async populateMusicSelect() {
        const musicSelect = document.getElementById('giftJedagJedugMusicPath');
        if (!musicSelect || !this.musicData || this.musicData.length === 0) {
            return;
        }

        // Clear existing options (keep first empty option if exists)
        const firstOption = musicSelect.options[0];
        musicSelect.innerHTML = '';
        if (firstOption && firstOption.value === '') {
            musicSelect.appendChild(firstOption);
        }

        // Add music options
        for (const music of this.musicData) {
            const option = document.createElement('option');
            option.value = music.path;
            
            // Try to detect duration from audio file
            const duration = await this.getAudioDuration(music.path);
            if (duration) {
                option.setAttribute('data-duration', duration);
                option.textContent = `${music.filename} (${duration}ms)`;
            } else {
                option.textContent = music.filename;
            }
            
            musicSelect.appendChild(option);
        }
    }

    async getAudioDuration(audioPath) {
        return new Promise((resolve) => {
            try {
                const audio = new Audio(audioPath);
                audio.addEventListener('loadedmetadata', () => {
                    const duration = Math.round(audio.duration * 1000); // Convert to milliseconds
                    resolve(duration);
                });
                audio.addEventListener('error', () => {
                    resolve(null);
                });
                // Set a timeout to avoid hanging
                setTimeout(() => resolve(null), 5000);
            } catch (error) {
                resolve(null);
            }
        });
    }

    populateGiftSelects() {
        if (!this.giftsData || !this.giftsData.gifts) {
            return;
        }

        // Populate Floating Photos dropdown
        this.populateCustomDropdown('giftFloatingPhotos', this.giftsData.gifts);
        
        // Populate Firework dropdown
        this.populateCustomDropdown('giftFirework', this.giftsData.gifts);
        
        // Populate Jedag Jedug dropdown
        this.populateCustomDropdown('giftJedagJedug', this.giftsData.gifts);
    }

    populateCustomDropdown(prefix, gifts) {
        const listContainer = document.getElementById(`${prefix}List`);
        const hiddenSelect = document.getElementById(`${prefix}Gifts`);
        
        if (!listContainer || !hiddenSelect) return;

        // Remove all existing elements with duplicate IDs first
        const existingCheckboxes = document.querySelectorAll(`input[type="checkbox"][id^="${prefix}-"]`);
        existingCheckboxes.forEach(cb => {
            if (cb.id.startsWith(`${prefix}-`) && cb.id !== `${prefix}Search`) {
                const label = document.querySelector(`label[for="${cb.id}"]`);
                if (label && label.parentNode) {
                    label.parentNode.remove();
                } else if (cb.parentNode) {
                    cb.parentNode.remove();
                }
            }
        });

        // Clear existing items completely - remove all event listeners by clearing innerHTML
        listContainer.innerHTML = '';
        hiddenSelect.innerHTML = '';

        // Remove existing event listeners by cloning and replacing search input
        const searchInput = document.getElementById(`${prefix}Search`);
        if (searchInput && searchInput.parentNode) {
            const newSearchInput = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        }

        // Create dropdown items
        gifts.forEach(gift => {
            // Create dropdown item
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.dataset.giftName = gift.name;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            // Use unique ID with prefix to avoid conflicts
            checkbox.id = `${prefix}-${gift.name}`;
            checkbox.value = gift.name;
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = `${gift.name} (${gift.coins} coins)`;
            
            item.appendChild(checkbox);
            item.appendChild(label);
            listContainer.appendChild(item);

            // Create hidden option for form submission
            const option = document.createElement('option');
            option.value = gift.name;
            option.textContent = gift.name;
            hiddenSelect.appendChild(option);

            // Add click handler for item
            item.addEventListener('click', (e) => {
                if (e.target !== checkbox && e.target !== label) {
                    checkbox.checked = !checkbox.checked;
                }
                this.updateDropdownSelection(prefix);
            });

            // Add change handler for checkbox
            checkbox.addEventListener('change', () => {
                this.updateDropdownSelection(prefix);
            });
        });

        // Setup search functionality with new search input
        const newSearchInput = document.getElementById(`${prefix}Search`);
        if (newSearchInput) {
            // Remove any existing listeners by using once or replacing
            const searchHandler = (e) => {
                this.filterDropdownItems(prefix, e.target.value);
            };
            newSearchInput.removeEventListener('input', searchHandler); // Try to remove if exists
            newSearchInput.addEventListener('input', searchHandler);
        }

        // Setup dropdown toggle (only once per prefix)
        if (!this._dropdownToggleSetup || !this._dropdownToggleSetup[prefix]) {
            this.setupDropdownToggle(prefix);
            if (!this._dropdownToggleSetup) {
                this._dropdownToggleSetup = {};
            }
            this._dropdownToggleSetup[prefix] = true;
        }
    }

    setupDropdownToggle(prefix) {
        const trigger = document.getElementById(`${prefix}Trigger`);
        const menu = document.getElementById(`${prefix}Menu`);
        const dropdown = document.getElementById(`${prefix}Dropdown`);
        const searchInput = document.getElementById(`${prefix}Search`);

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
                    const menuPrefix = m.id.replace('Menu', '');
                    search.value = '';
                    this.filterDropdownItems(menuPrefix, '');
                }
            });
            document.querySelectorAll('.dropdown-trigger').forEach(t => t.classList.remove('active'));

            if (!isOpen) {
                menu.classList.add('show');
                trigger.classList.add('active');
                // Focus search input when opening
                if (searchInput) {
                    setTimeout(() => searchInput.focus(), 100);
                }
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                menu.classList.remove('show');
                trigger.classList.remove('active');
                // Reset search when closing
                if (searchInput) {
                    searchInput.value = '';
                    this.filterDropdownItems(prefix, '');
                }
            }
        });
    }

    filterDropdownItems(prefix, searchTerm) {
        const items = document.querySelectorAll(`#${prefix}List .dropdown-item`);
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

    updateDropdownSelection(prefix) {
        const checkboxes = document.querySelectorAll(`#${prefix}List input[type="checkbox"]:checked`);
        const hiddenSelect = document.getElementById(`${prefix}Gifts`);
        const badge = document.getElementById(`${prefix}Badge`);
        const trigger = document.getElementById(`${prefix}Trigger`);
        const textSpan = trigger ? trigger.querySelector('.dropdown-text') : null;

        const selectedValues = Array.from(checkboxes).map(cb => cb.value);
        const selectedCount = selectedValues.length;

        // Update hidden select
        if (hiddenSelect) {
            Array.from(hiddenSelect.options).forEach(option => {
                option.selected = selectedValues.includes(option.value);
            });
        }

        // Update badge
        if (badge) {
            if (selectedCount > 0) {
                badge.textContent = `${selectedCount} dipilih`;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        // Update trigger text
        if (textSpan) {
            if (selectedCount === 0) {
                textSpan.textContent = 'Klik untuk memilih gift';
            } else if (selectedCount === 1) {
                textSpan.textContent = checkboxes[0].value;
            } else {
                textSpan.textContent = `${selectedCount} gift dipilih`;
            }
        }

        // Update item selected class
        document.querySelectorAll(`#${prefix}List .dropdown-item`).forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });

        // Trigger change event on hidden select for form handlers
        if (hiddenSelect) {
            hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    populateForm(config) {
        this.currentConfig = config;
        
        // Pastikan gift selects sudah diisi sebelum populate form
        if (this.giftsData) {
            this.populateGiftSelects();
        }
        
        // Features
        this.setNestedValue('features.followerAlert', config.features?.followerAlert);
        this.setNestedValue('features.giftAlert', config.features?.giftAlert);
        this.setNestedValue('features.chatOverlay', config.features?.chatOverlay);
        this.setNestedValue('features.streamTimer', config.features?.streamTimer);
        this.setNestedValue('features.viewerCount', config.features?.viewerCount);
        this.setNestedValue('features.customBanner', config.features?.customBanner);
        this.setNestedValue('features.floatingPhotos', config.features?.floatingPhotos);
        this.setNestedValue('features.animations', config.features?.animations);
        this.setNestedValue('features.tiktokConnector', config.features?.tiktokConnector);
        this.setNestedValue('features.webhookConnection', config.features?.webhookConnection);

        // Alerts
        this.setNestedValue('alerts.follower.enabled', config.alerts?.follower?.enabled);
        this.setNestedValue('alerts.follower.duration', config.alerts?.follower?.duration);
        this.setNestedValue('alerts.follower.position.top', config.alerts?.follower?.position?.top);
        this.setNestedValue('alerts.follower.position.right', config.alerts?.follower?.position?.right);
        this.setNestedValue('alerts.gift.enabled', config.alerts?.gift?.enabled);
        this.setNestedValue('alerts.gift.duration', config.alerts?.gift?.duration);
        this.setNestedValue('alerts.gift.position.top', config.alerts?.gift?.position?.top);
        this.setNestedValue('alerts.gift.position.right', config.alerts?.gift?.position?.right);

        // Chat
        this.setNestedValue('chat.enabled', config.chat?.enabled);
        this.setNestedValue('chat.maxMessages', config.chat?.maxMessages);
        this.setNestedValue('chat.position.bottom', config.chat?.position?.bottom);
        this.setNestedValue('chat.position.left', config.chat?.position?.left);
        this.setNestedValue('chat.width', config.chat?.width);
        this.setNestedValue('chat.maxHeight', config.chat?.maxHeight);

        // Widgets
        this.setNestedValue('widgets.streamStatus.enabled', config.widgets?.streamStatus?.enabled);
        this.setNestedValue('widgets.streamStatus.label', config.widgets?.streamStatus?.label);
        this.setNestedValue('widgets.streamStatus.defaultValue', config.widgets?.streamStatus?.defaultValue);
        this.setNestedValue('widgets.streamTimer.enabled', config.widgets?.streamTimer?.enabled);
        this.setNestedValue('widgets.streamTimer.position.top', config.widgets?.streamTimer?.position?.top);
        this.setNestedValue('widgets.streamTimer.position.left', config.widgets?.streamTimer?.position?.left);
        this.setNestedValue('widgets.viewerCount.enabled', config.widgets?.viewerCount?.enabled);
        this.setNestedValue('widgets.viewerCount.showInChat', config.widgets?.viewerCount?.showInChat);

        // Theme
        this.setNestedValue('theme.primary.gradient', config.theme?.primary?.gradient);
        this.setNestedValue('theme.primary.solid', config.theme?.primary?.solid);
        this.setNestedValue('theme.secondary.gradient', config.theme?.secondary?.gradient);
        this.setNestedValue('theme.secondary.solid', config.theme?.secondary?.solid);
        this.setNestedValue('theme.background', config.theme?.background);
        this.setNestedValue('theme.text', config.theme?.text);

        // API
        this.setNestedValue('api.enabled', config.api?.enabled);
        this.setNestedValue('api.endpoint', config.api?.endpoint);
        this.setNestedValue('api.apiKey', config.api?.apiKey);
        this.setNestedValue('api.pollInterval', config.api?.pollInterval);

        // Floating Photos
        this.setNestedValue('floatingPhotos.randomColor', config.floatingPhotos?.randomColor);
        this.setNestedValue('floatingPhotos.maxPhotos', config.floatingPhotos?.maxPhotos || 100);
        this.setNestedValue('floatingPhotos.scale', config.floatingPhotos?.scale || 1.0);
        
        // Floating Photos Triggers
        this.setNestedValue('floatingPhotos.triggers.chat', config.floatingPhotos?.triggers?.chat || false);
        this.setNestedValue('floatingPhotos.triggers.chatScale', config.floatingPhotos?.triggers?.chatScale || 1.0);
        this.setNestedValue('floatingPhotos.triggers.follow', config.floatingPhotos?.triggers?.follow || false);
        this.setNestedValue('floatingPhotos.triggers.followScale', config.floatingPhotos?.triggers?.followScale || 1.0);
        this.setNestedValue('floatingPhotos.triggers.share', config.floatingPhotos?.triggers?.share || false);
        this.setNestedValue('floatingPhotos.triggers.shareScale', config.floatingPhotos?.triggers?.shareScale || 1.0);
        this.setNestedValue('floatingPhotos.triggers.gift', config.floatingPhotos?.triggers?.gift || false);
        this.setNestedValue('floatingPhotos.triggers.giftScale', config.floatingPhotos?.triggers?.giftScale || 1.0);
        
        // Color Palette
        if (config.floatingPhotos?.colorPalette && Array.isArray(config.floatingPhotos.colorPalette)) {
            this.renderColorPalette(config.floatingPhotos.colorPalette);
        } else {
            this.renderColorPalette([]);
        }

        // Gift Floating Photos
        this.setNestedValue('giftFloatingPhotos.enabled', config.giftFloatingPhotos?.enabled);
        const giftFloatingPhotosMode = config.giftFloatingPhotos?.selectionMode || 'manual';
        this.setNestedValue('giftFloatingPhotos.selectionMode', giftFloatingPhotosMode);
        this.toggleGiftSelectionMode('giftFloatingPhotos', giftFloatingPhotosMode);
        this.setGiftSelectValues('giftFloatingPhotosGifts', config.giftFloatingPhotos?.gifts);
        this.setNestedValue('giftFloatingPhotos.coinMin', config.giftFloatingPhotos?.coinMin);
        this.setNestedValue('giftFloatingPhotos.coinMax', config.giftFloatingPhotos?.coinMax);

        // Gift Firework
        this.setNestedValue('giftFirework.enabled', config.giftFirework?.enabled);
        const fireworkMode = config.giftFirework?.selectionMode || 'manual';
        this.setNestedValue('giftFirework.selectionMode', fireworkMode);
        this.toggleGiftSelectionMode('giftFirework', fireworkMode);
        this.setGiftSelectValues('giftFireworkGifts', config.giftFirework?.gifts);
        this.setNestedValue('giftFirework.coinMin', config.giftFirework?.coinMin);
        this.setNestedValue('giftFirework.coinMax', config.giftFirework?.coinMax);
        this.setNestedValue('giftFirework.count', config.giftFirework?.count);
        this.setNestedValue('giftFirework.centerX', config.giftFirework?.centerX);
        this.setNestedValue('giftFirework.centerY', config.giftFirework?.centerY);
        this.setNestedValue('giftFirework.fadeOutDuration', config.giftFirework?.fadeOutDuration);
        this.setNestedValue('giftFirework.initialScale', config.giftFirework?.initialScale);
        this.setNestedValue('giftFirework.scaleDuration', config.giftFirework?.scaleDuration);

        // Gift Jedag Jedug
        this.setNestedValue('giftJedagJedug.enabled', config.giftJedagJedug?.enabled);
        const jedagJedugMode = config.giftJedagJedug?.selectionMode || 'manual';
        this.setNestedValue('giftJedagJedug.selectionMode', jedagJedugMode);
        this.toggleGiftSelectionMode('giftJedagJedug', jedagJedugMode);
        this.setGiftSelectValues('giftJedagJedugGifts', config.giftJedagJedug?.gifts);
        this.setNestedValue('giftJedagJedug.coinMin', config.giftJedagJedug?.coinMin);
        this.setNestedValue('giftJedagJedug.coinMax', config.giftJedagJedug?.coinMax);
        this.setNestedValue('giftJedagJedug.duration', config.giftJedagJedug?.duration);
        this.setNestedValue('giftJedagJedug.volume', config.giftJedagJedug?.volume);
        this.setNestedValue('giftJedagJedug.centerX', config.giftJedagJedug?.centerX);
        this.setNestedValue('giftJedagJedug.centerY', config.giftJedagJedug?.centerY);
        
        // Set music path - ensure music select is populated first
        if (this.musicData && this.musicData.length > 0) {
            // Populate music select first, then set value
            this.populateMusicSelect().then(() => {
                this.setNestedValue('giftJedagJedug.musicPath', config.giftJedagJedug?.musicPath);
            }).catch(() => {
                // Fallback: try to set value anyway
                this.setNestedValue('giftJedagJedug.musicPath', config.giftJedagJedug?.musicPath);
            });
        } else {
            // If music data not loaded yet, try to set value anyway (might be custom path)
            this.setNestedValue('giftJedagJedug.musicPath', config.giftJedagJedug?.musicPath);
        }
        
        // Disco configuration
        this.setNestedValue('giftJedagJedug.disco.enabled', config.giftJedagJedug?.disco?.enabled);
        this.setNestedValue('giftJedagJedug.disco.baseOpacity', config.giftJedagJedug?.disco?.baseOpacity);
        this.setNestedValue('giftJedagJedug.disco.strobeOpacity', config.giftJedagJedug?.disco?.strobeOpacity);
        this.setNestedValue('giftJedagJedug.disco.pulseMin', config.giftJedagJedug?.disco?.pulseMin);
        this.setNestedValue('giftJedagJedug.disco.pulseMax', config.giftJedagJedug?.disco?.pulseMax);
        this.setNestedValue('giftJedagJedug.disco.colorSpeed', config.giftJedagJedug?.disco?.colorSpeed);
        this.setNestedValue('giftJedagJedug.disco.strobeSpeed', config.giftJedagJedug?.disco?.strobeSpeed);
    }

    setNestedValue(path, value) {
        const input = document.querySelector(`[name="${path}"]`);
        if (!input) return;

        if (input.type === 'checkbox') {
            input.checked = value === true;
        } else if (input.type === 'radio') {
            // Handle radio button
            const radio = document.querySelector(`[name="${path}"][value="${value}"]`);
            if (radio) {
                radio.checked = true;
                // Trigger change event untuk mode selection
                if (path.includes('.selectionMode')) {
                    const prefix = path.split('.')[0];
                    this.toggleGiftSelectionMode(prefix, value);
                }
            }
        } else if (input.tagName === 'SELECT') {
            // Handle select element
            if (value !== null && value !== undefined && value !== '') {
                // Check if option exists
                const optionExists = Array.from(input.options).some(opt => opt.value === value);
                if (!optionExists) {
                    // Add option if it doesn't exist (for custom paths)
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = value;
                    input.appendChild(option);
                }
                input.value = value;
            } else {
                input.selectedIndex = 0; // Select first option as default
            }
        } else {
            // Handle null values - set to empty string for number inputs
            input.value = value !== null && value !== undefined ? value : '';
        }
    }

    getNestedValue(path) {
        const input = document.querySelector(`[name="${path}"]`);
        if (!input) return undefined;

        if (input.type === 'checkbox') {
            return input.checked;
        } else if (input.type === 'number') {
            return input.value ? Number(input.value) : undefined;
        } else if (input.tagName === 'SELECT' && input.multiple) {
            // Handle multiple select
            const selectedOptions = Array.from(input.selectedOptions);
            return selectedOptions.map(option => option.value);
        } else {
            return input.value || undefined;
        }
    }

    getNestedValueOrNull(path) {
        const input = document.querySelector(`[name="${path}"]`);
        if (!input) return null;

        if (input.type === 'number') {
            // Return null if empty, otherwise return number
            return input.value && input.value.trim() !== '' ? Number(input.value) : null;
        } else {
            // Return null if empty, otherwise return value
            return input.value && input.value.trim() !== '' ? input.value : null;
        }
    }

    setGiftSelectValues(selectId, gifts) {
        // Extract prefix from selectId (e.g., 'giftFloatingPhotosGifts' -> 'giftFloatingPhotos')
        const prefix = selectId.replace('Gifts', '');
        
        // Pastikan dropdown sudah diisi dengan opsi
        if (!this.giftsData) {
            return;
        }

        // Convert to array if string
        const giftsArray = gifts ? (Array.isArray(gifts) ? gifts : 
                          (typeof gifts === 'string' ? gifts.split(',').map(g => g.trim()) : [])) : [];

        // Update checkboxes
        const checkboxes = document.querySelectorAll(`#${prefix}List input[type="checkbox"]`);
        checkboxes.forEach(checkbox => {
            checkbox.checked = giftsArray.includes(checkbox.value);
        });

        // Update dropdown selection (this will update badge and trigger text)
        this.updateDropdownSelection(prefix);
    }

    validateForm() {
        // Validasi range coin untuk Floating Photos
        const floatingPhotosMode = this.getNestedValue('giftFloatingPhotos.selectionMode') || 'manual';
        if (floatingPhotosMode === 'coinRange') {
            const coinMin = this.getNestedValueOrNull('giftFloatingPhotos.coinMin');
            const coinMax = this.getNestedValueOrNull('giftFloatingPhotos.coinMax');
            if (coinMin !== null && coinMax !== null && coinMin > coinMax) {
                return {
                    valid: false,
                    message: 'Min coin Floating Photos tidak boleh lebih besar dari Max coin'
                };
            }
        }

        // Validasi range coin untuk Firework
        const fireworkMode = this.getNestedValue('giftFirework.selectionMode') || 'manual';
        if (fireworkMode === 'coinRange') {
            const coinMin = this.getNestedValueOrNull('giftFirework.coinMin');
            const coinMax = this.getNestedValueOrNull('giftFirework.coinMax');
            if (coinMin !== null && coinMax !== null && coinMin > coinMax) {
                return {
                    valid: false,
                    message: 'Min coin Firework tidak boleh lebih besar dari Max coin'
                };
            }
        }

        // Validasi range coin untuk Jedag Jedug
        const jedagJedugMode = this.getNestedValue('giftJedagJedug.selectionMode') || 'manual';
        if (jedagJedugMode === 'coinRange') {
            const coinMin = this.getNestedValueOrNull('giftJedagJedug.coinMin');
            const coinMax = this.getNestedValueOrNull('giftJedagJedug.coinMax');
            if (coinMin !== null && coinMax !== null && coinMin > coinMax) {
                return {
                    valid: false,
                    message: 'Min coin Jedag Jedug tidak boleh lebih besar dari Max coin'
                };
            }
        }

        return { valid: true };
    }

    buildConfig() {
        const config = {
            features: {
                followerAlert: this.getNestedValue('features.followerAlert'),
                giftAlert: this.getNestedValue('features.giftAlert'),
                chatOverlay: this.getNestedValue('features.chatOverlay'),
                streamTimer: this.getNestedValue('features.streamTimer'),
                viewerCount: this.getNestedValue('features.viewerCount'),
                customBanner: this.getNestedValue('features.customBanner'),
                floatingPhotos: this.getNestedValue('features.floatingPhotos'),
                animations: this.getNestedValue('features.animations'),
                tiktokConnector: this.getNestedValue('features.tiktokConnector'),
                webhookConnection: this.getNestedValue('features.webhookConnection')
            },
            alerts: {
                follower: {
                    enabled: this.getNestedValue('alerts.follower.enabled'),
                    duration: this.getNestedValue('alerts.follower.duration'),
                    position: {
                        top: this.getNestedValue('alerts.follower.position.top'),
                        right: this.getNestedValue('alerts.follower.position.right')
                    }
                },
                gift: {
                    enabled: this.getNestedValue('alerts.gift.enabled'),
                    duration: this.getNestedValue('alerts.gift.duration'),
                    position: {
                        top: this.getNestedValue('alerts.gift.position.top'),
                        right: this.getNestedValue('alerts.gift.position.right')
                    }
                }
            },
            chat: {
                enabled: this.getNestedValue('chat.enabled'),
                maxMessages: this.getNestedValue('chat.maxMessages'),
                position: {
                    bottom: this.getNestedValue('chat.position.bottom'),
                    left: this.getNestedValue('chat.position.left')
                },
                width: this.getNestedValue('chat.width'),
                maxHeight: this.getNestedValue('chat.maxHeight')
            },
            widgets: {
                streamStatus: {
                    enabled: this.getNestedValue('widgets.streamStatus.enabled'),
                    label: this.getNestedValue('widgets.streamStatus.label'),
                    defaultValue: this.getNestedValue('widgets.streamStatus.defaultValue')
                },
                streamTimer: {
                    enabled: this.getNestedValue('widgets.streamTimer.enabled'),
                    position: {
                        top: this.getNestedValue('widgets.streamTimer.position.top'),
                        left: this.getNestedValue('widgets.streamTimer.position.left')
                    }
                },
                viewerCount: {
                    enabled: this.getNestedValue('widgets.viewerCount.enabled'),
                    showInChat: this.getNestedValue('widgets.viewerCount.showInChat')
                }
            },
            theme: {
                primary: {
                    gradient: this.getNestedValue('theme.primary.gradient'),
                    solid: this.getNestedValue('theme.primary.solid')
                },
                secondary: {
                    gradient: this.getNestedValue('theme.secondary.gradient'),
                    solid: this.getNestedValue('theme.secondary.solid')
                },
                background: this.getNestedValue('theme.background'),
                text: this.getNestedValue('theme.text')
            },
            api: {
                enabled: this.getNestedValue('api.enabled'),
                endpoint: this.getNestedValue('api.endpoint'),
                apiKey: this.getNestedValue('api.apiKey'),
                pollInterval: this.getNestedValue('api.pollInterval')
            },
            floatingPhotos: {
                randomColor: this.getNestedValue('floatingPhotos.randomColor'),
                colorPalette: this.getColorPaletteFromForm(),
                maxPhotos: this.getNestedValue('floatingPhotos.maxPhotos'),
                scale: this.getNestedValue('floatingPhotos.scale') || 1.0,
                triggers: {
                    chat: this.getNestedValue('floatingPhotos.triggers.chat') || false,
                    chatScale: this.getNestedValue('floatingPhotos.triggers.chatScale') || 1.0,
                    follow: this.getNestedValue('floatingPhotos.triggers.follow') || false,
                    followScale: this.getNestedValue('floatingPhotos.triggers.followScale') || 1.0,
                    share: this.getNestedValue('floatingPhotos.triggers.share') || false,
                    shareScale: this.getNestedValue('floatingPhotos.triggers.shareScale') || 1.0,
                    gift: this.getNestedValue('floatingPhotos.triggers.gift') || false,
                    giftScale: this.getNestedValue('floatingPhotos.triggers.giftScale') || 1.0
                }
            },
            giftFloatingPhotos: {
                enabled: this.getNestedValue('giftFloatingPhotos.enabled'),
                selectionMode: this.getNestedValue('giftFloatingPhotos.selectionMode') || 'manual',
                gifts: this.getGiftFloatingPhotosGifts(),
                coinMin: this.getNestedValueOrNull('giftFloatingPhotos.coinMin'),
                coinMax: this.getNestedValueOrNull('giftFloatingPhotos.coinMax')
            },
            giftFirework: {
                enabled: this.getNestedValue('giftFirework.enabled'),
                selectionMode: this.getNestedValue('giftFirework.selectionMode') || 'manual',
                gifts: this.getGiftFireworkGifts(),
                coinMin: this.getNestedValueOrNull('giftFirework.coinMin'),
                coinMax: this.getNestedValueOrNull('giftFirework.coinMax'),
                count: this.getNestedValue('giftFirework.count'),
                centerX: this.getNestedValue('giftFirework.centerX'),
                centerY: this.getNestedValue('giftFirework.centerY'),
                fadeOutDuration: this.getNestedValue('giftFirework.fadeOutDuration'),
                initialScale: this.getNestedValue('giftFirework.initialScale'),
                scaleDuration: this.getNestedValue('giftFirework.scaleDuration')
            },
            giftJedagJedug: {
                enabled: this.getNestedValue('giftJedagJedug.enabled'),
                selectionMode: this.getNestedValue('giftJedagJedug.selectionMode') || 'manual',
                gifts: this.getGiftJedagJedugGifts(),
                coinMin: this.getNestedValueOrNull('giftJedagJedug.coinMin'),
                coinMax: this.getNestedValueOrNull('giftJedagJedug.coinMax'),
                duration: this.getNestedValue('giftJedagJedug.duration'),
                volume: this.getNestedValue('giftJedagJedug.volume'),
                centerX: this.getNestedValueOrNull('giftJedagJedug.centerX'),
                centerY: this.getNestedValueOrNull('giftJedagJedug.centerY'),
                musicPath: this.getNestedValue('giftJedagJedug.musicPath'),
                disco: {
                    enabled: this.getNestedValue('giftJedagJedug.disco.enabled'),
                    baseOpacity: this.getNestedValue('giftJedagJedug.disco.baseOpacity'),
                    strobeOpacity: this.getNestedValue('giftJedagJedug.disco.strobeOpacity'),
                    pulseMin: this.getNestedValue('giftJedagJedug.disco.pulseMin'),
                    pulseMax: this.getNestedValue('giftJedagJedug.disco.pulseMax'),
                    colorSpeed: this.getNestedValue('giftJedagJedug.disco.colorSpeed'),
                    strobeSpeed: this.getNestedValue('giftJedagJedug.disco.strobeSpeed')
                }
            }
        };

        return this.cleanObject(config);
    }

    getGiftFloatingPhotosGifts() {
        const gifts = this.getNestedValue('giftFloatingPhotos.gifts');
        if (!gifts) {
            return undefined;
        }
        
        // If it's already an array (from select multiple), return it
        if (Array.isArray(gifts)) {
            return gifts.length > 0 ? gifts : undefined;
        }
        
        // Fallback for string input (backward compatibility)
        if (typeof gifts === 'string') {
            const giftArray = gifts.split(',')
                .map(gift => gift.trim())
                .filter(gift => gift.length > 0);
            return giftArray.length > 0 ? giftArray : undefined;
        }
        
        return undefined;
    }

    getGiftJedagJedugGifts() {
        const gifts = this.getNestedValue('giftJedagJedug.gifts');
        if (!gifts) {
            return undefined;
        }
        
        // If it's already an array (from select multiple), return it
        if (Array.isArray(gifts)) {
            // Return empty array if no gifts selected (to trigger all gifts)
            return gifts.length > 0 ? gifts : [];
        }
        
        // Fallback for string input (backward compatibility)
        if (typeof gifts === 'string') {
            const giftArray = gifts.split(',')
                .map(gift => gift.trim())
                .filter(gift => gift.length > 0);
            return giftArray.length > 0 ? giftArray : [];
        }
        
        return [];
    }

    getGiftFireworkGifts() {
        const gifts = this.getNestedValue('giftFirework.gifts');
        if (!gifts) {
            return undefined;
        }
        
        // If it's already an array (from select multiple), return it
        if (Array.isArray(gifts)) {
            return gifts.length > 0 ? gifts : undefined;
        }
        
        // Fallback for string input (backward compatibility)
        if (typeof gifts === 'string') {
            const giftArray = gifts.split(',')
                .map(gift => gift.trim())
                .filter(gift => gift.length > 0);
            return giftArray.length > 0 ? giftArray : undefined;
        }
        
        return undefined;
    }

    cleanObject(obj) {
        if (Array.isArray(obj)) {
            return obj.map(item => this.cleanObject(item));
        } else if (obj !== null && typeof obj === 'object') {
            const cleaned = {};
            for (const key in obj) {
                const value = this.cleanObject(obj[key]);
                if (value !== undefined) {
                    cleaned[key] = value;
                }
            }
            return cleaned;
        }
        return obj;
    }

    getColorPaletteFromForm() {
        const palette = [];
        const items = document.querySelectorAll('.color-palette-item');
        
        items.forEach(item => {
            const nameInput = item.querySelector('.color-name');
            const primaryInput = item.querySelector('.color-primary');
            const secondaryInput = item.querySelector('.color-secondary');
            
            const name = nameInput?.value?.trim() || '';
            const primary = primaryInput?.value || '';
            const secondary = secondaryInput?.value || '';
            
            if (name && primary && secondary) {
                palette.push({ name, primary, secondary });
            }
        });
        
        return palette.length > 0 ? palette : undefined;
    }

    renderColorPalette(palette) {
        const container = document.getElementById('colorPaletteContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        palette.forEach((color, index) => {
            this.addColorPaletteItem(color, index);
        });
    }

    addColorPaletteItem(color = null, index = null) {
        const container = document.getElementById('colorPaletteContainer');
        if (!container) return;
        
        const item = document.createElement('div');
        item.className = 'color-palette-item';
        
        item.innerHTML = `
            <div class="form-group">
                <label>Nama Warna</label>
                <input type="text" class="color-name" value="${color?.name || ''}" placeholder="Purple">
            </div>
            <div class="form-group">
                <label>Primary Color</label>
                <input type="color" class="color-primary" value="${color?.primary || '#667eea'}">
            </div>
            <div class="form-group">
                <label>Secondary Color</label>
                <input type="color" class="color-secondary" value="${color?.secondary || '#764ba2'}">
            </div>
            <button type="button" class="btn btn-danger btn-small remove-color">Hapus</button>
        `;
        
        container.appendChild(item);
        
        // Remove button handler
        item.querySelector('.remove-color').addEventListener('click', () => {
            item.remove();
        });
    }

    setupModeSelectionHandlers() {
        // Setup handler untuk Floating Photos mode selection
        const floatingPhotosModeRadios = document.querySelectorAll('input[name="giftFloatingPhotos.selectionMode"]');
        floatingPhotosModeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.toggleGiftSelectionMode('giftFloatingPhotos', radio.value);
            });
        });

        // Setup handler untuk Firework mode selection
        const fireworkModeRadios = document.querySelectorAll('input[name="giftFirework.selectionMode"]');
        fireworkModeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.toggleGiftSelectionMode('giftFirework', radio.value);
            });
        });

        // Setup handler untuk Jedag Jedug mode selection
        const jedagJedugModeRadios = document.querySelectorAll('input[name="giftJedagJedug.selectionMode"]');
        jedagJedugModeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.toggleGiftSelectionMode('giftJedagJedug', radio.value);
            });
        });

        // Setup validasi range coin untuk Floating Photos
        const floatingPhotosCoinMin = document.getElementById('giftFloatingPhotosCoinMin');
        const floatingPhotosCoinMax = document.getElementById('giftFloatingPhotosCoinMax');
        if (floatingPhotosCoinMin && floatingPhotosCoinMax) {
            floatingPhotosCoinMin.addEventListener('input', () => {
                this.validateCoinRange('giftFloatingPhotos');
            });
            floatingPhotosCoinMax.addEventListener('input', () => {
                this.validateCoinRange('giftFloatingPhotos');
            });
        }

        // Setup validasi range coin untuk Firework
        const fireworkCoinMin = document.getElementById('giftFireworkCoinMin');
        const fireworkCoinMax = document.getElementById('giftFireworkCoinMax');
        if (fireworkCoinMin && fireworkCoinMax) {
            fireworkCoinMin.addEventListener('input', () => {
                this.validateCoinRange('giftFirework');
            });
            fireworkCoinMax.addEventListener('input', () => {
                this.validateCoinRange('giftFirework');
            });
        }

        // Setup validasi range coin untuk Jedag Jedug
        const jedagJedugCoinMin = document.getElementById('giftJedagJedugCoinMin');
        const jedagJedugCoinMax = document.getElementById('giftJedagJedugCoinMax');
        if (jedagJedugCoinMin && jedagJedugCoinMax) {
            jedagJedugCoinMin.addEventListener('input', () => {
                this.validateCoinRange('giftJedagJedug');
            });
            jedagJedugCoinMax.addEventListener('input', () => {
                this.validateCoinRange('giftJedagJedug');
            });
        }

        // Setup handler untuk tombol sync durasi jedag jedug dengan durasi lagu
        const syncJedagJedugDurationBtn = document.getElementById('syncJedagJedugDuration');
        if (syncJedagJedugDurationBtn) {
            syncJedagJedugDurationBtn.addEventListener('click', () => {
                this.syncJedagJedugDurationWithMusic();
            });
        }
    }

    syncJedagJedugDurationWithMusic() {
        const musicSelect = document.getElementById('giftJedagJedugMusicPath');
        const durationInput = document.getElementById('giftJedagJedugDuration');
        
        if (!musicSelect || !durationInput) return;
        
        const selectedOption = musicSelect.options[musicSelect.selectedIndex];
        const musicDuration = selectedOption ? selectedOption.getAttribute('data-duration') : null;
        
        if (!musicDuration) {
            // Tampilkan notifikasi jika durasi lagu tidak tersedia
            if (window.Notification && typeof window.Notification.show === 'function') {
                window.Notification.show('Durasi lagu tidak tersedia. Pastikan lagu yang dipilih memiliki data durasi.', 'warning');
            } else {
                alert('Durasi lagu tidak tersedia. Pastikan lagu yang dipilih memiliki data durasi.');
            }
            return;
        }
        
        const duration = parseInt(musicDuration);
        if (isNaN(duration) || duration < 1000 || duration > 30000) {
            if (window.Notification && typeof window.Notification.show === 'function') {
                window.Notification.show('Durasi lagu tidak valid. Harus antara 1000-30000ms.', 'warning');
            } else {
                alert('Durasi lagu tidak valid. Harus antara 1000-30000ms.');
            }
            return;
        }
        
        // Set durasi efek sesuai dengan durasi lagu
        durationInput.value = duration;
        
        // Trigger change event untuk memastikan form handler mengetahui perubahan
        durationInput.dispatchEvent(new Event('input', { bubbles: true }));
        durationInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Tampilkan notifikasi sukses
        if (window.Notification && typeof window.Notification.show === 'function') {
            window.Notification.show(`Durasi efek telah disesuaikan dengan durasi lagu: ${duration}ms`, 'success');
        }
    }

    validateCoinRange(prefix) {
        const coinMinInput = document.getElementById(`${prefix}CoinMin`);
        const coinMaxInput = document.getElementById(`${prefix}CoinMax`);
        
        if (!coinMinInput || !coinMaxInput) return;

        const coinMin = coinMinInput.value ? parseInt(coinMinInput.value) : null;
        const coinMax = coinMaxInput.value ? parseInt(coinMaxInput.value) : null;

        // Reset previous validation
        coinMinInput.style.borderColor = '';
        coinMaxInput.style.borderColor = '';
        
        const errorMsg = coinMinInput.parentElement.querySelector('.range-error');
        if (errorMsg) {
            errorMsg.remove();
        }

        // Validasi: min tidak boleh lebih besar dari max
        if (coinMin !== null && coinMax !== null && coinMin > coinMax) {
            coinMinInput.style.borderColor = '#dc3545';
            coinMaxInput.style.borderColor = '#dc3545';
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'range-error';
            errorDiv.style.color = '#dc3545';
            errorDiv.style.fontSize = '12px';
            errorDiv.style.marginTop = '5px';
            errorDiv.textContent = 'Min coin tidak boleh lebih besar dari Max coin';
            coinMinInput.parentElement.appendChild(errorDiv);
        }
    }

    toggleGiftSelectionMode(prefix, mode) {
        const giftsGroup = document.getElementById(`${prefix}GiftsGroup`);
        const coinRangeGroup = document.getElementById(`${prefix}CoinRangeGroup`);
        
        if (mode === 'coinRange') {
            if (giftsGroup) giftsGroup.style.display = 'none';
            if (coinRangeGroup) coinRangeGroup.style.display = 'block';
        } else {
            if (giftsGroup) giftsGroup.style.display = 'block';
            if (coinRangeGroup) coinRangeGroup.style.display = 'none';
        }
        
        // Clear validation errors saat mode berubah
        const coinMinInput = document.getElementById(`${prefix}CoinMin`);
        const coinMaxInput = document.getElementById(`${prefix}CoinMax`);
        if (coinMinInput) coinMinInput.style.borderColor = '';
        if (coinMaxInput) coinMaxInput.style.borderColor = '';
        const errorMsg = coinMinInput?.parentElement.querySelector('.range-error');
        if (errorMsg) errorMsg.remove();
    }

    reset() {
        if (this.currentConfig) {
            this.populateForm(this.currentConfig);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigForm;
}

