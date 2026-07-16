// pattern API name
const PATTERN_API_NAME_DETECTOR_API = "detector-apis-extension-extension-";

// status
const LOADING = "loading";

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

// storage growth guardrails
const MAX_TRACKED_REQUESTS = 150;
const REQUEST_ORDER_KEY = "__detector_apis_request_order__";