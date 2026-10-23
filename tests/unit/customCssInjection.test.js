"use strict";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const customCSS = require("../../app/customCSS");
const { isEmbeddedAppUrl } = require("../../app/customCSS/embeddedApps");
const {
  BUILTIN_THEMES,
  embeddedCssPathFor,
} = require("../../app/customCSS/themes");

const builtinCss = (id) =>
  BUILTIN_THEMES.find((theme) => theme.id === id).cssPath;

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

  it("injects only the Pearl colour layer into embedded Microsoft 365 frames", async () => {
    const calls = [];
    await customCSS.onDidFrameFinishLoad(
      {
        url: "https://outlook.office.com/hosted/calendar/",
        executeJavaScript: async (script) => calls.push(script),
      },
      {},
      builtinCss("pearlLuxe")
    );
    assert.strictEqual(calls.length, 1);
    assert.match(calls[0], /--colorNeutralBackground1/);
    assert.match(calls[0], /adoptedStyleSheets/);
    assert.doesNotMatch(calls[0], /data-tid/);
  });

  it("leaves embedded frames alone for other themes and unlisted hosts", async (t) => {
    const calls = [];
    const frame = (url) => ({
      url,
      executeJavaScript: async (script) => calls.push(script),
    });
    await customCSS.onDidFrameFinishLoad(
      frame("https://outlook.office.com/calendar/"),
      {},
      cssFixture(t)
    );
    await customCSS.onDidFrameFinishLoad(
      frame("https://outlook.office.com/calendar/"),
      {},
      builtinCss("compactDark")
    );
    await customCSS.onDidFrameFinishLoad(
      frame("https://word.cloud.microsoft/doc"),
      {},
      builtinCss("pearlLuxe")
    );
    assert.deepStrictEqual(calls, []);
  });

  it("recognises only the approved embedded Microsoft 365 app hosts", () => {
    for (const url of [
      "https://outlook.cloud.microsoft/calendar/",
      "https://outlook.office.com/hosted/calendar/",
      "https://outlook.office365.com/calendar/",
      "https://engage.cloud.microsoft/main/feed",
      "https://web.yammer.com/embed/",
      "https://onedrive.cloud.microsoft/",
      "https://contoso-my.sharepoint.com/personal/",
      "https://contoso.sharepoint.com/sites/team",
      "https://copilot.cloud.microsoft/",
      "https://m365.cloud.microsoft/chat",
    ]) {
      assert.strictEqual(isEmbeddedAppUrl(url), true, url);
    }
    for (const url of [
      "http://outlook.office.com/",
      "https://outlook.office.com.evil.invalid/",
      "https://evil.invalid/outlook.office.com",
      "https://sharepoint.com/",
      "https://a.b.sharepoint.com/",
      "https://contoso.sharepoint.com.evil.invalid/",
      "https://word.cloud.microsoft/",
      "https://teams.cloud.microsoft/",
      "https://login.microsoftonline.com/",
      "not a url",
    ]) {
      assert.strictEqual(isEmbeddedAppUrl(url), false, url);
    }
  });

  it("maps only built-in Pearl themes to shipped colour-only companions", () => {
    for (const [id, file] of [
      ["pearlLuxe", "pearlLuxeEmbedded.css"],
      ["pearlLuxeNight", "pearlLuxeNightEmbedded.css"],
    ]) {
      const companion = embeddedCssPathFor(builtinCss(id));
      assert.strictEqual(path.basename(companion), file);
      assert.ok(fs.existsSync(companion), companion);
    }
    assert.strictEqual(embeddedCssPathFor(builtinCss("compactDark")), null);
    assert.strictEqual(embeddedCssPathFor("/tmp/custom.css"), null);
    assert.strictEqual(embeddedCssPathFor(null), null);
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
