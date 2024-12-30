class MusicPlayer {
    constructor() {
        this.audio = new Audio();
        this.isPlaying = false;
        this.isLooping = false;
        
        // DOM Elements
        this.playPauseBtn = document.querySelector('#play-pause-btn');
        this.loopBtn = document.querySelector('#loop-btn');
        this.prevBtn = document.querySelector('#prev-btn');
        this.nextBtn = document.querySelector('#next-btn');
        this.volumeBtn = document.querySelector('#volume-btn');
        this.progressBar = document.querySelector('.progress-bar');
        this.progress = document.querySelector('.progress');
        this.currentTime = document.querySelector('.current');
        this.duration = document.querySelector('.duration');
        this.albumArt = document.querySelector('#album-art');
        this.songTitle = document.querySelector('#song-title');
        this.artistName = document.querySelector('#artist-name');
        this.fileInput = document.querySelector('#song-upload');

        this.initializeEventListeners();
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
        if (file) {
            const fileURL = URL.createObjectURL(file);
            this.audio.src = fileURL;
            this.songTitle.textContent = file.name.replace(/\.[^/.]+$/, "");
            this.artistName.textContent = "Unknown Artist";
            
            // Set default album art with fade effect
            this.albumArt.style.opacity = '0';
            this.albumArt.src = 'assets/default-album-art.png';
            setTimeout(() => this.albumArt.style.opacity = '1', 100);
            
            // Load metadata and album art
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const metadata = await musicMetadata.parseBlob(file);
                    
                    // Update artist name if available
                    if (metadata.common.artist) {
                        this.artistName.textContent = metadata.common.artist;
                    }
                    
                    // Handle album art with better error handling and transitions
                    if (metadata.common.picture && metadata.common.picture.length > 0) {
                        const picture = metadata.common.picture[0];
                        const blob = new Blob([picture.data], { type: picture.format });
                        const imageUrl = URL.createObjectURL(blob);
                        
                        // Create a temporary image to verify the loaded image
                        const tempImg = new Image();
                        tempImg.onload = () => {
                            this.albumArt.style.opacity = '0';
                            setTimeout(() => {
                                this.albumArt.src = imageUrl;
                                this.albumArt.style.opacity = '1';
                            }, 300);
                        };
                        tempImg.onerror = () => {
                            console.error("Failed to load album art");
                            // Keep default album art if image fails to load
                        };
                        tempImg.src = imageUrl;
                        
                        // Clean up the old object URL
                        this.albumArt.onload = () => {
                            URL.revokeObjectURL(imageUrl);
                        };
                    }
                } catch (error) {
                    console.error("Error reading metadata:", error);
                }
            };
            reader.readAsArrayBuffer(file);

            this.play();
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
