importScripts("constants.js");
importScripts("utils.js");

chrome.webRequest.onBeforeRequest.addListener(
  async function (details) {
    const uniqueKey = generateUniqueKey(PATTERN_API_NAME_DETECTOR_API);
    await chrome.storage.local.set({ [uniqueKey]: details.url });
    await trackAndEvict(details.url, uniqueKey);
  },
  { urls: ["<all_urls>"] }
);

// Keeps chrome.storage.local bounded: drops stale duplicate uniqueKey
// mappings left behind by repeated calls to the same URL (e.g. polling),
// and evicts the least-recently-seen URLs once MAX_TRACKED_REQUESTS is
// exceeded, removing all of their associated keys.
async function trackAndEvict(url, uniqueKey) {
  const items = await chrome.storage.local.get(null);
  let keysToRemove = [];

  for (const key of Object.keys(items)) {
    if (
      key !== uniqueKey &&
      key.startsWith(PATTERN_API_NAME_DETECTOR_API) &&
      items[key] === url
    ) {
      keysToRemove.push(key);
    }
  }

  let order = (items[REQUEST_ORDER_KEY] || []).filter((u) => u !== url);
  order.push(url);

  if (order.length > MAX_TRACKED_REQUESTS) {
    const evictedUrls = order.slice(0, order.length - MAX_TRACKED_REQUESTS);
    order = order.slice(order.length - MAX_TRACKED_REQUESTS);

    for (const evictedUrl of evictedUrls) {
      keysToRemove.push(
        evictedUrl,
        evictedUrl + "-curl-detector-apis",
        evictedUrl + "-raw-data",
        evictedUrl + "-request-headers",
        evictedUrl + "-response-headers",
        evictedUrl + "-request-body"
      );
      for (const key of Object.keys(items)) {
        if (
          key.startsWith(PATTERN_API_NAME_DETECTOR_API) &&
          items[key] === evictedUrl
        ) {
          keysToRemove.push(key);
        }
      }
    }
  }

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
  await chrome.storage.local.set({ [REQUEST_ORDER_KEY]: order });
}

chrome.webRequest.onHeadersReceived.addListener(
  async function (details) {
    let headers = details.responseHeaders;
    let infoRequest = details.statusCode + " " + details.method + "|";

    infoRequest +=
      getValueHeaderByKey(X_REQUEST_ID_DETECTOR_API, headers) + "|";
    infoRequest += getValueHeaderByKey(CONTENT_TYPE, headers);

    await chrome.storage.local.set({
      [details.url]: infoRequest,
      [details.url + "-response-headers"]: JSON.stringify(headers || []),
    });

    await updateBadgeCount();
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders", "extraHeaders"]
);

async function updateBadgeCount() {
  const items = await chrome.storage.local.get(null);
  let arrAPIs = [];

  for (const element of Object.keys(items)) {
    for (const element2 of Object.keys(items)) {
      if (items[element] === element2) {
        const statusAndRequestID = String(items[element2]).split("|");
        if (
          isDetectedContentType(statusAndRequestID[2]) &&
          !isExistedInArray(arrAPIs, element2)
        ) {
          arrAPIs.push(element2);
        }
        break;
      }
    }
  }

  const count = arrAPIs.length;
  await chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#0071e3" });
}

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
      [details.url + "-request-headers"]: JSON.stringify(
        details.requestHeaders || []
      ),
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
          [details.url + "-request-body"]: decodedString,
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
          [details.url + "-request-body"]: rawDataBody,
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
          [details.url + "-request-body"]: decodedString,
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
          [details.url + "-request-body"]: rawDataBody,
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
    async function (tabs) {
        if (
            changeInfo.status === LOADING &&
            !checkUndefined(tabs[0]) &&
            !checkUndefined(tab) &&
            tabs[0].url === tab.url
        ) {
            await chrome.storage.local.get([
                "preserve_log_key"
            ], async function (items) {
               if (!!!items.preserve_log_key) {
                   chrome.storage.local.clear();
                   await chrome.action.setBadgeText({ text: "" });
               }
            });
        }
    }
  );
});
