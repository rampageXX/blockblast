// ==================== CONSTANTS ====================

const BOARD_SIZE = 10;
const PIECE_COUNT = 3;

const COLORS = [
    null,       // 0 = empty
    '#e94560',  // 1 = red
    '#0f3460',  // 2 = dark blue
    '#f39c12',  // 3 = orange
    '#2ecc71',  // 4 = green
    '#9b59b6',  // 5 = purple
    '#1abc9c',  // 6 = teal
    '#e74c3c',  // 7 = coral
    '#3498db',  // 8 = sky blue
];

// Piece definitions: each has a shape (2D array) and color index
const PIECES = [
    // Single
    { shape: [[1]], color: 1 },

    // Lines horizontal
    { shape: [[1, 1]], color: 2 },
    { shape: [[1, 1, 1]], color: 3 },
    { shape: [[1, 1, 1, 1]], color: 4 },
    { shape: [[1, 1, 1, 1, 1]], color: 5 },

    // Lines vertical
    { shape: [[1], [1]], color: 6 },
    { shape: [[1], [1], [1]], color: 7 },
    { shape: [[1], [1], [1], [1]], color: 8 },
    { shape: [[1], [1], [1], [1], [1]], color: 1 },

    // Squares
    { shape: [[1, 1], [1, 1]], color: 2 },
    { shape: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: 3 },

    // L-shapes (4 orientations)
    { shape: [[1, 0], [1, 0], [1, 1]], color: 4 },
    { shape: [[1, 1, 1], [1, 0, 0]], color: 5 },
    { shape: [[1, 1], [0, 1], [0, 1]], color: 6 },
    { shape: [[0, 0, 1], [1, 1, 1]], color: 7 },

    // Reverse L-shapes
    { shape: [[0, 1], [0, 1], [1, 1]], color: 8 },
    { shape: [[1, 0, 0], [1, 1, 1]], color: 1 },
    { shape: [[1, 1], [1, 0], [1, 0]], color: 2 },
    { shape: [[1, 1, 1], [0, 0, 1]], color: 3 },

    // T-shapes (4 orientations)
    { shape: [[1, 1, 1], [0, 1, 0]], color: 4 },
    { shape: [[0, 1], [1, 1], [0, 1]], color: 5 },
    { shape: [[0, 1, 0], [1, 1, 1]], color: 6 },
    { shape: [[1, 0], [1, 1], [1, 0]], color: 7 },

    // Z-shapes
    { shape: [[1, 1, 0], [0, 1, 1]], color: 8 },
    { shape: [[0, 1, 1], [1, 1, 0]], color: 1 },
    { shape: [[1, 0], [1, 1], [0, 1]], color: 2 },
    { shape: [[0, 1], [1, 1], [1, 0]], color: 3 },

    // Small corners (2x2 L)
    { shape: [[1, 1], [1, 0]], color: 4 },
    { shape: [[1, 1], [0, 1]], color: 5 },
    { shape: [[1, 0], [1, 1]], color: 6 },
    { shape: [[0, 1], [1, 1]], color: 7 },
];

// ==================== GAME STATE ====================

let board = [];
let currentPieces = [null, null, null];
let score = 0;
let highScore = 0;
let combo = 0;
let selectedPieceIndex = null;
let draggedPieceIndex = null;

// ==================== DOM ELEMENTS ====================

const boardEl = document.getElementById('board');
const pieceTrayEl = document.getElementById('piece-tray');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const gameOverOverlay = document.getElementById('game-over-overlay');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const ghostPreview = document.getElementById('ghost-preview');

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

function initGame() {
    loadHighScore();
    initBoard();
    score = 0;
    combo = 0;
    updateScoreDisplay();
    refillPieces();
    renderBoard();
    renderPieces();
    hideGameOver();
    setupEventListeners();
}

// ==================== RENDERING ====================

function renderBoard() {
    const cells = boardEl.querySelectorAll('.cell');
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const value = board[row][col];

        // Remove all color classes
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
    highScoreEl.textContent = highScore;
}

// ==================== PIECE MANAGEMENT ====================

function getRandomPiece() {
    const index = Math.floor(Math.random() * PIECES.length);
    // Return a copy with a random color
    const piece = PIECES[index];
    return {
        shape: piece.shape.map(row => [...row]),
        color: Math.floor(Math.random() * 8) + 1
    };
}

function refillPieces() {
    // Only refill if all pieces are placed
    const allPlaced = currentPieces.every(p => p === null);
    if (!allPlaced) return;

    // Generate 3 new pieces with anti-frustration retry
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

                // Check bounds
                if (boardRow < 0 || boardRow >= BOARD_SIZE ||
                    boardCol < 0 || boardCol >= BOARD_SIZE) {
                    return false;
                }

                // Check if cell is occupied
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

function placePiece(pieceIndex, startRow, startCol) {
    const piece = currentPieces[pieceIndex];
    if (!piece || !canPlace(piece, startRow, startCol)) return false;

    const rows = piece.shape.length;
    const cols = piece.shape[0].length;
    let cellsPlaced = 0;
    const placedCells = [];

    // Place the piece on the board
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (piece.shape[r][c] === 1) {
                const boardRow = startRow + r;
                const boardCol = startCol + c;
                board[boardRow][boardCol] = piece.color;
                cellsPlaced++;
                placedCells.push({ row: boardRow, col: boardCol });
            }
        }
    }

    // Remove piece from tray
    currentPieces[pieceIndex] = null;
    selectedPieceIndex = null;

    // Render with placement animation
    renderBoard();
    placedCells.forEach(({ row, col }) => {
        const cell = getCellElement(row, col);
        if (cell) {
            cell.classList.add('placed');
            setTimeout(() => cell.classList.remove('placed'), 200);
        }
    });
    renderPieces();

    // Check and clear lines
    const linesCleared = checkAndClearLines();

    // Calculate score
    calculateScore(cellsPlaced, linesCleared);

    // Check if we need to refill
    if (currentPieces.every(p => p === null)) {
        setTimeout(() => {
            refillPieces();
            if (isGameOver()) {
                showGameOver();
            }
        }, linesCleared > 0 ? 450 : 100);
    } else if (isGameOver()) {
        setTimeout(() => showGameOver(), linesCleared > 0 ? 450 : 100);
    }

    return true;
}

// ==================== LINE CLEARING ====================

function checkAndClearLines() {
    const rowsToClear = [];
    const colsToClear = [];

    // Check rows
    for (let row = 0; row < BOARD_SIZE; row++) {
        if (board[row].every(cell => cell !== 0)) {
            rowsToClear.push(row);
        }
    }

    // Check columns
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

    // Animate clearing
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

    // Add clearing animation
    cellsToClear.forEach(key => {
        const [row, col] = key.split('-').map(Number);
        const cell = getCellElement(row, col);
        if (cell) {
            cell.classList.add('clearing');
        }
    });

    // Clear the cells after animation
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
    // Base points for cells placed
    let points = cellsPlaced;

    // Line clear bonus
    if (linesCleared > 0) {
        // Exponential bonus for multiple lines
        points += linesCleared * 10 * linesCleared;

        // Combo bonus
        combo++;
        if (combo > 1) {
            points += combo * 5;
        }
    } else {
        combo = 0;
    }

    score += points;

    // Update high score
    if (score > highScore) {
        highScore = score;
        saveHighScore();
    }

    updateScoreDisplay();
}

// ==================== GAME OVER ====================

function isGameOver() {
    // Check if any remaining piece can be placed
    for (const piece of currentPieces) {
        if (piece && canPlaceAnywhere(piece)) {
            return false;
        }
    }
    return true;
}

function showGameOver() {
    finalScoreEl.textContent = score;
    gameOverOverlay.classList.remove('hidden');
}

function hideGameOver() {
    gameOverOverlay.classList.add('hidden');
}

// ==================== PERSISTENCE ====================

function saveHighScore() {
    localStorage.setItem('blockblast_highscore', highScore.toString());
}

function loadHighScore() {
    const saved = localStorage.getItem('blockblast_highscore');
    if (saved) {
        highScore = parseInt(saved) || 0;
    }
}

// ==================== EVENT HANDLERS ====================

function setupEventListeners() {
    // Restart button
    restartBtn.addEventListener('click', initGame);

    // Board events for desktop drag and drop
    boardEl.addEventListener('dragover', handleDragOver);
    boardEl.addEventListener('drop', handleDrop);
    boardEl.addEventListener('dragleave', handleDragLeave);

    // Board click/touch for mobile tap-to-place
    boardEl.addEventListener('click', handleBoardClick);

    // Piece drag events - delegated
    pieceTrayEl.addEventListener('dragstart', handleDragStart);
    pieceTrayEl.addEventListener('dragend', handleDragEnd);

    // Piece click for selection
    pieceTrayEl.addEventListener('click', handlePieceClick);

    // Touch events for mobile drag
    pieceTrayEl.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
}

// Desktop Drag and Drop
function handleDragStart(e) {
    const piece = e.target.closest('.piece');
    if (!piece) return;

    const index = parseInt(piece.dataset.index);
    draggedPieceIndex = index;
    piece.classList.add('dragging');

    // Create drag image
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

    showPreview(piece, row, col);
}

function handleDragLeave(e) {
    // Only clear if leaving the board entirely
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
    placePiece(draggedPieceIndex, row, col);
    draggedPieceIndex = null;
}

// Piece selection (for tap-to-place on mobile)
function handlePieceClick(e) {
    const piece = e.target.closest('.piece');
    if (!piece) return;

    const index = parseInt(piece.dataset.index);

    // Toggle selection
    if (selectedPieceIndex === index) {
        selectedPieceIndex = null;
    } else {
        selectedPieceIndex = index;
    }

    // Update visual selection
    document.querySelectorAll('.piece').forEach((p, i) => {
        if (i === selectedPieceIndex) {
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

    if (placePiece(selectedPieceIndex, row, col)) {
        // Successfully placed
        document.querySelectorAll('.piece').forEach(p => p.classList.remove('selected'));
    }
}

// Touch handling for drag on mobile
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
}

function handleTouchMove(e) {
    if (touchPieceIndex === null) return;

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartX);
    const dy = Math.abs(touch.clientY - touchStartY);

    // Start dragging if moved enough
    if (dx > 10 || dy > 10) {
        isTouchDragging = true;
        e.preventDefault();
    }

    if (!isTouchDragging) return;

    // Show ghost at touch position
    const piece = currentPieces[touchPieceIndex];
    if (piece) {
        showGhost(piece, touch.clientX, touch.clientY);
    }

    // Show preview on board
    const boardRect = boardEl.getBoundingClientRect();
    const cellSize = boardRect.width / BOARD_SIZE;

    const relX = touch.clientX - boardRect.left;
    const relY = touch.clientY - boardRect.top;

    const col = Math.floor(relX / cellSize);
    const row = Math.floor(relY / cellSize);

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        showPreview(piece, row, col);
    } else {
        clearPreview();
    }
}

function handleTouchEnd(e) {
    if (touchPieceIndex === null) return;

    if (isTouchDragging) {
        // Get the last touch position from changedTouches
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
            placePiece(touchPieceIndex, row, col);
        }
    }

    touchPieceIndex = null;
    isTouchDragging = false;
}

// Preview and Ghost
function showPreview(piece, startRow, startCol) {
    clearPreview();

    if (!piece) return;

    const valid = canPlace(piece, startRow, startCol);
    const rows = piece.shape.length;
    const cols = piece.shape[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (piece.shape[r][c] === 1) {
                const boardRow = startRow + r;
                const boardCol = startCol + c;

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

    // Position ghost centered on touch/cursor
    const ghostWidth = cols * 40;
    const ghostHeight = rows * 40;
    ghostPreview.style.left = `${x - ghostWidth / 2}px`;
    ghostPreview.style.top = `${y - ghostHeight / 2}px`;
    ghostPreview.classList.remove('hidden');
}

function hideGhost() {
    ghostPreview.classList.add('hidden');
}

// ==================== START GAME ====================

document.addEventListener('DOMContentLoaded', initGame);
