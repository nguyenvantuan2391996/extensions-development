const STYLE_ID = "bubu-dudu-gif-picker-style"
const CONTAINER_ID = "bubu-dudu-gif-picker"

// Tracks whether the GIF is supposed to be showing right now, so the
// MutationObserver below (see bottom of file) can tell "we hid it on
// purpose" apart from "a single-page app wiped it out from under us".
let gifShouldBeVisible = false

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
        await handleWebsiteLoaded()
    }

    if (msg.subject === HANDLE_SET_DISABLED_HOSTS) {
        await handleWebsiteLoaded()
    }

    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_RANDOM_MODE) {
        await handleWebsiteLoaded()
    }

    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_CLEAR_GIF_SELECTED) {
        await handleWebsiteLoaded()
    }

    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SETTINGS_IMPORTED) {
        await handleWebsiteLoaded()
    }
});

// Content scripts inject at document_start, before the DOM the GIF needs to
// attach to (document.head / document.body) reliably exists. Wait for the
// page's own DOMContentLoaded instead of relying on the background script's
// webNavigation event, which needs a broad "read your browsing activity"
// permission just for this one signal.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", handleWebsiteLoaded, { once: true })
} else {
    handleWebsiteLoaded()
}

async function handleWebsiteLoaded() {
    const result = await chrome.storage.local.get([
        "gif_selected",
        "gif_size",
        "gif_position",
        "gif_animation",
        "gif_duration",
        "disabled_hosts",
        "enabled_hosts",
        "site_mode",
        "random_mode",
        "list_gifs"
    ])

    const siteMode = result.site_mode || "blocklist"
    const siteActive = siteMode === "allowlist"
        ? (result.enabled_hosts || []).includes(window.location.hostname)
        : !(result.disabled_hosts || []).includes(window.location.hostname)

    if (!siteActive) {
        gifShouldBeVisible = false
        removeGif()
        return
    }

    let gifSrcs = []
    if (result.random_mode && result.list_gifs && result.list_gifs.length > 0) {
        gifSrcs = [result.list_gifs[Math.floor(Math.random() * result.list_gifs.length)]]
    } else if (result.gif_selected) {
        try {
            gifSrcs = JSON.parse(result.gif_selected).filter(Boolean)
        } catch (e) {
            gifSrcs = []
        }
    }

    render({ ...result, gif_srcs: gifSrcs })
}

function removeGif() {
    const container = document.getElementById(CONTAINER_ID)
    if (container) {
        container.remove()
    }
    const style = document.getElementById(STYLE_ID)
    if (style) {
        style.remove()
    }
}

function render(result) {
    if (!result.gif_srcs || result.gif_srcs.length === 0) {
        gifShouldBeVisible = false
        removeGif()
        return
    }

    gifShouldBeVisible = true
    removeGif()

    // Respect the user's OS-level "reduce motion" setting: show the GIF at a
    // fixed resting spot instead of animating it across the screen.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let style = document.getElementById(STYLE_ID)
    if (!style) {
        style = document.createElement("style")
        style.id = STYLE_ID
        document.head.appendChild(style)
    }
    style.textContent = `.bubu-dudu-character {
              position: absolute;
              bottom: 0;
              width: ${result.gif_size}px;
              height: auto;
              animation-duration: ${result.gif_duration}s;
              animation-iteration-count: infinite;
              animation-timing-function: linear;
              pointer-events: none;
            }

            @keyframes bubuDuduMoveLeftToRight {
              0% { left: -100px; transform: scaleX(1); }
              50% { left: 45vw; transform: scaleX(1); }
              100% { left: 110vw; transform: scaleX(1); }
            }

            @keyframes bubuDuduMoveRightToLeft {
              0% { right: -100px; transform: scaleX(1); }
              50% { right: 45vw; transform: scaleX(1); }
              100% { right: 110vw; transform: scaleX(1); }
            }

            @keyframes bubuDuduMoveTopToBottom {
              0% { top: -100px; }
              50% { top: 45vh; }
              100% { top: 110vh; }
            }

            @keyframes bubuDuduMoveBottomToTop {
              0% { bottom: -100px; }
              50% { bottom: 45vh; }
              100% { bottom: 110vh; }
            }`

    const container = document.createElement("div")
    container.id = CONTAINER_ID
    container.style.background = "none"
    container.style.backgroundColor = "transparent"
    container.style.backgroundImage = "none"

    // When more than one GIF is selected, stagger their animation-delay so
    // they run one after another along the same path instead of stacking
    // perfectly on top of each other.
    const delayStep = Number(result.gif_duration) / result.gif_srcs.length
    result.gif_srcs.forEach((src, index) => {
        const bubu_dudu = document.createElement("img")
        bubu_dudu.src = src
        bubu_dudu.alt = src
        bubu_dudu.className = "bubu-dudu-character"

        bubu_dudu.style.zIndex = "9999"
        bubu_dudu.style.position = "fixed"
        if (!reducedMotion) {
            bubu_dudu.style.animationDelay = `-${index * delayStep}s`
        }

        switch (result.gif_animation) {
            case RIGHT:
                if (!reducedMotion) bubu_dudu.style.animationName = "bubuDuduMoveRightToLeft"
                bubu_dudu.style.right = reducedMotion ? "20px" : "-200px"
                break
            case TOP:
                if (!reducedMotion) bubu_dudu.style.animationName = "bubuDuduMoveTopToBottom"
                bubu_dudu.style.top = reducedMotion ? "20px" : "-200px"
                bubu_dudu.style.left = `calc(50% - ${Number(result.gif_size) / 2}px)`
                break
            case BOTTOM:
                if (!reducedMotion) bubu_dudu.style.animationName = "bubuDuduMoveBottomToTop"
                bubu_dudu.style.bottom = reducedMotion ? "20px" : "-200px"
                bubu_dudu.style.left = `calc(50% - ${Number(result.gif_size) / 2}px)`
                break
            case LEFT:
            default:
                if (!reducedMotion) bubu_dudu.style.animationName = "bubuDuduMoveLeftToRight"
                bubu_dudu.style.left = reducedMotion ? "20px" : "-200px"
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
    })

    document.body.appendChild(container)
}

// Single-page apps (Facebook, YouTube, Gmail, ...) often replace large swaths
// of <body> when navigating between "pages" without a real page load, which
// can silently take the GIF out along with whatever else was there. Watch
// for that and put it back, instead of leaving it missing until the next
// full page load.
let reattachDebounceId = null
const bodyObserver = new MutationObserver(function () {
    if (!gifShouldBeVisible || document.getElementById(CONTAINER_ID)) {
        return
    }
    clearTimeout(reattachDebounceId)
    reattachDebounceId = setTimeout(handleWebsiteLoaded, 150)
})

function observeBody() {
    if (document.body) {
        bodyObserver.observe(document.body, { childList: true })
    } else {
        document.addEventListener("DOMContentLoaded", observeBody, { once: true })
    }
}

observeBody()
