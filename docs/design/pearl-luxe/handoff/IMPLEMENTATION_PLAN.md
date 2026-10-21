# Implementation plan

Repo paths are relative to the Teams for Linux repository root.

## 1. Selector audit (do first)
- Run the app in your own local signed-in session, open DevTools on the main view and the Teams iframe. Record only selectors and attribute names in `SELECTORS.md`, never message text, names or screenshots of real content.
- Confirm Teams v2 exposes Fluent v9 variables (`--colorNeutralBackground1` etc.) on `.fui-FluentProvider*` elements. If names differ, update Layer 1 in `theme/pearl-luxe/theme.css`.
- For every rule marked `VERIFY` in Layer 2, find the real selector (prefer `data-tid`, `role`, `aria-*`; avoid hashed class names). Replace or delete each one. Record findings in `SELECTORS.md`.
- Toggle Teams Settings → Appearance between Light and Dark and note which class/attribute changes on `<html>`/`<body>`. Put it in the dark-marker block at the top of `theme/pearl-luxe/theme.css`.
- **Accept:** no `VERIFY` markers left; each region in DESIGN_SPEC.md visibly themed in both Light and Night.

## 2. Ship as a built-in theme
- Add `app/assets/css/pearlLuxe.css` (from audited `theme/pearl-luxe/theme.css`, auto light/dark) and `app/assets/css/pearlLuxeNight.css` (from `theme/pearl-luxe-night/theme.css`). Generate both from one source so the layers never drift (a tiny build script or a shared partial is fine).
- Register `{ id: "pearlLuxe", name: "Pearl Luxe" }` and `{ id: "pearlLuxeNight", name: "Pearl Luxe Night" }` in `BUILTIN_THEMES` in `app/customCSS/themes.js`.
- Add both IDs to the `customCSSName` / `appearance.cssName` descriptions in `app/config/options.js`. Do not change any default value.
- Document it in `docs-site/docs/configuration.md` (Theming & Appearance) and `app/customCSS/README.md`.
- **Accept:** theme appears under Settings → Theme → Built-in; existing themes and `custom:<id>` themes still work; unit tests for `themes.js` updated.

## 3. Fonts
- Test the `@import` of Google Fonts inside the Teams frame. If CSP blocks it, remove the import and rely on the fallback stacks (Georgia / Ubuntu). Do not loosen any CSP or session permissions to make fonts load.

## 4. Secondary profiles
- Confirm the theme is injected into secondary profile views (brief item 7). If not, route them through the same `customCSS.onDidFinishLoad` / `onDidFrameFinishLoad` path. No new IPC.

## 5. Optional: wrapper-owned dialogs
- Reuse `tokens/pearl-luxe.tokens.css` for Add Profile, Manage Profiles and Join Meeting only when the user chooses Pearl Luxe, via a shared stylesheet. Do not merge their security boundaries.

## 6. Verify
- Screenshots at 1440×900 and 800×600, Light and Night, with fictional data only: chat list, conversation, menus, a dialog.
- With `appearance.followSystemTheme` on, switch the OS between light and dark and confirm Pearl Luxe follows after the documented restart.
- Keyboard pass: focus ring visible on rail, list, tabs, composer, buttons.
- Check calls/meetings and screen share are untouched.
