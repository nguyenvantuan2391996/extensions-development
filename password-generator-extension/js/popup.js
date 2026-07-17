const passwordField = document.getElementById("password");
const copyBtn = document.getElementById("copy");
const form = document.getElementById("generator-form");
const strengthMeter = document.getElementById("strength-meter");
const strengthBar = document.getElementById("strength-bar");
const strengthLabel = document.getElementById("strength-label");
const warningText = document.getElementById("warning-text");

const SETTINGS_STORAGE_KEY = "passwordGeneratorSettings";
const SETTINGS_FIELD_IDS = [
    "length",
    "include-lower",
    "include-upper",
    "include-number",
    "include-symbol",
    "include-other",
    "exclude-duplicates"
];

const STRENGTH_LEVELS = [
    { minBits: 70, label: "Strong", color: "#34c759", percent: 100 },
    { minBits: 40, label: "Medium", color: "#ff9f0a", percent: 60 },
    { minBits: 0, label: "Weak", color: "#ff3b30", percent: 30 }
];

function loadSettings() {
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
        generatePassword();
    });
}

function saveSettings() {
    const settings = {};
    SETTINGS_FIELD_IDS.forEach((id) => {
        const field = document.getElementById(id);
        if (!field) return;
        settings[id] = field.type === "checkbox" ? field.checked : field.value;
    });
    chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: settings });
}

function renderStrength(length, poolSize) {
    const bits = length * Math.log2(poolSize);
    const level = STRENGTH_LEVELS.find((l) => bits >= l.minBits);
    strengthBar.style.width = `${level.percent}%`;
    strengthBar.style.background = level.color;
    strengthLabel.textContent = level.label;
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

function generatePassword() {
    saveSettings();

    let length = parseInt(document.getElementById("length").value);
    length = Math.max(6, Math.min(64, length));

    const chars = [
        document.getElementById("include-lower").checked ? LOWER : "",
        document.getElementById("include-upper").checked ? UPPER : "",
        document.getElementById("include-number").checked ? NUMBER : "",
        document.getElementById("include-symbol").checked ? SYMBOL : "",
        document.getElementById("include-other").checked ? OTHER : ""
    ].join("");

    const excludeDuplicates = document.getElementById("exclude-duplicates").checked;

    if (!chars) {
        showWarning();
        return;
    }

    hideWarning();

    let result = "";
    let available = chars;

    for (let i = 0; i < length; i++) {
        let char = available[Math.floor(Math.random() * available.length)];
        if (excludeDuplicates) {
            if (!result.includes(char)) {
                result += char;
            } else {
                i--;
            }
        } else {
            result += char;
        }
    }

    passwordField.value = result;
    renderStrength(result.length, chars.length);

    passwordField.classList.remove("fade-in");
    void passwordField.offsetWidth;
    passwordField.classList.add("fade-in");
}

loadSettings();

form.addEventListener("submit", (e) => {
    e.preventDefault();
    generatePassword();
});

copyBtn.addEventListener("click", () => {
    const pwd = passwordField.value;
    if (!pwd) return;
    navigator.clipboard.writeText(pwd).then(() => {
        copyBtn.textContent = "✅";
        setTimeout(() => (copyBtn.textContent = "📋"), 1000);
    });
});
