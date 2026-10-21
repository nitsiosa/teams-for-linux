"use strict";

const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
const modulePath = require.resolve(
  "../../app/browser/tools/pearlLuxeStyles"
);
const originalLocation = globalThis.location;
const originalDocument = globalThis.document;

afterEach(() => {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
  delete require.cache[modulePath];
});

describe("Pearl Luxe injected overlay styles", () => {
  it("uses app-owned selectors and token colors only", () => {
    const css = fs.readFileSync(
      path.join(
        ROOT,
        "app",
        "_shared",
        "pearlLuxe",
        "overlays.css"
      ),
      "utf8"
    );
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
    assert.doesNotMatch(css, /https?:\/\/|@import/i);
    assert.match(css, /#tfl-nav-buttons-container/);
    assert.match(css, /#tfl-sticker-panel/);
    assert.match(css, /#speaking-indicator-overlay/);
    assert.doesNotMatch(css, /\[data-tid/);
    assert.doesNotMatch(css, /\.fui-/);
    assert.doesNotMatch(css, /(^|})\s*(body|button|input)\b/im);
  });

  it("installs once on Teams hosts and nowhere else", () => {
    const appended = [];
    globalThis.location = { hostname: "teams.cloud.microsoft" };
    globalThis.document = {
      getElementById: () => null,
      createElement: () => ({}),
      head: { appendChild: (node) => appended.push(node) },
    };
    const styles = require(modulePath);
    styles.init();
    assert.strictEqual(appended.length, 1);
    assert.strictEqual(appended[0].id, styles.STYLE_ID);
    assert.match(appended[0].textContent, /--lx-canvas/);
    assert.match(appended[0].textContent, /#tfl-sticker-panel/);

    globalThis.document.getElementById = () => appended[0];
    styles.init();
    assert.strictEqual(appended.length, 1);

    delete require.cache[modulePath];
    globalThis.location = { hostname: "login.microsoftonline.com" };
    require(modulePath).init();
    assert.strictEqual(appended.length, 1);
  });

  it("loads after the injected tools whose legacy styles it overrides", () => {
    const preload = fs.readFileSync(
      path.join(ROOT, "app", "browser", "preload.js"),
      "utf8"
    );
    const pearl = preload.indexOf('name: "pearlLuxeStyles"');
    assert.ok(pearl > preload.indexOf('name: "navigationButtons"'));
    assert.ok(pearl > preload.indexOf('name: "customStickers"'));
    assert.ok(pearl > preload.indexOf('name: "speakingIndicator"'));
  });
});
