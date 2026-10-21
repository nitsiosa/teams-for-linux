// Privacy-minimising selector audit for an existing signed-in Teams session.
//
// Launch the installed app with a local CDP endpoint, then run:
//   PEARL_AUDIT_ENDPOINT=http://127.0.0.1:9223 \
//     node tests/manual/pearlLuxeSelectorAudit.mjs > selector-audit.json
//
// The output contains only anonymised frame indexes, selector IDs and
// match/visible counts. It never returns URLs, text, attributes, HTML,
// accessibility trees, screenshots, console output or network data.
import { chromium } from "playwright";

const endpoint =
  process.env.PEARL_AUDIT_ENDPOINT || "http://127.0.0.1:9223";

const GROUPS = Object.freeze({
  fluentRoot: [
    ":root",
    ".fui-FluentProvider",
    '[class*="fui-FluentProvider"]',
  ],
  topBar: [
    '[data-tid="app-header"]',
    '[data-tid="title-bar"]',
    'header[role="banner"]',
  ],
  search: [
    '[data-tid="searchInputField"]',
    'input[type="search"]',
  ],
  appRail: [
    '[data-tid="app-bar"]',
  ],
  chatList: [
    '[data-tid="chat-list"]',
    '[data-tid="left-rail"]',
    '[role="tree"]',
    '[role="treeitem"]',
    '[role="treeitem"][aria-selected="true"]',
    '[data-tid="chat-list-section-header"]',
  ],
  filters: [
    '[role="toolbar"] button[aria-pressed]',
    '[role="toolbar"] button[aria-pressed="true"]',
    '[data-tid*="filter"] button',
  ],
  conversation: [
    '[data-tid="chat-header-title"]',
    '[data-tid="chat-title"]',
    '[role="tablist"] [role="tab"]',
    '[role="tablist"] [role="tab"][aria-selected="true"]',
  ],
  messages: [
    '[data-tid="chat-pane-message"]',
    '[data-tid="message-body"]',
    '[data-tid="chat-pane-message"][data-mine="true"]',
    '[data-tid="chat-pane-item"] [data-tid="message-body"]',
    '[data-tid="message-author-name"]',
    '[data-tid="message-timestamp"]',
  ],
  attachmentsAndReactions: [
    '[data-tid="file-attachment-grid"] > *',
    '[data-tid*="attachment"]',
    '[data-tid*="reaction"] button',
    '[data-tid*="reaction"] [role="button"]',
  ],
  composer: [
    '[data-tid="ckeditor"]',
    '[data-tid="message-compose-box"]',
    '[data-tid*="compose"]',
    '[data-tid*="compose"] [contenteditable="true"]',
    '[data-tid="newMessageCommands-send"]',
  ],
  badgesAndIndicators: [
    '[data-tid*="badge"]',
    ".fui-CounterBadge",
    '[data-tid*="unread-indicator"]',
  ],
  transientSurfaces: [
    '[role="menu"]',
    '[role="dialog"]',
    '[role="listbox"]',
    ".fui-PopoverSurface",
    ".fui-DialogSurface",
  ],
});

const teamsHosts = new Set([
  "teams.cloud.microsoft",
  "teams.microsoft.com",
  "teams.live.com",
]);

function isTeamsFrame(frame) {
  try {
    return teamsHosts.has(new URL(frame.url()).hostname);
  } catch {
    return false;
  }
}

const browser = await chromium.connectOverCDP(endpoint);
const records = [];
let pageIndex = 0;
for (const context of browser.contexts()) {
  for (const page of context.pages()) {
    const frames = page.frames().filter(isTeamsFrame);
    if (frames.length === 0) continue;
    let frameIndex = 0;
    for (const frame of frames) {
      const result = await frame.evaluate((groups) => {
        const output = {};
        const visible = (element) => {
          const style = getComputedStyle(element);
          const bounds = element.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            bounds.width > 0 &&
            bounds.height > 0
          );
        };
        for (const [group, selectors] of Object.entries(groups)) {
          output[group] = {};
          for (const selector of selectors) {
            try {
              const matches = [...document.querySelectorAll(selector)];
              output[group][selector] = {
                matches: matches.length,
                visible: matches.filter(visible).length,
              };
            } catch {
              output[group][selector] = { invalid: true };
            }
          }
        }
        const root = document.documentElement;
        const body = document.body;
        const hasMarker = (element, marker) =>
          Boolean(element?.classList?.contains(marker));
        const safeDataTidCounts = {};
        for (const element of document.querySelectorAll("[data-tid]")) {
          const value = element.getAttribute("data-tid");
          if (!/^[A-Za-z][A-Za-z_-]{0,63}$/.test(value)) continue;
          safeDataTidCounts[value] ??= { matches: 0, visible: 0 };
          safeDataTidCounts[value].matches += 1;
          if (visible(element)) safeDataTidCounts[value].visible += 1;
        }
        const roleCounts = {};
        for (const element of document.querySelectorAll("[role]")) {
          const value = element.getAttribute("role");
          if (!/^[a-z-]{1,32}$/.test(value)) continue;
          roleCounts[value] = (roleCounts[value] || 0) + 1;
        }
        const fluentClassCounts = {};
        for (const element of document.querySelectorAll('[class*="fui-"]')) {
          for (const value of element.classList) {
            if (!/^fui-[A-Za-z]+$/.test(value)) continue;
            fluentClassCounts[value] =
              (fluentClassCounts[value] || 0) + 1;
          }
        }
        return {
          selectors: output,
          safeDataTidCounts,
          roleCounts,
          fluentClassCounts,
          mode: {
            prefersDark: matchMedia("(prefers-color-scheme: dark)").matches,
            htmlThemeDark: hasMarker(root, "theme-dark"),
            bodyThemeDark: hasMarker(body, "theme-dark"),
            htmlDataThemeDark: root?.getAttribute("data-theme") === "dark",
            colorScheme:
              getComputedStyle(root).colorScheme === "dark"
                ? "dark"
                : "not-dark",
          },
          fluentVariables: {
            neutralBackground1: Boolean(
              getComputedStyle(
                document.querySelector(".fui-FluentProvider") || root
              )
                .getPropertyValue("--colorNeutralBackground1")
                .trim()
            ),
            brandBackground: Boolean(
              getComputedStyle(
                document.querySelector(".fui-FluentProvider") || root
              )
                .getPropertyValue("--colorBrandBackground")
                .trim()
            ),
          },
        };
      }, GROUPS);
      records.push({
        page: pageIndex,
        frame: frameIndex,
        ...result,
      });
      frameIndex += 1;
    }
    pageIndex += 1;
  }
}
await browser.close();

console.log(
  JSON.stringify(
    {
      schema: 1,
      pages: pageIndex,
      frames: records.length,
      records,
    },
    null,
    2
  )
);
