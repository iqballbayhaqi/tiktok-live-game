// Jedag Jedug Effect Component
class JedagJedug {
    constructor(config = {}) {
        this.config = config;
        this.container = document.body; // Container untuk efek jedag jedug
        this.currentEffect = null;
        this.audioElement = null;
        this.animationFrameId = null;
        this.queue = []; // Queue untuk efek jedag jedug
        this.isShowing = false; // Flag untuk menandai apakah sedang menampilkan efek
        this.currentTimeout = null; // Timeout untuk auto stop
        
        // Konfigurasi jedag jedug
        this.jedagJedugConfig = config.jedagJedug || {};
        this.duration = this.jedagJedugConfig.duration || 5000; // Default 5 detik
        const defaultMusicPath = '/assets/music/jedag-jedug.mp3';
        this.musicPath = this.jedagJedugConfig.musicPath || defaultMusicPath;
        
        // Konfigurasi disco
        this.discoConfig = this.jedagJedugConfig.disco || {};
        // Default true untuk backward compatibility (jika config tidak ada, disco aktif)
        // Jika config ada dan enabled = false, maka false
        // Jika config ada dan enabled = true atau undefined, maka true
        this.discoEnabled = !this.jedagJedugConfig.disco || (this.discoConfig.enabled !== false);
        this.discoBaseOpacity = this.discoConfig.baseOpacity !== undefined ? this.discoConfig.baseOpacity : 0.25;
        this.discoStrobeOpacity = this.discoConfig.strobeOpacity !== undefined ? this.discoConfig.strobeOpacity : 0.4;
        this.discoPulseMin = this.discoConfig.pulseMin !== undefined ? this.discoConfig.pulseMin : 0.15;
        this.discoPulseMax = this.discoConfig.pulseMax !== undefined ? this.discoConfig.pulseMax : 0.25;
        this.discoColorSpeed = this.discoConfig.colorSpeed !== undefined ? this.discoConfig.colorSpeed : 100;
        this.discoStrobeSpeed = this.discoConfig.strobeSpeed !== undefined ? this.discoConfig.strobeSpeed : 80;
        
        this.initAudio();
    }

    initAudio() {
        // Buat audio element jika belum ada
        if (!this.audioElement) {
            this.audioElement = document.createElement('audio');
            this.audioElement.preload = 'auto';
            this.audioElement.style.display = 'none';
            this.audioElement.volume = this.jedagJedugConfig.volume || 0.7;
            
            const source = document.createElement('source');
            source.src = this.musicPath;
            source.type = 'audio/mpeg';
            this.audioElement.appendChild(source);
            
            document.body.appendChild(this.audioElement);
        }
    }

    // Trigger jedag jedug effect dengan foto profile
    trigger(avatarUrl = null, centerX = null, centerY = null) {
        // Tambahkan ke queue
        this.queue.push({
            avatarUrl,
            centerX,
            centerY
        });
        
        // Jika tidak sedang menampilkan efek, tampilkan yang pertama
        if (!this.isShowing) {
            this.processQueue();
        }
    }

    processQueue() {
        if (this.queue.length === 0) {
            this.isShowing = false;
            return;
        }
        
        this.isShowing = true;
        const effectData = this.queue.shift();
        
        // Ambil konfigurasi
        const duration = this.jedagJedugConfig.duration || 5000;

        // Buat overlay full screen untuk efek disco (jika enabled)
        let discoOverlay = null;
        if (this.discoEnabled) {
            discoOverlay = document.createElement('div');
            discoOverlay.className = 'jedag-disco-overlay';
            discoOverlay.style.position = 'fixed';
            discoOverlay.style.top = '0';
            discoOverlay.style.left = '0';
            discoOverlay.style.width = '100vw';
            discoOverlay.style.height = '100vh';
            discoOverlay.style.zIndex = '9999';
            discoOverlay.style.pointerEvents = 'none';
            discoOverlay.style.background = 'transparent';
            this.container.appendChild(discoOverlay);
        }
        
        // Buat elemen jedag jedug - besar tapi tidak full screen
        const jedagElement = document.createElement('div');
        jedagElement.className = 'jedag-jedug-effect';
        jedagElement.style.position = 'fixed';
        jedagElement.style.top = '50%';
        jedagElement.style.left = '50%';
        jedagElement.style.transform = 'translate(-50%, -50%)';
        jedagElement.style.zIndex = '10000';
        jedagElement.style.pointerEvents = 'none';
        jedagElement.style.display = 'flex';
        jedagElement.style.alignItems = 'center';
        jedagElement.style.justifyContent = 'center';

        // Buat wrapper untuk foto profile
        const profileWrapper = document.createElement('div');
        profileWrapper.className = 'jedag-profile-wrapper';
        
        // Set foto profile atau emoji (gunakan dari effectData)
        const avatarUrl = effectData.avatarUrl;
        if (avatarUrl && avatarUrl.trim() !== '') {
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.alt = 'Profile';
            img.className = 'jedag-profile-picture';
            img.onerror = () => {
                img.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'jedag-profile-fallback';
                fallback.textContent = '👤';
                profileWrapper.appendChild(fallback);
            };
            profileWrapper.appendChild(img);
        } else {
            const fallback = document.createElement('div');
            fallback.className = 'jedag-profile-fallback';
            fallback.textContent = '👤';
            profileWrapper.appendChild(fallback);
        }

        jedagElement.appendChild(profileWrapper);
        this.container.appendChild(jedagElement);

        // Mulai animasi jedag jedug dengan overlay disco
        this.startAnimation(jedagElement, profileWrapper, discoOverlay);

        // Play musik
        this.playMusic(duration);

        // Simpan reference
        this.currentEffect = {
            element: jedagElement,
            profileWrapper: profileWrapper,
            discoOverlay: discoOverlay,
            startTime: Date.now(),
            duration: duration
        };

        // Clear timeout sebelumnya jika ada
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
        }

        // Auto stop setelah durasi dan lanjutkan ke queue berikutnya
        this.currentTimeout = setTimeout(() => {
            this.stop();
            
            // Tunggu fade out selesai sebelum menampilkan efek berikutnya
            setTimeout(() => {
                this.processQueue();
            }, 300); // Sesuaikan dengan durasi fade out
        }, duration);
    }

    startAnimation(element, profileWrapper, discoOverlay) {
        let startTime = Date.now();
        const duration = this.duration;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress >= 1 || !this.currentEffect) {
                return;
            }

            // Animasi jedag jedug (shake saja, tanpa efek disco di profileWrapper)
            const shakeX = (Math.random() - 0.5) * 15;
            const shakeY = (Math.random() - 0.5) * 15;
            const scale = 1 + Math.sin(elapsed / 50) * 0.1;
            const rotation = (Math.random() - 0.5) * 8;
            
            // Apply shake to profile wrapper (tanpa efek disco)
            profileWrapper.style.transform = `translate(${shakeX}px, ${shakeY}px) scale(${scale}) rotate(${rotation}deg)`;
            
            // Hapus efek disco dari profileWrapper dan element
            // Profile wrapper tetap normal tanpa filter disco
            profileWrapper.style.filter = '';
            profileWrapper.style.boxShadow = '';
            profileWrapper.style.border = '';
            profileWrapper.style.borderRadius = '';
            
            // Element background tetap transparan
            element.style.background = 'transparent';
            
            // ===== EFEK DISCO FULL SCREEN - SEDERHANA =====
            if (discoOverlay && this.discoEnabled) {
                // Warna berganti setiap 2 milidetik
                const colorChangeInterval = 2; // 2ms
                const hue = (Math.floor(elapsed / colorChangeInterval) * 10) % 360; // Setiap 2ms naik 10 derajat hue
                
                // Background solid color dengan opacity 70%
                discoOverlay.style.background = `hsla(${hue}, 100%, 50%, 0.7)`;
                discoOverlay.style.opacity = '1'; // Opacity sudah diatur di background
                discoOverlay.style.mixBlendMode = 'normal'; // Tidak perlu blend mode
            }
            
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        animate();
    }

    playMusic(duration) {
        if (!this.audioElement) {
            this.initAudio();
        }

        try {
            // Reset audio ke awal
            this.audioElement.currentTime = 0;
            
            // Play musik
            const playPromise = this.audioElement.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Musik berhasil diputar
                    console.log('🎵 Jedag jedug music started');
                }).catch(error => {
                    console.warn('⚠️ Failed to play jedag jedug music:', error);
                });
            }

            // Auto stop setelah durasi
            setTimeout(() => {
                this.stopMusic();
            }, duration);
        } catch (error) {
            console.warn('⚠️ Error playing jedag jedug music:', error);
        }
    }

    stopMusic() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
    }

    stop() {
        // Stop animasi
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Stop musik
        this.stopMusic();

        // Clear timeout
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }

        // Hapus elemen jedag jedug dengan fade out
        if (this.currentEffect) {
            const element = this.currentEffect.element;
            const discoOverlay = this.currentEffect.discoOverlay;
            
            // Fade out untuk element dan overlay
            element.style.transition = 'opacity 0.3s ease-out';
            element.style.opacity = '0';
            
            if (discoOverlay) {
                discoOverlay.style.transition = 'opacity 0.3s ease-out';
                discoOverlay.style.opacity = '0';
            }
            
            setTimeout(() => {
                if (element.parentNode) {
                    element.remove();
                }
                if (discoOverlay && discoOverlay.parentNode) {
                    discoOverlay.remove();
                }
            }, 300);
            
            this.currentEffect = null;
        }
    }

    // Clear queue dan stop efek yang sedang berjalan
    clear() {
        this.queue = [];
        this.stop();
        this.isShowing = false;
    }

    destroy() {
        this.clear();
        if (this.audioElement && this.audioElement.parentNode) {
            this.audioElement.remove();
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JedagJedug;
}

