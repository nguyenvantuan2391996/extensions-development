chrome.runtime.onMessage.addListener(async function (msg) {
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

        if (!gifImageUrl) {
          console.error(
            "Failed to fetch a GIF image, falling back to the default one"
          );
          gifImageUrl = DEFAULT_GIF_URL;
        }

        const style = document.createElement("style");
        style.textContent = `
      body {
        margin: 0;
      }

      .character {
        position: fixed;
        width: 180px;
        height: auto;
        z-index: 999;
        animation-duration: 30s;
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
      }
    `;
        document.head.appendChild(style);

        const isTop = selectPosition.includes("top");
        const isLeft = selectPosition.includes("left");

        const character = document.createElement("img");
        character.src = gifImageUrl;
        character.alt = "Gif character";
        character.className = "character";
        character.style.animationName = isLeft
          ? "moveRightToLeft"
          : "moveLeftToRight";
        character.style[isLeft ? "right" : "left"] = "-200px";
        character.style[isTop ? "top" : "bottom"] = "0px";

        document.body.appendChild(character);
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
  }
});
