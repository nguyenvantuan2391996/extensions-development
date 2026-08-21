(function () {
  function getSelectedText() {
    const active = document.activeElement;
    if (
      active &&
      (active.tagName === "TEXTAREA" || active.tagName === "INPUT") &&
      typeof active.selectionStart === "number" &&
      typeof active.selectionEnd === "number" &&
      active.selectionEnd > active.selectionStart
    ) {
      return active.value.slice(active.selectionStart, active.selectionEnd);
    }
    const selection = window.getSelection();
    return selection ? selection.toString() : "";
  }

  document.addEventListener(
    "copy",
    () => {
      try {
        const text = getSelectedText().trim();
        if (!text) return;
        chrome.runtime.sendMessage({
          type: "CIQ_CLIP_CAPTURED",
          payload: {
            text,
            host: location.hostname,
            capturedAt: Date.now()
          }
        });
      } catch (err) {
        // Extension context can be invalidated (e.g. after an update/reload); ignore.
      }
    },
    true
  );
})();

(function () {
  function isEditableElement(el) {
    if (!el) return false;
    if (el.tagName === "TEXTAREA") return true;
    if (el.tagName === "INPUT") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      return ["text", "search", "email", "url", "tel", ""].includes(type);
    }
    return !!el.isContentEditable;
  }

  function extractPlaceholderTokens(body) {
    const matches = body.match(/{{\s*[\w]+\s*}}/g) || [];
    const seen = new Set();
    const tokens = [];
    matches.forEach((raw) => {
      const token = raw.replace(/\s+/g, "");
      if (seen.has(token)) return;
      seen.add(token);
      tokens.push(token);
    });
    return tokens;
  }

  function insertTextIntoElement(el, text) {
    el.focus();
    const inserted = document.execCommand("insertText", false, text);
    if (inserted) return;

    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const value = el.value;
      el.value = value.slice(0, start) + text + value.slice(end);
      el.selectionStart = el.selectionEnd = start + text.length;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function positionPanel(host, targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const width = 300;
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    if (top + 280 > window.innerHeight) top = Math.max(8, rect.top - 286);
    host.style.left = left + "px";
    host.style.top = top + "px";
  }

  function showFillPanel(template, targetEl) {
    const tokens = extractPlaceholderTokens(template.body);
    if (tokens.length === 0) {
      insertTextIntoElement(targetEl, template.body);
      return;
    }

    const host = document.createElement("div");
    host.style.all = "initial";
    host.style.position = "fixed";
    host.style.zIndex = "2147483647";
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML =
      "<style>" +
      ':host{all:initial;} .ciq-panel{width:300px;background:#14122c;border:1px solid rgba(255,255,255,0.14);border-radius:0.85rem;padding:0.9rem;box-shadow:0 20px 50px -20px rgba(0,0,0,0.8);font-family:"Segoe UI",sans-serif;color:#f5f4fb;display:flex;flex-direction:column;gap:0.5rem;box-sizing:border-box;} .ciq-panel *{box-sizing:border-box;} .ciq-panel__title{font-size:0.85rem;font-weight:700;} .ciq-panel__fields{display:flex;flex-direction:column;gap:0.4rem;max-height:9rem;overflow-y:auto;} .ciq-panel__field{display:flex;flex-direction:column;gap:0.2rem;font-size:0.68rem;color:rgba(245,244,251,0.65);} .ciq-panel__field input{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);color:#f5f4fb;font-size:0.78rem;padding:0.4rem 0.55rem;border-radius:0.5rem;outline:none;font-family:inherit;width:100%;} .ciq-panel__preview-label{font-size:0.6rem;text-transform:uppercase;letter-spacing:0.05em;color:rgba(245,244,251,0.5);} .ciq-panel__preview{font-size:0.72rem;line-height:1.4;color:rgba(245,244,251,0.85);background:rgba(0,0,0,0.25);border-radius:0.5rem;padding:0.5rem 0.6rem;white-space:pre-wrap;word-break:break-word;max-height:6rem;overflow-y:auto;} .ciq-panel__actions{display:flex;justify-content:flex-end;gap:0.4rem;} .ciq-btn{background:linear-gradient(135deg,#ff3d9a,#7c5cff 55%,#ffcf4d);color:#1a1330;border:none;font-weight:700;font-size:0.72rem;padding:0.4rem 0.8rem;border-radius:0.5rem;cursor:pointer;font-family:inherit;} .ciq-btn--ghost{background:transparent;border:1px solid rgba(255,255,255,0.14);color:rgba(245,244,251,0.65);}' +
      "</style>" +
      '<div class="ciq-panel">' +
      '<div class="ciq-panel__title">Use &ldquo;' + escapeHtml(template.name) + '&rdquo;</div>' +
      '<div class="ciq-panel__fields">' +
      tokens
        .map((token) => {
          const type = token.replace(/[{}]/g, "");
          const label = ciqHumanizePlaceholder(type);
          return (
            '<label class="ciq-panel__field"><span>' +
            escapeHtml(label) +
            '</span><input type="text" data-token="' +
            escapeHtml(token) +
            '" /></label>'
          );
        })
        .join("") +
      "</div>" +
      '<div class="ciq-panel__preview-label">Preview</div>' +
      '<div class="ciq-panel__preview"></div>' +
      '<div class="ciq-panel__actions">' +
      '<button type="button" class="ciq-btn ciq-btn--ghost" data-action="cancel">Cancel</button>' +
      '<button type="button" class="ciq-btn" data-action="insert">Insert</button>' +
      "</div>" +
      "</div>";

    positionPanel(host, targetEl);

    const previewEl = shadow.querySelector(".ciq-panel__preview");
    const composeText = () => {
      let text = template.body;
      shadow.querySelectorAll("input").forEach((input) => {
        const value = input.value.trim();
        const pattern = input.dataset.token.replace(/[{}]/g, (c) => "\\" + c);
        text = text.replace(new RegExp(pattern, "g"), value || input.dataset.token);
      });
      return text;
    };
    const updatePreview = () => {
      previewEl.textContent = composeText();
    };
    shadow.querySelectorAll("input").forEach((input) => input.addEventListener("input", updatePreview));
    updatePreview();

    function cleanup() {
      host.remove();
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onOutsideClick, true);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") cleanup();
    }
    function onOutsideClick(e) {
      if (!host.contains(e.target)) cleanup();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onOutsideClick, true);

    shadow.querySelector('[data-action="cancel"]').addEventListener("click", cleanup);
    shadow.querySelector('[data-action="insert"]').addEventListener("click", () => {
      let text = template.body;
      shadow.querySelectorAll("input").forEach((input) => {
        const value = input.value.trim();
        const pattern = input.dataset.token.replace(/[{}]/g, (c) => "\\" + c);
        text = text.replace(new RegExp(pattern, "g"), value);
      });
      insertTextIntoElement(targetEl, text);
      cleanup();
    });

    const firstInput = shadow.querySelector("input");
    if (firstInput) firstInput.focus();
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== "CIQ_INSERT_TEMPLATE") return;
    const target = document.activeElement;
    if (isEditableElement(target)) {
      showFillPanel(message.template, target);
    }
  });
})();
