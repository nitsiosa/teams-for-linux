const fs = require("node:fs");
const path = require("node:path");
const { isTeamsHost } = require("../../helpers/teamsHosts");

const STYLE_ID = "tfl-pearl-luxe-overlay-styles";
const STYLE_FILES = [
  path.join(__dirname, "..", "..", "_shared", "pearlLuxe", "tokens.css"),
  path.join(__dirname, "..", "..", "_shared", "pearlLuxe", "overlays.css"),
];

let css = null;

function readStyles() {
  if (css === null) {
    css = STYLE_FILES.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  }
  return css;
}

function init() {
  if (!isTeamsHost(globalThis.location.hostname)) return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = readStyles();
  document.head.appendChild(style);
}

module.exports = { STYLE_ID, init };
