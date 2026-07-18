const STYLE_ID = "bubu-dudu-gif-picker-style"
const CONTAINER_ID = "bubu-dudu-gif-picker"

chrome.runtime.onMessage.addListener(async function(msg) {
    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_GIF_SIZE) {
        await chrome.storage.local.set({ gif_size: msg.gif_size })
        await handleWebsiteLoaded()
    }

    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_GIF_POSITION) {
        await chrome.storage.local.set({ gif_position: msg.gif_position })
        await handleWebsiteLoaded()
    }

    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_GIF_ANIMATION) {
        await chrome.storage.local.set({ gif_animation: msg.gif_animation })
        await handleWebsiteLoaded()
    }

    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_GIF_DURATION) {
        await chrome.storage.local.set({ gif_duration: msg.gif_duration })
        await handleWebsiteLoaded()
    }

    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_GIF_SELECTED) {
        await chrome.storage.local.set({ gif_selected: JSON.stringify([msg.gif_src]) })
        await handleWebsiteLoaded()
    }

    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_DISABLED_HOSTS) {
        await handleWebsiteLoaded()
    }

    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_RANDOM_MODE) {
        await handleWebsiteLoaded()
    }

    if (msg.from === BACKGROUND_SCREEN && msg.subject === HANDLE_MAIN_WEBSITE_LOADED) {
        await handleWebsiteLoaded()
    }
});

async function handleWebsiteLoaded() {
    const result = await chrome.storage.local.get([
        "gif_selected",
        "gif_size",
        "gif_position",
        "gif_animation",
        "gif_duration",
        "disabled_hosts",
        "random_mode",
        "list_gifs"
    ])

    const disabledHosts = result.disabled_hosts || []
    if (disabledHosts.includes(window.location.hostname)) {
        removeGif()
        return
    }

    let gifSrc = null
    if (result.random_mode && result.list_gifs && result.list_gifs.length > 0) {
        gifSrc = result.list_gifs[Math.floor(Math.random() * result.list_gifs.length)]
    } else if (result.gif_selected) {
        try {
            gifSrc = JSON.parse(result.gif_selected)[0]
        } catch (e) {
            gifSrc = null
        }
    }

    render({ ...result, gif_src: gifSrc })
}

function removeGif() {
    const container = document.getElementById(CONTAINER_ID)
    if (container) {
        container.remove()
    }
}

function render(result) {
    if (!result.gif_src) {
        removeGif()
        return
    }

    removeGif()

    let style = document.getElementById(STYLE_ID)
    if (!style) {
        style = document.createElement("style")
        style.id = STYLE_ID
        document.head.appendChild(style)
    }
    style.textContent = `body {
              margin: 0;
            }

            .character {
              position: absolute;
              bottom: 0;
              width: ${result.gif_size}px;
              height: auto;
              animation-duration: ${result.gif_duration}s;
              animation-iteration-count: infinite;
              animation-timing-function: linear;
              pointer-events: none;
            }

            @keyframes moveLeftToRight {
              0% { left: -100px; transform: scaleX(1); }
              50% { left: 45vw; transform: scaleX(1); }
              100% { left: 110vw; transform: scaleX(1); }
            }

            @keyframes moveRightToLeft {
              0% { right: -100px; transform: scaleX(1); }
              50% { right: 45vw; transform: scaleX(1); }
              100% { right: 110vw; transform: scaleX(1); }
            }

            @keyframes moveTopToBottom {
              0% { top: -100px; }
              50% { top: 45vh; }
              100% { top: 110vh; }
            }

            @keyframes moveBottomToTop {
              0% { bottom: -100px; }
              50% { bottom: 45vh; }
              100% { bottom: 110vh; }
            }`

    const container = document.createElement("div")
    container.id = CONTAINER_ID
    container.style.background = "none"
    container.style.backgroundColor = "transparent"
    container.style.backgroundImage = "none"

    const bubu_dudu = document.createElement("img")
    bubu_dudu.src = result.gif_src
    bubu_dudu.alt = result.gif_src
    bubu_dudu.className = "character"

    bubu_dudu.style.zIndex = "9999"
    bubu_dudu.style.position = "fixed"
    switch (result.gif_animation) {
        case RIGHT:
            bubu_dudu.style.animationName = "moveRightToLeft"
            bubu_dudu.style.right = "-200px"
            break
        case TOP:
            bubu_dudu.style.animationName = "moveTopToBottom"
            bubu_dudu.style.top = "-200px"
            bubu_dudu.style.left = `calc(50% - ${Number(result.gif_size) / 2}px)`
            break
        case BOTTOM:
            bubu_dudu.style.animationName = "moveBottomToTop"
            bubu_dudu.style.bottom = "-200px"
            bubu_dudu.style.left = `calc(50% - ${Number(result.gif_size) / 2}px)`
            break
        case LEFT:
        default:
            bubu_dudu.style.animationName = "moveLeftToRight"
            bubu_dudu.style.left = "-200px"
    }

    // Position only applies to the horizontal (left/right) animations, since
    // top/bottom animations already travel the full vertical axis themselves.
    if (result.gif_animation === LEFT || result.gif_animation === RIGHT || !result.gif_animation) {
        switch (result.gif_position) {
            case TOP:
                bubu_dudu.style.top = "0px"
                break
            case BOTTOM:
                bubu_dudu.style.bottom = "0px"
                break
            default:
                bubu_dudu.style.bottom = "0px"
        }
    }

    container.appendChild(bubu_dudu)

    document.body.appendChild(container)
}
