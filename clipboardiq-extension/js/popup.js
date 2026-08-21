const captureToggle = document.getElementById("capture-toggle");
const statHistory = document.getElementById("stat-history");
const statTemplates = document.getElementById("stat-templates");
const statSuggestions = document.getElementById("stat-suggestions");
const suggestionCard = document.getElementById("suggestion-card");
const suggestionCardDesc = document.getElementById("suggestion-card-desc");
const btnOpenSuggestion = document.getElementById("btn-open-suggestion");
const btnDismissSuggestion = document.getElementById("btn-dismiss-suggestion");
const recentList = document.getElementById("recent-list");
const recentEmpty = document.getElementById("recent-empty");
const btnDashboard = document.getElementById("btn-dashboard");
const templateMiniList = document.getElementById("template-mini-list");
const templateMiniEmpty = document.getElementById("template-mini-empty");
const templateMoreLink = document.getElementById("template-more-link");

const fillModal = document.getElementById("fill-modal");
const fillModalTitle = document.getElementById("fill-modal-title");
const fillModalFields = document.getElementById("fill-modal-fields");
const fillModalPreview = document.getElementById("fill-modal-preview");
const fillModalCancel = document.getElementById("fill-modal-cancel");
const fillModalCopy = document.getElementById("fill-modal-copy");
const fillModalBackdrop = document.getElementById("fill-modal-backdrop");

let latestState = null;
let activeFillTemplate = null;

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

async function loadState() {
  const state = await chrome.runtime.sendMessage({ type: "CIQ_GET_STATE" });
  latestState = state;
  renderState(state);
}

function renderState(state) {
  captureToggle.checked = !!state.settings.captureEnabled;
  statHistory.textContent = state.history.length;
  statTemplates.textContent = state.templates.length;
  statSuggestions.textContent = state.suggestions.length;

  renderSuggestionCard(state.suggestions[0]);
  renderTemplateMiniList(state.templates);
  renderRecentHistory(state.history.slice(0, 5));
}

function renderTemplateMiniList(templates) {
  templateMiniList.innerHTML = "";
  const top = templates.slice(0, 4);
  templateMiniEmpty.hidden = top.length > 0;
  templateMoreLink.hidden = templates.length <= top.length;

  top.forEach((template) => {
    const item = document.createElement("div");
    item.className = "template-mini-item";

    const row = document.createElement("div");
    row.className = "template-mini-item__row";

    const name = document.createElement("span");
    name.className = "template-mini-item__name";
    name.textContent = template.name;
    row.appendChild(name);

    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.className = "button button--small template-mini-item__use-btn";
    useBtn.textContent = "Use";
    useBtn.addEventListener("click", () => openFillModal(template));
    row.appendChild(useBtn);

    item.appendChild(row);

    const preview = document.createElement("div");
    preview.className = "template-mini-item__preview";
    preview.textContent = ciqTruncate(template.body, 50);
    item.appendChild(preview);

    templateMiniList.appendChild(item);
  });
}

function openFillModal(template) {
  activeFillTemplate = template;
  fillModalTitle.textContent = "Use “" + template.name + "”";
  fillModalFields.innerHTML = "";

  const tokens = extractPlaceholderTokens(template.body);
  tokens.forEach((token) => {
    const type = token.replace(/[{}]/g, "");
    const field = document.createElement("div");
    field.className = "modal__field";

    const label = document.createElement("label");
    label.textContent = ciqHumanizePlaceholder(type);
    field.appendChild(label);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "text-input";
    input.dataset.token = token;
    input.addEventListener("input", updateFillPreview);
    field.appendChild(input);

    fillModalFields.appendChild(field);
  });

  updateFillPreview();
  fillModalCopy.textContent = "Copy to clipboard";
  fillModal.hidden = false;
  const firstInput = fillModalFields.querySelector("input");
  if (firstInput) firstInput.focus();
}

function updateFillPreview() {
  if (!activeFillTemplate) return;
  let text = activeFillTemplate.body;
  fillModalFields.querySelectorAll("input").forEach((input) => {
    const value = input.value.trim();
    const token = input.dataset.token.replace(/[{}]/g, (c) => "\\" + c);
    text = text.replace(new RegExp(token, "g"), value || input.dataset.token);
  });
  fillModalPreview.textContent = text;
}

function composeFilledText() {
  if (!activeFillTemplate) return "";
  let text = activeFillTemplate.body;
  fillModalFields.querySelectorAll("input").forEach((input) => {
    const value = input.value.trim();
    const token = input.dataset.token.replace(/[{}]/g, (c) => "\\" + c);
    text = text.replace(new RegExp(token, "g"), value);
  });
  return text;
}

function closeFillModal() {
  fillModal.hidden = true;
  activeFillTemplate = null;
}

fillModalCancel.addEventListener("click", closeFillModal);
fillModalBackdrop.addEventListener("click", closeFillModal);

fillModalCopy.addEventListener("click", async () => {
  if (!activeFillTemplate) return;
  const finalText = composeFilledText();
  await navigator.clipboard.writeText(finalText);
  await chrome.runtime.sendMessage({ type: "CIQ_TOUCH_TEMPLATE_USE", id: activeFillTemplate.id });
  fillModalCopy.textContent = "Copied!";
  setTimeout(() => window.close(), 700);
});

templateMoreLink.addEventListener("click", (event) => {
  event.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL("src/dashboard.html?tab=templates") });
});

function renderSuggestionCard(suggestion) {
  if (!suggestion) {
    suggestionCard.hidden = true;
    return;
  }
  suggestionCard.hidden = false;
  suggestionCardDesc.textContent =
    "You copied " + suggestion.memberCount + " similar replies recently — turn this into a reusable template?";
  suggestionCard.dataset.suggestionId = suggestion.id;
}

function renderRecentHistory(items) {
  recentList.innerHTML = "";
  recentEmpty.hidden = items.length > 0;

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "recent-item";

    const text = document.createElement("span");
    text.className = "recent-item__text";
    text.textContent = ciqTruncate(item.text, 64);
    row.appendChild(text);

    const meta = document.createElement("span");
    meta.className = "recent-item__meta";
    meta.textContent = ciqRelativeTime(item.capturedAt);
    row.appendChild(meta);

    row.title = "Click to copy again";
    row.addEventListener("click", async () => {
      await navigator.clipboard.writeText(item.text);
      row.classList.add("recent-item--copied");
      setTimeout(() => row.classList.remove("recent-item--copied"), 900);
    });

    recentList.appendChild(row);
  });
}

captureToggle.addEventListener("change", async () => {
  await chrome.runtime.sendMessage({
    type: "CIQ_UPDATE_SETTINGS",
    settings: { captureEnabled: captureToggle.checked }
  });
});

btnOpenSuggestion.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("src/dashboard.html?tab=suggestions") });
});

btnDismissSuggestion.addEventListener("click", async () => {
  const id = suggestionCard.dataset.suggestionId;
  if (!id) return;
  await chrome.runtime.sendMessage({ type: "CIQ_DISMISS_SUGGESTION", id });
  await loadState();
});

btnDashboard.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("src/dashboard.html") });
});

loadState();
