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

// Scope everything to fetch()/XHR calls that are actually calls the page's
// own code made: images, css, fonts, etc. can never be "API traffic" for
// this extension's purposes (excluded via XHR_RESOURCE_TYPE), and CORS
// preflight OPTIONS requests are the browser negotiating on the page's
// behalf, not a call the page asked for — the page never sees the OPTIONS
// response, and for any non-trivial cross-origin API almost every real call
// generates one, so left untracked they drown out the actual GET/POST/etc.
// request they precede. All five listeners below must apply this same
// check consistently: tracking a requestId in one listener but not another
// would leave storage keys that are never evicted (eviction only walks
// REQUEST_ORDER_KEY, which only the first onBeforeRequest listener writes).
function isTrackableRequest(details) {
  return details.type === XHR_RESOURCE_TYPE && details.method !== "OPTIONS";
}

chrome.webRequest.onBeforeRequest.addListener(
  async function (details) {
    if (!isTrackableRequest(details)) {
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

// net::ERR_ABORTED is what Chrome reports for a request the page itself
// cancelled (e.g. AbortController, navigating away mid-request) — everything
// else here is a genuine network-level failure (CORS block, DNS failure,
// connection refused, ...). Not attempting a full error-code taxonomy beyond
// this one distinction; the raw `error` string is still preserved for the
// detail panel.
function networkErrorLabel(error) {
  return error === "net::ERR_ABORTED" ? "Canceled" : "Failed";
}

// A request that never got a response used to just vanish (pending row
// removed, nothing left behind) — indistinguishable from "never happened".
// Write a row using the same 3-segment format completed requests use
// (statusAndRequestID splits on "|", indices 0-2 are status+method /
// x-request-id / content-type) plus a 4th segment for the raw error string,
// which existing `.split("|")` call sites simply ignore.
// `Number("Failed"/"Canceled")` is NaN, so badgeClassForStatus's existing
// 2xx check already renders this as a danger badge with no popup-side
// change needed.
async function handleRequestError(details) {
  if (!isTrackableRequest(details)) {
    return;
  }
  untrackPendingBodyMatch(details.requestId);
  await chrome.storage.local.remove(details.requestId + "-pending");

  await safeStorageSet({
    [details.requestId]:
      networkErrorLabel(details.error) +
      " " +
      details.method +
      "||" +
      "|" +
      (details.error || ""),
  });
  await updateBadgeCount();
}

chrome.webRequest.onErrorOccurred.addListener(handleRequestError, {
  urls: ["<all_urls>"],
});

// trackAndEvict/clearTabRequests/clearAllRequests all read REQUEST_ORDER_KEY,
// compute a new array, and write it back — a read-modify-write with no
// atomicity guarantee from chrome.storage.local. Two of these firing close
// together (e.g. a page making two requests in the same tick, or a request
// completing right as a navigation clears the tab) can race: both read the
// same pre-update array, and whichever writes last silently discards the
// other's change. The "lost" request's own data (headers/body/status) still
// gets written correctly under its own keys — it just never appears in the
// order array, so it neither renders in the popup nor ever gets evicted.
// Serializing every mutation of REQUEST_ORDER_KEY through this queue makes
// each one run to completion (its full read-through-write) before the next
// starts, which is sufficient to fix it since the service worker is
// single-threaded — the race only happens because `await` lets unrelated
// listeners interleave between one function's read and its write.
let requestOrderQueue = Promise.resolve();
function withRequestOrderLock(fn) {
  const result = requestOrderQueue.then(fn, fn);
  requestOrderQueue = result.then(
    () => {},
    () => {}
  );
  return result;
}

// Keeps chrome.storage.local bounded to the most-recently-seen
// MAX_TRACKED_REQUESTS requests, evicting the oldest ones (and all of their
// associated keys) once the limit is exceeded. Only reads/writes
// REQUEST_ORDER_KEY, never the full storage contents. Unlike the old
// url-keyed version, a requestId is only ever seen once (Chrome doesn't
// refire onBeforeRequest for the same request on redirect), so there's no
// need to dedupe/move-to-end here.
function trackAndEvict(requestId) {
  return withRequestOrderLock(async () => {
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
      // Eviction can remove already-completed (and already-counted) requests.
      // Without this, the badge would stay stale — showing a higher count than
      // what's actually left in storage — until the next response happens to
      // arrive and trigger updateBadgeCount() on its own.
      await updateBadgeCount();
    }
    await safeStorageSet({ [REQUEST_ORDER_KEY]: order });
  });
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
    requestId + "-synthetic",
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
    if (!isTrackableRequest(details)) {
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

    // Register for body capture whenever there's *any* content-type — not
    // narrowed to JSON-ish types anymore, so REST responses with vendor/other
    // content-types still get their body captured. Importantly this must
    // stay in sync with response-capture.js's own dispatch condition (also
    // "any truthy content-type"): the two sides pair up 1:1 per-url in FIFO
    // order (see pendingBodyMatchesByUrl above), so registering here for a
    // response the page-side hook will never dispatch for (e.g. no
    // content-type at all, so nothing to capture) would leave a permanent
    // stuck entry that steals a *later*, unrelated same-url response's body.
    if (contentType) {
      registerPendingBodyMatch(details.url, details.requestId);
    }

    await updateBadgeCount();
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders", "extraHeaders"]
);

// Counts tracked requests that have completed — either got a response or
// failed/canceled outright (see onErrorOccurred above; both write the
// requestId's main key, this just reads whatever's there). Reads only
// REQUEST_ORDER_KEY plus the (bounded, <= MAX_TRACKED_REQUESTS) requestIds it
// lists, instead of chrome.storage.local.get(null) + a nested scan over every
// key, which used to cost O((total stored keys)^2) on every response
// received. Counts every completed fetch/XHR request (already scoped to
// XHR_RESOURCE_TYPE upstream) rather than only ones with a JSON-ish
// content-type. Mirrors the popup's own "All tabs" preference (js/popup.js's
// renderTable) so the badge and the popup's own request count can never
// disagree: previously the badge always counted every tab regardless of the
// toggle, so switching "All tabs" off made the popup show a filtered
// single-tab subset while the badge kept showing the old global count.
async function updateBadgeCount() {
  const { [REQUEST_ORDER_KEY]: order } = await chrome.storage.local.get(
    REQUEST_ORDER_KEY
  );

  if (!order || order.length === 0) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }

  const { [SHOW_ALL_TABS_KEY]: showAllTabs } = await chrome.storage.local.get(
    SHOW_ALL_TABS_KEY
  );

  let activeTabId = null;
  if (showAllTabs === false) {
    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    activeTabId = tabs && tabs[0] ? tabs[0].id : null;
  }

  const keys =
    activeTabId === null
      ? order
      : order.concat(order.map((requestId) => requestId + "-tab-id"));
  const items = await chrome.storage.local.get(keys);
  let count = 0;

  for (const requestId of order) {
    if (!items[requestId]) {
      continue;
    }
    if (activeTabId !== null && items[requestId + "-tab-id"] !== activeTabId) {
      continue;
    }
    count++;
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

// buildCurlCommandBase now lives in utils.js (shared with popup.js's
// synthetic-row curl fallback below); background.js already imports it.

chrome.webRequest.onBeforeSendHeaders.addListener(
  async function (details) {
    if (!isTrackableRequest(details)) {
      return;
    }

    let curlCommand = buildCurlCommandBase(details.method, details.url);

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
    if (!isTrackableRequest(details)) {
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
// `sender.tab.id` (only present for messages from a content script, which is
// the only kind this listener ever receives) lets the cache-hit fallback in
// handleResponseBodyCapture tag synthetic rows with the right tab.
chrome.runtime.onMessage.addListener(function (message, sender) {
  if (message && message.type === "DETECTOR_APIS_RESPONSE_BODY") {
    handleResponseBodyCapture(message, sender.tab && sender.tab.id);
  } else if (message && message.type === "DETECTOR_APIS_CLEAR_ALL") {
    clearAllRequests();
  }
});

// Wipes every tracked request regardless of tab, for the popup's manual
// Clear button — unlike clearTabRequests (navigation-triggered, scoped to
// one tab), this always clears everything the user can currently see.
function clearAllRequests() {
  return withRequestOrderLock(async () => {
    const { [REQUEST_ORDER_KEY]: storedOrder } = await chrome.storage.local.get(
      REQUEST_ORDER_KEY
    );
    const order = storedOrder || [];

    let keysToRemove = [REQUEST_ORDER_KEY];
    for (const requestId of order) {
      untrackPendingBodyMatch(requestId);
      keysToRemove.push(...requestKeySuffixes(requestId));
    }

    await chrome.storage.local.remove(keysToRemove);
    await chrome.action.setBadgeText({ text: "" });
  });
}

function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function handleResponseBodyCapture(message, tabId) {
  let requestId = claimPendingBodyMatch(message.url);
  if (requestId) {
    await safeStorageSet({
      [requestId + "-response-body"]: truncateBody(message.body || ""),
    });
    return;
  }

  // No chrome.webRequest-tracked request is waiting for this url yet.
  // That's expected for a genuine cache hit (the browser served the
  // response without touching the network, so chrome.webRequest never fired
  // at all) — but it can also just be a race where onHeadersReceived's own
  // registerPendingBodyMatch call for a *real* in-flight request to the same
  // url hasn't run yet. Give it SYNTHETIC_FALLBACK_DELAY_MS to land before
  // assuming cache.
  await delay(SYNTHETIC_FALLBACK_DELAY_MS);
  requestId = claimPendingBodyMatch(message.url);
  if (requestId) {
    await safeStorageSet({
      [requestId + "-response-body"]: truncateBody(message.body || ""),
    });
    return;
  }

  await createSyntheticEntry(message, tabId);
}

// Best-effort row for a fetch/XHR call the page made that chrome.webRequest
// never saw (see handleResponseBodyCapture above) — almost always a full
// cache hit. Limited fidelity by construction: no request/response headers,
// no request body, since none of that is visible from the page's own JS
// context — the popup tags these via the "-synthetic" key instead of
// silently mixing them in with fully-captured rows. Residual race: if a real
// registration lands *after* the fallback delay above, this creates a
// duplicate row (one real, one synthetic) for the same logical request —
// bounded and visible, not silently wrong data, the same tradeoff already
// accepted for the per-url FIFO body-match system this sits next to.
async function createSyntheticEntry(message, tabId) {
  const requestId =
    "synthetic-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  const method = message.method || "GET";

  await trackAndEvict(requestId);
  await safeStorageSet({
    [requestId + "-url"]: message.url,
    [requestId + "-tab-id"]: tabId,
    [requestId]:
      message.status + " " + method + "|" + "" + "|" + (message.contentType || ""),
    [requestId + "-response-body"]: truncateBody(message.body || ""),
    [requestId + "-synthetic"]: true,
  });
  await updateBadgeCount();
}

// Clears a tab's own tracked requests when it starts a fresh navigation (and
// Preserve log is off) — mirrors DevTools' per-tab Network panel, which
// clears on navigate regardless of whether that tab is the focused one.
// Previously this only fired when the navigating tab happened to be the
// active tab in the last-focused window (compared by url, not even by tab
// id), so a background tab's stale pre-navigation requests were never
// cleared — they'd sit around and get shown alongside the tab's new
// requests once "All tabs" (or later switching to that tab) surfaced them.
async function handleTabNavigation(tabId, changeInfo) {
  if (changeInfo.status !== LOADING) {
    return;
  }
  const { [PRESERVE_LOG_KEY]: preserveLog } = await chrome.storage.local.get([
    PRESERVE_LOG_KEY,
  ]);
  if (!preserveLog) {
    await clearTabRequests(tabId);
  }
}

chrome.tabs.onUpdated.addListener(handleTabNavigation);

// Clears only the tracked requests that belong to the given tab, instead of
// chrome.storage.local.clear()'ing everything — so navigating one tab (with
// Preserve log off) doesn't wipe requests captured from other open tabs.
function clearTabRequests(tabId) {
  return withRequestOrderLock(async () => {
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
  });
}
