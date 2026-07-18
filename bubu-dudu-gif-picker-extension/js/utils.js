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
    await notifyActiveTab({
        from: POPUP_SCREEN,
        subject: HANDLE_SET_GIF_SELECTED,
        gif_src: src
    })
}

async function displayCheckmark() {
    /* global chrome */
    const result = await chrome.storage.local.get([GIF_SELECTED])
    if (!result[GIF_SELECTED]) {
        return
    }
    const selected = JSON.parse(result[GIF_SELECTED])

    const container = document.getElementById("gifContainer");
    const list_gifs = container.querySelectorAll(".gif-item img");
    const list_div = container.querySelectorAll(".gif-item");

    for (let i = 0; i < list_gifs.length; i++) {
        if (list_gifs[i].src === selected[0]) {
            const check = document.createElement("div");
            check.className = "checkmark";
            check.innerHTML = "✔";
            list_div[i].appendChild(check);
            list_div[i].classList.add("selected")
            list_div[i].setAttribute('aria-pressed', 'true')
            break
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
    await chrome.storage.local.set({ [LIST_GIFS]: current_gifs.filter(item => item !== src) })
    updateEmptyState()
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
