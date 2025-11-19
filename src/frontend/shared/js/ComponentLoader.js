// Component Loader - Load komponen HTML secara dinamis
class ComponentLoader {
    static async loadComponent(componentName, targetElement) {
        try {
            // Deteksi apakah kita di dashboard atau client berdasarkan path
            let componentPath = `/components/${componentName}.html`;
            const currentPath = window.location.pathname;
            
            // Jika di dashboard (control-room), gunakan path dashboard
            if (currentPath.includes('/control-room')) {
                componentPath = `/dashboard/components/${componentName}.html`;
            }
            
            const response = await fetch(componentPath);
            if (!response.ok) {
                throw new Error(`Failed to load component: ${componentName}`);
            }
            const html = await response.text();
            
            if (targetElement) {
                if (typeof targetElement === 'string') {
                    const element = document.querySelector(targetElement);
                    if (element) {
                        element.innerHTML = html;
                    } else {
                        console.error(`Target element not found: ${targetElement}`);
                    }
                } else {
                    targetElement.innerHTML = html;
                }
            }
            
            return html;
        } catch (error) {
            console.error(`Error loading component ${componentName}:`, error);
            throw error;
        }
    }

    static async loadComponents(components) {
        const promises = components.map(({ name, target }) => {
            return this.loadComponent(name, target);
        });
        return Promise.all(promises);
    }
}

// Export untuk digunakan di modul lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentLoader;
}

