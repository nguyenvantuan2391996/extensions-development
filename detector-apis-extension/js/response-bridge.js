document.addEventListener(
  "detector-apis-extension-response-captured",
  function (event) {
    let detail = event.detail;
    if (!detail || !detail.url) {
      return;
    }
    try {
      if (!chrome.runtime || !chrome.runtime.id) {
        return;
      }
      chrome.runtime
        .sendMessage({
          type: "DETECTOR_APIS_RESPONSE_BODY",
          url: detail.url,
          status: detail.status,
          contentType: detail.contentType,
          body: detail.body,
        })
        .catch(function () {});
    } catch (e) {}
  }
);
