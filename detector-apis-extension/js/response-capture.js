(function () {
  const CAPTURE_EVENT_NAME = "detector-apis-extension-response-captured";
  const MAX_BODY_LENGTH = 200000;

  function truncate(text) {
    if (typeof text !== "string") {
      return text;
    }
    return text.length > MAX_BODY_LENGTH
      ? text.slice(0, MAX_BODY_LENGTH) + "\n...[truncated]"
      : text;
  }

  function dispatchCapture(detail) {
    document.dispatchEvent(
      new CustomEvent(CAPTURE_EVENT_NAME, { detail: detail })
    );
  }

  const originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = function (...args) {
      return originalFetch.apply(this, args).then(function (response) {
        try {
          let contentType = response.headers.get("content-type") || "";
          if (response.url && contentType) {
            response
              .clone()
              .text()
              .then(function (bodyText) {
                dispatchCapture({
                  url: response.url,
                  status: response.status,
                  contentType: contentType,
                  body: truncate(bodyText),
                });
              })
              .catch(function () {});
          }
        } catch (e) {}
        return response;
      });
    };
  }

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__detectorApisUrl = url;
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("loadend", function () {
      try {
        let contentType = this.getResponseHeader("content-type") || "";
        // this.responseText throws for any responseType other than ""/"text"
        // (json/arraybuffer/blob/document) — read as much as we safely can
        // rather than losing the capture (and leaving a stuck FIFO entry in
        // background.js's pendingBodyMatchesByUrl) for those requests.
        let isTextReadable = this.responseType === "" || this.responseType === "text";
        let body = isTextReadable
          ? this.responseText
          : this.responseType === "json"
          ? JSON.stringify(this.response)
          : "";
        if (contentType && (this.responseURL || this.__detectorApisUrl)) {
          dispatchCapture({
            url: this.responseURL || this.__detectorApisUrl,
            status: this.status,
            contentType: contentType,
            body: truncate(body),
          });
        }
      } catch (e) {}
    });
    return originalSend.apply(this, args);
  };
})();
