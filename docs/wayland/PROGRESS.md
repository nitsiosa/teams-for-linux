# Cursor execution ledger (update during implementation)

**This is an initial template, NOT evidence that work has been completed.** Keep this file terse and current.

## Environment / checkout

- Date:
- `origin`:
- `upstream`:
- Branch / upstream commit SHA:
- Node/npm/Electron versions:
- Ubuntu release, kernel, desktop/compositor:
- `XDG_SESSION_TYPE`:
- Portal/PipeWire/WirePlumber preflight:

## Automated gates

| Gate | Status (NOT RUN/PASS/FAIL/BLOCKED) | Command | Evidence/failure reason |
|---|---|---|---|
| Install dependencies | NOT RUN | `npm ci` | |
| Lint | NOT RUN | `npm run lint` | |
| Unit tests | NOT RUN | `npm run test:unit` | |
| E2E | NOT RUN | `npm run test:e2e` | |
| Build .deb | NOT RUN | `npm run dist:linux:deb` | |
| Package inspect | NOT RUN | `dpkg-deb -I/-c` | |
| Wayland launcher | NOT RUN | documented runtime check | |
| Screen source regression tests | NOT RUN | target test | |

## Live tests (requires human)

| IDs | Status | Notes / date |
|---|---|---|
| L-01 through L-12 | NOT RUN | Do not mark PASS without two-person meeting observation. |

## Active work items

- [ ] Phase 0 baseline
- [ ] Phase 1 launch
- [ ] Phase 2 screen capture
- [ ] Phase 3 media/receive/UX
- [ ] Phase 4 package/review

## Completed patches / commits

| Commit | Change | Test evidence |
|---|---|---|

## Known failures and blockers

| Issue | Severity | Reproduction | Evidence | Next action |
|---|---|---|---|---|

## Build artifact and human acceptance handoff

- `.deb` path:
- SHA-256:
- Native Wayland invocation / installed desktop entry:
- X11 fallback invocation and limitations:
- Redacted error logs:
- User action required (one consolidated request):
- Ready for upstream PR review? NO
