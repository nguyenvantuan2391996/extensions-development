const test = require("node:test");
const assert = require("node:assert/strict");
const { loadScripts } = require("./helpers/loadGlobals");

function createFakeChrome() {
  let store = {};
  let failNextSetCalls = 0;

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
      if (failNextSetCalls > 0) {
        failNextSetCalls--;
        return Promise.reject(
          new Error("Resource::kQuotaBytes quota exceeded")
        );
      }
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
    failNextSet: (n) => {
      failNextSetCalls = n;
    },
  };
}

function buildBackgroundSandbox() {
  const { chrome, dump, failNextSet } = createFakeChrome();
  const sandbox = { chrome, importScripts: () => {} };
  loadScripts(["js/constants.js", "js/utils.js"], { sandbox });
  loadScripts(["js/background.js"], { sandbox });
  return { sandbox, dump, failNextSet };
}

test("getValueHeaderByKey is case-insensitive and returns '' when missing", () => {
  const { sandbox } = buildBackgroundSandbox();
  const headers = [{ name: "Content-Type", value: "application/json" }];
  assert.equal(sandbox.getValueHeaderByKey("content-type", headers), "application/json");
  assert.equal(sandbox.getValueHeaderByKey("missing", headers), "");
});

test("safeStorageSet swallows a quota-exceeded rejection instead of throwing", async () => {
  const { sandbox, dump, failNextSet } = buildBackgroundSandbox();
  failNextSet(1);

  await assert.doesNotReject(sandbox.safeStorageSet({ "some-key": "value" }));

  assert.equal(dump()["some-key"], undefined, "the failed write never landed");
});

test("trackAndEvict doesn't throw even if persisting the updated order fails (regression: a rejected set() used to abort the rest of the listener)", async () => {
  const { sandbox, failNextSet } = buildBackgroundSandbox();
  failNextSet(1);

  await assert.doesNotReject(sandbox.trackAndEvict("req-1"));
});

test("trackAndEvict appends requestIds in the order they're seen", async () => {
  const { sandbox, dump } = buildBackgroundSandbox();

  await sandbox.trackAndEvict("req-1");
  await sandbox.trackAndEvict("req-2");
  await sandbox.trackAndEvict("req-3");

  const order = dump()[sandbox.REQUEST_ORDER_KEY];
  assert.equal(order.length, 3);
  assert.equal(order[0], "req-1");
  assert.equal(order[1], "req-2");
  assert.equal(order[2], "req-3");
});

test("trackAndEvict evicts the oldest requestId (and all its keys) once MAX_TRACKED_REQUESTS is exceeded", async () => {
  const { sandbox, dump } = buildBackgroundSandbox();
  const max = sandbox.MAX_TRACKED_REQUESTS;

  for (let i = 0; i < max; i++) {
    const requestId = `req-${i}`;
    await sandbox.chrome.storage.local.set({
      [requestId + "-url"]: `https://api.example.com/item-${i}`,
      [requestId + "-curl-detector-apis"]: "curl '...'",
    });
    await sandbox.trackAndEvict(requestId);
  }

  await sandbox.trackAndEvict("req-overflow");

  const state = dump();
  assert.equal(
    state["req-0-curl-detector-apis"],
    undefined,
    "oldest request's curl data should be evicted"
  );
  assert.equal(
    state["req-0-url"],
    undefined,
    "oldest request's url should be evicted"
  );
  assert.equal(state["req-overflow-curl-detector-apis"], undefined);
  const order = state[sandbox.REQUEST_ORDER_KEY];
  assert.equal(order.length, max);
  assert.ok(order.includes("req-overflow"));
  assert.ok(!order.includes("req-0"));
});

test("claimPendingBodyMatch is FIFO per url and returns null once drained", () => {
  const { sandbox } = buildBackgroundSandbox();
  sandbox.registerPendingBodyMatch("https://api.example.com/graphql", "req-a");
  sandbox.registerPendingBodyMatch("https://api.example.com/graphql", "req-b");

  assert.equal(sandbox.claimPendingBodyMatch("https://api.example.com/graphql"), "req-a");
  assert.equal(sandbox.claimPendingBodyMatch("https://api.example.com/graphql"), "req-b");
  assert.equal(sandbox.claimPendingBodyMatch("https://api.example.com/graphql"), null);
});

test("untrackPendingBodyMatch removes a queued requestId so it's never claimed", () => {
  const { sandbox } = buildBackgroundSandbox();
  sandbox.registerPendingBodyMatch("https://api.example.com/graphql", "req-a");
  sandbox.registerPendingBodyMatch("https://api.example.com/graphql", "req-b");

  sandbox.untrackPendingBodyMatch("req-a");

  assert.equal(sandbox.claimPendingBodyMatch("https://api.example.com/graphql"), "req-b");
});

test("handleResponseBodyCapture stores the body under the claimed requestId, only for detected content-types", async () => {
  const { sandbox, dump } = buildBackgroundSandbox();

  sandbox.registerPendingBodyMatch("https://api.example.com/data", "req-1");
  await sandbox.handleResponseBodyCapture({
    url: "https://api.example.com/data",
    contentType: "application/json",
    body: '{"ok":true}',
  });

  // an image response was never registered as a pending match (background.js
  // only calls registerPendingBodyMatch for detected content-types), so
  // there's nothing to claim and nothing gets stored.
  await sandbox.handleResponseBodyCapture({
    url: "https://cdn.example.com/logo.png",
    contentType: "image/png",
    body: "binary-ish",
  });

  const state = dump();
  assert.equal(state["req-1-response-body"], '{"ok":true}');
  assert.equal(state["https://cdn.example.com/logo.png-response-body"], undefined);
});

test("clearTabRequests removes only the requests belonging to the given tab", async () => {
  const { sandbox, dump } = buildBackgroundSandbox();

  await sandbox.chrome.storage.local.set({
    "req-1-tab-id": 10,
    "req-1-url": "https://a.example.com",
  });
  await sandbox.trackAndEvict("req-1");

  await sandbox.chrome.storage.local.set({
    "req-2-tab-id": 20,
    "req-2-url": "https://b.example.com",
  });
  await sandbox.trackAndEvict("req-2");

  await sandbox.clearTabRequests(10);

  const state = dump();
  assert.equal(state["req-1-url"], undefined);
  assert.equal(state["req-2-url"], "https://b.example.com");
  const order = state[sandbox.REQUEST_ORDER_KEY];
  assert.equal(order.length, 1);
  assert.equal(order[0], "req-2");
});
