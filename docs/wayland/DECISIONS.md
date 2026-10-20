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
