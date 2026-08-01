document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-play").addEventListener("click", () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("src/game.html") });
    });
});
