function ciqStorageGet(defaults) {
  return new Promise((resolve) => {
    chrome.storage.local.get(defaults, (result) => resolve(result));
  });
}

function ciqStorageSet(obj) {
  return new Promise((resolve) => {
    chrome.storage.local.set(obj, () => resolve());
  });
}

async function ciqGetSettings() {
  const result = await ciqStorageGet({ [CIQ_STORAGE_KEYS.SETTINGS]: CIQ_DEFAULT_SETTINGS });
  return Object.assign({}, CIQ_DEFAULT_SETTINGS, result[CIQ_STORAGE_KEYS.SETTINGS]);
}

function ciqSetSettings(settings) {
  return ciqStorageSet({ [CIQ_STORAGE_KEYS.SETTINGS]: settings });
}

async function ciqGetHistory() {
  const result = await ciqStorageGet({ [CIQ_STORAGE_KEYS.HISTORY]: [] });
  return result[CIQ_STORAGE_KEYS.HISTORY];
}

function ciqSetHistory(history) {
  return ciqStorageSet({ [CIQ_STORAGE_KEYS.HISTORY]: history });
}

async function ciqGetClusters() {
  const result = await ciqStorageGet({ [CIQ_STORAGE_KEYS.CLUSTERS]: [] });
  return result[CIQ_STORAGE_KEYS.CLUSTERS];
}

function ciqSetClusters(clusters) {
  return ciqStorageSet({ [CIQ_STORAGE_KEYS.CLUSTERS]: clusters });
}

async function ciqGetSuggestions() {
  const result = await ciqStorageGet({ [CIQ_STORAGE_KEYS.SUGGESTIONS]: [] });
  return result[CIQ_STORAGE_KEYS.SUGGESTIONS];
}

function ciqSetSuggestions(suggestions) {
  return ciqStorageSet({ [CIQ_STORAGE_KEYS.SUGGESTIONS]: suggestions });
}

async function ciqGetTemplates() {
  const result = await ciqStorageGet({ [CIQ_STORAGE_KEYS.TEMPLATES]: [] });
  return result[CIQ_STORAGE_KEYS.TEMPLATES];
}

function ciqSetTemplates(templates) {
  return ciqStorageSet({ [CIQ_STORAGE_KEYS.TEMPLATES]: templates });
}
