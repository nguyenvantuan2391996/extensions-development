chrome.runtime.onMessage.addListener(async function(
    msg,
    sender,
    sendResponse
) {
    console.log(sender, sendResponse);
    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_GIF_SIZE) {
        await chrome.storage.local.set({
                gif_size: msg.gif_size
            },
            function() {
                console.log("gif size saved successfully");
            });
        await handleWebsiteLoaded()
    }

    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_GIF_POSITION) {
        await chrome.storage.local.set({
                gif_position: msg.gif_position
            },
            function() {
                console.log("gif position saved successfully");
            });
        await handleWebsiteLoaded()
    }

    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_GIF_ANIMATION) {
        await chrome.storage.local.set({
                gif_animation: msg.gif_animation
            },
            function() {
                console.log("gif animation saved successfully");
            });
        await handleWebsiteLoaded()
    }

    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_GIF_DURATION) {
        await chrome.storage.local.set({
                gif_duration: msg.gif_duration
            },
            function() {
                console.log("gif duration saved successfully");
            });
        await handleWebsiteLoaded()
    }

    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_GIF_SELECTED) {
        await chrome.storage.local.set({
                gif_selected: JSON.stringify([msg.gif_src])
            },
            function() {
                console.log("gif selected saved successfully");
            });
        await handleWebsiteLoaded()
    }

    if (msg.from === BACKGROUND_SCREEN && msg.subject === HANDLE_MAIN_WEBSITE_LOADED) {
        await handleWebsiteLoaded()
    }
});

async function handleWebsiteLoaded() {
    await chrome.storage.local.get(
        [
            "gif_selected",
            "gif_size",
            "gif_position",
            "gif_animation",
            "gif_duration"
        ],
        function (result) {
            render(result)
        })
}
function render(result) {
    if (!!!result.gif_selected) {
        return
    }

    let container_bubu_dudu = document.getElementById("bubu-dudu-gif-picker")
    if (container_bubu_dudu) {
        container_bubu_dudu.remove()
    }

    const style = document.createElement("style")
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
            }`
    document.head.appendChild(style)

    const container = document.createElement("div")
    container.id = "bubu-dudu-gif-picker"
    container.style.background = "none"
    container.style.backgroundColor = "transparent"
    container.style.backgroundImage = "none"

    const bubu_dudu = document.createElement("img")
    bubu_dudu.src = JSON.parse(result.gif_selected)[0]
    bubu_dudu.alt = JSON.parse(result.gif_selected)[0]
    bubu_dudu.className = "character"

    bubu_dudu.style.zIndex = "9999"
    bubu_dudu.style.position = "fixed"
    switch (result.gif_animation) {
        case LEFT:
            bubu_dudu.style.animationName = "moveLeftToRight"
            bubu_dudu.style.left = "-200px"
            break
        case RIGHT:
            bubu_dudu.style.animationName = "moveRightToLeft"
            bubu_dudu.style.right = "-200px"
            break
        default:
            bubu_dudu.style.animationName = "moveLeftToRight"
            bubu_dudu.style.left = "-200px"
    }

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

    container.appendChild(bubu_dudu)

    document.body.appendChild(container)
}