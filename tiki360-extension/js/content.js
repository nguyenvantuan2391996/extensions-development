function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

function getElementByXpath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

chrome.runtime.onMessage.addListener( function (msg, sender, sendResponse) {
    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_LOAD_EXTENSION) {
        let accessToken = localStorage.getItem(ACCESS_TOKEN)

        let accessTokenObject = {
            access_token: NOT_FOUND_MSG,
            customer_id: NOT_FOUND_MSG,
        }
        if (accessToken) {
            accessTokenObject = {access_token, customer_id} = JSON.parse(accessToken);
            if (msg.currentURL.includes("https://beta.tala.xyz/bao-hiem-so/thong-tin-hop-dong")) {
                const policyID = getElementByXpath("//*[@id=\"__next\"]/div[1]/main/div[2]/div[2]/div[3]").textContent.split("-")[2]
                if (typeof policyID != "undefined") {
                    accessTokenObject.policy_id = policyID
                } else {
                    accessTokenObject.policy_id = NOT_FOUND_MSG
                }
            }
        }

        if (!accessTokenObject.customer_id) {
            accessTokenObject.access_token = NOT_FOUND_MSG
            accessTokenObject.customer_id = NOT_FOUND_MSG
        }

        sendResponse(accessTokenObject)
    }
})
