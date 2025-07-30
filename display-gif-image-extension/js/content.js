chrome.runtime.onMessage.addListener(async function (
  msg,
  sender,
  sendResponse
) {
  console.log(sender, sendResponse);
  if (
    msg.from === BACKGROUND_SCREEN &&
    msg.subject === HANDLE_MAIN_WEBSITE_LOADED
  ) {
    await chrome.storage.local.get(
      [
        "gif_extension_select_type",
        "gif_extension_key_search",
        "gif_extension_select_position",
        "turn_on_off",
      ],
      async function (result) {
        let selectType = result.gif_extension_select_type
          ? result.gif_extension_select_type
          : "type-random";
        let keySearch = result.gif_extension_key_search
          ? result.gif_extension_key_search
          : "";
        let selectPosition = result.gif_extension_select_position
          ? result.gif_extension_select_position
          : "type-bottom-right";
        let onOff = result.turn_on_off ? result.turn_on_off : "On";

        if (onOff === "Off") {
          return;
        }

        if (selectType === "type-search-key" && !keySearch) {
          keySearch = "cat cute";
        }

        let gifImageUrl =
          selectType === "type-random"
            ? await getGifImageByRandom()
            : await getGifImageByKey(keySearch);

        // create element
        // const img = document.createElement("img");
        // img.src = gifImageUrl;
        // img.width = 200;
        // img.height = 200;
        // img.style.zIndex = "999";
        //
        // document.body.appendChild(img);

        const style = document.createElement("style");
        style.textContent = `
      body {
        margin: 0;
      }

      .character {
        position: absolute;
        bottom: 0;
        width: 180px;
        height: auto;
        animation-duration: 30s;
        animation-iteration-count: infinite;
        animation-timing-function: linear;
        pointer-events: none;
      }

      @keyframes moveGoku {
        0% { left: -200px; transform: scaleX(1); }
        50% { left: 45vw; transform: scaleX(1); }
        100% { left: 110vw; transform: scaleX(1); }
      }
      
      @keyframes moveRightToLeft {
        0% { right: -200px; transform: scaleX(1); }
        50% { right: 45vw; transform: scaleX(1); }
        100% { right: 110vw; transform: scaleX(1); }
      }
    `;
        document.head.appendChild(style);

        const container = document.createElement("div");

        const goku = document.createElement("img");
        goku.src = "https://iili.io/FSWmTTg.gif";
        goku.alt = "Goku";
        goku.className = "character";
        goku.style.animationName = "moveGoku";
        goku.style.left = "-200px";
        goku.style.zIndex = "999";
        goku.style.position = "fixed";
        goku.style.bottom = "0px";

        container.appendChild(goku);

        // const dog = document.createElement("img");
        // dog.src = "https://i.pinimg.com/originals/18/f5/66/18f566fa5cf046c1e81fc6c61ce5dc53.gif";
        // dog.alt = "Dog";
        // dog.className = "character";
        // dog.style.animationName = "moveRightToLeft";
        // dog.style.right = "-200px";
        // dog.style.zIndex = "999";
        //
        //
        // container.appendChild(dog);

        document.body.appendChild(container);
      }
    );
  }

  if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_SAVE_CONFIG) {
    /* global chrome */
    chrome.storage.local.set(
      { gif_extension_select_type: msg.objectSearch.type },
      function () {
        console.log("Data select type saved successfully");
      }
    );

    chrome.storage.local.set(
      { gif_extension_key_search: msg.objectSearch.key_search },
      function () {
        console.log("Data key search saved successfully");
      }
    );

    chrome.storage.local.set(
      { gif_extension_select_position: msg.position },
      function () {
        console.log("Data select position saved successfully");
      }
    );

    alert("Data saved successfully");
  }

  if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_ON_OFF) {
    chrome.storage.local.set({ turn_on_off: msg.onOff }, function () {
      console.log("Data turn on/off saved successfully");
    });
  }

  if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_CLEAR_CONFIG) {
    // Remove the data
    chrome.storage.local.remove(
      [
        "gif_extension_select_type",
        "gif_extension_key_search",
        "gif_extension_select_position",
        "turn_on_off",
      ],
      function () {
        console.log("Data removed successfully");
      }
    );

    alert("Data removed successfully");
  }
});
