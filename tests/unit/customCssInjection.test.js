"use strict";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const customCSS = require("../../app/customCSS");

beforeEach(() => customCSS._clearCacheForTests());

function cssFixture(t, source = ".fixture { color: red; }") {
  const directory = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "tfl-css-injection-"))
  );
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "theme.css");
  fs.writeFileSync(file, source);
  return file;
}

describe("custom CSS injection scope", () => {
  it("injects the selected theme only into a Teams top document", async (t) => {
    const file = cssFixture(t);
    const inserted = [];
    const content = {
      getURL: () => "https://teams.cloud.microsoft/v2/",
      insertCSS: async (css) => inserted.push(css),
    };
    await customCSS.onDidFinishLoad(content, {}, file);
    assert.strictEqual(inserted[0], ".fixture { color: red; }");
    assert.strictEqual(inserted.length, 3, "theme plus two wrapper defaults");
  });

  it("does not inject a selected theme into Microsoft sign-in", async (t) => {
    const file = cssFixture(t);
    const inserted = [];
    const content = {
      getURL: () => "https://login.microsoftonline.com/common/oauth2/",
      insertCSS: async (css) => inserted.push(css),
    };
    await customCSS.onDidFinishLoad(content, {}, file);
    assert.strictEqual(inserted.length, 2, "wrapper defaults only");
    assert.ok(inserted.every((css) => !css.includes(".fixture")));
  });

  it("injects only into Teams child frames", async (t) => {
    const file = cssFixture(t, ".frame-fixture { color: blue; }");
    const teamsCalls = [];
    await customCSS.onDidFrameFinishLoad(
      {
        url: "https://teams.microsoft.com/v2/frame",
        executeJavaScript: async (script) => teamsCalls.push(script),
      },
      {},
      file
    );
    assert.strictEqual(teamsCalls.length, 1);
    assert.match(teamsCalls[0], /frame-fixture/);

    const loginCalls = [];
    await customCSS.onDidFrameFinishLoad(
      {
        url: "https://login.microsoftonline.com/frame",
        executeJavaScript: async (script) => loginCalls.push(script),
      },
      {},
      file
    );
    assert.deepStrictEqual(loginCalls, []);
  });

  it("reads a selected stylesheet once per launch", async (t) => {
    const file = cssFixture(t, ".first {}");
    const first = [];
    await customCSS.onDidFinishLoad(
      {
        getURL: () => "https://teams.live.com/",
        insertCSS: async (css) => first.push(css),
      },
      {},
      file
    );
    fs.writeFileSync(file, ".second {}");
    const second = [];
    await customCSS.onDidFinishLoad(
      {
        getURL: () => "https://teams.live.com/",
        insertCSS: async (css) => second.push(css),
      },
      {},
      file
    );
    assert.strictEqual(first[0], ".first {}");
    assert.strictEqual(second[0], ".first {}");
  });

  it("recognises only supported HTTPS Teams hosts", () => {
    const check = customCSS._isTeamsContentUrlForTests;
    assert.strictEqual(check("https://teams.cloud.microsoft/v2/"), true);
    assert.strictEqual(check("https://tenant.teams.microsoft.com/"), true);
    assert.strictEqual(check("https://teams.microsoft.com.evil.invalid/"), false);
    assert.strictEqual(check("http://teams.microsoft.com/"), false);
    assert.strictEqual(check("chrome-error://chromewebdata/"), false);
  });

  it("allows local fixture documents only under the E2E gate", () => {
    const check = customCSS._isTeamsContentUrlForTests;
    const original = process.env.E2E_TESTING;
    try {
      delete process.env.E2E_TESTING;
      assert.strictEqual(check("file:///tmp/fixture.html"), false);
      process.env.E2E_TESTING = "true";
      assert.strictEqual(check("file:///tmp/fixture.html"), true);
      assert.strictEqual(check("about:srcdoc"), true);
    } finally {
      if (original === undefined) delete process.env.E2E_TESTING;
      else process.env.E2E_TESTING = original;
    }
  });
});
