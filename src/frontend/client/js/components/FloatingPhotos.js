// Floating Photos Component
class FloatingPhotos {
    constructor(config = {}) {
        this.config = config;
        this.container = document.getElementById('floating-photos-container');
        this.photos = [];
        this.maxPhotos = config.maxPhotos || 100;
        this.animationId = null;
        // Track posisi firework yang sedang aktif untuk menghindari overlap
        this.activeFireworkPositions = [];
        this.minFireworkDistance = 200; // Minimum jarak antar firework dalam pixel
    }

    init() {
        if (!this.container) return;
        this.animate();
    }

    addPhoto(imageUrl = null, emoji = null) {
        if (!this.container) return;
        
        const photo = document.createElement('div');
        photo.className = 'floating-photo';
        
        // Apply glow color
        const glowColors = this.getRandomGlowColor();
        this.applyGlowColor(photo, glowColors.primary, glowColors.secondary);
        
        // Set content
        if (imageUrl && imageUrl.trim() !== '') {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = 'Profile';
            
            img.onerror = () => {
                img.style.display = 'none';
                photo.textContent = emoji || '👤';
            };
            
            img.onload = () => {
                img.style.display = 'block';
            };
            
            photo.appendChild(img);
        } else if (emoji) {
            photo.textContent = emoji;
        } else {
            const emojis = ['👤', '😊', '🎉', '⭐', '💫'];
            photo.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        }
        
        // Set initial position
        const startX = Math.random() * (1920 - 80);
        const startY = Math.random() * (1080 - 80);
        photo.style.left = startX + 'px';
        photo.style.top = startY + 'px';
        
        // Set speed
        const speedX = (Math.random() - 0.5) * 2;
        const speedY = (Math.random() - 0.5) * 2;
        const speed = 0.5 + Math.random() * 1.5;
        
        this.container.appendChild(photo);
        
        const photoData = {
            element: photo,
            x: startX,
            y: startY,
            speedX: speedX * speed,
            speedY: speedY * speed
        };
        
        this.photos.push(photoData);
        
        // Remove old photos if too many
        if (this.photos.length > this.maxPhotos * 2) {
            const removed = this.photos.shift();
            removed.element.remove();
        }
    }

    // Generate random position yang tidak berdekatan dengan firework lain
    getRandomFireworkPosition() {
        let attempts = 0;
        const maxAttempts = 50;
        let x, y;
        
        do {
            // Generate random position dengan margin dari edge
            const margin = 100;
            x = margin + Math.random() * (1920 - margin * 2);
            y = margin + Math.random() * (1080 - margin * 2);
            attempts++;
            
            // Cek apakah posisi ini cukup jauh dari firework lain
            const isFarEnough = this.activeFireworkPositions.every(pos => {
                const distance = Math.sqrt(
                    Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2)
                );
                return distance >= this.minFireworkDistance;
            });
            
            if (isFarEnough || attempts >= maxAttempts) {
                break;
            }
        } while (attempts < maxAttempts);
        
        return { x, y };
    }

    // Firework effect - membuat banyak foto muncul dari satu titik seperti kembang api
    // Tanpa queue system, langsung execute dan gunakan random position jika tidak ada center
    addFirework(imageUrl = null, emoji = null, centerX = null, centerY = null, count = 20) {
        if (!this.container) return;
        
        // Ambil konfigurasi firework dari config
        const giftFireworkConfig = this.config?.giftFirework || {};
        const fadeOutDuration = giftFireworkConfig.fadeOutDuration || 5000;
        const initialScale = giftFireworkConfig.initialScale || 0.1;
        const scaleDuration = giftFireworkConfig.scaleDuration || 300;
        
        // Jika centerX dan centerY tidak diberikan, gunakan posisi random yang tidak berdekatan
        if (centerX === null || centerY === null) {
            const randomPos = this.getRandomFireworkPosition();
            centerX = centerX !== null ? centerX : randomPos.x;
            centerY = centerY !== null ? centerY : randomPos.y;
        }
        
        // Tambahkan posisi ke active firework positions
        const fireworkPosition = { x: centerX, y: centerY };
        this.activeFireworkPositions.push(fireworkPosition);
        
        // Hapus posisi setelah fade out duration + sedikit delay
        setTimeout(() => {
            const index = this.activeFireworkPositions.findIndex(
                pos => pos.x === fireworkPosition.x && pos.y === fireworkPosition.y
            );
            if (index !== -1) {
                this.activeFireworkPositions.splice(index, 1);
            }
        }, fadeOutDuration + 500);
        
        // Simpan reference ke firework photos untuk tracking
        const fireworkPhotos = [];
        
        // Buat banyak foto yang muncul dari titik pusat
        for (let i = 0; i < count; i++) {
            const photo = document.createElement('div');
            photo.className = 'floating-photo';
            
            // Apply glow color
            const glowColors = this.getRandomGlowColor();
            this.applyGlowColor(photo, glowColors.primary, glowColors.secondary);
            
            // Set content
            if (imageUrl && imageUrl.trim() !== '') {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = 'Profile';
                
                img.onerror = () => {
                    img.style.display = 'none';
                    photo.textContent = emoji || '🎉';
                };
                
                img.onload = () => {
                    img.style.display = 'block';
                };
                
                photo.appendChild(img);
            } else if (emoji) {
                photo.textContent = emoji;
            } else {
                const emojis = ['🎉', '⭐', '💫', '✨', '🌟'];
                photo.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            }
            
            // Set initial position di center
            photo.style.left = centerX + 'px';
            photo.style.top = centerY + 'px';
            
            // Set initial scale kecil untuk animasi
            photo.style.transform = `scale(${initialScale})`;
            photo.style.transformOrigin = 'center center';
            photo.style.opacity = '1';
            photo.style.transition = `transform ${scaleDuration}ms ease-out, opacity 500ms ease-out`;
            
            // Hitung sudut untuk distribusi melingkar
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const speed = 2 + Math.random() * 3; // Kecepatan lebih cepat untuk efek firework
            
            // Set speed berdasarkan sudut
            const speedX = Math.cos(angle) * speed;
            const speedY = Math.sin(angle) * speed;
            
            this.container.appendChild(photo);
            
            // Trigger animasi scale dari kecil ke normal setelah element ditambahkan ke DOM
            requestAnimationFrame(() => {
                photo.style.transform = 'scale(1)';
            });
            
            const photoData = {
                element: photo,
                x: centerX,
                y: centerY,
                speedX: speedX,
                speedY: speedY,
                isFirework: true, // Flag untuk membedakan firework dari photo biasa
                createdAt: Date.now() // Timestamp untuk tracking durasi
            };
            
            this.photos.push(photoData);
            fireworkPhotos.push(photoData);
            
            // Set timeout untuk fade out dan remove
            setTimeout(() => {
                photo.style.opacity = '0';
                setTimeout(() => {
                    // Remove dari array dan DOM
                    const index = this.photos.findIndex(p => p.element === photo);
                    if (index !== -1) {
                        this.photos.splice(index, 1);
                    }
                    if (photo.parentNode) {
                        photo.remove();
                    }
                }, 500); // Durasi fade out animation
            }, fadeOutDuration);
        }
        
        // Remove old photos if too many
        if (this.photos.length > this.maxPhotos * 2) {
            const removed = this.photos.shift();
            removed.element.remove();
        }
    }

    animate() {
        const animate = () => {
            this.photos.forEach(photo => {
                photo.x += photo.speedX;
                photo.y += photo.speedY;

                // Untuk firework, tidak perlu bounce dari walls karena akan dihapus setelah fade out
                if (!photo.isFirework) {
                    // Bounce from walls
                    if (photo.x <= 0 || photo.x >= 1920 - 80) {
                        photo.speedX = -photo.speedX;
                        photo.x = Math.max(0, Math.min(1920 - 80, photo.x));
                    }

                    if (photo.y <= 0 || photo.y >= 1080 - 80) {
                        photo.speedY = -photo.speedY;
                        photo.y = Math.max(0, Math.min(1080 - 80, photo.y));
                    }
                }

                photo.element.style.left = photo.x + 'px';
                photo.element.style.top = photo.y + 'px';
            });

            this.animationId = requestAnimationFrame(animate);
        };

        animate();
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    clear() {
        this.photos.forEach(photo => photo.element.remove());
        this.photos = [];
        // Clear active firework positions
        this.activeFireworkPositions = [];
    }

    getRandomGlowColor() {
        const floatingPhotosConfig = this.config?.floatingPhotos || {};
        const randomColor = floatingPhotosConfig.randomColor !== false;
        const colorPalette = floatingPhotosConfig.colorPalette || [];
        
        if (!randomColor || colorPalette.length === 0) {
            return {
                primary: '#667eea',
                secondary: '#764ba2'
            };
        }
        
        const randomIndex = Math.floor(Math.random() * colorPalette.length);
        const selectedColor = colorPalette[randomIndex];
        
        return {
            primary: selectedColor.primary || '#667eea',
            secondary: selectedColor.secondary || '#764ba2'
        };
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    applyGlowColor(element, primaryColor, secondaryColor) {
        const primaryRgb = this.hexToRgb(primaryColor);
        const secondaryRgb = this.hexToRgb(secondaryColor);
        
        if (!primaryRgb || !secondaryRgb) return;
        
        const primaryRgba1 = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.6)`;
        const primaryRgba2 = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.4)`;
        const primaryRgba3 = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3)`;
        const secondaryRgba1 = `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.2)`;
        
        const primaryRgbaHover1 = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.8)`;
        const primaryRgbaHover2 = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.6)`;
        const primaryRgbaHover3 = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.4)`;
        const secondaryRgbaHover1 = `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.3)`;
        
        element.style.setProperty('--glow-color-1', primaryRgba1);
        element.style.setProperty('--glow-color-2', primaryRgba2);
        element.style.setProperty('--glow-color-3', primaryRgba3);
        element.style.setProperty('--glow-color-4', secondaryRgba1);
        element.style.setProperty('--glow-hover-1', primaryRgbaHover1);
        element.style.setProperty('--glow-hover-2', primaryRgbaHover2);
        element.style.setProperty('--glow-hover-3', primaryRgbaHover3);
        element.style.setProperty('--glow-hover-4', secondaryRgbaHover1);
        
        element.style.background = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FloatingPhotos;
}

