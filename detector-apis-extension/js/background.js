importScripts("constants.js");
importScripts("utils.js");

// chrome.storage.local.set() can reject (e.g. Resource::kQuotaBytes quota
// exceeded). Every listener below does more work after its set() calls
// (removing the "-pending" marker, registering a body match, updating the
// badge) — an uncaught rejection would abort the rest of that async
// function, leaving a request stuck "pending" forever. Swallow-and-log
// instead so one failed write can't cascade into skipped bookkeeping.
async function safeStorageSet(items) {
  try {
    await chrome.storage.local.set(items);
  } catch (err) {
    console.warn("detector-apis-extension: storage.local.set failed", err);
  }
}

// Every tracked request is keyed by chrome.webRequest's own requestId (unique
// per request, stable across its whole lifecycle including redirects) rather
// than by url. Keying by url meant repeated calls to the same endpoint (very
// common for GraphQL, which posts every operation to one url, or for
// polling/paginated REST calls) silently overwrote each other's data.
//
// response-capture.js captures response bodies from inside the page's own JS
// context (hooking fetch/XHR), since chrome.webRequest cannot read response
// bodies itself — and the page context has no access to Chrome's internal
// requestId. So response bodies can only be correlated back to a requestId
// on a best-effort basis: see registerPendingBodyMatch/claimPendingBodyMatch.

chrome.webRequest.onBeforeRequest.addListener(
  async function (details) {
    // Scope everything to fetch()/XHR calls up front: images, css, fonts,
    // etc. can never be "API traffic" for this extension's purposes, and
    // skipping them here means they never take a slot in the bounded
    // tracked-request list and never leave any storage keys to clean up.
    if (details.type !== XHR_RESOURCE_TYPE) {
      return;
    }

    await trackAndEvict(details.requestId);
    await safeStorageSet({
      [details.requestId + "-url"]: details.url,
      [details.requestId + "-tab-id"]: details.tabId,
      [details.requestId + "-pending"]: details.method,
    });
  },
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onErrorOccurred.addListener(
  async function (details) {
    if (details.type !== XHR_RESOURCE_TYPE) {
      return;
    }
    untrackPendingBodyMatch(details.requestId);
    await chrome.storage.local.remove(details.requestId + "-pending");
  },
  { urls: ["<all_urls>"] }
);

// Keeps chrome.storage.local bounded to the most-recently-seen
// MAX_TRACKED_REQUESTS requests, evicting the oldest ones (and all of their
// associated keys) once the limit is exceeded. Only reads/writes
// REQUEST_ORDER_KEY, never the full storage contents. Unlike the old
// url-keyed version, a requestId is only ever seen once (Chrome doesn't
// refire onBeforeRequest for the same request on redirect), so there's no
// need to dedupe/move-to-end here.
async function trackAndEvict(requestId) {
  const { [REQUEST_ORDER_KEY]: storedOrder } = await chrome.storage.local.get(
    REQUEST_ORDER_KEY
  );
  let order = storedOrder || [];
  order.push(requestId);

  let keysToRemove = [];

  if (order.length > MAX_TRACKED_REQUESTS) {
    const evictedIds = order.slice(0, order.length - MAX_TRACKED_REQUESTS);
    order = order.slice(order.length - MAX_TRACKED_REQUESTS);

    for (const evictedId of evictedIds) {
      untrackPendingBodyMatch(evictedId);
      keysToRemove.push(...requestKeySuffixes(evictedId));
    }
  }

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
  await safeStorageSet({ [REQUEST_ORDER_KEY]: order });
}

// All the storage keys associated with one tracked requestId.
function requestKeySuffixes(requestId) {
  return [
    requestId,
    requestId + "-url",
    requestId + "-tab-id",
    requestId + "-curl-detector-apis",
    requestId + "-raw-data",
    requestId + "-request-headers",
    requestId + "-response-headers",
    requestId + "-request-body",
    requestId + "-response-body",
    requestId + "-pending",
  ];
}

// url -> queue of requestIds waiting for their response body, oldest first.
// Best-effort only: the page context (where response bodies are captured)
// has no way to know Chrome's internal requestId, so this assumes a url's
// in-flight requests resolve in roughly the order they were made. True for
// the overwhelming majority of real traffic; concurrent identical requests
// completing out of order is the one case this can get wrong.
const pendingBodyMatchesByUrl = new Map();

function registerPendingBodyMatch(url, requestId) {
  if (!pendingBodyMatchesByUrl.has(url)) {
    pendingBodyMatchesByUrl.set(url, []);
  }
  pendingBodyMatchesByUrl.get(url).push(requestId);
}

function claimPendingBodyMatch(url) {
  const queue = pendingBodyMatchesByUrl.get(url);
  if (!queue || queue.length === 0) {
    return null;
  }
  const requestId = queue.shift();
  if (queue.length === 0) {
    pendingBodyMatchesByUrl.delete(url);
  }
  return requestId;
}

function untrackPendingBodyMatch(requestId) {
  for (const [url, queue] of pendingBodyMatchesByUrl) {
    const index = queue.indexOf(requestId);
    if (index !== -1) {
      queue.splice(index, 1);
      if (queue.length === 0) {
        pendingBodyMatchesByUrl.delete(url);
      }
    }
  }
}

chrome.webRequest.onHeadersReceived.addListener(
  async function (details) {
    if (details.type !== XHR_RESOURCE_TYPE) {
      return;
    }

    let headers = details.responseHeaders;
    let contentType = getValueHeaderByKey(CONTENT_TYPE, headers);
    let infoRequest = details.statusCode + " " + details.method + "|";

    infoRequest +=
      getValueHeaderByKey(X_REQUEST_ID_DETECTOR_API, headers) + "|";
    infoRequest += contentType;

    await safeStorageSet({
      [details.requestId]: infoRequest,
      [details.requestId + "-response-headers"]: JSON.stringify(
        headers || []
      ),
    });
    await chrome.storage.local.remove(details.requestId + "-pending");

    if (isDetectedContentType(contentType)) {
      registerPendingBodyMatch(details.url, details.requestId);
    }

    await updateBadgeCount();
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders", "extraHeaders"]
);

// Counts tracked requests whose response content-type qualifies as "API
// traffic", across all tabs. Reads only REQUEST_ORDER_KEY plus the (bounded,
// <= MAX_TRACKED_REQUESTS) requestIds it lists, instead of
// chrome.storage.local.get(null) + a nested scan over every key, which used
// to cost O((total stored keys)^2) on every response received.
async function updateBadgeCount() {
  const { [REQUEST_ORDER_KEY]: order } = await chrome.storage.local.get(
    REQUEST_ORDER_KEY
  );

  if (!order || order.length === 0) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }

  const items = await chrome.storage.local.get(order);
  let count = 0;

  for (const requestId of order) {
    const statusAndRequestID = String(items[requestId] || "").split("|");
    if (isDetectedContentType(statusAndRequestID[2])) {
      count++;
    }
  }

  await chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#0071e3" });
}

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
    if (details.type !== XHR_RESOURCE_TYPE) {
      return;
    }

    let curlCommand = "";

    if (details.method !== "PUT") {
      curlCommand = "curl '" + shellEscape(details.url) + "'";
    } else {
      curlCommand =
        "curl --location --request PUT '" + shellEscape(details.url) + "'";
    }

    details.requestHeaders.forEach(function (header) {
      curlCommand +=
        " -H '" +
        shellEscape(header.name) +
        ": " +
        shellEscape(header.value) +
        "'";
    });

    await safeStorageSet({
      [details.requestId + "-curl-detector-apis"]: curlCommand,
      [details.requestId + "-request-headers"]: JSON.stringify(
        details.requestHeaders || []
      ),
    });
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders", "extraHeaders"]
);

chrome.webRequest.onBeforeRequest.addListener(
  async function (details) {
    if (details.type !== XHR_RESOURCE_TYPE) {
      return;
    }

    // POST
    if (details.method === "POST") {
      const requestBody = details.requestBody;
      if (requestBody && requestBody.raw && requestBody.raw[0]) {
        const uint8Array = new Uint8Array(requestBody.raw[0].bytes);
        const textDecoder = new TextDecoder("utf-8");
        const decodedString = truncateBody(textDecoder.decode(uint8Array));

        await safeStorageSet({
          [details.requestId + "-raw-data"]:
            "--data-raw '" + shellEscape(decodedString) + "'",
          [details.requestId + "-request-body"]: decodedString,
        });
      }

      // form data
      if (requestBody && requestBody.formData) {
        let rawDataBody = "";
        for (const key in requestBody.formData) {
          if (requestBody.formData.hasOwnProperty(key)) {
            rawDataBody += `${key}=${requestBody.formData[key][0]}&`;
          }
        }
        rawDataBody = truncateBody(rawDataBody);

        await safeStorageSet({
          [details.requestId + "-raw-data"]:
            "--data-raw '" + shellEscape(rawDataBody) + "'",
          [details.requestId + "-request-body"]: rawDataBody,
        });
      }
    }

    // PUT
    if (details.method === "PUT") {
      const requestBody = details.requestBody;
      if (requestBody && requestBody.raw && requestBody.raw[0]) {
        const uint8Array = new Uint8Array(requestBody.raw[0].bytes);
        const textDecoder = new TextDecoder("utf-8");
        const decodedString = truncateBody(textDecoder.decode(uint8Array));

        await safeStorageSet({
          [details.requestId + "-raw-data"]:
            "--data '" + shellEscape(decodedString) + "'",
          [details.requestId + "-request-body"]: decodedString,
        });
      }

      // form data
      if (requestBody && requestBody.formData) {
        let rawDataBody = "";
        for (const key in requestBody.formData) {
          if (requestBody.formData.hasOwnProperty(key)) {
            rawDataBody += `${key}=${requestBody.formData[key][0]}&`;
          }
        }
        rawDataBody = truncateBody(rawDataBody);

        await safeStorageSet({
          [details.requestId + "-raw-data"]:
            "--data '" + shellEscape(rawDataBody) + "'",
          [details.requestId + "-request-body"]: rawDataBody,
        });
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// Response bodies are captured in the page's own JS context (via
// js/response-capture.js hooking fetch/XHR, since chrome.webRequest cannot
// read response bodies) and relayed here through js/response-bridge.js.
chrome.runtime.onMessage.addListener(function (message) {
  if (message && message.type === "DETECTOR_APIS_RESPONSE_BODY") {
    handleResponseBodyCapture(message);
  }
});

async function handleResponseBodyCapture(message) {
  if (!isDetectedContentType(message.contentType)) {
    return;
  }
  const requestId = claimPendingBodyMatch(message.url);
  if (!requestId) {
    return;
  }
  await safeStorageSet({
    [requestId + "-response-body"]: truncateBody(message.body || ""),
  });
}

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
                   await clearTabRequests(tabId);
               }
            });
        }
    }
  );
});

// Clears only the tracked requests that belong to the given tab, instead of
// chrome.storage.local.clear()'ing everything — so navigating one tab (with
// Preserve log off) doesn't wipe requests captured from other open tabs.
async function clearTabRequests(tabId) {
  const { [REQUEST_ORDER_KEY]: storedOrder } = await chrome.storage.local.get(
    REQUEST_ORDER_KEY
  );
  const order = storedOrder || [];
  if (order.length === 0) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }

  const tabIdItems = await chrome.storage.local.get(
    order.map((requestId) => requestId + "-tab-id")
  );

  let keysToRemove = [];
  let remainingOrder = [];

  for (const requestId of order) {
    if (tabIdItems[requestId + "-tab-id"] === tabId) {
      untrackPendingBodyMatch(requestId);
      keysToRemove.push(...requestKeySuffixes(requestId));
    } else {
      remainingOrder.push(requestId);
    }
  }

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
  await safeStorageSet({ [REQUEST_ORDER_KEY]: remainingOrder });
  await updateBadgeCount();
}
