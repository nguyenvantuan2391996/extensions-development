importScripts('constants.js')

chrome.webRequest.onBeforeRequest.addListener(
    async function (details) {
        await chrome.storage.local.set({[generateUniqueKey()]: details.url})
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


function generateUniqueKey() {
    const prefix = PATTERN_API_NAME_DETECTOR_API
    const randomString = Math.random().toString(36).substring(2, 12)
    return `${prefix}_${randomString}`
}

// load main website
chrome.tabs.onUpdated.addListener(  function (tabId, changeInfo, tab) {
    console.log(tab)
    if (changeInfo.status === LOADING) {
        chrome.storage.local.clear()
    }
})