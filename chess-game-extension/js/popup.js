document.addEventListener("DOMContentLoaded", () => {
    const modeCards = document.querySelectorAll(".mode-card");
    const btnPlay = document.getElementById("btn-play");
    const resumeCard = document.getElementById("resume-card");
    const resumeDesc = document.getElementById("resume-desc");
    const btnResume = document.getElementById("btn-resume");
    const statWin = document.getElementById("stat-win");
    const statLoss = document.getElementById("stat-loss");
    const statDraw = document.getElementById("stat-draw");

    let selectedMode = "human";

    modeCards.forEach((card) => {
        card.addEventListener("click", () => {
            modeCards.forEach((c) => c.classList.remove("mode-card--active"));
            card.classList.add("mode-card--active");
            selectedMode = card.dataset.mode;
        });
    });

    btnPlay.addEventListener("click", () => {
        chrome.storage.local.remove("chessGameState", () => {
            chrome.tabs.create({ url: chrome.runtime.getURL(`src/game.html?mode=${selectedMode}`) });
        });
    });

    btnResume.addEventListener("click", () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("src/game.html?resume=1") });
    });

    chrome.storage.local.get(["chessGameState", "chessStats"], (result) => {
        const state = result.chessGameState;
        if (state && state.gameActive) {
            resumeCard.hidden = false;
            const modeLabel = state.mode === "ai" ? "Vs. AI" : "2 players";
            const turnLabel = state.turn === "white" ? "White" : "Black";
            resumeDesc.textContent = `${modeLabel} · Turn: ${turnLabel}`;
        }

        const stats = result.chessStats || { win: 0, loss: 0, draw: 0 };
        statWin.textContent = stats.win;
        statLoss.textContent = stats.loss;
        statDraw.textContent = stats.draw;
    });
});
