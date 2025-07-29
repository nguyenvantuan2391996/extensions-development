const passwordField = document.getElementById("password");
const copyBtn = document.getElementById("copy");
const form = document.getElementById("generator-form");

form.addEventListener("submit", (e) => {
    e.preventDefault();

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

    let result = "";
    let available = chars;

    if (!chars) {
        passwordField.value = "Select at least 1 option!";
        return;
    }

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
});

copyBtn.addEventListener("click", () => {
    const pwd = passwordField.value;
    if (!pwd) return;
    navigator.clipboard.writeText(pwd).then(() => {
        copyBtn.textContent = "✅";
        setTimeout(() => (copyBtn.textContent = "📋"), 1000);
    });
});