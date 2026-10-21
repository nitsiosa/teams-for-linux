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
  withPearlLuxeQuery,
};
