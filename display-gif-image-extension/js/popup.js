document.addEventListener("DOMContentLoaded", function () {
  let selectElement = document.getElementById("select-type");

  selectElement.addEventListener("change", function () {
    let selectedValue = selectElement.value;

    document.getElementById("input-key-search").hidden =
      selectedValue !== "type-search-key";
  });
});

function showAlert(message) {
  const alertElement = document.getElementById("alert-success");
  alertElement.textContent = message;
  alertElement.classList.remove("hidden");
  setTimeout(function () {
    alertElement.classList.add("hidden");
  }, 1500);
}

const TOGGLE_BTN_BASE_CLASS =
  "text-sm font-medium text-white rounded-lg py-2 px-3 transition-colors";
const TOGGLE_BTN_ON_CLASS = `${TOGGLE_BTN_BASE_CLASS} bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700`;
const TOGGLE_BTN_OFF_CLASS = `${TOGGLE_BTN_BASE_CLASS} bg-rose-500 hover:bg-rose-600 active:bg-rose-700`;

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

document
  .getElementById("btn-save-config")
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
            subject: HANDLE_SAVE_CONFIG,
            objectSearch: {
              type: document.getElementById("select-type").value,
              key_search: document.getElementById("input-key-search").value,
            },
            position: document.getElementById("select-position").value,
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
      "gif_extension_select_type",
      "gif_extension_key_search",
      "gif_extension_select_position",
      "turn_on_off",
    ],
    async function (result) {
      let selectType = result.gif_extension_select_type;
      let keySearch = result.gif_extension_key_search;
      let selectPosition = result.gif_extension_select_position;

      if (selectType === "type-search-key") {
        document.getElementById("select-type").value = selectType;
        document.getElementById("input-key-search").hidden = false;
        document.getElementById("input-key-search").value = keySearch;
      }
      if (selectPosition) {
        document.getElementById("select-position").value = selectPosition;
      }

      let onOff = result.turn_on_off ? result.turn_on_off : "On";
      renderToggleButton(onOff);
    }
  );
});
