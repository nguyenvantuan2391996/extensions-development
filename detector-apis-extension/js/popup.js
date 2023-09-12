window.addEventListener("load", async (event) => {
  console.log(event);

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
            trContent += `<tr><td><button type="button" class="btn btn-info" id=${curlCommand}>Copy</button></td><td>${items[element]}</td><td>${statusAndRequestID[0]}</td><td>${statusAndRequestID[1]}</td></tr>`;
          }
          break;
        }
      }
    }
    document.querySelector(
      "#table-result-detector-apis>tbody"
    ).innerHTML = `<tbody>${trContent}</tbody>`;

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

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

async function displayAlert(typeAlert, msg, delayTime) {
  document.getElementById(typeAlert).style.display = "block";
  document.getElementById(typeAlert).innerHTML = msg;
  await delay(delayTime);
  document.getElementById(typeAlert).style.display = "none";
}
