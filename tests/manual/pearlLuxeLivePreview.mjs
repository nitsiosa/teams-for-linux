// Temporarily inject a built-in Pearl Luxe stylesheet into an existing local
// Teams session exposed through CDP. Returns frame counts only; no page data,
// URLs, text, HTML, screenshots, console output or network data is captured.
//
// PEARL_AUDIT_ENDPOINT=http://127.0.0.1:9223 \
//   node tests/manual/pearlLuxeLivePreview.mjs light|night|remove
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const mode = process.argv[2];
if (!["light", "night", "remove"].includes(mode)) {
  console.error(
    "usage: node tests/manual/pearlLuxeLivePreview.mjs light|night|remove"
  );
  process.exit(2);
}
const endpoint =
  process.env.PEARL_AUDIT_ENDPOINT || "http://127.0.0.1:9223";
const css =
  mode === "remove"
    ? ""
    : readFileSync(
      resolve(
        `app/assets/css/${
          mode === "night" ? "pearlLuxeNight" : "pearlLuxe"
        }.css`
      ),
      "utf8"
    );
const teamsHosts = new Set([
  "teams.cloud.microsoft",
  "teams.microsoft.com",
  "teams.live.com",
]);
const isTeamsFrame = (frame) => {
  try {
    return teamsHosts.has(new URL(frame.url()).hostname);
  } catch {
    return false;
  }
};

const browser = await chromium.connectOverCDP(endpoint);
let frames = 0;
for (const context of browser.contexts()) {
  for (const page of context.pages()) {
    for (const frame of page.frames().filter(isTeamsFrame)) {
      await frame.evaluate(
        ({ id, stylesheet }) => {
          document.getElementById(id)?.remove();
          if (!stylesheet) return;
          const style = document.createElement("style");
          style.id = id;
          style.textContent = stylesheet;
          document.head.appendChild(style);
        },
        { id: "tfl-pearl-live-preview", stylesheet: css }
      );
      frames += 1;
    }
  }
}
console.log(JSON.stringify({ mode, frames }));
// Playwright has no public "disconnect" for a CDP connection; browser.close()
// would terminate the user's Teams process. Exit this helper instead, which
// drops only the local WebSocket connection and leaves the preview running.
setTimeout(() => process.exit(0), 0);
