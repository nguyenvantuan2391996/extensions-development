const test = require("node:test");
const assert = require("node:assert/strict");
const { loadScripts } = require("./helpers/loadGlobals");

function createFakeChrome() {
  let store = {};

  const local = {
    get: (keys) => {
      if (keys === null || keys === undefined) {
        return Promise.resolve({ ...store });
      }
      const list = Array.isArray(keys) ? keys : [keys];
      const result = {};
      for (const key of list) {
        if (key in store) {
          result[key] = store[key];
        }
      }
      return Promise.resolve(result);
    },
    set: (obj) => {
      Object.assign(store, obj);
      return Promise.resolve();
    },
    remove: (keys) => {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const key of list) {
        delete store[key];
      }
      return Promise.resolve();
    },
    clear: () => {
      store = {};
      return Promise.resolve();
    },
  };

  const noopListener = { addListener: () => {} };

  return {
    chrome: {
      storage: { local },
      action: {
        setBadgeText: () => Promise.resolve(),
        setBadgeBackgroundColor: () => Promise.resolve(),
      },
      webRequest: {
        onBeforeRequest: noopListener,
        onHeadersReceived: noopListener,
        onBeforeSendHeaders: noopListener,
        onErrorOccurred: noopListener,
      },
      runtime: { onMessage: noopListener },
      tabs: { onUpdated: noopListener },
    },
    dump: () => store,
  };
}

function buildBackgroundSandbox() {
  const { chrome, dump } = createFakeChrome();
  const sandbox = { chrome, importScripts: () => {} };
  loadScripts(["js/constants.js", "js/utils.js"], { sandbox });
  loadScripts(["js/background.js"], { sandbox });
  return { sandbox, dump };
}

test("getValueHeaderByKey is case-insensitive and returns '' when missing", () => {
  const { sandbox } = buildBackgroundSandbox();
  const headers = [{ name: "Content-Type", value: "application/json" }];
  assert.equal(sandbox.getValueHeaderByKey("content-type", headers), "application/json");
  assert.equal(sandbox.getValueHeaderByKey("missing", headers), "");
});

test("trackAndEvict drops stale duplicate uniqueKey mappings for the same URL", async () => {
  const { sandbox, dump } = buildBackgroundSandbox();
  const url = "https://api.example.com/data";

  await sandbox.chrome.storage.local.set({
    "detector-apis-extension-extension-_old1": url,
    "detector-apis-extension-extension-_old2": url,
  });

  const newKey = "detector-apis-extension-extension-_new";
  await sandbox.chrome.storage.local.set({ [newKey]: url });
  await sandbox.trackAndEvict(url, newKey);

  const state = dump();
  assert.equal(state["detector-apis-extension-extension-_old1"], undefined);
  assert.equal(state["detector-apis-extension-extension-_old2"], undefined);
  assert.equal(state[newKey], url);
});

test("trackAndEvict evicts the least-recently-seen URL once MAX_TRACKED_REQUESTS is exceeded", async () => {
  const { sandbox, dump } = buildBackgroundSandbox();
  const max = sandbox.MAX_TRACKED_REQUESTS;

  for (let i = 0; i < max; i++) {
    const url = `https://api.example.com/item-${i}`;
    const key = `detector-apis-extension-extension-_k${i}`;
    await sandbox.chrome.storage.local.set({
      [key]: url,
      [url + "-curl-detector-apis"]: "curl '" + url + "'",
    });
    await sandbox.trackAndEvict(url, key);
  }

  const overflowUrl = "https://api.example.com/item-overflow";
  const overflowKey = "detector-apis-extension-extension-_koverflow";
  await sandbox.chrome.storage.local.set({ [overflowKey]: overflowUrl });
  await sandbox.trackAndEvict(overflowUrl, overflowKey);

  const state = dump();
  assert.equal(
    state["https://api.example.com/item-0-curl-detector-apis"],
    undefined,
    "oldest URL's curl data should be evicted"
  );
  assert.equal(
    state["detector-apis-extension-extension-_k0"],
    undefined,
    "oldest URL's uniqueKey mapping should be evicted"
  );
  assert.equal(
    state[overflowUrl + "-curl-detector-apis"] === undefined,
    true
  );
  assert.equal(state[sandbox.REQUEST_ORDER_KEY].length, max);
  assert.ok(state[sandbox.REQUEST_ORDER_KEY].includes(overflowUrl));
  assert.ok(!state[sandbox.REQUEST_ORDER_KEY].includes("https://api.example.com/item-0"));
});

test("handleResponseBodyCapture only stores bodies for detected content-types", async () => {
  const { sandbox, dump } = buildBackgroundSandbox();

  await sandbox.handleResponseBodyCapture({
    url: "https://api.example.com/data",
    contentType: "application/json",
    body: '{"ok":true}',
  });
  await sandbox.handleResponseBodyCapture({
    url: "https://cdn.example.com/logo.png",
    contentType: "image/png",
    body: "binary-ish",
  });

  const state = dump();
  assert.equal(state["https://api.example.com/data-response-body"], '{"ok":true}');
  assert.equal(state["https://cdn.example.com/logo.png-response-body"], undefined);
});
