importScripts("constants.js");

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: ADD_GIF_MENU_ID,
    title: "Add this image as a Bubu Dudu GIF",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener(async function (info) {
  if (info.menuItemId !== ADD_GIF_MENU_ID) {
    return
  }

  const url = info.srcUrl
  if (!url || !/\.gif(\?.*)?$/i.test(url)) {
    flashBadge("!", "#ff3b30")
    return
  }

  const result = await chrome.storage.local.get([LIST_GIFS])
  const gifs = result[LIST_GIFS] || []
  if (gifs.includes(url)) {
    flashBadge("✓", "#8e8e93")
    return
  }

  gifs.push(url)
  try {
    await chrome.storage.local.set({ [LIST_GIFS]: gifs })
    flashBadge("✓", "#34c759")
  } catch (e) {
    flashBadge("!", "#ff3b30")
  }
});

function flashBadge(text, color) {
  chrome.action.setBadgeText({ text })
  chrome.action.setBadgeBackgroundColor({ color })
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2000)
}

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
