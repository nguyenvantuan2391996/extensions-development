importScripts("constants.js", "similarity.js", "placeholder-extractor.js", "store.js");

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await ciqGetSettings();
  await ciqSetSettings(settings);
  await ciqUpdateBadge();
  await ciqRebuildContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  ciqRebuildContextMenus();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String(err) }));
  return true;
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const menuItemId = String(info.menuItemId || "");
  if (!menuItemId.startsWith("ciq-tpl-") || !tab || !tab.id) return;

  const templateId = menuItemId.slice("ciq-tpl-".length);
  const templates = await ciqGetTemplates();
  const template = templates.find((t) => t.id === templateId);
  if (!template) return;

  chrome.tabs.sendMessage(tab.id, {
    type: "CIQ_INSERT_TEMPLATE",
    template: { id: template.id, name: template.name, body: template.body }
  });
  await touchTemplateUse(template.id);
});

// The service worker can be woken up by any event without onInstalled/onStartup
// firing, so rebuild the menu tree every time this script runs.
ciqRebuildContextMenus();

async function ciqRebuildContextMenus() {
  await new Promise((resolve) => chrome.contextMenus.removeAll(resolve));

  const templates = await ciqGetTemplates();
  if (templates.length === 0) return;

  chrome.contextMenus.create({
    id: "ciq-root",
    title: "ClipboardIQ",
    contexts: ["editable"]
  });

  templates.slice(0, 20).forEach((template) => {
    chrome.contextMenus.create({
      id: "ciq-tpl-" + template.id,
      parentId: "ciq-root",
      title: template.name,
      contexts: ["editable"]
    });
  });
}

async function handleMessage(message) {
  switch (message.type) {
    case "CIQ_CLIP_CAPTURED":
      return handleNewClip(message.payload);
    case "CIQ_GET_STATE":
      return getFullState();
    case "CIQ_DELETE_HISTORY_ITEM":
      return deleteHistoryItem(message.id);
    case "CIQ_CLEAR_HISTORY":
      return clearHistory();
    case "CIQ_DISMISS_SUGGESTION":
      return dismissSuggestion(message.id);
    case "CIQ_ACCEPT_SUGGESTION":
      return acceptSuggestion(message.id, message.name);
    case "CIQ_SAVE_TEMPLATE":
      return saveTemplate(message.template);
    case "CIQ_DELETE_TEMPLATE":
      return deleteTemplate(message.id);
    case "CIQ_TOUCH_TEMPLATE_USE":
      return touchTemplateUse(message.id);
    case "CIQ_UPDATE_SETTINGS":
      return updateSettings(message.settings);
    case "CIQ_CLEAR_ALL":
      return clearAllData();
    default:
      return { ok: false, error: "Unknown message type: " + message.type };
  }
}

async function handleNewClip(payload) {
  const settings = await ciqGetSettings();
  if (!settings.captureEnabled) return { ok: true, skipped: true };

  const text = (payload && payload.text ? payload.text : "").trim();
  if (text.length < CIQ_MIN_CAPTURE_LENGTH || text.length > CIQ_MAX_CAPTURE_LENGTH) {
    return { ok: true, skipped: true };
  }

  let history = await ciqGetHistory();
  const last = history[history.length - 1];
  if (last && last.text === text && Date.now() - last.capturedAt < CIQ_DEDUP_WINDOW_MS) {
    return { ok: true, skipped: true };
  }

  const clip = {
    id: ciqId("clip"),
    text,
    host: (payload && payload.host) || "",
    capturedAt: Date.now()
  };
  history.push(clip);
  if (history.length > settings.maxHistory) {
    history = history.slice(history.length - settings.maxHistory);
  }
  await ciqSetHistory(history);

  await ciqCluster(clip, settings);
  await ciqUpdateBadge();
  return { ok: true };
}

async function ciqCluster(clip, settings) {
  const clusters = await ciqGetClusters();

  let bestCluster = null;
  let bestScore = 0;
  clusters.forEach((cluster) => {
    if (cluster.converted) return;
    const score = ciqSimilarity(clip.text, cluster.centroidText);
    if (score > bestScore) {
      bestScore = score;
      bestCluster = cluster;
    }
  });

  if (bestCluster && bestScore >= settings.similarityThreshold) {
    bestCluster.memberIds.push(clip.id);
    bestCluster.centroidText = clip.text;
    bestCluster.updatedAt = Date.now();
  } else {
    const history = await ciqGetHistory();
    const clusteredIds = new Set(clusters.flatMap((c) => c.memberIds));
    const candidates = history
      .filter((h) => h.id !== clip.id && !clusteredIds.has(h.id))
      .slice(-CIQ_UNCLUSTERED_LOOKBACK);

    let matchPartner = null;
    let matchScore = 0;
    candidates.forEach((candidate) => {
      const score = ciqSimilarity(clip.text, candidate.text);
      if (score > matchScore) {
        matchScore = score;
        matchPartner = candidate;
      }
    });

    if (matchPartner && matchScore >= settings.similarityThreshold) {
      clusters.push({
        id: ciqId("cluster"),
        memberIds: [matchPartner.id, clip.id],
        centroidText: clip.text,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        dismissed: false,
        converted: false,
        suggestionId: null,
        lastSuggestedSize: 0
      });
    }
  }

  await ciqSetClusters(clusters);
  await ciqRefreshSuggestions(clusters, settings);
}

async function ciqRefreshSuggestions(clusters, settings) {
  const history = await ciqGetHistory();
  const historyById = new Map(history.map((h) => [h.id, h]));
  const suggestions = await ciqGetSuggestions();
  let changed = false;

  clusters.forEach((cluster) => {
    if (cluster.converted || cluster.dismissed) return;
    if (cluster.memberIds.length < settings.minClusterSize) return;
    if (cluster.suggestionId && cluster.memberIds.length < cluster.lastSuggestedSize + CIQ_CLUSTER_GROWTH_FOR_RESURFACE) {
      return;
    }

    const memberTexts = cluster.memberIds
      .map((id) => historyById.get(id))
      .filter(Boolean)
      .map((h) => h.text);
    if (memberTexts.length < settings.minClusterSize) return;

    const built = ciqBuildTemplate(memberTexts);
    const existingIdx = suggestions.findIndex((s) => s.id === cluster.suggestionId);
    const suggestion = {
      id: cluster.suggestionId || ciqId("sugg"),
      clusterId: cluster.id,
      templateBody: built.body,
      placeholders: built.placeholders,
      sampleTexts: memberTexts.slice(-3),
      memberCount: memberTexts.length,
      createdAt: existingIdx >= 0 ? suggestions[existingIdx].createdAt : Date.now(),
      updatedAt: Date.now(),
      status: "pending"
    };

    if (existingIdx >= 0) {
      suggestions[existingIdx] = suggestion;
    } else {
      suggestions.push(suggestion);
    }
    cluster.suggestionId = suggestion.id;
    cluster.lastSuggestedSize = cluster.memberIds.length;
    changed = true;
  });

  if (changed) {
    await ciqSetSuggestions(suggestions);
    await ciqSetClusters(clusters);
  }
}

async function getFullState() {
  const [history, suggestions, templates, settings] = await Promise.all([
    ciqGetHistory(),
    ciqGetSuggestions(),
    ciqGetTemplates(),
    ciqGetSettings()
  ]);
  return {
    ok: true,
    history: history.slice().reverse(),
    suggestions: suggestions
      .filter((s) => s.status === "pending")
      .sort((a, b) => b.updatedAt - a.updatedAt),
    templates: templates.slice().sort((a, b) => b.createdAt - a.createdAt),
    settings
  };
}

async function deleteHistoryItem(id) {
  const history = await ciqGetHistory();
  await ciqSetHistory(history.filter((h) => h.id !== id));
  return { ok: true };
}

async function clearHistory() {
  await ciqSetHistory([]);
  await ciqSetClusters([]);
  await ciqUpdateBadge();
  return { ok: true };
}

async function dismissSuggestion(id) {
  const suggestions = await ciqGetSuggestions();
  const suggestion = suggestions.find((s) => s.id === id);
  if (suggestion) suggestion.status = "dismissed";
  await ciqSetSuggestions(suggestions);

  if (suggestion) {
    const clusters = await ciqGetClusters();
    const cluster = clusters.find((c) => c.id === suggestion.clusterId);
    if (cluster) cluster.dismissed = true;
    await ciqSetClusters(clusters);
  }

  await ciqUpdateBadge();
  return { ok: true };
}

async function acceptSuggestion(id, name) {
  const suggestions = await ciqGetSuggestions();
  const suggestion = suggestions.find((s) => s.id === id);
  if (!suggestion) return { ok: false, error: "Suggestion not found" };

  const templates = await ciqGetTemplates();
  const template = {
    id: ciqId("tpl"),
    name: name && name.trim() ? name.trim() : "Untitled template",
    body: suggestion.templateBody,
    placeholders: suggestion.placeholders,
    createdAt: Date.now(),
    lastUsedAt: null,
    useCount: 0,
    sourceCount: suggestion.memberCount
  };
  templates.push(template);
  await ciqSetTemplates(templates);

  suggestion.status = "accepted";
  await ciqSetSuggestions(suggestions);

  const clusters = await ciqGetClusters();
  const cluster = clusters.find((c) => c.id === suggestion.clusterId);
  if (cluster) cluster.converted = true;
  await ciqSetClusters(clusters);

  await ciqUpdateBadge();
  await ciqRebuildContextMenus();
  return { ok: true, template };
}

async function saveTemplate(templatePatch) {
  const templates = await ciqGetTemplates();
  if (templatePatch.id) {
    const existing = templates.find((t) => t.id === templatePatch.id);
    if (!existing) return { ok: false, error: "Template not found" };
    existing.name = templatePatch.name;
    existing.body = templatePatch.body;
    existing.placeholders = ciqExtractPlaceholderTokens(templatePatch.body);
  } else {
    templates.push({
      id: ciqId("tpl"),
      name: templatePatch.name || "Untitled template",
      body: templatePatch.body || "",
      placeholders: ciqExtractPlaceholderTokens(templatePatch.body || ""),
      createdAt: Date.now(),
      lastUsedAt: null,
      useCount: 0,
      sourceCount: 0
    });
  }
  await ciqSetTemplates(templates);
  await ciqRebuildContextMenus();
  return { ok: true, templates };
}

function ciqExtractPlaceholderTokens(body) {
  const matches = body.match(/{{\s*[\w]+\s*}}/g) || [];
  const seen = new Set();
  const placeholders = [];
  matches.forEach((raw) => {
    const token = raw.replace(/\s+/g, "");
    if (seen.has(token)) return;
    seen.add(token);
    const type = token.replace(/[{}]/g, "");
    placeholders.push({ token, type, sampleValues: [] });
  });
  return placeholders;
}

async function deleteTemplate(id) {
  const templates = await ciqGetTemplates();
  await ciqSetTemplates(templates.filter((t) => t.id !== id));
  await ciqRebuildContextMenus();
  return { ok: true };
}

async function touchTemplateUse(id) {
  const templates = await ciqGetTemplates();
  const template = templates.find((t) => t.id === id);
  if (template) {
    template.useCount = (template.useCount || 0) + 1;
    template.lastUsedAt = Date.now();
    await ciqSetTemplates(templates);
  }
  return { ok: true };
}

async function updateSettings(patch) {
  const settings = await ciqGetSettings();
  const next = Object.assign({}, settings, patch);
  await ciqSetSettings(next);
  return { ok: true, settings: next };
}

async function clearAllData() {
  await ciqSetHistory([]);
  await ciqSetClusters([]);
  await ciqSetSuggestions([]);
  await ciqSetTemplates([]);
  await ciqUpdateBadge();
  await ciqRebuildContextMenus();
  return { ok: true };
}

async function ciqUpdateBadge() {
  const suggestions = await ciqGetSuggestions();
  const pending = suggestions.filter((s) => s.status === "pending").length;
  chrome.action.setBadgeText({ text: pending > 0 ? String(pending) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#ff3d9a" });
}
