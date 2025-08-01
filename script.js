document.addEventListener('DOMContentLoaded', () => {
    // --- SMOOTH SCROLL INITIALIZATION ---
    const lenis = new Lenis();
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // --- ENTRANCE ANIMATIONS ---
    const animatedElements = document.querySelectorAll('[data-animate]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
            }
        });
    }, { threshold: 0.1 });
    animatedElements.forEach(el => observer.observe(el));


    // --- SERVICE WORKER REGISTRATION ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        });
    }

    // --- DOM Element References ---
    const appContainer = document.getElementById('app-container');
    const sidebar = document.getElementById('sidebar');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const addMusicBtn = document.getElementById('add-music-btn');
    const searchBar = document.getElementById('search-bar');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const playlistContainer = document.getElementById('playlist');
    const albumArt = document.getElementById('album-art');
    const trackTitle = document.getElementById('track-title');
    const trackArtist = document.getElementById('track-artist');
    const seekBar = document.getElementById('seek-bar');
    const currentTimeProgressEl = document.getElementById('current-time-progress');
    const totalDurationEl = document.getElementById('total-duration');
    const loopBtn = document.getElementById('loop-btn');
    const prevBtn = document.getElementById('prev-btn');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const nextBtn = document.getElementById('next-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const enhancerToggle = document.getElementById('enhancer-toggle');
    const audioPlayer = document.getElementById('audio-player');
    const currentDateEl = document.getElementById('current-date');
    const currentTimeEl = document.getElementById('current-time');
    const currentLocationEl = document.getElementById('current-location');
    const offlineIndicator = document.getElementById('offline-indicator');


    // --- Audio API Setup ---
    let audioContext;
    let source;
    let bassBoostFilter;
    let trebleBoostFilter;

    // --- Application State ---
    let playlist = [];
    let originalPlaylist = [];
    let currentIndex = -1;
    let isPlaying = false;
    let isShuffle = false;
    let loopMode = 'none'; // 'none', 'all', 'one'
    let isEnhancerOn = false;
    
    // --- SVG Icons for Loop Button ---
    const loopIcons = {
        none: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
        all: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
        one: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><path d="M11 12h2l-2 4-2-4h2V8h2v4Z"/></svg>`
    };

    // --- Utility Functions ---
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const arrayBufferToBase64 = (buffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    };
    
    // --- Core Music Player Functions ---
    const loadSong = (songIndex) => {
        if (songIndex < 0 || songIndex >= playlist.length) return;

        currentIndex = songIndex;
        const song = playlist[currentIndex];
        
        trackTitle.textContent = song.title || 'Unknown Title';
        trackArtist.textContent = song.artist || 'Unknown Artist';
        
        albumArt.src = song.albumArt || 'https://placehold.co/600x600/1e293b/ffffff?text=Supersonic';
        audioPlayer.src = song.url;
        
        updateActivePlaylistItem();
    };

    const playSong = () => {
        if (playlist.length === 0) return;
        isPlaying = true;
        audioPlayer.play().catch(e => console.error("Playback error:", e));
        playPauseBtn.classList.add('playing');
        albumArt.style.transform = 'scale(1.05)';
    };

    const pauseSong = () => {
        isPlaying = false;
        audioPlayer.pause();
        playPauseBtn.classList.remove('playing');
        albumArt.style.transform = 'scale(1)';
    };

    const prevSong = () => {
        if (playlist.length === 0) return;
        let newIndex = currentIndex - 1;
        if (newIndex < 0) {
            newIndex = playlist.length - 1;
        }
        loadSong(newIndex);
        playSong();
    };

    const nextSong = () => {
        if (playlist.length === 0) return;
        if (loopMode === 'one' && isPlaying) {
            loadSong(currentIndex);
            playSong();
            return;
        }
        
        let newIndex = currentIndex + 1;
        if (newIndex >= playlist.length) {
            if (loopMode === 'all') {
                newIndex = 0;
            } else {
                loadSong(0);
                pauseSong();
                seekBar.value = 0;
                currentTimeProgressEl.textContent = '0:00';
                return;
            }
        }
        loadSong(newIndex);
        playSong();
    };

    // --- UI Update Functions ---
    const updateProgressBar = () => {
        if (isPlaying) {
            const { duration, currentTime } = audioPlayer;
            if (duration) {
                const progressPercent = (currentTime / duration) * 100;
                seekBar.value = progressPercent;
                currentTimeProgressEl.textContent = formatTime(currentTime);
                totalDurationEl.textContent = formatTime(duration);
            }
        }
    };

    const updateActivePlaylistItem = () => {
        document.querySelectorAll('.playlist-item').forEach((item) => {
            const itemIndex = parseInt(item.dataset.index, 10);
            const currentSong = playlist[currentIndex];
            if (currentSong && itemIndex === currentSong.originalIndex) {
                item.classList.add('active');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    };
    
    const renderPlaylist = (songsToRender = playlist) => {
        if (originalPlaylist.length === 0) {
             playlistContainer.innerHTML = `<div class="drop-zone-text"><p>Load a folder to begin</p></div>`;
             return;
        }
        if (songsToRender.length === 0) {
            playlistContainer.innerHTML = `<div class="drop-zone-text"><p>No matching songs found.</p></div>`;
            return;
        }

        playlistContainer.innerHTML = songsToRender.map((song) => `
            <div class="playlist-item" data-index="${song.originalIndex}" data-animate>
                <img src="${song.albumArt || 'https://placehold.co/80x80/1e293b/ffffff?text=🎵'}" alt="Art" class="playlist-album-art">
                <div class="playlist-track-info">
                    <div class="playlist-title">${song.title || 'Unknown Title'}</div>
                    <div class="playlist-artist">${song.artist || 'Unknown Artist'}</div>
                </div>
            </div>
        `).join('');
        // Re-observe new playlist items for animations
        playlistContainer.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
        updateActivePlaylistItem();
    };

    // --- Audio Enhancement ---
    const setupAudioContext = () => {
        if (audioContext) return;
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();

            bassBoostFilter = audioContext.createBiquadFilter();
            bassBoostFilter.type = 'lowshelf';
            bassBoostFilter.frequency.value = 250;

            trebleBoostFilter = audioContext.createBiquadFilter();
            trebleBoostFilter.type = 'highshelf';
            trebleBoostFilter.frequency.value = 4000;

            source = audioContext.createMediaElementSource(audioPlayer);
            
            source.connect(bassBoostFilter);
            bassBoostFilter.connect(trebleBoostFilter);
            trebleBoostFilter.connect(audioContext.destination);

        } catch (e) {
            console.error("Failed to initialize AudioContext:", e);
        }
    };

    const toggleEnhancer = () => {
        isEnhancerOn = enhancerToggle.checked;
        if (bassBoostFilter && trebleBoostFilter) {
            const bassGain = isEnhancerOn ? 4 : 0;
            const trebleGain = isEnhancerOn ? 3 : 0;
            bassBoostFilter.gain.setValueAtTime(bassGain, audioContext.currentTime);
            trebleBoostFilter.gain.setValueAtTime(trebleGain, audioContext.currentTime);
        }
        saveSettings();
    };

    // --- File Handling ---
    const processFile = async (fileHandle) => {
        if (fileHandle.kind !== 'file') return null;
        const file = await fileHandle.getFile();
        if (!file.type.startsWith('audio/')) return null;

        return new Promise((resolve) => {
            jsmediatags.read(file, {
                onSuccess: (tag) => {
                    const { title, artist, picture } = tag.tags;
                    resolve({
                        url: URL.createObjectURL(file),
                        title: title || file.name.replace(/\.[^/.]+$/, ""),
                        artist: artist || 'Unknown Artist',
                        albumArt: picture ? `data:${picture.format};base64,${arrayBufferToBase64(picture.data)}` : null,
                        fileHandle
                    });
                },
                onError: () => {
                    resolve({
                        url: URL.createObjectURL(file),
                        title: file.name.replace(/\.[^/.]+$/, ""),
                        artist: 'Unknown Artist',
                        albumArt: null,
                        fileHandle
                    });
                }
            });
        });
    };

    const processDirectory = async (dirHandle) => {
        let files = [];
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                const song = await processFile(entry);
                if (song) files.push(song);
            } else if (entry.kind === 'directory') {
                files = files.concat(await processDirectory(entry));
            }
        }
        return files;
    };

    const handleDirectorySelection = async (dirHandle) => {
        try {
            const handle = dirHandle || await window.showDirectoryPicker();
            playlistContainer.innerHTML = `<div class="drop-zone-text"><p>Scanning music...</p></div>`;
            const songs = await processDirectory(handle);
            if (songs.length > 0) {
                originalPlaylist = songs.map((song, index) => ({...song, originalIndex: index }));
                playlist = [...originalPlaylist];
                renderPlaylist();
                loadSong(0);
            } else {
                 playlistContainer.innerHTML = `<div class="drop-zone-text"><p>No audio files found.</p></div>`;
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error accessing directory:', error);
                playlistContainer.innerHTML = `<div class="drop-zone-text"><p style="color: #ef4444;">Could not access directory.</p></div>`;
            }
        }
    };
    
    // --- Date, Time, and Location ---
    const updateDateTime = () => {
        const date = "July 31, 2025";
        const location = "Virar, IN";
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
        });

        currentDateEl.textContent = date;
        currentTimeEl.textContent = timeString;
        currentLocationEl.textContent = location;
    };

    // --- Offline Status Indicator ---
    const updateOnlineStatus = () => {
        if (navigator.onLine) {
            offlineIndicator.classList.remove('visible');
        } else {
            offlineIndicator.classList.add('visible');
        }
    };

    // --- Theme and Settings Persistence ---
    const applyTheme = (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    };

    const toggleTheme = () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(newTheme);
        saveSettings();
    };
    
    const saveSettings = () => {
        localStorage.setItem('supersonicSettings', JSON.stringify({
            theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
            volume: audioPlayer.volume,
            isEnhancerOn,
            loopMode,
            isShuffle,
        }));
    };

    const loadSettings = () => {
        const settings = JSON.parse(localStorage.getItem('supersonicSettings'));
        if (settings) {
            applyTheme(settings.theme || 'dark');
            volumeSlider.value = settings.volume ?? 0.5;
            audioPlayer.volume = settings.volume ?? 0.5;
            enhancerToggle.checked = settings.isEnhancerOn ?? false;
            isEnhancerOn = settings.isEnhancerOn ?? false;
            loopMode = settings.loopMode || 'none';
            isShuffle = settings.isShuffle || false;
            
            updateLoopButton();
            shuffleBtn.classList.toggle('active', isShuffle);
        } else {
            applyTheme('dark');
        }
    };

    // --- Search and Shuffle ---
    const filterPlaylist = () => {
        const searchTerm = searchBar.value.toLowerCase();
        searchClearBtn.classList.toggle('visible', searchTerm.length > 0);

        const filteredSongs = playlist.filter(song => 
            song.title.toLowerCase().includes(searchTerm) || 
            song.artist.toLowerCase().includes(searchTerm)
        );
        renderPlaylist(filteredSongs);
    };

    const shufflePlaylist = (playlistToShuffle) => {
        let shuffled = [...(playlistToShuffle || originalPlaylist)];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    const toggleShuffle = () => {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active', isShuffle);
        
        const currentSongUrl = playlist[currentIndex]?.url;

        if (isShuffle) {
            playlist = shufflePlaylist(originalPlaylist);
        } else {
            playlist = [...originalPlaylist];
        }
        
        currentIndex = playlist.findIndex(song => song.url === currentSongUrl) ?? 0;
        
        filterPlaylist();
        updateActivePlaylistItem();
        saveSettings();
    };

    const updateLoopButton = () => {
        loopBtn.innerHTML = loopIcons[loopMode];
        loopBtn.classList.toggle('active', loopMode !== 'none');
        loopBtn.style.color = loopMode === 'one' ? 'var(--accent-blue)' : '';
    };

    const toggleLoop = () => {
        const modes = ['none', 'all', 'one'];
        const currentModeIndex = modes.indexOf(loopMode);
        loopMode = modes[(currentModeIndex + 1) % modes.length];
        
        updateLoopButton();
        saveSettings();
    };

    // --- Event Listeners ---
    addMusicBtn.addEventListener('click', () => handleDirectorySelection());
    searchBar.addEventListener('input', filterPlaylist);
    searchClearBtn.addEventListener('click', () => {
        searchBar.value = '';
        filterPlaylist();
    });
    playPauseBtn.addEventListener('click', () => (isPlaying ? pauseSong() : playSong()));
    audioPlayer.addEventListener('timeupdate', updateProgressBar);
    audioPlayer.addEventListener('ended', nextSong);
    audioPlayer.addEventListener('loadedmetadata', updateProgressBar);
    audioPlayer.addEventListener('play', setupAudioContext);
    
    seekBar.addEventListener('input', (e) => {
        const duration = audioPlayer.duration;
        if(duration) {
            audioPlayer.currentTime = (e.target.value / 100) * duration;
        }
    });

    nextBtn.addEventListener('click', nextSong);
    prevBtn.addEventListener('click', prevSong);
    themeToggleBtn.addEventListener('click', toggleTheme);
    enhancerToggle.addEventListener('change', toggleEnhancer);
    shuffleBtn.addEventListener('click', toggleShuffle);
    loopBtn.addEventListener('click', toggleLoop);

    volumeSlider.addEventListener('input', (e) => {
        audioPlayer.volume = e.target.value;
        saveSettings();
    });

    playlistContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.playlist-item');
        if (item) {
            const originalSongIndex = parseInt(item.dataset.index, 10);
            const songIndexInCurrentPlaylist = playlist.findIndex(song => song.originalIndex === originalSongIndex);
            
            if (songIndexInCurrentPlaylist !== -1) {
                if (songIndexInCurrentPlaylist !== currentIndex || !isPlaying) {
                    loadSong(songIndexInCurrentPlaylist);
                    playSong();
                }
            }
        }
    });

    // Drag and Drop
    sidebar.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.add('drag-over');
    });
    sidebar.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.remove('drag-over');
    });
    sidebar.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.remove('drag-over');
        if (e.dataTransfer.items?.[0]?.getAsFileSystemHandle) {
            const handle = await e.dataTransfer.items[0].getAsFileSystemHandle();
            if (handle.kind === 'directory') {
                handleDirectorySelection(handle);
            }
        }
    });
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);


    // --- Initial Load ---
    loadSettings();
    renderPlaylist();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    updateOnlineStatus();
});
