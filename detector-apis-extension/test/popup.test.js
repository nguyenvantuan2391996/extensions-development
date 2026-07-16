const test = require("node:test");
const assert = require("node:assert/strict");
const { loadScripts } = require("./helpers/loadGlobals");

// popup.js's top-level code touches `window`/`document`, which don't exist
// in this sandbox, so it throws partway through — but function declarations
// are hoisted before any statement runs, so the pure helpers below are still
// available on the sandbox afterwards.
const g = loadScripts(["js/constants.js", "js/utils.js"]);
loadScripts(["js/popup.js"], { sandbox: g, ignoreErrors: true });

// Objects created inside the vm sandbox belong to a different realm, so
// their prototypes differ from this file's — round-trip through JSON before
// deep-equality checks to compare plain data instead of object identity.
function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("escapeHtml escapes special characters", () => {
  assert.equal(
    g.escapeHtml(`<script>alert("x")</script>`),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
  );
});

test("renderHeadersTable renders escaped rows", () => {
  const html = g.renderHeadersTable([{ name: "X-Test", value: "<b>hi</b>" }]);
  assert.match(html, /<table class="kv-table">/);
  assert.match(html, /X-Test/);
  assert.match(html, /&lt;b&gt;hi&lt;\/b&gt;/);
});

test("renderHeadersTable shows empty state for no headers", () => {
  assert.match(g.renderHeadersTable([]), /No headers captured/);
  assert.match(g.renderHeadersTable(null), /No headers captured/);
});

test("renderBody pretty-prints JSON and falls back to raw text", () => {
  assert.match(g.renderBody('{"a":1}'), /&quot;a&quot;: 1/);
  assert.match(g.renderBody("not json"), /not json/);
  assert.match(g.renderBody("", "No body here"), /No body here/);
});

test("parseHeadersJSON tolerates invalid or missing input", () => {
  assert.deepEqual(
    toPlain(g.parseHeadersJSON('[{"name":"a","value":"b"}]')),
    [{ name: "a", value: "b" }]
  );
  assert.equal(g.parseHeadersJSON("not json"), null);
  assert.equal(g.parseHeadersJSON(""), null);
  assert.equal(g.parseHeadersJSON(undefined), null);
});

test("findHeaderValue is case-insensitive and handles missing headers", () => {
  const headers = [{ name: "Content-Type", value: "application/json" }];
  assert.equal(g.findHeaderValue(headers, "content-type"), "application/json");
  assert.equal(g.findHeaderValue(headers, "missing"), "");
  assert.equal(g.findHeaderValue(null, "content-type"), "");
});

test("buildPostmanRequestBody: urlencoded content-type produces key/value pairs", () => {
  const body = g.buildPostmanRequestBody(
    { requestBody: "a=1&b=2" },
    "application/x-www-form-urlencoded"
  );
  assert.equal(body.mode, "urlencoded");
  assert.deepEqual(toPlain(body.urlencoded), [
    { key: "a", value: "1" },
    { key: "b", value: "2" },
  ]);
});

test("buildPostmanRequestBody: JSON content-type produces raw json body", () => {
  const body = g.buildPostmanRequestBody(
    { requestBody: '{"a":1}' },
    "application/json"
  );
  assert.equal(body.mode, "raw");
  assert.equal(body.options.raw.language, "json");
  assert.equal(body.raw, '{"a":1}');
});

test("buildPostmanRequestBody: no body returns undefined", () => {
  assert.equal(
    g.buildPostmanRequestBody({ requestBody: "" }, "application/json"),
    undefined
  );
});
