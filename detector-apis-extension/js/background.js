importScripts('constants.js')
importScripts('utils.js')

chrome.webRequest.onBeforeRequest.addListener(
    async function (details) {
        await chrome.storage.local.set({[generateUniqueKey(PATTERN_API_NAME_DETECTOR_API)]: details.url})
    },
    {urls: ["<all_urls>"]}
);

chrome.webRequest.onHeadersReceived.addListener(
     async function (details) {
         let headers = details.responseHeaders
         let infoRequest = details.statusCode + "|"
         for (const header of headers) {
             if (header.name.toLowerCase() === X_REQUEST_ID_DETECTOR_API) {
                 infoRequest += header.value
                 break
             }
         }

         await chrome.storage.local.set({[details.url]: infoRequest})
     },
    {urls: ["<all_urls>"]},
    ['responseHeaders', 'extraHeaders']
)

chrome.webRequest.onBeforeSendHeaders.addListener(
    async function (details) {
        let curlCommand = "curl '" + details.url + "'";

        details.requestHeaders.forEach(function (header) {
            curlCommand += " -H '" + header.name + ": " + header.value + "'";
        });

        await chrome.storage.local.set({[details.url + "-curl-detector-apis"]: curlCommand})
    },
    {urls: ["<all_urls>"]},
    ["requestHeaders"]
);

// load main website
chrome.tabs.onUpdated.addListener(  async function (tabId, changeInfo, tab) {
    await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    }, function(tabs) {
        if (changeInfo.status === LOADING && !checkUndefined(tabs[0]) && !checkUndefined(tab) && tabs[0].url === tab.url) {
            console.log(tab.url)
            chrome.storage.local.clear()
        }
    })
})