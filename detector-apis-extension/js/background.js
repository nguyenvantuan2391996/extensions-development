importScripts("constants.js");
importScripts("utils.js");

const BACKGROUND_BOOTED_AT = new Date().toISOString();

logBackground("service-worker-booted", {
  bootedAt: BACKGROUND_BOOTED_AT,
});

initializeDebugState();

chrome.webRequest.onBeforeRequest.addListener(
  async function (details) {
    if (!shouldCaptureRequest(details)) {
      return;
    }

    const record = await upsertRequestRecord(details.requestId, {
      requestId: details.requestId,
      url: details.url,
      method: details.method,
      type: details.type,
      tabId: details.tabId,
      initiator: details.initiator || "",
      startedAt: Date.now(),
    });

    await updateDebugState({
      incrementIntercepted: true,
      lastPhase: "intercepted",
      activeTabId: details.tabId,
      lastRequestUrl: details.url,
      lastRequestMethod: details.method,
    });

    logBackground("request-intercepted", {
      requestId: details.requestId,
      method: details.method,
      tabId: details.tabId,
      type: details.type,
      url: details.url,
    });

    await notifyPopup("intercepted", record);
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

chrome.webRequest.onHeadersReceived.addListener(
  async function (details) {
    if (!shouldCaptureRequest(details)) {
      return;
    }

    let headers = details.responseHeaders;
    const contentType = getValueHeaderByKey(CONTENT_TYPE, headers);
    const requestHeaderId = getValueHeaderByKey(X_REQUEST_ID_DETECTOR_API, headers);

    const record = await upsertRequestRecord(details.requestId, {
      requestId: details.requestId,
      url: details.url,
      method: details.method,
      tabId: details.tabId,
      statusCode: details.statusCode,
      statusText: details.statusCode + " " + details.method,
      requestHeaderId,
      contentType,
      responseHeaders: normalizeHeaders(headers),
      completedAt: Date.now(),
    });

    await trimStoredRequests();
    await updateDebugState({
      incrementStored: true,
      lastPhase: "stored",
      activeTabId: details.tabId,
      lastRequestUrl: details.url,
      lastRequestMethod: details.method,
    });

    logBackground("request-stored", {
      requestId: details.requestId,
      statusCode: details.statusCode,
      contentType,
      url: details.url,
    });

    await notifyPopup("stored", record);
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders", "extraHeaders"]
);

function getValueHeaderByKey(key, headers) {
  for (const header of headers) {
    if (header.name.toLowerCase() === key) {
      return header.value;
    }
  }

  return "";
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  async function (details) {
    if (!shouldCaptureRequest(details)) {
      return;
    }

    const curlCommandBase = buildCurlCommand(details);
    const record = await upsertRequestRecord(details.requestId, {
      requestId: details.requestId,
      url: details.url,
      method: details.method,
      tabId: details.tabId,
      curlCommandBase,
      requestHeaders: normalizeHeaders(details.requestHeaders || []),
    });

    await updateDebugState({
      incrementTransformed: true,
      lastPhase: "transformed",
      activeTabId: details.tabId,
      lastRequestUrl: details.url,
      lastRequestMethod: details.method,
    });

    logBackground("request-transformed", {
      requestId: details.requestId,
      method: details.method,
      url: details.url,
    });

    await notifyPopup("transformed", record);
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

chrome.webRequest.onBeforeRequest.addListener(
  async function (details) {
    if (!shouldCaptureRequest(details)) {
      return;
    }

    const rawData = transformRequestBody(details);
    if (!rawData) {
      return;
    }

    const record = await upsertRequestRecord(details.requestId, {
      requestId: details.requestId,
      url: details.url,
      method: details.method,
      tabId: details.tabId,
      rawData,
    });

    logBackground("request-body-transformed", {
      requestId: details.requestId,
      method: details.method,
      url: details.url,
    });

    await notifyPopup("transformed", record);
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// load main website
chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
  await chrome.tabs.query(
    {
      active: true,
      lastFocusedWindow: true,
    },
    async function (tabs) {
        if (
            changeInfo.status === LOADING &&
            !checkUndefined(tabs[0]) &&
            !checkUndefined(tab) &&
            tabs[0].url === tab.url
        ) {
            await chrome.storage.local.get([
                PRESERVE_LOG_KEY
            ], async function (items) {
               if (!!!items.preserve_log_key) {
                   await clearCapturedRequests();
               }
            });
        }
    }
  );
});

async function initializeDebugState() {
  await updateDebugState({
    listenerStatus: "active",
    backgroundStartedAt: BACKGROUND_BOOTED_AT,
    lastPhase: "idle",
  });
}

function shouldCaptureRequest(details) {
  if (!details || details.tabId < 0 || !details.url) {
    return false;
  }

  if (details.url.startsWith("chrome-extension://") || details.url.startsWith("chrome://")) {
    return false;
  }

  const ignoredTypes = [
    "main_frame",
    "sub_frame",
    "stylesheet",
    "image",
    "font",
    "media",
    "object",
    "script",
  ];

  return !ignoredTypes.includes(details.type);
}

function buildCurlCommand(details) {
  let curlCommand = "curl";
  if (details.method && details.method !== "GET") {
    curlCommand += " --request " + details.method;
  }

  curlCommand += " '" + details.url + "'";

  (details.requestHeaders || []).forEach(function (header) {
    curlCommand += " -H '" + header.name + ": " + header.value + "'";
  });

  return curlCommand;
}

function transformRequestBody(details) {
  const method = String(details.method || "").toUpperCase();
  if (!["POST", "PUT", "PATCH"].includes(method)) {
    return "";
  }

  const requestBody = details.requestBody;
  if (!requestBody) {
    return "";
  }

  if (requestBody.raw && requestBody.raw[0] && requestBody.raw[0].bytes) {
    const uint8Array = new Uint8Array(requestBody.raw[0].bytes);
    const textDecoder = new TextDecoder("utf-8");
    const decodedString = textDecoder.decode(uint8Array);
    return method === "PUT"
      ? "--data '" + decodedString + "'"
      : "--data-raw '" + decodedString + "'";
  }

  if (requestBody.formData) {
    let rawDataBody = "";
    for (const key in requestBody.formData) {
      if (Object.prototype.hasOwnProperty.call(requestBody.formData, key)) {
        rawDataBody += `${key}=${requestBody.formData[key][0]}&`;
      }
    }

    return method === "PUT"
      ? "--data '" + rawDataBody + "'"
      : "--data-raw '" + rawDataBody + "'";
  }

  return "";
}

function normalizeHeaders(headers) {
  return (headers || []).map(function (header) {
    return {
      name: header.name,
      value: header.value,
    };
  });
}

function getRequestStorageKey(requestId) {
  return REQUEST_RECORD_PREFIX + requestId;
}

async function upsertRequestRecord(requestId, partialRecord) {
  const storageKey = getRequestStorageKey(requestId);
  const existingItems = await getStorageItems([storageKey]);
  const existingRecord = existingItems[storageKey] || {};
  const nextRecord = {
    id: requestId,
    requestId,
    url: partialRecord.url || existingRecord.url || "",
    method: partialRecord.method || existingRecord.method || "GET",
    type: partialRecord.type || existingRecord.type || "",
    tabId: checkUndefined(partialRecord.tabId) ? (existingRecord.tabId || -1) : partialRecord.tabId,
    initiator: partialRecord.initiator || existingRecord.initiator || "",
    requestHeaderId: partialRecord.requestHeaderId || existingRecord.requestHeaderId || "",
    statusCode: checkUndefined(partialRecord.statusCode) ? (existingRecord.statusCode || 0) : partialRecord.statusCode,
    statusText: partialRecord.statusText || existingRecord.statusText || "",
    contentType: partialRecord.contentType || existingRecord.contentType || "",
    curlCommandBase: partialRecord.curlCommandBase || existingRecord.curlCommandBase || "",
    rawData: partialRecord.rawData || existingRecord.rawData || "",
    requestHeaders: partialRecord.requestHeaders || existingRecord.requestHeaders || [],
    responseHeaders: partialRecord.responseHeaders || existingRecord.responseHeaders || [],
    startedAt: existingRecord.startedAt || partialRecord.startedAt || Date.now(),
    updatedAt: Date.now(),
    completedAt: partialRecord.completedAt || existingRecord.completedAt || null,
  };

  await setStorageItems({
    [storageKey]: nextRecord,
  });

  return nextRecord;
}

async function trimStoredRequests() {
  const items = await getStorageItems(null);
  const requestKeys = Object.keys(items).filter(function (key) {
    return key.startsWith(REQUEST_RECORD_PREFIX);
  });

  if (requestKeys.length <= REQUEST_HISTORY_LIMIT) {
    return;
  }

  const staleKeys = requestKeys
    .sort(function (leftKey, rightKey) {
      return (items[rightKey]?.updatedAt || 0) - (items[leftKey]?.updatedAt || 0);
    })
    .slice(REQUEST_HISTORY_LIMIT);

  if (staleKeys.length) {
    await removeStorageKeys(staleKeys);
  }
}

async function clearCapturedRequests() {
  const items = await getStorageItems(null);
  const keysToRemove = Object.keys(items).filter(function (key) {
    return key !== PRESERVE_LOG_KEY;
  });

  if (keysToRemove.length) {
    await removeStorageKeys(keysToRemove);
  }

  logBackground("captured-requests-cleared", {
    removedKeys: keysToRemove.length,
  });
}

async function notifyPopup(phase, record) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "detector-apis-record-updated",
        phase,
        record,
      },
      function () {
        if (chrome.runtime.lastError) {
          resolve();
          return;
        }

        resolve();
      }
    );
  });
}

async function updateDebugState(partialState) {
  const existingItems = await getStorageItems([DEBUG_STATE_KEY]);
  const existingState = existingItems[DEBUG_STATE_KEY] || {
    interceptedCount: 0,
    storedCount: 0,
    transformedCount: 0,
  };

  const nextState = {
    backgroundStartedAt: partialState.backgroundStartedAt || existingState.backgroundStartedAt || BACKGROUND_BOOTED_AT,
    listenerStatus: partialState.listenerStatus || existingState.listenerStatus || "active",
    interceptedCount: existingState.interceptedCount || 0,
    storedCount: existingState.storedCount || 0,
    transformedCount: existingState.transformedCount || 0,
    lastPhase: partialState.lastPhase || existingState.lastPhase || "idle",
    lastRequestUrl: partialState.lastRequestUrl || existingState.lastRequestUrl || "",
    lastRequestMethod: partialState.lastRequestMethod || existingState.lastRequestMethod || "",
    lastError: partialState.lastError || existingState.lastError || "",
    activeTabId: checkUndefined(partialState.activeTabId) ? (existingState.activeTabId || null) : partialState.activeTabId,
    lastEventAt: Date.now(),
  };

  if (partialState.incrementIntercepted) {
    nextState.interceptedCount += 1;
  }

  if (partialState.incrementStored) {
    nextState.storedCount += 1;
  }

  if (partialState.incrementTransformed) {
    nextState.transformedCount += 1;
  }

  await setStorageItems({
    [DEBUG_STATE_KEY]: nextState,
  });

  return nextState;
}

function getStorageItems(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, function (items) {
      resolve(items || {});
    });
  });
}

function setStorageItems(items) {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, function () {
      resolve();
    });
  });
}

function removeStorageKeys(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, function () {
      resolve();
    });
  });
}

function logBackground(eventName, payload) {
  console.log("[Detector APIs][background]", eventName, payload || {});
}
