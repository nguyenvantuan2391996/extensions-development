importScripts("constants.js", "utils.js");

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
  if (!url || !(await isGifUrl(url))) {
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

chrome.commands.onCommand.addListener(async function (command) {
  if (command !== "toggle-bubu-dudu") {
    return
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !isSupportedTabUrl(tab.url)) {
    flashBadge("!", "#ff3b30")
    return
  }

  const hostname = new URL(tab.url).hostname
  const result = await chrome.storage.local.get([DISABLED_HOSTS])
  const hosts = result[DISABLED_HOSTS] || []
  const wasDisabled = hosts.includes(hostname)
  const nextHosts = wasDisabled ? hosts.filter(h => h !== hostname) : [...hosts, hostname]

  await chrome.storage.local.set({ [DISABLED_HOSTS]: nextHosts })
  try {
    await chrome.tabs.sendMessage(tab.id, { from: BACKGROUND_SCREEN, subject: HANDLE_SET_DISABLED_HOSTS })
  } catch (e) {
    // No content script listening on this tab — nothing to do.
  }

  flashBadge(wasDisabled ? "ON" : "OFF", wasDisabled ? "#34c759" : "#8e8e93")
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
