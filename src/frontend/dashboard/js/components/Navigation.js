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

