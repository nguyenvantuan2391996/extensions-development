const BEST_SCORE_KEY = "2048ExtensionBestScore";

document.addEventListener("DOMContentLoaded", () => {
    const bestScoreValue = document.getElementById("best-score-value");
    const btnPlay = document.getElementById("btn-play");

    bestScoreValue.textContent = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;

    btnPlay.addEventListener("click", () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("src/game.html") });
    });
});
