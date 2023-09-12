importScripts("constants.js");
importScripts("utils.js");

chrome.webRequest.onBeforeRequest.addListener(
  async function (details) {
    await chrome.storage.local.set({
      [generateUniqueKey(PATTERN_API_NAME_DETECTOR_API)]: details.url,
    });
  },
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onHeadersReceived.addListener(
  async function (details) {
    let headers = details.responseHeaders;
    let infoRequest = details.statusCode + " " + details.method + "|";

    infoRequest +=
      getValueHeaderByKey(X_REQUEST_ID_DETECTOR_API, headers) + "|";
    infoRequest += getValueHeaderByKey(CONTENT_TYPE, headers);

    await chrome.storage.local.set({ [details.url]: infoRequest });
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders", "extraHeaders"]
);

function getValueHeaderByKey(key, headers) {
  for (const header of headers) {
    if (header.name.toLowerCase() === key) {
      return header.value;
    }
  }

  return "";
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  async function (details) {
    let curlCommand = "";

    if (details.method !== "PUT") {
      curlCommand = "curl '" + details.url + "'";
    } else {
      curlCommand = "curl --location --request PUT '" + details.url + "'";
    }

    details.requestHeaders.forEach(function (header) {
      curlCommand += " -H '" + header.name + ": " + header.value + "'";
    });

    await chrome.storage.local.set({
      [details.url + "-curl-detector-apis"]: curlCommand,
    });
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

chrome.webRequest.onBeforeRequest.addListener(
  async function (details) {
    // POST
    if (details.method === "POST") {
      const requestBody = details.requestBody;
      if (requestBody && requestBody.raw && requestBody.raw[0]) {
        const uint8Array = new Uint8Array(requestBody.raw[0].bytes);
        const textDecoder = new TextDecoder("utf-8");
        const decodedString = textDecoder.decode(uint8Array);

        await chrome.storage.local.set({
          [details.url + "-raw-data"]: "--data-raw '" + decodedString + "'",
        });
      }

      // form data
      if (requestBody && requestBody.formData) {
        let rawDataBody = "";
        for (const key in requestBody.formData) {
          if (requestBody.formData.hasOwnProperty(key)) {
            rawDataBody += `${key}=${requestBody.formData[key][0]}&`;
          }
        }

        await chrome.storage.local.set({
          [details.url + "-raw-data"]: "--data-raw '" + rawDataBody + "'",
        });
      }
    }

    // PUT
    if (details.method === "PUT") {
      const requestBody = details.requestBody;
      if (requestBody && requestBody.raw && requestBody.raw[0]) {
        const uint8Array = new Uint8Array(requestBody.raw[0].bytes);
        const textDecoder = new TextDecoder("utf-8");
        const decodedString = textDecoder.decode(uint8Array);

        await chrome.storage.local.set({
          [details.url + "-raw-data"]: "--data '" + decodedString + "'",
        });
      }

      // form data
      if (requestBody && requestBody.formData) {
        let rawDataBody = "";
        for (const key in requestBody.formData) {
          if (requestBody.formData.hasOwnProperty(key)) {
            rawDataBody += `${key}=${requestBody.formData[key][0]}&`;
          }
        }

        await chrome.storage.local.set({
          [details.url + "-raw-data"]: "--data '" + rawDataBody + "'",
        });
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// load main website
chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
  await chrome.tabs.query(
    {
      active: true,
      lastFocusedWindow: true,
    },
    function (tabs) {
      if (
        changeInfo.status === LOADING &&
        !checkUndefined(tabs[0]) &&
        !checkUndefined(tab) &&
        tabs[0].url === tab.url
      ) {
        chrome.storage.local.clear();
      }
    }
  );
});
