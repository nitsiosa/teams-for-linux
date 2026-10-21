"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const DESIGN_ROOT = path.join(ROOT, "docs", "design", "pearl-luxe");
const TOKEN_FILE = path.join(
  DESIGN_ROOT,
  "handoff",
  "tokens",
  "pearl-luxe.tokens.json"
);
const RULES_FILE = path.join(DESIGN_ROOT, "teams.rules.css");
const DARK_SELECTORS_FILE = path.join(
  DESIGN_ROOT,
  "teams-dark-selectors.json"
);

const OUTPUTS = Object.freeze({
  adaptive: path.join(ROOT, "app", "assets", "css", "pearlLuxe.css"),
  night: path.join(ROOT, "app", "assets", "css", "pearlLuxeNight.css"),
  wrapper: path.join(
    ROOT,
    "app",
    "_shared",
    "pearlLuxe",
    "tokens.css"
  ),
});

function readInputs() {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
  const rules = fs.readFileSync(RULES_FILE, "utf8").trim() + "\n";
  const darkSelectors = JSON.parse(
    fs.readFileSync(DARK_SELECTORS_FILE, "utf8")
  );
  if (!tokens?.modes?.light || !tokens?.modes?.dark) {
    throw new Error("Pearl Luxe token JSON must define light and dark modes.");
  }
  const lightKeys = Object.keys(tokens.modes.light);
  const unknownDark = Object.keys(tokens.modes.dark).filter(
    (key) => !Object.hasOwn(tokens.modes.light, key)
  );
  if (unknownDark.length) {
    throw new Error(
      `Dark mode defines unknown tokens: ${unknownDark.join(", ")}`
    );
  }
  if (
    !Array.isArray(darkSelectors) ||
    darkSelectors.length === 0 ||
    darkSelectors.some(
      (selector) => typeof selector !== "string" || !selector.trim()
    )
  ) {
    throw new Error("Pearl Luxe dark selectors must be a non-empty array.");
  }
  return {
    version: String(tokens.version ?? "unknown"),
    light: tokens.modes.light,
    dark: tokens.modes.dark,
    lightKeys,
    rules,
    darkSelectors,
  };
}

function declarationBlock(values, indent = "  ") {
  return Object.entries(values)
    .map(([name, value]) => `${indent}${name}: ${value};`)
    .join("\n");
}

function header(version, target) {
  return [
    "/* AUTO-GENERATED — DO NOT EDIT.",
    `   Pearl Luxe ${version}; target: ${target}.`,
    "   Source: docs/design/pearl-luxe/handoff/tokens/pearl-luxe.tokens.json",
    "   Rules: docs/design/pearl-luxe/teams.rules.css",
    "   Run: npm run generate-pearl-luxe-css */",
    "",
  ].join("\n");
}

function buildAdaptive(inputs) {
  const darkSelector = inputs.darkSelectors.join(",\n");
  return (
    header(inputs.version, "Teams adaptive light/night") +
    ":root {\n  color-scheme: light dark;\n" +
    declarationBlock(inputs.light) +
    "\n}\n\n" +
    "@media (prefers-color-scheme: dark) {\n  :root {\n" +
    declarationBlock(inputs.dark, "    ") +
    "\n  }\n}\n\n" +
    `${darkSelector} {\n` +
    declarationBlock(inputs.dark) +
    "\n}\n\n" +
    inputs.rules
  );
}

function buildNight(inputs) {
  const merged = { ...inputs.light, ...inputs.dark };
  return (
    header(inputs.version, "Teams forced Night") +
    ":root {\n  color-scheme: dark;\n" +
    declarationBlock(merged) +
    "\n}\n\n" +
    inputs.rules
  );
}

function buildWrapperTokens(inputs) {
  const dark = declarationBlock(inputs.dark, "    ");
  return (
    header(inputs.version, "wrapper-owned local views") +
    ":root {\n  color-scheme: light dark;\n" +
    declarationBlock(inputs.light) +
    "\n}\n\n" +
    "@media (prefers-color-scheme: dark) {\n  :root {\n" +
    dark +
    "\n  }\n}\n\n" +
    ":root[data-pearl-theme=\"light\"],\n" +
    ".tfl-pl[data-pearl-theme=\"light\"] {\n" +
    declarationBlock(inputs.light) +
    "\n}\n\n" +
    ":root[data-pearl-theme=\"dark\"],\n" +
    ".tfl-pl[data-pearl-theme=\"dark\"] {\n" +
    declarationBlock({ ...inputs.light, ...inputs.dark }) +
    "\n}\n"
  );
}

function generatedOutputs() {
  const inputs = readInputs();
  return new Map([
    [OUTPUTS.adaptive, buildAdaptive(inputs)],
    [OUTPUTS.night, buildNight(inputs)],
    [OUTPUTS.wrapper, buildWrapperTokens(inputs)],
  ]);
}

function writeOutputs() {
  for (const [file, contents] of generatedOutputs()) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents, "utf8");
    console.log(path.relative(ROOT, file));
  }
}

if (require.main === module) {
  writeOutputs();
}

module.exports = {
  OUTPUTS,
  buildAdaptive,
  buildNight,
  buildWrapperTokens,
  generatedOutputs,
  readInputs,
  writeOutputs,
};
