"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
const {
  OUTPUTS,
  generatedOutputs,
  readInputs,
} = require("../../scripts/generatePearlLuxeCss");

function ruleBlocks(css) {
  const body = css.replaceAll(/\/\*[\s\S]*?\*\//g, "");
  return [...body.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
    ([, selector, block]) => ({
      selector: selector.replaceAll(/\s+/g, " ").trim(),
      declarations: new Map(
        block
          .split(";")
          .filter((declaration) => declaration.includes(":"))
          .map((declaration) => {
            const colon = declaration.indexOf(":");
            const property = declaration.slice(0, colon).trim();
            return [
              property.startsWith("--") ? property : property.toLowerCase(),
              declaration.slice(colon + 1).trim(),
            ];
          })
      ),
    })
  );
}

function selectorList(selector) {
  return selector.split(/,(?![^(]*\))/).map((part) => part.trim());
}

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
    const outputs = generatedOutputs();
    const { rules } = readInputs();
    assert.ok(outputs.get(OUTPUTS.adaptive).endsWith(rules));
    assert.ok(outputs.get(OUTPUTS.night).endsWith(rules));
  });

  it("gives embedded Microsoft 365 apps only the token remap", () => {
    const outputs = generatedOutputs();
    const { remap } = readInputs();
    for (const file of [OUTPUTS.adaptiveEmbedded, OUTPUTS.nightEmbedded]) {
      const css = outputs.get(file);
      assert.ok(css.endsWith(remap), file);
      assert.doesNotMatch(css, /Layer 2|data-tid/, file);
    }
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
      ["--lx-gold-ink", "--lx-canvas"],
      ["--lx-gold-ink", "--lx-sidebar"],
      ["--lx-gold-ink", "--lx-rail"],
      ["--lx-gold-ink", "--lx-surface"],
      ["--lx-gold-ink", "--lx-surface-raised"],
      ["--lx-gold-ink", "--lx-hover"],
      ["--lx-gold-ink", "--lx-mine"],
      ["--lx-ink", "--lx-hover"],
      ["--lx-ink-muted", "--lx-rail"],
      ["--lx-ink-muted", "--lx-hover"],
      ["--lx-ink-muted", "--lx-surface-raised"],
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

  it("does not hide or transform Teams controls", () => {
    const rules = readInputs().rules;
    assert.doesNotMatch(rules, /\bdisplay\s*:\s*none\b/i);
    assert.doesNotMatch(rules, /(?:^|[;{]\s*)transform\s*:/im);
    assert.match(rules, /\[data-tid="message-pane-list-runway"\]/);
  });

  it("leaves page, rail and chat-list geometry to Teams", () => {
    const blocks = ruleBlocks(readInputs().rules);
    for (const property of [
      "grid-template",
      "grid-template-columns",
      "grid-template-rows",
      "position",
    ]) {
      assert.deepStrictEqual(
        blocks
          .filter((block) => block.declarations.has(property))
          .map((block) => block.selector),
        [],
        property
      );
    }
    const rowGeometry =
      /^(?:(?:min-|max-)?(?:width|height)|font-size|line-height|padding|margin)/;
    for (const block of blocks) {
      if (!/treeitem|TreeItemLayout|fui-Avatar|app-bar-wrapper/.test(block.selector)) {
        continue;
      }
      assert.deepStrictEqual(
        [...block.declarations.keys()].filter((property) =>
          rowGeometry.test(property)
        ),
        [],
        block.selector
      );
    }
  });

  it("styles chat-list section headers without restyling their nested chats", () => {
    const sectionSelectors = ruleBlocks(readInputs().rules)
      .flatMap((block) => selectorList(block.selector))
      .filter((selector) => selector.includes("[aria-expanded"));
    assert.ok(sectionSelectors.length > 0);
    for (const selector of sectionSelectors) {
      assert.match(
        selector,
        /\[aria-expanded[^\]]*\]\s*>\s*\.fui-TreeItemLayout/,
        selector
      );
    }
  });

  it("clears Teams' own message box behind the Pearl bubble", () => {
    const outer = ruleBlocks(readInputs().rules).find(
      (block) => block.selector === '[data-tid="chat-pane-message"]'
    );
    assert.ok(outer);
    assert.match(outer.declarations.get("background"), /^transparent\b/);
    assert.match(outer.declarations.get("box-shadow"), /^none\b/);
  });

  it("frames only the composer's editor row, not the whole footer", () => {
    const blocks = ruleBlocks(readInputs().rules);
    for (const footer of blocks.filter(
      (block) => block.selector === '[data-tid="chat-pane-compose-message-footer"]'
    )) {
      assert.ok(!footer.declarations.has("background"));
      assert.ok(!footer.declarations.has("box-shadow"));
    }
    const card = blocks.find(
      (block) =>
        block.selector ===
        '[data-tid="chat-pane-compose-message-footer"] > div:has([data-tid="ckeditor"])'
    );
    assert.ok(card);
    assert.match(card.declarations.get("background"), /var\(--lx-surface-raised\)/);
  });

  it("keeps the composer's edges clean", () => {
    const blocks = ruleBlocks(readInputs().rules);
    const rings = blocks.filter((block) => block.selector.includes(":focus-visible"));
    assert.ok(rings.length > 0);
    for (const ring of rings) {
      assert.match(ring.selector, /:not\(\[data-tid="ckeditor"\]/, ring.selector);
    }
    const card = blocks.find(
      (block) =>
        block.selector ===
        '[data-tid="chat-pane-compose-message-footer"] > div:has([data-tid="ckeditor"])'
    );
    assert.match(card.declarations.get("overflow"), /^hidden\b/);
    const chip = blocks.find(
      (block) => block.selector === '[data-tid="smart-replies-renderer"] button'
    );
    assert.ok(chip);
    assert.match(chip.declarations.get("border"), /var\(--lx-hairline-strong\)/);
    assert.match(chip.declarations.get("background"), /var\(--lx-surface\)/);
  });

  it("contains only audited Teams selectors", () => {
    const rules = readInputs().rules;
    assert.doesNotMatch(rules, /\bVERIFY\b/);
    assert.doesNotMatch(rules, /\[class\*=/);
    assert.doesNotMatch(rules, /\[aria-label[\^*]?=/);
    assert.doesNotMatch(rules, /\[placeholder[\^*]?=/);
    assert.doesNotMatch(rules, /(^|})\s*body\b/m);
    assert.doesNotMatch(rules, /\[role="dialog"\]/);
  });

  it("limits app-wide selectors to Pearl token declarations", () => {
    const global = ruleBlocks(readInputs().rules).filter((block) =>
      selectorList(block.selector).some(
        (selector) => selector === ":root" || selector === ".fui-FluentProvider"
      )
    );
    assert.strictEqual(global.length, 1);
    assert.deepStrictEqual(selectorList(global[0].selector), [
      ":root",
      ".fui-FluentProvider",
    ]);
    for (const [property, value] of global[0].declarations) {
      assert.match(
        property,
        /^--(?:color|borderRadius|shadow|fontFamily)[A-Za-z0-9]+$/,
        property
      );
      assert.match(value, /^var\(--lx-[a-z0-9-]+\) !important$/, property);
    }
  });
});
