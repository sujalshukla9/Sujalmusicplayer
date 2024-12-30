class MusicPlayer {
    constructor() {
        this.audio = new Audio();
        this.isPlaying = false;
        this.isLooping = false;
        
        // Add error state
        this.hasError = false;

        // Cache DOM Elements with error handling
        try {
            this.initializeDOMElements();
        } catch (error) {
            console.error('Failed to initialize DOM elements:', error);
            this.hasError = true;
        }

        if (!this.hasError) {
            this.initializeEventListeners();
        }
    }

    initializeDOMElements() {
        const elements = {
            'playPauseBtn': '#play-pause-btn',
            'loopBtn': '#loop-btn',
            'prevBtn': '#prev-btn',
            'nextBtn': '#next-btn',
            'volumeBtn': '#volume-btn',
            'progressBar': '.progress-bar',
            'progress': '.progress',
            'currentTime': '.current',
            'duration': '.duration',
            'albumArt': '#album-art',
            'songTitle': '#song-title',
            'artistName': '#artist-name',
            'fileInput': '#song-upload'
        };

        for (const [key, selector] of Object.entries(elements)) {
            const element = document.querySelector(selector);
            if (!element) {
                throw new Error(`Required element ${selector} not found`);
            }
            this[key] = element;
        }
    }

    initializeEventListeners() {
        // Play/Pause
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());

        // Loop
        this.loopBtn.addEventListener('click', () => this.toggleLoop());

        // Progress Bar
        this.progressBar.addEventListener('click', (e) => this.setProgress(e));

        // File Upload
        this.fileInput.addEventListener('change', (e) => this.loadFile(e));

        // Audio Events
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleSongEnd());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());

        // Volume Control
        this.volumeBtn.addEventListener('click', () => this.toggleMute());
    }

    togglePlayPause() {
        if (this.audio.src) {
            if (this.isPlaying) {
                this.pause();
            } else {
                this.play();
            }
        }
    }

    play() {
        this.audio.play();
        this.isPlaying = true;
        this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.albumArt.classList.add('playing');
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        this.albumArt.classList.remove('playing');
    }

    toggleLoop() {
        this.isLooping = !this.isLooping;
        this.audio.loop = this.isLooping;
        this.loopBtn.style.color = this.isLooping ? '#3498db' : '#ecf0f1';
    }

    toggleMute() {
        this.audio.muted = !this.audio.muted;
        this.volumeBtn.innerHTML = this.audio.muted ? 
            '<i class="fas fa-volume-mute"></i>' : 
            '<i class="fas fa-volume-up"></i>';
    }

    loadFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('audio/')) {
            alert('Please select a valid audio file');
            return;
        }

        // Clean up previous object URL if it exists
        if (this.audio.src) {
            URL.revokeObjectURL(this.audio.src);
        }

        const fileURL = URL.createObjectURL(file);
        this.audio.src = fileURL;
        this.songTitle.textContent = file.name.replace(/\.[^/.]+$/, "");
        this.artistName.textContent = "Unknown Artist";
        
        // Set default album art immediately
        this.updateAlbumArt('assets/default-album-art.png');
        
        // Use jsmediatags instead of music-metadata-browser
        jsmediatags.read(file, {
            onSuccess: (tag) => {
                if (tag.tags.title) {
                    this.songTitle.textContent = tag.tags.title;
                }
                if (tag.tags.artist) {
                    this.artistName.textContent = tag.tags.artist;
                }
                if (tag.tags.picture) {
                    this.handleAlbumArt(tag.tags.picture);
                }
            },
            onError: (error) => {
                console.error('Error reading tags:', error);
            }
        });

        this.play();
    }

    handleAlbumArt(picture) {
        const { data, format } = picture;
        let base64String = "";
        for (let i = 0; i < data.length; i++) {
            base64String += String.fromCharCode(data[i]);
        }
        const imageUrl = `data:${format};base64,${window.btoa(base64String)}`;
        this.updateAlbumArt(imageUrl);
    }

    updateAlbumArt(src) {
        this.albumArt.style.opacity = '0';
        setTimeout(() => {
            this.albumArt.src = src;
            this.albumArt.style.opacity = '1';
        }, 300);
    }

    updateTrackMetadata(metadata) {
        if (metadata.common.artist) {
            this.artistName.textContent = metadata.common.artist;
        }

        if (metadata.common.picture?.[0]) {
            const picture = metadata.common.picture[0];
            const blob = new Blob([picture.data], { type: picture.format });
            const imageUrl = URL.createObjectURL(blob);
            
            const tempImg = new Image();
            tempImg.onload = () => {
                this.updateAlbumArt(imageUrl);
                URL.revokeObjectURL(imageUrl);
            };
            tempImg.onerror = () => {
                console.error("Failed to load album art");
                URL.revokeObjectURL(imageUrl);
            };
            tempImg.src = imageUrl;
        }
    }

    setProgress(e) {
        const width = this.progressBar.clientWidth;
        const clickX = e.offsetX;
        const duration = this.audio.duration;
        this.audio.currentTime = (clickX / width) * duration;
    }

    updateProgress() {
        if (this.audio.duration) {
            const progressPercent = (this.audio.currentTime / this.audio.duration) * 100;
            this.progress.style.width = `${progressPercent}%`;
            this.currentTime.textContent = this.formatTime(this.audio.currentTime);
        }
    }

    updateDuration() {
        this.duration.textContent = this.formatTime(this.audio.duration);
    }

    handleSongEnd() {
        if (!this.isLooping) {
            this.pause();
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// Initialize the music player when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const player = new MusicPlayer();
});
