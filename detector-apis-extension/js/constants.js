// status
const LOADING = "loading";

// chrome.webRequest resourceType reported for both fetch() and XHR calls;
// used to scope tracking/capture to requests that can plausibly be API
// traffic, skipping images/css/fonts/etc.
const XHR_RESOURCE_TYPE = "xmlhttprequest";

const X_REQUEST_ID_DETECTOR_API = "x-request-id";
const CONTENT_TYPE = "content-type";
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

// storage growth guardrails
const MAX_TRACKED_REQUESTS = 150;
const REQUEST_ORDER_KEY = "__detector_apis_request_order__";

// caps how much of a single request body we persist (matches the cap
// response-capture.js already applies to captured response bodies), so one
// oversized upload can't itself balloon storage usage.
const MAX_BODY_LENGTH = 200000;