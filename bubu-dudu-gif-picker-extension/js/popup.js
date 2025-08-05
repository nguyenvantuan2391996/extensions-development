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

  div.onclick = async (e) => {
    if (e.target.classList.contains("delete-icon")) return
    document.querySelectorAll(".gif-item").forEach(item => item.classList.remove("selected"))
    div.classList.add("selected")
    selectedGif = src
    await updateCheckmark(div, src)
  }
  if (prepend) {
    gifContainer.insertBefore(div, gifContainer.firstChild)
  } else {
    gifContainer.appendChild(div)
  }
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
  if (!document.getElementById("gif_url").value.includes(".gif")) {
    alert(ERROR_ALERT)
    return
  }

  let gifs_storage = JSON.parse(localStorage.getItem(LIST_GIFS))
  gifs_storage.push(document.getElementById("gif_url").value)
  addGifToDOM(document.getElementById("gif_url").value)
  localStorage.setItem(LIST_GIFS, JSON.stringify(gifs_storage))

  alert(SUCCESS_ALERT)
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
      alert(SUCCESS_ALERT);
    };

    reader.readAsDataURL(file);
  }
});