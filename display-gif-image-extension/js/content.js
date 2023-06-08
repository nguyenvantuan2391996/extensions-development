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
        const img = document.createElement("img");
        img.src = gifImageUrl;
        img.width = 200;
        img.height = 200;
        img.style.zIndex = "999";

        switch (selectPosition) {
          case "type-bottom-right":
            img.style.position = "fixed";
            img.style.bottom = "0";
            img.style.right = "0";
            break;
          case "type-top-right":
            img.style.position = "absolute";
            img.style.top = "0";
            img.style.right = "0";
            break;
          case "type-bottom-left":
            img.style.position = "absolute";
            img.style.bottom = "0";
            img.style.left = "0";
            break;
          case "type-top-left":
            img.style.position = "absolute";
            img.style.top = "0";
            img.style.left = "0";
            break;
        }

        document.body.appendChild(img);
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
