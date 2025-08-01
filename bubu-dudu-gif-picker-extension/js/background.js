// importScripts("constants.js");
//
// chrome.webNavigation.onDOMContentLoaded.addListener(async function (details) {
//   const currentURL = await getCurrentTabUrl();
//   if (currentURL === details.url) {
//     /* global chrome */
//     await chrome.tabs.query(
//       {
//         active: true,
//         currentWindow: true,
//       },
//       function (tabs) {
//         try {
//           chrome.tabs.sendMessage(tabs[0].id, {
//             from: BACKGROUND_SCREEN,
//             subject: HANDLE_MAIN_WEBSITE_LOADED,
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
//   }
// });
//
// async function getCurrentTabUrl() {
//   const tabs = await chrome.tabs.query({ active: true });
//   return tabs[0].url;
// }
