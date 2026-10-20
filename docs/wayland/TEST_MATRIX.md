# Evidence and acceptance test matrix

**Statuses:** PASS = observed with evidence, FAIL = observed failure, BLOCKED = external dependency identified, NOT RUN = no evidence. CI fixtures do not prove actual Teams live-media success. Cursor must update `PROGRESS.md` with results; human marks LIVE cases after observation.

## Automated / local checks (Cursor can perform)

| ID | Test | Pass condition | Evidence |
|---|---|---|---|
| A-01 | Preflight | Wayland identified, portal/PipeWire status captured | Redacted output, package/system versions |
| A-02 | Dependency/setup | `npm ci` succeeds with upstream-supported Node | Exit code, Node/npm versions |
| A-03 | Lint | `npm run lint` passes | Exit code |
| A-04 | Unit suite | `npm run test:unit` passes or baseline failures documented | Counts and named failures |
| A-05 | Non-auth E2E | `npm run test:e2e` passes if headful/CI environment supports it | Exit code, skipped reason |
| A-06 | Wayland selection | Native Wayland launch entry creates correct backend; no unwanted hard-coded x11 override | Checked `.desktop` args + runtime/visual evidence |
| A-07 | Screen source logic | Selection doesn't re-query invalid PipeWire ID; cancellation/cleanup tested | Unit/integration test output |
| A-08 | Packaging | `npm run dist:linux:deb` creates `.deb`, dependencies and desktop launcher reviewed | Artifact path, sha256, `dpkg-deb -I`/`-c` |
| A-09 | Regression | Existing auth/navigation/notification mechanisms not modified unnecessarily | Diff and relevant tests |
| A-10 | Security/privacy | No tokens/PII in logs/commits, no sandbox weakening, no hidden capture | Diff review notes |

## Real, consent-based test with TWO participants (human required)

Use a test call with two permitted accounts/devices, and **non-sensitive synthetic on-screen content** such as a local test page showing an incrementing clock and changing colour. Do not use private documents or record calls. Each tester checks both sides.

| ID | Scenario | Observable acceptance result |
|---|---|---|
| L-01 | Open packaged app from desktop launcher on Wayland | App starts, UI renders, identity/login works; portal chooser accessible |
| L-02 | Join outgoing Teams call, microphone/speakers | Both hear each other with tolerable latency/clarity |
| L-03 | Enable camera | Remote peer sees live camera; user sees remote peer video |
| L-04 | Share **one window** with changing content | Wayland portal chooser appears; remote party sees correct *window* (not black/frozen) |
| L-05 | Stop share, then **share full monitor/desktop** | Remote peer sees native Wayland desktop with synthetic content outside XWayland windows |
| L-06 | Camera + mic while sharing | Audio uninterrupted; camera continues as expected; ending share doesn't end call |
| L-07 | Remote peer shares their screen | Ubuntu client displays incoming share correctly, no blank video |
| L-08 | Repeat selection and cancellation | Three repetitions of window share and three full-screen shares, including cancel picker, succeed without stale IDs / extra dialogs / error loops |
| L-09 | Multi-monitor, if present | Correct monitor identified, no accidental capture of wrong display |
| L-10 | 30-minute call soak | No persistent freeze, crash, lost audio/video, stale screen share or runaway resource usage; note observed CPU/memory |
| L-11 | Exit/permission boundary | Stop sharing and leave call actually stop streams, no background capture/recording |
| L-12 | Reopen app and join second call | Prior sign-in usable where policy allows; fresh call and share still work |

## Procedure and evidence standards

1. Run `bash scripts/wayland-preflight.sh` and save only sanitized technical output.
2. Verify actual runtime mode; do not infer Electron Wayland from `echo "$XDG_SESSION_TYPE"` alone.
3. Open client and sign in interactively using authorised methods. Never send MFA challenge or password to the agent.
4. Start a two-person Teams meeting. One remote participant observes sharing and provides clear yes/no outcomes. For each L-xx, record timestamps, environment, versions, method of observation, and PASS/FAIL.
5. On failures, record **sanitised** error class/stage (picker absent, portal denied, source stale, black capture, peer rendering), not raw URL/meeting content.
6. Don't push logs, screenshots, or recordings with internal discussions to public GitHub. Use synthetic screen material where evidence must be published.

## Signoff rule

A P0 acceptance claim is valid only when **L-01 through L-08, L-10, L-11 and L-12** pass on a genuinely Wayland-running package, plus automated A-01 through A-10 relevant to the change. L-09 applies when multi-monitor hardware exists. If a test is unavailable, mark BLOCKED, not PASS. A failure in incoming share or whole-desktop share is a P0 failure even if window sharing works.
