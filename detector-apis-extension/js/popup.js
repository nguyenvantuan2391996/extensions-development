let totalRequestCount = 0;
let curlByButtonId = {};

window.addEventListener("load", async (event) => {
  console.log(event);

  await updateSwitchValue()

  // set value list apis request
  let arrAPIs = [];
  await chrome.storage.local.get(null, async function (items) {
    let trContent = "";
    for (let element of Object.keys(items)) {
      for (const element2 of Object.keys(items)) {
        if (items[element] === element2) {
          let curlCommand = items[element] + "-curl-detector-apis";
          let statusAndRequestID = items[element2].split("|");
          if (
            statusAndRequestID[2].includes(CONTENT_TYPE_JSON) &&
            !isExistedInArray(arrAPIs, element2)
          ) {
            arrAPIs.push(element2);
            let apiStatus = Number(statusAndRequestID[0].split(" ")[0])
            let badgeClass = apiStatus >= 200 && apiStatus < 300 ? 'status-badge status-success' : 'status-badge status-danger';
            trContent += `<tr><td><button type="button" class="copy-btn" id=${curlCommand}>Copy</button></td><td class="url-cell">${items[element]}</td><td class="status-cell"><span class="${badgeClass}">${statusAndRequestID[0]}</span></td></tr>`;

            let fullCurlCommand = items[curlCommand] || "";
            if (items[element2 + "-raw-data"]) {
              fullCurlCommand += " " + items[element2 + "-raw-data"];
            }
            curlByButtonId[curlCommand] = fullCurlCommand;
          }
          break;
        }
      }
    }
    document.querySelector(
      "#table-result-detector-apis>tbody"
    ).innerHTML = `<tbody>${trContent}</tbody>`;
    document
      .getElementById("table-wrap")
      .classList.toggle("is-empty", trContent === "");
    document.getElementById("request-count").textContent =
      `${arrAPIs.length} ${arrAPIs.length === 1 ? "request" : "requests"}`;
    totalRequestCount = arrAPIs.length;
    document.getElementById("copy-all-btn").disabled = arrAPIs.length === 0;
    applySearchFilter();

    // handle list button
    let listTR = document
      .querySelector("#table-result-detector-apis>tbody")
      .getElementsByTagName("tr");
    for (const trTag of listTR) {
      let buttonID = trTag
        .getElementsByTagName("td")[0]
        .getElementsByTagName("button")[0].id;

      document
        .getElementById(buttonID)
        .addEventListener("click", async function () {
          try {
            await copyCurl(buttonID, items);
          } catch (e) {
            console.log(e);
          }
        });
    }
  });
});

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

function applySearchFilter() {
  let searchTerm = document.getElementById("search-input").value.trim();
  let searchTermLower = searchTerm.toLowerCase();
  let rows = document
    .querySelector("#table-result-detector-apis>tbody")
    .getElementsByTagName("tr");

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

  let tableWrap = document.getElementById("table-wrap");
  let emptyStateIcon = document.querySelector(".empty-state-icon");
  let emptyStateText = document.querySelector(".empty-state-text");

  if (totalRequestCount === 0) {
    tableWrap.classList.add("is-empty");
    emptyStateIcon.textContent = "📡";
    emptyStateText.textContent = "No API requests detected yet.";
  } else if (matchCount === 0) {
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