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

// ==================== DOM ELEMENTS ====================

// Start screen
const startScreen = document.getElementById('start-screen');
const playerNameInput = document.getElementById('player-name-input');
const addPlayerBtn = document.getElementById('add-player-btn');
const playerListEl = document.getElementById('player-list');
const startGameBtn = document.getElementById('start-game-btn');

// Game screen
const gameScreen = document.getElementById('game-screen');
const boardEl = document.getElementById('board');
const pieceTrayEl = document.getElementById('piece-tray');
const scoreEl = document.getElementById('score');
const currentPlayerNameEl = document.getElementById('current-player-name');
const scoreboardEl = document.getElementById('scoreboard');
const soundToggle = document.getElementById('sound-toggle');
const undoBtn = document.getElementById('undo-btn');

// Pikachu
const pikachuContainer = document.getElementById('pikachu-container');

// Turn over overlay
const turnOverOverlay = document.getElementById('turn-over-overlay');
const turnPlayerNameEl = document.getElementById('turn-player-name');
const turnScoreEl = document.getElementById('turn-score');
const nextPlayerBtn = document.getElementById('next-player-btn');

// Game complete overlay
const gameCompleteOverlay = document.getElementById('game-complete-overlay');
const finalRankingsEl = document.getElementById('final-rankings');
const playAgainBtn = document.getElementById('play-again-btn');

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

// ==================== PIKACHU ANIMATION ====================

function showPikachu() {
    pikachuContainer.classList.remove('hidden');

    // Remove and re-add to restart animation
    const pikachu = pikachuContainer.querySelector('.pikachu');
    pikachu.style.animation = 'none';
    pikachu.offsetHeight; // Trigger reflow
    pikachu.style.animation = 'pikachuJump 1s ease-out forwards';

    // Hide after animation
    setTimeout(() => {
        pikachuContainer.classList.add('hidden');
    }, 1000);
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
    score = 0;
    combo = 0;
    currentPieces = [null, null, null];
    clearUndoState();

    currentPlayerNameEl.textContent = player.name;
    updateScoreDisplay();
    renderScoreboard();

    refillPieces();
    renderBoard();
    renderPieces();

    turnOverOverlay.classList.add('hidden');
    gameCompleteOverlay.classList.add('hidden');
}

function endPlayerTurn() {
    const player = players[currentPlayerIndex];
    player.score = score;
    player.finished = true;

    clearUndoState(); // Can't undo after turn ends

    playSound('gameOver');

    turnPlayerNameEl.textContent = player.name;
    turnScoreEl.textContent = score;

    const allDone = players.every(p => p.finished);

    if (allDone) {
        showGameComplete();
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

    playerListEl.innerHTML = '';
    updateStartButton();

    gameScreen.classList.add('hidden');
    turnOverOverlay.classList.add('hidden');
    gameCompleteOverlay.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

// ==================== RENDERING ====================

function renderBoard() {
    const cells = boardEl.querySelectorAll('.cell');
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const value = board[row][col];

        cell.className = 'cell';

        if (value > 0) {
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

    // Show Pikachu if lines were cleared
    if (linesCleared > 0) {
        showPikachu();
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

    for (let row = 0; row < BOARD_SIZE; row++) {
        if (board[row].every(cell => cell !== 0)) {
            rowsToClear.push(row);
        }
    }

    for (let col = 0; col < BOARD_SIZE; col++) {
        let complete = true;
        for (let row = 0; row < BOARD_SIZE; row++) {
            if (board[row][col] === 0) {
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
            cellsToClear.add(`${row}-${col}`);
        }
    });

    colsToClear.forEach(col => {
        for (let row = 0; row < BOARD_SIZE; row++) {
            cellsToClear.add(`${row}-${col}`);
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

    // Game events
    nextPlayerBtn.addEventListener('click', nextPlayer);
    playAgainBtn.addEventListener('click', resetToStartScreen);
    soundToggle.addEventListener('click', toggleSound);
    undoBtn.addEventListener('click', performUndo);

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

    // Track user interaction for audio
    document.addEventListener('click', () => {
        if (!userInteracted) {
            userInteracted = true;
            initAudio();
        }
    }, { once: false });

    document.addEventListener('touchstart', () => {
        if (!userInteracted) {
            userInteracted = true;
            initAudio();
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

    ghostPreview.innerHTML = '';
    ghostPreview.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    ghostPreview.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'ghost-cell';

            if (piece.shape[r][c] === 1) {
                cell.classList.add(`color-${piece.color}`);
            } else {
                cell.classList.add('empty');
            }

            ghostPreview.appendChild(cell);
        }
    }

    const ghostWidth = cols * 44;
    const ghostHeight = rows * 44;
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
    setupEventListeners();
});
