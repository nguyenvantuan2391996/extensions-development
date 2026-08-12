let currentHostname = null
const GIF_PAGE_SIZE = 48
let pendingGifs = []

function renderMoreGifs() {
  const nextBatch = pendingGifs.splice(0, GIF_PAGE_SIZE)
  nextBatch.forEach(src => addGifToDOM(src))
  document.getElementById("btn-load-more-gifs").hidden = pendingGifs.length === 0
}

document.getElementById("btn-load-more-gifs").addEventListener("click", renderMoreGifs)

document.addEventListener("DOMContentLoaded",  async function () {
  /* global chrome */
  const initState = await chrome.storage.local.get([IS_INIT])
  const isFirstRun = !initState[IS_INIT]

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabSupported = isSupportedTabUrl(activeTab?.url)
  if (tabSupported) {
    currentHostname = new URL(activeTab.url).hostname
  } else {
    document.getElementById("page-banner").removeAttribute("hidden")
    document.getElementById("site_toggle").disabled = true
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
            files: ["js/content.js", "js/constants.js", "js/utils.js"]
          })
        } catch (e2) {
          // Injection can fail on restricted pages (chrome://, the Web Store, etc.) — nothing to do.
        }
      }
    }
  }

  const listState = await chrome.storage.local.get([LIST_GIFS])
  let gifs = LIST_GIFS_DEFAULT
  if (listState[LIST_GIFS] && listState[LIST_GIFS].length > 0) {
    gifs = listState[LIST_GIFS]
  } else {
    await chrome.storage.local.set({ [LIST_GIFS]: LIST_GIFS_DEFAULT })
  }

  async function renderGifs() {
    pendingGifs = [...gifs]
    renderMoreGifs()
    if (isFirstRun) {
      await chrome.storage.local.set({ [IS_INIT]: true })
      return
    }

    chrome.storage.local.get(
      ["gif_size", "gif_position", "gif_animation", "gif_duration", DISABLED_HOSTS, RANDOM_MODE, MULTI_GIF_MODE],
      (result) => {
        if (chrome.runtime.lastError) {
          alert(ERROR_ALERT)
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

        const disabledHosts = result[DISABLED_HOSTS] || []
        document.getElementById("site_toggle").checked = tabSupported && !disabledHosts.includes(currentHostname)
        document.getElementById("random_mode_toggle").checked = !!result[RANDOM_MODE]
        document.getElementById("multi_gif_toggle").checked = !!result[MULTI_GIF_MODE]
      })

    await displayCheckmark()
  }

  await renderGifs()
})

function updateEmptyState() {
  const items = Array.from(document.querySelectorAll("#gifContainer .gif-item"))
  const hasItems = items.length > 0
  document.getElementById("gif-empty-hint").hidden = hasItems

  const query = document.getElementById("gif_search").value.trim()
  const visibleCount = items.filter(item => !item.hidden).length
  document.getElementById("gif-search-empty-hint").hidden = !(hasItems && query.length > 0 && visibleCount === 0)
}

function applyGifSearchFilter() {
  const query = document.getElementById("gif_search").value.trim().toLowerCase()
  document.querySelectorAll("#gifContainer .gif-item").forEach(item => {
    const src = item.querySelector("img").src.toLowerCase()
    item.hidden = query.length > 0 && !src.includes(query)
  })
  // Loading more unfiltered GIFs while a search is active would be confusing.
  document.getElementById("btn-load-more-gifs").hidden = query.length > 0 || pendingGifs.length === 0
  updateEmptyState()
}

document.getElementById("gif_search").addEventListener("input", applyGifSearchFilter)

function addGifToDOM(src, prepend = false) {
  const gifContainer = document.getElementById("gifContainer")

  const div = document.createElement('div')
  div.className = 'gif-item'
  div.tabIndex = 0
  div.setAttribute('role', 'button')
  div.setAttribute('aria-pressed', 'false')
  div.setAttribute('aria-label', 'Select this GIF')

  const img = document.createElement('img')
  img.src = src
  img.alt = 'GIF thumbnail'

  const deleteBtn = document.createElement('div')
  deleteBtn.className = 'delete-icon'
  deleteBtn.textContent = '✕'
  deleteBtn.setAttribute('role', 'button')
  deleteBtn.setAttribute('aria-label', 'Delete this GIF')
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    deleteGif(e, src)
  })

  div.appendChild(img)
  div.appendChild(deleteBtn)

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
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      selectThisGif()
    }
  })

  if (prepend) {
    gifContainer.insertBefore(div, gifContainer.firstChild)
  } else {
    gifContainer.insertBefore(div, document.getElementById("btn-load-more-gifs"))
  }

  updateEmptyState()
}

document.getElementById("gif_size").onchange = async function (event) {
  const value = Number(event.target.value)
  if (!Number.isFinite(value) || value < GIF_SIZE_MIN || value > GIF_SIZE_MAX) {
    alert(ERROR_ALERT, `Size must be between ${GIF_SIZE_MIN} and ${GIF_SIZE_MAX}px.`)
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
    alert(ERROR_ALERT, `Duration must be between ${GIF_DURATION_MIN} and ${GIF_DURATION_MAX}s.`)
    event.target.value = GIF_DURATION_DEFAULT
    await setGifDuration(GIF_DURATION_DEFAULT)
    return
  }
  await setGifDuration(value)
}

document.getElementById("site_toggle").onchange = async function (event) {
  if (!currentHostname) return
  await setSiteDisabled(currentHostname, !event.target.checked)
}

document.getElementById("random_mode_toggle").onchange = async function (event) {
  await setRandomMode(event.target.checked)
}

document.getElementById("multi_gif_toggle").onchange = async function (event) {
  /* global chrome */
  await chrome.storage.local.set({ [MULTI_GIF_MODE]: event.target.checked })
}

document.getElementById("btn-add-gif").addEventListener("click", async function () {
  /* global chrome */
  const urlInput = document.getElementById("gif_url")
  const url = urlInput.value.trim()

  if (!url) {
    alert(ERROR_ALERT, "Please enter a GIF URL.")
    return
  }

  if (!(await isGifUrl(url))) {
    alert(ERROR_ALERT, "That doesn't look like a GIF. Please check the URL.")
    return
  }

  const result = await chrome.storage.local.get([LIST_GIFS])
  const gifs_storage = result[LIST_GIFS] || []
  if (gifs_storage.includes(url)) {
    alert(ERROR_ALERT, "This GIF is already in your list.")
    return
  }

  const testImg = new Image()
  testImg.onload = async () => {
    gifs_storage.push(url)
    try {
      await chrome.storage.local.set({ [LIST_GIFS]: gifs_storage })
    } catch (e) {
      alert(ERROR_ALERT, "Couldn't save — storage is full. Try removing some GIFs first.")
      return
    }
    addGifToDOM(url)
    urlInput.value = ""
    closeAddGifPanel()
    alert(SUCCESS_ALERT)
  }
  testImg.onerror = () => {
    alert(ERROR_ALERT, "Couldn't load that GIF. Check the URL and try again.")
  }
  testImg.src = url
})

const fileInput = document.getElementById('gif_file');
fileInput.addEventListener('change', async function () {
  /* global chrome */
  const file = fileInput.files[0];
  if (!file) return

  if (file.type !== "image/gif") {
    alert(ERROR_ALERT, "Please choose a .gif file.")
    fileInput.value = ""
    return
  }

  if (file.size > MAX_GIF_FILE_SIZE_BYTES) {
    alert(ERROR_ALERT, `GIF is too large (max ${Math.round(MAX_GIF_FILE_SIZE_BYTES / (1024 * 1024))}MB). Please choose a smaller file.`)
    fileInput.value = ""
    return
  }

  const reader = new FileReader();

  reader.onload = async function (e) {
    const dataUrl = e.target.result; // base64 string
    const result = await chrome.storage.local.get([LIST_GIFS])
    const gifs_storage = result[LIST_GIFS] || [];

    if (gifs_storage.includes(dataUrl)) {
      alert(ERROR_ALERT, "This GIF is already in your list.")
      fileInput.value = ""
      return
    }

    gifs_storage.push(dataUrl);
    try {
      await chrome.storage.local.set({ [LIST_GIFS]: gifs_storage });
    } catch (e) {
      alert(ERROR_ALERT, "Couldn't save — storage is full. Try removing some GIFs first.")
      fileInput.value = ""
      return
    }

    addGifToDOM(dataUrl);
    fileInput.value = ""
    closeAddGifPanel()
    alert(SUCCESS_ALERT);
  };

  reader.readAsDataURL(file);
});

document.getElementById("btn-export-gifs").addEventListener("click", async function () {
  /* global chrome */
  const result = await chrome.storage.local.get([
    LIST_GIFS, "gif_size", "gif_position", "gif_animation", "gif_duration", RANDOM_MODE
  ])
  const payload = {
    gifs: result[LIST_GIFS] || [],
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
  a.download = "bubu-dudu-gifs.json"
  a.click()
  URL.revokeObjectURL(url)
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

    const result = await chrome.storage.local.get([LIST_GIFS])
    const current = result[LIST_GIFS] || []
    const merged = Array.from(new Set([...current, ...imported]))
    const newOnes = merged.filter(src => !current.includes(src))

    await chrome.storage.local.set({ [LIST_GIFS]: merged })
    newOnes.forEach(src => addGifToDOM(src))

    if (!Array.isArray(parsed) && parsed.settings && typeof parsed.settings === "object") {
      await applyImportedSettings(parsed.settings)
    }

    alert(SUCCESS_ALERT, `Imported ${newOnes.length} new GIF${newOnes.length === 1 ? "" : "s"}.`)
  } catch (e) {
    alert(ERROR_ALERT, "Couldn't import that file — make sure it's a GIF list exported from this extension.")
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

document.getElementById("btn-reset-gifs").addEventListener("click", async function () {
  /* global chrome */
  if (!window.confirm("Replace your current GIF list with the default Bubu Dudu collection? This can't be undone.")) {
    return
  }

  await chrome.storage.local.set({ [LIST_GIFS]: LIST_GIFS_DEFAULT })
  document.getElementById("gifContainer").querySelectorAll(".gif-item").forEach(el => el.remove())
  LIST_GIFS_DEFAULT.forEach(src => addGifToDOM(src))
  await clearSelectedGifIfMissing(LIST_GIFS_DEFAULT)
  await displayCheckmark()
  alert(SUCCESS_ALERT, "Restored the default GIF collection.")
})

const toggleAddGifBtn = document.getElementById('toggle-add-gif');
const addGifPanel = document.getElementById('add-gif-panel');

function closeAddGifPanel() {
  addGifPanel.setAttribute('hidden', 'hidden')
  toggleAddGifBtn.textContent = '+ Add GIF'
  toggleAddGifBtn.classList.remove('is-open')
  toggleAddGifBtn.setAttribute('aria-expanded', 'false')
}

function openAddGifPanel() {
  addGifPanel.removeAttribute('hidden')
  toggleAddGifBtn.textContent = 'Close'
  toggleAddGifBtn.classList.add('is-open')
  toggleAddGifBtn.setAttribute('aria-expanded', 'true')
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
