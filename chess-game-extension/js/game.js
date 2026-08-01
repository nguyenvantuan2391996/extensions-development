(function () {
    const CELL = 70;
    const BOARD_SIZE = CELL * CHESS_SIZE;
    const AI_DEPTH = 3;
    const STORAGE_KEY = "chessGameState";
    const STATS_KEY = "chessStats";

    const PIECE_GLYPHS = {
        white: { king: "♔", queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" },
        black: { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" },
    };

    const params = new URLSearchParams(window.location.search);
    const resuming = params.get("resume") === "1";
    const humanColor = WHITE;

    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = BOARD_SIZE;
    canvas.height = BOARD_SIZE;

    const hudMode = document.getElementById("hud-mode");
    const hudTurn = document.getElementById("hud-turn");
    const thinkingChip = document.getElementById("thinking-chip");
    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlay-title");
    const overlayDesc = document.getElementById("overlay-desc");
    const overlayBtn = document.getElementById("overlay-btn");
    const btnRestart = document.getElementById("btn-restart");
    const btnClose = document.getElementById("btn-close");

    let mode = params.get("mode") === "ai" ? "ai" : "human";
    let board = createInitialChessBoard();
    let turn = WHITE;
    let enPassantTarget = null;
    let selected = null;
    let legalTargets = [];
    let lastMove = null;
    let gameActive = true;
    let aiThinking = false;

    function colorLabel(color) {
        return color === WHITE ? "Trắng" : "Đen";
    }

    function modeLabel() {
        return mode === "ai" ? "Đấu với máy" : "2 người";
    }

    function toPixel(r, c) {
        return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
    }

    function toBoardCoord(px, py) {
        return { r: Math.floor(py / CELL), c: Math.floor(px / CELL) };
    }

    function drawBoard() {
        for (let r = 0; r < CHESS_SIZE; r++) {
            for (let c = 0; c < CHESS_SIZE; c++) {
                const isLight = (r + c) % 2 === 0;
                ctx.fillStyle = isLight ? "#2c2747" : "#181428";
                ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
            }
        }

        if (lastMove) {
            [[lastMove.fromR, lastMove.fromC], [lastMove.toR, lastMove.toC]].forEach(([r, c]) => {
                ctx.fillStyle = "rgba(255,207,77,0.22)";
                ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
            });
        }

        if (selected) {
            ctx.strokeStyle = "#ff3d9a";
            ctx.lineWidth = 3;
            ctx.strokeRect(selected.c * CELL + 2, selected.r * CELL + 2, CELL - 4, CELL - 4);
        }

        legalTargets.forEach((m) => {
            const p = toPixel(m.toR, m.toC);
            const hasTarget = board[m.toR][m.toC] || m.enPassant;
            ctx.fillStyle = hasTarget ? "rgba(255,61,154,0.45)" : "rgba(61,220,132,0.55)";
            ctx.beginPath();
            ctx.arc(p.x, p.y, hasTarget ? CELL * 0.42 : CELL * 0.14, 0, Math.PI * 2);
            ctx.fill();
        });

        const kingColorInCheck = gameActive && isChessInCheck(board, turn) ? turn : null;
        if (kingColorInCheck) {
            const kingPos = findChessKing(board, kingColorInCheck);
            if (kingPos) {
                ctx.fillStyle = "rgba(230,57,70,0.45)";
                ctx.fillRect(kingPos.c * CELL, kingPos.r * CELL, CELL, CELL);
            }
        }
    }

    function drawPieces() {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = Math.floor(CELL * 0.68) + "px 'Poppins', sans-serif";

        for (let r = 0; r < CHESS_SIZE; r++) {
            for (let c = 0; c < CHESS_SIZE; c++) {
                const piece = board[r][c];
                if (!piece) continue;
                const p = toPixel(r, c);

                ctx.fillStyle = piece.color === WHITE ? "#f5f4fb" : "#0b0a1f";
                ctx.strokeStyle = piece.color === WHITE ? "#0b0a1f" : "#7c5cff";
                ctx.lineWidth = 1.2;
                const glyph = PIECE_GLYPHS[piece.color][piece.type];
                ctx.fillText(glyph, p.x, p.y + 2);
                ctx.strokeText(glyph, p.x, p.y + 2);
            }
        }
    }

    function render() {
        drawBoard();
        drawPieces();
    }

    function updateHud() {
        hudMode.textContent = modeLabel();
        hudTurn.textContent = colorLabel(turn);
    }

    function showOverlay(title, desc, btnLabel) {
        overlayTitle.textContent = title;
        overlayDesc.textContent = desc;
        overlayBtn.textContent = btnLabel;
        overlay.hidden = false;
    }

    function saveState() {
        chrome.storage.local.set({
            [STORAGE_KEY]: {
                board,
                turn,
                enPassantTarget,
                lastMove,
                mode,
                gameActive,
            },
        });
    }

    function clearState() {
        chrome.storage.local.remove(STORAGE_KEY);
    }

    function bumpStats(key) {
        if (mode !== "ai") return;
        chrome.storage.local.get([STATS_KEY], (result) => {
            const stats = result[STATS_KEY] || { win: 0, loss: 0, draw: 0 };
            stats[key] = (stats[key] || 0) + 1;
            chrome.storage.local.set({ [STATS_KEY]: stats });
        });
    }

    function checkGameEnd() {
        if (isChessGameOver(board, turn, enPassantTarget)) {
            gameActive = false;
            const inCheck = isChessInCheck(board, turn);
            if (inCheck) {
                const winner = opponentColor(turn);
                showOverlay("Chiếu bí!", `${colorLabel(winner)} thắng.`, "Chơi lại");
                if (mode === "ai") bumpStats(winner === humanColor ? "win" : "loss");
            } else {
                showOverlay("Hết cờ (Stalemate)", "Không còn nước đi hợp lệ. Hòa cờ.", "Chơi lại");
                if (mode === "ai") bumpStats("draw");
            }
            clearState();
            return true;
        }
        return false;
    }

    function afterMove() {
        turn = opponentColor(turn);
        selected = null;
        legalTargets = [];
        updateHud();
        render();

        if (checkGameEnd()) return;
        saveState();

        if (mode === "ai" && turn !== humanColor) {
            aiThinking = true;
            thinkingChip.hidden = false;
            setTimeout(runAiMove, 60);
        }
    }

    function commitMove(move) {
        applyChessMove(board, move);
        enPassantTarget = getEnPassantTargetAfterMove(move);
        lastMove = move;
        afterMove();
    }

    function runAiMove() {
        const move = findBestChessMove(board, turn, enPassantTarget, AI_DEPTH);
        aiThinking = false;
        thinkingChip.hidden = true;
        if (!move) {
            checkGameEnd();
            return;
        }
        commitMove(move);
    }

    function handleClick(evt) {
        if (!gameActive || aiThinking) return;
        if (mode === "ai" && turn !== humanColor) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const px = (evt.clientX - rect.left) * scaleX;
        const py = (evt.clientY - rect.top) * scaleY;
        const { r, c } = toBoardCoord(px, py);
        if (!inChessBoard(r, c)) return;

        const piece = board[r][c];

        if (selected) {
            const target = legalTargets.find((m) => m.toR === r && m.toC === c);
            if (target) {
                commitMove(target);
                return;
            }
            if (piece && piece.color === turn) {
                selected = { r, c };
                legalTargets = getLegalChessMoves(board, turn, enPassantTarget).filter(
                    (m) => m.fromR === r && m.fromC === c
                );
                render();
                return;
            }
            selected = null;
            legalTargets = [];
            render();
            return;
        }

        if (piece && piece.color === turn) {
            selected = { r, c };
            legalTargets = getLegalChessMoves(board, turn, enPassantTarget).filter(
                (m) => m.fromR === r && m.fromC === c
            );
            render();
        }
    }

    function restart() {
        board = createInitialChessBoard();
        turn = WHITE;
        enPassantTarget = null;
        selected = null;
        legalTargets = [];
        lastMove = null;
        gameActive = true;
        aiThinking = false;
        thinkingChip.hidden = true;
        overlay.hidden = true;
        updateHud();
        render();
        saveState();

        if (mode === "ai" && turn !== humanColor) {
            aiThinking = true;
            thinkingChip.hidden = false;
            setTimeout(runAiMove, 60);
        }
    }

    function startFresh() {
        restart();
    }

    function startFromState(state) {
        board = state.board;
        turn = state.turn;
        enPassantTarget = state.enPassantTarget;
        lastMove = state.lastMove;
        mode = state.mode;
        gameActive = state.gameActive;
        updateHud();
        render();

        if (gameActive && mode === "ai" && turn !== humanColor) {
            aiThinking = true;
            thinkingChip.hidden = false;
            setTimeout(runAiMove, 60);
        }
    }

    canvas.addEventListener("click", handleClick);
    overlayBtn.addEventListener("click", restart);
    btnRestart.addEventListener("click", restart);
    btnClose.addEventListener("click", () => window.close());

    if (resuming) {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
            const state = result[STORAGE_KEY];
            if (state && state.gameActive) {
                startFromState(state);
            } else {
                startFresh();
            }
        });
    } else {
        updateHud();
        render();
        saveState();
    }
})();
