chrome.runtime.onMessage.addListener(async function (msg) {
  if (
    msg.from === BACKGROUND_SCREEN &&
    msg.subject === HANDLE_MAIN_WEBSITE_LOADED
  ) {
    await chrome.storage.local.get(
      [
        STORAGE_KEY_SELECT_TYPE,
        STORAGE_KEY_KEY_SEARCH,
        STORAGE_KEY_SELECT_POSITION,
        STORAGE_KEY_SIZE,
        STORAGE_KEY_SPEED,
        STORAGE_KEY_BLOCKLIST,
        STORAGE_KEY_TURN_ON_OFF,
      ],
      async function (result) {
        let selectType = result[STORAGE_KEY_SELECT_TYPE]
          ? result[STORAGE_KEY_SELECT_TYPE]
          : "type-random";
        let keySearch = result[STORAGE_KEY_KEY_SEARCH]
          ? result[STORAGE_KEY_KEY_SEARCH]
          : "";
        let selectPosition = result[STORAGE_KEY_SELECT_POSITION]
          ? result[STORAGE_KEY_SELECT_POSITION]
          : "type-bottom-right";
        let size = result[STORAGE_KEY_SIZE] || DEFAULT_CHARACTER_SIZE;
        let speed = result[STORAGE_KEY_SPEED] || DEFAULT_ANIMATION_DURATION;
        let blocklist = result[STORAGE_KEY_BLOCKLIST] || [];
        let onOff = result[STORAGE_KEY_TURN_ON_OFF]
          ? result[STORAGE_KEY_TURN_ON_OFF]
          : "On";

        if (onOff === "Off") {
          return;
        }

        if (blocklist.includes(location.hostname)) {
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
        height: auto;
        z-index: 999;
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
        character.style.width = size + "px";
        character.style.animationDuration = speed + "s";
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
      { [STORAGE_KEY_SELECT_TYPE]: msg.objectSearch.type },
      function () {
        console.log("Data select type saved successfully");
      }
    );

    chrome.storage.local.set(
      { [STORAGE_KEY_KEY_SEARCH]: msg.objectSearch.key_search },
      function () {
        console.log("Data key search saved successfully");
      }
    );

    chrome.storage.local.set(
      { [STORAGE_KEY_SELECT_POSITION]: msg.position },
      function () {
        console.log("Data select position saved successfully");
      }
    );

    chrome.storage.local.set({ [STORAGE_KEY_SIZE]: msg.size }, function () {
      console.log("Data size saved successfully");
    });

    chrome.storage.local.set({ [STORAGE_KEY_SPEED]: msg.speed }, function () {
      console.log("Data speed saved successfully");
    });
  }

  if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_ON_OFF) {
    chrome.storage.local.set(
      { [STORAGE_KEY_TURN_ON_OFF]: msg.onOff },
      function () {
        console.log("Data turn on/off saved successfully");
      }
    );
  }

  if (msg.from === POPUP_SCREEN && msg.subject === HANDLE_CLEAR_CONFIG) {
    // Remove the data
    chrome.storage.local.remove(
      [
        STORAGE_KEY_SELECT_TYPE,
        STORAGE_KEY_KEY_SEARCH,
        STORAGE_KEY_SELECT_POSITION,
        STORAGE_KEY_SIZE,
        STORAGE_KEY_SPEED,
        STORAGE_KEY_TURN_ON_OFF,
      ],
      function () {
        console.log("Data removed successfully");
      }
    );
  }
});
