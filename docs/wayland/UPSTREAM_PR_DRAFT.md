# Upstream contribution plan and draft (not opened)

The full fork branch `feat/ubuntu-wayland-media` is pushed to
`nitsiosa/teams-for-linux`. Nothing has been opened as a pull request. The
focused upstream branches described below have not been created or pushed;
opening any upstream PR still needs the user's approval, followed by remote CI
and review checks.

## How the branch splits

| Group | Commits | Upstream? |
|---|---|---|
| Portal picker and diagnostics | `9e58d2b4` (Wayland switch tests), `cf91da0a` (`wayland.portalPicker`), `0d6748b8` (startup diagnostics) | Yes: generic, opt-in, the shape the maintainer asked for in the #2872 review |
| Wayland launcher in the `.deb` | `2c9cc7dd`, `9d557739` | Ask first in an issue: it leaves the ADR-031 default alone but adds a second launcher, which is a packaging policy decision |
| Screen-sharing probe | `abc2e712`, `3724a152`, `260383c7`, `7add29c2` | Optional: answers the maintainer's question on #2871 about how many portal prompts appear; offer separately |
| Harbour Huddle artwork | `084eca21` | Fork-only branding; do not include in an upstream PR |
| Pearl Luxe default/reskin | `436bc85d`, `95d517f7`, `fb989e39`, `93931589`, `2fffbdda` | Fork-only product/design policy; do not include in the Wayland upstream PR |
| Kit, progress notes, this file | `6d18be9b` and every `docs(wayland)` commit | Never: fork-internal |

To prepare the first PR: branch from `upstream/main`, cherry-pick `9e58d2b4 cf91da0a 0d6748b8`, then run `npm run lint`, `npm run test:unit`, `npm run generate-config-docs` (no diff), `npm run test:e2e` and the docs-site build.

## Draft PR description (first PR)

**Title:** feat(screen-sharing): opt-in xdg-desktop-portal picker for native Wayland

On native Wayland, `--use-fake-ui-for-media-stream` makes `getDisplayMedia` resolve before the user answers the xdg-desktop-portal dialog. Teams receives a stream straight away; if the user cancels the dialog, Teams is left holding a black video track that has already ended instead of a rejected request. Reproduced 2 of 2 times on Ubuntu 24.04 GNOME (portal 1.18.4, PipeWire 1.0.5) running the app with `--ozone-platform=wayland`.

As asked in the #2872 review, one opt-in setting covers both halves. `wayland.portalPicker` (default `false`, native Wayland only):

- skips the fake media UI switch
- binds a display-media handler that calls `desktopCapturer.getSources()` once, which opens the portal dialog, and passes the single picked source to Chromium
- rejects a cancelled dialog, a result with several sources and a request that arrives while the dialog is open

It also adds startup warnings on Wayland sessions when the PipeWire socket, the portal service or a ScreenCast backend is missing, and unit tests for the existing Wayland switch selection.

**Evidence** (manual probe on the same host, frames reduced to brightness numbers):

| Pick | Without the setting | With the setting |
|---|---|---|
| Entire screen | Works; one dialog | Works; one visible dialog, then Chromium's capture session restored silently from a restore token (10-17 ms) |
| Window | Portal reports the window pick; content confirmed under XWayland, inconclusive in the native run | Works; window content confirmed with a solid-colour test window |
| Cancel | `getDisplayMedia` resolves with a dead track | Rejected with `AbortError`, no capture started |

With the setting on, the camera and microphone stayed live through share, stop and cancel. In the default XWayland mode they stayed live through screen and window shares (cancel not measured there). No portal session was left open after any share stopped.

**Testing:** 26 new unit tests (8 for the existing switch selection, 10 for the setting and handler, 8 for the diagnostics); `npm run lint`; config docs regenerated with no drift; docs site builds. On the fork branch `npm run test:unit` gives 1060 tests with 0 failures and `npm run test:e2e` 17 passed; rerun both after cherry-picking.

**Known limitations:** with the setting on, the share track reports `displaySurface: "window"` even for a monitor; cancelling surfaces `AbortError` like the in-app picker's cancel. Teams sometimes calls `getDisplayMedia` more than once per share; sequential calls each open a dialog.

Refs #2871, #2872

## Findings worth reporting upstream

- With `WebRTCPipeWireCapturer` on, capture under XWayland also goes through the portal; whole-screen sharing under XWayland showed real content on this host, contrary to the "black under XWayland" troubleshooting entry.
- xdg-desktop-portal 1.21 and later refuse sessions for app IDs without an installed `.desktop` file (Electron 44 docs); the default app ID `teams-for-linux` matches the packaged entry, but source runs may be refused on newer distributions.
