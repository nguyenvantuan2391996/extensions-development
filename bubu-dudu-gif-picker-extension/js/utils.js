function delay(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function isSupportedTabUrl(url) {
    return !!url && /^https?:\/\//i.test(url)
}

/* global chrome */
async function sendToActiveTab(message) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !isSupportedTabUrl(tab.url)) {
        throw new Error("unsupported-page")
    }
    await chrome.tabs.sendMessage(tab.id, message)
}

async function notifyActiveTab(message) {
    try {
        await sendToActiveTab(message)
        await alert(SUCCESS_ALERT)
    } catch (e) {
        if (e.message === "unsupported-page") {
            await alert(ERROR_ALERT, "This page doesn't support Bubu Dudu (e.g. a browser settings page).")
        } else {
            await alert(ERROR_ALERT, "Couldn't apply this on the current tab. Try reloading the page.")
        }
    }
}

async function updateCheckmark(selectedDiv, src) {
    document.querySelectorAll(".checkmark").forEach(c => c.remove());
    const check = document.createElement("div");
    check.className = "checkmark";
    check.innerHTML = "✔";
    selectedDiv.appendChild(check);
    await chrome.storage.local.set({ [GIF_SELECTED]: JSON.stringify([src]) })
    await notifyActiveTab({ from: POPUP_SCREEN, subject: HANDLE_SET_GIF_SELECTED })
}

// Multi-select mode: adds/removes a single GIF from the selection instead of
// replacing it, so several GIFs can be shown on the page at once.
async function toggleGifSelected(selectedDiv, src) {
    /* global chrome */
    const result = await chrome.storage.local.get([GIF_SELECTED])
    let selected = []
    if (result[GIF_SELECTED]) {
        try {
            selected = JSON.parse(result[GIF_SELECTED])
        } catch (e) {
            selected = []
        }
    }

    const wasSelected = selected.includes(src)
    selected = wasSelected ? selected.filter(s => s !== src) : [...selected, src]

    selectedDiv.classList.toggle("selected", !wasSelected)
    selectedDiv.setAttribute('aria-pressed', String(!wasSelected))
    const check = selectedDiv.querySelector(".checkmark")
    if (wasSelected) {
        if (check) check.remove()
    } else if (!check) {
        const newCheck = document.createElement("div")
        newCheck.className = "checkmark"
        newCheck.innerHTML = "✔"
        selectedDiv.appendChild(newCheck)
    }

    await chrome.storage.local.set({ [GIF_SELECTED]: JSON.stringify(selected) })
    await notifyActiveTab({ from: POPUP_SCREEN, subject: HANDLE_SET_GIF_SELECTED })
}

async function displayCheckmark() {
    /* global chrome */
    const result = await chrome.storage.local.get([GIF_SELECTED])
    if (!result[GIF_SELECTED]) {
        return
    }

    let selected
    try {
        selected = JSON.parse(result[GIF_SELECTED])
    } catch (e) {
        return
    }

    const container = document.getElementById("gifContainer");
    const list_gifs = container.querySelectorAll(".gif-item img");
    const list_div = container.querySelectorAll(".gif-item");

    for (let i = 0; i < list_gifs.length; i++) {
        if (selected.includes(list_gifs[i].src)) {
            const check = document.createElement("div");
            check.className = "checkmark";
            check.innerHTML = "✔";
            list_div[i].appendChild(check);
            list_div[i].classList.add("selected")
            list_div[i].setAttribute('aria-pressed', 'true')
        }
    }
}

async function deleteGif(event, src) {
    event.stopPropagation();
    const container = document.getElementById("gifContainer");
    const list_gifs = container.querySelectorAll(".gif-item img");

    list_gifs.forEach(img => {
        if (img.src === src) {
            const gifItem = img.closest(".gif-item");
            if (gifItem) gifItem.remove();
        }
    });

    /* global chrome */
    const result = await chrome.storage.local.get([LIST_GIFS])
    const current_gifs = result[LIST_GIFS] || []
    const remaining_gifs = current_gifs.filter(item => item !== src)
    await chrome.storage.local.set({ [LIST_GIFS]: remaining_gifs })
    await clearSelectedGifIfMissing(remaining_gifs)
    updateEmptyState()
}

// If any GIF currently shown on pages was just removed from the library
// (deleted, or wiped out by a reset/import), drop it from the selection so
// pages stop trying to render a broken image. Works for both a single
// selection and a multi-select array.
async function clearSelectedGifIfMissing(remainingGifs) {
    /* global chrome */
    const result = await chrome.storage.local.get([GIF_SELECTED])
    if (!result[GIF_SELECTED]) {
        return
    }

    let selected
    try {
        selected = JSON.parse(result[GIF_SELECTED])
    } catch (e) {
        return
    }

    const stillValid = selected.filter(src => remainingGifs.includes(src))
    if (stillValid.length === selected.length) {
        return
    }

    if (stillValid.length > 0) {
        await chrome.storage.local.set({ [GIF_SELECTED]: JSON.stringify(stillValid) })
    } else {
        await chrome.storage.local.remove(GIF_SELECTED)
    }

    try {
        await sendToActiveTab({ from: POPUP_SCREEN, subject: HANDLE_CLEAR_GIF_SELECTED })
    } catch (e) {
        // Active tab may not support content scripts (e.g. chrome:// pages) — nothing to do.
    }
}

// Checks whether a URL points at a GIF. Cheap extension check first; falls
// back to asking the server for the real content-type so GIFs served without
// a ".gif" extension (common on image CDNs) aren't rejected.
async function isGifUrl(url) {
    if (/\.gif(\?.*)?$/i.test(url)) {
        return true
    }

    try {
        let res = await fetch(url, { method: "HEAD" })
        if (!res.headers.get("content-type")) {
            res = await fetch(url, { method: "GET" })
        }
        return (res.headers.get("content-type") || "").startsWith("image/gif")
    } catch (e) {
        return false
    }
}

async function alert(alert_type, message) {
    let element = document.getElementById(alert_type)
    let messageEl = element.querySelector('.alert-message')
    if (messageEl) {
        messageEl.textContent = message || messageEl.dataset.default
    }
    if (element.hasAttribute('hidden')) {
        element.removeAttribute('hidden')
    }
    await delay(3000)

    element.setAttribute('hidden', 'hidden')
}

async function setGifSize(size) {
    await notifyActiveTab({
        from: POPUP_SCREEN,
        subject: HANDLE_SET_GIF_SIZE,
        gif_size: size
    })
}

async function setGifPosition(position) {
    await notifyActiveTab({
        from: POPUP_SCREEN,
        subject: HANDLE_SET_GIF_POSITION,
        gif_position: position
    })
}

async function setGifAnimation(animation) {
    await notifyActiveTab({
        from: POPUP_SCREEN,
        subject: HANDLE_SET_GIF_ANIMATION,
        gif_animation: animation
    })
}

async function setGifDuration(duration) {
    await notifyActiveTab({
        from: POPUP_SCREEN,
        subject: HANDLE_SET_GIF_DURATION,
        gif_duration: duration
    })
}

async function setSiteDisabled(hostname, disabled) {
    /* global chrome */
    const result = await chrome.storage.local.get([DISABLED_HOSTS])
    const hosts = result[DISABLED_HOSTS] || []
    const next = disabled
        ? Array.from(new Set([...hosts, hostname]))
        : hosts.filter(h => h !== hostname)
    await chrome.storage.local.set({ [DISABLED_HOSTS]: next })
    await notifyActiveTab({ from: POPUP_SCREEN, subject: HANDLE_SET_DISABLED_HOSTS })
}

async function setRandomMode(enabled) {
    /* global chrome */
    await chrome.storage.local.set({ [RANDOM_MODE]: enabled })
    await notifyActiveTab({ from: POPUP_SCREEN, subject: HANDLE_SET_RANDOM_MODE })
}
