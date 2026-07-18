const test = require("node:test");
const assert = require("node:assert/strict");
const { loadScripts } = require("./helpers/loadGlobals");

const g = loadScripts(["js/constants.js", "js/utils.js"]);

test("checkUndefined", () => {
  assert.equal(g.checkUndefined(undefined), true);
  assert.equal(g.checkUndefined(null), false);
  assert.equal(g.checkUndefined("x"), false);
  assert.equal(g.checkUndefined(0), false);
});

test("shellEscape neutralizes single quotes for embedding in a '...' shell string", () => {
  assert.equal(g.shellEscape(`it's here`), "it'\\''s here");
  assert.equal(g.shellEscape("no quotes"), "no quotes");
  assert.equal(g.shellEscape(`'''`), "'\\'''\\'''\\''");
});

test("truncateBody caps long strings and leaves short ones/non-strings alone", () => {
  assert.equal(g.truncateBody("short"), "short");
  assert.equal(g.truncateBody(undefined), undefined);
  const long = "x".repeat(g.MAX_BODY_LENGTH + 500);
  const truncated = g.truncateBody(long);
  assert.equal(truncated.length, g.MAX_BODY_LENGTH + "\n...[truncated]".length);
  assert.ok(truncated.startsWith("x".repeat(g.MAX_BODY_LENGTH)));
  assert.ok(truncated.endsWith("...[truncated]"));
});

test("isExistedInArray", () => {
  assert.equal(g.isExistedInArray(["a", "b"], "b"), true);
  assert.equal(g.isExistedInArray(["a", "b"], "c"), false);
  assert.equal(g.isExistedInArray([], "c"), false);
});

test("isDetectedContentType matches JSON, form-urlencoded and GraphQL", () => {
  assert.equal(g.isDetectedContentType("application/json; charset=utf-8"), true);
  assert.equal(g.isDetectedContentType("application/x-www-form-urlencoded"), true);
  assert.equal(g.isDetectedContentType("application/graphql-response+json"), true);
  assert.equal(g.isDetectedContentType("application/graphql"), true);
});

test("isDetectedContentType rejects unrelated or empty content-types", () => {
  assert.equal(g.isDetectedContentType("text/html"), false);
  assert.equal(g.isDetectedContentType("image/png"), false);
  assert.equal(g.isDetectedContentType(""), false);
  assert.equal(g.isDetectedContentType(undefined), false);
});
