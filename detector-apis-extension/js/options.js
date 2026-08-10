const MIN_MAX_TRACKED_REQUESTS = 20;
const MAX_MAX_TRACKED_REQUESTS = 1000;

window.addEventListener("load", async () => {
  let input = document.getElementById("max-tracked-requests");
  let { [MAX_TRACKED_REQUESTS_KEY]: configured } = await chrome.storage.local.get(
    MAX_TRACKED_REQUESTS_KEY
  );
  input.value = typeof configured === "number" ? configured : MAX_TRACKED_REQUESTS;

  input.addEventListener("change", async function () {
    let value = clamp(parseInt(input.value, 10) || MAX_TRACKED_REQUESTS);
    input.value = value;
    await chrome.storage.local.set({ [MAX_TRACKED_REQUESTS_KEY]: value });
    await displayAlert("Saved!");
  });
});

function clamp(value) {
  return Math.min(MAX_MAX_TRACKED_REQUESTS, Math.max(MIN_MAX_TRACKED_REQUESTS, value));
}

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

async function displayAlert(msg) {
  let alertEl = document.getElementById("alert-success");
  alertEl.textContent = msg;
  alertEl.classList.add("show");
  await delay(1500);
  alertEl.classList.remove("show");
}
