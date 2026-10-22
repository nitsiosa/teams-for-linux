# Autonomous decisions, escalation and decision ledger

## Pre-authorised defaults (Cursor may decide without asking)

| Area | Default |
|---|---|
| Implementation | Smallest isolated patch to upstream app; no rewrite. |
| Priority | Full Wayland desktop + window sharing, audio/video/receive P0; UI polish P1. |
| Media APIs | Browser WebRTC/Electron capture + user-approved portal + PipeWire. |
| Packaging | `.deb` first; avoid Snap confinement until P0 works. |
| Start flags | Native Wayland path, preserve X11 escape hatch; confirm through live process. |
| Tests | Node unit tests, existing Playwright/Electron tests, manual peer validation. |
| History | Small local commits, descriptive messages, no force-push. |
| Security | No extra Electron sandbox weakening, credential interception or hidden screen capture. |
| Research | Repo docs and source first, issue tracker second, REA only when needed. |
| Branch | `feat/ubuntu-wayland-media` unless name already taken. |
| Deliverables | Fork-local code, docs, tests, `.deb` release candidate, acceptance evidence. |

## Do not interrupt for

Refactor extent under a few modules, reasonable file naming, unit-test fixtures, internal log formatting (redacted), choosing between comparable reversible implementation techniques, fixing lint, regenerating docs, rebasing from upstream if no local work will be lost, or adding narrow configuration only when evidence supports it.

## Escalate exactly once when necessary

- `gh` is not authenticated or forking requires identity/permission confirmation.
- Work requires `sudo`, system package modifications, host daemon restart, desktop session switch, corporate credential/MFA entry, or dedicated meeting participants.
- Work would transmit protected information, override enforced org authentication/policies, alter system security, or require approval to publish/share artifacts.
- A destructive Git operation would overwrite non-agent user work.
- Publishing a GitHub release or opening an upstream PR (propose the PR, but don't submit without human approval).

On blocker: state the exact action needed, one command or checkbox, severity, and all work completed independently. Do **not** repeatedly ask the same question.

## Resolution protocol when ambiguous

1. Read code/docs and run a targeted test.
2. Choose least invasive option consistent with P0 and upstream standards.
3. Document assumption and evidence below, implement and test.
4. Revert easily if test disproves assumption.
5. Keep `PROGRESS.md` current; mark unknowns and blocked live results accurately.

## Decision ledger (Cursor append here)

| Date | Decision | Alternatives | Evidence | Reversible? |
|---|---|---|---|---|
| 2026-10-20 | `.deb` P0, native Wayland, X11 fallback; Outlook later | Snap-first, full rewrite | Upstream package flags and reported Snap/portal problems | Yes |
| 2026-10-20 | Node 24.22.0 from the official tarball in `~/.local/opt`, user-approved; no shell rc changes | apt (Node 18, too old), NodeSource (sudo), nvm (piped installer, edits `~/.bashrc`) | `.nvmrc` is 24; Node was absent | Yes, delete the directory |
| 2026-10-20 | Install like CI: `npm ci --ignore-scripts`, then the Electron binary download and `npm run postinstall` | Plain `npm ci` | `build.yml` blocks dependency lifecycle scripts; only `cbor-extract` and `electron-winstaller` scripts are skipped | Yes |
| 2026-10-20 | Local `.deb` builds are x64 only: `npx electron-builder --x64 -l deb --publish never` | `npm run dist:linux:deb` (adds arm64) | Host is x86_64; arm64 cannot be tested here; `--publish never` rules out uploads | Yes |
| 2026-10-20 | Local E2E and source launches run with `--no-sandbox` (E2E via `CI=1`), user-approved, test processes only; sandboxed runs are checked on the installed `.deb` | setuid-root dev `chrome-sandbox` (sudo, reset by `npm ci`); disabling the Ubuntu userns restriction (system-wide) | Chromium aborts from the checkout on Ubuntu 24.04; upstream CI uses the same flag | Yes |
| 2026-10-20 | Native Wayland in the `.deb` through a second, opt-in desktop entry ("Teams for Linux (Wayland)", explicit `--ozone-platform=wayland`) added via `build.deb.fpm`; the default entry keeps x11 (user-approved) | Flip the default to wayland; drop the flag (Chromium auto, as reverted in #2506); `--ozone-platform-hint=auto` entry (can fall back to X11 silently); startup wrapper script; per-user override only | ADR-031; Phase 0 and packaged-binary runtime evidence (native Wayland, no X11 windows) | Yes, revert `2c9cc7dd` |
| 2026-10-20 | Phase 2 fix as one opt-in setting, `wayland.portalPicker` (default off, native Wayland only), gating both the fake media UI switch and a single-enumeration portal handler, the shape requested in the #2872 review; handler in its own module with cancel, several-source and duplicate-request guards | Default on for native Wayland (changes working behaviour for Flatpak, tar.gz and CLI users); port #2872 as-is (no setting, no guards, no handler tests) | Probe baseline: cancel gives a dead black track (2 of 2); with the setting: one visible dialog plus a silent restore, correct source, clean cancel | Yes, leave the setting off or revert `cf91da0a` |
| 2026-10-20 | The fork's "Teams for Linux (Wayland)" launcher passes `--wayland.portalPicker=true` (user-approved) | Leave the setting off and document `config.json`; default it on for all native Wayland | Probe: the setting fixes cancel and shows one visible dialog; the CLI form parses to a boolean with the other `wayland` defaults kept | Yes, revert `9d557739` |
| 2026-10-20 | Reject a cancelled portal pick with `callback({})` (Teams sees `AbortError`), like the in-app picker's cancel | `callback(null)`, which may surface `NotAllowedError` like browsers; untested | Consistency with the existing cancel path; the probe shows a clean rejection | Yes |
| 2026-10-21 | Keep the product/package name "Teams for Linux" and use the user-supplied Harbour Huddle artwork for packaged and runtime color icons; preserve monochrome tray variants. User confirmed ownership or permission to publish the artwork | Rename launchers only; full package/profile rename; keep branding local | Explicit user choice and publication-rights confirmation; icon dimension/digest tests and package comparison | Yes, revert `084eca21` |
| 2026-10-21 | Pearl Luxe becomes the one-time forced default for existing and new users; retain all themes for later selection and add an explicit no-theme choice. Implement adaptive Light/Night, forced Night, and all wrapper-owned HTML surfaces together; native/portal/call-stage surfaces stay native. | Opt-in built-in theme; Teams view only; light-first rollout | Explicit user choices before the Pearl Luxe plan; stable handoff v1.3.0 SHA-256 `119c99e1befded687521bfcf3a2694acf9242827b0aaea1aec661ee8e7e7aa60` | Yes, restore migration backup and revert Pearl commits |
| 2026-10-21 | After reviewing live redacted screenshots, allow aggressive chat-only density, sizing and region-layout overrides to match the static mock; still exclude sign-in, calls/meetings, portal/native UI and never hide/reorder essential controls. | Keep skin-only differences; full unrestricted DOM rebuild | Explicit approval phrase after the screenshot comparison; privacy-masked geometry and count-only computed-style audits bound changes to audited selectors | Yes, revert `2fffbdda` |
| 2026-10-21 | Withdraw the page-grid, app-rail and chat-list geometry from the aggressive pass; Teams keeps its own tracks, rail button sizes and list row heights. Section-header text styling applies only to the header row, Teams' outer message box is cleared, the composer may grow, and presence/unread badges keep their colours. Header, message column, bubble and composer styling stay | Fix the forced grid per view; full revert to skin-only | The installed build's first redacted screenshot: empty rail column, overlapping uppercase chat list, lavender box around own bubbles. The audit had covered one page state, while Teams places about 15 layout areas and positions list rows from its own heights. Hidden-window probe through `customCSS.onDidFinishLoad` confirms the computed results | Yes, revert this commit |
| 2026-10-22 | At the user's request ("the same colour scheme all over the app"), the Fluent token remap moves from three chat regions to `:root` and every Fluent provider, as in the original handoff, with Fluent's hover/pressed/selected token variants added. Geometry rules stay chat-scoped. Pearl Luxe Night also switches Teams to its dark theme. The live call/meeting stage, excluded earlier, now inherits the colours until it is audited | Keep chat-only colours; audit each view first | Activity, recap and other views kept stock purple and white beside the themed chat. A provider probe shows Pearl tokens win on nested and portal providers, every new pairing passes AA in both modes, and Night could no longer rely on chat-only contrast fixes | Yes, revert this commit |
