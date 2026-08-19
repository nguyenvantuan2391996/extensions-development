document.addEventListener("DOMContentLoaded", function () {
  let selectElement = document.getElementById("select-type");

  selectElement.addEventListener("change", function () {
    let selectedValue = selectElement.value;

    document.getElementById("input-key-search").hidden =
      selectedValue !== "type-search-key";
    hideKeySearchError();
  });

  document
    .getElementById("range-size")
    .addEventListener("input", function () {
      document.getElementById("size-value").textContent = this.value + "px";
    });

  document
    .getElementById("range-speed")
    .addEventListener("input", function () {
      document.getElementById("speed-value").textContent = speedLabel(
        this.value
      );
    });
});

function speedLabel(seconds) {
  seconds = Number(seconds);
  if (seconds <= 20) return "Fast";
  if (seconds <= 40) return "Medium";
  return "Slow";
}

function showAlert(message) {
  const alertElement = document.getElementById("alert-success");
  alertElement.textContent = message;
  alertElement.classList.remove("hidden");
  setTimeout(function () {
    alertElement.classList.add("hidden");
  }, 1500);
}

function showKeySearchError() {
  document.getElementById("input-key-search-error").classList.remove("hidden");
  document.getElementById("input-key-search").classList.add("field-invalid");
}

function hideKeySearchError() {
  document.getElementById("input-key-search-error").classList.add("hidden");
  document
    .getElementById("input-key-search")
    .classList.remove("field-invalid");
}

const TOGGLE_BTN_ON_CLASS = "btn btn-on";
const TOGGLE_BTN_OFF_CLASS = "btn btn-off";

function renderToggleButton(onOff) {
  const btn = document.getElementById("btn-turn-on-off");
  if (onOff === "Off") {
    btn.textContent = "On";
    btn.className = TOGGLE_BTN_ON_CLASS;
  } else {
    btn.textContent = "Off";
    btn.className = TOGGLE_BTN_OFF_CLASS;
  }
}

async function getCurrentTabHostname() {
  /* global chrome */
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    return new URL(tabs[0].url).hostname;
  } catch (e) {
    return "";
  }
}

document
  .getElementById("btn-preview")
  .addEventListener("click", async function () {
    const type = document.getElementById("select-type").value;
    const keySearch = document.getElementById("input-key-search").value.trim();

    if (type === "type-search-key" && !keySearch) {
      showKeySearchError();
      return;
    }
    hideKeySearchError();

    const btn = this;
    const previewBox = document.getElementById("preview-box");
    const previewImg = document.getElementById("preview-img");

    btn.disabled = true;
    btn.textContent = "Loading...";

    let gifImageUrl =
      type === "type-random"
        ? await getGifImageByRandom()
        : await getGifImageByKey(keySearch);

    if (!gifImageUrl) {
      gifImageUrl = DEFAULT_GIF_URL;
    }

    previewImg.src = gifImageUrl;
    previewBox.classList.remove("hidden");
    btn.disabled = false;
    btn.textContent = "Preview gif";
  });

document
  .getElementById("btn-toggle-site")
  .addEventListener("click", async function () {
    /* global chrome */
    const hostname = await getCurrentTabHostname();
    if (!hostname) {
      return;
    }

    const result = await chrome.storage.local.get([STORAGE_KEY_BLOCKLIST]);
    let blocklist = result[STORAGE_KEY_BLOCKLIST] || [];
    const isBlocked = blocklist.includes(hostname);

    blocklist = isBlocked
      ? blocklist.filter((host) => host !== hostname)
      : blocklist.concat(hostname);

    await chrome.storage.local.set({ [STORAGE_KEY_BLOCKLIST]: blocklist });
    renderSiteToggle(hostname, !isBlocked);
    showAlert(
      isBlocked
        ? "Enabled on " + hostname
        : "Disabled on " + hostname
    );

    await chrome.tabs.query({ active: true, currentWindow: true }, function (
      tabs
    ) {
      chrome.tabs.reload(tabs[0].id);
    });
  });

function renderSiteToggle(hostname, isBlocked) {
  const hostEl = document.getElementById("site-host");
  const btn = document.getElementById("btn-toggle-site");

  if (!hostname) {
    hostEl.textContent = "";
    btn.classList.add("hidden");
    return;
  }

  hostEl.textContent = hostname;
  btn.classList.remove("hidden");
  btn.textContent = isBlocked ? "Enable on this site" : "Disable on this site";
}

document
  .getElementById("btn-save-config")
  .addEventListener("click", async function () {
    const type = document.getElementById("select-type").value;
    const keySearch = document.getElementById("input-key-search").value.trim();

    if (type === "type-search-key" && !keySearch) {
      showKeySearchError();
      return;
    }
    hideKeySearchError();

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
            subject: HANDLE_SAVE_CONFIG,
            objectSearch: {
              type: type,
              key_search: keySearch,
            },
            position: document.getElementById("select-position").value,
            size: Number(document.getElementById("range-size").value),
            speed: Number(document.getElementById("range-speed").value),
          });
        } catch (e) {
          console.error(e);
        }

        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
        }
      }
    );

    showAlert("Data saved successfully");

    /* global chrome */
    await chrome.tabs.query(
      { active: true, currentWindow: true },
      function (tabs) {
        chrome.tabs.reload(tabs[0].id);
      }
    );
  });

document
  .getElementById("btn-turn-on-off")
  .addEventListener("click", async function () {
    /* global chrome */
    await chrome.storage.local.get(["turn_on_off"], async function (result) {
      let previousOnOff = result.turn_on_off ? result.turn_on_off : "On";
      let onOff = previousOnOff === "Off" ? "On" : "Off";

      const btn = document.getElementById("btn-turn-on-off");
      btn.textContent = onOff;
      btn.className =
        onOff === "On" ? TOGGLE_BTN_ON_CLASS : TOGGLE_BTN_OFF_CLASS;

      await chrome.tabs.query(
        {
          active: true,
          currentWindow: true,
        },
        function (tabs) {
          try {
            chrome.tabs.sendMessage(tabs[0].id, {
              from: POPUP_SCREEN,
              subject: HANDLE_ON_OFF,
              onOff: onOff,
            });
          } catch (e) {
            console.error(e);
          }

          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
          }
        }
      );

      /* global chrome */
      await chrome.tabs.query(
        { active: true, currentWindow: true },
        function (tabs) {
          chrome.tabs.reload(tabs[0].id);
        }
      );
    });
  });

document
  .getElementById("btn-clear-config")
  .addEventListener("click", async function () {
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
            subject: HANDLE_CLEAR_CONFIG,
          });
        } catch (e) {
          console.error(e);
        }

        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
        }
      }
    );

    showAlert("Data removed successfully");

    /* global chrome */
    await chrome.tabs.query(
      { active: true, currentWindow: true },
      function (tabs) {
        chrome.tabs.reload(tabs[0].id);
      }
    );
  });

window.addEventListener("load", async (event) => {
  /* global chrome */
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
      let selectType = result[STORAGE_KEY_SELECT_TYPE];
      let keySearch = result[STORAGE_KEY_KEY_SEARCH];
      let selectPosition = result[STORAGE_KEY_SELECT_POSITION];
      let size = result[STORAGE_KEY_SIZE] || DEFAULT_CHARACTER_SIZE;
      let speed = result[STORAGE_KEY_SPEED] || DEFAULT_ANIMATION_DURATION;

      if (selectType === "type-search-key") {
        document.getElementById("select-type").value = selectType;
        document.getElementById("input-key-search").hidden = false;
        document.getElementById("input-key-search").value = keySearch;
      }
      if (selectPosition) {
        document.getElementById("select-position").value = selectPosition;
      }

      document.getElementById("range-size").value = size;
      document.getElementById("size-value").textContent = size + "px";
      document.getElementById("range-speed").value = speed;
      document.getElementById("speed-value").textContent = speedLabel(speed);

      let onOff = result[STORAGE_KEY_TURN_ON_OFF]
        ? result[STORAGE_KEY_TURN_ON_OFF]
        : "On";
      renderToggleButton(onOff);

      const hostname = await getCurrentTabHostname();
      const blocklist = result[STORAGE_KEY_BLOCKLIST] || [];
      renderSiteToggle(hostname, blocklist.includes(hostname));
    }
  );
});
