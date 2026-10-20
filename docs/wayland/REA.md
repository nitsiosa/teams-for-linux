# REA (Reverse Engineer Anything): optional investigation stage

REA is **not a prerequisite** for this prototype. First test the existing open-source Electron wrapper, browser WebRTC APIs, source code and portal integration. Reverse engineering is only justified when ordinary code inspection and reproducible tests cannot explain a specific client-side behavior.

## When to use

- A reproducible discrepancy between current Teams web UI and the wrapper's screen-share flow.
- An injected JavaScript hook conflicts with an undocumented Teams DOM change.
- Need to understand app-local JavaScript behavior for **interoperability**, within authorised access and acceptable licences.

## Safe process

1. Make a minimal reproduction with dummy data. State the question to answer (e.g., "where does Teams invoke getDisplayMedia?").
2. Inspect the publicly loaded client code/observed browser behavior under an authorised account. Do not defeat encryption, DRM, access controls or exfiltrate private code.
3. If useful, configure REA after reviewing its setup plan (`npx rea-agents@latest setup`, per https://rea.tools); don't auto-approve scripts or connect it to corporate meetings without consent.
4. Extract only high-level interoperability facts (event flow, caller/callback contract), link evidence, write a test, and implement in our MIT/GPL-compatible original code as appropriate.
5. Never store credentials, session tokens, cookies, meeting URLs, personal chat content or raw private HTTP captures in the repo, issue tracker or AI context.
6. Keep proprietary Microsoft assets out of the fork. Review licences/terms before distributing artifacts.

## Stop criteria

If successful baseline + portal behavior is already achievable via existing APIs, skip REA. Don't create a private Teams media protocol or authentication bypass. Record any unsolved vendor-side limitation and continue independent tasks.
