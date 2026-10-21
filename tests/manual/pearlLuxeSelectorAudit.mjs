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
    '[data-tid="app-layout-area--nav"] [aria-current]',
    '[data-tid="app-layout-area--nav"] [aria-selected="true"]',
    '[data-tid="app-layout-area--nav"] [data-tid="data-tid-Chat"]',
  ],
  chatList: [
    '[data-tid="chat-list"]',
    '[data-tid="left-rail"]',
    '[role="tree"]',
    '[role="treeitem"]',
    '[role="treeitem"][tabindex="0"]',
    '[role="treeitem"][aria-selected="true"]',
    '[role="treeitem"][aria-current="page"]',
    '[data-tid="app-layout-area--mid-nav"] [role="heading"]',
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
    '.fui-ChatMessage:not(.fui-ChatMyMessage) [data-tid="chat-pane-message"]',
    '.fui-ChatMyMessage [data-tid="chat-pane-message"]',
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
const STYLE_PROBES = Object.freeze({
  appLayout: '[data-tid="experience-layout"]',
  titleBar: '[data-tid="title-bar"]',
  appRail: '[data-tid="app-layout-area--nav"]',
  chatList: '[data-tid="app-layout-area--mid-nav"]',
  selectedChat:
    '[data-tid="app-layout-area--mid-nav"] [role="treeitem"][aria-selected="true"]',
  conversationHeader: '[data-tid="entity-header"]',
  conversationTitle: '[data-tid="chat-title"]',
  message: '[data-tid="chat-pane-message"]',
  incomingMessage:
    '.fui-ChatMessage:not(.fui-ChatMyMessage) [data-tid="chat-pane-message"]',
  incomingBubble:
    '.fui-ChatMessage:not(.fui-ChatMyMessage) [data-tid="chat-pane-message"] > div.fui-Primitive',
  myMessage:
    '.fui-ChatMyMessage [data-tid="chat-pane-message"]',
  myBubble:
    '.fui-ChatMyMessage [data-tid="chat-pane-message"] > div.fui-Primitive',
  composer: '[data-tid="chat-pane-compose-message-footer"]',
  composerEditor:
    '[data-tid="chat-pane-compose-message-footer"] [data-tid="ckeditor"]',
  composerToolbar:
    '[data-tid="chat-pane-compose-message-footer"] [data-tid="simplified-formatting-toolbar"]',
  composerGutter:
    '[data-tid="chat-pane-compose-message-footer"] [data-tid="chat-pane-gutter-box"]',
  send: '[data-tid="sendMessageCommands-send"]',
});
const STYLE_PROPERTIES = Object.freeze([
  "background-color",
  "color",
  "border-color",
  "border-radius",
  "box-shadow",
  "font-family",
  "font-size",
  "line-height",
  "padding",
  "width",
  "height",
  "gap",
  "grid-template-columns",
  "grid-template-rows",
]);

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
      const result = await frame.evaluate(({ groups, probes, properties }) => {
        const output = {};
        const visible = (element) => {
          const style = getComputedStyle(element);
          const bounds = element.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            bounds.width > 0 &&
            bounds.height > 0 &&
            bounds.bottom > 0 &&
            bounds.right > 0 &&
            bounds.top < globalThis.innerHeight &&
            bounds.left < globalThis.innerWidth
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
        const safeStructure = (element, depth = 0) => {
          if (!(element instanceof Element) || depth > 6) return null;
          const dataTid = element.getAttribute("data-tid");
          return {
            tag: element.localName,
            role: element.getAttribute("role") || null,
            dataTid:
              dataTid && /^[A-Za-z][A-Za-z_-]{0,63}$/.test(dataTid)
                ? dataTid
                : null,
            fluentClasses: [...element.classList].filter((value) =>
              /^fui-[A-Za-z]+$/.test(value)
            ),
            childCount: element.children.length,
            children: [...element.children]
              .slice(0, 12)
              .map((child) => safeStructure(child, depth + 1)),
          };
        };
        const structures = {
          midNav: safeStructure(
            document.querySelector('[data-tid="app-layout-area--mid-nav"]')
          ),
          message: safeStructure(
            document.querySelector('[data-tid="chat-pane-message"]')
          ),
          chatTreeItem: safeStructure(
            document.querySelector(
              '[data-tid="app-layout-area--mid-nav"] [role="treeitem"]'
            )
          ),
          composer: safeStructure(
            document.querySelector(
              '[data-tid="chat-pane-compose-message-footer"]'
            )
          ),
        };
        const treeItemStates = {};
        for (const element of document.querySelectorAll(
          '[data-tid="app-layout-area--mid-nav"] [role="treeitem"]'
        )) {
          const styles = getComputedStyle(element);
          const state = JSON.stringify({
            selected: element.getAttribute("aria-selected"),
            current: element.getAttribute("aria-current"),
            expanded: element.getAttribute("aria-expanded"),
            fluentClasses: [...element.classList].filter((value) =>
              /^fui-[A-Za-z]+$/.test(value)
            ),
            background: styles.backgroundColor,
          });
          treeItemStates[state] = (treeItemStates[state] || 0) + 1;
        }
        const midNavHeadings = [
          ...document.querySelectorAll(
            '[data-tid="app-layout-area--mid-nav"] h1, ' +
            '[data-tid="app-layout-area--mid-nav"] h2, ' +
            '[data-tid="app-layout-area--mid-nav"] h3'
          ),
        ].map((element) => ({
          tag: element.localName,
          dataTid:
            /^[A-Za-z][A-Za-z_-]{0,63}$/.test(
              element.getAttribute("data-tid") || ""
            )
              ? element.getAttribute("data-tid")
              : null,
          fluentClasses: [...element.classList].filter((value) =>
            /^fui-[A-Za-z]+$/.test(value)
          ),
        }));
        const parseRgb = (value) => {
          const match = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/
            .exec(value);
          return match
            ? {
              rgb: match.slice(1, 4).map(Number),
              alpha: match[4] === undefined ? 1 : Number(match[4]),
            }
            : null;
        };
        const luminance = (rgb) => {
          const channels = rgb.map((value) => {
            value /= 255;
            return value <= 0.04045
              ? value / 12.92
              : ((value + 0.055) / 1.055) ** 2.4;
          });
          return (
            0.2126 * channels[0] +
            0.7152 * channels[1] +
            0.0722 * channels[2]
          );
        };
        const contrast = (first, second) => {
          const a = luminance(first);
          const b = luminance(second);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        };
        const contrastIssues = {};
        for (const element of document.querySelectorAll("body *")) {
          if (!visible(element)) continue;
          if (
            ![...element.childNodes].some(
              (node) =>
                node.nodeType === Node.TEXT_NODE &&
                node.textContent.trim()
            )
          ) {
            continue;
          }
          const foregroundValue = getComputedStyle(element).color;
          const foreground = parseRgb(foregroundValue);
          if (!foreground) continue;
          let backgroundElement = element;
          let backgroundValue = null;
          let background = null;
          while (backgroundElement && !background) {
            backgroundValue = getComputedStyle(backgroundElement)
              .backgroundColor;
            const candidate = parseRgb(backgroundValue);
            if (candidate && candidate.alpha >= 0.95) {
              background = candidate;
              break;
            }
            backgroundElement = backgroundElement.parentElement;
          }
          if (!background) continue;
          const ratio = contrast(foreground.rgb, background.rgb);
          if (ratio >= 4.5) continue;
          const dataTid = element.getAttribute("data-tid");
          const ancestors = [];
          let ancestor = element.parentElement;
          for (let depth = 0; ancestor && depth < 8; depth += 1) {
            const ancestorTid = ancestor.getAttribute("data-tid");
            ancestors.push({
              tag: ancestor.localName,
              dataTid:
                ancestorTid &&
                /^[A-Za-z][A-Za-z_-]{0,63}$/.test(ancestorTid)
                  ? ancestorTid
                  : null,
              fluentClasses: [...ancestor.classList].filter((value) =>
                /^fui-[A-Za-z]+$/.test(value)
              ),
            });
            ancestor = ancestor.parentElement;
          }
          const signature = JSON.stringify({
            tag: element.localName,
            role: element.getAttribute("role") || null,
            dataTid:
              dataTid && /^[A-Za-z][A-Za-z_-]{0,63}$/.test(dataTid)
                ? dataTid
                : null,
            fluentClasses: [...element.classList].filter((value) =>
              /^fui-[A-Za-z]+$/.test(value)
            ),
            foreground: foregroundValue,
            background: backgroundValue,
            ratio: Math.round(ratio * 100) / 100,
            bounds: (() => {
              const box = element.getBoundingClientRect();
              return {
                x: Math.round(box.x),
                y: Math.round(box.y),
                width: Math.round(box.width),
                height: Math.round(box.height),
              };
            })(),
            ancestors,
          });
          contrastIssues[signature] =
            (contrastIssues[signature] || 0) + 1;
        }
        const computedStyles = {};
        for (const [name, selector] of Object.entries(probes)) {
          const element = document.querySelector(selector);
          if (!element) {
            computedStyles[name] = { matches: 0 };
            continue;
          }
          const styles = getComputedStyle(element);
          computedStyles[name] = {
            matches: document.querySelectorAll(selector).length,
            values: Object.fromEntries(
              properties.map((property) => [
                property,
                styles.getPropertyValue(property),
              ])
            ),
          };
        }
        return {
          selectors: output,
          safeDataTidCounts,
          roleCounts,
          fluentClassCounts,
          computedStyles,
          structures,
          treeItemStates,
          midNavHeadings,
          viewport: {
            devicePixelRatio: globalThis.devicePixelRatio,
            scale: globalThis.visualViewport?.scale ?? 1,
            width: globalThis.visualViewport?.width ?? globalThis.innerWidth,
            height: globalThis.visualViewport?.height ?? globalThis.innerHeight,
          },
          contrastIssues,
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
      }, {
        groups: GROUPS,
        probes: STYLE_PROBES,
        properties: STYLE_PROPERTIES,
      });
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
