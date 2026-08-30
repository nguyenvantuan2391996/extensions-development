let currentHostname = null
let tabSupported = false
const GIF_PAGE_SIZE = 32
let pendingGifs = []
let gifNames = {}
let favoriteGifs = []
// Full, ordered list of every GIF in the library (favorites first), independent
// of how many are currently rendered/paginated. Search filters against this,
// not the DOM, so it can find GIFs that haven't been paged into view yet.
let allGifs = []
let isSearchActive = false

function renderMoreGifs() {
  const nextBatch = pendingGifs.splice(0, GIF_PAGE_SIZE)
  nextBatch.forEach(src => addGifToDOM(src, gifNames[src]))
  document.getElementById("btn-load-more-gifs").hidden = pendingGifs.length === 0
}

document.getElementById("btn-load-more-gifs").addEventListener("click", renderMoreGifs)

document.addEventListener("DOMContentLoaded",  async function () {
  /* global chrome */
  const initState = await chrome.storage.local.get([IS_INIT])
  const isFirstRun = !initState[IS_INIT]

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabSupported = isSupportedTabUrl(activeTab?.url)
  if (tabSupported) {
    currentHostname = new URL(activeTab.url).hostname
  } else {
    document.getElementById("page-banner").removeAttribute("hidden")
    document.getElementById("site_toggle").disabled = true
  }

  const tabState = await chrome.storage.local.get([LAST_ACTIVE_TAB])
  if (tabState[LAST_ACTIVE_TAB] === "settings") {
    activateTab("settings")
  }

  if (isFirstRun) {
    // The content script only auto-injects into pages that were (re)loaded
    // after install. If the current tab was already open before that, it
    // has no content script yet — inject it directly so picking a GIF works
    // right away, without reloading (and disrupting) whatever the user was
    // doing. Ping first: if the tab loaded *after* install, the manifest's
    // content script is already there, and injecting again would collide
    // with its top-level `const` declarations.
    if (activeTab?.id && tabSupported) {
      try {
        await chrome.tabs.sendMessage(activeTab.id, { from: POPUP_SCREEN, subject: "ping" })
      } catch (e) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ["js/constants.js", "js/utils.js", "js/content.js"]
          })
        } catch (e2) {
          // Injection can fail on restricted pages (chrome://, the Web Store, etc.) — nothing to do.
        }
      }
    }
  }

  const listState = await chrome.storage.local.get([LIST_GIFS, GIF_NAMES, FAVORITE_GIFS])
  let gifs = LIST_GIFS_DEFAULT
  if (listState[LIST_GIFS] && listState[LIST_GIFS].length > 0) {
    gifs = listState[LIST_GIFS]
  } else {
    await chrome.storage.local.set({ [LIST_GIFS]: LIST_GIFS_DEFAULT })
  }
  gifNames = listState[GIF_NAMES] || {}
  favoriteGifs = listState[FAVORITE_GIFS] || []

  await renderPresetOptions()

  async function renderGifs() {
    document.getElementById("gif-loading").hidden = true
    // Favorites sort first so pinned GIFs are always visible without scrolling.
    const favoritesInList = gifs.filter(src => favoriteGifs.includes(src))
    const restOfList = gifs.filter(src => !favoriteGifs.includes(src))
    pendingGifs = [...favoritesInList, ...restOfList]
    allGifs = [...pendingGifs]
    renderMoreGifs()
    if (isFirstRun) {
      await chrome.storage.local.set({ [IS_INIT]: true })
      return
    }

    chrome.storage.local.get(
      ["gif_size", "gif_position", "gif_animation", "gif_duration", DISABLED_HOSTS, ENABLED_HOSTS, SITE_MODE, RANDOM_MODE, MULTI_GIF_MODE],
      (result) => {
        if (chrome.runtime.lastError) {
          showToast(ERROR_ALERT)
          return
        }

        if (!!result.gif_size) {
          document.getElementById("gif_size").value = result.gif_size
        } else {
          setGifSize(document.getElementById("gif_size").value)
        }

        if (!!result.gif_position) {
          document.getElementById("gif_position").value = result.gif_position
        } else {
          setGifPosition(document.getElementById("gif_position").value)
        }

        if (!!result.gif_animation) {
          document.getElementById("gif_animation").value = result.gif_animation
        } else {
          setGifAnimation(document.getElementById("gif_animation").value)
        }

        if (!!result.gif_duration) {
          document.getElementById("gif_duration").value = result.gif_duration
        } else {
          setGifDuration(document.getElementById("gif_duration").value)
        }

        const siteMode = result[SITE_MODE] || "blocklist"
        document.getElementById("site_mode_toggle").checked = siteMode === "allowlist"
        document.getElementById("site_toggle").checked = tabSupported && (siteMode === "allowlist"
          ? (result[ENABLED_HOSTS] || []).includes(currentHostname)
          : !(result[DISABLED_HOSTS] || []).includes(currentHostname))
        document.getElementById("random_mode_toggle").checked = !!result[RANDOM_MODE]
        document.getElementById("multi_gif_toggle").checked = !!result[MULTI_GIF_MODE]
        updateGifStatusBanner()
        renderManagedSites()
      })

    await displayCheckmark()
    await updateStorageUsage()
  }

  await renderGifs()
})

function updateEmptyState() {
  const hasItems = allGifs.length > 0
  document.getElementById("gif-empty-hint").hidden = hasItems

  const query = document.getElementById("gif_search").value.trim()
  const renderedCount = document.querySelectorAll("#gifContainer .gif-item").length
  document.getElementById("gif-search-empty-hint").hidden = !(hasItems && query.length > 0 && renderedCount === 0)

  const countEl = document.getElementById("gif-count")
  if (!hasItems) {
    countEl.hidden = true
  } else {
    countEl.textContent = query.length > 0
      ? `${renderedCount} of ${allGifs.length} match${renderedCount === 1 ? "" : "es"}`
      : `${allGifs.length} GIF${allGifs.length === 1 ? "" : "s"}`
    countEl.hidden = false
  }
}

function clearRenderedGifs() {
  document.querySelectorAll("#gifContainer .gif-item").forEach(item => item.remove())
}

// Searches the full library (allGifs), not just the GIFs currently paged into
// the DOM, so results aren't limited to the first GIF_PAGE_SIZE items.
function applyGifSearchFilter() {
  const rawQuery = document.getElementById("gif_search").value
  const query = rawQuery.trim().toLowerCase()
  document.getElementById("gif_search_clear").hidden = rawQuery.length === 0

  if (query.length === 0) {
    if (isSearchActive) {
      isSearchActive = false
      clearRenderedGifs()
      pendingGifs = [...allGifs]
      renderMoreGifs()
    }
    updateEmptyState()
    return
  }

  isSearchActive = true
  clearRenderedGifs()
  const matches = allGifs.filter(src => {
    const name = (gifNames[src] || "").toLowerCase()
    return src.toLowerCase().includes(query) || name.includes(query)
  })
  matches.forEach(src => addGifToDOM(src, gifNames[src]))
  // Loading more unfiltered GIFs while a search is active would be confusing —
  // all matches are already rendered above.
  document.getElementById("btn-load-more-gifs").hidden = true
  updateEmptyState()
}

document.getElementById("gif_search").addEventListener("input", applyGifSearchFilter)

const gifSearchClearBtn = document.getElementById("gif_search_clear")
function clearGifSearch() {
  const searchInput = document.getElementById("gif_search")
  searchInput.value = ""
  applyGifSearchFilter()
  searchInput.focus()
}

gifSearchClearBtn.addEventListener("click", clearGifSearch)
document.getElementById("btn-clear-search-empty").addEventListener("click", clearGifSearch)

// Explains why picking a GIF might not show up anywhere: the site is turned
// off, or Random mode is overriding manual picks. Both toggles live in the
// Settings tab, out of sight from here, so this surfaces the reason directly.
function updateGifStatusBanner() {
  const banner = document.getElementById("gif-status-banner")
  const text = document.getElementById("gif-status-banner-text")
  const action = document.getElementById("gif-status-banner-action")

  if (!tabSupported) {
    banner.hidden = true
    return
  }

  const siteOn = document.getElementById("site_toggle").checked
  const randomOn = document.getElementById("random_mode_toggle").checked

  if (!siteOn) {
    text.textContent = "Bubu Dudu is off for this site — your picks won't show here."
    action.textContent = "Turn on"
    action.onclick = () => {
      const toggle = document.getElementById("site_toggle")
      toggle.checked = true
      toggle.dispatchEvent(new Event("change"))
    }
    banner.hidden = false
  } else if (randomOn) {
    text.textContent = "Random mode is on — a random GIF shows instead of your pick."
    action.textContent = "Turn off"
    action.onclick = () => {
      const toggle = document.getElementById("random_mode_toggle")
      toggle.checked = false
      toggle.dispatchEvent(new Event("change"))
    }
    banner.hidden = false
  } else {
    banner.hidden = true
  }
}

// Lets the user see and undo the "Show on this site" toggle they flipped on
// other sites, since that list is otherwise invisible once you've left the
// page — especially confusing in allowlist mode, where flipping the mode on
// hides Bubu Dudu everywhere except the sites listed here.
async function renderManagedSites() {
  /* global chrome */
  const result = await chrome.storage.local.get([DISABLED_HOSTS, ENABLED_HOSTS, SITE_MODE])
  const siteMode = result[SITE_MODE] || "blocklist"
  const isAllowlist = siteMode === "allowlist"
  const hosts = (isAllowlist ? result[ENABLED_HOSTS] : result[DISABLED_HOSTS]) || []

  document.getElementById("managed-sites-label").textContent = `Managed sites (${hosts.length})`

  const listEl = document.getElementById("managed-sites-list")
  listEl.innerHTML = ""

  if (hosts.length === 0) {
    const empty = document.createElement("p")
    empty.className = "managed-sites-empty"
    empty.textContent = isAllowlist ? "No sites allowed yet." : "No sites turned off yet."
    listEl.appendChild(empty)
    return
  }

  hosts.slice().sort().forEach(host => {
    const row = document.createElement("div")
    row.className = "managed-site-row"

    const hostLabel = document.createElement("span")
    hostLabel.className = "managed-site-host"
    hostLabel.textContent = host
    hostLabel.title = host

    const removeBtn = document.createElement("button")
    removeBtn.type = "button"
    removeBtn.className = "managed-site-remove"
    removeBtn.textContent = "✕"
    removeBtn.setAttribute("aria-label", `Remove ${host} from managed sites`)
    removeBtn.addEventListener("click", async () => {
      if (isAllowlist) {
        await setSiteEnabled(host, false)
      } else {
        await setSiteDisabled(host, false)
      }
      if (host === currentHostname) {
        document.getElementById("site_toggle").checked = isAllowlist ? false : true
        updateGifStatusBanner()
      }
      await renderManagedSites()
    })

    row.appendChild(hostLabel)
    row.appendChild(removeBtn)
    listEl.appendChild(row)
  })
}

document.getElementById("managed-sites-toggle").addEventListener("click", async function () {
  const isOpen = this.getAttribute("aria-expanded") === "true"
  if (!isOpen) {
    await renderManagedSites()
  }
  this.setAttribute("aria-expanded", String(!isOpen))
  document.getElementById("managed-sites-list").hidden = isOpen
})

// Thumbnails in the grid are tiny (~65px) and many of the built-in GIFs look
// similar at that size — hovering a tile for a moment shows a bigger preview
// so you can actually tell them apart before picking one.
let hoverPreviewTimeoutId = null
const hoverPreviewEl = document.getElementById('gif-hover-preview')
const hoverPreviewImg = hoverPreviewEl.querySelector('img')

function hideHoverPreview() {
  clearTimeout(hoverPreviewTimeoutId)
  hoverPreviewEl.classList.remove('visible')
}

function attachHoverPreview(div, src) {
  div.addEventListener('mouseenter', () => {
    clearTimeout(hoverPreviewTimeoutId)
    hoverPreviewTimeoutId = setTimeout(() => {
      hoverPreviewImg.src = src
      const previewSize = 168
      const margin = 6
      const rect = div.getBoundingClientRect()

      let left = rect.right + margin
      if (left + previewSize > window.innerWidth) {
        left = rect.left - previewSize - margin
      }
      left = Math.max(margin, Math.min(left, window.innerWidth - previewSize - margin))

      let top = rect.top
      top = Math.max(margin, Math.min(top, window.innerHeight - previewSize - margin))

      hoverPreviewEl.style.left = `${left}px`
      hoverPreviewEl.style.top = `${top}px`
      hoverPreviewEl.classList.add('visible')
    }, 500)
  })
  div.addEventListener('mouseleave', hideHoverPreview)
}

document.getElementById('gifContainer').addEventListener('scroll', hideHoverPreview)

function addGifToDOM(src, name, prepend = false) {
  const gifContainer = document.getElementById("gifContainer")

  const div = document.createElement('div')
  div.className = 'gif-item'
  div.tabIndex = 0
  div.setAttribute('role', 'button')
  div.setAttribute('aria-pressed', 'false')
  div.setAttribute('aria-label', name ? `Select ${name}` : 'Select this GIF')
  if (name) {
    div.title = name
  }

  const img = document.createElement('img')
  img.src = src
  img.alt = name || 'GIF thumbnail'
  img.loading = 'lazy'
  img.decoding = 'async'
  attachHoverPreview(div, src)
  img.onerror = () => {
    div.classList.add('is-broken')
    div.title = "Couldn't load this GIF — click ✕ to remove it."
  }

  const deleteBtn = document.createElement('button')
  deleteBtn.type = 'button'
  deleteBtn.className = 'delete-icon'
  deleteBtn.textContent = '✕'
  deleteBtn.setAttribute('aria-label', 'Delete this GIF')
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    deleteGif(e, src)
  })

  const favoriteBtn = document.createElement('button')
  favoriteBtn.type = 'button'
  favoriteBtn.className = 'favorite-icon'
  if (favoriteGifs.includes(src)) {
    favoriteBtn.classList.add('is-favorite')
  }
  favoriteBtn.textContent = '★'
  favoriteBtn.setAttribute('aria-label', 'Pin this GIF to the top')
  favoriteBtn.setAttribute('aria-pressed', String(favoriteGifs.includes(src)))
  favoriteBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleFavorite(favoriteBtn, src)
  })

  div.appendChild(img)
  div.appendChild(deleteBtn)
  div.appendChild(favoriteBtn)

  const selectThisGif = async () => {
    if (document.getElementById("multi_gif_toggle").checked) {
      await toggleGifSelected(div, src)
      return
    }

    document.querySelectorAll(".gif-item").forEach(item => {
      item.classList.remove("selected")
      item.setAttribute('aria-pressed', 'false')
    })
    div.classList.add("selected")
    div.setAttribute('aria-pressed', 'true')
    await updateCheckmark(div, src)
  }

  div.addEventListener('click', selectThisGif)
  div.addEventListener('keydown', (e) => {
    // Ignore keydowns bubbling up from the delete/favorite buttons — they're
    // real <button>s now and handle their own Enter/Space activation.
    if (e.target !== div) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      selectThisGif()
    }
  })

  // Double-click a tile to rename it in place — the only other way to fix a
  // typo'd name was to delete the GIF and re-add it.
  div.addEventListener('dblclick', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (div.querySelector('.gif-rename-overlay')) return

    const overlay = document.createElement('div')
    overlay.className = 'gif-rename-overlay'
    overlay.addEventListener('click', (ev) => ev.stopPropagation())
    overlay.addEventListener('dblclick', (ev) => ev.stopPropagation())
    const input = document.createElement('input')
    input.type = 'text'
    input.maxLength = 60
    input.placeholder = 'Name this GIF'
    input.value = gifNames[src] || ''
    overlay.appendChild(input)
    div.appendChild(overlay)
    input.focus()
    input.select()

    let settled = false
    const commit = async () => {
      if (settled) return
      settled = true
      const newName = input.value.trim()
      overlay.remove()
      await saveGifName(src, newName)
      div.title = newName || ''
      div.setAttribute('aria-label', newName ? `Select ${newName}` : 'Select this GIF')
      img.alt = newName || 'GIF thumbnail'
    }
    const cancel = () => {
      settled = true
      overlay.remove()
    }

    input.addEventListener('click', (ev) => ev.stopPropagation())
    input.addEventListener('dblclick', (ev) => ev.stopPropagation())
    input.addEventListener('keydown', (ev) => {
      ev.stopPropagation()
      if (ev.key === 'Enter') {
        ev.preventDefault()
        commit()
      } else if (ev.key === 'Escape') {
        ev.preventDefault()
        cancel()
      }
    })
    input.addEventListener('blur', commit)
  })

  if (prepend) {
    gifContainer.insertBefore(div, gifContainer.firstChild)
  } else {
    gifContainer.insertBefore(div, document.getElementById("btn-load-more-gifs"))
  }

  updateEmptyState()
}

let undoTimeoutId = null
let undoClickHandler = null

// Gives a few seconds to restore an accidentally-deleted GIF before the undo
// option disappears. The deletion itself already happened in storage — this
// just re-inserts everything (list entry, name, favorite status) if clicked.
function showUndoDelete(src, name, wasFavorite, index) {
  const undoAlert = document.getElementById("undo-alert")
  const undoBtn = document.getElementById("undo-alert-btn")
  const undoMessage = document.getElementById("undo-alert-message")

  clearTimeout(undoTimeoutId)
  // Deleting a second GIF before the first undo expires must drop the first
  // GIF's still-pending "click" listener — otherwise both restore on one click.
  if (undoClickHandler) {
    undoBtn.removeEventListener("click", undoClickHandler)
    undoClickHandler = null
  }
  undoMessage.textContent = name ? `"${name}" deleted.` : "GIF deleted."
  undoAlert.removeAttribute("hidden")

  const cleanup = () => {
    clearTimeout(undoTimeoutId)
    undoAlert.setAttribute("hidden", "hidden")
    undoBtn.removeEventListener("click", onUndo)
    undoClickHandler = null
  }

  const onUndo = async () => {
    /* global chrome */
    cleanup()
    const result = await chrome.storage.local.get([LIST_GIFS])
    const gifs = result[LIST_GIFS] || []
    if (!gifs.includes(src)) {
      const insertAt = index >= 0 && index <= gifs.length ? index : gifs.length
      gifs.splice(insertAt, 0, src)
      await chrome.storage.local.set({ [LIST_GIFS]: gifs })
    }
    if (!allGifs.includes(src)) {
      const allGifsInsertAt = index >= 0 && index <= allGifs.length ? index : allGifs.length
      allGifs.splice(allGifsInsertAt, 0, src)
    }
    if (name) {
      gifNames[src] = name
      await chrome.storage.local.set({ [GIF_NAMES]: gifNames })
    }
    if (wasFavorite) {
      favoriteGifs = Array.from(new Set([...favoriteGifs, src]))
      await chrome.storage.local.set({ [FAVORITE_GIFS]: favoriteGifs })
    }
    addGifToDOM(src, name, true)
    updateStorageUsage()
  }

  undoClickHandler = onUndo
  undoBtn.addEventListener("click", onUndo, { once: true })
  undoTimeoutId = setTimeout(cleanup, 5000)
}

document.getElementById("gif_size").onchange = async function (event) {
  const value = Number(event.target.value)
  if (!Number.isFinite(value) || value < GIF_SIZE_MIN || value > GIF_SIZE_MAX) {
    showToast(ERROR_ALERT, `Size must be between ${GIF_SIZE_MIN} and ${GIF_SIZE_MAX}px.`)
    event.target.value = GIF_SIZE_DEFAULT
    await setGifSize(GIF_SIZE_DEFAULT)
    return
  }
  await setGifSize(value)
}

document.getElementById("gif_position").onchange = async function (event) {
  await setGifPosition(event.target.value)
}

document.getElementById("gif_animation").onchange = async function (event) {
  await setGifAnimation(event.target.value)
}

document.getElementById("gif_duration").onchange = async function (event) {
  const value = Number(event.target.value)
  if (!Number.isFinite(value) || value < GIF_DURATION_MIN || value > GIF_DURATION_MAX) {
    showToast(ERROR_ALERT, `Duration must be between ${GIF_DURATION_MIN} and ${GIF_DURATION_MAX}s.`)
    event.target.value = GIF_DURATION_DEFAULT
    await setGifDuration(GIF_DURATION_DEFAULT)
    return
  }
  await setGifDuration(value)
}

document.getElementById("site_toggle").onchange = async function (event) {
  /* global chrome */
  if (!currentHostname) return
  const result = await chrome.storage.local.get([SITE_MODE])
  if ((result[SITE_MODE] || "blocklist") === "allowlist") {
    await setSiteEnabled(currentHostname, event.target.checked)
  } else {
    await setSiteDisabled(currentHostname, !event.target.checked)
  }
  updateGifStatusBanner()
  renderManagedSites()
}

document.getElementById("site_mode_toggle").onchange = async function (event) {
  /* global chrome */
  const newMode = event.target.checked ? "allowlist" : "blocklist"
  await chrome.storage.local.set({ [SITE_MODE]: newMode })

  // The "Show on this site" switch means something different in each mode —
  // refresh it against the new mode's own host list.
  const result = await chrome.storage.local.get([DISABLED_HOSTS, ENABLED_HOSTS])
  const siteToggle = document.getElementById("site_toggle")
  siteToggle.checked = tabSupported && (newMode === "allowlist"
    ? (result[ENABLED_HOSTS] || []).includes(currentHostname)
    : !(result[DISABLED_HOSTS] || []).includes(currentHostname))

  await notifyActiveTab({ from: POPUP_SCREEN, subject: HANDLE_SET_DISABLED_HOSTS })
  updateGifStatusBanner()
  renderManagedSites()
}

document.getElementById("random_mode_toggle").onchange = async function (event) {
  await setRandomMode(event.target.checked)
  updateGifStatusBanner()
}

document.getElementById("multi_gif_toggle").onchange = async function (event) {
  /* global chrome */
  await chrome.storage.local.set({ [MULTI_GIF_MODE]: event.target.checked })
}

async function saveGifName(src, name) {
  /* global chrome */
  gifNames[src] = name
  await chrome.storage.local.set({ [GIF_NAMES]: gifNames })
}

const addGifBtn = document.getElementById("btn-add-gif")
const gifUrlInput = document.getElementById("gif_url")

gifUrlInput.addEventListener("input", function () {
  addGifBtn.disabled = gifUrlInput.value.trim().length === 0
})

gifUrlInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !addGifBtn.disabled) {
    event.preventDefault()
    addGifBtn.click()
  }
})

addGifBtn.addEventListener("click", async function () {
  /* global chrome */
  const urlInput = document.getElementById("gif_url")
  const url = urlInput.value.trim()

  if (!url) {
    showToast(ERROR_ALERT, "Please enter a GIF URL.")
    return
  }

  if (!(await isGifUrl(url))) {
    showToast(ERROR_ALERT, "That doesn't look like a GIF. Please check the URL.")
    return
  }

  const result = await chrome.storage.local.get([LIST_GIFS])
  const gifs_storage = result[LIST_GIFS] || []
  if (gifs_storage.includes(url)) {
    showToast(ERROR_ALERT, "This GIF is already in your list.")
    return
  }

  const testImg = new Image()
  testImg.onload = async () => {
    gifs_storage.push(url)
    try {
      await chrome.storage.local.set({ [LIST_GIFS]: gifs_storage })
    } catch (e) {
      showToast(ERROR_ALERT, "Couldn't save — storage is full. Try removing some GIFs first.")
      return
    }
    allGifs.push(url)
    const nameInput = document.getElementById("gif_name")
    const name = nameInput.value.trim()
    if (name) {
      await saveGifName(url, name)
    }
    addGifToDOM(url, name || undefined)
    applyGifSearchFilter()
    updateStorageUsage()
    urlInput.value = ""
    nameInput.value = ""
    addGifBtn.disabled = true
    closeAddGifPanel()
    showToast(SUCCESS_ALERT)
  }
  testImg.onerror = () => {
    showToast(ERROR_ALERT, "Couldn't load that GIF. Check the URL and try again.")
  }
  testImg.src = url
})

const fileInput = document.getElementById('gif_file');
fileInput.addEventListener('change', async function () {
  /* global chrome */
  const file = fileInput.files[0];
  if (!file) return

  if (file.type !== "image/gif") {
    showToast(ERROR_ALERT, "Please choose a .gif file.")
    fileInput.value = ""
    return
  }

  if (file.size > MAX_GIF_FILE_SIZE_BYTES) {
    showToast(ERROR_ALERT, `GIF is too large (max ${Math.round(MAX_GIF_FILE_SIZE_BYTES / (1024 * 1024))}MB). Please choose a smaller file.`)
    fileInput.value = ""
    return
  }

  const reader = new FileReader();

  reader.onload = async function (e) {
    const dataUrl = e.target.result; // base64 string
    const result = await chrome.storage.local.get([LIST_GIFS])
    const gifs_storage = result[LIST_GIFS] || [];

    if (gifs_storage.includes(dataUrl)) {
      showToast(ERROR_ALERT, "This GIF is already in your list.")
      fileInput.value = ""
      return
    }

    gifs_storage.push(dataUrl);
    try {
      await chrome.storage.local.set({ [LIST_GIFS]: gifs_storage });
    } catch (e) {
      showToast(ERROR_ALERT, "Couldn't save — storage is full. Try removing some GIFs first.")
      fileInput.value = ""
      return
    }
    allGifs.push(dataUrl)

    const nameInput = document.getElementById("gif_name")
    const name = nameInput.value.trim()
    if (name) {
      await saveGifName(dataUrl, name)
    }
    addGifToDOM(dataUrl, name || undefined);
    applyGifSearchFilter()
    updateStorageUsage()
    fileInput.value = ""
    nameInput.value = ""
    closeAddGifPanel()
    showToast(SUCCESS_ALERT);
  };

  reader.readAsDataURL(file);
});

const addGifDropzone = document.getElementById("add-gif-dropzone")
;["dragenter", "dragover"].forEach(eventName => {
  addGifDropzone.addEventListener(eventName, function (event) {
    event.preventDefault()
    addGifDropzone.classList.add("is-dragover")
  })
})
;["dragleave", "drop"].forEach(eventName => {
  addGifDropzone.addEventListener(eventName, function (event) {
    event.preventDefault()
    addGifDropzone.classList.remove("is-dragover")
  })
})
addGifDropzone.addEventListener("drop", function (event) {
  const file = event.dataTransfer.files[0]
  if (!file) return
  const dataTransfer = new DataTransfer()
  dataTransfer.items.add(file)
  fileInput.files = dataTransfer.files
  fileInput.dispatchEvent(new Event("change"))
})

document.getElementById("btn-export-gifs").addEventListener("click", async function () {
  /* global chrome */
  const result = await chrome.storage.local.get([
    LIST_GIFS, "gif_size", "gif_position", "gif_animation", "gif_duration", RANDOM_MODE, GIF_NAMES, FAVORITE_GIFS, PRESETS
  ])
  const payload = {
    gifs: result[LIST_GIFS] || [],
    names: result[GIF_NAMES] || {},
    favorites: result[FAVORITE_GIFS] || [],
    presets: result[PRESETS] || [],
    settings: {
      gif_size: result.gif_size,
      gif_position: result.gif_position,
      gif_animation: result.gif_animation,
      gif_duration: result.gif_duration,
      [RANDOM_MODE]: result[RANDOM_MODE]
    }
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `bubu-dudu-gifs-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  // Revoking immediately after click() can race the download starting,
  // especially if the popup closes right after — give it a moment first.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})

const importFileInput = document.getElementById("import_file")
document.getElementById("btn-import-gifs").addEventListener("click", function () {
  importFileInput.click()
})

importFileInput.addEventListener("change", async function () {
  /* global chrome */
  const file = importFileInput.files[0]
  if (!file) return

  try {
    const parsed = JSON.parse(await file.text())
    const imported = Array.isArray(parsed) ? parsed : parsed.gifs
    if (!Array.isArray(imported) || !imported.every(item => typeof item === "string")) {
      throw new Error("invalid-format")
    }

    const result = await chrome.storage.local.get([LIST_GIFS, GIF_NAMES, FAVORITE_GIFS, PRESETS])
    const current = result[LIST_GIFS] || []
    const merged = Array.from(new Set([...current, ...imported]))
    const newOnes = merged.filter(src => !current.includes(src))

    await chrome.storage.local.set({ [LIST_GIFS]: merged })

    if (!Array.isArray(parsed) && parsed.names && typeof parsed.names === "object") {
      gifNames = { ...result[GIF_NAMES], ...parsed.names }
      await chrome.storage.local.set({ [GIF_NAMES]: gifNames })
    }

    if (!Array.isArray(parsed) && Array.isArray(parsed.favorites)) {
      favoriteGifs = Array.from(new Set([
        ...(result[FAVORITE_GIFS] || []),
        ...parsed.favorites.filter(src => merged.includes(src))
      ]))
      await chrome.storage.local.set({ [FAVORITE_GIFS]: favoriteGifs })
    }

    if (!Array.isArray(parsed) && Array.isArray(parsed.presets)) {
      const currentPresets = result[PRESETS] || []
      const existingNames = new Set(currentPresets.map(p => p.name))
      const newPresets = parsed.presets.filter(p => p && typeof p.name === "string" && !existingNames.has(p.name))
      if (newPresets.length > 0) {
        await chrome.storage.local.set({ [PRESETS]: [...currentPresets, ...newPresets] })
        await renderPresetOptions()
      }
    }

    allGifs.push(...newOnes)
    newOnes.forEach(src => addGifToDOM(src, gifNames[src]))
    applyGifSearchFilter()
    updateStorageUsage()

    if (!Array.isArray(parsed) && parsed.settings && typeof parsed.settings === "object") {
      await applyImportedSettings(parsed.settings)
    }

    showToast(SUCCESS_ALERT, `Imported ${newOnes.length} new GIF${newOnes.length === 1 ? "" : "s"}.`)
  } catch (e) {
    showToast(ERROR_ALERT, "Couldn't import that file — make sure it's a GIF list exported from this extension.")
  } finally {
    importFileInput.value = ""
  }
})

async function applyImportedSettings(settings) {
  /* global chrome */
  const toApply = {}
  if (settings.gif_size) toApply.gif_size = settings.gif_size
  if (settings.gif_position) toApply.gif_position = settings.gif_position
  if (settings.gif_animation) toApply.gif_animation = settings.gif_animation
  if (settings.gif_duration) toApply.gif_duration = settings.gif_duration
  if (typeof settings[RANDOM_MODE] === "boolean") toApply[RANDOM_MODE] = settings[RANDOM_MODE]

  if (Object.keys(toApply).length === 0) {
    return
  }

  await chrome.storage.local.set(toApply)

  if (toApply.gif_size) document.getElementById("gif_size").value = toApply.gif_size
  if (toApply.gif_position) document.getElementById("gif_position").value = toApply.gif_position
  if (toApply.gif_animation) document.getElementById("gif_animation").value = toApply.gif_animation
  if (toApply.gif_duration) document.getElementById("gif_duration").value = toApply.gif_duration
  if (typeof toApply[RANDOM_MODE] === "boolean") document.getElementById("random_mode_toggle").checked = toApply[RANDOM_MODE]

  try {
    await sendToActiveTab({ from: POPUP_SCREEN, subject: HANDLE_SETTINGS_IMPORTED })
  } catch (e) {
    // Active tab may not support content scripts (e.g. chrome:// pages) — nothing to do.
  }
}

// Native confirm()/prompt() dialogs are unreliable inside an extension popup
// (some Chrome versions block them outright, or the dialog steals focus and
// the popup closes, losing the action) — so reset and preset naming use
// inline UI instead.
const resetConfirmEl = document.getElementById("reset-confirm")
let resetConfirmTimeoutId = null

function hideResetConfirm() {
  clearTimeout(resetConfirmTimeoutId)
  resetConfirmEl.setAttribute("hidden", "hidden")
}

document.getElementById("btn-reset-gifs").addEventListener("click", function () {
  resetConfirmEl.removeAttribute("hidden")
  clearTimeout(resetConfirmTimeoutId)
  resetConfirmTimeoutId = setTimeout(hideResetConfirm, 8000)
})

document.getElementById("btn-reset-cancel").addEventListener("click", hideResetConfirm)

document.getElementById("btn-reset-confirm").addEventListener("click", async function () {
  /* global chrome */
  hideResetConfirm()

  await chrome.storage.local.set({ [LIST_GIFS]: LIST_GIFS_DEFAULT })

  gifNames = {}
  favoriteGifs = favoriteGifs.filter(src => LIST_GIFS_DEFAULT.includes(src))
  await chrome.storage.local.set({ [GIF_NAMES]: gifNames, [FAVORITE_GIFS]: favoriteGifs })

  document.getElementById("gifContainer").querySelectorAll(".gif-item").forEach(el => el.remove())
  pendingGifs = []
  allGifs = [...LIST_GIFS_DEFAULT]
  isSearchActive = false
  document.getElementById("gif_search").value = ""
  document.getElementById("gif_search_clear").hidden = true
  document.getElementById("btn-load-more-gifs").hidden = true
  LIST_GIFS_DEFAULT.forEach(src => addGifToDOM(src))
  await clearSelectedGifIfMissing(LIST_GIFS_DEFAULT)
  await displayCheckmark()
  await updateStorageUsage()
  showToast(SUCCESS_ALERT, "Restored the default GIF collection.")
})

async function renderPresetOptions() {
  /* global chrome */
  const result = await chrome.storage.local.get([PRESETS])
  const presets = result[PRESETS] || []
  const select = document.getElementById("preset_select")
  select.innerHTML = '<option value="" selected disabled>Load preset…</option>'
  presets.forEach((preset, index) => {
    const option = document.createElement("option")
    option.value = String(index)
    option.textContent = preset.name
    select.appendChild(option)
  })
  document.getElementById("btn-delete-preset").hidden = true
}

document.getElementById("preset_select").addEventListener("change", async function (event) {
  /* global chrome */
  const index = Number(event.target.value)
  const result = await chrome.storage.local.get([PRESETS])
  const preset = (result[PRESETS] || [])[index]
  if (!preset) return

  document.getElementById("gif_size").value = preset.gif_size
  document.getElementById("gif_position").value = preset.gif_position
  document.getElementById("gif_animation").value = preset.gif_animation
  document.getElementById("gif_duration").value = preset.gif_duration

  await setGifSize(preset.gif_size)
  await setGifPosition(preset.gif_position)
  await setGifAnimation(preset.gif_animation)
  await setGifDuration(preset.gif_duration)

  document.getElementById("btn-delete-preset").hidden = false
})

const presetControlsEl = document.getElementById("preset-controls")
const presetSaveRowEl = document.getElementById("preset-save-row")
const presetNameInput = document.getElementById("preset_name_input")

function openPresetNameRow() {
  presetControlsEl.setAttribute("hidden", "hidden")
  presetSaveRowEl.removeAttribute("hidden")
  presetNameInput.value = ""
  presetNameInput.focus()
}

function closePresetNameRow() {
  presetSaveRowEl.setAttribute("hidden", "hidden")
  presetControlsEl.removeAttribute("hidden")
}

document.getElementById("btn-save-preset").addEventListener("click", openPresetNameRow)
document.getElementById("btn-preset-save-cancel").addEventListener("click", closePresetNameRow)

presetNameInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault()
    event.stopPropagation()
    document.getElementById("btn-preset-save-confirm").click()
  } else if (event.key === "Escape") {
    event.preventDefault()
    event.stopPropagation()
    closePresetNameRow()
  }
})

document.getElementById("btn-preset-save-confirm").addEventListener("click", async function () {
  /* global chrome */
  const name = presetNameInput.value.trim()
  if (!name) {
    showToast(ERROR_ALERT, "Please enter a preset name.")
    presetNameInput.focus()
    return
  }

  const preset = {
    name,
    gif_size: document.getElementById("gif_size").value,
    gif_position: document.getElementById("gif_position").value,
    gif_animation: document.getElementById("gif_animation").value,
    gif_duration: document.getElementById("gif_duration").value
  }

  const result = await chrome.storage.local.get([PRESETS])
  const presets = result[PRESETS] || []
  const existingIndex = presets.findIndex(p => p.name === preset.name)
  if (existingIndex >= 0) {
    presets[existingIndex] = preset
  } else {
    presets.push(preset)
  }

  await chrome.storage.local.set({ [PRESETS]: presets })
  await renderPresetOptions()
  closePresetNameRow()
  showToast(SUCCESS_ALERT, `Saved preset "${preset.name}".`)
})

document.getElementById("btn-delete-preset").addEventListener("click", async function () {
  /* global chrome */
  const select = document.getElementById("preset_select")
  const index = Number(select.value)
  if (Number.isNaN(index)) return

  const result = await chrome.storage.local.get([PRESETS])
  const presets = result[PRESETS] || []
  presets.splice(index, 1)
  await chrome.storage.local.set({ [PRESETS]: presets })
  await renderPresetOptions()
})

const tabBtnGifs = document.getElementById('tab-btn-gifs');
const tabBtnSettings = document.getElementById('tab-btn-settings');
const tabPanelGifs = document.getElementById('tab-panel-gifs');
const tabPanelSettings = document.getElementById('tab-panel-settings');

function activateTab(name, focusTab = false) {
  const isGifs = name === 'gifs'
  tabBtnGifs.classList.toggle('active', isGifs)
  tabBtnSettings.classList.toggle('active', !isGifs)
  tabBtnGifs.setAttribute('aria-selected', String(isGifs))
  tabBtnSettings.setAttribute('aria-selected', String(!isGifs))
  tabBtnGifs.tabIndex = isGifs ? 0 : -1
  tabBtnSettings.tabIndex = isGifs ? -1 : 0
  tabPanelGifs.hidden = !isGifs
  tabPanelSettings.hidden = isGifs
  if (focusTab) {
    (isGifs ? tabBtnGifs : tabBtnSettings).focus()
  }
  /* global chrome */
  chrome.storage.local.set({ [LAST_ACTIVE_TAB]: name })
}

tabBtnGifs.addEventListener('click', () => activateTab('gifs'))
tabBtnSettings.addEventListener('click', () => activateTab('settings'))

// Standard ARIA tabs keyboard pattern: Left/Right (or Up/Down) moves focus
// and activates the other tab (there are only two); Home/End jump to the
// first/last tab.
document.querySelector('.tabs').addEventListener('keydown', (e) => {
  const isGifsFocused = document.activeElement === tabBtnGifs
  if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
    e.preventDefault()
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    activateTab(isGifsFocused ? 'settings' : 'gifs', true)
  } else if (e.key === 'Home') {
    activateTab('gifs', true)
  } else if (e.key === 'End') {
    activateTab('settings', true)
  }
})

const toggleAddGifBtn = document.getElementById('toggle-add-gif');
const addGifPanel = document.getElementById('add-gif-panel');

function closeAddGifPanel() {
  addGifPanel.setAttribute('hidden', 'hidden')
  toggleAddGifBtn.classList.remove('is-open')
  toggleAddGifBtn.setAttribute('aria-expanded', 'false')
  toggleAddGifBtn.setAttribute('aria-label', 'Add a GIF')
}

function openAddGifPanel() {
  addGifPanel.removeAttribute('hidden')
  toggleAddGifBtn.classList.add('is-open')
  toggleAddGifBtn.setAttribute('aria-expanded', 'true')
  toggleAddGifBtn.setAttribute('aria-label', 'Close the add GIF panel')
  document.getElementById('gif_url').focus()
}

toggleAddGifBtn.addEventListener('click', function () {
  const isOpen = !addGifPanel.hasAttribute('hidden');
  if (isOpen) {
    closeAddGifPanel()
  } else {
    openAddGifPanel()
  }
});

const shortcutHintEl = document.getElementById('shortcut-hint')
if (shortcutHintEl) {
  const isMac = /Mac/i.test(navigator.platform || navigator.userAgent)
  shortcutHintEl.textContent = isMac ? '⌘⇧U' : 'Ctrl+Shift+U'
}

// Popup-wide shortcuts: "/" or Ctrl/Cmd+F jumps to search; Escape backs out
// one step at a time (clear search, then close the Add GIF panel) instead of
// immediately closing the whole popup.
document.addEventListener('keydown', function (e) {
  const activeTag = (document.activeElement && document.activeElement.tagName) || ''
  const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT'

  if (e.key === '/' && !isTyping) {
    e.preventDefault()
    document.getElementById('gif_search').focus()
    return
  }

  if ((e.key === 'f' || e.key === 'F') && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    document.getElementById('gif_search').focus()
    return
  }

  if (e.key === 'Escape') {
    const searchInput = document.getElementById('gif_search')
    if (searchInput.value.length > 0) {
      e.preventDefault()
      searchInput.value = ''
      applyGifSearchFilter()
      return
    }
    if (!addGifPanel.hasAttribute('hidden')) {
      e.preventDefault()
      closeAddGifPanel()
    }
  }
})
