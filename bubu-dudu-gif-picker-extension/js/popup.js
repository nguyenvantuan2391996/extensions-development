document.addEventListener("DOMContentLoaded",  async function () {
  let gifs_storage = JSON.parse(localStorage.getItem(LIST_GIFS))
  let gifs = LIST_GIFS_DEFAULT;
  if (!!gifs_storage && gifs_storage.length > 0) {
    gifs = gifs_storage
  } else {
    localStorage.setItem(LIST_GIFS, JSON.stringify(LIST_GIFS_DEFAULT))
  }

  const gifContainer = document.getElementById("gifContainer");
  let selectedGif = null;

  function renderGifs() {
    gifs.forEach(src => addGifToDOM(src));
    chrome.storage.sync.get(["gif_duration"], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting value from storage:", chrome.runtime.lastError.message);
        return;
      }

      console.log(result.gif_duration)
    });
  }

  function addGifToDOM(src, prepend = false) {
    const div = document.createElement('div');
    div.className = 'gif-item';

    const inner = document.createElement('div');
    inner.className = 'relative group';

    const img = document.createElement('img');
    img.src = src;
    img.alt = src;
    img.className = 'w-full h-auto rounded-lg shadow-sm';

    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'absolute top-1 left-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200';
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteGif(e, src);
    });

    inner.appendChild(img);
    inner.appendChild(deleteBtn);
    div.appendChild(inner);

    div.onclick = (e) => {
      if (e.target.classList.contains("delete-icon")) return;
      document.querySelectorAll(".gif-item").forEach(item => item.classList.remove("selected"));
      div.classList.add("selected");
      selectedGif = src;
      updateCheckmark(div, src);
    };
    if (prepend) {
      gifContainer.insertBefore(div, gifContainer.firstChild);
    } else {
      gifContainer.appendChild(div);
    }
  }

  renderGifs();
});

document.getElementById("gif_size").onchange = async function (event) {
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
            subject: HANDLE_SET_GIF_SIZE,
            gif_size: event.target.value
          });
        } catch (e) {
          console.error(e);
        }

        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
        }
      }
  );
};

document.getElementById("position").onchange = async function (event) {
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
            subject: HANDLE_SET_GIF_POSITION,
            gif_position: event.target.value
          });
        } catch (e) {
          console.error(e);
        }

        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
        }
      }
  );
};

document.getElementById("duration").onchange = async function (event) {
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
            subject: HANDLE_SET_GIF_DURATION,
            gif_duration: event.target.value
          });
        } catch (e) {
          console.error(e);
        }

        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
        }
      }
  );
};

//
// document
//   .getElementById("btn-save-config")
//   .addEventListener("click", async function () {
//     /* global chrome */
//     await chrome.tabs.query(
//       {
//         active: true,
//         currentWindow: true,
//       },
//       function (tabs) {
//         try {
//           chrome.tabs.sendMessage(tabs[0].id, {
//             from: POPUP_SCREEN,
//             subject: HANDLE_SAVE_CONFIG,
//             objectSearch: {
//               type: document.getElementById("select-type").value,
//               key_search: document.getElementById("input-key-search").value,
//             },
//             position: document.getElementById("select-position").value,
//           });
//         } catch (e) {
//           console.error(e);
//         }
//
//         if (chrome.runtime.lastError) {
//           console.error(chrome.runtime.lastError.message);
//         }
//       }
//     );
//
//     /* global chrome */
//     await chrome.tabs.query(
//       { active: true, currentWindow: true },
//       function (tabs) {
//         chrome.tabs.reload(tabs[0].id);
//       }
//     );
//   });
//
// document
//   .getElementById("btn-turn-on-off")
//   .addEventListener("click", async function () {
//     /* global chrome */
//     await chrome.storage.local.get(["turn_on_off"], async function (result) {
//       let onOff = result.turn_on_off ? result.turn_on_off : "On";
//       if (onOff === "Off") {
//         document.getElementById("btn-turn-on-off").textContent = "On";
//         document.getElementById("btn-turn-on-off").className =
//           "btn btn-primary mr-2";
//         onOff = "On";
//       } else {
//         document.getElementById("btn-turn-on-off").textContent = "Off";
//         document.getElementById("btn-turn-on-off").className =
//           "btn btn-danger mr-2";
//         onOff = "Off";
//       }
//
//       await chrome.tabs.query(
//         {
//           active: true,
//           currentWindow: true,
//         },
//         function (tabs) {
//           try {
//             chrome.tabs.sendMessage(tabs[0].id, {
//               from: POPUP_SCREEN,
//               subject: HANDLE_ON_OFF,
//               onOff: onOff,
//             });
//           } catch (e) {
//             console.error(e);
//           }
//
//           if (chrome.runtime.lastError) {
//             console.error(chrome.runtime.lastError.message);
//           }
//         }
//       );
//
//       /* global chrome */
//       await chrome.tabs.query(
//         { active: true, currentWindow: true },
//         function (tabs) {
//           chrome.tabs.reload(tabs[0].id);
//         }
//       );
//     });
//   });
//
// document
//   .getElementById("btn-clear-config")
//   .addEventListener("click", async function () {
//     /* global chrome */
//     await chrome.tabs.query(
//       {
//         active: true,
//         currentWindow: true,
//       },
//       function (tabs) {
//         try {
//           chrome.tabs.sendMessage(tabs[0].id, {
//             from: POPUP_SCREEN,
//             subject: HANDLE_CLEAR_CONFIG,
//           });
//         } catch (e) {
//           console.error(e);
//         }
//
//         if (chrome.runtime.lastError) {
//           console.error(chrome.runtime.lastError.message);
//         }
//       }
//     );
//
//     /* global chrome */
//     await chrome.tabs.query(
//       { active: true, currentWindow: true },
//       function (tabs) {
//         chrome.tabs.reload(tabs[0].id);
//       }
//     );
//   });
//
// window.addEventListener("load", async (event) => {
//   /* global chrome */
//   await chrome.storage.local.get(
//     [
//       "gif_extension_select_type",
//       "gif_extension_key_search",
//       "gif_extension_select_position",
//       "turn_on_off",
//     ],
//     async function (result) {
//       let selectType = result.gif_extension_select_type;
//       let keySearch = result.gif_extension_key_search;
//       let selectPosition = result.gif_extension_select_position;
//
//       if (selectType === "type-search-key") {
//         document.getElementById("select-type").value = selectType;
//         document.getElementById("input-key-search").hidden = false;
//         document.getElementById("input-key-search").value = keySearch;
//       }
//       if (selectPosition) {
//         document.getElementById("select-position").value = selectPosition;
//       }
//
//       let onOff = result.turn_on_off ? result.turn_on_off : "On";
//       if (onOff === "Off") {
//         document.getElementById("btn-turn-on-off").textContent = "On";
//         document.getElementById("btn-turn-on-off").className =
//           "btn btn-primary mr-2";
//       } else {
//         document.getElementById("btn-turn-on-off").textContent = "Off";
//         document.getElementById("btn-turn-on-off").className =
//           "btn btn-danger mr-2";
//       }
//     }
//   );
// });
