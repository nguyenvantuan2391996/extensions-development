importScripts("constants.js");

chrome.webNavigation.onDOMContentLoaded.addListener(async function (details) {
  // Only react to the top-level page load, not every iframe on it.
  if (details.frameId !== 0) {
    return
  }

  /* global chrome */
  try {
    await chrome.tabs.sendMessage(details.tabId, {
      from: BACKGROUND_SCREEN,
      subject: HANDLE_MAIN_WEBSITE_LOADED,
    });
  } catch (e) {
    // No content script listening on this tab (e.g. chrome:// pages) — nothing to do.
  }
});
