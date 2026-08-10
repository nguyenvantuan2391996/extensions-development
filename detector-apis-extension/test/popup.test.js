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

test("statusBucketFor buckets numeric codes, and reads Failed/Canceled as their own bucket instead of falling through to NaN ranges", () => {
  assert.equal(g.statusBucketFor("200 GET"), "2xx");
  assert.equal(g.statusBucketFor("301 GET"), "3xx");
  assert.equal(g.statusBucketFor("404 GET"), "4xx");
  assert.equal(g.statusBucketFor("500 POST"), "5xx");
  assert.equal(g.statusBucketFor("Failed GET"), "failed");
  assert.equal(g.statusBucketFor("Canceled POST"), "failed");
});

test("statusCodeSortValue parses the leading numeric code, and sentinels Failed/Canceled to sort last ascending", () => {
  assert.equal(g.statusCodeSortValue("200 GET"), 200);
  assert.equal(g.statusCodeSortValue("404 GET"), 404);
  assert.equal(g.statusCodeSortValue("Failed GET"), g.NON_NUMERIC_STATUS_SORT_VALUE);
  assert.equal(g.statusCodeSortValue("Canceled POST"), g.NON_NUMERIC_STATUS_SORT_VALUE);
});

test("formatDuration: plain ms under a second, seconds with 1 decimal past it", () => {
  assert.equal(g.formatDuration(128), "128ms");
  assert.equal(g.formatDuration(999), "999ms");
  assert.equal(g.formatDuration(1000), "1.0s");
  assert.equal(g.formatDuration(2500), "2.5s");
  assert.equal(g.formatDuration(undefined), "");
  assert.equal(g.formatDuration(NaN), "");
});

test("formatSize: bytes, KB, MB thresholds", () => {
  assert.equal(g.formatSize(0), "0 B");
  assert.equal(g.formatSize(999), "999 B");
  assert.equal(g.formatSize(1000), "1.0 KB");
  assert.equal(g.formatSize(45000), "45.0 KB");
  assert.equal(g.formatSize(2500000), "2.5 MB");
  assert.equal(g.formatSize(undefined), "");
  assert.equal(g.formatSize(NaN), "");
});

test("computeDuplicateCounts counts occurrences per url, including ones that only appear once", () => {
  const counts = g.computeDuplicateCounts([
    "https://a.example.com",
    "https://b.example.com",
    "https://a.example.com",
    "https://a.example.com",
  ]);
  assert.equal(counts.get("https://a.example.com"), 3);
  assert.equal(counts.get("https://b.example.com"), 1);
  assert.equal(counts.get("https://missing.example.com"), undefined);
});

test("buildFetchSnippet: includes headers/body only when present, and JSON.stringify handles escaping", () => {
  let snippet = g.buildFetchSnippet({
    url: "https://api.example.com/x?q=a\"b",
    method: "POST",
    requestHeaders: [{ name: "Content-Type", value: "application/json" }],
    requestBody: '{"a":"quote\\"here"}',
  });
  assert.match(snippet, /^fetch\(/);
  assert.match(snippet, /"method": "POST"/);
  assert.match(snippet, /"Content-Type": "application\/json"/);
  assert.match(snippet, /q=a\\"b/);

  let minimal = g.buildFetchSnippet({ url: "https://api.example.com/y" });
  assert.doesNotMatch(minimal, /"headers"/);
  assert.doesNotMatch(minimal, /"body"/);
  assert.match(minimal, /"method": "GET"/);
});

test("isSensitiveHeaderName matches known credential headers case-insensitively, and nothing else", () => {
  assert.equal(g.isSensitiveHeaderName("Authorization"), true);
  assert.equal(g.isSensitiveHeaderName("cookie"), true);
  assert.equal(g.isSensitiveHeaderName("X-API-Key"), true);
  assert.equal(g.isSensitiveHeaderName("Content-Type"), false);
  assert.equal(g.isSensitiveHeaderName("Accept"), false);
});

test("buildFetchSnippet and buildCurlSnippet redact sensitive header values unless reveal is true", () => {
  let info = {
    url: "https://api.example.com/x",
    method: "GET",
    requestHeaders: [
      { name: "Authorization", value: "Bearer secret-token" },
      { name: "Accept", value: "application/json" },
    ],
  };

  let hiddenFetch = g.buildFetchSnippet(info, false);
  assert.doesNotMatch(hiddenFetch, /secret-token/);
  assert.match(hiddenFetch, /\[REDACTED\]/);
  assert.match(hiddenFetch, /application\/json/);

  let revealedFetch = g.buildFetchSnippet(info, true);
  assert.match(revealedFetch, /secret-token/);

  let hiddenCurl = g.buildCurlSnippet(info, false);
  assert.doesNotMatch(hiddenCurl, /secret-token/);
  assert.match(hiddenCurl, /\[REDACTED\]/);

  let revealedCurl = g.buildCurlSnippet(info, true);
  assert.match(revealedCurl, /secret-token/);
});

test("extractGraphqlOperationName reads operationName from a JSON body, and tolerates non-GraphQL/invalid bodies", () => {
  assert.equal(
    g.extractGraphqlOperationName('{"operationName":"GetUser","query":"..."}'),
    "GetUser"
  );
  assert.equal(g.extractGraphqlOperationName('{"a":1}'), null);
  assert.equal(g.extractGraphqlOperationName("not json"), null);
  assert.equal(g.extractGraphqlOperationName(""), null);
  assert.equal(g.extractGraphqlOperationName(null), null);
});

test("isSlowRequest flags durations over the threshold, and tolerates missing/NaN values", () => {
  assert.equal(g.isSlowRequest(g.SLOW_REQUEST_THRESHOLD_MS + 1), true);
  assert.equal(g.isSlowRequest(g.SLOW_REQUEST_THRESHOLD_MS), false);
  assert.equal(g.isSlowRequest(100), false);
  assert.equal(g.isSlowRequest(undefined), false);
  assert.equal(g.isSlowRequest(NaN), false);
});
