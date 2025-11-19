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
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Navigation;
}

