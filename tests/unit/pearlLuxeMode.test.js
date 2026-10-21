"use strict";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert");
const path = require("node:path");

const modePath = require.resolve("../../app/_shared/pearlLuxe/mode");
let mode;

beforeEach(() => {
  delete require.cache[modePath];
  mode = require(modePath);
});

describe("Pearl Luxe wrapper color mode", () => {
  it("defaults to auto and forces dark only for Pearl Luxe Night", () => {
    assert.strictEqual(mode.getWrapperThemeMode(), "auto");
    mode.setWrapperThemeMode({ appearance: { cssName: "pearlLuxeNight" } });
    assert.strictEqual(mode.getWrapperThemeMode(), "dark");
    mode.setWrapperThemeMode({ appearance: { cssName: "pearlLuxe" } });
    assert.strictEqual(mode.getWrapperThemeMode(), "auto");
  });

  it("uses the projected legacy value when present", () => {
    mode.setWrapperThemeMode({
      customCSSName: "pearlLuxeNight",
      appearance: { cssName: "pearlLuxe" },
    });
    assert.strictEqual(mode.getWrapperThemeMode(), "dark");
  });

  it("merges a validated query without losing existing load options", () => {
    mode.setWrapperThemeMode({ customCSSName: "pearlLuxeNight" });
    assert.deepStrictEqual(
      mode.withPearlLuxeQuery({
        query: { heading: "Synthetic" },
        extraHeaders: "X-Test: true",
      }),
      {
        query: { heading: "Synthetic", pearlTheme: "dark" },
        extraHeaders: "X-Test: true",
      }
    );
  });

  it("adds the mode to a correctly encoded file URL", () => {
    mode.setWrapperThemeMode({ customCSSName: "pearlLuxeNight" });
    const url = new URL(mode.fileUrl(path.join("/tmp", "a b.html")));
    assert.strictEqual(url.protocol, "file:");
    assert.strictEqual(url.pathname, "/tmp/a%20b.html");
    assert.strictEqual(url.searchParams.get("pearlTheme"), "dark");
  });
});
