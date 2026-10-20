# Cursor execution ledger (update during implementation)

Keep this file terse and current. Statuses are evidence-based: NOT RUN and BLOCKED are not PASS.

## Environment / checkout

- Date: 2026-10-20
- `origin`: https://github.com/nitsiosa/teams-for-linux (fork)
- `upstream`: https://github.com/IsmaelMartinez/teams-for-linux
- Branch / upstream commit SHA: `feat/ubuntu-wayland-media` at `39ac73bb0e8f113fabc8b30aed980fc12ca1166f` (`v2.27.0-1-g39ac73bb`), equal to `upstream/main` and `origin/main` per `git ls-remote` on 2026-10-20. Branch not pushed. Working tree holds only the untracked kit files (`.cursor/`, `CURSOR_START_HERE.md`, `docs/wayland/`, `scripts/validate-wayland.sh`, `scripts/wayland-preflight.sh`); build and test output is gitignored.
- Package: `teams-for-linux` 2.27.0 (GPL-3.0-or-later), Electron 44.9.0, electron-builder 26.15.7, @playwright/test 1.64.1.
- Node/npm: Node v24.22.0 and npm 11.19.1 from the official tarball (SHA-256 verified) in `~/.local/opt/node-v24.22.0-linux-x64`, not on the default `PATH`. Agent shells prefix `PATH="$HOME/.local/opt/node-v24.22.0-linux-x64/bin:$PATH"`.
- Agent shell quirks: Cursor exports `ELECTRON_RUN_AS_NODE=1`, which turns the Electron binary into plain Node, so prefix anything that launches Electron with `env -u ELECTRON_RUN_AS_NODE`. npm warns about an unknown `devdir` env config (`npm_config_devdir`); harmless.
- Electron sandbox from the checkout: `node_modules/electron/dist/chrome-sandbox` is not setuid root and `kernel.apparmor_restrict_unprivileged_userns=1`, so Electron started from the checkout (or `dist/linux-unpacked`) aborts with `FATAL:sandbox/linux/suid/client/setuid_sandbox_host.cc:166` (exit 133, SIGTRAP). The installed `.deb` avoids this through its AppArmor profile. Upstream CI runs E2E and the packaged smoke test with `--no-sandbox`; local E2E and source launches here do the same (user-approved 2026-10-20, test processes only), so sandboxed behaviour is only exercised by the installed `.deb`.
- Git identity: configured in the repository's `.git/config` (2026-10-20).
- Ubuntu release, kernel, desktop/compositor: Ubuntu 24.04.2 LTS, kernel 7.0.0-31-generic, `XDG_CURRENT_DESKTOP=ubuntu:GNOME`.
- `XDG_SESSION_TYPE`: `wayland` (`WAYLAND_DISPLAY` set).
- Portal/PipeWire/WirePlumber preflight (`bash scripts/wayland-preflight.sh`, 2026-10-20):

  | Component | Version | User service |
  |---|---|---|
  | pipewire | 1.0.5-1ubuntu3.3 | active |
  | wireplumber | 0.4.17-1ubuntu4 | active |
  | xdg-desktop-portal | 1.18.4-1ubuntu2.24.04.3 | active |
  | xdg-desktop-portal-gnome | 46.2-0ubuntu1 | active |
  | xdg-desktop-portal-gtk | 1.15.1-1build2 | active |
  | xdg-desktop-portal-kde, -wlr | not installed | inactive |

  The script reports `xdg-desktop-portal not in PATH` because the binary lives in `/usr/libexec`; dpkg and systemd confirm it is installed and running. Inside the agent sandbox every service reads `unknown`, so run the script unsandboxed. Not installed: `teams-for-linux`, `pactl`, `xvfb-run`. Present: `pw-cli`, `gh`, `dpkg-deb`, `make`, `g++`, `python3`.

## Automated gates

| Gate | Status (NOT RUN/PASS/FAIL/BLOCKED) | Command | Evidence/failure reason |
|---|---|---|---|
| Install dependencies | PASS | `npm ci --ignore-scripts`, then `node node_modules/electron/install.js` and `npm run postinstall` (CI parity) | 475 packages; Electron 44.9.0 binary; `cbor-extract` rebuilt for Electron. Install scripts skipped by `--ignore-scripts`: `cbor-extract` (optional native accelerator for `cbor-x`) and `electron-winstaller` (Windows only) |
| Lint | PASS | `npm run lint` | Exit 0, no findings |
| Config docs drift (CI parity) | PASS | `npm run generate-config-docs` then `git diff --quiet` on the generated files | 85 options, no diff |
| Dependency audit (CI parity) | PASS | `npm audit --audit-level=critical` | 0 critical. 8 moderate, all in the electron-builder toolchain (`roarr` → `global-agent` → `@electron/get` → `app-builder-lib`); pre-existing on HEAD |
| Unit tests | PASS | `npm run test:unit` | 1029 tests in 164 suites: 1028 pass, 0 fail, 1 skipped (Flatpak case that only runs off Linux); 4.8 s |
| E2E | PASS | `env -u ELECTRON_RUN_AS_NODE CI=1 npm run test:e2e -- --retries=0` | 17 passed, 0 failed, retries disabled, 2.4 min. Ran on the live GNOME Wayland desktop (no `xvfb-run`); `CI=1` adds `--no-sandbox` to test launches. The harness printed "Process cleanup: Close timeout" once during the smoke test without failing it |
| Build .deb | PASS | `npm run generate-release-info`, then `npx electron-builder --x64 -l deb --publish never` | `dist/teams-for-linux_2.27.0_amd64.deb`, 103,317,920 bytes, SHA-256 `81e33cb9cc2bb40e708e9ceebefe2ba517e81fb89aeb82b9f1390c31d6c8a70d`, built in about 225 s. x64 only; `npm run dist:linux:deb` also builds arm64 |
| Package inspect | PASS | `dpkg-deb -I`, `dpkg-deb -c`, control scripts | See "Baseline package" below |
| Wayland launcher | NOT RUN | documented runtime check | Phase 1: second `.deb` desktop entry proposed, awaiting packaging approval |
| Screen source regression tests | NOT RUN | target test | Phase 2 |

## Phase 0 baseline and gap analysis (HEAD `39ac73bb`)

| Area | State on current main | Evidence | Consequence for this fork |
|---|---|---|---|
| Packaged ozone default | deb, rpm and AppImage `Exec=` lines carry `--ozone-platform=x11` from `build.linux.executableArgs`; snap has its own block | `package.json`; ADR-031 (accepted 2026-09-05); built `.desktop` entry | The shipped `.deb` runs under XWayland on this host, where whole-screen capture is black (`troubleshooting.md`, "Sharing the whole screen shows black under XWayland"). Only a real argv flag selects native Wayland; `electronCLIFlags` cannot. Upstream will not flip the default without the ADR-031 reopen evidence, so the fork needs a separate native-Wayland launch path with X11 kept as fallback (Phase 1; packaging changes need separate approval). |
| Native-Wayland switches | With `XDG_SESSION_TYPE=wayland`: adds `WebRTCPipeWireCapturer` unless the user set `enable-features`; treats the session as XWayland only when `--ozone-platform=x11` is explicit; otherwise disables the GPU (unless `disableGpu` is set explicitly) and appends `use-fake-ui-for-media-stream` | `app/startup/commandLine.js` `#configureWayland` | Native Wayland today means GPU off plus fake media UI. No unit test covers this branch; `tests/unit/commandLine.test.js` has a mock `app.commandLine` harness to extend. |
| #2713 stale PipeWire source IDs | Fixed by #2755 (`82d29502`, shipped in 2.17.0): the picker's source goes straight to the `setDisplayMediaRequestHandler` callback. Issue closed 2026-09-06 | `app/mainAppWindow/index.js` `handleScreenSourceSelection`; `app/screenSharing/README.md`, "Single enumeration rule" | Do not re-implement. No unit regression test found; only the authenticated E2E spec calls `getSources`. |
| #2871 portal chooser blocked on native Wayland | Not fixed in code; closed for inactivity 2026-09-18. Maintainer agreed `use-fake-ui-for-media-stream` is the cause, but dropping it alone brings back #2217 (portal chooser plus in-app picker, selection dead) | Issue comments 2026-08-18 and 2026-08-23; switch still appended on HEAD | Primary Phase 2 target. Reproduce on native Wayland before patching. |
| PR #2872 "Fix Ubuntu Wayland screen sharing" | Open, stale, conflicts with main | Maintainer comment 2026-08-19 asks only for "the `commandLine.js` gating, the native-Wayland handler and your tests, behind one flag covering both the switch and the handler" | Upstream's stated shape for Phase 2. Re-implement against HEAD with tests rather than copying the stale branch; credit the author for any derived code. |
| #3066 camera off, share broken | Open. Snap under XWayland with `xwaylandOptimizations`: whole-screen black is the XWayland limit; windows intermittently missing from the picker | Issue comments 2026-10-09 to 2026-10-15 | XWayland is a fallback only, not a P0 path for full-desktop share. |
| PR #2506 and #2601 (drop the ozone default) | #2506 merged and reverted the same day (#2600); #2601 closed after a native-Wayland multi-monitor fullscreen regression | ADR-031 | The native-Wayland path must keep the X11 fallback; cover multi-monitor fullscreen in L-09. |
| #2707, #2551, #2486 | Closed as completed (2026-07-24, 2026-05-27, 2026-05-29) | GitHub API | #2551 (snap confinement) supports `.deb` first. No action. |
| GPU on Wayland sessions | Disabled by default in both native Wayland and XWayland mode, unless `disableGpu` is set explicitly or, under XWayland only, `wayland.xwaylandOptimizations` is on | `commandLine.js`; both baseline launch logs; `troubleshooting.md`, "Audio/video lag during calls on Wayland" | Phase 3 risk for camera and incoming share; change only behind evidence and a gate. |
| `useSystemPicker` | Rejected for Linux | ADR-008 | The portal path comes from Chromium's PipeWire capturer, not Electron's system picker. |

Baseline package (`dist/teams-for-linux_2.27.0_amd64.deb`):

- `.desktop`: `Exec=/opt/teams-for-linux/teams-for-linux --ozone-platform=x11 %U`, `StartupWMClass=teams-for-linux`, `Icon=teams-for-linux`, `MimeType=x-scheme-handler/msteams;`.
- `postinst`: registers `/usr/bin/teams-for-linux` through update-alternatives; sets `chrome-sandbox` to 0755 when unprivileged user namespaces work (4755 otherwise); on AppArmor systems that accept ABI 4.0 it installs and loads `/etc/apparmor.d/teams-for-linux`, an unconfined profile granting `userns` to `/opt/teams-for-linux/teams-for-linux`. `postrm` undoes both.
- Depends and Recommends match `package.json`; Installed-Size 308,180 KiB.
- electron-builder warns that `desktopName` is unset, so desktops may not link running windows to the `.desktop` entry (matters for native Wayland `app_id`).
- Phase 1 constraint: the AppArmor profile attaches by exec path, so any native-Wayland launcher must exec `/opt/teams-for-linux/teams-for-linux` itself to keep the Chromium sandbox working.

Baseline launch from source (2026-10-20), each run `env -u ELECTRON_RUN_AS_NODE WAYLAND_DEBUG=client E2E_USER_DATA_DIR=<temp> timeout 60 node_modules/electron/dist/electron ./app --no-sandbox --ozone-platform=<x11|wayland>`:

| Launch flag | Effective backend | Runtime evidence | Startup |
|---|---|---|---|
| `--ozone-platform=x11` (shipped default) | X11 through XWayland | 2 X11 windows with WM_CLASS `teams-for-linux` about 30 s in (`xwininfo -root -tree`); 0 Wayland protocol messages | Still running at 60 s (timeout exit 124); Teams navigation finished in 2.0 s; no fatal or error lines |
| `--ozone-platform=wayland` | Native Wayland | 0 X11 windows about 44 s in; 22 `xdg_toplevel` and 12 `zwp_linux_dmabuf` protocol messages | Still running at 60 s (timeout exit 124); Teams navigation finished in 2.4 s; no fatal or error lines |

Both runs logged `[Wayland] Enabling PipeWire for screen sharing` and `[Wayland] Disabling GPU composition (default)`. Window content was not visually checked (no screenshot), so "not blank" is unverified. Observing whether a share request reaches `org.freedesktop.portal.ScreenCast` needs an interactive share: NOT RUN, planned for the Phase 2 probe and the human checklist. Temporary profiles and raw logs were deleted after extracting the evidence above.

## Live tests (requires human)

| IDs | Status | Notes / date |
|---|---|---|
| L-01 through L-12 | NOT RUN | Do not mark PASS without two-person meeting observation. |

## Active work items

- [x] Phase 0 baseline: environment, upstream triage, install, lint, config docs, audit, unit, E2E, `.deb` build, package inspection and launch baseline
- [ ] Phase 1 launch: characterization tests for the Wayland switches committed. Proposed, awaiting packaging approval: a second `.deb` desktop entry, "Teams for Linux (Wayland)", that runs `/opt/teams-for-linux/teams-for-linux --ozone-platform=wayland %U`, added through `build.deb.fpm`; the default entry keeps `--ozone-platform=x11` (ADR-031) as the fallback, and rpm, AppImage, snap and tar.gz are untouched
- [ ] Phase 2 screen capture
- [ ] Phase 3 media/receive/UX
- [ ] Phase 4 package/review

## Completed patches / commits

| Commit | Change | Test evidence |
|---|---|---|
| `6d18be9b` | Kit committed exactly as delivered (fork-internal; drop before upstream PRs) | Docs only; lint and unit tests pass on this tree |
| `8a9b1a17` | Phase 0 baseline evidence in `PROGRESS.md` and `DECISIONS.md` | Docs only |
| `9e58d2b4` | Eight characterization tests for `CommandLineManager`'s Wayland switch selection | Unit: 1037 tests, 1036 pass, 0 fail, 1 skipped; lint pass. E2E not rerun (unit-test-only change) |

## Known failures and blockers

| Issue | Severity | Reproduction | Evidence | Next action |
|---|---|---|---|---|
| Electron from the checkout cannot start with the Chromium sandbox | Worked around for local tests; not a product defect (the installed `.deb` ships an AppArmor profile) | `env -u ELECTRON_RUN_AS_NODE node_modules/electron/dist/electron --version` | `FATAL ... setuid_sandbox_host.cc:166`, exit 133; `kernel.apparmor_restrict_unprivileged_userns=1` | Local E2E and source launches use `--no-sandbox` (approved); check sandboxed behaviour on the installed `.deb` |
## Build artifact and human acceptance handoff

- `.deb` path: `dist/teams-for-linux_2.27.0_amd64.deb` (unmodified upstream baseline, not a release candidate)
- SHA-256: `81e33cb9cc2bb40e708e9ceebefe2ba517e81fb89aeb82b9f1390c31d6c8a70d`
- Native Wayland invocation / installed desktop entry:
- X11 fallback invocation and limitations:
- Redacted error logs:
- User action required (one consolidated request):
- Ready for upstream PR review? NO
