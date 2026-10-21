"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
const {
  generatedOutputs,
  readInputs,
} = require("../../scripts/generatePearlLuxeCss");

function resolveToken(name, values, seen = new Set()) {
  assert.ok(!seen.has(name), `circular token reference: ${name}`);
  seen.add(name);
  const value = values[name];
  assert.strictEqual(typeof value, "string", `missing token ${name}`);
  const reference = /^var\((--lx-[a-z0-9-]+)\)$/.exec(value);
  return reference ? resolveToken(reference[1], values, seen) : value;
}

function relativeLuminance(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (
    0.2126 * channels[0] +
    0.7152 * channels[1] +
    0.0722 * channels[2]
  );
}

function contrast(first, second) {
  const light = Math.max(relativeLuminance(first), relativeLuminance(second));
  const dark = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (light + 0.05) / (dark + 0.05);
}

describe("Pearl Luxe generated CSS", () => {
  it("is reproducible from the pinned handoff", () => {
    assert.match(
      fs.readFileSync(
        path.join(ROOT, "docs", "design", "pearl-luxe", "HANDOFF_SHA256"),
        "utf8"
      ),
      /^119c99e1befded687521bfcf3a2694acf9242827b0aaea1aec661ee8e7e7aa60 /
    );
    for (const [file, expected] of generatedOutputs()) {
      assert.strictEqual(fs.readFileSync(file, "utf8"), expected);
    }
  });

  it("contains no external font or stylesheet request", () => {
    for (const [file, css] of generatedOutputs()) {
      assert.doesNotMatch(css, /@import|https?:\/\//i, file);
    }
  });

  it("keeps the Teams rules byte-identical in adaptive and forced Night", () => {
    const outputs = [...generatedOutputs().values()];
    const marker = "/* ---------- Layer 1: Fluent v9 token remap ---------- */";
    assert.strictEqual(
      outputs[0].slice(outputs[0].indexOf(marker)),
      outputs[1].slice(outputs[1].indexOf(marker))
    );
  });

  it("gives forced Night and wrapper overrides the complete token contract", () => {
    const inputs = readInputs();
    const completeNight = { ...inputs.light, ...inputs.dark };
    for (const key of inputs.lightKeys) {
      assert.ok(Object.hasOwn(completeNight, key), key);
    }
    assert.strictEqual(
      Object.keys(completeNight).length,
      inputs.lightKeys.length
    );
  });

  it("meets AA contrast for every normal text/background pairing", () => {
    const inputs = readInputs();
    const modes = {
      light: inputs.light,
      dark: { ...inputs.light, ...inputs.dark },
    };
    const pairs = [
      ["--lx-ink", "--lx-canvas"],
      ["--lx-ink", "--lx-sidebar"],
      ["--lx-ink", "--lx-rail"],
      ["--lx-ink", "--lx-surface"],
      ["--lx-ink", "--lx-surface-raised"],
      ["--lx-ink", "--lx-mine"],
      ["--lx-ink", "--lx-selected"],
      ["--lx-ink-muted", "--lx-canvas"],
      ["--lx-ink-muted", "--lx-sidebar"],
      ["--lx-ink-muted", "--lx-surface"],
      ["--lx-ink-muted", "--lx-mine"],
      ["--lx-ink-muted", "--lx-selected"],
      ["--lx-gold-ink", "--lx-selected"],
      ["--lx-on-primary", "--lx-primary"],
      ["--lx-on-badge", "--lx-badge"],
      ["--lx-sage-ink", "--lx-sage"],
      ["--lx-blush-ink", "--lx-blush"],
      ["--lx-mist-ink", "--lx-mist"],
      ["--lx-butter-ink", "--lx-butter"],
    ];
    for (const [mode, values] of Object.entries(modes)) {
      for (const [foreground, background] of pairs) {
        const ratio = contrast(
          resolveToken(foreground, values),
          resolveToken(background, values)
        );
        assert.ok(
          ratio >= 4.5,
          `${mode} ${foreground} on ${background}: ${ratio.toFixed(2)}`
        );
      }
    }
  });

  it("does not hide, reposition, or transform Teams controls", () => {
    const rules = readInputs().rules;
    assert.doesNotMatch(rules, /\bdisplay\s*:\s*none\b/i);
    assert.doesNotMatch(rules, /(?:^|[;{]\s*)position\s*:/im);
    assert.doesNotMatch(rules, /(?:^|[;{]\s*)transform\s*:/im);
    assert.doesNotMatch(
      rules,
      /(?:^|[;{]\s*)margin(?:-[a-z]+)?\s*:/im
    );
  });
});
