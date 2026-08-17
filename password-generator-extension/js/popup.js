import { generatePasswordFromOptions, generatePassphraseFromOptions } from "./core.js";

const passwordField = document.getElementById("password");
const copyBtn = document.getElementById("copy");
const form = document.getElementById("generator-form");
const strengthMeter = document.getElementById("strength-meter");
const strengthBar = document.getElementById("strength-bar");
const strengthLabel = document.getElementById("strength-label");
const warningText = document.getElementById("warning-text");

const modeField = document.getElementById("mode");
const segments = document.querySelectorAll(".segment");
const passwordOptions = document.getElementById("password-options");
const passphraseOptions = document.getElementById("passphrase-options");

const lengthInput = document.getElementById("length");
const lengthRange = document.getElementById("length-range");
const lengthValue = document.getElementById("length-value");

const wordsRange = document.getElementById("passphrase-words");
const wordsValue = document.getElementById("words-value");

const customExcludeInput = document.getElementById("custom-exclude");

const historyCard = document.getElementById("history-card");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history");
const persistHistoryCheckbox = document.getElementById("persist-history");
const autoCopyCheckbox = document.getElementById("auto-copy");

const SETTINGS_STORAGE_KEY = "passwordGeneratorSettings";
const HISTORY_STORAGE_KEY = "passwordGeneratorHistory";
const SETTINGS_FIELD_IDS = [
    "mode",
    "length",
    "include-lower",
    "include-upper",
    "include-number",
    "include-symbol",
    "include-other",
    "exclude-duplicates",
    "exclude-ambiguous",
    "avoid-sequential",
    "custom-exclude",
    "passphrase-words",
    "passphrase-separator",
    "passphrase-capitalize",
    "passphrase-number",
    "auto-copy",
    "persist-history"
];

const STRENGTH_LEVELS = [
    { minBits: 70, label: "Strong", color: "#34c759", percent: 100 },
    { minBits: 40, label: "Medium", color: "#ff9f0a", percent: 60 },
    { minBits: 0, label: "Weak", color: "#ff3b30", percent: 30 }
];

const HISTORY_MAX = 5;
const historyEntries = [];

const storageAvailable = typeof chrome !== "undefined" && !!chrome.storage && !!chrome.storage.sync;
const historyStorageAvailable = typeof chrome !== "undefined" && !!chrome.storage && !!chrome.storage.local;

/* ---------- Settings persistence ---------- */

function loadSettings() {
    if (!storageAvailable) {
        syncModeUI();
        syncSliderLabels();
        loadHistoryThenGenerate();
        return;
    }
    chrome.storage.sync.get(SETTINGS_STORAGE_KEY, (data) => {
        const settings = data[SETTINGS_STORAGE_KEY];
        if (settings) {
            SETTINGS_FIELD_IDS.forEach((id) => {
                const field = document.getElementById(id);
                if (!field || !(id in settings)) return;
                if (field.type === "checkbox") {
                    field.checked = settings[id];
                } else {
                    field.value = settings[id];
                }
            });
        }
        syncModeUI();
        syncSliderLabels();
        loadHistoryThenGenerate();
    });
}

function saveSettings() {
    if (!storageAvailable) return;
    const settings = {};
    SETTINGS_FIELD_IDS.forEach((id) => {
        const field = document.getElementById(id);
        if (!field) return;
        settings[id] = field.type === "checkbox" ? field.checked : field.value;
    });
    chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: settings });
}

/* ---------- UI sync helpers ---------- */

function syncModeUI() {
    const mode = modeField.value === "passphrase" ? "passphrase" : "password";
    segments.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    passwordOptions.hidden = mode !== "password";
    passphraseOptions.hidden = mode !== "passphrase";
}

function syncSliderLabels() {
    lengthRange.value = lengthInput.value;
    lengthValue.textContent = lengthInput.value;
    wordsValue.textContent = wordsRange.value;
}

function showWarning() {
    warningText.hidden = false;
    strengthMeter.style.visibility = "hidden";
    strengthLabel.style.visibility = "hidden";
    passwordField.value = "";
}

function hideWarning() {
    warningText.hidden = true;
    strengthMeter.style.visibility = "visible";
    strengthLabel.style.visibility = "visible";
}

function renderStrengthFromBits(bits) {
    const level = STRENGTH_LEVELS.find((l) => bits >= l.minBits);
    strengthBar.style.width = `${level.percent}%`;
    strengthBar.style.background = level.color;
    strengthLabel.textContent = level.label;
}

function animateField() {
    passwordField.classList.remove("fade-in");
    void passwordField.offsetWidth;
    passwordField.classList.add("fade-in");
}

/* ---------- History ---------- */

function isPersistHistoryEnabled() {
    return !!(persistHistoryCheckbox && persistHistoryCheckbox.checked);
}

function persistHistory() {
    if (!historyStorageAvailable || !isPersistHistoryEnabled()) return;
    chrome.storage.local.set({ [HISTORY_STORAGE_KEY]: historyEntries });
}

function clearPersistedHistory() {
    if (!historyStorageAvailable) return;
    chrome.storage.local.remove(HISTORY_STORAGE_KEY);
}

function loadHistoryThenGenerate() {
    if (historyStorageAvailable && isPersistHistoryEnabled()) {
        chrome.storage.local.get(HISTORY_STORAGE_KEY, (data) => {
            const saved = data[HISTORY_STORAGE_KEY];
            if (Array.isArray(saved)) {
                historyEntries.push(...saved.slice(0, HISTORY_MAX));
                renderHistory();
            }
            generate();
        });
    } else {
        generate();
    }
}

function addToHistory(value) {
    if (!value) return;
    historyEntries.unshift(value);
    if (historyEntries.length > HISTORY_MAX) historyEntries.pop();
    renderHistory();
    persistHistory();
}

function renderHistory() {
    if (historyEntries.length === 0) {
        historyCard.hidden = true;
        return;
    }
    historyCard.hidden = false;
    historyList.innerHTML = "";
    historyEntries.forEach((value) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "history-item";
        item.textContent = value;
        item.title = "Click to copy";
        item.addEventListener("click", () => {
            navigator.clipboard.writeText(value).then(() => {
                item.classList.add("copied");
                setTimeout(() => item.classList.remove("copied"), 600);
            });
        });
        historyList.appendChild(item);
    });
}

/* ---------- Copy ---------- */

function copyToClipboard(value) {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
        copyBtn.textContent = "✅";
        setTimeout(() => (copyBtn.textContent = "📋"), 1000);
    });
}

/* ---------- Dispatch ---------- */

function generate() {
    saveSettings();

    const mode = modeField.value === "passphrase" ? "passphrase" : "password";
    const result = mode === "passphrase"
        ? generatePassphraseFromOptions({
            wordCount: wordsRange.value,
            separator: document.getElementById("passphrase-separator").value,
            capitalize: document.getElementById("passphrase-capitalize").checked,
            includeNumber: document.getElementById("passphrase-number").checked
        })
        : generatePasswordFromOptions({
            length: lengthInput.value,
            includeLower: document.getElementById("include-lower").checked,
            includeUpper: document.getElementById("include-upper").checked,
            includeNumber: document.getElementById("include-number").checked,
            includeSymbol: document.getElementById("include-symbol").checked,
            includeOther: document.getElementById("include-other").checked,
            excludeDuplicates: document.getElementById("exclude-duplicates").checked,
            excludeAmbiguous: document.getElementById("exclude-ambiguous").checked,
            avoidSequential: document.getElementById("avoid-sequential").checked,
            customExclude: customExcludeInput.value
        });

    if (result.error) {
        showWarning();
        return;
    }

    hideWarning();
    passwordField.value = result.value;
    renderStrengthFromBits(result.bits);
    addToHistory(result.value);
    animateField();

    if (autoCopyCheckbox && autoCopyCheckbox.checked) {
        copyToClipboard(result.value);
    }
}

/* ---------- Event wiring ---------- */

loadSettings();

form.addEventListener("submit", (e) => {
    e.preventDefault();
    generate();
});

copyBtn.addEventListener("click", () => {
    copyToClipboard(passwordField.value);
});

clearHistoryBtn.addEventListener("click", () => {
    historyEntries.length = 0;
    renderHistory();
    clearPersistedHistory();
});

persistHistoryCheckbox.addEventListener("change", () => {
    saveSettings();
    if (persistHistoryCheckbox.checked) {
        persistHistory();
    } else {
        clearPersistedHistory();
    }
});

segments.forEach((btn) => {
    btn.addEventListener("click", () => {
        modeField.value = btn.dataset.mode;
        syncModeUI();
        generate();
    });
});

lengthInput.addEventListener("input", () => {
    lengthRange.value = lengthInput.value;
    lengthValue.textContent = lengthInput.value;
});
lengthInput.addEventListener("change", generate);

lengthRange.addEventListener("input", () => {
    lengthInput.value = lengthRange.value;
    lengthValue.textContent = lengthRange.value;
    generate();
});

wordsRange.addEventListener("input", () => {
    wordsValue.textContent = wordsRange.value;
    generate();
});

let excludeDebounce;
customExcludeInput.addEventListener("input", () => {
    clearTimeout(excludeDebounce);
    excludeDebounce = setTimeout(generate, 300);
});

[
    "include-lower",
    "include-upper",
    "include-number",
    "include-symbol",
    "include-other",
    "exclude-duplicates",
    "exclude-ambiguous",
    "avoid-sequential",
    "passphrase-separator",
    "passphrase-capitalize",
    "passphrase-number",
    "auto-copy"
].forEach((id) => {
    document.getElementById(id).addEventListener("change", generate);
});
