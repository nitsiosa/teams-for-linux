# Verified upstream background and research links

Checked 20 October 2026. These are **research snapshots**, not a substitute for reviewing the current checked-out upstream HEAD and issue states in Cursor.

## Canonical upstream

- Repository: https://github.com/IsmaelMartinez/teams-for-linux
- Licence: `GPL-3.0-or-later` (`LICENSE.md` and `package.json`) — preserve attribution and comply with distribution requirements.
- `package.json` read from upstream `main` reported version **2.27.0**, Electron **44.9.0**. Don't assume a future checkout matches.
- Repo has lint (`npm run lint`), node test runner (`npm run test:unit`), Playwright E2E (`npm run test:e2e`), and `.deb` packaging (`npm run dist:linux:deb`). Follow repo `.nvmrc` and `package-lock.json` with `npm ci`.
- Source structure: `app/index.js`, `app/startup/`, `app/mainAppWindow/`, `app/screenSharing/`, `app/browser/tools/`, tests and `docs-site/docs/`.
- Important upstream `CLAUDE.md` guidance: code style, logging PII minimisation; `AppConfiguration` option handling; IPC allowlist; generate docs when schema/IPC changes; Node unit tests are DOM-free.
- Security notice in README: some Electron context isolation/sandbox features are disabled for injected DOM access. **Do not extend this risky model, and request a security review before enterprise deployment.**

## Wayland / PipeWire facts and historical cases

- Default Linux packaging has historically passed `--ozone-platform=x11` in `build.linux.executableArgs`; snap also. For desktop launched in Wayland, XWayland full-desktop sharing can be black. Project troubleshooting notes explicit `--ozone-platform=wayland` override; also documents native Wayland renderer regressions and X11 fallbacks.
- `WebRTCPipeWireCapturer` is set by upstream default feature flag logic for Wayland unless manually replaced. Be careful not to override default `--enable-features`/`--disable-features` without retaining necessary components.
- Issue #2713: PipeWire desktopCapturer source IDs differed after a second `getSources()` call; described potential stale source selection. Observed `--ozone-platform=wayland` workaround. Check upstream HEAD before claiming unresolved.
- Issue #2551: Snap confinement on Ubuntu GNOME Wayland broke portal-based sharing; same-version `.deb` reported working. Therefore `.deb` first.
- Issue #2707: portal selector not appearing in older configurations. Check current status.
- Issues #2486, PR #2506: prior work on removing X11 forcing in some packaging surfaces; inspect actual HEAD.
- Issue #3066: XWayland capture of complete Wayland desktop reported black; verify current disposition.
- For native Wayland blank window, upstream docs note potential Electron regressions; rollback switch `--ozone-platform=x11` may restore UI but can lose full-desktop capture. This must be reported as a tradeoff, not P0 success.

## Research links

- https://github.com/IsmaelMartinez/teams-for-linux/blob/main/package.json
- https://github.com/IsmaelMartinez/teams-for-linux/blob/main/CLAUDE.md
- https://github.com/IsmaelMartinez/teams-for-linux/blob/main/CONTRIBUTING.md
- https://github.com/IsmaelMartinez/teams-for-linux/blob/main/docs-site/docs/configuration.md
- https://github.com/IsmaelMartinez/teams-for-linux/blob/main/docs-site/docs/troubleshooting.md
- https://github.com/IsmaelMartinez/teams-for-linux/issues/2713
- https://github.com/IsmaelMartinez/teams-for-linux/issues/2707
- https://github.com/IsmaelMartinez/teams-for-linux/issues/2551
- https://github.com/IsmaelMartinez/teams-for-linux/issues/2486
- https://github.com/IsmaelMartinez/teams-for-linux/pull/2506
- https://github.com/IsmaelMartinez/teams-for-linux/issues/3066
- https://rea.tools (REA optional, never a dependency to unblock baseline)

## Product / enterprise policy

Existing Teams-for-Linux is an unofficial wrapper, not a vendor-backed Microsoft Linux desktop client. Use authorised sign-in, documented Microsoft endpoints and browser APIs. Corporate Conditional Access may prevent use until approved. Do not attempt to evade it; demonstrate on permitted accounts first, then request formal authorisation. Don't assume media compatibility across every Teams tenant, GNOME version and GPU until live-tested.

## Contributions

- Keep patches focused, reproducible and generic for upstream PRs: portal/screen source correctness, docs, tests, packaging launch mode only where compatibility justified.
- Avoid proprietary assets and trademarks beyond descriptive interoperability usage.
- GPL-3.0-or-later terms apply when distributing modifications; preserve licence and source availability obligations. A company-private prototype's compliance should be reviewed separately before distribution.
