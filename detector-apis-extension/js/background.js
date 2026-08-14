importScripts("constants.js");
importScripts("utils.js");

// Users have reported that after a *silent* Chrome Web Store auto-update
// (extension updates in the background while the browser stays open, no
// restart), the extension stops capturing requests entirely — and unlike
// the known MV3 "manual dev-mode Reload doesn't re-register listeners"
// quirk, toggling the extension off/on does NOT recover it; only a full
// uninstall+reinstall does. All of chrome.webRequest.*.addListener below
// run synchronously at the top of this file, so if this script runs at
// all post-update, they register — this smells like a Chromium-side issue
// where the service worker itself doesn't get cleanly restarted against
// the new version until something more forceful happens (browser restart,
// reinstall). There's no documented API to force that from inside the
// extension, but chrome.alarms firing on a schedule keeps this service
// worker from sitting fully idle, which is Chrome's own recommended
// mitigation for MV3 service-worker reliability issues in general — and
// onInstalled/onStartup logging here means the *next* report of this can
// actually be diagnosed (did the service worker even run post-update?)
// instead of guessing blind again.
const HEARTBEAT_ALARM_NAME = "detector-apis-heartbeat";

chrome.runtime.onInstalled.addListener((details) => {
  console.log("detector-apis-extension: onInstalled, reason=" + details.reason);
  chrome.alarms.create(HEARTBEAT_ALARM_NAME, { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(() => {
  console.log("detector-apis-extension: onStartup (browser launched)");
  chrome.alarms.create(HEARTBEAT_ALARM_NAME, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== HEARTBEAT_ALARM_NAME) {
    return;
  }
  // Deliberately trivial — the point is forcing the service worker to wake
  // up and run this script's top level again on a schedule, not the work
  // done here. Also keeps the toolbar badge from staying stale if it ever
  // desyncs from storage for any reason.
  updateBadgeCount();
});

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
      // webRequest's own timeStamp on every event for this request, used to
      // compute how long it took once it completes/fails (onHeadersReceived
      // / handleRequestError below).
      [details.requestId + "-start-time"]: details.timeStamp,
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

// webRequest gives every event its own timeStamp; onBeforeRequest stashes
// the first one under `<requestId>-start-time` so onHeadersReceived and
// handleRequestError (onErrorOccurred) can both compute how long the
// request took once it completes or fails.
async function computeDuration(requestId, endTimeStamp) {
  const { [requestId + "-start-time"]: startTime } = await chrome.storage.local.get(
    requestId + "-start-time"
  );
  return typeof startTime === "number"
    ? Math.round(endTimeStamp - startTime)
    : null;
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
  const duration = await computeDuration(details.requestId, details.timeStamp);

  await safeStorageSet({
    [details.requestId]:
      networkErrorLabel(details.error) +
      " " +
      details.method +
      "||" +
      "|" +
      (details.error || ""),
    [details.requestId + "-duration"]: duration,
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
// The options page lets users override the default via
// MAX_TRACKED_REQUESTS_KEY; falls back to the MAX_TRACKED_REQUESTS constant
// when unset (first run, or the page's own validation never ran).
async function getMaxTrackedRequests() {
  const { [MAX_TRACKED_REQUESTS_KEY]: configured } = await chrome.storage.local.get(
    MAX_TRACKED_REQUESTS_KEY
  );
  return typeof configured === "number" && configured > 0
    ? configured
    : MAX_TRACKED_REQUESTS;
}

function trackAndEvict(requestId) {
  return withRequestOrderLock(async () => {
    const { [REQUEST_ORDER_KEY]: storedOrder } = await chrome.storage.local.get(
      REQUEST_ORDER_KEY
    );
    let order = storedOrder || [];
    order.push(requestId);

    let keysToRemove = [];
    const maxTrackedRequests = await getMaxTrackedRequests();

    if (order.length > maxTrackedRequests) {
      const evictedIds = order.slice(0, order.length - maxTrackedRequests);
      order = order.slice(order.length - maxTrackedRequests);

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
    requestId + "-start-time",
    requestId + "-duration",
    requestId + "-size",
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

    const duration = await computeDuration(details.requestId, details.timeStamp);
    // Content-Length is often absent or wrong for chunked/compressed
    // responses — handleResponseBodyCapture fills in a byte-accurate value
    // from the actual captured body in that case, once it arrives.
    const contentLength = getValueHeaderByKey(CONTENT_LENGTH, headers);
    const size = contentLength ? parseInt(contentLength, 10) : null;

    await safeStorageSet({
      [details.requestId]: infoRequest,
      [details.requestId + "-response-headers"]: JSON.stringify(
        headers || []
      ),
      [details.requestId + "-duration"]: duration,
      [details.requestId + "-size"]: size,
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

// GET is curl's implicit default, so it needs no flag; every other method
// (including POST) must be passed explicitly via --request. POST used to look
// like it worked without this because attaching --data-raw/--data makes curl
// infer POST on its own — but that only covered POST requests that actually
// had a body. DELETE, PATCH, HEAD, OPTIONS, and body-less POST requests all
// silently ran as GET when the exported curl command was executed.
// buildCurlCommandBase itself now lives in js/utils.js: popup.js builds the
// full curl command on demand from the stored -request-headers (needed so
// it can redact sensitive header values at copy time — see buildCurlSnippet
// in js/popup.js), so this listener only needs to persist the headers.

chrome.webRequest.onBeforeSendHeaders.addListener(
  async function (details) {
    if (!isTrackableRequest(details)) {
      return;
    }

    await safeStorageSet({
      [details.requestId + "-request-headers"]: JSON.stringify(
        details.requestHeaders || []
      ),
    });
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders", "extraHeaders"]
);

// Captures the request body for methods that can carry one. Only the plain
// decoded string is persisted (-request-body) — popup.js's on-demand curl
// snippet builder (buildCurlSnippet) and buildFetchSnippet both format it
// themselves (as --data-raw / a fetch() body respectively) from this same
// value, instead of this listener pre-formatting a curl-specific fragment.
chrome.webRequest.onBeforeRequest.addListener(
  async function (details) {
    if (!isTrackableRequest(details)) {
      return;
    }
    if (details.method !== "POST" && details.method !== "PUT") {
      return;
    }

    const requestBody = details.requestBody;
    if (requestBody && requestBody.raw && requestBody.raw[0]) {
      const uint8Array = new Uint8Array(requestBody.raw[0].bytes);
      const textDecoder = new TextDecoder("utf-8");
      const decodedString = truncateBody(textDecoder.decode(uint8Array));

      await safeStorageSet({
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
        [details.requestId + "-request-body"]: rawDataBody,
      });
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

async function handleResponseBodyCapture(message) {
  const requestId = claimPendingBodyMatch(message.url);
  if (!requestId) {
    return;
  }

  const toSet = {
    [requestId + "-response-body"]: truncateBody(message.body || ""),
  };

  // onHeadersReceived already wrote a byte count from the Content-Length
  // header when one was present and parseable — only fall back to counting
  // the actual captured body (accurate, but only known once it's fully in
  // hand) when that didn't happen.
  const { [requestId + "-size"]: existingSize } = await chrome.storage.local.get(
    requestId + "-size"
  );
  if (existingSize === null || existingSize === undefined) {
    toSet[requestId + "-size"] = new TextEncoder().encode(message.body || "").length;
  }

  await safeStorageSet(toSet);
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
