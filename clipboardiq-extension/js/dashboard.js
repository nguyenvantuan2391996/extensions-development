const dashTabs = document.getElementById("dash-tabs");
const tabBadgeSuggestions = document.getElementById("tab-badge-suggestions");

const historySearch = document.getElementById("history-search");
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");
const btnClearHistory = document.getElementById("btn-clear-history");

const suggestionList = document.getElementById("suggestion-list");
const suggestionsEmpty = document.getElementById("suggestions-empty");

const templateList = document.getElementById("template-list");
const templatesEmpty = document.getElementById("templates-empty");
const btnNewTemplate = document.getElementById("btn-new-template");

const settingCapture = document.getElementById("setting-capture");
const settingThreshold = document.getElementById("setting-threshold");
const settingThresholdValue = document.getElementById("setting-threshold-value");
const settingMinCluster = document.getElementById("setting-min-cluster");
const settingMaxHistory = document.getElementById("setting-max-history");
const btnClearAll = document.getElementById("btn-clear-all");

const fillModal = document.getElementById("fill-modal");
const fillModalTitle = document.getElementById("fill-modal-title");
const fillModalFields = document.getElementById("fill-modal-fields");
const fillModalPreview = document.getElementById("fill-modal-preview");
const fillModalCancel = document.getElementById("fill-modal-cancel");
const fillModalCopy = document.getElementById("fill-modal-copy");
const fillModalBackdrop = document.getElementById("fill-modal-backdrop");

const editorModal = document.getElementById("editor-modal");
const editorModalTitle = document.getElementById("editor-modal-title");
const editorName = document.getElementById("editor-name");
const editorBody = document.getElementById("editor-body");
const editorModalCancel = document.getElementById("editor-modal-cancel");
const editorModalSave = document.getElementById("editor-modal-save");
const editorModalBackdrop = document.getElementById("editor-modal-backdrop");

const toast = document.getElementById("toast");

let state = { history: [], suggestions: [], templates: [], settings: {} };
let activeFillTemplate = null;
let editingTemplateId = null;

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.hidden = true;
  }, 1800);
}

function highlightPlaceholders(text) {
  const span = document.createElement("span");
  const parts = text.split(/({{\s*[\w]+\s*}})/g);
  parts.forEach((part) => {
    if (/^{{\s*[\w]+\s*}}$/.test(part)) {
      const mark = document.createElement("span");
      mark.className = "placeholder";
      mark.textContent = part;
      span.appendChild(mark);
    } else {
      span.appendChild(document.createTextNode(part));
    }
  });
  return span;
}

async function loadState() {
  state = await chrome.runtime.sendMessage({ type: "CIQ_GET_STATE" });
  renderAll();
}

function renderAll() {
  renderTabBadge();
  renderHistory();
  renderSuggestions();
  renderTemplates();
  renderSettings();
}

function renderTabBadge() {
  const count = state.suggestions.length;
  tabBadgeSuggestions.hidden = count === 0;
  tabBadgeSuggestions.textContent = String(count);
}

function renderHistory() {
  const query = historySearch.value.trim().toLowerCase();
  const items = query
    ? state.history.filter((h) => h.text.toLowerCase().includes(query))
    : state.history;

  historyList.innerHTML = "";
  historyEmpty.hidden = items.length > 0;

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "entry-item";

    const body = document.createElement("div");
    body.className = "entry-item__body";

    const text = document.createElement("div");
    text.className = "entry-item__text";
    text.textContent = ciqTruncate(item.text, 220);
    body.appendChild(text);

    const meta = document.createElement("div");
    meta.className = "entry-item__meta";
    meta.innerHTML = "";
    const timeSpan = document.createElement("span");
    timeSpan.textContent = ciqRelativeTime(item.capturedAt);
    meta.appendChild(timeSpan);
    if (item.host) {
      const hostSpan = document.createElement("span");
      hostSpan.textContent = item.host;
      meta.appendChild(hostSpan);
    }
    body.appendChild(meta);
    li.appendChild(body);

    const actions = document.createElement("div");
    actions.className = "entry-item__actions";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "icon-btn";
    copyBtn.title = "Copy again";
    copyBtn.textContent = "⧉";
    copyBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(item.text);
      showToast("Copied to clipboard");
    });
    actions.appendChild(copyBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "icon-btn icon-btn--danger";
    deleteBtn.title = "Delete";
    deleteBtn.textContent = "✕";
    deleteBtn.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "CIQ_DELETE_HISTORY_ITEM", id: item.id });
      await loadState();
    });
    actions.appendChild(deleteBtn);

    li.appendChild(actions);
    historyList.appendChild(li);
  });
}

function renderSuggestions() {
  suggestionList.innerHTML = "";
  suggestionsEmpty.hidden = state.suggestions.length > 0;

  state.suggestions.forEach((suggestion) => {
    const card = document.createElement("div");
    card.className = "suggestion-item";

    const title = document.createElement("div");
    title.className = "suggestion-item__title";
    title.textContent = suggestion.memberCount + " similar snippets copied recently";
    card.appendChild(title);

    const samples = document.createElement("div");
    samples.className = "suggestion-item__samples";
    suggestion.sampleTexts.forEach((sample) => {
      const sampleEl = document.createElement("div");
      sampleEl.className = "suggestion-item__sample";
      sampleEl.textContent = ciqTruncate(sample, 160);
      samples.appendChild(sampleEl);
    });
    card.appendChild(samples);

    const previewLabel = document.createElement("div");
    previewLabel.className = "suggestion-item__preview-label";
    previewLabel.textContent = "Suggested template";
    card.appendChild(previewLabel);

    const preview = document.createElement("div");
    preview.className = "suggestion-item__preview";
    preview.appendChild(highlightPlaceholders(suggestion.templateBody));
    card.appendChild(preview);

    const form = document.createElement("div");
    form.className = "suggestion-item__form";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "text-input";
    nameInput.placeholder = "Template name";
    nameInput.value = ciqGuessTemplateName(suggestion.templateBody);
    form.appendChild(nameInput);
    card.appendChild(form);

    const actions = document.createElement("div");
    actions.className = "suggestion-item__actions";

    const acceptBtn = document.createElement("button");
    acceptBtn.type = "button";
    acceptBtn.className = "button button--small-inline";
    acceptBtn.textContent = "Save as template";
    acceptBtn.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({
        type: "CIQ_ACCEPT_SUGGESTION",
        id: suggestion.id,
        name: nameInput.value
      });
      showToast("Template saved");
      await loadState();
    });
    actions.appendChild(acceptBtn);

    const dismissBtn = document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.className = "button button--ghost button--small-inline";
    dismissBtn.textContent = "Dismiss";
    dismissBtn.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "CIQ_DISMISS_SUGGESTION", id: suggestion.id });
      await loadState();
    });
    actions.appendChild(dismissBtn);

    card.appendChild(actions);
    suggestionList.appendChild(card);
  });
}

function ciqGuessTemplateName(body) {
  const cleaned = body
    .replace(/{{\s*[\w]+\s*}}/g, "")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  const words = cleaned.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
  return words.slice(0, 5).join(" ") || "Untitled template";
}

function renderTemplates() {
  templateList.innerHTML = "";
  templatesEmpty.hidden = state.templates.length > 0;

  state.templates.forEach((template) => {
    const card = document.createElement("div");
    card.className = "template-item";

    const header = document.createElement("div");
    header.className = "template-item__header";

    const name = document.createElement("div");
    name.className = "template-item__name";
    name.textContent = template.name;
    header.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "template-item__meta";
    meta.textContent = "Used " + (template.useCount || 0) + "x";
    header.appendChild(meta);

    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "template-item__body";
    body.appendChild(highlightPlaceholders(ciqTruncate(template.body, 220)));
    card.appendChild(body);

    const actions = document.createElement("div");
    actions.className = "template-item__actions";

    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.className = "button button--small-inline";
    useBtn.textContent = "Use";
    useBtn.addEventListener("click", () => openFillModal(template));
    actions.appendChild(useBtn);

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "button button--ghost button--small-inline";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openEditorModal(template));
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "button button--ghost button--small-inline";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "CIQ_DELETE_TEMPLATE", id: template.id });
      await loadState();
    });
    actions.appendChild(deleteBtn);

    card.appendChild(actions);
    templateList.appendChild(card);
  });
}

function renderSettings() {
  settingCapture.checked = !!state.settings.captureEnabled;
  const thresholdPct = Math.round((state.settings.similarityThreshold || 0.8) * 100);
  settingThreshold.value = String(thresholdPct);
  settingThresholdValue.textContent = String(thresholdPct);
  settingMinCluster.value = state.settings.minClusterSize;
  settingMaxHistory.value = state.settings.maxHistory;
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
  fillModal.hidden = false;
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
  showToast("Copied to clipboard");
  closeFillModal();
  await loadState();
});

function openEditorModal(template) {
  editingTemplateId = template ? template.id : null;
  editorModalTitle.textContent = template ? "Edit template" : "New template";
  editorName.value = template ? template.name : "";
  editorBody.value = template ? template.body : "";
  editorModal.hidden = false;
}

function closeEditorModal() {
  editorModal.hidden = true;
  editingTemplateId = null;
}

btnNewTemplate.addEventListener("click", () => openEditorModal(null));
editorModalCancel.addEventListener("click", closeEditorModal);
editorModalBackdrop.addEventListener("click", closeEditorModal);

editorModalSave.addEventListener("click", async () => {
  const name = editorName.value.trim();
  const body = editorBody.value.trim();
  if (!body) return;
  await chrome.runtime.sendMessage({
    type: "CIQ_SAVE_TEMPLATE",
    template: { id: editingTemplateId, name: name || "Untitled template", body }
  });
  showToast(editingTemplateId ? "Template updated" : "Template created");
  closeEditorModal();
  await loadState();
});

dashTabs.addEventListener("click", (event) => {
  const btn = event.target.closest(".dash-tab");
  if (!btn) return;
  setActiveTab(btn.dataset.tab);
});

function setActiveTab(tab) {
  document.querySelectorAll(".dash-tab").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tab === tab);
  });
  document.querySelectorAll(".dash-panel").forEach((panel) => {
    panel.hidden = panel.dataset.tabPanel !== tab;
  });
}

historySearch.addEventListener("input", renderHistory);

btnClearHistory.addEventListener("click", async () => {
  if (!confirm("Clear all clipboard history? This cannot be undone.")) return;
  await chrome.runtime.sendMessage({ type: "CIQ_CLEAR_HISTORY" });
  await loadState();
});

btnClearAll.addEventListener("click", async () => {
  if (!confirm("Clear all ClipboardIQ data — history, suggestions, and templates? This cannot be undone.")) return;
  await chrome.runtime.sendMessage({ type: "CIQ_CLEAR_ALL" });
  await loadState();
});

settingCapture.addEventListener("change", async () => {
  await chrome.runtime.sendMessage({
    type: "CIQ_UPDATE_SETTINGS",
    settings: { captureEnabled: settingCapture.checked }
  });
});

settingThreshold.addEventListener("input", () => {
  settingThresholdValue.textContent = settingThreshold.value;
});

settingThreshold.addEventListener("change", async () => {
  await chrome.runtime.sendMessage({
    type: "CIQ_UPDATE_SETTINGS",
    settings: { similarityThreshold: Number(settingThreshold.value) / 100 }
  });
});

settingMinCluster.addEventListener("change", async () => {
  const value = Math.max(2, Math.min(6, Number(settingMinCluster.value) || 3));
  settingMinCluster.value = value;
  await chrome.runtime.sendMessage({
    type: "CIQ_UPDATE_SETTINGS",
    settings: { minClusterSize: value }
  });
});

settingMaxHistory.addEventListener("change", async () => {
  const value = Math.max(20, Math.min(500, Number(settingMaxHistory.value) || 200));
  settingMaxHistory.value = value;
  await chrome.runtime.sendMessage({
    type: "CIQ_UPDATE_SETTINGS",
    settings: { maxHistory: value }
  });
});

document.getElementById("btn-close").addEventListener("click", () => window.close());

const initialTab = new URLSearchParams(location.search).get("tab");
if (initialTab) setActiveTab(initialTab);

loadState();
