// status
const LOADING = "loading";

// chrome.webRequest resourceType reported for both fetch() and XHR calls;
// used to scope tracking/capture to requests that can plausibly be API
// traffic, skipping images/css/fonts/etc.
const XHR_RESOURCE_TYPE = "xmlhttprequest";

const X_REQUEST_ID_DETECTOR_API = "x-request-id";
const CONTENT_TYPE = "content-type";
const CONTENT_LENGTH = "content-length";
const CONTENT_TYPE_JSON = "application/json";
const CONTENT_TYPE_FORM_URLENCODED = "application/x-www-form-urlencoded";
const CONTENT_TYPE_GRAPHQL = "application/graphql";
const CONTENT_TYPE_GRAPHQL_RESPONSE = "application/graphql-response+json";

// content-types treated as "API traffic" and shown in the popup list
const DETECTED_CONTENT_TYPES = [
  CONTENT_TYPE_JSON,
  CONTENT_TYPE_FORM_URLENCODED,
  CONTENT_TYPE_GRAPHQL,
  CONTENT_TYPE_GRAPHQL_RESPONSE,
];

const PRESERVE_LOG_KEY = "preserve_log_key"

// popup view preference: when false (default), only the active tab's
// requests are shown, like DevTools' per-tab Network panel; when true, every
// tracked tab's requests are shown together.
const SHOW_ALL_TABS_KEY = "show_all_tabs_key"

// storage growth guardrails. MAX_TRACKED_REQUESTS is the default; the
// options page (src/options.html) can override it via MAX_TRACKED_REQUESTS_KEY
// in chrome.storage.local, read by trackAndEvict in js/background.js.
const MAX_TRACKED_REQUESTS = 150;
const MAX_TRACKED_REQUESTS_KEY = "max_tracked_requests_key";
const REQUEST_ORDER_KEY = "__detector_apis_request_order__";

// caps how much of a single request body we persist (matches the cap
// response-capture.js already applies to captured response bodies), so one
// oversized upload can't itself balloon storage usage.
const MAX_BODY_LENGTH = 200000;

// popup.js's column-sort: sentinel for non-numeric status tokens
// ("Failed"/"Canceled") so they sort after every real status code ascending.
const NON_NUMERIC_STATUS_SORT_VALUE = 9999;

// Persists the search text/method+status filters/sort/copy-format across
// popup opens, as one combined object (same small-preference-key pattern as
// PRESERVE_LOG_KEY/SHOW_ALL_TABS_KEY above).
const POPUP_UI_STATE_KEY = "popup_ui_state_key";

// Header names (lowercase) whose values are credentials/secrets — masked by
// default. See isSensitiveHeaderName in js/utils.js.
const SENSITIVE_HEADER_NAMES = [
  "authorization",
  "cookie",
  "set-cookie",
  "proxy-authorization",
  "x-api-key",
  "x-auth-token",
];
const REDACTED_PLACEHOLDER = "[REDACTED]";
// popup view preference: off by default (the safe choice for a tool whose
// whole point is capturing/copying/exporting request data).
const REVEAL_SENSITIVE_KEY = "reveal_sensitive_key";

// popup.js's Time column: requests slower than this get a ".slow" highlight.
const SLOW_REQUEST_THRESHOLD_MS = 1000;

// Health-check for the "chrome.webRequest silently stops firing after a
// silent Chrome Web Store update" failure mode documented at the top of
// js/background.js. Deliberately NOT a synthetic probe request: a fetch
// fired from a content script would be subject to the host page's own CSP
// connect-src and could be blocked on plenty of real sites regardless of
// whether the bug is present, and a fetch fired from the service worker
// itself is invisible to chrome.webRequest by design (Chrome does not route
// an extension's own outgoing requests through webRequest at all) — so
// either "probe" approach can false-positive on a perfectly healthy
// install. Instead this compares two timestamps built entirely from real
// traffic that was already going to happen:
//  - LAST_PAGE_TRAFFIC_KEY: stamped whenever background.js receives a
//    DETECTOR_APIS_RESPONSE_BODY message — proof a page actually completed
//    a real fetch/XHR AND the content-script -> background messaging
//    channel (an IPC channel, not a network fetch, so unaffected by page
//    CSP) is alive.
//  - LAST_WEBREQUEST_SEEN_KEY: stamped inside the existing trackable
//    onBeforeRequest AND onHeadersReceived listeners — proof
//    chrome.webRequest actually saw a request start/complete. Stamped on
//    both ends (not just request start) so a single slow request in flight
//    doesn't look like a growing gap against LAST_PAGE_TRAFFIC_KEY, which
//    only ever advances on response completion.
// Every response necessarily has an earlier request, so in a healthy
// extension LAST_WEBREQUEST_SEEN_KEY is always stamped at/before the
// corresponding LAST_PAGE_TRAFFIC_KEY update. If real traffic keeps
// confirming itself via messaging while webRequest stays silent, that's
// direct evidence webRequest itself is the broken link, not "there was no
// traffic to see." Even so, a persistent gap isn't proof reload() will
// help — see MAX_AUTO_RELOAD_ATTEMPTS below.
const LAST_PAGE_TRAFFIC_KEY = "__detector_apis_last_page_traffic__";
const LAST_WEBREQUEST_SEEN_KEY = "__detector_apis_last_webrequest_seen__";
// Caps js/background.js's checkWebRequestHealth auto-reload attempts so a
// gap chrome.runtime.reload() can't (or was never going to) close — e.g. a
// page whose Service Worker answers fetch() from Cache Storage, which never
// touches the network layer chrome.webRequest observes, so its traffic is
// legitimately invisible to webRequest with nothing actually broken —
// doesn't interrupt the user's session every WEBREQUEST_STALE_THRESHOLD_MS
// forever. Resets to 0 once a check finds the gap closed.
const MAX_AUTO_RELOAD_ATTEMPTS = 3;
const RELOAD_ATTEMPT_COUNT_KEY = "__detector_apis_reload_attempt_count__";
const WEBREQUEST_STALE_THRESHOLD_MS = 2 * 60 * 1000;