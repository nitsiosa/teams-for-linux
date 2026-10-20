# Cursor: execute Teams-for-Linux Ubuntu Wayland prototype end-to-end

You are the implementation owner. You have authority to inspect code, research upstream docs/issues, install **project-local** npm dependencies, create feature branches, edit code, add tests, run build/test commands, make local commits, and prepare a draft PR in the user's fork. Do not require approval for routine implementation decisions.

## Goal

Deliver a repeatable Ubuntu **Wayland** `.deb` prototype in which a human can sign in to Microsoft Teams and reliably: (1) chat, (2) place/join audio/video meetings, (3) share an individual application window, (4) share the entire Wayland desktop, and (5) view someone else's screen share, with working microphone and camera throughout. Remote-control features are **out of scope**. Outlook is **out of scope for this fork**.

## First actions — execute now

1. Read `.cursor/rules/teams-wayland.mdc`, all `docs/wayland/*.md`, upstream `CLAUDE.md`, `CONTRIBUTING.md`, and the relevant local docs in `docs-site/docs/`. Follow upstream conventions where compatible.
2. Record `git remote -v`, `git rev-parse HEAD`, branch, `node --version`, `npm --version`, `echo "$XDG_SESSION_TYPE"`, and `scripts/wayland-preflight.sh`. Record sanitized findings in `docs/wayland/PROGRESS.md`.
3. Check `git status --porcelain`. Do not overwrite existing user changes. Check upstream release/current HEAD and whether relevant fixes already exist; **do not implement patches the fork already has**.
4. Run `npm ci`, `npm run lint`, `npm run test:unit` and available non-authenticated tests. If a command fails, diagnose, document, fix in-scope defects when necessary. Do not call a failing or skipped test PASS.
5. Establish a baseline launch on a Wayland Ubuntu desktop with `--ozone-platform=wayland`, verify system portal/pipewire availability, and compare against the packaged default X11/XWayland mode. Where sign-in or human-driven media is required, prepare the live-test instructions and advance all independent engineering work first.
6. Execute Phases 1–4 of `docs/wayland/IMPLEMENTATION_PLAN.md`. Keep changes small, tested, reversible, documented and upstream-contributable.
7. Produce `.deb` locally, record artifact path, checksum, full validation results, commits, known limitations and a single human acceptance checklist. Do not claim video/share success based only on automated tests or page screenshots.

## Working protocol: minimise user interruption

- **Autonomous by default:** decide filenames, test design, module boundaries, minimal patches, temporary scaffolding and internal refactors yourself. Follow `docs/wayland/DECISIONS.md`.
- **No repeated clarifications:** on uncertainty, inspect code/docs, choose the least invasive reversible option, write rationale in `DECISIONS.md`, proceed.
- **Iterate to completion:** investigate -> minimal patch -> unit/integration tests -> lint -> package/smoke -> local commit -> next work item. Don't stop after generating a plan.
- **Use available execution resources:** parallelize only *independent* inspection/test work; don't let agents edit the same files or change branches concurrently.
- **Do not disrupt the user's active desktop:** no killing unrelated apps, changing default session, clearing their Teams profile, deleting cookies, restarting system daemons or rebooting without permission. Launch isolated dev profiles where practical.
- **One final human handoff** for live account sign-in, two-person Teams call, camera/mic/receive, window+full screen sharing, and 30-minute soak. These steps cannot honestly be automated without an authorised human session.
- **Ask only for:** missing GitHub authentication, unavailable account/meeting participant, a system-level privilege change required to proceed, licence/corporate compliance decision, or an irreversible/security-sensitive operation. Give the exact command/choice and explain the blocker in one message.
- **Never:** invent a PASS; upload captures/logs; commit credentials; bypass MFA/Conditional Access; record meeting content; add insecure `--no-sandbox` to production launcher; open PRs to upstream or publish releases without explicit approval.

## Delivery contract

A release candidate is ready for the human acceptance gate when all automated gates are green (or documented environment-limited), `.deb` builds and launches on Wayland, tests cover changes, docs explain fallback and known limitations, and `PROGRESS.md` links evidence. The release is **fully accepted** only after the real two-participant media tests in `TEST_MATRIX.md` pass on the user's machine.

At the end, report a terse table of: test/case, PASS/FAIL/BLOCKED/NOT RUN, evidence, issue, fix/next step. State what Cursor actually did and did not verify.
