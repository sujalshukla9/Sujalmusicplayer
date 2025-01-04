class MusicPlayer {
    constructor() {
        this.audio = new Audio();
        this.isPlaying = false;
        this.currentSongIndex = 0;
        this.songs = [];

        // Initialize DOM elements
        this.songTitle = document.getElementById('song-title');
        this.artistName = document.getElementById('artist-name');
        this.albumArt = document.getElementById('album-art');
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.selectFolderBtn = document.getElementById('select-folder');
        this.songsList = document.getElementById('songs-list');

        // Initialize event listeners
        this.initializeEventListeners();

        // Add event listeners for playback controls
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        
        // Get progress bar elements
        this.progressBar = document.getElementById('progress-bar');
        this.progress = document.getElementById('progress');
        this.currentTimeEl = document.getElementById('current-time');
        this.durationEl = document.getElementById('duration');

        // Add click event for progress bar
        this.progressBar.addEventListener('click', (e) => this.setProgress(e));

        // Add next/previous buttons
        this.nextBtn = document.getElementById('next-btn');
        this.prevBtn = document.getElementById('prev-btn');
        
        // Initialize additional event listeners
        this.initializeControls();

        // Initialize progress bar
        this.initializeProgressBar();

        // Add folder selection button
        this.folderBtn = document.getElementById('select-folder');
        this.folderBtn.addEventListener('click', () => this.selectFolder());
        
        // Hide songs list initially
        this.songsList.style.display = 'none';

        // Add loop button initialization
        this.loopBtn = document.getElementById('loop-btn');
        this.isLooping = false;
        
        // Initialize loop button
        this.initializeLoopButton();

        // Add volume button
        this.volumeBtn = document.getElementById('volume-btn');
        this.lastVolume = 1.0; // Store the last volume level
        
        // Initialize volume button
        this.initializeVolumeButton();
    }

    initializeEventListeners() {
        // Folder selection
        this.selectFolderBtn.addEventListener('click', () => this.selectFolder());

        // Playback controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.audio.addEventListener('ended', () => this.handleSongEnd());
    }

    initializeControls() {
        // Add next/previous button listeners
        this.nextBtn.addEventListener('click', () => this.nextSong());
        this.prevBtn.addEventListener('click', () => this.previousSong());
        
        // Add ended event to automatically play next song
        this.audio.addEventListener('ended', () => {
            this.nextSong();
        });
    }

    async selectFolder() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'audio/*,.mp3,.wav,.ogg,.m4a';

            // Check if it's a mobile device
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (!isMobile) {
                // For desktop: try directory selection
                try {
                    if (window.showDirectoryPicker) {
                        const dirHandle = await window.showDirectoryPicker();
                        const files = [];
                        
                        // Recursively get all files from the directory
                        async function getFilesRecursively(dirHandle) {
                            for await (const entry of dirHandle.values()) {
                                if (entry.kind === 'file') {
                                    const file = await entry.getFile();
                                    if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
                                        files.push(file);
                                    }
                                } else if (entry.kind === 'directory') {
                                    await getFilesRecursively(entry);
                                }
                            }
                        }
                        
                        await getFilesRecursively(dirHandle);
                        
                        if (files.length > 0) {
                            this.handleFiles(files);
                            return;
                        }
                    } else {
                        // Fallback to directory input for older desktop browsers
                        input.webkitdirectory = true;
                        input.directory = true;
                        input.mozdirectory = true;
                    }
                } catch (e) {
                    console.log('Directory selection not supported, falling back to file input');
                }
            }

            // Use promise to handle file selection
            const files = await new Promise((resolve) => {
                input.onchange = (e) => resolve(Array.from(e.target.files));
                input.click();
            });

            await this.handleFiles(files);

        } catch (error) {
            console.error('Error selecting folder:', error);
            this.songsList.innerHTML = '<div class="no-songs">Please select audio files to play</div>';
        }
    }

    // Add this new method to handle files
    async handleFiles(files) {
        if (!files || files.length === 0) {
            this.songsList.innerHTML = '<div class="no-songs">No files selected</div>';
            return;
        }

        // Filter audio files
        const audioFiles = files.filter(file => 
            file.type.startsWith('audio/') || 
            file.name.match(/\.(mp3|wav|ogg|m4a)$/i)
        );

        if (audioFiles.length === 0) {
            this.songsList.innerHTML = '<div class="no-songs">No music files found</div>';
            return;
        }

        // Clear existing songs
        this.songsList.innerHTML = '';
        this.songs = [];

        // Process each file
        audioFiles.forEach((file) => {
            const songIndex = this.songs.length;
            this.songs.push({ 
                handle: file,
                name: file.name 
            });

            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.innerHTML = `
                <div class="song-art">
                    <img src="assets/default-album-art.png" alt="Album Art">
                </div>
                <div class="song-info">
                    <span class="song-name">${file.name}</span>
                    <span class="song-artist">Unknown Artist</span>
                </div>
            `;

            songItem.addEventListener('click', () => this.playSong(songIndex));
            this.songsList.appendChild(songItem);
            this.loadSongMetadata(file, songItem);
        });

        this.songsList.style.display = 'block';
    }

    async loadSongs(dirHandle) {
        try {
            this.songsList.innerHTML = '';
            this.songs = [];

            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file' && entry.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
                    const file = await entry.getFile();
                    const songIndex = this.songs.length;
                    this.songs.push({ handle: entry, name: file.name });
                    
                    // Create song item without play/pause button
                    const songItem = document.createElement('div');
                    songItem.className = 'song-item';
                    songItem.innerHTML = `
                        <div class="song-art">
                            <img src="assets/default-album-art.png" alt="Album Art">
                        </div>
                        <div class="song-info">
                            <span class="song-name">${file.name}</span>
                            <span class="song-artist">Unknown Artist</span>
                        </div>
                    `;

                    // Single click handler for the entire song item
                    songItem.addEventListener('click', () => this.playSong(songIndex));
                    this.songsList.appendChild(songItem);
                    
                    // Try to get metadata
                    this.loadSongMetadata(file, songItem);
                }
            }

            if (this.songs.length === 0) {
                this.songsList.innerHTML = '<div class="no-songs">No music files found</div>';
            }

        } catch (error) {
            console.error('Error loading songs:', error);
            this.songsList.innerHTML = '<div class="no-songs">Unable to load songs</div>';
        }
    }

    loadSongMetadata(file, songItem) {
        jsmediatags.read(file, {
            onSuccess: (tag) => {
                const { title, artist, picture } = tag.tags;

                if (title) {
                    songItem.querySelector('.song-name').textContent = title;
                }

                if (artist) {
                    songItem.querySelector('.song-artist').textContent = artist;
                }

                if (picture) {
                    const { data, format } = picture;
                    let base64String = "";
                    for (let i = 0; i < data.length; i++) {
                        base64String += String.fromCharCode(data[i]);
                    }
                    const imageUrl = `data:${format};base64,${window.btoa(base64String)}`;
                    songItem.querySelector('.song-art img').src = imageUrl;
                }
            },
            onError: (error) => {
                console.error('Error reading tags:', error);
            }
        });
    }

    async playSong(index) {
        try {
            const song = this.songs[index];
            if (!song) return;

            // Remove playing class from all songs
            const songItems = this.songsList.querySelectorAll('.song-item');
            songItems.forEach(item => item.classList.remove('playing'));
            
            // Add playing class to selected song
            songItems[index].classList.add('playing');
            songItems[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Get the file (handles both FileSystemFileHandle and File objects)
            const file = song.handle instanceof File ? song.handle : await song.handle.getFile();
            const audioUrl = URL.createObjectURL(file);

            // Update audio source and play immediately
            this.audio.src = audioUrl;
            this.audio.play()
                .then(() => {
                    this.isPlaying = true;
                    this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                })
                .catch(error => {
                    console.error('Playback failed:', error);
                });
            
            // Update UI
            this.songTitle.textContent = song.name.replace(/\.[^/.]+$/, "");
            this.artistName.textContent = "Unknown Artist";
            this.albumArt.src = 'assets/default-album-art.png';
            
            // Get metadata and update display
            jsmediatags.read(file, {
                onSuccess: (tag) => {
                    if (tag.tags.title) {
                        this.songTitle.textContent = tag.tags.title;
                    }
                    if (tag.tags.artist) {
                        this.artistName.textContent = tag.tags.artist;
                    }
                    if (tag.tags.picture) {
                        const { data, format } = tag.tags.picture;
                        let base64String = "";
                        for (let i = 0; i < data.length; i++) {
                            base64String += String.fromCharCode(data[i]);
                        }
                        const imageUrl = `data:${format};base64,${window.btoa(base64String)}`;
                        this.albumArt.src = imageUrl;
                    }
                },
                onError: (error) => {
                    console.error('Error reading tags:', error);
                }
            });

            this.currentSongIndex = index;

            // Maintain loop state when changing songs
            this.audio.loop = this.isLooping;
        } catch (error) {
            console.error('Error playing song:', error);
        }
    }

    togglePlayPause() {
        if (this.audio.src) {
            if (this.isPlaying) {
                this.audio.pause();
                this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            } else {
                this.audio.play();
                this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            }
            this.isPlaying = !this.isPlaying;
        }
    }

    handleSongEnd() {
        this.isPlaying = false;
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    // Add these new methods for progress bar functionality
    updateProgress() {
        const { currentTime, duration } = this.audio;
        if (duration) {
            const progressPercent = (currentTime / duration) * 100;
            this.progress.style.width = `${progressPercent}%`;
            this.currentTimeEl.textContent = this.formatTime(currentTime);
        }
    }

    updateDuration() {
        this.durationEl.textContent = this.formatTime(this.audio.duration);
    }

    setProgress(e) {
        const width = this.progressBar.clientWidth;
        const clickX = e.offsetX;
        const duration = this.audio.duration;
        this.audio.currentTime = (clickX / width) * duration;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    nextSong() {
        if (this.songs.length === 0) return;
        
        this.currentSongIndex++;
        if (this.currentSongIndex >= this.songs.length) {
            this.currentSongIndex = 0; // Loop back to first song
        }
        
        this.playSong(this.currentSongIndex);
    }

    previousSong() {
        if (this.songs.length === 0) return;
        
        this.currentSongIndex--;
        if (this.currentSongIndex < 0) {
            this.currentSongIndex = this.songs.length - 1; // Loop to last song
        }
        
        this.playSong(this.currentSongIndex);
    }

    // Add keyboard controls
    initializeKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (e.ctrlKey) {
                        // Skip forward 10 seconds if Ctrl is pressed
                        this.audio.currentTime = Math.min(this.audio.currentTime + 10, this.audio.duration);
                    } else {
                        this.nextSong();
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (e.ctrlKey) {
                        // Skip backward 10 seconds if Ctrl is pressed
                        this.audio.currentTime = Math.max(this.audio.currentTime - 10, 0);
                    } else {
                        this.previousSong();
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.changeVolume(0.1); // Increase volume
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.changeVolume(-0.1); // Decrease volume
                    break;
            }
        });
    }

    changeVolume(delta) {
        const newVolume = Math.max(0, Math.min(1, this.audio.volume + delta));
        this.audio.volume = newVolume;
        this.updateVolumeIcon(newVolume);
    }

    // Add progress bar dragging functionality
    initializeProgressBar() {
        let isDragging = false;

        this.progressBar.addEventListener('mousedown', (e) => {
            isDragging = true;
            this.setProgress(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const rect = this.progressBar.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const width = this.progressBar.clientWidth;
                const duration = this.audio.duration;
                this.audio.currentTime = Math.max(0, Math.min(duration, (x / width) * duration));
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Add touch support for mobile devices
        this.progressBar.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const rect = this.progressBar.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const width = this.progressBar.clientWidth;
            const duration = this.audio.duration;
            this.audio.currentTime = Math.max(0, Math.min(duration, (x / width) * duration));
        });
    }

    initializeLoopButton() {
        this.loopBtn.addEventListener('click', () => {
            this.isLooping = !this.isLooping;
            this.audio.loop = this.isLooping;
            
            // Update button appearance
            if (this.isLooping) {
                this.loopBtn.classList.add('active');
                this.loopBtn.style.color = '#3498db'; // Highlight color when active
            } else {
                this.loopBtn.classList.remove('active');
                this.loopBtn.style.color = ''; // Reset to default color
            }
        });
    }

    initializeVolumeButton() {
        if (!this.volumeBtn) return;

        this.volumeBtn.addEventListener('click', () => {
            if (this.audio.volume > 0) {
                // If volume is not 0, store it and mute
                this.lastVolume = this.audio.volume;
                this.audio.volume = 0;
                this.volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            } else {
                // If muted, restore to last volume
                this.audio.volume = this.lastVolume;
                if (this.lastVolume >= 0.5) {
                    this.volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                } else {
                    this.volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
                }
            }
        });

        // Update initial volume icon
        this.updateVolumeIcon(this.audio.volume);
    }

    updateVolumeIcon(volume) {
        if (!this.volumeBtn) return;
        
        if (volume === 0) {
            this.volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else if (volume < 0.5) {
            this.volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        } else {
            this.volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    }
}

// Social links functionality
class SocialLinks {
    constructor() {
        this.initializeSocialLinks();
    }

    initializeSocialLinks() {
        const socialLinks = document.querySelectorAll('.social-link');
        
        socialLinks.forEach(link => {
            // Add hover effect
            link.addEventListener('mouseenter', () => {
                link.style.transform = 'translateY(-3px)';
            });

            link.addEventListener('mouseleave', () => {
                link.style.transform = 'translateY(0)';
            });

            // Add click handler
            link.addEventListener('click', (e) => {
                const url = link.getAttribute('href');
                
                // Validate URL
                if (!this.isValidUrl(url)) {
                    e.preventDefault();
                    console.error('Invalid URL:', url);
                    return;
                }

                // Check if social media is accessible
                this.checkUrlAvailability(url).catch(error => {
                    console.warn('Social media link might be unavailable:', error);
                });
            });
        });
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    async checkUrlAvailability(url) {
        try {
            const response = await fetch(url, {
                mode: 'no-cors',
                method: 'HEAD'
            });
            return true;
        } catch {
            return false;
        }
    }
}

// Initialize both classes when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.player = new MusicPlayer();
    window.socialLinks = new SocialLinks();

    // Error handling for Font Awesome
    if (typeof FontAwesome === 'undefined') {
        console.warn('Font Awesome not loaded. Social icons might not display correctly.');
        // Add fallback icons if needed
        document.querySelectorAll('.fab').forEach(icon => {
            if (!icon.offsetParent) {
                icon.textContent = icon.classList.contains('fa-instagram') ? 'Instagram' :
                                 icon.classList.contains('fa-github') ? 'GitHub' :
                                 icon.classList.contains('fa-facebook') ? 'Facebook' : '';
            }
        });
    }
});

// Global error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Prevent complete player failure on non-critical errors
    event.preventDefault();
});

// Handle offline/online status
window.addEventListener('online', () => {
    document.querySelectorAll('.social-link').forEach(link => {
        link.style.opacity = '0.7';
        link.style.pointerEvents = 'auto';
    });
});

window.addEventListener('offline', () => {
    document.querySelectorAll('.social-link').forEach(link => {
        link.style.opacity = '0.3';
        link.style.pointerEvents = 'none';
    });
});
