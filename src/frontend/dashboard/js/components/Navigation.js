// Navigation Component
class Navigation {
    constructor() {
        this.navLinks = null;
        this.sections = null;
    }

    init() {
        this.navLinks = document.querySelectorAll('.nav-link');
        this.sections = document.querySelectorAll('.config-section');
        this.setupEventListeners();
        this.setupMobileMenu();
        
        // Check initial active section and hide form-actions if needed
        const activeSection = document.querySelector('.config-section.active');
        if (activeSection) {
            const sectionId = activeSection.id;
            const formActions = document.querySelector('.form-actions');
            if (formActions && (sectionId === 'contact-developer' || sectionId === 'dashboard-setting')) {
                formActions.style.display = 'none';
            }
        }
    }

    setupMobileMenu() {
        const hamburgerBtn = document.getElementById('hamburger-menu-btn');
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        
        if (!hamburgerBtn || !sidebar) return;

        // Toggle sidebar on hamburger click
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSidebar();
        });

        // Close sidebar when clicking overlay
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                this.closeSidebar();
            });
        }

        // Close sidebar when clicking nav link (mobile)
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    this.closeSidebar();
                }
            });
        });
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const hamburgerBtn = document.getElementById('hamburger-menu-btn');
        
        if (!sidebar) return;

        const isOpen = sidebar.classList.contains('open');
        
        if (isOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const hamburgerBtn = document.getElementById('hamburger-menu-btn');
        
        if (sidebar) {
            sidebar.classList.add('open');
        }
        if (sidebarOverlay) {
            sidebarOverlay.classList.add('show');
        }
        if (hamburgerBtn) {
            hamburgerBtn.classList.add('active');
        }
        // Prevent body scroll when sidebar is open
        document.body.style.overflow = 'hidden';
    }

    closeSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const hamburgerBtn = document.getElementById('hamburger-menu-btn');
        
        if (sidebar) {
            sidebar.classList.remove('open');
        }
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('show');
        }
        if (hamburgerBtn) {
            hamburgerBtn.classList.remove('active');
        }
        // Restore body scroll
        document.body.style.overflow = '';
    }

    setupEventListeners() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = link.getAttribute('data-section');
                this.navigateTo(targetSection);
            });
        });
    }

    navigateTo(sectionId) {
        // Update active nav link
        this.navLinks.forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Show target section
        this.sections.forEach(s => s.classList.remove('active'));
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Hide form-actions when contact-developer or dashboard-setting section is active
        const formActions = document.querySelector('.form-actions');
        if (formActions) {
            if (sectionId === 'contact-developer' || sectionId === 'dashboard-setting') {
                formActions.style.display = 'none';
            } else {
                formActions.style.display = 'flex';
            }
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Navigation;
}

