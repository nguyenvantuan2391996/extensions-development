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

const SETTINGS_STORAGE_KEY = "passwordGeneratorSettings";
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
    "custom-exclude",
    "passphrase-words",
    "passphrase-separator",
    "passphrase-capitalize",
    "passphrase-number"
];

const STRENGTH_LEVELS = [
    { minBits: 70, label: "Strong", color: "#34c759", percent: 100 },
    { minBits: 40, label: "Medium", color: "#ff9f0a", percent: 60 },
    { minBits: 0, label: "Weak", color: "#ff3b30", percent: 30 }
];

const HISTORY_MAX = 5;
const historyEntries = [];

const storageAvailable = typeof chrome !== "undefined" && !!chrome.storage && !!chrome.storage.sync;

/* ---------- Secure randomness ---------- */

function secureRandomInt(maxExclusive) {
    const range = Math.floor(0xffffffff / maxExclusive) * maxExclusive;
    const array = new Uint32Array(1);
    let x;
    do {
        crypto.getRandomValues(array);
        x = array[0];
    } while (x >= range);
    return x % maxExclusive;
}

function secureShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = secureRandomInt(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/* ---------- Settings persistence ---------- */

function loadSettings() {
    if (!storageAvailable) {
        syncModeUI();
        syncSliderLabels();
        generate();
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
        generate();
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

function addToHistory(value) {
    if (!value) return;
    historyEntries.unshift(value);
    if (historyEntries.length > HISTORY_MAX) historyEntries.pop();
    renderHistory();
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

/* ---------- Password generation ---------- */

function buildCharPools() {
    const excludeAmbiguous = document.getElementById("exclude-ambiguous").checked;
    const customExclude = customExcludeInput.value || "";

    const stripChars = (str) => {
        let chars = str;
        if (excludeAmbiguous) {
            chars = [...chars].filter((c) => !AMBIGUOUS.includes(c)).join("");
        }
        if (customExclude) {
            chars = [...chars].filter((c) => !customExclude.includes(c)).join("");
        }
        return chars;
    };

    const pools = [
        document.getElementById("include-lower").checked ? stripChars(LOWER) : "",
        document.getElementById("include-upper").checked ? stripChars(UPPER) : "",
        document.getElementById("include-number").checked ? stripChars(NUMBER) : "",
        document.getElementById("include-symbol").checked ? stripChars(SYMBOL) : "",
        document.getElementById("include-other").checked ? stripChars(OTHER) : ""
    ];

    return pools.filter((p) => p.length > 0);
}

function generateRandomPassword(length, pools, excludeDuplicates) {
    const allChars = pools.join("");
    const result = [];

    if (length >= pools.length) {
        pools.forEach((pool) => {
            let char;
            let attempts = 0;
            do {
                char = pool[secureRandomInt(pool.length)];
                attempts++;
            } while (excludeDuplicates && result.includes(char) && attempts < 50);
            result.push(char);
        });
    }

    while (result.length < length) {
        const char = allChars[secureRandomInt(allChars.length)];
        if (excludeDuplicates && result.includes(char)) continue;
        result.push(char);
    }

    return secureShuffle(result).join("");
}

function generatePassword() {
    let length = parseInt(lengthInput.value, 10);
    length = Math.max(6, Math.min(64, length));

    const excludeDuplicates = document.getElementById("exclude-duplicates").checked;
    const pools = buildCharPools();
    const allChars = pools.join("");

    if (!allChars) {
        showWarning();
        return;
    }

    hideWarning();

    const effectiveLength = excludeDuplicates ? Math.min(length, allChars.length) : length;
    const value = generateRandomPassword(effectiveLength, pools, excludeDuplicates);

    passwordField.value = value;
    renderStrengthFromBits(value.length * Math.log2(allChars.length));
    addToHistory(value);
    animateField();
}

/* ---------- Passphrase generation ---------- */

function generatePassphrase() {
    const wordCount = parseInt(wordsRange.value, 10);
    const separator = document.getElementById("passphrase-separator").value;
    const capitalize = document.getElementById("passphrase-capitalize").checked;
    const includeNumber = document.getElementById("passphrase-number").checked;

    const words = [];
    for (let i = 0; i < wordCount; i++) {
        let word = WORDLIST[secureRandomInt(WORDLIST.length)];
        if (capitalize) word = word[0].toUpperCase() + word.slice(1);
        words.push(word);
    }
    if (includeNumber) {
        words.push(String(secureRandomInt(90) + 10));
    }

    const value = words.join(separator);
    let bits = wordCount * Math.log2(WORDLIST.length);
    if (includeNumber) bits += Math.log2(90);

    hideWarning();
    passwordField.value = value;
    renderStrengthFromBits(bits);
    addToHistory(value);
    animateField();
}

/* ---------- Dispatch ---------- */

function generate() {
    saveSettings();
    if (modeField.value === "passphrase") {
        generatePassphrase();
    } else {
        generatePassword();
    }
}

/* ---------- Event wiring ---------- */

loadSettings();

form.addEventListener("submit", (e) => {
    e.preventDefault();
    generate();
});

copyBtn.addEventListener("click", () => {
    const pwd = passwordField.value;
    if (!pwd) return;
    navigator.clipboard.writeText(pwd).then(() => {
        copyBtn.textContent = "✅";
        setTimeout(() => (copyBtn.textContent = "📋"), 1000);
    });
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
    "passphrase-separator",
    "passphrase-capitalize",
    "passphrase-number"
].forEach((id) => {
    document.getElementById(id).addEventListener("change", generate);
});
