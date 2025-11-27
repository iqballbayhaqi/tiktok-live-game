// Control Room Dashboard - JavaScript (Component-based)

// Global instances
let navigation = null;
let userSelector = null;
let configForm = null;
let tiktokConnector = null;
let addUserModal = null;
let deleteUserModal = null;

// Theme Management
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('dashboard-theme') || 'light';
        this.init();
    }

    init() {
        // Apply saved theme immediately (before DOM is ready)
        this.applyTheme(this.currentTheme);
    }

    applyTheme(theme) {
        const body = document.body;
        const themeIcon = document.getElementById('theme-icon');
        const themeText = document.getElementById('theme-text');
        
        if (theme === 'light') {
            body.classList.add('light-theme');
            body.classList.remove('dark-theme');
            if (themeIcon) {
                themeIcon.className = 'fas fa-sun';
            }
            if (themeText) {
                themeText.textContent = 'Light';
            }
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            if (themeIcon) {
                themeIcon.className = 'fas fa-moon';
            }
            if (themeText) {
                themeText.textContent = 'Dark';
            }
        }
        
        this.currentTheme = theme;
        localStorage.setItem('dashboard-theme', theme);
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            // Remove existing listeners by cloning
            const newToggle = themeToggle.cloneNode(true);
            themeToggle.parentNode.replaceChild(newToggle, themeToggle);
            
            newToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }
}

// Initialize theme manager immediately (before DOM ready)
let themeManager = new ThemeManager();

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load all HTML components
        await ComponentLoader.loadComponents([
            { name: 'Header', target: '#header-container' },
            { name: 'Notification', target: '#notification-container' },
            { name: 'Sidebar', target: '#sidebar-container' },
            { name: 'DashboardSettingSection', target: '#dashboard-setting-section-container' },
            { name: 'UserSelector', target: '#user-selector-container' },
            { name: 'FeaturesSection', target: '#features-section-container' },
            { name: 'AlertsSection', target: '#alerts-section-container' },
            { name: 'ChatSection', target: '#chat-section-container' },
            { name: 'WidgetsSection', target: '#widgets-section-container' },
            { name: 'ThemeSection', target: '#theme-section-container' },
            { name: 'FloatingPhotosSection', target: '#floating-photos-section-container' },
            { name: 'ContactDeveloperSection', target: '#contact-developer-section-container' },
            { name: 'ModalAddUser', target: '#add-user-modal-container' },
            { name: 'ModalDeleteUser', target: '#delete-user-modal-container' }
        ]);
        
        // Re-setup theme toggle after components loaded (with delay to ensure DOM is ready)
        if (themeManager) {
            setTimeout(() => {
                themeManager.setupThemeToggle();
            }, 200);
        }

        // Initialize components
        navigation = new Navigation();
        navigation.init();

        configForm = new ConfigForm();
        // Pastikan gift selects diisi setelah komponen dimuat
        setTimeout(() => {
            if (configForm && typeof configForm.populateGiftSelects === 'function') {
                configForm.populateGiftSelects();
            }
        }, 200);
        tiktokConnector = new TikTokConnector();

        userSelector = new UserSelector();
        userSelector.onUserChange = handleUserChange;
        await userSelector.loadUsers();

        addUserModal = new AddUserModal();
        addUserModal.onUserAdded = handleUserAdded;

        deleteUserModal = new DeleteUserModal();
        deleteUserModal.onUserDeleted = handleUserDeleted;

        setupFormHandlers();
        
        // Initialize tab navigation after components are loaded
        // Use a small delay to ensure DOM is ready
        setTimeout(() => {
            initTabNavigation();
            // Setup simulation handlers setelah komponen dimuat
            setupSimulationHandlers();
        }, 100);
    } catch (error) {
        console.error('Error initializing control room:', error);
        Notification.error('Gagal memuat dashboard: ' + error.message);
    }
});

// Handle user change
async function handleUserChange(username) {
    if (!tiktokConnector) {
        console.warn('TikTokConnector belum diinisialisasi, menunggu...');
        return;
    }
    
    tiktokConnector.setUsername(username);
    await loadConfig();
    userSelector.updateUserInfo();
    await tiktokConnector.loadState();
}

// Helper function untuk membuka link dengan Cordova InAppBrowser jika tersedia
function openOverlayLink(url) {
    console.log('🔗 Opening overlay link:', url);
    
    // Deteksi jika berjalan di dalam iframe
    const isInIframe = window.self !== window.top;
    
    // Deteksi jika aplikasi berjalan di Cordova (cek di window ini atau parent/top window)
    let cordovaObj = null;
    let topWindow = null;
    
    try {
        // Coba akses top window jika di iframe
        if (isInIframe) {
            topWindow = window.top;
            cordovaObj = topWindow.cordova || topWindow.PhoneGap;
            console.log('📦 Running in iframe, checking parent window for Cordova');
        } else {
            cordovaObj = window.cordova || window.PhoneGap;
        }
    } catch (e) {
        // Cross-origin error, tidak bisa akses parent
        console.warn('⚠️ Cannot access parent window (cross-origin):', e);
        cordovaObj = window.cordova || window.PhoneGap;
    }
    
    const isCordova = !!cordovaObj;
    
    if (isCordova) {
        console.log('📱 Cordova detected, using InAppBrowser');
        try {
            // Jika di iframe, gunakan top window untuk membuka InAppBrowser
            const targetWindow = isInIframe && topWindow ? topWindow : window;
            
            // Di Cordova, window.open() dengan URL http/https akan otomatis menggunakan InAppBrowser
            // jika plugin InAppBrowser terpasang
            const ref = targetWindow.open(url, '_blank', 'location=yes,zoom=no,toolbar=yes');
            if (ref) {
                console.log('✅ InAppBrowser opened');
                return;
            } else {
                console.warn('⚠️ window.open returned null, trying alternative method');
                // Alternatif: coba akses langsung jika tersedia
                if (cordovaObj && cordovaObj.InAppBrowser) {
                    cordovaObj.InAppBrowser.open(url, '_blank', 'location=yes,zoom=no,toolbar=yes');
                    return;
                }
            }
        } catch (error) {
            console.error('❌ Error opening InAppBrowser:', error);
            // Fallback: coba postMessage ke parent jika di iframe
            if (isInIframe) {
                try {
                    window.parent.postMessage({
                        type: 'openInAppBrowser',
                        url: url
                    }, '*');
                    console.log('📤 Sent postMessage to parent');
                    return;
                } catch (e) {
                    console.error('❌ Error sending postMessage:', e);
                }
            }
        }
    }
    
    // Fallback ke browser normal
    console.log('🌐 Using default browser');
    const targetWindow = isInIframe && topWindow ? topWindow : window;
    targetWindow.open(url, '_blank');
}

// Setup overlay link click handler
function setupOverlayLinkHandler(linkElement) {
    if (!linkElement) {
        console.warn('⚠️ Link element not found');
        return;
    }
    
    // Hapus event listener lama jika ada (dengan flag untuk mencegah duplikasi)
    if (linkElement._overlayLinkHandlerSetup) {
        console.log('ℹ️ Handler already setup for:', linkElement.id);
        return; // Sudah di-setup sebelumnya
    }
    
    // Hapus target="_blank" untuk mencegah browser default behavior
    linkElement.removeAttribute('target');
    
    // Buat handler function yang bisa di-remove jika perlu
    const clickHandler = function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const url = this.href || this.getAttribute('href');
        console.log('🖱️ Link clicked:', url, 'Element:', this.id);
        if (url && url !== '#' && url !== 'javascript:void(0)' && url.trim() !== '') {
            openOverlayLink(url);
        } else {
            console.warn('⚠️ Invalid URL:', url);
        }
        return false;
    };
    
    // Simpan handler untuk bisa di-remove nanti jika perlu
    linkElement._overlayLinkClickHandler = clickHandler;
    
    // Tambahkan event listener dengan capture untuk memastikan dijalankan lebih awal
    linkElement.addEventListener('click', clickHandler, true);
    
    // Juga tambahkan onclick sebagai backup
    linkElement.onclick = clickHandler;
    
    // Tandai sudah di-setup
    linkElement._overlayLinkHandlerSetup = true;
    console.log('✅ Overlay link handler setup for:', linkElement.id, 'URL:', linkElement.href);
}

// Copy link to clipboard
async function copyOverlayLink(url) {
    if (!url || url === '#' || url === 'javascript:void(0)' || url.trim() === '') {
        Notification.error('Link tidak valid untuk di-copy');
        return false;
    }
    
    try {
        // Coba menggunakan Clipboard API modern
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url);
            Notification.success('Link berhasil di-copy ke clipboard!');
            return true;
        } else {
            // Fallback untuk browser lama
            const textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (successful) {
                    Notification.success('Link berhasil di-copy ke clipboard!');
                    return true;
                } else {
                    throw new Error('Copy command failed');
                }
            } catch (err) {
                document.body.removeChild(textArea);
                throw err;
            }
        }
    } catch (error) {
        console.error('Error copying link:', error);
        Notification.error('Gagal menyalin link ke clipboard');
        return false;
    }
}

// Setup copy link button handler
function setupCopyLinkHandler(copyButtonId, linkElementId) {
    const copyButton = document.getElementById(copyButtonId);
    const linkElement = document.getElementById(linkElementId);
    
    if (!copyButton || !linkElement) {
        console.warn('⚠️ Copy button or link element not found:', copyButtonId, linkElementId);
        return;
    }
    
    // Hapus event listener lama jika ada
    if (copyButton._copyLinkHandlerSetup) {
        console.log('ℹ️ Copy handler already setup for:', copyButtonId);
        return;
    }
    
    const clickHandler = async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const url = linkElement.href || linkElement.getAttribute('href');
        console.log('📋 Copy button clicked:', url, 'Element:', copyButtonId);
        
        if (url && url !== '#' && url !== 'javascript:void(0)' && url.trim() !== '') {
            await copyOverlayLink(url);
        } else {
            Notification.error('Link belum tersedia. Pastikan user sudah dipilih dan live code sudah diatur.');
        }
        
        return false;
    };
    
    // Simpan handler
    copyButton._copyLinkClickHandler = clickHandler;
    
    // Tambahkan event listener
    copyButton.addEventListener('click', clickHandler);
    
    // Tandai sudah di-setup
    copyButton._copyLinkHandlerSetup = true;
    console.log('✅ Copy link handler setup for:', copyButtonId);
}

// Update overlay links in Gift Effect sections
function updateGiftEffectOverlayLinks(liveCode) {
    if (!liveCode) return;
    
    const baseUrl = window.location.origin;
    
    // Update Floating Photos overlay link
    const overlayLinkFloatingPhotos = document.getElementById('overlay-link-floating-photos');
    if (overlayLinkFloatingPhotos) {
        overlayLinkFloatingPhotos.href = `${baseUrl}/live/floating-photos/${liveCode}`;
        setupOverlayLinkHandler(overlayLinkFloatingPhotos);
        setupCopyLinkHandler('copy-link-floating-photos', 'overlay-link-floating-photos');
    }
    
    // Update Firework overlay link
    const overlayLinkFirework = document.getElementById('overlay-link-firework');
    if (overlayLinkFirework) {
        overlayLinkFirework.href = `${baseUrl}/live/firework/${liveCode}`;
        setupOverlayLinkHandler(overlayLinkFirework);
        setupCopyLinkHandler('copy-link-firework', 'overlay-link-firework');
    }
    
    // Update Jedag Jedug overlay link
    const overlayLinkJedagJedug = document.getElementById('overlay-link-jedagjedug');
    if (overlayLinkJedagJedug) {
        overlayLinkJedagJedug.href = `${baseUrl}/live/jedagjedug/${liveCode}`;
        setupOverlayLinkHandler(overlayLinkJedagJedug);
        setupCopyLinkHandler('copy-link-jedagjedug', 'overlay-link-jedagjedug');
    }
    
    // Update Puzzle Photo overlay link
    const overlayLinkPuzzlePhoto = document.getElementById('overlay-link-puzzle-photo');
    if (overlayLinkPuzzlePhoto) {
        overlayLinkPuzzlePhoto.href = `${baseUrl}/live/puzzle-photo/${liveCode}`;
        setupOverlayLinkHandler(overlayLinkPuzzlePhoto);
        setupCopyLinkHandler('copy-link-puzzle-photo', 'overlay-link-puzzle-photo');
    }
    
    // Update Chat overlay link
    const overlayLinkChat = document.getElementById('overlay-link-chat');
    if (overlayLinkChat) {
        overlayLinkChat.href = `${baseUrl}/live/chat/${liveCode}`;
        setupOverlayLinkHandler(overlayLinkChat);
        setupCopyLinkHandler('copy-link-chat', 'overlay-link-chat');
    }
    
    // Update Follower Alert overlay link
    const overlayLinkFollowerAlert = document.getElementById('overlay-link-follower-alert');
    if (overlayLinkFollowerAlert) {
        overlayLinkFollowerAlert.href = `${baseUrl}/live/follower-alert/${liveCode}`;
        setupOverlayLinkHandler(overlayLinkFollowerAlert);
        setupCopyLinkHandler('copy-link-follower-alert', 'overlay-link-follower-alert');
    }
    
    // Update Gift Alert overlay link
    const overlayLinkGiftAlert = document.getElementById('overlay-link-gift-alert');
    if (overlayLinkGiftAlert) {
        overlayLinkGiftAlert.href = `${baseUrl}/live/gift-alert/${liveCode}`;
        setupOverlayLinkHandler(overlayLinkGiftAlert);
        setupCopyLinkHandler('copy-link-gift-alert', 'overlay-link-gift-alert');
    }
}

// Handle user added
async function handleUserAdded(user) {
    await userSelector.loadUsers();
    userSelector.selectUser(user.username);
}

// Handle user deleted
async function handleUserDeleted(username) {
    await userSelector.loadUsers();
    const users = userSelector.getUsersList();
    if (users.length > 0) {
        userSelector.selectUser(users[0].username);
    } else {
        userSelector.hideUserInfo();
    }
}

// Load config from API
async function loadConfig() {
    const username = userSelector.getCurrentUser();
    if (!username) {
        Notification.info('Silakan pilih user terlebih dahulu');
        return;
    }
    
    try {
        Notification.info('Memuat konfigurasi...');
        // Tambahkan cache-busting parameter untuk memastikan selalu mengambil data terbaru
        const response = await fetch(`/api/users/${encodeURIComponent(username)}/config?t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        const data = await response.json();

        if (data.success) {
            configForm.populateForm(data.config);
            userSelector.updateUserInfo();
            Notification.success('Konfigurasi berhasil dimuat');
        } else {
            throw new Error(data.error || 'Gagal memuat konfigurasi');
        }
    } catch (error) {
        console.error('Error loading config:', error);
        Notification.error('Gagal memuat konfigurasi: ' + error.message);
    }
}

// Initialize tab navigation for Floating Photos
function initTabNavigation() {
    const floatingPhotosSection = document.getElementById('floating-photos');
    if (!floatingPhotosSection) {
        // Retry after a short delay if component not loaded yet
        setTimeout(initTabNavigation, 100);
        return;
    }

    // Check if already initialized to avoid duplicate listeners
    if (floatingPhotosSection.dataset.tabsInitialized === 'true') {
        return;
    }

    // Mark as initialized
    floatingPhotosSection.dataset.tabsInitialized = 'true';

    // Use event delegation for better reliability
    floatingPhotosSection.addEventListener('click', (e) => {
        // Check if clicked element is a tab button or inside a tab button
        const tabBtn = e.target.closest('.tab-btn');
        if (!tabBtn) return;

        e.preventDefault();
        e.stopPropagation();
        
        const targetTab = tabBtn.getAttribute('data-tab');
        if (!targetTab) return;

        // Remove active class from all buttons and contents
        const allTabBtns = floatingPhotosSection.querySelectorAll('.tab-btn');
        const allTabContents = floatingPhotosSection.querySelectorAll('.tab-content');
        
        allTabBtns.forEach(btn => btn.classList.remove('active'));
        allTabContents.forEach(content => content.classList.remove('active'));

        // Add active class to clicked button and corresponding content
        tabBtn.classList.add('active');
        const targetContent = document.getElementById(`tab-${targetTab}`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    });

    // Ensure active tab from HTML is properly set (puzzle-photo is default)
    const activeTabBtn = floatingPhotosSection.querySelector('.tab-btn.active');
    if (activeTabBtn) {
        const activeTabId = activeTabBtn.getAttribute('data-tab');
        if (activeTabId) {
            const activeTabContent = document.getElementById(`tab-${activeTabId}`);
            if (activeTabContent) {
                activeTabContent.classList.add('active');
            }
        }
    } else {
        // Fallback: if no active tab in HTML, use puzzle-photo as default
        const defaultTabBtn = floatingPhotosSection.querySelector('.tab-btn[data-tab="puzzle-photo"]');
        const defaultTabContent = document.getElementById('tab-puzzle-photo');
        if (defaultTabBtn && defaultTabContent) {
            defaultTabBtn.classList.add('active');
            defaultTabContent.classList.add('active');
        }
    }
}

// Setup form handlers
function setupFormHandlers() {
    const form = document.getElementById('config-form');
    const saveBtn = document.getElementById('saveBtn');
    const loadBtn = document.getElementById('loadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const addColorBtn = document.getElementById('addColorPalette');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveConfig();
    });

    loadBtn.addEventListener('click', () => {
        loadConfig();
    });

    resetBtn.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin me-reset form ke konfigurasi terakhir yang dimuat?')) {
            configForm.reset();
            Notification.info('Form telah di-reset');
        }
    });

    if (addColorBtn) {
        addColorBtn.addEventListener('click', () => {
            configForm.addColorPaletteItem();
        });
    }
}

// Setup simulation handlers
function setupSimulationHandlers(retryCount = 0) {
    const maxRetries = 10; // Maksimal 10 kali retry (sekitar 2 detik)
    
    // Setup handler untuk simulasi floating photo
    const simulateFloatingPhotoBtn = document.getElementById('simulateFloatingPhotoBtn');
    if (simulateFloatingPhotoBtn) {
        const newBtn = simulateFloatingPhotoBtn.cloneNode(true);
        simulateFloatingPhotoBtn.parentNode.replaceChild(newBtn, simulateFloatingPhotoBtn);
        newBtn.addEventListener('click', async () => {
            await simulateFloatingPhoto();
        });
    }
    
    // Setup handler untuk simulasi firework
    const simulateFireworkBtn = document.getElementById('simulateFireworkBtn');
    if (simulateFireworkBtn) {
        const newBtn = simulateFireworkBtn.cloneNode(true);
        simulateFireworkBtn.parentNode.replaceChild(newBtn, simulateFireworkBtn);
        newBtn.addEventListener('click', async () => {
            await simulateFirework();
        });
    }
    
    // Setup handler untuk simulasi jedag jedug
    const simulateJedagJedugBtn = document.getElementById('simulateJedagJedugBtn');
    if (simulateJedagJedugBtn) {
        const newBtn = simulateJedagJedugBtn.cloneNode(true);
        simulateJedagJedugBtn.parentNode.replaceChild(newBtn, simulateJedagJedugBtn);
        newBtn.addEventListener('click', async () => {
            await simulateJedagJedug();
        });
    }
    
    // Retry jika ada komponen yang belum dimuat
    if ((!simulateFloatingPhotoBtn || !simulateFireworkBtn || !simulateJedagJedugBtn) && retryCount < maxRetries) {
        setTimeout(() => {
            setupSimulationHandlers(retryCount + 1);
        }, 200);
    }
}

// Simulasi floating photo
async function simulateFloatingPhoto() {
    const username = userSelector.getCurrentUser();
    if (!username) {
        Notification.error('Silakan pilih user terlebih dahulu');
        return;
    }

    const emojiInput = document.getElementById('simulateFloatingPhotoEmoji');
    const imageUrlInput = document.getElementById('simulateFloatingPhotoImageUrl');
    const simulateBtn = document.getElementById('simulateFloatingPhotoBtn');

    const emoji = emojiInput ? emojiInput.value.trim() : '';
    const imageUrl = imageUrlInput ? imageUrlInput.value.trim() : '';

    console.log('imageUrl:', imageUrl);
    

    // Validasi: minimal harus ada emoji atau imageUrl
    if (!emoji && !imageUrl) {
        // Jika keduanya kosong, gunakan emoji default
        // Tidak perlu error, kita akan kirim dengan emoji null dan biarkan sistem handle
    }

    try {
        if (simulateBtn) {
            simulateBtn.disabled = true;
            simulateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
        }

        // Siapkan payload - selalu kirim minimal emoji jika tidak ada yang diisi
        const payload = {};
        if (imageUrl) {
            payload.imageUrl = imageUrl;
        }
        if (emoji) {
            payload.emoji = emoji;
        }
        // Jika keduanya kosong, kirim emoji default
        if (!imageUrl && !emoji) {
            payload.emoji = '🎉';
        }

        console.log('📤 Sending floating-photo simulation:', payload);

        // Kirim webhook ke server
        const response = await fetch(`/webhook/${encodeURIComponent(username)}/floating-photo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            Notification.success('Simulasi floating photo berhasil dikirim!');
        } else {
            throw new Error(data.error || 'Gagal mengirim simulasi');
        }
    } catch (error) {
        console.error('Error simulating floating photo:', error);
        Notification.error('Gagal mengirim simulasi: ' + error.message);
    } finally {
        if (simulateBtn) {
            simulateBtn.disabled = false;
            simulateBtn.innerHTML = '<i class="fas fa-rocket"></i> Summon Floating Photo';
        }
    }
}

// Simulasi firework
async function simulateFirework() {
    const username = userSelector.getCurrentUser();
    if (!username) {
        Notification.error('Silakan pilih user terlebih dahulu');
        return;
    }

    const emojiInput = document.getElementById('simulateFireworkEmoji');
    const imageUrlInput = document.getElementById('simulateFireworkImageUrl');
    const countInput = document.getElementById('simulateFireworkCount');
    const centerXInput = document.getElementById('simulateFireworkCenterX');
    const centerYInput = document.getElementById('simulateFireworkCenterY');
    const simulateBtn = document.getElementById('simulateFireworkBtn');

    const emoji = emojiInput ? emojiInput.value.trim() : '';
    const imageUrl = imageUrlInput ? imageUrlInput.value.trim() : '';
    const count = countInput ? parseInt(countInput.value) || 20 : 20;
    const centerX = centerXInput ? (centerXInput.value.trim() ? parseInt(centerXInput.value) : null) : null;
    const centerY = centerYInput ? (centerYInput.value.trim() ? parseInt(centerYInput.value) : null) : null;

    try {
        if (simulateBtn) {
            simulateBtn.disabled = true;
            simulateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
        }

        // Siapkan payload
        const payload = {};
        if (imageUrl) {
            payload.imageUrl = imageUrl;
        }
        if (emoji) {
            payload.emoji = emoji;
        }
        if (centerX !== null) {
            payload.centerX = centerX;
        }
        if (centerY !== null) {
            payload.centerY = centerY;
        }
        payload.count = count;

        console.log('📤 Sending firework simulation:', payload);

        // Kirim webhook ke server
        const response = await fetch(`/webhook/${encodeURIComponent(username)}/firework`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            Notification.success('Simulasi firework berhasil dikirim!');
        } else {
            throw new Error(data.error || 'Gagal mengirim simulasi');
        }
    } catch (error) {
        console.error('Error simulating firework:', error);
        Notification.error('Gagal mengirim simulasi: ' + error.message);
    } finally {
        if (simulateBtn) {
            simulateBtn.disabled = false;
            simulateBtn.innerHTML = '<i class="fas fa-rocket"></i> Summon Firework';
        }
    }
}

// Simulasi jedag jedug
async function simulateJedagJedug() {
    const username = userSelector.getCurrentUser();
    if (!username) {
        Notification.error('Silakan pilih user terlebih dahulu');
        return;
    }

    const imageUrlInput = document.getElementById('simulateJedagJedugImageUrl');
    const centerXInput = document.getElementById('simulateJedagJedugCenterX');
    const centerYInput = document.getElementById('simulateJedagJedugCenterY');
    const simulateBtn = document.getElementById('simulateJedagJedugBtn');

    const imageUrl = imageUrlInput ? imageUrlInput.value.trim() : '';
    const centerX = centerXInput ? (centerXInput.value.trim() ? parseInt(centerXInput.value) : null) : null;
    const centerY = centerYInput ? (centerYInput.value.trim() ? parseInt(centerYInput.value) : null) : null;

    try {
        if (simulateBtn) {
            simulateBtn.disabled = true;
            simulateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
        }

        // Siapkan payload
        const payload = {};
        if (imageUrl) {
            payload.imageUrl = imageUrl;
        }
        if (centerX !== null) {
            payload.centerX = centerX;
        }
        if (centerY !== null) {
            payload.centerY = centerY;
        }

        console.log('📤 Sending jedag-jedug simulation:', payload);

        // Kirim webhook ke server
        const response = await fetch(`/webhook/${encodeURIComponent(username)}/jedag-jedug`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            Notification.success('Simulasi jedag jedug berhasil dikirim!');
        } else {
            throw new Error(data.error || 'Gagal mengirim simulasi');
        }
    } catch (error) {
        console.error('Error simulating jedag jedug:', error);
        Notification.error('Gagal mengirim simulasi: ' + error.message);
    } finally {
        if (simulateBtn) {
            simulateBtn.disabled = false;
            simulateBtn.innerHTML = '<i class="fas fa-rocket"></i> Summon Jedag Jedug';
        }
    }
}

// Save config to API
async function saveConfig() {
    // Validasi form sebelum save
    if (configForm && typeof configForm.validateForm === 'function') {
        const validation = configForm.validateForm();
        if (!validation.valid) {
            Notification.error(validation.message);
            return;
        }
    }

    const username = userSelector.getCurrentUser();
    if (!username) {
        Notification.error('Silakan pilih user terlebih dahulu');
        return;
    }
    
    try {
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Menyimpan...';

        const config = configForm.buildConfig();
        
        const response = await fetch(`/api/users/${encodeURIComponent(username)}/config`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ config })
        });

        const data = await response.json();

        if (data.success) {
            configForm.currentConfig = config;
            Notification.success('Konfigurasi berhasil disimpan!');
        } else {
            throw new Error(data.error || 'Gagal menyimpan konfigurasi');
        }
    } catch (error) {
        console.error('Error saving config:', error);
        Notification.error('Gagal menyimpan konfigurasi: ' + error.message);
    } finally {
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Konfigurasi';
    }
}

