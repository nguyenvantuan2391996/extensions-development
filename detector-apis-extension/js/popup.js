const popupState = {
  items: {},
  apiEntries: [],
  searchTerm: "",
  selectedCurlId: null,
  activeTab: "overview",
  activeTabId: null,
  debugState: null,
  connectionStatus: "Waiting for background worker",
  hydrateTimer: null,
};

const popupElements = {};

window.addEventListener("load", async (event) => {
  console.log(event);

  cacheElements();
  registerUIEvents();

  await updateSwitchValue();
  await refreshActiveTab();
  await hydrateRequests();
});

function cacheElements() {
  popupElements.tbody = document.querySelector("#table-result-detector-apis>tbody");
  popupElements.searchInput = document.getElementById("request-search");
  popupElements.requestCount = document.getElementById("request-count");
  popupElements.visibleCount = document.getElementById("visible-count");
  popupElements.requestSummary = document.getElementById("request-summary");
  popupElements.detailsTitle = document.getElementById("details-title");
  popupElements.detailsSubtitle = document.getElementById("details-subtitle");
  popupElements.detailsOverview = document.getElementById("details-overview");
  popupElements.copySelected = document.getElementById("copy-selected");
  popupElements.curlPreview = document.getElementById("curl-preview");
  popupElements.payloadPreview = document.getElementById("payload-preview");
  popupElements.tabs = Array.from(document.querySelectorAll(".tab"));
  popupElements.tabPanels = Array.from(document.querySelectorAll(".tab-panel"));
  popupElements.debugInterceptedCount = document.getElementById("debug-intercepted-count");
  popupElements.debugStoredCount = document.getElementById("debug-stored-count");
  popupElements.debugListenerStatus = document.getElementById("debug-listener-status");
  popupElements.debugActiveTab = document.getElementById("debug-active-tab");
  popupElements.debugLastEvent = document.getElementById("debug-last-event");
  popupElements.debugConnectionStatus = document.getElementById("debug-connection-status");
}

function registerUIEvents() {
  popupElements.tbody.addEventListener("click", async function (event) {
    const copyButton = event.target.closest('[data-role="copy-request"]');
    if (copyButton) {
      try {
        await copyCurl(copyButton.id, popupState.items);
        pulseCopyButton(copyButton);
      } catch (e) {
        console.log(e);
      }
      return;
    }

    const selectButton = event.target.closest('[data-role="select-request"]');
    if (selectButton) {
      popupState.selectedCurlId = selectButton.dataset.curlId;
      renderPopup();
    }
  });

  popupElements.searchInput.addEventListener("input", function (event) {
    popupState.searchTerm = event.target.value.trim().toLowerCase();
    syncSelectedRequest();
    renderPopup();
  });

  popupElements.copySelected.addEventListener("click", async function () {
    if (!popupState.selectedCurlId) {
      return;
    }

    try {
      await copyCurl(popupState.selectedCurlId, popupState.items);
      pulseCopyButton(popupElements.copySelected);
    } catch (e) {
      console.log(e);
    }
  });

  for (const tab of popupElements.tabs) {
    tab.addEventListener("click", function () {
      popupState.activeTab = tab.dataset.tab;
      syncTabs();
    });
  }

  chrome.storage.onChanged.addListener(handleStorageChange);
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);

  window.addEventListener("keydown", function (event) {
    const tagName = document.activeElement?.tagName;
    const isTyping = tagName === "INPUT" || tagName === "TEXTAREA";

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      popupElements.searchInput.focus();
      popupElements.searchInput.select();
      return;
    }

    if (event.key === "/" && !isTyping) {
      event.preventDefault();
      popupElements.searchInput.focus();
      return;
    }

    if (event.key === "Escape" && document.activeElement === popupElements.searchInput) {
      popupElements.searchInput.value = "";
      popupState.searchTerm = "";
      syncSelectedRequest();
      renderPopup();
    }
  });

  document.getElementById("preserve-log").addEventListener("change", async function (event) {
    await chrome.storage.local.set({
      [PRESERVE_LOG_KEY]: !!event.target.checked,
    });
  });
}

async function hydrateRequests() {
  popupState.items = await getStorageItems();
  popupState.debugState = popupState.items[DEBUG_STATE_KEY] || null;
  popupState.apiEntries = buildApiEntries(popupState.items, popupState.activeTabId);
  syncSelectedRequest();
  renderPopup();
}

function handleStorageChange(changes, areaName) {
  if (areaName !== "local") {
    return;
  }

  const shouldRefresh = Object.keys(changes).some((key) => {
    return key === DEBUG_STATE_KEY || key === PRESERVE_LOG_KEY || isRequestRecordStorageKey(key);
  });

  if (shouldRefresh) {
    scheduleHydrate("storage");
  }
}

function handleRuntimeMessage(message) {
  if (!message || message.type !== "detector-apis-record-updated") {
    return;
  }

  popupState.connectionStatus = "Live sync connected";
  console.log("[Detector APIs][popup] background-update", message);
  scheduleHydrate("runtime-message");
}

function scheduleHydrate(reason) {
  if (popupState.hydrateTimer) {
    clearTimeout(popupState.hydrateTimer);
  }

  popupState.hydrateTimer = setTimeout(async function () {
    popupState.hydrateTimer = null;
    console.log("[Detector APIs][popup] hydrate", { reason });
    await refreshActiveTab();
    await hydrateRequests();
  }, 60);
}

async function refreshActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query(
      {
        active: true,
        lastFocusedWindow: true,
      },
      function (tabs) {
        popupState.activeTabId = tabs && tabs[0] ? tabs[0].id : null;
        renderDebugPanel();
        resolve(popupState.activeTabId);
      }
    );
  });
}

function getStorageItems() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, function (items) {
      resolve(items || {});
    });
  });
}

function buildApiEntries(items, activeTabId) {
  const requestRecordKeys = Object.keys(items).filter((key) => isRequestRecordStorageKey(key));
  if (requestRecordKeys.length) {
    return requestRecordKeys
      .map((key) => items[key])
      .filter((record) => isRenderableRecord(record, activeTabId))
      .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
      .map((record) => {
        const statusText = record.statusText || buildStatusText(record.statusCode, record.method);
        return {
          url: record.url,
          curlId: getCopyIdentifier(record.id),
          statusText,
          statusCode: Number(record.statusCode) || 0,
          method: record.method || "GET",
          requestId: record.requestHeaderId || record.requestId || "",
          contentType: record.contentType || record.type || "Network request",
          rawData: record.rawData || "",
          curlCommand: joinCurlCommand(record.curlCommandBase, record.rawData),
          startedAt: record.startedAt || 0,
        };
      });
  }

  return buildLegacyApiEntries(items);
}

function buildLegacyApiEntries(items) {
  let seenUrls = [];
  let apiEntries = [];

  for (const element of Object.keys(items)) {
    const url = items[element];
    if (typeof url !== "string" || !items[url] || isExistedInArray(seenUrls, url)) {
      continue;
    }

    seenUrls.push(url);
    const statusAndRequestID = String(items[url]).split("|");
    const contentType = statusAndRequestID[2] || "";
    const statusText = statusAndRequestID[0] || "Unknown";
    const method = statusText.split(" ")[1] || "GET";
    const statusCode = Number(statusText.split(" ")[0]) || 0;
    const curlId = url + "-curl-detector-apis";
    const rawData = items[url + "-raw-data"] || "";
    const baseCurlCommand = items[curlId] || "";

    apiEntries.push({
      url,
      curlId,
      statusText,
      statusCode,
      method,
      requestId: statusAndRequestID[1] || "",
      contentType: contentType || "Network request",
      rawData,
      curlCommand: joinCurlCommand(baseCurlCommand, rawData),
      startedAt: 0,
    });
  }

  return apiEntries.sort((left, right) => right.startedAt - left.startedAt);
}

function getFilteredEntries() {
  if (!popupState.searchTerm) {
    return popupState.apiEntries;
  }

  return popupState.apiEntries.filter((apiEntry) => {
    const haystack = [
      apiEntry.url,
      apiEntry.method,
      apiEntry.statusText,
      apiEntry.requestId,
      apiEntry.contentType,
    ].join(" ").toLowerCase();

    return haystack.includes(popupState.searchTerm);
  });
}

function syncSelectedRequest() {
  const filteredEntries = getFilteredEntries();
  if (!filteredEntries.length) {
    popupState.selectedCurlId = null;
    return;
  }

  const hasSelectedVisible = filteredEntries.some((apiEntry) => apiEntry.curlId === popupState.selectedCurlId);
  if (!hasSelectedVisible) {
    popupState.selectedCurlId = filteredEntries[0].curlId;
  }
}

function renderPopup() {
  const filteredEntries = getFilteredEntries();
  const selectedEntry = getSelectedEntry(filteredEntries);
  const emptyState = popupState.searchTerm
    ? {
        title: "No requests match your search",
        description: "Try another keyword, method, status code, or clear the command-bar filter.",
      }
    : {
        title: "Waiting for network traffic",
        description: "Open a page that makes requests in the active tab and they will stream here automatically.",
      };

  popupElements.tbody.innerHTML = PopupUI.renderRequestRows(filteredEntries, popupState.selectedCurlId, emptyState);
  popupElements.requestCount.textContent = String(popupState.apiEntries.length);
  popupElements.visibleCount.textContent = String(filteredEntries.length);
  popupElements.requestSummary.textContent = filteredEntries.length
    ? `${filteredEntries.length} request${filteredEntries.length > 1 ? "s" : ""} ready to inspect`
    : emptyState.title;

  renderDetails(selectedEntry);
  renderDebugPanel();
  syncTabs();

  console.log("[Detector APIs][popup] request-rendered", {
    activeTabId: popupState.activeTabId,
    total: popupState.apiEntries.length,
    visible: filteredEntries.length,
  });
}

function getSelectedEntry(filteredEntries) {
  return filteredEntries.find((apiEntry) => apiEntry.curlId === popupState.selectedCurlId) || null;
}

function renderDetails(selectedEntry) {
  popupElements.copySelected.disabled = !selectedEntry;

  if (!selectedEntry) {
    popupElements.detailsTitle.textContent = "No request selected";
    popupElements.detailsSubtitle.textContent = "Choose a captured request to preview metadata and its generated terminal command.";
    popupElements.detailsOverview.innerHTML = PopupUI.renderOverview(null);
    popupElements.curlPreview.textContent = "No CURL preview available.";
    popupElements.payloadPreview.textContent = "No request payload captured.";
    return;
  }

  popupElements.detailsTitle.textContent = selectedEntry.method + " • " + selectedEntry.statusCode;
  popupElements.detailsSubtitle.textContent = selectedEntry.url;
  popupElements.detailsOverview.innerHTML = PopupUI.renderOverview(selectedEntry);
  popupElements.curlPreview.textContent = selectedEntry.curlCommand || "No CURL preview available.";
  popupElements.payloadPreview.textContent = selectedEntry.rawData || "No request payload captured.";
}

function syncTabs() {
  for (const tab of popupElements.tabs) {
    const isActive = tab.dataset.tab === popupState.activeTab;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  }

  for (const panel of popupElements.tabPanels) {
    const isActive = panel.dataset.panel === popupState.activeTab;
    panel.classList.toggle("is-active", isActive);
    panel.setAttribute("aria-hidden", String(!isActive));
  }
}

function pulseCopyButton(button) {
  button.classList.add("is-copied");
  setTimeout(() => {
    button.classList.remove("is-copied");
  }, 1200);
}

async function copyCurl(id, items) {
  let curlCommand = "";

  if (isRequestRecordStorageKey(id)) {
    const record = items[id] || {};
    curlCommand = joinCurlCommand(record.curlCommandBase, record.rawData);
  } else {
    curlCommand = items[id] || "";
    const requestUrl = id.replace(/-curl-detector-apis$/, "");
    if (items[requestUrl + "-raw-data"]) {
      curlCommand += " " + items[requestUrl + "-raw-data"];
    }
  }

  await navigator.clipboard.writeText(curlCommand).then(async (r) => {
    try {
      console.log(r);
      await displayAlert("alert-success", "Copied successfully!", 2000);
    } catch (e) {
      console.log(e);
    }
  });
}

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

async function displayAlert(typeAlert, msg, delayTime) {
  document.getElementById(typeAlert).style.display = "block";
  document.getElementById(typeAlert).innerHTML = msg;
  await delay(delayTime);
  document.getElementById(typeAlert).style.display = "none";
}

async function updateSwitchValue() {
  let switchPreserve = document.getElementById("preserve-log");
  await chrome.storage.local.get([
    PRESERVE_LOG_KEY
  ], async function (items) {
    switchPreserve.checked = !!items[PRESERVE_LOG_KEY];
  });
}

function renderDebugPanel() {
  const debugState = popupState.debugState || {};
  popupElements.debugInterceptedCount.textContent = String(debugState.interceptedCount || 0);
  popupElements.debugStoredCount.textContent = String(debugState.storedCount || 0);
  popupElements.debugListenerStatus.textContent = debugState.listenerStatus || "Unknown";
  popupElements.debugActiveTab.textContent = popupState.activeTabId === null ? "Unavailable" : String(popupState.activeTabId);
  popupElements.debugConnectionStatus.textContent = popupState.connectionStatus || "Waiting for background worker";

  if (debugState.lastRequestUrl) {
    popupElements.debugLastEvent.textContent = `${debugState.lastPhase || "event"} · ${debugState.lastRequestMethod || "GET"} · ${debugState.lastRequestUrl}`;
  } else {
    popupElements.debugLastEvent.textContent = "Waiting for requests";
  }
}

function isRequestRecordStorageKey(key) {
  return typeof key === "string" && key.startsWith(REQUEST_RECORD_PREFIX);
}

function isRenderableRecord(record, activeTabId) {
  if (!record || !record.url) {
    return false;
  }

  if (activeTabId !== null && !checkUndefined(activeTabId) && record.tabId !== activeTabId) {
    return false;
  }

  return true;
}

function buildStatusText(statusCode, method) {
  if (!statusCode) {
    return `Pending ${method || "GET"}`;
  }

  return `${statusCode} ${method || "GET"}`;
}

function joinCurlCommand(baseCurlCommand, rawData) {
  let curlCommand = baseCurlCommand || "";
  if (rawData) {
    curlCommand += curlCommand ? ` ${rawData}` : rawData;
  }

  return curlCommand;
}

function getCopyIdentifier(requestId) {
  return REQUEST_RECORD_PREFIX + requestId;
}
