const fs = require("node:fs");
const { resolveTheme } = require("./themes");
const { isTeamsHost } = require("../helpers/teamsHosts");

const cssCache = new Map();

function isTeamsContentUrl(value) {
  try {
    const url = new URL(value);
    if (
      process.env.E2E_TESTING === "true" &&
      (url.protocol === "file:" || url.protocol === "about:")
    ) {
      return true;
    }
    return url.protocol === "https:" && isTeamsHost(url.hostname);
  } catch {
    return false;
  }
}

function readCss(cssLocation) {
  if (!cssCache.has(cssLocation)) {
    cssCache.set(
      cssLocation,
      fs.promises.readFile(cssLocation, "utf8").catch((error) => {
        cssCache.delete(cssLocation);
        throw error;
      })
    );
  }
  return cssCache.get(cssLocation);
}

exports.onDidFinishLoad = async function onDidFinishLoad(
  content,
  config,
  customCssLocation = resolveTheme(config)
) {
  if (customCssLocation && isTeamsContentUrl(content.getURL?.())) {
    await applyCustomCSSToContent(content, customCssLocation);
  }
  await content.insertCSS(
    "#download-mobile-app-button, #download-app-button, #get-app-button { display:none; }"
  ).catch(() => {});
  await content.insertCSS(
    ".zoetrope { animation-iteration-count: 1 !important; }"
  ).catch(() => {});
};

exports.onDidFrameFinishLoad = async function onDidFrameFinishLoad(
  webFrame,
  config,
  customCssLocation = resolveTheme(config)
) {
  if (
    customCssLocation &&
    webFrame &&
    isTeamsContentUrl(webFrame.url)
  ) {
    await applyCustomCSSToFrame(webFrame, customCssLocation);
  }
};

async function applyCustomCSSToContent(content, cssLocation) {
  try {
    const data = await readCss(cssLocation);
    await content.insertCSS(data);
  } catch {
    console.warn("[customCSS] Unable to apply the selected theme.");
  }
}

/**
 * Applies custom CSS to iframe-based content for Teams V2.
 * Teams V2 uses iframes for the main view where content.insertCSS() doesn't work,
 * so we inject <style> elements directly into the DOM using JavaScript execution.
 * This is a workaround for iframe CSS isolation in Electron.
 *
 * @param {Electron.WebFrameMain} webFrame - The iframe's web frame
 * @param {string} cssLocation - Path to the CSS file to inject
 */
async function applyCustomCSSToFrame(webFrame, cssLocation) {
  const customCssId = "tfl-custom-css-style";

  try {
    let data = await readCss(cssLocation);
    data = data.replaceAll("`", String.raw`\u0060`);

    await webFrame.executeJavaScript(`
			if(!document.getElementById("${customCssId}")) {
				const style = document.createElement('style');
				style.id = "${customCssId}";
				style.type = "text/css";
				style.textContent = ${JSON.stringify(data)};
				document.head.appendChild(style);
			}
		`);
  } catch {
    // Sandboxed about:blank frames, disposed frames and unreadable user theme
    // files are expected failure modes. Never log their URL or filesystem path.
    console.debug("[customCSS] Theme injection skipped.");
  }
}

exports._clearCacheForTests = () => cssCache.clear();
exports._isTeamsContentUrlForTests = isTeamsContentUrl;
