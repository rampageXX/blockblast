// ==================== CONSTANTS ====================

const BOARD_SIZE = 8; // Reduced from 10 for kid-friendly play
const PIECE_COUNT = 3;

// Piece definitions with weights for kid-friendly distribution
// Higher weight = more likely to appear
const PIECES = [
    // SIMPLE SHAPES (high frequency)
    // Single blocks
    { shape: [[1]], color: 1, weight: 15 },

    // Horizontal lines
    { shape: [[1, 1]], color: 2, weight: 12 },
    { shape: [[1, 1, 1]], color: 3, weight: 10 },
    { shape: [[1, 1, 1, 1]], color: 4, weight: 6 },

    // Vertical lines
    { shape: [[1], [1]], color: 5, weight: 12 },
    { shape: [[1], [1], [1]], color: 6, weight: 10 },
    { shape: [[1], [1], [1], [1]], color: 7, weight: 6 },

    // Squares
    { shape: [[1, 1], [1, 1]], color: 8, weight: 12 },

    // 2x3 rectangles
    { shape: [[1, 1], [1, 1], [1, 1]], color: 1, weight: 5 },
    { shape: [[1, 1, 1], [1, 1, 1]], color: 2, weight: 5 },

    // MEDIUM SHAPES (medium frequency)
    // Small corners (2x2 L) - simple L shapes
    { shape: [[1, 1], [1, 0]], color: 3, weight: 6 },
    { shape: [[1, 1], [0, 1]], color: 4, weight: 6 },
    { shape: [[1, 0], [1, 1]], color: 5, weight: 6 },
    { shape: [[0, 1], [1, 1]], color: 6, weight: 6 },

    // COMPLEX SHAPES (low frequency)
    // L-shapes (3 cells)
    { shape: [[1, 0], [1, 0], [1, 1]], color: 7, weight: 2 },
    { shape: [[1, 1, 1], [1, 0, 0]], color: 8, weight: 2 },
    { shape: [[1, 1], [0, 1], [0, 1]], color: 1, weight: 2 },
    { shape: [[0, 0, 1], [1, 1, 1]], color: 2, weight: 2 },

    // T-shapes (low frequency)
    { shape: [[1, 1, 1], [0, 1, 0]], color: 3, weight: 2 },
    { shape: [[0, 1], [1, 1], [0, 1]], color: 4, weight: 2 },

    // Z-shapes (very low frequency)
    { shape: [[1, 1, 0], [0, 1, 1]], color: 5, weight: 1 },
    { shape: [[0, 1, 1], [1, 1, 0]], color: 6, weight: 1 },
];

// Calculate total weight for weighted random selection
const TOTAL_WEIGHT = PIECES.reduce((sum, p) => sum + p.weight, 0);

// ==================== GAME STATE ====================

let board = [];
let currentPieces = [null, null, null];
let score = 0;
let combo = 0;
let selectedPieceIndex = null;
let draggedPieceIndex = null;

// Undo state (one step only)
let undoState = null;
let canUndo = false;

// Player management
let players = [];
let currentPlayerIndex = 0;
let gameStarted = false;

// Sound
let soundEnabled = true;
let audioContext = null;
let userInteracted = false;

// Timer
let timerInterval = null;
let timerSeconds = 0;
let isPaused = false;

// Obstacle Mode
let obstacleModeEnabled = false;
const OBSTACLE_VALUE = -1; // Special value for obstacles

// Music
let musicEnabled = true;
let musicVolume = 0.5;
let musicTracks = [];
let currentTrackIndex = 0;
let audioElement = null;
let isMusicPlaying = false;

// Shop
let shopItems = [];
const SHOP_REFRESH_COST = 10;
const BLOCK_BASE_COST = 15; // Base cost for buying a block

// Leaderboard (stored in localStorage + JSONBin.io for global sync)
const LEADERBOARD_KEY = 'blastdrop_leaderboard';

// JSONBin.io Global Leaderboard
const JSONBIN_BIN_ID = '69888f4f43b1c97be96eb0d4';
const JSONBIN_ACCESS_KEY = '$2a$10$Nfgf3kBwUxV0aJ2QbH9dJ.3bDGDAuXkqpxul11ESJUJ8r7Plwxekm';
const JSONBIN_API_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

// Character images for row clears
const CHARACTER_IMAGES = {
    5: 'pictures/Mega Charizard X.png',
    4: 'pictures/Mega Charizard Y.png',
    3: 'pictures/Pikachu.png',
    2: 'pictures/Pidgeotto.png',
    1: 'pictures/Raticate.png'
};

// ==================== DOM ELEMENTS ====================

// Start screen
const startScreen = document.getElementById('start-screen');
const playerNameInput = document.getElementById('player-name-input');
const addPlayerBtn = document.getElementById('add-player-btn');
const playerListEl = document.getElementById('player-list');
const startGameBtn = document.getElementById('start-game-btn');
const obstacleModeToggle = document.getElementById('obstacle-mode-toggle');
const leaderboardBtn = document.getElementById('leaderboard-btn');

// Game screen
const gameScreen = document.getElementById('game-screen');
const boardEl = document.getElementById('board');
const pieceTrayEl = document.getElementById('piece-tray');
const scoreEl = document.getElementById('score');
const currentPlayerNameEl = document.getElementById('current-player-name');
const scoreboardEl = document.getElementById('scoreboard');
const soundToggle = document.getElementById('sound-toggle');
const undoBtn = document.getElementById('undo-btn');

// Timer
const timerDisplay = document.getElementById('timer-display');

// Header buttons
const shopBtn = document.getElementById('shop-btn');
const pauseBtn = document.getElementById('pause-btn');
const settingsBtn = document.getElementById('settings-btn');
const musicToggle = document.getElementById('music-toggle');

// Character container (replaces Pikachu)
const characterContainer = document.getElementById('character-container');
const characterImage = document.getElementById('character-image');

// Board clear celebration
const boardClearCelebration = document.getElementById('board-clear-celebration');

// Turn over overlay
const turnOverOverlay = document.getElementById('turn-over-overlay');
const turnPlayerNameEl = document.getElementById('turn-player-name');
const turnScoreEl = document.getElementById('turn-score');
const nextPlayerBtn = document.getElementById('next-player-btn');

// Game complete overlay
const gameCompleteOverlay = document.getElementById('game-complete-overlay');
const finalRankingsEl = document.getElementById('final-rankings');
const playAgainBtn = document.getElementById('play-again-btn');

// Pause overlay
const pauseOverlay = document.getElementById('pause-overlay');
const resumeBtn = document.getElementById('resume-btn');

// Shop overlay
const shopOverlay = document.getElementById('shop-overlay');
const shopPointsDisplay = document.getElementById('shop-points-display');
const shopItemsEl = document.getElementById('shop-items');
const refreshShopBtn = document.getElementById('refresh-shop-btn');
const closeShopBtn = document.getElementById('close-shop-btn');
const shopMessage = document.getElementById('shop-message');

// End game overlay
const endGameOverlay = document.getElementById('end-game-overlay');
const endGameBtn = document.getElementById('end-game-btn');
const confirmEndGameBtn = document.getElementById('confirm-end-game-btn');
const cancelEndGameBtn = document.getElementById('cancel-end-game-btn');

// Settings overlay
const settingsOverlay = document.getElementById('settings-overlay');
const settingsSoundToggle = document.getElementById('settings-sound-toggle');
const settingsMusicToggle = document.getElementById('settings-music-toggle');
const musicVolumeSlider = document.getElementById('music-volume-slider');
const volumeDisplay = document.getElementById('volume-display');
const closeSettingsBtn = document.getElementById('close-settings-btn');

// Leaderboard overlay
const leaderboardOverlay = document.getElementById('leaderboard-overlay');
const leaderboardList = document.getElementById('leaderboard-list');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');

// Ghost preview
const ghostPreview = document.getElementById('ghost-preview');

// ==================== SOUND SYSTEM ====================

function initAudio() {
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('Web Audio API not supported');
    }
}

function playSound(type) {
    if (!soundEnabled || !audioContext || !userInteracted) return;

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const now = audioContext.currentTime;

    if (type === 'place') {
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
    } else if (type === 'blast') {
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        oscillator.frequency.exponentialRampToValueAtTime(1000, now + 0.25);
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        oscillator.start(now);
        oscillator.stop(now + 0.35);

        // Second oscillator for richer sound
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.setValueAtTime(600, now);
        osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.15, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc2.start(now);
        osc2.stop(now + 0.3);
    } else if (type === 'gameOver') {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.15, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.2);
        });
    } else if (type === 'undo') {
        oscillator.frequency.setValueAtTime(500, now);
        oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const soundOn = soundToggle.querySelector('.sound-on');
    const soundOff = soundToggle.querySelector('.sound-off');

    if (soundEnabled) {
        soundOn.classList.remove('hidden');
        soundOff.classList.add('hidden');
    } else {
        soundOn.classList.add('hidden');
        soundOff.classList.remove('hidden');
    }

    localStorage.setItem('blastdrop_sound', soundEnabled ? 'on' : 'off');
}

function loadSoundPreference() {
    const saved = localStorage.getItem('blastdrop_sound');
    if (saved === 'off') {
        soundEnabled = false;
        soundToggle.querySelector('.sound-on').classList.add('hidden');
        soundToggle.querySelector('.sound-off').classList.remove('hidden');
    }
}

// ==================== TIMER SYSTEM ====================

function startTimer() {
    timerSeconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        if (!isPaused && !shopOpen) {
            timerSeconds++;
            updateTimerDisplay();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function pauseTimer() {
    isPaused = true;
}

function resumeTimer() {
    isPaused = false;
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ==================== PAUSE SYSTEM ====================

function pauseGame() {
    if (!gameStarted || isPaused) return;

    isPaused = true;
    pauseTimer();
    pauseMusic();
    pauseOverlay.classList.remove('hidden');
}

function resumeGame() {
    if (!isPaused) return;

    isPaused = false;
    resumeTimer();
    if (musicEnabled) {
        resumeMusic();
    }
    pauseOverlay.classList.add('hidden');
}

// ==================== MUSIC SYSTEM ====================

async function loadMusicTracks() {
    // List of known tracks in the music folder (with track numbers)
    const trackFiles = [
        '1-01. Opening.mp3',
        '1-02. Theme Of Pallet Town.mp3',
        '1-03. Professor Oak.mp3',
        '1-04. Oak\'s Laboratory.mp3',
        '1-05. Rival Appears.mp3',
        '1-06. Road to Viridian City – From Pallet.mp3',
        '1-07. Battle (VS Wild Pokémon).mp3',
        '1-08. Victory (VS Wild Pokémon).mp3',
        '1-09. Theme Of Pewter City.mp3',
        '1-10. Pokémon Center.mp3',
        '1-17. Mt. Moon.mp3',
        '1-23. Theme Of Vermillion City.mp3'
    ];

    musicTracks = trackFiles.map(file => `music/${file}`);

    // Shuffle tracks for variety
    shuffleArray(musicTracks);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function initMusicPlayer() {
    if (audioElement) return;

    audioElement = new Audio();
    audioElement.volume = musicVolume;

    audioElement.addEventListener('ended', () => {
        playNextTrack();
    });

    audioElement.addEventListener('error', (e) => {
        console.log('Error loading track, skipping...');
        playNextTrack();
    });
}

function startMusic() {
    if (!musicEnabled || musicTracks.length === 0) return;

    initMusicPlayer();
    currentTrackIndex = 0;
    playCurrentTrack();
}

let musicRetryCount = 0;
const MAX_MUSIC_RETRIES = 3;

function playCurrentTrack() {
    if (!audioElement || musicTracks.length === 0) return;

    audioElement.src = musicTracks[currentTrackIndex];
    audioElement.volume = musicVolume;

    audioElement.play().then(() => {
        isMusicPlaying = true;
        musicRetryCount = 0; // Reset on success
    }).catch(e => {
        console.log('Could not play music:', e);
        musicRetryCount++;
        if (musicRetryCount < MAX_MUSIC_RETRIES) {
            // Try next track
            playNextTrack();
        } else {
            console.log('Max music retries reached, stopping music attempts');
            musicRetryCount = 0;
        }
    });
}

function playNextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % musicTracks.length;
    playCurrentTrack();
}

function pauseMusic() {
    if (audioElement && isMusicPlaying) {
        audioElement.pause();
    }
}

function resumeMusic() {
    if (audioElement && musicEnabled) {
        audioElement.play().catch(e => console.log('Could not resume music'));
    }
}

function stopMusic() {
    if (audioElement) {
        // Fade out
        const fadeInterval = setInterval(() => {
            if (audioElement.volume > 0.05) {
                audioElement.volume = Math.max(0, audioElement.volume - 0.05);
            } else {
                clearInterval(fadeInterval);
                audioElement.pause();
                audioElement.volume = musicVolume;
                isMusicPlaying = false;
            }
        }, 50);
    }
}

function toggleMusic() {
    musicEnabled = !musicEnabled;
    const musicOn = musicToggle.querySelector('.music-on');
    const musicOff = musicToggle.querySelector('.music-off');

    if (musicEnabled) {
        musicOn.classList.remove('hidden');
        musicOff.classList.add('hidden');
        if (!isPaused) {
            resumeMusic();
        }
    } else {
        musicOn.classList.add('hidden');
        musicOff.classList.remove('hidden');
        pauseMusic();
    }

    saveMusicPreferences();
}

function setMusicVolume(volume) {
    musicVolume = volume / 100;
    if (audioElement) {
        audioElement.volume = musicVolume;
    }
    volumeDisplay.textContent = `${volume}%`;
    saveMusicPreferences();
}

function saveMusicPreferences() {
    localStorage.setItem('blastdrop_music', musicEnabled ? 'on' : 'off');
    localStorage.setItem('blastdrop_music_volume', (musicVolume * 100).toString());
}

function loadMusicPreferences() {
    const savedMusic = localStorage.getItem('blastdrop_music');
    const savedVolume = localStorage.getItem('blastdrop_music_volume');

    if (savedMusic === 'off') {
        musicEnabled = false;
        if (musicToggle) {
            musicToggle.querySelector('.music-on').classList.add('hidden');
            musicToggle.querySelector('.music-off').classList.remove('hidden');
        }
        if (settingsMusicToggle) {
            settingsMusicToggle.checked = false;
        }
    }

    if (savedVolume) {
        musicVolume = parseInt(savedVolume) / 100;
        if (musicVolumeSlider) {
            musicVolumeSlider.value = savedVolume;
        }
        if (volumeDisplay) {
            volumeDisplay.textContent = `${savedVolume}%`;
        }
    }
}

// ==================== LEADERBOARD SYSTEM ====================

function loadLeaderboard() {
    const saved = localStorage.getItem(LEADERBOARD_KEY);
    if (saved) {
        return JSON.parse(saved);
    }
    return {};
}

function saveLeaderboard(leaderboard) {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
}

// ==================== GLOBAL LEADERBOARD (JSONBin.io) ====================

async function fetchGlobalLeaderboard() {
    try {
        const response = await fetch(`${JSONBIN_API_URL}/latest`, {
            method: 'GET',
            headers: {
                'X-Access-Key': JSONBIN_ACCESS_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.record || {};
    } catch (error) {
        console.log('Failed to fetch global leaderboard:', error);
        return null;
    }
}

async function saveGlobalLeaderboard(leaderboardData) {
    try {
        const response = await fetch(JSONBIN_API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Access-Key': JSONBIN_ACCESS_KEY
            },
            body: JSON.stringify(leaderboardData)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return true;
    } catch (error) {
        console.log('Failed to save to global leaderboard:', error);
        return false;
    }
}

function mergeLeaderboards(local, global) {
    const merged = { ...global };
    for (const [name, score] of Object.entries(local)) {
        if (!merged[name] || merged[name] < score) {
            merged[name] = score;
        }
    }
    return merged;
}

let leaderboardSyncInProgress = false;

async function updateLeaderboard(playerName, playerScore) {
    // Always update local first (instant, offline-safe)
    const localLeaderboard = loadLeaderboard();
    if (!localLeaderboard[playerName] || localLeaderboard[playerName] < playerScore) {
        localLeaderboard[playerName] = playerScore;
        saveLeaderboard(localLeaderboard);
    }

    // Global sync with simple lock
    if (leaderboardSyncInProgress) return;
    leaderboardSyncInProgress = true;

    try {
        const globalData = await fetchGlobalLeaderboard();
        if (globalData !== null) {
            const merged = mergeLeaderboards(localLeaderboard, globalData);
            await saveGlobalLeaderboard(merged);
            saveLeaderboard(merged);
        }
    } catch (error) {
        console.log('Global leaderboard sync failed:', error);
    } finally {
        leaderboardSyncInProgress = false;
    }
}

function renderLeaderboardData(leaderboard, isOffline) {
    const entries = Object.entries(leaderboard)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

    leaderboardList.innerHTML = '';

    if (isOffline) {
        const offlineNotice = document.createElement('div');
        offlineNotice.className = 'leaderboard-offline-notice';
        offlineNotice.textContent = '(Offline - showing local scores only)';
        leaderboardList.appendChild(offlineNotice);
    }

    if (entries.length === 0) {
        leaderboardList.innerHTML = '<div class="leaderboard-empty">No scores yet. Play a game to get on the leaderboard!</div>';
        return;
    }

    entries.forEach(([name, score], index) => {
        const entry = document.createElement('div');
        entry.className = `leaderboard-entry${index < 3 ? ` rank-${index + 1}` : ''}`;
        entry.innerHTML = `
            <span class="leaderboard-rank">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1)}</span>
            <span class="leaderboard-name">${escapeHtml(name)}</span>
            <span class="leaderboard-score">${score}</span>
        `;
        leaderboardList.appendChild(entry);
    });
}

async function showLeaderboard() {
    // Show overlay immediately with loading state
    leaderboardList.innerHTML = '<div class="leaderboard-empty leaderboard-loading">Loading leaderboard...</div>';
    leaderboardOverlay.classList.remove('hidden');

    // Try to fetch global data
    const globalData = await fetchGlobalLeaderboard();
    const localData = loadLeaderboard();

    let displayData;
    let isOffline = false;
    if (globalData !== null) {
        displayData = mergeLeaderboards(localData, globalData);
        saveLeaderboard(displayData);
    } else {
        displayData = localData;
        isOffline = true;
    }

    renderLeaderboardData(displayData, isOffline);
}

function hideLeaderboard() {
    leaderboardOverlay.classList.add('hidden');
}

// ==================== CHARACTER ANIMATION ====================

function showCharacter(linesCleared) {
    // Determine which character to show based on lines cleared
    const clampedLines = Math.min(5, Math.max(1, linesCleared));
    const imagePath = CHARACTER_IMAGES[clampedLines];

    if (!imagePath) return;

    characterImage.src = imagePath;
    characterContainer.classList.remove('hidden');

    // Reset animation
    characterImage.style.animation = 'none';
    characterImage.offsetHeight; // Trigger reflow
    characterImage.style.animation = 'characterPop 1.2s ease-out forwards';

    // Hide after animation
    setTimeout(() => {
        characterContainer.classList.add('hidden');
    }, 1200);
}

// ==================== BOARD CLEAR CELEBRATION ====================

function showBoardClearCelebration() {
    boardClearCelebration.classList.remove('hidden');

    // Reset animation
    boardClearCelebration.style.animation = 'none';
    boardClearCelebration.offsetHeight;
    boardClearCelebration.style.animation = 'celebrationFlash 1.5s ease-out forwards';

    // Hide after animation
    setTimeout(() => {
        boardClearCelebration.classList.add('hidden');
    }, 1500);
}

function isBoardEmpty() {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const value = board[row][col];
            // Check if cell is filled (not empty, not obstacle)
            if (value > 0) {
                return false;
            }
        }
    }
    return true;
}

// ==================== OBSTACLE SYSTEM ====================

function generateObstacles() {
    if (!obstacleModeEnabled) return;

    // Generate 6-10 random obstacle positions
    const obstacleCount = 6 + Math.floor(Math.random() * 5);
    const positions = new Set();

    while (positions.size < obstacleCount) {
        const row = Math.floor(Math.random() * BOARD_SIZE);
        const col = Math.floor(Math.random() * BOARD_SIZE);
        positions.add(`${row}-${col}`);
    }

    positions.forEach(pos => {
        const [row, col] = pos.split('-').map(Number);
        board[row][col] = OBSTACLE_VALUE;
    });
}

// ==================== SHOP SYSTEM ====================

function generateShopItems() {
    shopItems = [];

    for (let i = 0; i < 3; i++) {
        const piece = getRandomPiece();
        // Cost based on piece complexity (cells count)
        const cellCount = piece.shape.flat().filter(c => c === 1).length;
        const cost = BLOCK_BASE_COST + (cellCount - 1) * 5;

        shopItems.push({
            piece: piece,
            cost: cost
        });
    }
}

function renderShopItems() {
    shopPointsDisplay.textContent = score;
    shopItemsEl.innerHTML = '';

    shopItems.forEach((item, index) => {
        const canAfford = score >= item.cost;
        const hasSpace = currentPieces.some(p => p === null);

        const itemEl = document.createElement('div');
        itemEl.className = `shop-item${!canAfford ? ' disabled' : ''}`;

        // Create piece preview
        const previewEl = document.createElement('div');
        previewEl.className = 'shop-item-preview';
        const rows = item.piece.shape.length;
        const cols = item.piece.shape[0].length;
        previewEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        previewEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'piece-cell';
                if (item.piece.shape[r][c] === 1) {
                    cell.classList.add(`color-${item.piece.color}`);
                } else {
                    cell.classList.add('empty');
                }
                previewEl.appendChild(cell);
            }
        }

        const costEl = document.createElement('div');
        costEl.className = 'shop-item-cost';
        costEl.textContent = `${item.cost} pts`;

        const buyBtn = document.createElement('button');
        buyBtn.className = 'shop-item-buy';
        buyBtn.textContent = 'Buy';
        buyBtn.disabled = !canAfford || !hasSpace;
        buyBtn.addEventListener('click', () => buyShopItem(index));

        itemEl.appendChild(previewEl);
        itemEl.appendChild(costEl);
        itemEl.appendChild(buyBtn);
        shopItemsEl.appendChild(itemEl);
    });

    // Update refresh button
    refreshShopBtn.disabled = score < SHOP_REFRESH_COST;
    refreshShopBtn.textContent = `🔄 Refresh (${SHOP_REFRESH_COST} pts)`;
}

function buyShopItem(index) {
    const item = shopItems[index];

    if (score < item.cost) {
        showShopMessage('Not enough points!', 'error');
        return;
    }

    // Find empty slot in hand
    const emptySlot = currentPieces.findIndex(p => p === null);
    if (emptySlot === -1) {
        showShopMessage('No space to add block!', 'error');
        return;
    }

    // Deduct cost
    score -= item.cost;
    updateScoreDisplay();

    // Add piece to hand
    currentPieces[emptySlot] = {
        shape: item.piece.shape.map(row => [...row]),
        color: item.piece.color
    };

    renderPieces();
    showShopMessage('Purchased!', 'success');

    // Refresh shop display
    renderShopItems();

    // Close shop after short delay
    setTimeout(() => {
        hideShop();
    }, 500);
}

function refreshShop() {
    if (score < SHOP_REFRESH_COST) {
        showShopMessage('Not enough points to refresh!', 'error');
        return;
    }

    score -= SHOP_REFRESH_COST;
    updateScoreDisplay();
    generateShopItems();
    renderShopItems();
    showShopMessage('Shop refreshed!', 'success');
}

function showShopMessage(text, type) {
    shopMessage.textContent = text;
    shopMessage.className = `shop-message ${type}`;
    shopMessage.classList.remove('hidden');

    setTimeout(() => {
        shopMessage.classList.add('hidden');
    }, 1500);
}

let shopOpen = false;

function openShop() {
    if (!gameStarted || isPaused) return;

    shopOpen = true;
    generateShopItems();
    renderShopItems();
    shopOverlay.classList.remove('hidden');
}

function hideShop() {
    shopOverlay.classList.add('hidden');
    shopOpen = false;
}

// ==================== SETTINGS ====================

function openSettings() {
    settingsSoundToggle.checked = soundEnabled;
    settingsMusicToggle.checked = musicEnabled;
    musicVolumeSlider.value = musicVolume * 100;
    volumeDisplay.textContent = `${Math.round(musicVolume * 100)}%`;
    settingsOverlay.classList.remove('hidden');
}

function closeSettings() {
    settingsOverlay.classList.add('hidden');
}

// ==================== UNDO SYSTEM ====================

function saveUndoState() {
    undoState = {
        board: board.map(row => [...row]),
        currentPieces: currentPieces.map(p => p ? { ...p, shape: p.shape.map(r => [...r]) } : null),
        score: score,
        combo: combo
    };
    canUndo = true;
    undoBtn.disabled = false;
}

function performUndo() {
    if (!canUndo || !undoState) return;

    board = undoState.board.map(row => [...row]);
    currentPieces = undoState.currentPieces.map(p => p ? { ...p, shape: p.shape.map(r => [...r]) } : null);
    score = undoState.score;
    combo = undoState.combo;

    canUndo = false;
    undoState = null;
    undoBtn.disabled = true;

    playSound('undo');
    renderBoard();
    renderPieces();
    updateScoreDisplay();
}

function clearUndoState() {
    undoState = null;
    canUndo = false;
    undoBtn.disabled = true;
}

// ==================== PLAYER MANAGEMENT ====================

function addPlayer(name) {
    name = name.trim();
    if (!name) {
        name = `Player ${players.length + 1}`;
    }

    players.push({
        name: name,
        score: 0,
        finished: false
    });

    renderPlayerList();
    updateStartButton();
}

function removePlayer(index) {
    players.splice(index, 1);
    renderPlayerList();
    updateStartButton();
}

function renderPlayerList() {
    playerListEl.innerHTML = '';

    players.forEach((player, index) => {
        const entry = document.createElement('div');
        entry.className = 'player-entry';
        entry.innerHTML = `
            <span class="player-number">${index + 1}.</span>
            <span class="player-name">${escapeHtml(player.name)}</span>
            <button class="remove-player-btn" data-index="${index}">&times;</button>
        `;
        playerListEl.appendChild(entry);
    });

    playerListEl.querySelectorAll('.remove-player-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            removePlayer(index);
        });
    });
}

function updateStartButton() {
    startGameBtn.disabled = players.length === 0;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== SCOREBOARD ====================

function renderScoreboard() {
    scoreboardEl.innerHTML = '';

    const sortedPlayers = players.map((p, i) => ({ ...p, originalIndex: i }));

    sortedPlayers.forEach((player) => {
        const entry = document.createElement('div');
        entry.className = 'scoreboard-entry';

        if (player.originalIndex === currentPlayerIndex && !players[currentPlayerIndex].finished) {
            entry.classList.add('current');
        } else if (player.finished) {
            entry.classList.add('finished');
        } else {
            entry.classList.add('waiting');
        }

        entry.innerHTML = `
            <span class="entry-name">${escapeHtml(player.name)}</span>
            <span class="entry-score">${player.score}</span>
            ${player.finished ? '<span class="entry-status">Done</span>' : ''}
        `;

        scoreboardEl.appendChild(entry);
    });
}

// ==================== INITIALIZATION ====================

function initBoard() {
    board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    boardEl.innerHTML = '';

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            boardEl.appendChild(cell);
        }
    }
}

function startGame() {
    if (players.length === 0) return;

    gameStarted = true;
    currentPlayerIndex = 0;
    obstacleModeEnabled = obstacleModeToggle ? obstacleModeToggle.checked : false;

    players.forEach(p => {
        p.score = 0;
        p.finished = false;
    });

    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    startPlayerTurn();
}

function startPlayerTurn() {
    const player = players[currentPlayerIndex];

    initBoard();
    generateObstacles(); // Add obstacles if mode is enabled
    score = 0;
    combo = 0;
    currentPieces = [null, null, null];
    clearUndoState();
    isPaused = false;
    shopOpen = false;

    currentPlayerNameEl.textContent = player.name;
    updateScoreDisplay();
    renderScoreboard();

    // Start timer for this player's turn
    stopTimer();
    startTimer();

    refillPieces();
    renderBoard();
    renderPieces();

    turnOverOverlay.classList.add('hidden');
    gameCompleteOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    shopOverlay.classList.add('hidden');
    endGameOverlay.classList.add('hidden');
}

function endPlayerTurn() {
    const player = players[currentPlayerIndex];
    player.score = score;
    player.finished = true;

    // Stop timer
    stopTimer();

    clearUndoState(); // Can't undo after turn ends

    // Update leaderboard with this player's score
    updateLeaderboard(player.name, score);

    playSound('gameOver');

    turnPlayerNameEl.textContent = player.name;
    turnScoreEl.textContent = score;

    const allDone = players.every(p => p.finished);

    if (allDone) {
        showGameComplete();
        stopMusic(); // Fade out music at end of game
    } else {
        turnOverOverlay.classList.remove('hidden');
    }
}

function nextPlayer() {
    do {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    } while (players[currentPlayerIndex].finished);

    startPlayerTurn();
}

function showGameComplete() {
    turnOverOverlay.classList.add('hidden');

    const sorted = [...players].sort((a, b) => b.score - a.score);

    finalRankingsEl.innerHTML = '';
    sorted.forEach((player, index) => {
        const entry = document.createElement('div');
        entry.className = `final-rank-entry rank-${index + 1}`;
        entry.innerHTML = `
            <span class="rank-position">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : (index + 1)}</span>
            <span class="rank-name">${escapeHtml(player.name)}</span>
            <span class="rank-score">${player.score}</span>
        `;
        finalRankingsEl.appendChild(entry);
    });

    gameCompleteOverlay.classList.remove('hidden');
}

function resetToStartScreen() {
    gameStarted = false;
    players = [];
    currentPlayerIndex = 0;
    isPaused = false;
    shopOpen = false;

    // Stop timer (music keeps playing on start screen)
    stopTimer();

    playerListEl.innerHTML = '';
    updateStartButton();

    gameScreen.classList.add('hidden');
    turnOverOverlay.classList.add('hidden');
    gameCompleteOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    shopOverlay.classList.add('hidden');
    settingsOverlay.classList.add('hidden');
    endGameOverlay.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

// ==================== END GAME ====================

function showEndGameConfirmation() {
    if (!gameStarted) return;
    endGameOverlay.classList.remove('hidden');
}

function hideEndGameConfirmation() {
    endGameOverlay.classList.add('hidden');
}

function confirmEndGame() {
    hideEndGameConfirmation();

    // End all remaining players' turns with their current scores
    players.forEach(p => {
        if (!p.finished) {
            // Save current player's score if they're the active one
            if (players.indexOf(p) === currentPlayerIndex) {
                p.score = score;
            }
            p.finished = true;
            updateLeaderboard(p.name, p.score);
        }
    });

    stopTimer();
    showGameComplete();
    stopMusic();
}

// ==================== RENDERING ====================

function renderBoard() {
    const cells = boardEl.querySelectorAll('.cell');
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const value = board[row][col];

        cell.className = 'cell';

        if (value === OBSTACLE_VALUE) {
            cell.classList.add('obstacle');
        } else if (value > 0) {
            cell.classList.add('filled', `color-${value}`);
        }
    });
}

function renderPieces() {
    for (let i = 0; i < PIECE_COUNT; i++) {
        const slot = document.getElementById(`piece-slot-${i}`);
        slot.innerHTML = '';

        const piece = currentPieces[i];
        if (!piece) continue;

        const pieceEl = createPieceElement(piece, i);
        slot.appendChild(pieceEl);
    }
}

function createPieceElement(piece, index) {
    const pieceEl = document.createElement('div');
    pieceEl.className = 'piece';
    pieceEl.dataset.index = index;
    pieceEl.draggable = true;

    const rows = piece.shape.length;
    const cols = piece.shape[0].length;

    pieceEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    pieceEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'piece-cell';

            if (piece.shape[r][c] === 1) {
                cell.classList.add(`color-${piece.color}`);
            } else {
                cell.classList.add('empty');
            }

            pieceEl.appendChild(cell);
        }
    }

    return pieceEl;
}

function updateScoreDisplay() {
    scoreEl.textContent = score;

    if (players[currentPlayerIndex]) {
        players[currentPlayerIndex].score = score;
        renderScoreboard();
    }
}

// ==================== PIECE MANAGEMENT ====================

function getRandomPiece() {
    // Weighted random selection
    let random = Math.random() * TOTAL_WEIGHT;
    let piece = PIECES[0];

    for (const p of PIECES) {
        random -= p.weight;
        if (random <= 0) {
            piece = p;
            break;
        }
    }

    return {
        shape: piece.shape.map(row => [...row]),
        color: Math.floor(Math.random() * 8) + 1
    };
}

function refillPieces() {
    const allPlaced = currentPieces.every(p => p === null);
    if (!allPlaced) return;

    let attempts = 0;
    const maxAttempts = 10;

    do {
        for (let i = 0; i < PIECE_COUNT; i++) {
            currentPieces[i] = getRandomPiece();
        }
        attempts++;
    } while (!canPlaceAnyPiece() && attempts < maxAttempts);

    renderPieces();
}

function canPlaceAnyPiece() {
    return currentPieces.some(piece => {
        if (!piece) return false;
        return canPlaceAnywhere(piece);
    });
}

// ==================== PLACEMENT LOGIC ====================

function canPlace(piece, startRow, startCol) {
    if (!piece) return false;

    const rows = piece.shape.length;
    const cols = piece.shape[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (piece.shape[r][c] === 1) {
                const boardRow = startRow + r;
                const boardCol = startCol + c;

                if (boardRow < 0 || boardRow >= BOARD_SIZE ||
                    boardCol < 0 || boardCol >= BOARD_SIZE) {
                    return false;
                }

                // Check for obstacles (OBSTACLE_VALUE) or filled cells (> 0)
                if (board[boardRow][boardCol] !== 0) {
                    return false;
                }
            }
        }
    }

    return true;
}

function canPlaceAnywhere(piece) {
    if (!piece) return false;

    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (canPlace(piece, row, col)) {
                return true;
            }
        }
    }

    return false;
}

// Find nearest valid placement (magnet snap feature)
function findNearestValidPlacement(piece, targetRow, targetCol) {
    if (!piece) return null;

    // First check exact position
    if (canPlace(piece, targetRow, targetCol)) {
        return { row: targetRow, col: targetCol };
    }

    // Search in expanding radius for valid placement
    const maxRadius = 2;
    for (let radius = 1; radius <= maxRadius; radius++) {
        for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
                if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue; // Only check perimeter

                const row = targetRow + dr;
                const col = targetCol + dc;

                if (canPlace(piece, row, col)) {
                    return { row, col };
                }
            }
        }
    }

    return null;
}

function placePiece(pieceIndex, startRow, startCol, useSnap = true) {
    const piece = currentPieces[pieceIndex];
    if (!piece) return false;

    // Try exact placement first
    let placement = { row: startRow, col: startCol };

    // If exact placement fails and snap is enabled, find nearest valid
    if (!canPlace(piece, startRow, startCol)) {
        if (useSnap) {
            const snapped = findNearestValidPlacement(piece, startRow, startCol);
            if (snapped) {
                placement = snapped;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    // Save state for undo BEFORE making changes
    saveUndoState();

    const rows = piece.shape.length;
    const cols = piece.shape[0].length;
    let cellsPlaced = 0;
    const placedCells = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (piece.shape[r][c] === 1) {
                const boardRow = placement.row + r;
                const boardCol = placement.col + c;
                board[boardRow][boardCol] = piece.color;
                cellsPlaced++;
                placedCells.push({ row: boardRow, col: boardCol });
            }
        }
    }

    currentPieces[pieceIndex] = null;
    selectedPieceIndex = null;

    playSound('place');

    renderBoard();
    placedCells.forEach(({ row, col }) => {
        const cell = getCellElement(row, col);
        if (cell) {
            cell.classList.add('placed');
            setTimeout(() => cell.classList.remove('placed'), 250);
        }
    });
    renderPieces();

    const linesCleared = checkAndClearLines();

    calculateScore(cellsPlaced, linesCleared);

    // Show character animation based on lines cleared
    if (linesCleared > 0) {
        showCharacter(linesCleared);
    }

    if (currentPieces.every(p => p === null)) {
        setTimeout(() => {
            refillPieces();
            if (isGameOver()) {
                endPlayerTurn();
            }
        }, linesCleared > 0 ? 500 : 100);
    } else if (isGameOver()) {
        setTimeout(() => endPlayerTurn(), linesCleared > 0 ? 500 : 100);
    }

    return true;
}

// ==================== LINE CLEARING ====================

function checkAndClearLines() {
    const rowsToClear = [];
    const colsToClear = [];

    // Check rows - a row is complete when all non-obstacle cells are filled
    for (let row = 0; row < BOARD_SIZE; row++) {
        let complete = true;

        for (let col = 0; col < BOARD_SIZE; col++) {
            const value = board[row][col];
            // Obstacles count as "filled" for line completion
            // Empty cells (0) mean the row is not complete
            if (value === 0) {
                complete = false;
                break;
            }
        }

        if (complete) {
            rowsToClear.push(row);
        }
    }

    // Check columns
    for (let col = 0; col < BOARD_SIZE; col++) {
        let complete = true;

        for (let row = 0; row < BOARD_SIZE; row++) {
            const value = board[row][col];
            if (value === 0) {
                complete = false;
                break;
            }
        }

        if (complete) {
            colsToClear.push(col);
        }
    }

    const totalLines = rowsToClear.length + colsToClear.length;

    if (totalLines === 0) {
        combo = 0;
        return 0;
    }

    playSound('blast');

    const cellsToClear = new Set();

    rowsToClear.forEach(row => {
        for (let col = 0; col < BOARD_SIZE; col++) {
            // Don't clear obstacles - they remain permanently
            if (board[row][col] !== OBSTACLE_VALUE) {
                cellsToClear.add(`${row}-${col}`);
            }
        }
    });

    colsToClear.forEach(col => {
        for (let row = 0; row < BOARD_SIZE; row++) {
            // Don't clear obstacles - they remain permanently
            if (board[row][col] !== OBSTACLE_VALUE) {
                cellsToClear.add(`${row}-${col}`);
            }
        }
    });

    cellsToClear.forEach(key => {
        const [row, col] = key.split('-').map(Number);
        const cell = getCellElement(row, col);
        if (cell) {
            cell.classList.add('clearing');
        }
    });

    setTimeout(() => {
        cellsToClear.forEach(key => {
            const [row, col] = key.split('-').map(Number);
            board[row][col] = 0;
        });
        renderBoard();

        // Check if board is now empty (no colored blocks, only obstacles allowed)
        if (isBoardEmpty()) {
            showBoardClearCelebration();
        }
    }, 400);

    return totalLines;
}

function getCellElement(row, col) {
    return boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

// ==================== SCORING ====================

function calculateScore(cellsPlaced, linesCleared) {
    let points = cellsPlaced;

    if (linesCleared > 0) {
        points += linesCleared * 10 * linesCleared;

        combo++;
        if (combo > 1) {
            points += combo * 5;
        }
    } else {
        combo = 0;
    }

    score += points;
    updateScoreDisplay();
}

// ==================== GAME OVER ====================

function isGameOver() {
    for (const piece of currentPieces) {
        if (piece && canPlaceAnywhere(piece)) {
            return false;
        }
    }
    return true;
}

// ==================== EVENT HANDLERS ====================

function setupEventListeners() {
    // Start screen events
    addPlayerBtn.addEventListener('click', () => {
        addPlayer(playerNameInput.value);
        playerNameInput.value = '';
        playerNameInput.focus();
    });

    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addPlayer(playerNameInput.value);
            playerNameInput.value = '';
        }
    });

    startGameBtn.addEventListener('click', startGame);
    leaderboardBtn.addEventListener('click', showLeaderboard);
    closeLeaderboardBtn.addEventListener('click', hideLeaderboard);

    // Game events
    nextPlayerBtn.addEventListener('click', nextPlayer);
    playAgainBtn.addEventListener('click', resetToStartScreen);
    soundToggle.addEventListener('click', toggleSound);
    undoBtn.addEventListener('click', performUndo);

    // Pause events
    pauseBtn.addEventListener('click', pauseGame);
    resumeBtn.addEventListener('click', resumeGame);

    // End game events
    endGameBtn.addEventListener('click', showEndGameConfirmation);
    confirmEndGameBtn.addEventListener('click', confirmEndGame);
    cancelEndGameBtn.addEventListener('click', hideEndGameConfirmation);

    // Shop events
    shopBtn.addEventListener('click', openShop);
    closeShopBtn.addEventListener('click', hideShop);
    refreshShopBtn.addEventListener('click', refreshShop);

    // Music events
    musicToggle.addEventListener('click', toggleMusic);

    // Settings events
    settingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);

    settingsSoundToggle.addEventListener('change', (e) => {
        soundEnabled = e.target.checked;
        localStorage.setItem('blastdrop_sound', soundEnabled ? 'on' : 'off');

        const soundOn = soundToggle.querySelector('.sound-on');
        const soundOff = soundToggle.querySelector('.sound-off');
        if (soundEnabled) {
            soundOn.classList.remove('hidden');
            soundOff.classList.add('hidden');
        } else {
            soundOn.classList.add('hidden');
            soundOff.classList.remove('hidden');
        }
    });

    settingsMusicToggle.addEventListener('change', (e) => {
        musicEnabled = e.target.checked;
        saveMusicPreferences();

        const musicOn = musicToggle.querySelector('.music-on');
        const musicOff = musicToggle.querySelector('.music-off');
        if (musicEnabled) {
            musicOn.classList.remove('hidden');
            musicOff.classList.add('hidden');
            if (!isPaused) {
                resumeMusic();
            }
        } else {
            musicOn.classList.add('hidden');
            musicOff.classList.remove('hidden');
            pauseMusic();
        }
    });

    musicVolumeSlider.addEventListener('input', (e) => {
        setMusicVolume(parseInt(e.target.value));
    });

    // Board events
    boardEl.addEventListener('dragover', handleDragOver);
    boardEl.addEventListener('drop', handleDrop);
    boardEl.addEventListener('dragleave', handleDragLeave);
    boardEl.addEventListener('click', handleBoardClick);

    // Piece events
    pieceTrayEl.addEventListener('dragstart', handleDragStart);
    pieceTrayEl.addEventListener('dragend', handleDragEnd);
    pieceTrayEl.addEventListener('click', handlePieceClick);

    // Touch events
    pieceTrayEl.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    // Track user interaction for audio - start music on first interaction
    document.addEventListener('click', () => {
        if (!userInteracted) {
            userInteracted = true;
            initAudio();
            startMusic();
        }
    }, { once: false });

    document.addEventListener('touchstart', () => {
        if (!userInteracted) {
            userInteracted = true;
            initAudio();
            startMusic();
        }
    }, { once: false });
}

// Desktop Drag and Drop
function handleDragStart(e) {
    const piece = e.target.closest('.piece');
    if (!piece) return;

    const index = parseInt(piece.dataset.index);
    draggedPieceIndex = index;
    piece.classList.add('dragging');

    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    const piece = e.target.closest('.piece');
    if (piece) {
        piece.classList.remove('dragging');
    }
    draggedPieceIndex = null;
    clearPreview();
    hideGhost();
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedPieceIndex === null) return;

    const cell = e.target.closest('.cell');
    if (!cell) return;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const piece = currentPieces[draggedPieceIndex];

    showPreviewWithSnap(piece, row, col);
}

function handleDragLeave(e) {
    if (!e.relatedTarget || !boardEl.contains(e.relatedTarget)) {
        clearPreview();
    }
}

function handleDrop(e) {
    e.preventDefault();

    const cell = e.target.closest('.cell');
    if (!cell || draggedPieceIndex === null) return;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    clearPreview();
    placePiece(draggedPieceIndex, row, col, true); // Enable snap
    draggedPieceIndex = null;
}

// Piece selection
function handlePieceClick(e) {
    const piece = e.target.closest('.piece');
    if (!piece) return;

    const index = parseInt(piece.dataset.index);

    if (selectedPieceIndex === index) {
        selectedPieceIndex = null;
    } else {
        selectedPieceIndex = index;
    }

    document.querySelectorAll('.piece').forEach((p) => {
        if (parseInt(p.dataset.index) === selectedPieceIndex) {
            p.classList.add('selected');
        } else {
            p.classList.remove('selected');
        }
    });
}

function handleBoardClick(e) {
    if (selectedPieceIndex === null) return;

    const cell = e.target.closest('.cell');
    if (!cell) return;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    if (placePiece(selectedPieceIndex, row, col, true)) { // Enable snap
        document.querySelectorAll('.piece').forEach(p => p.classList.remove('selected'));
    }
}

// Touch handling
let touchPieceIndex = null;
let touchStartX = 0;
let touchStartY = 0;
let isTouchDragging = false;

function handleTouchStart(e) {
    const piece = e.target.closest('.piece');
    if (!piece) return;

    touchPieceIndex = parseInt(piece.dataset.index);
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isTouchDragging = false;

    // Prevent page scroll while touching piece
    e.preventDefault();
}

function handleTouchMove(e) {
    if (touchPieceIndex === null) return;

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartX);
    const dy = Math.abs(touch.clientY - touchStartY);

    if (dx > 10 || dy > 10) {
        isTouchDragging = true;
        e.preventDefault(); // Prevent page scroll
    }

    if (!isTouchDragging) return;

    const piece = currentPieces[touchPieceIndex];
    if (piece) {
        showGhost(piece, touch.clientX, touch.clientY);
    }

    const boardRect = boardEl.getBoundingClientRect();
    const cellSize = boardRect.width / BOARD_SIZE;

    const relX = touch.clientX - boardRect.left;
    const relY = touch.clientY - boardRect.top;

    const col = Math.floor(relX / cellSize);
    const row = Math.floor(relY / cellSize);

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        showPreviewWithSnap(piece, row, col);
    } else {
        clearPreview();
    }
}

function handleTouchEnd(e) {
    if (touchPieceIndex === null) return;

    if (isTouchDragging) {
        const touch = e.changedTouches[0];
        const boardRect = boardEl.getBoundingClientRect();
        const cellSize = boardRect.width / BOARD_SIZE;

        const relX = touch.clientX - boardRect.left;
        const relY = touch.clientY - boardRect.top;

        const col = Math.floor(relX / cellSize);
        const row = Math.floor(relY / cellSize);

        clearPreview();
        hideGhost();

        if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
            placePiece(touchPieceIndex, row, col, true); // Enable snap
        }
    }

    touchPieceIndex = null;
    isTouchDragging = false;
}

// Preview with snap support
function showPreviewWithSnap(piece, startRow, startCol) {
    clearPreview();

    if (!piece) return;

    // Try exact position first, then snap
    let placement = { row: startRow, col: startCol };
    let valid = canPlace(piece, startRow, startCol);

    if (!valid) {
        const snapped = findNearestValidPlacement(piece, startRow, startCol);
        if (snapped) {
            placement = snapped;
            valid = true;
        }
    }

    const rows = piece.shape.length;
    const cols = piece.shape[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (piece.shape[r][c] === 1) {
                const boardRow = placement.row + r;
                const boardCol = placement.col + c;

                if (boardRow >= 0 && boardRow < BOARD_SIZE &&
                    boardCol >= 0 && boardCol < BOARD_SIZE) {
                    const cell = getCellElement(boardRow, boardCol);
                    if (cell) {
                        cell.classList.add(valid ? 'preview-valid' : 'preview-invalid');
                    }
                }
            }
        }
    }
}

function clearPreview() {
    boardEl.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('preview-valid', 'preview-invalid');
    });
}

function showGhost(piece, x, y) {
    if (!piece) return;

    const rows = piece.shape.length;
    const cols = piece.shape[0].length;

    // Calculate cell size from actual board dimensions
    const boardRect = boardEl.getBoundingClientRect();
    const cellSize = Math.floor(boardRect.width / BOARD_SIZE);
    const gap = 4;

    ghostPreview.innerHTML = '';
    ghostPreview.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    ghostPreview.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'ghost-cell';
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;

            if (piece.shape[r][c] === 1) {
                cell.classList.add(`color-${piece.color}`);
            } else {
                cell.classList.add('empty');
            }

            ghostPreview.appendChild(cell);
        }
    }

    const ghostWidth = cols * (cellSize + gap);
    const ghostHeight = rows * (cellSize + gap);
    ghostPreview.style.left = `${x - ghostWidth / 2}px`;
    ghostPreview.style.top = `${y - ghostHeight / 2}px`;
    ghostPreview.classList.remove('hidden');
}

function hideGhost() {
    ghostPreview.classList.add('hidden');
}

// ==================== START ====================

document.addEventListener('DOMContentLoaded', () => {
    loadSoundPreference();
    loadMusicPreferences();
    loadMusicTracks();
    setupEventListeners();
});
