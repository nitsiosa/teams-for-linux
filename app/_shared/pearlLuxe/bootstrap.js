// Applies a main-process validated wrapper color-mode override before body
// content is parsed. "auto" deliberately falls through to prefers-color-scheme.
const mode = new URLSearchParams(globalThis.location.search).get(
  "pearlTheme"
);
if (mode === "light" || mode === "dark") {
  document.documentElement.dataset.pearlTheme = mode;
}
