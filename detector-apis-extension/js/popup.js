let totalRequestCount = 0;
let curlByButtonId = {};
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

window.addEventListener("load", async (event) => {
  activeTabId = await getActiveTabId();
  showAllTabs = await getShowAllTabsPreference();
  document.getElementById("all-tabs-toggle").checked = showAllTabs;

  await updateSwitchValue()
  await renderTable();

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== "local") {
      return;
    }
    scheduleRender();
  });
});

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

function buildDataRowElement(requestId, url, buttonID, statusCode, badgeClass, isNewRow) {
  let tr = document.createElement("tr");
  tr.className = isNewRow ? "data-row row-new" : "data-row";
  tr.dataset.requestId = requestId;
  tr.innerHTML = `<td><button type="button" class="copy-btn" id="${buttonID}">Copy</button></td><td class="url-cell"><span class="expand-arrow">&#9656;</span>${escapeHtml(url)}</td><td class="status-cell"><span class="${badgeClass}">${escapeHtml(statusCode)}</span></td>`;
  return tr;
}

function buildPendingRowElement(requestId, url, method) {
  let tr = document.createElement("tr");
  tr.className = "pending-row";
  tr.dataset.requestId = requestId;
  tr.innerHTML = `<td></td><td class="url-cell">${escapeHtml(url)}</td><td class="status-cell"><span class="status-badge status-pending"><span class="pending-dot"></span>${escapeHtml(method || "")} pending</span></td>`;
  return tr;
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

  let fullCurlCommand = items[buttonID] || "";
  if (items[requestId + "-raw-data"]) {
    fullCurlCommand += " " + items[requestId + "-raw-data"];
  }
  curlByButtonId[buttonID] = fullCurlCommand;
  detailsByButtonId[buttonID] = {
    url: url,
    method: statusCode.split(" ")[1] || "",
    status: statusCode.split(" ")[0] || "",
    requestHeaders: parseHeadersJSON(items[requestId + "-request-headers"]),
    responseHeaders: parseHeadersJSON(items[requestId + "-response-headers"]),
    requestBody: items[requestId + "-request-body"] || "",
    responseBody: items[requestId + "-response-body"] || "",
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
    let tr = buildDataRowElement(requestId, url, buttonID, statusCode, badgeClass, isNewRow);
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
    let badge = entry.tr.querySelector(".status-cell .status-badge");
    badge.className = badgeClass;
    badge.textContent = statusCode;
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
    delete curlByButtonId[entry.buttonID];
    delete detailsByButtonId[entry.buttonID];
  }
}

function clearTable() {
  getTbody().innerHTML = "";
  rowsByRequestId.clear();
  curlByButtonId = {};
  detailsByButtonId = {};
  expandedRequestId = null;
  totalRequestCount = 0;
  isFirstRender = false;

  document.getElementById("table-wrap").classList.add("is-empty");
  document.getElementById("request-count").textContent = "0 requests";
  document.getElementById("copy-all-btn").disabled = true;
  document.getElementById("export-postman-btn").disabled = true;
  applySearchFilter();
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
      requestId + "-pending"
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

    if (statusAndRequestID && isDetectedContentType(statusAndRequestID[2])) {
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
  document.getElementById("export-postman-btn").disabled = requestCount === 0;

  if (expandedRequestId) {
    let entry = rowsByRequestId.get(expandedRequestId);
    if (entry) {
      refreshExpandedDetail(entry);
    }
  }

  applySearchFilter();
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

  let dataRow = e.target.closest("tr.data-row");
  if (dataRow) {
    toggleDetailRow(dataRow);
  }
});

async function copyCurl(id) {
  let curlCommand = curlByButtonId[id];
  if (!curlCommand) {
    return;
  }
  await navigator.clipboard.writeText(curlCommand).then(async (r) => {
    try {
      console.log(r);
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
      return `<tr><td class="kv-key">${escapeHtml(h.name)}</td><td class="kv-value">${escapeHtml(h.value)}</td></tr>`;
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
  td.colSpan = 3;
  td.innerHTML = `
    <div class="detail-panel">
      <div class="detail-section">
        <div class="detail-section-title">Request</div>
        <div class="detail-meta">${escapeHtml(info.method || "")} &middot; ${escapeHtml(info.status || "")}</div>
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

async function copyAllCurl() {
  let rows = document.querySelectorAll(
    "#table-result-detector-apis>tbody tr.data-row"
  );

  let curlList = [];
  for (const row of rows) {
    if (row.style.display === "none") {
      continue;
    }
    let buttonID = row
      .getElementsByTagName("td")[0]
      .getElementsByTagName("button")[0].id;
    if (curlByButtonId[buttonID]) {
      curlList.push(curlByButtonId[buttonID]);
    }
  }

  if (curlList.length === 0) {
    try {
      await displayAlert("alert-success", "No curl requests to copy!", 2000);
    } catch (e) {
      console.log(e);
    }
    return;
  }

  let allCurlText = curlList.join("\n\n");
  await navigator.clipboard.writeText(allCurlText).then(async (r) => {
    try {
      console.log(r);
      await displayAlert(
        "alert-success",
        `Copied ${curlList.length} curl request(s)!`,
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

async function exportPostmanCollection() {
  let rows = document.querySelectorAll(
    "#table-result-detector-apis>tbody tr.data-row"
  );

  let postmanItems = [];
  for (const row of rows) {
    if (row.style.display === "none") {
      continue;
    }
    let buttonID = row
      .getElementsByTagName("td")[0]
      .getElementsByTagName("button")[0].id;
    let info = detailsByButtonId[buttonID];
    if (!info) {
      continue;
    }

    let requestHeaders = info.requestHeaders || [];
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
        header: (info.responseHeaders || []).map(function (h) {
          return { key: h.name, value: h.value };
        }),
        body: info.responseBody,
      });
    }

    postmanItems.push({
      name: info.url,
      request: postmanRequest,
      response: responses,
    });
  }

  if (postmanItems.length === 0) {
    try {
      await displayAlert("alert-success", "No requests to export!", 2000);
    } catch (e) {
      console.log(e);
    }
    return;
  }

  let collection = {
    info: {
      name: "Detector APIs Extension Export",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: postmanItems,
  };

  let blob = new Blob([JSON.stringify(collection, null, 2)], {
    type: "application/json",
  });
  let url = URL.createObjectURL(blob);
  let link = document.createElement("a");
  link.href = url;
  link.download = `detector-apis-export-${Date.now()}.postman_collection.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

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

document.getElementById("export-postman-btn").addEventListener("click", async function () {
  try {
    await exportPostmanCollection();
  } catch (e) {
    console.log(e);
  }
});

function applySearchFilter() {
  let searchTerm = document.getElementById("search-input").value.trim();
  let searchTermLower = searchTerm.toLowerCase();
  let rows = document.querySelectorAll(
    "#table-result-detector-apis>tbody tr.data-row"
  );

  let matchCount = 0;
  for (const row of rows) {
    let isMatch = row
      .querySelector(".url-cell")
      .textContent.toLowerCase()
      .includes(searchTermLower);
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
    let isMatch = row
      .querySelector(".url-cell")
      .textContent.toLowerCase()
      .includes(searchTermLower);
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
    emptyStateText.textContent = `No requests match "${searchTerm}".`;
  } else {
    tableWrap.classList.remove("is-empty");
  }
}

document.getElementById("search-input").addEventListener("input", applySearchFilter);

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
  await chrome.storage.local.get([
    "preserve_log_key"
  ], async function (items) {
    switchPreserve.checked = !!items.preserve_log_key;
  });
}
