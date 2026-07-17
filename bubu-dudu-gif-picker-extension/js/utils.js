function delay(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function updateCheckmark(selectedDiv, src) {
    document.querySelectorAll(".checkmark").forEach(c => c.remove());
    const check = document.createElement("div");
    check.className = "checkmark";
    check.innerHTML = "✔";
    selectedDiv.appendChild(check);
    /* global chrome */
    await chrome.storage.local.set({ [GIF_SELECTED]: JSON.stringify([src]) })
    await chrome.tabs.query(
        {
            active: true,
            currentWindow: true,
        },
        function (tabs) {
            try {
                chrome.tabs.sendMessage(tabs[0].id, {
                    from: POPUP_SCREEN,
                    subject: HANDLE_SET_GIF_SELECTED,
                    gif_src: src
                })
            } catch (e) {
                console.error(e)
            }

            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message)
            }
        }
    )
    await alert(SUCCESS_ALERT)
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
                    gif_size: size
                })
            } catch (e) {
                alert(ERROR_ALERT)
                return
            }

            if (chrome.runtime.lastError) {
                alert(ERROR_ALERT)
            }
        }
    )

    await alert(SUCCESS_ALERT)
}

async function setGifPosition(position) {
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
                    gif_position: position
                })
            } catch (e) {
                alert(ERROR_ALERT)
                return
            }

            if (chrome.runtime.lastError) {
                alert(ERROR_ALERT)
            }
        }
    )

    await alert(SUCCESS_ALERT)
}

async function setGifAnimation(animation) {
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
                    subject: HANDLE_SET_GIF_ANIMATION,
                    gif_animation: animation
                })
            } catch (e) {
                alert(ERROR_ALERT)
                return
            }

            if (chrome.runtime.lastError) {
                alert(ERROR_ALERT)
            }
        }
    )

    await alert(SUCCESS_ALERT)
}

async function setGifDuration(duration) {
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
                    gif_duration: duration
                })
            } catch (e) {
                alert(ERROR_ALERT)
                return
            }

            if (chrome.runtime.lastError) {
                alert(ERROR_ALERT)
            }
        }
    )

    await alert(SUCCESS_ALERT)
}