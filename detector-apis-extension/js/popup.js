let totalRequestCount = 0;
let curlByButtonId = {};
let detailsByButtonId = {};
let knownRowUrls = new Set();
let isFirstRender = true;
let renderDebounceTimer = null;

window.addEventListener("load", async (event) => {
  console.log(event);

  await updateSwitchValue()
  await renderTable();

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== "local") {
      return;
    }
    scheduleRender();
  });
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

async function renderTable() {
  let expandedRow = document.querySelector(".data-row.expanded");
  let expandedButtonId = expandedRow
    ? expandedRow.getElementsByTagName("td")[0].getElementsByTagName("button")[0].id
    : null;

  await chrome.storage.local.get(null, async function (items) {
    let trContent = "";
    let arrAPIs = [];
    curlByButtonId = {};
    detailsByButtonId = {};

    for (let element of Object.keys(items)) {
      for (const element2 of Object.keys(items)) {
        if (items[element] === element2) {
          let curlCommand = items[element] + "-curl-detector-apis";
          let statusAndRequestID = items[element2].split("|");
          if (
            isDetectedContentType(statusAndRequestID[2]) &&
            !isExistedInArray(arrAPIs, element2)
          ) {
            arrAPIs.push(element2);
            let apiStatus = Number(statusAndRequestID[0].split(" ")[0])
            let badgeClass = apiStatus >= 200 && apiStatus < 300 ? 'status-badge status-success' : 'status-badge status-danger';
            let isNewRow = !isFirstRender && !knownRowUrls.has(element2);
            let rowClass = isNewRow ? "data-row row-new" : "data-row";
            trContent += `<tr class="${rowClass}"><td><button type="button" class="copy-btn" id=${curlCommand}>Copy</button></td><td class="url-cell"><span class="expand-arrow">&#9656;</span>${items[element]}</td><td class="status-cell"><span class="${badgeClass}">${statusAndRequestID[0]}</span></td></tr>`;

            let fullCurlCommand = items[curlCommand] || "";
            if (items[element2 + "-raw-data"]) {
              fullCurlCommand += " " + items[element2 + "-raw-data"];
            }
            curlByButtonId[curlCommand] = fullCurlCommand;

            detailsByButtonId[curlCommand] = {
              url: items[element],
              method: statusAndRequestID[0].split(" ")[1] || "",
              status: statusAndRequestID[0].split(" ")[0] || "",
              requestHeaders: parseHeadersJSON(items[element2 + "-request-headers"]),
              responseHeaders: parseHeadersJSON(items[element2 + "-response-headers"]),
              requestBody: items[element2 + "-request-body"] || "",
              responseBody: items[element2 + "-response-body"] || "",
            };
          }
          break;
        }
      }
    }

    knownRowUrls = new Set(arrAPIs);
    isFirstRender = false;

    let pendingCount = 0;
    for (const key of Object.keys(items)) {
      if (!key.endsWith("-pending")) {
        continue;
      }
      let pendingUrl = key.slice(0, -"-pending".length);
      if (isExistedInArray(arrAPIs, pendingUrl)) {
        continue;
      }
      pendingCount++;
      trContent += `<tr class="pending-row"><td></td><td class="url-cell">${escapeHtml(pendingUrl)}</td><td class="status-cell"><span class="status-badge status-pending"><span class="pending-dot"></span>${escapeHtml(items[key] || "")} pending</span></td></tr>`;
    }

    document.querySelector(
      "#table-result-detector-apis>tbody"
    ).innerHTML = `<tbody>${trContent}</tbody>`;
    document
      .getElementById("table-wrap")
      .classList.toggle("is-empty", trContent === "");
    document.getElementById("request-count").textContent =
      `${arrAPIs.length} ${arrAPIs.length === 1 ? "request" : "requests"}` +
      (pendingCount > 0 ? ` · ${pendingCount} pending` : "");
    totalRequestCount = arrAPIs.length;
    document.getElementById("copy-all-btn").disabled = arrAPIs.length === 0;
    document.getElementById("export-postman-btn").disabled = arrAPIs.length === 0;
    applySearchFilter();

    // handle list button
    let listTR = document.querySelectorAll(
      "#table-result-detector-apis>tbody tr.data-row"
    );
    for (const trTag of listTR) {
      let buttonID = trTag
        .getElementsByTagName("td")[0]
        .getElementsByTagName("button")[0].id;

      document
        .getElementById(buttonID)
        .addEventListener("click", async function (e) {
          e.stopPropagation();
          try {
            await copyCurl(buttonID, items);
          } catch (e) {
            console.log(e);
          }
        });

      trTag.addEventListener("click", function () {
        toggleDetailRow(trTag, buttonID);
      });

      if (trTag.classList.contains("row-new")) {
        setTimeout(function () {
          trTag.classList.remove("row-new");
        }, 1600);
      }
    }

    if (expandedButtonId) {
      let expandButton = document.getElementById(expandedButtonId);
      let rowToExpand = expandButton ? expandButton.closest("tr") : null;
      if (rowToExpand && rowToExpand.style.display !== "none") {
        toggleDetailRow(rowToExpand, expandedButtonId);
      }
    }
  });
}

async function copyCurl(id, items) {
  for (let element of Object.keys(items)) {
    for (const element2 of Object.keys(items)) {
      if (
        items[element] === element2 &&
        element2 + "-curl-detector-apis" === id
      ) {
        let curlCommand = items[id];
        if (items[element2 + "-raw-data"]) {
          curlCommand += " " + items[element2 + "-raw-data"];
        }
        await navigator.clipboard.writeText(curlCommand).then(async (r) => {
          try {
            console.log(r);
            await displayAlert("alert-success", "Copied successfully!", 2000);
          } catch (e) {
            console.log(e);
          }
        });
        break;
      }
    }
  }
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

function toggleDetailRow(trTag, buttonID) {
  let existing = trTag.nextElementSibling;
  if (existing && existing.classList.contains("detail-row")) {
    existing.remove();
    trTag.classList.remove("expanded");
    return;
  }

  document.querySelectorAll(".detail-row").forEach(function (row) {
    row.remove();
  });
  document.querySelectorAll(".data-row.expanded").forEach(function (row) {
    row.classList.remove("expanded");
  });

  trTag.insertAdjacentElement("afterend", buildDetailRow(buttonID));
  trTag.classList.add("expanded");
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
  document.querySelectorAll(".detail-row").forEach(function (row) {
    row.remove();
  });
  document.querySelectorAll(".data-row.expanded").forEach(function (row) {
    row.classList.remove("expanded");
  });

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