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
// (including POST) must be passed explicitly via --request. Shared between
// background.js (building the curl command as headers arrive) and popup.js
// (fallback curl command for synthetic/cache-hit rows, which never went
// through background.js's own onBeforeSendHeaders capture).
function buildCurlCommandBase(method, url) {
  if (!method || method === "GET") {
    return "curl '" + shellEscape(url) + "'";
  }
  return "curl --request " + method + " '" + shellEscape(url) + "'";
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
