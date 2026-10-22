"use strict";

const { pathToFileURL } = require("node:url");

let wrapperMode = "auto";

function setWrapperThemeMode(config) {
  const cssName = Object.hasOwn(config ?? {}, "customCSSName")
    ? config.customCSSName
    : config?.appearance?.cssName;
  wrapperMode = cssName === "pearlLuxeNight" ? "dark" : "auto";
}

function getWrapperThemeMode() {
  return wrapperMode;
}

// Forced Night must also switch Teams to its dark theme: the app-wide token
// remap sits over Teams colours that are hard-coded per Teams theme.
function teamsUsesDark(systemUsesDark) {
  return wrapperMode === "dark" || Boolean(systemUsesDark);
}

function withPearlLuxeQuery(options = {}) {
  return {
    ...options,
    query: {
      ...(options.query ?? {}),
      pearlTheme: wrapperMode,
    },
  };
}

function fileUrl(file) {
  const url = pathToFileURL(file);
  url.searchParams.set("pearlTheme", wrapperMode);
  return url.toString();
}

module.exports = {
  fileUrl,
  getWrapperThemeMode,
  setWrapperThemeMode,
  teamsUsesDark,
  withPearlLuxeQuery,
};
