document.addEventListener("DOMContentLoaded",  async function () {
  /* global chrome */
  const initState = await chrome.storage.local.get([IS_INIT])
  const isFirstRun = !initState[IS_INIT]

  if (isFirstRun) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.id) {
      chrome.tabs.reload(tab.id)
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
    gifs.forEach(src => addGifToDOM(src))
    if (isFirstRun) {
      await chrome.storage.local.set({ [IS_INIT]: true })
      return
    }

    chrome.storage.local.get(["gif_size", "gif_position", "gif_animation", "gif_duration"], (result) => {
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
    })

    await displayCheckmark()
  }

  await renderGifs()
})

function updateEmptyState() {
  const emptyHint = document.getElementById("gif-empty-hint")
  const hasItems = document.querySelectorAll("#gifContainer .gif-item").length > 0
  emptyHint.hidden = hasItems
}

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
    gifContainer.appendChild(div)
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

document.getElementById("btn-add-gif").addEventListener("click", async function () {
  /* global chrome */
  const urlInput = document.getElementById("gif_url")
  const url = urlInput.value.trim()

  if (!/\.gif(\?.*)?$/i.test(url)) {
    alert(ERROR_ALERT, "Please enter a valid .gif URL.")
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
    addGifToDOM(url)
    await chrome.storage.local.set({ [LIST_GIFS]: gifs_storage })
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
    await chrome.storage.local.set({ [LIST_GIFS]: gifs_storage });

    addGifToDOM(dataUrl);
    fileInput.value = ""
    closeAddGifPanel()
    alert(SUCCESS_ALERT);
  };

  reader.readAsDataURL(file);
});

const toggleAddGifBtn = document.getElementById('toggle-add-gif');
const addGifPanel = document.getElementById('add-gif-panel');

function closeAddGifPanel() {
  addGifPanel.setAttribute('hidden', 'hidden')
  toggleAddGifBtn.textContent = '+ Add GIF'
  toggleAddGifBtn.classList.remove('is-open')
}

function openAddGifPanel() {
  addGifPanel.removeAttribute('hidden')
  toggleAddGifBtn.textContent = 'Close'
  toggleAddGifBtn.classList.add('is-open')
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
