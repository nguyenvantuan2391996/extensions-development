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