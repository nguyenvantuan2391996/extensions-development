function checkUndefined(item) {
  return typeof item === "undefined";
}

// Escapes a value for safe embedding inside a single-quoted shell string
// (as used by the generated curl commands): close the quote, insert an
// escaped quote, reopen the quote.
function shellEscape(value) {
  return String(value).replace(/'/g, "'\\''");
}

function truncateBody(text) {
  if (typeof text !== "string" || text.length <= MAX_BODY_LENGTH) {
    return text;
  }
  return text.slice(0, MAX_BODY_LENGTH) + "\n...[truncated]";
}

function isExistedInArray(arr, value) {
  for (const element of arr) {
    if (value === element) {
      return true;
    }
  }

  return false;
}

// GET is curl's implicit default, so it needs no flag; every other method
// (including POST) must be passed explicitly via --request. Shared by
// popup.js's on-demand curl builder (buildCurlSnippet) — background.js used
// to pre-build the whole curl command itself, but redacting sensitive header
// values at copy time needs to happen header-by-header in popup.js, so only
// this method/url base (no headers) stays a simple, reusable helper.
function buildCurlCommandBase(method, url) {
  if (!method || method === "GET") {
    return "curl '" + shellEscape(url) + "'";
  }
  return "curl --request " + method + " '" + shellEscape(url) + "'";
}

// Header names whose values are credentials/secrets — masked by default
// everywhere a header value is shown or copied (detail panel, curl/fetch
// snippets, Postman/HAR export) unless the user opts in via the "Show
// sensitive values" toggle. SENSITIVE_HEADER_NAMES lives in js/constants.js.
function isSensitiveHeaderName(name) {
  return SENSITIVE_HEADER_NAMES.includes(String(name).toLowerCase());
}

function isDetectedContentType(contentType) {
  if (!contentType) {
    return false;
  }

  for (const type of DETECTED_CONTENT_TYPES) {
    if (contentType.includes(type)) {
      return true;
    }
  }

  return false;
}
