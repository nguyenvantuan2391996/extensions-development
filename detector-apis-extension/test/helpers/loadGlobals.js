const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT_DIR = path.join(__dirname, "..", "..");

// The extension's .js files are plain scripts (loaded via <script> tags /
// importScripts, not modules), so top-level `function`/`let`/`const` become
// globals. We replay that by running them in a shared vm context, mirroring
// how the browser actually loads them instead of adding a build step.
function loadScripts(relativePaths, options = {}) {
  const sandbox = options.sandbox || {};
  if (!vm.isContext(sandbox)) {
    vm.createContext(sandbox);
  }

  for (const relativePath of relativePaths) {
    const fullPath = path.join(ROOT_DIR, relativePath);
    const code = fs.readFileSync(fullPath, "utf8");
    try {
      vm.runInContext(code, sandbox, { filename: fullPath });
    } catch (e) {
      if (!options.ignoreErrors) {
        throw e;
      }
    }

    // Top-level `const`/`let` bindings live in the context's shared script
    // scope but, unlike `var`/function declarations, aren't exposed as
    // own-properties of the sandbox object. Promote top-level consts so
    // tests can read them off the returned sandbox (e.g. sandbox.SOME_CONST).
    // Anchored at column 0 so consts declared inside function bodies (which
    // are indented) aren't mistaken for top-level bindings.
    const constNames = [...code.matchAll(/^const\s+([A-Za-z_$][\w$]*)/gm)].map(
      (m) => m[1]
    );
    if (constNames.length > 0) {
      const promote = constNames
        .map((name) => `this[${JSON.stringify(name)}] = ${name};`)
        .join("\n");
      vm.runInContext(promote, sandbox, { filename: fullPath + " (promote)" });
    }
  }

  return sandbox;
}

module.exports = { loadScripts };
