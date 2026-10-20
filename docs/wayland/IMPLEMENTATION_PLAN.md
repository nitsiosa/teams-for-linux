# Execution plan — ordered, autonomous, evidence-based

Track every phase in `PROGRESS.md`; complete independent work even if live sign-in must wait. Use latest checked-out code and inspect upstream issues before starting a fix. Each phase ends with a local commit if it modifies the repository.

## Phase 0 — Baseline, fork, environment, and gap analysis

- [ ] Verify fork `origin`, official `upstream`, clean working tree, branch `feat/ubuntu-wayland-media`; record upstream HEAD hash and package version.
- [ ] Read upstream `CLAUDE.md`, `CONTRIBUTING.md`, local docs for Wayland, screen sharing, IPC, test strategy and packaging. Inspect current relevant `app/` modules and tests.
- [ ] Run `scripts/wayland-preflight.sh` on the target host and capture its **non-sensitive** output in progress notes. Confirm `wayland`, compositor, portals (`xdg-desktop-portal` + appropriate backend), PipeWire, WirePlumber; don't install packages silently.
- [ ] `npm ci`; baseline `npm run lint`; `npm run test:unit`; `npm run test:e2e` if non-auth test harness works. Record exact number passing/failing and whether failures pre-existed.
- [ ] Build/launch current baseline *both* with shipped package arguments and with `--ozone-platform=wayland`; observe whether full-screen share picker uses XWayland or `org.freedesktop.portal.ScreenCast`. Ask for no live account at this point if unavailable.
- [ ] Search current issues/PRs for equivalent fixes, especially #2713, #2707, #2551, #2486, #2506, #3066, and check whether current main already handles them. **Do not copy stale patches blindly**.

**Exit:** a concise baseline table with reproducible failure/success, existing behavior, links/sha, no premature claim of fix.

## Phase 1 — Native Wayland launch that remains reversible

- [ ] Confirm startup lifecycle: packaged `build.linux.executableArgs` currently includes `--ozone-platform=x11`; note that Electron/Chromium ozone backend needs a startup argument and late runtime config cannot reliably override it.
- [ ] Provide first a user-scope launchable native Wayland entry or helper (avoid modifying global default until baseline confirms). Make `.deb` Wayland path predictable; preserve explicit X11 fallback (`teams-for-linux --ozone-platform=x11`) for environments with native Wayland rendering regressions.
- [ ] Evaluate smallest robust upstreamable approach for Linux packaging, e.g. `--ozone-platform=auto` or controlled launcher behavior on Wayland, **after testing**. Do not assume flag priority; verify actual effective backend on GNOME Wayland with packaged app. A custom `.desktop` entry may be acceptable for P0 prototype if packaged default remains x11, but document it as workaround not complete upstream fix.
- [ ] Preserve non-Wayland platforms and CLI override semantics. Add tests for flag selection / launch config where possible.
- [ ] Baseline GUI smoke + ensure window not blank, renders after restart, no crash loop; fail gracefully with X11 fallback documented.

**Exit:** deterministic launch and proven effective native Wayland backend; no silent X11 false-positive.

## Phase 2 — Screen sharing pipeline, minimal targeted fixes

- [ ] Trace `navigator.mediaDevices.getDisplayMedia`, injected browser hooks, `session.setDisplayMediaRequestHandler`, `desktopCapturer.getSources`, `StreamSelector`, and portal interaction in the actual HEAD. Don't patch names based on historical issues.
- [ ] Ensure **one user capture selection maps to one valid capturer source**. Specifically guard against a second `desktopCapturer.getSources()` call invalidating PipeWire source/node IDs (historical #2713). If already fixed, add regression coverage only as needed.
- [ ] Prefer Chromium's portal-backed native Wayland path when available. Ensure capture source constraints and lifecycle are correct; propagate user cancellation cleanly without crashing/disabling the camera.
- [ ] Validate no unsolicited portal opens, non-matched stale source IDs, source leaks, repeated grants, black full-desktop feed or missing window chooser.
- [ ] Add focused unit/integration tests using existing Node `node:test`, Electron fixture or Playwright harness; mock portals rather than trying to CI-capture a real corporate desktop.
- [ ] Check platform-dependent failures on screen picker cancellation, switching sources, closing share, leaving call. Add logs only with non-sensitive event types/booleans/error codes.

**Exit:** regression tests and local portal checks green; waiting for human visual check is recorded as NOT RUN.

## Phase 3 — Audio/video reliability, incoming screen share, and UX

- [ ] Validate camera/mic device permissions, WebRTC connection establishment, incoming screen-share rendering, and switching between camera+share; avoid changing Microsoft signalling behavior.
- [ ] If incoming share has black/blank frames, examine GPU, Chromium/Electron and underlying compositor; add a gated fallback/config, not global `--disable-gpu` unless evidence supports it.
- [ ] Add safe failure messages/diagnostic hints when PipeWire, desktop portal or camera/microphone access is unavailable. Preserve existing login, deep links, notifications and call UI.
- [ ] Check start/stop/stale stream cleanup; lifecycle after minimize, call teardown, sleep/resume where feasible.
- [ ] Keep focus on P0; don't redesign chat, theme, tray or create new architectures.

**Exit:** runnable build and repeatable non-auth checks. Anything requiring a second human participant is marked HUMAN-TEST.

## Phase 4 — Package, test, review, upstream contribution

- [ ] `npm run lint && npm run test:unit`; run `npm run test:e2e` where environment supports it. `npm run dist:linux:deb` and sanity-check package contents, desktop entry, flags, permissions and install plan.
- [ ] Build a test/development `.deb` **without publishing**; record file name/path and `sha256sum`; do not auto-install system-wide without user approval.
- [ ] Inspect and mitigate new security risks. Read upstream security warning re: disabled Electron contextIsolation/sandbox; don't compound it. Preserve GPL-3.0-or-later attribution/licence and upstream origins.
- [ ] Complete manual runbook in `TEST_MATRIX.md`, preflight diagnostics, fallback instructions, known limitations. Don't share private meeting/account data in commits/PRs.
- [ ] Commit small coherent units, keep `origin` fork changes, prepare review-ready PR description and test evidence in `PROGRESS.md`. An upstream PR should be opened only after user's approval; ideally separate generic fixes from Ubuntu-specific packaging policy.
- [ ] Present ONE human acceptance request containing concise steps for genuine corporate sign-in and two-person audio/video/window/full-screen/receive tests, and mark those NOT RUN until validated.

**Exit to human acceptance gate:** changes, tests, built `.deb`, redacted evidence, changelog, failure triage and upstream plan complete.

## Time-saving prioritisation and stop conditions

Use `P0 > P1`. Run inspection, unit tests and docs in parallel when isolated; serialize builds, changed-file editing, and Git operations. If one failure persists after three materially different grounded hypotheses, create minimal reproduction and document it as BLOCKED with next action; continue unaffected tasks. Do not spend days perfecting optional GPU improvements while window/full-desktop capture is broken. Stop only for credentials, system-wide changes, forbidden ops, real two-person validation, or unresolved external technical blockers after providing a full evidence bundle.
