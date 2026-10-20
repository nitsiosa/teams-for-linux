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
| Unit tests | PASS | `npm run test:unit` | At `0d6748b8`: 1060 tests, 1059 pass, 0 fail, 1 skipped (Flatpak case that only runs off Linux). Baseline on `39ac73bb`: 1029 tests, 1028 pass, 1 skipped |
| E2E | PASS | `env -u ELECTRON_RUN_AS_NODE CI=1 npm run test:e2e -- --retries=0` | 17 passed, 0 failed, retries disabled, 2.4 min. Ran on the live GNOME Wayland desktop (no `xvfb-run`); `CI=1` adds `--no-sandbox` to test launches. The harness printed "Process cleanup: Close timeout" once during the smoke test without failing it |
| Build .deb | PASS | `rm -f dist/*.deb`, `npm run generate-release-info`, then `npx electron-builder --x64 -l deb --publish never` | At `57d72759`: `dist/teams-for-linux_2.27.0_amd64.deb`, 103,357,740 bytes, SHA-256 `01948528be5c2a3aadb73eb2a8b130a0f3c98bb4cd00f1231f0a0d075ff9259b`, three archive members, 101 files, Installed-Size 308,189 KiB; the Wayland entry passes `--wayland.portalPicker=true` and `app.asar` contains `waylandPrerequisites.js`. At `9d557739`: `dist/teams-for-linux_2.27.0_amd64.deb`, 103,339,924 bytes, SHA-256 `c1f5b439c2b674bb1f882cffb7b892d3f310b72bb7400642a24fb1c4002083ee`, three archive members, 101 files, Installed-Size 308,185 KiB. (A parallel run of this session built into the same file at the same time, producing a 206 MB archive with every member twice; it was deleted and rebuilt. Delete `dist/*.deb` before building and check `ar t` lists exactly `debian-binary control.tar.xz data.tar.xz`.) At `2c9cc7dd`: 103,014,796 bytes, SHA-256 `80796e751a0607a36790d08582000b0ee06cc12e2e47b28f899c95d479b8c722`. Baseline on `39ac73bb`: 103,317,920 bytes, SHA-256 `81e33cb9cc2bb40e708e9ceebefe2ba517e81fb89aeb82b9f1390c31d6c8a70d`. About 225 s per build; x64 only (`npm run dist:linux:deb` also builds arm64) |
| Package inspect | PASS | `dpkg-deb -I`, `dpkg-deb -c`, control scripts, `desktop-file-validate` | See "Baseline package" and "Phase 1 package and launch" below |
| Wayland launcher | PASS (packaged binary); installed launcher NOT RUN | `env -u ELECTRON_RUN_AS_NODE WAYLAND_DEBUG=client E2E_USER_DATA_DIR=<temp> timeout 60 dist/linux-unpacked/teams-for-linux --no-sandbox --ozone-platform=wayland` | Native Wayland: 0 X11 windows about 30 s in, 22 `xdg_toplevel` messages, app_id `teams-for-linux`; still running at 60 s. Since `9d557739` the entry's `Exec` also passes `--wayland.portalPicker=true` (packaged entry identical to the source, `desktop-file-validate` exit 0; parsing of the flag verified against the app's yargs setup). Launching the installed entry from the GNOME menu (sandboxed through AppArmor) needs the `.deb` installed, which needs sudo |
| Screen source regression tests | PASS | `node --test tests/unit/portalPicker.test.js tests/unit/commandLine.test.js` | 7 portal picker handler tests (single source, cancel, several sources, getSources failure, duplicate request, throwing callback, request options) and 3 new switch tests; full unit suite at `cf91da0a`: 1052 tests, 1051 pass, 0 fail, 1 skipped |
| E2E after the Phase 2 and 3 app changes | PASS | `env -u ELECTRON_RUN_AS_NODE CI=1 npm run test:e2e -- --retries=0` | At `260383c7` (includes the `0d6748b8` startup diagnostics): 17 passed, 0 failed, retries disabled, 2.3 min. At `9d557739`: 17 passed, 1.9 min. Live desktop, test processes with `--no-sandbox` (user-approved) |
| Docs site build (CI parity) | PASS | `cd docs-site && npm ci --ignore-scripts && npm run build` | Built at `cf91da0a`; broken-anchor warnings only on the IPC API pages, which this work did not touch |

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

## Phase 1 package and launch (`2c9cc7dd`)

- The `.deb` now ships two desktop entries. `teams-for-linux.desktop` is unchanged (`--ozone-platform=x11 %U`, `MimeType=x-scheme-handler/msteams;`). `teams-for-linux-wayland.desktop` ("Teams for Linux (Wayland)") runs `/opt/teams-for-linux/teams-for-linux --ozone-platform=wayland %U`, has no `MimeType`, and is byte-identical to `build/linux/teams-for-linux-wayland.desktop`.
- 101 files (baseline 100), Installed-Size 308,180 KiB, `postinst` and `postrm` unchanged.
- `desktop-file-validate`: exit 0 with one hint, "Categories contains more than one main category". The default entry carries the same `Chat;Network;Office;` list from `linux.category`.
- Packaged binary from `dist/linux-unpacked` with `--ozone-platform=wayland` (60 s, `--no-sandbox`, throwaway profile): native Wayland (0 X11 windows about 30 s in; 22 `xdg_toplevel`, 12 `zwp_linux_dmabuf` messages); still running at 60 s; Teams navigation finished in 2.3 s; no fatal or error lines; Wayland app_id `teams-for-linux`.
- Not yet verified: the installed entry launched from the GNOME menu with the sandbox on, window content not blank, and behaviour after restart. These need the `.deb` installed (sudo) and a human check.

## Phase 2 screen sharing evidence (probe, 2026-10-20)

`tests/manual/waylandShareProbe.mjs` runs the app from the checkout (`--no-sandbox`, throwaway profile), calls `getDisplayMedia` in the main window, and reads the portal's ScreenCast traffic with `dbus-monitor`. A person answers each dialog; a solid magenta "PICK THIS - TFL probe target" window makes window shares measurable (`targetShare` = magenta fraction of the captured frame). Frames never leave the renderer. Host: two monitors, eDP-1 2256x1504 (primary) and DP-2 3440x1440, so L-09 applies; Chromium sizes captured frames to the largest width and height (3440x1504).

The first two runs were invalid: the probe's `electronApp.evaluate` was blocked by the app's main-process `eval()` guard, so no share request was made and no dialog appeared. Fixed by setting `E2E_TESTING=true` in the probe, which only lifts that guard.

Baseline on `abc2e712` (no Phase 2 code; fake media UI switch on):

| Mode | User pick | Portal | Result |
|---|---|---|---|
| Native Wayland | Entire screen | 1 session; types monitor+window; picked monitor | Real content; magenta window visible as 4% of the frame |
| Native Wayland | A window | 1 session; picked window | Real content without magenta; the user was unsure which window they picked, so inconclusive |
| Native Wayland | Cancel | 1 session; Start answered "cancelled" | **Defect, 2 of 2 runs:** `getDisplayMedia` still resolved, with a black track that ended at once |
| XWayland | Magenta window, 3 times | 1 session each; picked window | Correct window capture through the portal (81% magenta) |
| XWayland | Entire screen, Cancel | | NOT RUN (the user picked the window each time) |

With `wayland.portalPicker: true` at `cf91da0a` (native Wayland):

| User pick | Portal | Result |
|---|---|---|
| Magenta window | 2 sessions: the dialog (answered in 11.5 s), then Chromium's capture session restored silently from a restore token (13 ms) | 78% magenta; one visible dialog |
| Entire screen | 2 sessions: dialog (4.0 s), silent restore (12 ms) | Desktop content, magenta window at 11% |
| Cancel | 1 session; Start answered "cancelled" | `getDisplayMedia` rejected with `AbortError` in 2.4 s; no capture started; app logs `Portal picker ended without a source { reason: 'Failed to get sources.' }` |

In every run the in-app picker never appeared and the main process stayed responsive. Without the setting `getDisplayMedia` resolves before the user picks; with it, only after. Known quirk: with the setting on, the track's `displaySurface` reads "window" even for a monitor pick (without it, "monitor" for everything).

## Phase 3 camera, microphone and cleanup evidence (probe `--camera`, 2026-10-20)

Startup diagnostics (`0d6748b8`) report nothing on this host, which has the PipeWire socket, the portal service and `gnome.portal` with ScreenCast.

Run 1, the Wayland launcher's configuration (native Wayland, `wayland.portalPicker: true`), at `260383c7`:

| Step | Result |
|---|---|
| Camera and microphone | `getUserMedia` granted without the fake media UI switch: 1 video track (640x480) and 1 audio track; video and microphone tracks live, microphone not muted; frames changing |
| Entire screen | Granted; monitor picked; dialog answered in 28.4 s, capture session restored silently in 10 ms; camera still live with changing frames; 0 portal sessions open afterwards |
| Magenta window | Granted; window picked (78% magenta); camera still live; 0 portal sessions open afterwards |
| Cancel | `AbortError` in 1.5 s; camera still live; 0 portal sessions open afterwards |
| End | Both camera tracks stopped; 0 portal sessions open |

So with the portal picker the camera survives share start, stop and cancel (the "camera stops" part of #2871 does not occur), and neither the dialog session nor the capture session outlives the share. An earlier attempt of this run timed out because nobody was at the desk; it showed the portal session stays open while the dialog waits, and the camera stayed live meanwhile.

Run 2, the shipped default (XWayland, fake media UI switch on), with `--camera`, at `838280a3` (19:57 and 20:05; the second run placed the windows side by side and turned the preview thumbnail off):

| Step | Result |
|---|---|
| Camera and microphone | Granted under the fake media UI switch: 640x480, both tracks live, frames changing (no camera crash, cf. #2169) |
| Entire screen (twice) | Granted; monitor picked; one portal session; real content (magenta window visible at 9-11%), not black; camera still live; 0 portal sessions open afterwards |
| Magenta window | Granted; window picked (77% magenta); camera still live with changing frames; 0 portal sessions open afterwards |
| Cancel | NOT RUN. Expected to give the same dead, already-ended track as native Wayland without the portal picker, since the fake media UI switch is on |

Two observations. First, with `WebRTCPipeWireCapturer` on, capture under XWayland goes through the portal, so whole-screen sharing showed real content on this host, contrary to upstream `troubleshooting.md` ("Sharing the whole screen shows black under XWayland"); worth re-checking before relying on either claim. Second, in the 19:57 run a second share dialog disappeared behind other windows when clicked (the always-on-top preview thumbnail and stacked windows were up), and the request then timed out; watch for this in L-08 with repeated shares.

## Live tests (requires human)

| IDs | Status | Notes / date |
|---|---|---|
| L-01 through L-12 | NOT RUN | Do not mark PASS without two-person meeting observation. |

## Active work items

- [x] Phase 0 baseline: environment, upstream triage, install, lint, config docs, audit, unit, E2E, `.deb` build, package inspection and launch baseline
- [ ] Phase 1 launch: Wayland switch characterization tests (`9e58d2b4`) and the opt-in native Wayland `.deb` launcher (`2c9cc7dd`) done; the packaged binary runs native Wayland. Remaining: installed-launcher check with the sandbox on, window not blank, restart behaviour (need the `.deb` installed and a human check)
- [ ] Phase 2 screen capture: baseline measured; opt-in `wayland.portalPicker` fix (`cf91da0a`) verified with the probe on native Wayland; E2E passes after the change; the Wayland launcher turns the setting on (`9d557739`). Remaining: live Teams checks (including whether Teams' repeated `getDisplayMedia` calls open extra dialogs), and XWayland entire-screen and cancel measurements for the fallback
- [ ] Phase 3 media/receive/UX: startup diagnostics (`0d6748b8`) and probe camera and cleanup checks (`260383c7`) done; camera and microphone verified in the Wayland launcher's configuration. Probe run 2 (XWayland default with `--camera`) done except Cancel; `.deb` rebuilt at `57d72759`. Remaining, human-only: incoming share rendering (L-07, GPU is off by default on Wayland), two-way audio and video (L-02, L-03), 30-minute soak (L-10)
- [ ] Phase 4 package/review

## Completed patches / commits

| Commit | Change | Test evidence |
|---|---|---|
| `6d18be9b` | Kit committed exactly as delivered (fork-internal; drop before upstream PRs) | Docs only; lint and unit tests pass on this tree |
| `8a9b1a17` | Phase 0 baseline evidence in `PROGRESS.md` and `DECISIONS.md` | Docs only |
| `9e58d2b4` | Eight characterization tests for `CommandLineManager`'s Wayland switch selection | Unit: 1037 tests, 1036 pass, 0 fail, 1 skipped; lint pass. E2E not rerun (unit-test-only change) |
| `5203f919` | Phase 1 progress note | Docs only |
| `2c9cc7dd` | Opt-in "Teams for Linux (Wayland)" desktop entry in the `.deb` via `build.deb.fpm`, plus five unit tests guarding it | Unit: 1042 tests, 1041 pass, 0 fail, 1 skipped; lint pass; `.deb` built and inspected; packaged binary runs native Wayland. E2E not rerun (packaging config only) |
| `7192cd53` | Phase 1 evidence in `PROGRESS.md` and `DECISIONS.md` | Docs only |
| `abc2e712` | Interactive screen-sharing probe (`tests/manual/`, not run by CI) | Lint pass; usage path checked |
| `cf91da0a` | Opt-in `wayland.portalPicker` for native Wayland: skips the fake media UI switch, single portal enumeration handler with cancel, several-source and duplicate-request guards; generated config docs, `configuration.md` and module README updated | Unit: 1052 tests, 1051 pass, 0 fail, 1 skipped; lint pass; config docs in sync; docs site builds; probe on native Wayland as in "Phase 2 screen sharing evidence". E2E not rerun yet |
| `3724a152` | Probe: `E2E_TESTING`, process-side timeout, app logs, portal pick type, stream size, persist mode, restore tokens, Start timing, magenta target window | Lint pass; used for the runs above |
| `4f937889` | Phase 2 evidence in `PROGRESS.md` and `DECISIONS.md` | Docs only |
| `9d557739` | "Teams for Linux (Wayland)" passes `--wayland.portalPicker=true` | Unit: 1052 tests, 1051 pass, 0 fail, 1 skipped; lint pass; E2E 17/17; `.deb` rebuilt and inspected (entry validates, default entry unchanged) |
| `b4d3bcec` | Progress update written by a parallel run of this session | Docs only; its `.deb` checksum was wrong and is corrected in `a0a1c6a3` |
| `a0a1c6a3` | Corrected `.deb` checksum and the doubled-archive check | Docs only |
| `0d6748b8` | Startup warnings when the PipeWire socket, the portal service or a ScreenCast backend is missing on Wayland; troubleshooting entry and module README | Unit: 1060 tests, 1059 pass, 0 fail, 1 skipped (8 new); lint pass; config docs in sync; docs site builds; E2E 17/17 at `260383c7` |
| `260383c7` | Probe `--camera`: camera and microphone checks around each share, open portal session count after each share | Lint pass; usage path and session counter checked; used for Phase 3 run 1 |

## Known failures and blockers

| Issue | Severity | Reproduction | Evidence | Next action |
|---|---|---|---|---|
| Electron from the checkout cannot start with the Chromium sandbox | Worked around for local tests; not a product defect (the installed `.deb` ships an AppArmor profile) | `env -u ELECTRON_RUN_AS_NODE node_modules/electron/dist/electron --version` | `FATAL ... setuid_sandbox_host.cc:166`, exit 133; `kernel.apparmor_restrict_unprivileged_userns=1` | Local E2E and source launches use `--no-sandbox` (approved); check sandboxed behaviour on the installed `.deb` |
| "Teams for Linux (Wayland)" cannot start in an X11 desktop session | Low; expected | Choose the Wayland entry while logged into an Xorg session | `--ozone-platform=wayland` needs a Wayland compositor | Use the default "Teams for Linux" entry there |
| Windows opened from the Wayland entry group under the default "Teams for Linux" icon | Cosmetic | Launch "Teams for Linux (Wayland)" and look at the dash | Wayland app_id is `teams-for-linux`, matching `teams-for-linux.desktop` | Leave; a per-entry app_id (`--class`) could also change the profile directory |
| Cancelling the share dialog hands Teams a dead stream (setting off) | High for native Wayland sharing | Native Wayland, `wayland.portalPicker` off, press Cancel in the dialog | Probe: `getDisplayMedia` resolves with a black, already-ended track (2 of 2 runs) | Fixed when `wayland.portalPicker` is on (`cf91da0a`), which the Wayland launcher now does (`9d557739`). The default X11 launcher is not covered: cancel under XWayland is not yet measured |
| Teams may call `getDisplayMedia` more than once per share | Unknown | Real meeting share | Upstream comment in `injectedScreenSharing.js`; with the portal picker, concurrent calls are rejected, sequential calls each open a dialog | Watch for extra dialogs in L-04 and L-08 |
| `displaySurface` reads "window" for monitor picks with the portal picker | Low | Probe, entire-screen pick with the setting on | Track settings | Note for upstream; check whether Teams changes behaviour in L-05 |
| xdg-desktop-portal 1.21+ refuses sessions for app IDs without an installed `.desktop` file | Future risk | Newer Ubuntu with portal 1.21+ | Electron 44 `app.setDesktopName` docs; this host runs 1.18.4 | The `.deb` installs `teams-for-linux.desktop`, matching the default app ID; source runs may be refused there |

## Build artifact and human acceptance handoff

- `.deb` path: `dist/teams-for-linux_2.27.0_amd64.deb` (build at `57d72759`, includes the portal picker launcher and the startup diagnostics; not a release candidate)
- Housekeeping: `git stash list` holds the parallel run's unfinished edit; its content is committed in `0d6748b8`, so the stash can be dropped
- SHA-256: `01948528be5c2a3aadb73eb2a8b130a0f3c98bb4cd00f1231f0a0d075ff9259b`
- Native Wayland invocation / installed desktop entry: "Teams for Linux (Wayland)" in the application menu, or `teams-for-linux --ozone-platform=wayland --wayland.portalPicker=true` from a terminal
- X11 fallback invocation and limitations: the default "Teams for Linux" entry, or `teams-for-linux --ozone-platform=x11`. Runs under XWayland, where sharing the whole screen shows black (upstream `troubleshooting.md`)
- Redacted error logs:
- User action required (one consolidated request):
- Ready for upstream PR review? NO
