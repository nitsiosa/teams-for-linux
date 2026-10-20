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
