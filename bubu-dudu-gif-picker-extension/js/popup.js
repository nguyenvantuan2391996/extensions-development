document.addEventListener("DOMContentLoaded",  async function () {
  let gifs_storage = JSON.parse(localStorage.getItem(LIST_GIFS))
  let gifs = LIST_GIFS_DEFAULT
  if (!!gifs_storage && gifs_storage.length > 0) {
    gifs = gifs_storage
  } else {
    localStorage.setItem(LIST_GIFS, JSON.stringify(LIST_GIFS_DEFAULT))
  }

  function renderGifs() {
    gifs.forEach(src => addGifToDOM(src))
    chrome.storage.local.get(["gif_size", "gif_position", "gif_duration"], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting value from storage:", chrome.runtime.lastError.message)
        return
      }

      if (!!result.gif_size) {
        document.getElementById("gif_size").value = result.gif_size
      }

      if (!!result.gif_position) {
        document.getElementById("position").value = result.gif_position
      }

      if (!!result.gif_duration) {
        document.getElementById("duration").value = result.gif_duration
      }
    })

    displayCheckmark()
  }

  renderGifs()
})

function addGifToDOM(src, prepend = false) {
  const gifContainer = document.getElementById("gifContainer")
  let selectedGif = null

  const div = document.createElement('div')
  div.className = 'gif-item'

  const inner = document.createElement('div')
  inner.className = 'relative group'

  const img = document.createElement('img')
  img.src = src
  img.alt = src
  img.className = 'w-full h-auto rounded-lg shadow-sm'

  const deleteBtn = document.createElement('div')
  deleteBtn.className = 'absolute top-1 left-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200'
  deleteBtn.textContent = '✕'
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    deleteGif(e, src)
  })

  inner.appendChild(img)
  inner.appendChild(deleteBtn)
  div.appendChild(inner)

  div.onclick = (e) => {
    if (e.target.classList.contains("delete-icon")) return
    document.querySelectorAll(".gif-item").forEach(item => item.classList.remove("selected"))
    div.classList.add("selected")
    selectedGif = src
    updateCheckmark(div, src)
  }
  if (prepend) {
    gifContainer.insertBefore(div, gifContainer.firstChild)
  } else {
    gifContainer.appendChild(div)
  }
}

document.getElementById("gif_size").onchange = async function (event) {
  /* global chrome */
  await chrome.tabs.query(
      {
        active: true,
        currentWindow: true,
      },
      function (tabs) {
        try {
          chrome.tabs.sendMessage(tabs[0].id, {
            from: POPUP_SCREEN,
            subject: HANDLE_SET_GIF_SIZE,
            gif_size: event.target.value
          })
        } catch (e) {
          console.error(e)
        }

        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message)
        }
      }
  )
}

document.getElementById("position").onchange = async function (event) {
  /* global chrome */
  await chrome.tabs.query(
      {
        active: true,
        currentWindow: true,
      },
      function (tabs) {
        try {
          chrome.tabs.sendMessage(tabs[0].id, {
            from: POPUP_SCREEN,
            subject: HANDLE_SET_GIF_POSITION,
            gif_position: event.target.value
          })
        } catch (e) {
          console.error(e)
        }

        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message)
        }
      }
  )
}

document.getElementById("duration").onchange = async function (event) {
  /* global chrome */
  await chrome.tabs.query(
      {
        active: true,
        currentWindow: true,
      },
      function (tabs) {
        try {
          chrome.tabs.sendMessage(tabs[0].id, {
            from: POPUP_SCREEN,
            subject: HANDLE_SET_GIF_DURATION,
            gif_duration: event.target.value
          })
        } catch (e) {
          console.error(e)
        }

        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message)
        }
      }
  )
}

document.getElementById("btn-add-gif").addEventListener("click", async function () {
  if (!document.getElementById("gif_url").value.includes(".gif")) {
    return
  }

  let gifs_storage = JSON.parse(localStorage.getItem(LIST_GIFS))
  gifs_storage.push(document.getElementById("gif_url").value)
  addGifToDOM(document.getElementById("gif_url").value)
  localStorage.setItem(LIST_GIFS, JSON.stringify(gifs_storage))
})