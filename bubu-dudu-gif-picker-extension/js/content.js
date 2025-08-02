chrome.runtime.onMessage.addListener(async function (
  msg,
  sender,
  sendResponse
) {
  console.log(sender, sendResponse);
  if (
    msg.from === POPUP_SCREEN &&
    msg.subject === HANDLE_SET_GIF_SIZE
  ) {
      chrome.storage.local.set(
          {gif_size: msg.gif_size},
          function () {
              console.log("gif size saved successfully");
          }
      );
  }

    if (
        msg.from === POPUP_SCREEN &&
        msg.subject === HANDLE_SET_GIF_POSITION
    ) {
        chrome.storage.local.set(
            { gif_position: msg.gif_position },
            function () {
                console.log("gif position saved successfully");
            }
        );
    }

    if (
        msg.from === POPUP_SCREEN &&
        msg.subject === HANDLE_SET_GIF_DURATION
    ) {
        await chrome.storage.local.set(
            { gif_duration: msg.gif_duration },
            function () {
                console.log("gif duration saved successfully");
            }
        );
    }

      // if (
      //     msg.from === BACKGROUND_SCREEN &&
      //     msg.subject === HANDLE_MAIN_WEBSITE_LOADED
      // ) {
      //
      //     chrome.storage.local.get(
      //         [
      //             "gif_selected",
      //             "list_gifs",
      //         ],
      //         function (result) {
      //             alert(result.gif_selected)
      //             alert(result.list_gifs)
      //         })
      //
      //       const style = document.createElement("style");
      //       style.textContent = `
      //       body {
      //         margin: 0;
      //       }
      //
      //       .character {
      //         position: absolute;
      //         bottom: 0;
      //         width: 180px;
      //         height: auto;
      //         animation-duration: 30s;
      //         animation-iteration-count: infinite;
      //         animation-timing-function: linear;
      //         pointer-events: none;
      //       }
      //
      //       @keyframes moveLeftToRight {
      //         0% { left: -200px; transform: scaleX(1); }
      //         50% { left: 45vw; transform: scaleX(1); }
      //         100% { left: 110vw; transform: scaleX(1); }
      //       }
      //
      //       @keyframes moveRightToLeft {
      //         0% { right: -200px; transform: scaleX(1); }
      //         50% { right: 45vw; transform: scaleX(1); }
      //         100% { right: 110vw; transform: scaleX(1); }
      //       }
      //     `;
      //       document.head.appendChild(style);
      //
      //       const container = document.createElement("div");
      //
      //       const bubu_dudu = document.createElement("img");
      //       bubu_dudu.src = "https://iili.io/FSWmTTg.gif";
      //       bubu_dudu.alt = "bubu-dudu-gif";
      //       bubu_dudu.className = "character";
      //       bubu_dudu.style.animationName = "moveLeftToRight";
      //       bubu_dudu.style.left = "-200px";
      //       bubu_dudu.style.zIndex = "999";
      //       bubu_dudu.style.position = "fixed";
      //       bubu_dudu.style.bottom = "0px";
      //
      //       container.appendChild(bubu_dudu);
      //
      //       document.body.appendChild(container);
      // }

  // if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SAVE_CONFIG) {
  //   /* global chrome */
  //   chrome.storage.local.set(
  //     { gif_extension_select_type: msg.objectSearch.type },
  //     function () {
  //       console.log("Data select type saved successfully");
  //     }
  //   );
  //
  //   chrome.storage.local.set(
  //     { gif_extension_key_search: msg.objectSearch.key_search },
  //     function () {
  //       console.log("Data key search saved successfully");
  //     }
  //   );
  //
  //   chrome.storage.local.set(
  //     { gif_extension_select_position: msg.position },
  //     function () {
  //       console.log("Data select position saved successfully");
  //     }
  //   );
  //
  //   alert("Data saved successfully");
  // }
  //
  // if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_ON_OFF) {
  //   chrome.storage.local.set({ turn_on_off: msg.onOff }, function () {
  //     console.log("Data turn on/off saved successfully");
  //   });
  // }
  //
  // if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_CLEAR_CONFIG) {
  //   // Remove the data
  //   chrome.storage.local.remove(
  //     [
  //       "gif_extension_select_type",
  //       "gif_extension_key_search",
  //       "gif_extension_select_position",
  //       "turn_on_off",
  //     ],
  //     function () {
  //       console.log("Data removed successfully");
  //     }
  //   );
  //
  //   alert("Data removed successfully");
  // }
});
