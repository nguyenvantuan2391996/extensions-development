import { generatePasswordFromOptions, generatePassphraseFromOptions } from "./core.js";

const MENU_ID = "generate-fill-password";
const SETTINGS_STORAGE_KEY = "passwordGeneratorSettings";

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: MENU_ID,
            title: "Generate & Fill Password",
            contexts: ["editable"]
        });
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID || !tab || !tab.id) return;

    chrome.storage.sync.get(SETTINGS_STORAGE_KEY, (data) => {
        const settings = data[SETTINGS_STORAGE_KEY] || {};
        const mode = settings.mode === "passphrase" ? "passphrase" : "password";

        const result = mode === "passphrase"
            ? generatePassphraseFromOptions({
                wordCount: settings["passphrase-words"] ?? 6,
                separator: settings["passphrase-separator"] ?? "-",
                capitalize: settings["passphrase-capitalize"] ?? true,
                includeNumber: settings["passphrase-number"] ?? true
            })
            : generatePasswordFromOptions({
                length: settings.length ?? 16,
                includeLower: settings["include-lower"] ?? true,
                includeUpper: settings["include-upper"] ?? true,
                includeNumber: settings["include-number"] ?? true,
                includeSymbol: settings["include-symbol"] ?? true,
                includeOther: settings["include-other"] ?? false,
                excludeDuplicates: settings["exclude-duplicates"] ?? false,
                excludeAmbiguous: settings["exclude-ambiguous"] ?? false,
                avoidSequential: settings["avoid-sequential"] ?? false,
                customExclude: settings["custom-exclude"] ?? ""
            });

        if (result.error || !result.value) {
            flashBadge("!", "#ff3b30");
            return;
        }

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: fillActiveElement,
            args: [result.value]
        }).then((results) => {
            const filled = Array.isArray(results) && results.some((r) => r.result === true);
            flashBadge(filled ? "✓" : "!", filled ? "#34c759" : "#ff3b30");
        }).catch(() => {
            // Restricted page (chrome://, Web Store, etc.) — nothing we can do.
            flashBadge("!", "#ff3b30");
        });
    });
});

// Brief badge pulse so a right-click "Generate & Fill" gives visible feedback
// even though there's no popup open to show a result in.
function flashBadge(text, color) {
    chrome.action.setBadgeBackgroundColor({ color });
    chrome.action.setBadgeText({ text });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1500);
}

function fillActiveElement(value) {
    const el = document.activeElement;
    if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return false;

    const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement : window.HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(proto.prototype, "value").set;
    setter.call(el, value);

    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));

    // Flash the field itself so it's obvious which one just got filled.
    const originalOutline = el.style.outline;
    const originalOffset = el.style.outlineOffset;
    el.style.outline = "2px solid #34c759";
    el.style.outlineOffset = "1px";
    setTimeout(() => {
        el.style.outline = originalOutline;
        el.style.outlineOffset = originalOffset;
    }, 700);

    return true;
}
