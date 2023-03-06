importScripts('constants.js')

chrome.webRequest.onBeforeRequest.addListener(
    async function (details) {
        if (details.url.includes(PATTERN_DS_INSURANCE)
            && !details.url.includes("/ds-insurance/v2/policies/transaction/list?code=")
            && !details.url.includes("/ds-insurance/v2/policies/transaction/detail?transaction_id=")) {
            await chrome.storage.local.set({[generateUniqueKey()]: details.url})
        }
    },
    {urls: ["<all_urls>"]}
);

chrome.webRequest.onHeadersReceived.addListener(
     async function (details) {
         if (details.url.includes(PATTERN_DS_INSURANCE)
             && !details.url.includes("/ds-insurance/v2/policies/transaction/list?code=")
             && !details.url.includes("/ds-insurance/v2/policies/transaction/detail?transaction_id=")) {
             let headers = details.responseHeaders
             let infoRequest = details.statusCode + "|"
             for (const header of headers) {
                 if (header.name.toLowerCase() === X_REQUEST_ID) {
                     infoRequest += header.value
                     break
                 }
             }

             await chrome.storage.local.set({[details.url]: infoRequest})
         }
     },
    {urls: ["<all_urls>"]},
    ['responseHeaders', 'extraHeaders']
)

chrome.webRequest.onBeforeSendHeaders.addListener(
    async function (details) {
        if (details.url.includes(PATTERN_DS_INSURANCE)
            && !details.url.includes("/ds-insurance/v2/policies/transaction/list?code=")
            && !details.url.includes("/ds-insurance/v2/policies/transaction/detail?transaction_id=")) {
            let curlCommand = "curl '" + details.url + "'";

            details.requestHeaders.forEach(function (header) {
                curlCommand += " -H '" + header.name + ": " + header.value + "'";
            });

            await chrome.storage.local.set({[details.url + "-curl"]: curlCommand})
        }
    },
    {urls: ["<all_urls>"]},
    ["requestHeaders"]
);


function generateUniqueKey() {
    const prefix = PATTERN_API_NAME
    const randomString = Math.random().toString(36).substring(2, 12)
    return `${prefix}_${randomString}`
}

// load main website
chrome.tabs.onUpdated.addListener( function (tabId, changeInfo, tab) {
    if (changeInfo.status === LOADING) {
        chrome.storage.local.clear()
    }
})