const PopupUI = (() => {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getMethodTone(method) {
    switch (String(method || "").toUpperCase()) {
      case "GET":
        return "method-pill--get";
      case "POST":
        return "method-pill--post";
      case "PUT":
        return "method-pill--put";
      default:
        return "method-pill--default";
    }
  }

  function getStatusTone(statusCode) {
    if (statusCode >= 200 && statusCode < 300) {
      return "success";
    }

    if (statusCode >= 300 && statusCode < 400) {
      return "warning";
    }

    return "danger";
  }

  function truncateMiddle(value, visibleLength = 14) {
    if (!value || value.length <= visibleLength * 2) {
      return value || "Unavailable";
    }

    return `${value.slice(0, visibleLength)}…${value.slice(-visibleLength)}`;
  }

  function renderRequestRows(apiEntries, selectedCurlId, emptyState) {
    if (!apiEntries.length) {
      return `
        <tr class="request-empty">
          <td colspan="3">
            <div class="request-empty__card">
              <div class="request-empty__icon">⌁</div>
              <h3 class="request-empty__title">${escapeHtml(emptyState.title)}</h3>
              <p class="request-empty__description">${escapeHtml(emptyState.description)}</p>
            </div>
          </td>
        </tr>
      `;
    }

    return apiEntries.map((api) => {
      const statusTone = getStatusTone(api.statusCode);
      const isSelected = api.curlId === selectedCurlId;
      const requestIdLabel = api.requestId ? truncateMiddle(api.requestId, 12) : "No request id";

      return `
        <tr class="request-row${isSelected ? " is-selected" : ""}" data-curl-id="${escapeHtml(api.curlId)}">
          <td class="request-cell request-cell--action">
            <button type="button" class="copy-button" id="${escapeHtml(api.curlId)}" data-role="copy-request">Copy</button>
          </td>
          <td class="request-cell">
            <button type="button" class="request-card" data-role="select-request" data-curl-id="${escapeHtml(api.curlId)}">
              <div class="request-card__top">
                <span class="method-pill ${getMethodTone(api.method)}">${escapeHtml(api.method || "UNKNOWN")}</span>
                <span class="status-pill status-pill--${statusTone}">${escapeHtml(api.statusText)}</span>
              </div>
              <div class="request-card__url" title="${escapeHtml(api.url)}">${escapeHtml(api.url)}</div>
              <div class="request-card__meta">
                <span>${escapeHtml(requestIdLabel)}</span>
                <span>${escapeHtml(api.contentType || "Unknown type")}</span>
              </div>
            </button>
          </td>
          <td class="request-cell request-cell--status">
            <span class="status-indicator status-indicator--${statusTone}">${escapeHtml(String(api.statusCode || "—"))}</span>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderOverview(apiEntry) {
    if (!apiEntry) {
      return `
        <div class="detail-empty">
          <div class="detail-empty__icon">◎</div>
          <h3 class="detail-empty__title">Select a request</h3>
          <p class="detail-empty__copy">Choose any captured request from the left to inspect its URL, status, request id, and generated CURL command.</p>
        </div>
      `;
    }

    return `
      <div class="details-grid">
        <article class="meta-card">
          <span class="details-grid__label">URL</span>
          <span class="details-grid__value details-grid__value--mono">${escapeHtml(apiEntry.url)}</span>
        </article>
        <article class="meta-card">
          <span class="details-grid__label">Method</span>
          <span class="details-grid__value">${escapeHtml(apiEntry.method || "Unknown")}</span>
        </article>
        <article class="meta-card">
          <span class="details-grid__label">Status</span>
          <span class="details-grid__value">${escapeHtml(apiEntry.statusText || "Unknown")}</span>
        </article>
        <article class="meta-card">
          <span class="details-grid__label">Request id</span>
          <span class="details-grid__value details-grid__value--mono">${escapeHtml(apiEntry.requestId || "Unavailable")}</span>
        </article>
        <article class="meta-card">
          <span class="details-grid__label">Content type</span>
          <span class="details-grid__value details-grid__value--mono">${escapeHtml(apiEntry.contentType || "Unavailable")}</span>
        </article>
      </div>
    `;
  }

  function renderCodeBlock(content, fallback) {
    return escapeHtml(content || fallback);
  }

  return {
    renderRequestRows,
    renderOverview,
    renderCodeBlock,
  };
})();

