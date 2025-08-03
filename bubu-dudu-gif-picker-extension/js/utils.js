function delay(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function updateCheckmark(selectedDiv, src) {
    document.querySelectorAll(".checkmark").forEach(c => c.remove());
    const check = document.createElement("div");
    check.className = "checkmark";
    check.innerHTML = "✔";
    selectedDiv.appendChild(check);
    localStorage.setItem(GIF_SELECTED, JSON.stringify([src]))
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

function displayCheckmark() {
    const selected = JSON.parse(localStorage.getItem(GIF_SELECTED))
    if (!!!selected) {
        return
    }

    const container = document.getElementById("gifContainer");
    const list_gifs = container.querySelectorAll(".gif-item img");
    const list_div = container.querySelectorAll(".gif-item");

    for (let i = 0; i < list_gifs.length; i++) {
        if (list_gifs[i].src === selected[0]) {
            const check = document.createElement("div");
            check.className = "checkmark";
            check.innerHTML = "✔";
            list_div[i].appendChild(check);
            break
        }
    }
}

function deleteGif(event, src) {
    event.stopPropagation();
    const container = document.getElementById("gifContainer");
    const list_gifs = container.querySelectorAll(".gif-item img");

    list_gifs.forEach(img => {
        if (img.src === src) {
            const gifItem = img.closest(".gif-item");
            if (gifItem) gifItem.remove();
        }
    });

    let current_gifs = JSON.parse(localStorage.getItem(LIST_GIFS))
    localStorage.setItem(LIST_GIFS, JSON.stringify(current_gifs.filter(item => item !== src)))
}

async function alert(alert_type) {
    let element = document.getElementById(alert_type)
    if (element.hasAttribute('hidden')) {
        element.removeAttribute('hidden')
    }
    await delay(3000)

    element.setAttribute('hidden', 'hidden')
}
