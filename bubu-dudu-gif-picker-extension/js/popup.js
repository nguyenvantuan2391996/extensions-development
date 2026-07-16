document.addEventListener("DOMContentLoaded",  async function () {
  if (!localStorage.getItem(IS_INIT)) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.id) {
      chrome.tabs.reload(tab.id)
    }
  }

  let gifs_storage = JSON.parse(localStorage.getItem(LIST_GIFS))
  let gifs = LIST_GIFS_DEFAULT
  if (!!gifs_storage && gifs_storage.length > 0) {
    gifs = gifs_storage
  } else {
    localStorage.setItem(LIST_GIFS, JSON.stringify(LIST_GIFS_DEFAULT))
  }

  function renderGifs() {
    gifs.forEach(src => addGifToDOM(src))
    if (!localStorage.getItem(IS_INIT)) {
      localStorage.setItem(IS_INIT, "true")
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

    displayCheckmark()
  }

  renderGifs()
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
  await setGifSize(event.target.value)
}

document.getElementById("gif_position").onchange = async function (event) {
  await setGifPosition(event.target.value)
}

document.getElementById("gif_animation").onchange = async function (event) {
  await setGifAnimation(event.target.value)
}

document.getElementById("gif_duration").onchange = async function (event) {
  await setGifDuration(event.target.value)
}

document.getElementById("btn-add-gif").addEventListener("click", async function () {
  const urlInput = document.getElementById("gif_url")
  const url = urlInput.value.trim()

  if (!/\.gif(\?.*)?$/i.test(url)) {
    alert(ERROR_ALERT)
    return
  }

  const testImg = new Image()
  testImg.onload = () => {
    let gifs_storage = JSON.parse(localStorage.getItem(LIST_GIFS)) || []
    gifs_storage.push(url)
    addGifToDOM(url)
    localStorage.setItem(LIST_GIFS, JSON.stringify(gifs_storage))
    urlInput.value = ""
    closeAddGifPanel()
    alert(SUCCESS_ALERT)
  }
  testImg.onerror = () => {
    alert(ERROR_ALERT)
  }
  testImg.src = url
})

const fileInput = document.getElementById('gif_file');
fileInput.addEventListener('change', function () {
  const file = fileInput.files[0];
  if (file && file.type === "image/gif") {
    const reader = new FileReader();

    reader.onload = function (e) {
      const dataUrl = e.target.result; // base64 string
      let gifs_storage = JSON.parse(localStorage.getItem(LIST_GIFS)) || [];
      gifs_storage.push(dataUrl);
      localStorage.setItem(LIST_GIFS, JSON.stringify(gifs_storage));

      addGifToDOM(dataUrl);
      fileInput.value = ""
      closeAddGifPanel()
      alert(SUCCESS_ALERT);
    };

    reader.readAsDataURL(file);
  }
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
