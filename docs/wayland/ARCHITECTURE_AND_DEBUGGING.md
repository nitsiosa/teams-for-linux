# Architecture and diagnostic guide

## Trust boundaries and media flow

```text
Teams web UI inside Electron BrowserWindow
  -> Chromium WebRTC APIs (getUserMedia, getDisplayMedia)
  -> native Wayland session backend (Ozone)
  -> xdg-desktop-portal ScreenCast chooser (user consent)
  -> PipeWire stream / WirePlumber routing
  -> Chromium WebRTC encoder
  -> Microsoft Teams meeting infrastructure
  -> second participant
```

Incoming share uses the reverse media path (remote stream -> Chromium render -> Linux GPU/compositor). Don't conflate incoming share rendering faults with outbound capture faults.

## Examine actual code before patches

Current upstream source layout (verify against local checkout):
- `app/index.js` — main Electron lifecycle.
- `app/startup/` — launch switches and readiness.
- `app/mainAppWindow/` — BrowserWindow construction and Teams web wrapper.
- `app/screenSharing/` — StreamSelector, source selection and display media behavior.
- `app/browser/tools/` — scripts injected into Teams web client.
- `app/config/options.js`, `app/appConfiguration/` — config schema and runtime config.
- `app/security/ipcValidator.js` — IPC allowlist.
- `tests/unit/`, `tests/e2e/`, `playwright.config.js` — existing test mechanisms.

Search with `rg -n 'setDisplayMediaRequestHandler|desktopCapturer|getDisplayMedia|StreamSelector|screenShar|ozone-platform|WebRTCPipeWireCapturer' app package.json tests`.

## Diagnosing layers in order

1. **Launcher backend:** `XDG_SESSION_TYPE=wayland` proves the *desktop session*, not Electron's backend. Inspect `.desktop` Exec args, process command line (avoid copying sensitive args), ozone flags, Chromium logs. Package may force `--ozone-platform=x11`, which runs via XWayland.
2. **Portal availability:** check `xdg-desktop-portal` and suitable GNOME/KDE/wlroots implementation, D-Bus session and `org.freedesktop.portal.ScreenCast` path. Never start capture without explicit user initiation.
3. **PipeWire graph:** check user-level PipeWire/WirePlumber service states and capture stream creation at time of opt-in test; do not reset unrelated streams.
4. **Source selection identity:** on PipeWire, `desktopCapturer.getSources()` can yield IDs tied to the capture session; a new query can invalidate a previously selected ID. Preserve valid source objects and lifecycle where compatible with Electron's handler contract. See historical issue #2713.
5. **Encoder/render:** if portal offers correct window/screen but peer sees black, distinguish compositor capture vs encoder failure vs Teams-side handling; test with the same account in Chrome/Edge as a control, if permitted.
6. **Incoming share:** focus on rendering/GPU issues, not capture source selection. Test display of both presentations and camera feed.

## Useful commands (read-only)

```bash
echo "$XDG_SESSION_TYPE"
echo "${XDG_CURRENT_DESKTOP:-unknown}"
systemctl --user is-active pipewire wireplumber xdg-desktop-portal || true
command -v xdg-desktop-portal || true
rg -n 'ozone-platform|executableArgs|WebRTCPipeWireCapturer' package.json app
bash scripts/wayland-preflight.sh
```

To launch installed `.deb` in native Wayland manually (verify executable name and packaging first):

```bash
teams-for-linux --ozone-platform=wayland
```

Upstream's Chromium feature defaults may already include `WebRTCPipeWireCapturer`; adding conflicting custom `--enable-features` / `--disable-features` may **replace** useful defaults. Avoid cargo-culting flags; consult `docs-site/docs/configuration.md` first.

## Test technique

For units, use upstream Node `node:test` + mocks; don't presume a DOM. Use upstream Playwright/Electron fixture for non-auth GUI. Real portal streaming and Teams live meetings require an actual desktop and two participants: test in consent-driven manual E2E; do not fabricate an automated green result. Keep any test video synthetic/non-sensitive.

## Constraints

- Don't switch to Xorg, change the user's desktop session, or rebuild Teams protocol as a workaround.
- Don't request blanket accessibility, remote-control or unattended screen-capture privileges.
- Keep security-sensitive logs redacted and local; don't capture traffic containing auth tokens.
- Do not assume `--ozone-platform=wayland` is universally stable; document `x11` fallback with limitation that full Wayland-desktop capture may not work.
