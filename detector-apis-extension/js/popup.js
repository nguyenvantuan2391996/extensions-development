  let totalRequestCount = 0;
let detailsByButtonId = {};
// requestId -> { tr, kind: "data" | "pending", buttonID, status, detailTr }
let rowsByRequestId = new Map();
let isFirstRender = true;
let renderDebounceTimer = null;
let expandedRequestId = null;
// The tab this popup was opened for. Requests are captured extension-wide
// (all tabs share one chrome.storage.local); with showAllTabs off, the popup
// filters down to just this tab's requests, like DevTools' per-tab Network
// panel. Resolved once at load and kept for the popup's lifetime.
let activeTabId = null;
// Defaults to true (show every tab's requests) so switching tabs never looks
// like the log got wiped. Users who want the DevTools-style per-tab view can
// switch it off; the choice is remembered across popup opens.
let showAllTabs = true;
// Active table sort: null column means natural (arrival) order, matching
// the original insertDataRow-driven placement. Only data rows are sorted —
// pending rows have no meaningful status/time yet, so they're left in
// arrival order after the sorted ones.
let sortColumn = null;
let sortDir = "asc";
// Off by default — see REVEAL_SENSITIVE_KEY in js/constants.js. Read by
// every place a header value is displayed or copied (renderHeadersTable,
// buildCurlSnippet/buildFetchSnippet, Postman/HAR export).
let revealSensitive = false;

window.addEventListener("load", async (event) => {
  activeTabId = await getActiveTabId();
  showAllTabs = await getShowAllTabsPreference();
  document.getElementById("all-tabs-toggle").checked = showAllTabs;
  revealSensitive = await getRevealSensitivePreference();

  await updateSwitchValue()
  await setupOpenInTab();
  await loadUIState();
  await renderTable();

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== "local") {
      return;
    }
    scheduleRender();
  });
});

// chrome.tabs.getCurrent() resolves to a Tab object when this page is a
// normal tab, and to undefined when it's a non-tab context — which for
// src/popup.html only ever means the actual toolbar action popup (the only
// other way to load this file). This is the reliable check: `chrome.windows
// .getCurrent().type` was tried first and turned out NOT to reliably read
// "popup" for the real toolbar popup, which made every popup open think it
// was already a full-page tab — forcing `body.is-full-page`'s `width: 100%;
// height: 100vh` onto the popup's auto-sizing window, which Chrome then
// collapsed down to a tiny size instead of the intended fixed 800x550.
async function setupOpenInTab() {
  const currentTab = await chrome.tabs.getCurrent();
  const openTabBtn = document.getElementById("open-tab-btn");

  if (currentTab) {
    // Already a normal tab (opened via "Open in Tab", or navigated to
    // directly) — widen the layout, hide the now-redundant button.
    document.body.classList.add("is-full-page");
    openTabBtn.style.display = "none";
    return;
  }

  openTabBtn.addEventListener("click", async function () {
    await chrome.tabs.create({ url: chrome.runtime.getURL("src/popup.html") });
    window.close();
  });
}

function getActiveTabId() {
  return new Promise(function (resolve) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      resolve(tabs && tabs[0] ? tabs[0].id : null);
    });
  });
}

function getShowAllTabsPreference() {
  return new Promise(function (resolve) {
    chrome.storage.local.get([SHOW_ALL_TABS_KEY], function (items) {
      // absent (first run) -> default to true, not false
      resolve(items[SHOW_ALL_TABS_KEY] !== false);
    });
  });
}

function getRevealSensitivePreference() {
  return new Promise(function (resolve) {
    chrome.storage.local.get([REVEAL_SENSITIVE_KEY], function (items) {
      resolve(items[REVEAL_SENSITIVE_KEY] === true);
    });
  });
}


// Restores the search text/method+status filters/sort/copy-format from the
// previous popup session — called before the first renderTable() so its own
// applySort()/applyFilters() calls apply the restored state immediately
// instead of a plain reset flashing by first.
async function loadUIState() {
  let { [POPUP_UI_STATE_KEY]: state } = await chrome.storage.local.get(
    POPUP_UI_STATE_KEY
  );
  state = state || {};
  document.getElementById("search-input").value = state.search || "";
  document.getElementById("method-filter").value = state.method || "";
  document.getElementById("status-filter").value = state.status || "";
  document.getElementById("copy-format").value = state.copyFormat || "curl";
  setCopyAllLabel(state.copyFormat === "fetch" ? "Copy All Fetch" : "Copy All Curl");
  sortColumn = state.sortColumn || null;
  sortDir = state.sortDir || "asc";
}

function saveUIState() {
  chrome.storage.local.set({
    [POPUP_UI_STATE_KEY]: {
      search: document.getElementById("search-input").value,
      method: document.getElementById("method-filter").value,
      status: document.getElementById("status-filter").value,
      copyFormat: getCopyFormat(),
      sortColumn: sortColumn,
      sortDir: sortDir,
    },
  });
}

document.getElementById("all-tabs-toggle").addEventListener("change", async function (e) {
  showAllTabs = e.target.checked;
  await chrome.storage.local.set({ [SHOW_ALL_TABS_KEY]: showAllTabs });
  await renderTable();
});

function scheduleRender() {
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer);
  }
  renderDebounceTimer = setTimeout(function () {
    renderDebounceTimer = null;
    renderTable();
  }, 300);
}

function getTbody() {
  return document.querySelector("#table-result-detector-apis>tbody");
}

function firstPendingRow(tbody) {
  return tbody.querySelector("tr.pending-row");
}

// data rows are always grouped above pending rows, so a freshly-seen data
// row is inserted right before the first pending row instead of at the end
function insertDataRow(tr, tbody) {
  const anchor = firstPendingRow(tbody);
  if (anchor) {
    tbody.insertBefore(tr, anchor);
  } else {
    tbody.appendChild(tr);
  }
}

// Formats a millisecond duration for the Time column/detail panel: plain ms
// under a second, otherwise seconds to 1 decimal place.
function formatDuration(ms) {
  if (typeof ms !== "number" || Number.isNaN(ms)) {
    return "";
  }
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

// Formats a byte count for the Size column/detail panel.
function formatSize(bytes) {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) {
    return "";
  }
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1000000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${(bytes / 1000000).toFixed(1)} MB`;
}

function statusCodeSortValue(statusCode) {
  let code = Number(statusCode.split(" ")[0]);
  return Number.isNaN(code) ? NON_NUMERIC_STATUS_SORT_VALUE : code;
}

// GraphQL clients (Apollo/Relay/urql) all POST every operation to one
// endpoint with a JSON body shaped { operationName, query, variables } —
// without this, every row for a GraphQL API looks identical. Only reads the
// operationName field every major client already sends; not a general
// GraphQL query parser.
function extractGraphqlOperationName(requestBody) {
  if (!requestBody) {
    return null;
  }
  try {
    let parsed = JSON.parse(requestBody);
    return typeof parsed.operationName === "string" && parsed.operationName
      ? parsed.operationName
      : null;
  } catch (e) {
    return null;
  }
}

function isSlowRequest(durationMs) {
  return typeof durationMs === "number" && durationMs > SLOW_REQUEST_THRESHOLD_MS;
}

function buildDataRowElement(requestId, url, buttonID, statusCode, badgeClass, isNewRow, durationMs, sizeBytes, graphqlOperation) {
  let tr = document.createElement("tr");
  tr.className = isNewRow ? "data-row row-new" : "data-row";
  tr.dataset.requestId = requestId;
  tr.dataset.method = statusCode.split(" ")[1] || "";
  tr.dataset.statusBucket = statusBucketFor(statusCode);
  tr.dataset.statusCode = statusCodeSortValue(statusCode);
  tr.dataset.durationMs = typeof durationMs === "number" ? durationMs : "";
  tr.dataset.sizeBytes = typeof sizeBytes === "number" ? sizeBytes : "";
  tr.dataset.url = url;
  tr.title = "Click to see headers and body";
  let gqlBadge = graphqlOperation
    ? `<span class="gql-badge" title="GraphQL operation name">${escapeHtml(graphqlOperation)}</span>`
    : "";
  let timeClass = "time-cell" + (isSlowRequest(durationMs) ? " slow" : "");
  tr.innerHTML = `<td><button type="button" class="copy-btn" id="${buttonID}" title="Copy this request (curl/fetch — see the format selector in the toolbar)">Copy</button></td><td class="url-cell"><span class="expand-arrow">&#9656;</span>${escapeHtml(url)}${gqlBadge}</td><td class="status-cell"><span class="${badgeClass}">${escapeHtml(statusCode)}</span></td><td class="${timeClass}">${escapeHtml(formatDuration(durationMs))}</td><td class="size-cell">${escapeHtml(formatSize(sizeBytes))}</td>`;
  return tr;
}

function buildPendingRowElement(requestId, url, method) {
  let tr = document.createElement("tr");
  tr.className = "pending-row";
  tr.dataset.requestId = requestId;
  tr.dataset.method = method || "";
  tr.dataset.statusBucket = "pending";
  tr.dataset.durationMs = "";
  tr.dataset.sizeBytes = "";
  tr.title = "Waiting for a response — curl/headers/body aren't available until it completes";
  tr.innerHTML = `<td></td><td class="url-cell">${escapeHtml(url)}</td><td class="status-cell"><span class="status-badge status-pending"><span class="pending-dot"></span>${escapeHtml(method || "")} pending</span></td><td class="time-cell"></td><td class="size-cell"></td>`;
  return tr;
}

// "Failed"/"Canceled" (see networkErrorLabel in background.js) come through
// as the leading token in place of a numeric code, same as a real status —
// Number("Failed") is NaN, so it's checked for explicitly rather than
// falling through to the numeric range checks.
function statusBucketFor(statusCode) {
  let firstToken = statusCode.split(" ")[0];
  if (firstToken === "Failed" || firstToken === "Canceled") {
    return "failed";
  }
  let code = Number(firstToken);
  if (code >= 200 && code < 300) return "2xx";
  if (code >= 300 && code < 400) return "3xx";
  if (code >= 400 && code < 500) return "4xx";
  if (code >= 500 && code < 600) return "5xx";
  return "other";
}

function badgeClassForStatus(statusCode) {
  let apiStatus = Number(statusCode.split(" ")[0]);
  return apiStatus >= 200 && apiStatus < 300
    ? "status-badge status-success"
    : "status-badge status-danger";
}

function upsertDataRow(requestId, url, statusAndRequestID, items, tbody) {
  let buttonID = requestId + "-curl-detector-apis";
  let statusCode = statusAndRequestID[0];
  let badgeClass = badgeClassForStatus(statusCode);
  let durationMs = items[requestId + "-duration"];
  let sizeBytes = items[requestId + "-size"];
  let requestBody = items[requestId + "-request-body"] || "";
  let graphqlOperation = extractGraphqlOperationName(requestBody);

  detailsByButtonId[buttonID] = {
    url: url,
    method: statusCode.split(" ")[1] || "",
    status: statusCode.split(" ")[0] || "",
    duration: formatDuration(durationMs),
    size: formatSize(sizeBytes),
    requestHeaders: parseHeadersJSON(items[requestId + "-request-headers"]),
    responseHeaders: parseHeadersJSON(items[requestId + "-response-headers"]),
    requestBody: requestBody,
    responseBody: items[requestId + "-response-body"] || "",
    networkError: statusAndRequestID[3] || "",
  };

  let entry = rowsByRequestId.get(requestId);

  // a pending row for this request just completed: drop the pending row and
  // fall through to create the real data row in its place
  if (entry && entry.kind === "pending") {
    entry.tr.remove();
    entry = null;
  }

  if (!entry) {
    let isNewRow = !isFirstRender;
    let tr = buildDataRowElement(requestId, url, buttonID, statusCode, badgeClass, isNewRow, durationMs, sizeBytes, graphqlOperation);
    insertDataRow(tr, tbody);
    entry = { tr: tr, kind: "data", buttonID: buttonID, status: statusCode, detailTr: null };
    rowsByRequestId.set(requestId, entry);

    if (isNewRow) {
      setTimeout(function () {
        tr.classList.remove("row-new");
      }, 1600);
    }
    return;
  }

  if (entry.status !== statusCode) {
    entry.status = statusCode;
    entry.tr.dataset.statusBucket = statusBucketFor(statusCode);
    entry.tr.dataset.statusCode = statusCodeSortValue(statusCode);
    entry.tr.dataset.durationMs = typeof durationMs === "number" ? durationMs : "";
    entry.tr.dataset.sizeBytes = typeof sizeBytes === "number" ? sizeBytes : "";
    let badge = entry.tr.querySelector(".status-cell .status-badge");
    badge.className = badgeClass;
    badge.textContent = statusCode;
    let timeCell = entry.tr.querySelector(".time-cell");
    timeCell.textContent = formatDuration(durationMs);
    timeCell.classList.toggle("slow", isSlowRequest(durationMs));
    entry.tr.querySelector(".size-cell").textContent = formatSize(sizeBytes);
  }
}

function upsertPendingRow(requestId, url, method, tbody) {
  if (rowsByRequestId.has(requestId)) {
    return;
  }
  let tr = buildPendingRowElement(requestId, url, method);
  tbody.appendChild(tr);
  rowsByRequestId.set(requestId, { tr: tr, kind: "pending" });
}

function removeRow(requestId, entry) {
  entry.tr.remove();
  if (entry.detailTr) {
    entry.detailTr.remove();
  }
  if (expandedRequestId === requestId) {
    expandedRequestId = null;
  }
  rowsByRequestId.delete(requestId);
  if (entry.buttonID) {
    delete detailsByButtonId[entry.buttonID];
  }
}

function clearTable() {
  getTbody().innerHTML = "";
  rowsByRequestId.clear();
  detailsByButtonId = {};
  expandedRequestId = null;
  totalRequestCount = 0;
  isFirstRender = false;

  document.getElementById("table-wrap").classList.add("is-empty");
  document.getElementById("request-count").textContent = "0 requests";
  document.getElementById("copy-all-btn").disabled = true;
  document.getElementById("export-btn").disabled = true;
  document.getElementById("clear-btn").disabled = true;
  applyFilters();
}

function refreshExpandedDetail(entry) {
  if (!entry.detailTr) {
    return;
  }
  let freshDetail = buildDetailRow(entry.buttonID);
  entry.detailTr.replaceWith(freshDetail);
  entry.detailTr = freshDetail;
}

// Reads only the bounded set of currently-tracked requests (REQUEST_ORDER_KEY)
// plus their per-request fields, instead of chrome.storage.local.get(null) +
// a full O(n^2) join, and patches the existing DOM instead of rebuilding the
// whole <tbody> innerHTML on every change. Requests are captured
// extension-wide (all tabs), so this filters down to just activeTabId,
// matching DevTools' per-tab Network panel.
async function renderTable() {
  let orderResult = await chrome.storage.local.get(REQUEST_ORDER_KEY);
  let order = orderResult[REQUEST_ORDER_KEY] || [];

  if (order.length === 0) {
    clearTable();
    return;
  }

  let keys = [];
  for (const requestId of order) {
    keys.push(
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
      requestId + "-duration",
      requestId + "-size"
    );
  }
  let items = await chrome.storage.local.get(keys);

  let tbody = getTbody();
  let seenIds = new Set();
  let requestCount = 0;
  let pendingCount = 0;

  for (const requestId of order) {
    // activeTabId unknown (chrome.tabs.query found no active tab) -> fall
    // back to showing everything rather than an empty list.
    if (
      !showAllTabs &&
      activeTabId !== null &&
      activeTabId !== undefined &&
      items[requestId + "-tab-id"] !== activeTabId
    ) {
      continue;
    }

    let url = items[requestId + "-url"] || "";
    let rawInfo = items[requestId];
    let statusAndRequestID = typeof rawInfo === "string" ? rawInfo.split("|") : null;

    // Show every completed fetch/XHR request, not just JSON-ish ones: REST
    // APIs often complete without a matching content-type (204 No Content on
    // DELETE, vendor types like application/vnd.api+json, ...) and used to
    // vanish here with no indication they'd been filtered out.
    if (statusAndRequestID) {
      seenIds.add(requestId);
      requestCount++;
      upsertDataRow(requestId, url, statusAndRequestID, items, tbody);
      continue;
    }

    let pendingMethod = items[requestId + "-pending"];
    if (pendingMethod) {
      seenIds.add(requestId);
      pendingCount++;
      upsertPendingRow(requestId, url, pendingMethod, tbody);
    }
  }

  for (const [requestId, entry] of Array.from(rowsByRequestId)) {
    if (!seenIds.has(requestId)) {
      removeRow(requestId, entry);
    }
  }

  isFirstRender = false;
  totalRequestCount = requestCount;

  document
    .getElementById("table-wrap")
    .classList.toggle("is-empty", requestCount === 0 && pendingCount === 0);
  document.getElementById("request-count").textContent =
    `${requestCount} ${requestCount === 1 ? "request" : "requests"}` +
    (pendingCount > 0 ? ` · ${pendingCount} pending` : "");
  document.getElementById("copy-all-btn").disabled = requestCount === 0;
  document.getElementById("export-btn").disabled = requestCount === 0;
  document.getElementById("clear-btn").disabled = requestCount === 0;

  if (expandedRequestId) {
    let entry = rowsByRequestId.get(expandedRequestId);
    if (entry) {
      refreshExpandedDetail(entry);
    }
  }

  applySort();
  updateDuplicateBadges();
  applyFilters();
}

function toggleDetailRow(tr) {
  let requestId = tr.dataset.requestId;
  let entry = rowsByRequestId.get(requestId);
  if (!entry) {
    return;
  }

  if (entry.detailTr) {
    entry.detailTr.remove();
    entry.detailTr = null;
    tr.classList.remove("expanded");
    if (expandedRequestId === requestId) {
      expandedRequestId = null;
    }
    return;
  }

  if (expandedRequestId && expandedRequestId !== requestId) {
    let previous = rowsByRequestId.get(expandedRequestId);
    if (previous && previous.detailTr) {
      previous.detailTr.remove();
      previous.detailTr = null;
      previous.tr.classList.remove("expanded");
    }
  }

  let detailTr = buildDetailRow(entry.buttonID);
  tr.insertAdjacentElement("afterend", detailTr);
  tr.classList.add("expanded");
  entry.detailTr = detailTr;
  expandedRequestId = requestId;
}

// single delegated listener instead of binding a click handler per row/button
// on every render
getTbody().addEventListener("click", function (e) {
  let copyBtn = e.target.closest(".copy-btn");
  if (copyBtn) {
    e.stopPropagation();
    copyCurl(copyBtn.id).catch(function (err) {
      console.log(err);
    });
    return;
  }

  let replayBtn = e.target.closest(".replay-btn");
  if (replayBtn) {
    e.stopPropagation();
    replayRequest(replayBtn.dataset.buttonId).catch(function (err) {
      console.log(err);
    });
    return;
  }

  let dataRow = e.target.closest("tr.data-row");
  if (dataRow) {
    toggleDetailRow(dataRow);
  }
});

function getCopyFormat() {
  return document.getElementById("copy-format").value;
}

// Only the .btn-label span's text — Copy All has an icon span (.btn-icon)
// alongside it that setting the button's own textContent would wipe out.
function setCopyAllLabel(text) {
  document.querySelector("#copy-all-btn .btn-label").textContent = text;
}

// Applies the "Show sensitive values" toggle to one header's value —
// shared by every place a header value gets shown or copied.
function redactedHeaderValue(name, value, reveal) {
  return reveal || !isSensitiveHeaderName(name) ? value : REDACTED_PLACEHOLDER;
}

// JSON.stringify already handles every escaping case (quotes, newlines,
// unicode) that curl's shell-quoting (shellEscape in js/utils.js) has to do
// by hand — using it for both the url and the options object sidesteps
// hand-rolled JS-string escaping entirely.
function buildFetchSnippet(info, reveal) {
  let options = { method: info.method || "GET" };
  let headers = {};
  (info.requestHeaders || []).forEach(function (h) {
    headers[h.name] = redactedHeaderValue(h.name, h.value, reveal);
  });
  if (Object.keys(headers).length > 0) {
    options.headers = headers;
  }
  if (info.requestBody) {
    options.body = info.requestBody;
  }
  return `fetch(${JSON.stringify(info.url)}, ${JSON.stringify(options, null, 2)});`;
}

// Built on demand from the same detailsByButtonId data every row already
// carries (method/url/requestHeaders/requestBody) — background.js only
// persists structured -request-headers now, not a pre-assembled curl
// string, so redaction can be applied header-by-header here instead of
// against an already shell-escaped blob.
function buildCurlSnippet(info, reveal) {
  let command = buildCurlCommandBase(info.method, info.url);
  (info.requestHeaders || []).forEach(function (h) {
    let value = redactedHeaderValue(h.name, h.value, reveal);
    command += " -H '" + shellEscape(h.name) + ": " + shellEscape(value) + "'";
  });
  if (info.requestBody) {
    command += " --data-raw '" + shellEscape(info.requestBody) + "'";
  }
  return command;
}

function commandForButtonId(buttonID) {
  let info = detailsByButtonId[buttonID];
  if (!info) {
    return "";
  }
  return getCopyFormat() === "fetch"
    ? buildFetchSnippet(info, revealSensitive)
    : buildCurlSnippet(info, revealSensitive);
}

// Re-sends a captured request exactly as it was: fetch() calls made from
// the extension's own popup page aren't subject to page-level CORS the way
// a normal webpage's would be, since this extension already declares
// host_permissions for every origin — so this reaches the real endpoint
// regardless of where it was originally captured. The replay is itself a
// normal fetch() the browser makes, so it flows through the extension's
// existing chrome.webRequest pipeline and just shows up as a new row; no
// special-cased "replay result" UI is needed here.
async function replayRequest(buttonID) {
  let info = detailsByButtonId[buttonID];
  if (!info) {
    return;
  }
  let headers = {};
  (info.requestHeaders || []).forEach(function (h) {
    headers[h.name] = h.value;
  });
  try {
    // credentials: "include" lets the browser attach real cookies for the
    // target origin itself — fetch() silently drops forbidden request
    // headers like Cookie/Host if they're set manually, so this is the
    // correct way to get them onto the replayed request, not a workaround.
    await fetch(info.url, {
      method: info.method || "GET",
      headers: headers,
      body: info.requestBody || undefined,
      credentials: "include",
    });
    await displayAlert("alert-success", "Replayed — check the list above for the new request", 2000);
  } catch (e) {
    await displayAlert("alert-success", "Replay failed: " + e.message, 2000);
  }
}

async function copyCurl(id) {
  let command = commandForButtonId(id);
  if (!command) {
    return;
  }
  await navigator.clipboard.writeText(command).then(async () => {
    try {
      await displayAlert("alert-success", "Copied successfully!", 2000);
    } catch (e) {
      console.log(e);
    }
  });
}

function parseHeadersJSON(raw) {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHeadersTable(headers) {
  if (!headers || headers.length === 0) {
    return '<div class="detail-empty">No headers captured</div>';
  }
  let rows = headers
    .map(function (h) {
      let value = redactedHeaderValue(h.name, h.value, revealSensitive);
      return `<tr><td class="kv-key">${escapeHtml(h.name)}</td><td class="kv-value">${escapeHtml(value)}</td></tr>`;
    })
    .join("");
  return `<table class="kv-table"><tbody>${rows}</tbody></table>`;
}

function renderBody(body, emptyMessage) {
  if (!body) {
    return `<div class="detail-empty">${escapeHtml(emptyMessage || "No body")}</div>`;
  }
  let formatted = body;
  try {
    formatted = JSON.stringify(JSON.parse(body), null, 2);
  } catch (e) {
    // not JSON, show as-is
  }
  return `<pre class="body-pre">${escapeHtml(formatted)}</pre>`;
}

function buildDetailRow(buttonID) {
  let info = detailsByButtonId[buttonID] || {};
  let tr = document.createElement("tr");
  tr.className = "detail-row";

  let td = document.createElement("td");
  td.colSpan = 5;
  td.innerHTML = `
    <div class="detail-panel">
      <div class="detail-section">
        <div class="detail-section-title">
          Request
          <button type="button" class="replay-btn" data-button-id="${buttonID}" title="Send this request again with the same method/headers/body — the extension's host permissions mean this isn't blocked by CORS the way a normal page's fetch() would be. The replay shows up as a new row.">&#8635; Replay</button>
        </div>
        <div class="detail-meta">${escapeHtml(info.method || "")} &middot; ${escapeHtml(info.status || "")}${info.duration ? " &middot; " + escapeHtml(info.duration) : ""}${info.size ? " &middot; " + escapeHtml(info.size) : ""}</div>
        ${info.networkError ? `<div class="detail-subtitle">Network Error</div><div class="detail-meta detail-error">${escapeHtml(info.networkError)}</div>` : ""}
        <div class="detail-subtitle">Request Headers</div>
        ${renderHeadersTable(info.requestHeaders)}
      </div>
      <div class="detail-section">
        <div class="detail-subtitle">Response Headers</div>
        ${renderHeadersTable(info.responseHeaders)}
      </div>
      <div class="detail-section">
        <div class="detail-subtitle">Request Body</div>
        ${renderBody(info.requestBody, "No request body")}
      </div>
      <div class="detail-section">
        <div class="detail-subtitle">Response Body</div>
        ${renderBody(info.responseBody, "No response body captured")}
      </div>
    </div>
  `;
  tr.appendChild(td);
  return tr;
}

// The buttonID of every currently-visible (not filtered-out) data row, in
// display order — shared by Copy All and both export formats, which all
// need to act on exactly what the user can currently see in the table.
function visibleButtonIds() {
  let rows = document.querySelectorAll(
    "#table-result-detector-apis>tbody tr.data-row"
  );
  let ids = [];
  for (const row of rows) {
    if (row.style.display === "none") {
      continue;
    }
    ids.push(
      row.getElementsByTagName("td")[0].getElementsByTagName("button")[0].id
    );
  }
  return ids;
}

async function copyAllCurl() {
  let commandList = [];
  for (const buttonID of visibleButtonIds()) {
    let command = commandForButtonId(buttonID);
    if (command) {
      commandList.push(command);
    }
  }

  if (commandList.length === 0) {
    try {
      await displayAlert("alert-success", "No requests to copy!", 2000);
    } catch (e) {
      console.log(e);
    }
    return;
  }

  let allCommandText = commandList.join("\n\n");
  await navigator.clipboard.writeText(allCommandText).then(async () => {
    try {
      await displayAlert(
        "alert-success",
        `Copied ${commandList.length} request(s)!`,
        2000
      );
    } catch (e) {
      console.log(e);
    }
  });
}

document.getElementById("copy-all-btn").addEventListener("click", async function () {
  try {
    await copyAllCurl();
  } catch (e) {
    console.log(e);
  }
});

document.getElementById("copy-format").addEventListener("change", function () {
  setCopyAllLabel(getCopyFormat() === "fetch" ? "Copy All Fetch" : "Copy All Curl");
  saveUIState();
});

// No local state mutation needed: chrome.storage.onChanged (registered on
// load) already triggers scheduleRender() once background.js finishes
// removing the keys, which naturally empties the table.
document.getElementById("clear-btn").addEventListener("click", async function () {
  try {
    await chrome.runtime.sendMessage({ type: "DETECTOR_APIS_CLEAR_ALL" });
  } catch (e) {
    console.log(e);
  }
});

document.getElementById("options-link").addEventListener("click", function (e) {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

function findHeaderValue(headers, name) {
  if (!headers) {
    return "";
  }
  let nameLower = name.toLowerCase();
  for (const header of headers) {
    if (header.name && header.name.toLowerCase() === nameLower) {
      return header.value || "";
    }
  }
  return "";
}

function buildPostmanRequestBody(info, contentType) {
  if (!info.requestBody) {
    return undefined;
  }

  if (contentType.includes(CONTENT_TYPE_FORM_URLENCODED)) {
    let urlencoded = info.requestBody
      .split("&")
      .filter(function (pair) {
        return pair.length > 0;
      })
      .map(function (pair) {
        let [key, value] = pair.split("=");
        return { key: key || "", value: value || "" };
      });
    return { mode: "urlencoded", urlencoded };
  }

  return {
    mode: "raw",
    raw: info.requestBody,
    options: {
      raw: { language: contentType.includes("json") ? "json" : "text" },
    },
  };
}

function redactedHeaders(headers, reveal) {
  return (headers || []).map(function (h) {
    return { name: h.name, value: redactedHeaderValue(h.name, h.value, reveal) };
  });
}

function downloadJSON(data, filename) {
  let blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  let url = URL.createObjectURL(blob);
  let link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function visibleRequestInfos() {
  return visibleButtonIds()
    .map(function (buttonID) {
      return detailsByButtonId[buttonID];
    })
    .filter(Boolean);
}

async function exportPostmanCollection() {
  let postmanItems = visibleRequestInfos().map(function (info) {
    let requestHeaders = redactedHeaders(info.requestHeaders, revealSensitive);
    let contentType = findHeaderValue(requestHeaders, CONTENT_TYPE).toLowerCase();
    let postmanRequest = {
      method: info.method || "GET",
      header: requestHeaders.map(function (h) {
        return { key: h.name, value: h.value };
      }),
      body: buildPostmanRequestBody(info, contentType),
      url: info.url,
    };

    let responses = [];
    if (info.responseBody) {
      responses.push({
        name: "Saved Response",
        originalRequest: postmanRequest,
        status: info.status || "",
        code: Number(info.status) || 0,
        header: redactedHeaders(info.responseHeaders, revealSensitive).map(function (h) {
          return { key: h.name, value: h.value };
        }),
        body: info.responseBody,
      });
    }

    return { name: info.url, request: postmanRequest, response: responses };
  });

  if (postmanItems.length === 0) {
    try {
      await displayAlert("alert-success", "No requests to export!", 2000);
    } catch (e) {
      console.log(e);
    }
    return;
  }

  downloadJSON(
    {
      info: {
        name: "Detector APIs Extension Export",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: postmanItems,
    },
    `detector-apis-export-${Date.now()}.postman_collection.json`
  );

  try {
    await displayAlert(
      "alert-success",
      `Exported ${postmanItems.length} request(s) to Postman collection!`,
      2000
    );
  } catch (e) {
    console.log(e);
  }
}

// Standard HAR 1.2 shape (http://www.softwareishard.com/blog/har-12-spec/).
// creator is read from the manifest instead of hardcoded so it can't drift
// out of sync with the actual installed version.
async function exportHarCollection() {
  let entries = visibleRequestInfos().map(function (info) {
    let requestHeaders = redactedHeaders(info.requestHeaders, revealSensitive);
    let responseHeaders = redactedHeaders(info.responseHeaders, revealSensitive);
    let statusCode = parseInt(info.status, 10) || 0;
    return {
      startedDateTime: new Date().toISOString(),
      time: parseFloat(info.duration) || 0,
      request: {
        method: info.method || "GET",
        url: info.url,
        httpVersion: "HTTP/1.1",
        headers: requestHeaders.map(function (h) {
          return { name: h.name, value: h.value };
        }),
        queryString: [],
        postData: info.requestBody
          ? { mimeType: findHeaderValue(requestHeaders, CONTENT_TYPE) || "text/plain", text: info.requestBody }
          : undefined,
        headersSize: -1,
        bodySize: info.requestBody ? info.requestBody.length : 0,
      },
      response: {
        status: statusCode,
        statusText: info.status || "",
        httpVersion: "HTTP/1.1",
        headers: responseHeaders.map(function (h) {
          return { name: h.name, value: h.value };
        }),
        content: {
          size: info.responseBody ? info.responseBody.length : 0,
          mimeType: findHeaderValue(responseHeaders, CONTENT_TYPE) || "text/plain",
          text: info.responseBody || "",
        },
        redirectURL: "",
        headersSize: -1,
        bodySize: info.responseBody ? info.responseBody.length : 0,
      },
      cache: {},
      timings: { send: 0, wait: parseFloat(info.duration) || 0, receive: 0 },
    };
  });

  if (entries.length === 0) {
    try {
      await displayAlert("alert-success", "No requests to export!", 2000);
    } catch (e) {
      console.log(e);
    }
    return;
  }

  let manifest = chrome.runtime.getManifest();
  downloadJSON(
    {
      log: {
        version: "1.2",
        creator: { name: manifest.name, version: manifest.version },
        entries: entries,
      },
    },
    `detector-apis-export-${Date.now()}.har`
  );

  try {
    await displayAlert("alert-success", `Exported ${entries.length} request(s) to HAR!`, 2000);
  } catch (e) {
    console.log(e);
  }
}

document.getElementById("export-btn").addEventListener("click", async function () {
  try {
    let format = document.getElementById("export-format").value;
    if (format === "har") {
      await exportHarCollection();
    } else {
      await exportPostmanCollection();
    }
  } catch (e) {
    console.log(e);
  }
});

// Method/status filters read the dataset attributes buildDataRowElement /
// buildPendingRowElement / upsertDataRow set on each <tr> (statusBucketFor)
// instead of re-deriving them from cell text, so this stays a plain
// per-row AND of three independent conditions.
// Matches the URL text always; for data rows (pending rows have no captured
// body yet) also matches against the request/response body already held in
// detailsByButtonId, so searching isn't limited to what's visible in the URL
// column.
function rowMatchesFilters(row, searchTermLower, methodFilter, statusFilter) {
  let matchesUrl = row
    .querySelector(".url-cell")
    .textContent.toLowerCase()
    .includes(searchTermLower);
  let info = detailsByButtonId[row.dataset.requestId + "-curl-detector-apis"];
  let matchesBody =
    !!info &&
    ((info.requestBody && info.requestBody.toLowerCase().includes(searchTermLower)) ||
      (info.responseBody && info.responseBody.toLowerCase().includes(searchTermLower)));
  let matchesMethod = !methodFilter || row.dataset.method === methodFilter;
  let matchesStatus = !statusFilter || row.dataset.statusBucket === statusFilter;
  return (matchesUrl || matchesBody) && matchesMethod && matchesStatus;
}

function applyFilters() {
  let searchTerm = document.getElementById("search-input").value.trim();
  let searchTermLower = searchTerm.toLowerCase();
  let methodFilter = document.getElementById("method-filter").value;
  let statusFilter = document.getElementById("status-filter").value;
  let rows = document.querySelectorAll(
    "#table-result-detector-apis>tbody tr.data-row"
  );

  let matchCount = 0;
  for (const row of rows) {
    let isMatch = rowMatchesFilters(row, searchTermLower, methodFilter, statusFilter);
    row.style.display = isMatch ? "" : "none";
    if (isMatch) {
      matchCount++;
    }
    if (!isMatch && row.classList.contains("expanded")) {
      toggleDetailRow(row);
    }
  }

  let pendingRows = document.querySelectorAll(
    "#table-result-detector-apis>tbody tr.pending-row"
  );
  let visiblePendingCount = 0;
  for (const row of pendingRows) {
    let isMatch = rowMatchesFilters(row, searchTermLower, methodFilter, statusFilter);
    row.style.display = isMatch ? "" : "none";
    if (isMatch) {
      visiblePendingCount++;
    }
  }

  let tableWrap = document.getElementById("table-wrap");
  let emptyStateIcon = document.querySelector(".empty-state-icon");
  let emptyStateText = document.querySelector(".empty-state-text");

  if (totalRequestCount === 0 && pendingRows.length === 0) {
    tableWrap.classList.add("is-empty");
    emptyStateIcon.textContent = "📡";
    emptyStateText.textContent = "No API requests detected yet.";
  } else if (matchCount === 0 && visiblePendingCount === 0) {
    tableWrap.classList.add("is-empty");
    emptyStateIcon.textContent = "🔍";
    emptyStateText.textContent = searchTerm
      ? `No requests match "${searchTerm}".`
      : "No requests match the selected filters.";
  } else {
    tableWrap.classList.remove("is-empty");
  }
}

document.getElementById("search-input").addEventListener("input", function () {
  applyFilters();
  saveUIState();
});
document.getElementById("method-filter").addEventListener("change", function () {
  applyFilters();
  saveUIState();
});
document.getElementById("status-filter").addEventListener("change", function () {
  applyFilters();
  saveUIState();
});

function sortValueFor(column, row) {
  if (column === "url") {
    return row.dataset.url.toLowerCase();
  }
  if (column === "status") {
    return Number(row.dataset.statusCode);
  }
  if (column === "size") {
    return row.dataset.sizeBytes === "" ? -1 : Number(row.dataset.sizeBytes);
  }
  // "time": no duration yet reads as -1 so those rows sort first ascending
  // (fastest-looking), consistent with "nothing recorded" being the
  // smallest possible value rather than an arbitrary large one.
  return row.dataset.durationMs === "" ? -1 : Number(row.dataset.durationMs);
}

// Reorders the existing .data-row elements in place (no rebuild) according
// to the active sort; pending rows are left untouched, already trailing
// after the data rows per insertDataRow's own invariant. A no-op when
// sortColumn is null, leaving rows in their natural arrival order.
function applySort() {
  updateSortIndicators();
  if (!sortColumn) {
    return;
  }

  let tbody = getTbody();
  let rows = Array.from(tbody.querySelectorAll("tr.data-row"));
  rows.sort((a, b) => {
    let va = sortValueFor(sortColumn, a);
    let vb = sortValueFor(sortColumn, b);
    let cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  let anchor = firstPendingRow(tbody);
  for (const row of rows) {
    tbody.insertBefore(row, anchor);
  }
}

// Pure counting so the "does this url repeat" logic is testable without a
// DOM: returns a Map<url, count> for a list of urls (one entry per row).
function computeDuplicateCounts(urls) {
  let counts = new Map();
  for (const url of urls) {
    counts.set(url, (counts.get(url) || 0) + 1);
  }
  return counts;
}

// Tags each row whose url repeats elsewhere in the currently-tracked set
// with a "×N" badge — a structural property of the full set, so this counts
// every .data-row regardless of what applyFilters is currently hiding, and
// runs on every render (a row's count can change up or down as duplicates
// arrive or get evicted/cleared).
function updateDuplicateBadges() {
  let rows = Array.from(document.querySelectorAll("#table-result-detector-apis>tbody tr.data-row"));
  let counts = computeDuplicateCounts(rows.map((row) => row.dataset.url));

  for (const row of rows) {
    let count = counts.get(row.dataset.url);
    let existingBadge = row.querySelector(".dup-badge");
    if (count <= 1) {
      if (existingBadge) {
        existingBadge.remove();
      }
      continue;
    }
    let label = `×${count}`;
    if (existingBadge) {
      existingBadge.textContent = label;
    } else {
      let badge = document.createElement("span");
      badge.className = "dup-badge";
      badge.title = `Called ${count} times`;
      badge.textContent = label;
      row.querySelector(".url-cell").appendChild(badge);
    }
  }
}

function updateSortIndicators() {
  document.querySelectorAll("th.sortable .sort-indicator").forEach(function (el) {
    el.textContent = "";
  });
  if (!sortColumn) {
    return;
  }
  let th = document.querySelector(`th.sortable[data-sort-column="${sortColumn}"]`);
  if (th) {
    th.querySelector(".sort-indicator").textContent = sortDir === "asc" ? " ▲" : " ▼";
  }
}

// 3-state cycle per header: ascending -> descending -> off (natural order).
// Clicking a different header always starts fresh at ascending.
document.querySelectorAll("th.sortable").forEach(function (th) {
  th.addEventListener("click", function () {
    let column = th.dataset.sortColumn;
    if (sortColumn !== column) {
      sortColumn = column;
      sortDir = "asc";
    } else if (sortDir === "asc") {
      sortDir = "desc";
    } else {
      sortColumn = null;
    }
    applySort();
    saveUIState();
  });
});

document.getElementById("preserve-log").addEventListener("change", async function (e) {
  if (e.target.checked) {
    await chrome.storage.local.set({
      [PRESERVE_LOG_KEY]: true,
    });
  } else {
    await chrome.storage.local.set({
      [PRESERVE_LOG_KEY]: false,
    });
  }
});

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

async function displayAlert(typeAlert, msg, delayTime) {
  let alertEl = document.getElementById(typeAlert);
  alertEl.innerHTML = msg;
  alertEl.classList.add("show");
  await delay(delayTime);
  alertEl.classList.remove("show");
}

async function updateSwitchValue() {
  let switchPreserve = document.getElementById("preserve-log");
  let items = await chrome.storage.local.get([PRESERVE_LOG_KEY]);
  switchPreserve.checked = !!items[PRESERVE_LOG_KEY];
}
