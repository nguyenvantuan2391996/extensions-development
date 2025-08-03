chrome.runtime.onMessage.addListener(async function(
    msg,
    sender,
    sendResponse
) {
    console.log(sender, sendResponse);
    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_GIF_SIZE) {
        chrome.storage.local.set({
                gif_size: msg.gif_size
            },
            function() {
                console.log("gif size saved successfully");
            });
    }

    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_GIF_POSITION) {
        chrome.storage.local.set({
                gif_position: msg.gif_position
            },
            function() {
                console.log("gif position saved successfully");
            });
    }

    if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SET_GIF_DURATION) {
        await chrome.storage.local.set({
                gif_duration: msg.gif_duration
            },
            function() {
                console.log("gif duration saved successfully");
            });
    }

    if (msg.from === BACKGROUND_SCREEN && msg.subject === HANDLE_MAIN_WEBSITE_LOADED) {
        await chrome.storage.local.get(
            [
                "gif_selected",
                "gif_size",
                "gif_position",
                "gif_duration"
            ],
            function(result) {
                if (!!!result.gif_selected) {
                    return
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
              0% { left: -200px; transform: scaleX(1); }
              50% { left: 45vw; transform: scaleX(1); }
              100% { left: 110vw; transform: scaleX(1); }
            }

            @keyframes moveRightToLeft {
              0% { right: -200px; transform: scaleX(1); }
              50% { right: 45vw; transform: scaleX(1); }
              100% { right: 110vw; transform: scaleX(1); }
            }`
                document.head.appendChild(style)

                const container = document.createElement("div")

                const bubu_dudu = document.createElement("img")
                bubu_dudu.src = JSON.parse(result.gif_selected)[0]
                bubu_dudu.alt = JSON.parse(result.gif_selected)[0]
                bubu_dudu.className = "character"
                bubu_dudu.style.animationName = "moveLeftToRight"
                bubu_dudu.style.left = "-200px"
                bubu_dudu.style.zIndex = "9999"
                bubu_dudu.style.position = "fixed"
                switch (result.gif_position) {
                    case "top":
                        bubu_dudu.style.top = "0px"
                        break
                    case "bottom":
                        bubu_dudu.style.bottom = "0px"
                        break
                    default:
                        bubu_dudu.style.bottom = "0px"
                }

                container.appendChild(bubu_dudu)

                document.body.appendChild(container)
            })
    }
});