Implement the "Pearl Luxe" theme (Light + Night) for Teams for Linux using the attached handoff folder.

Read, in order: README.md, DESIGN_SPEC.md, IMPLEMENTATION_PLAN.md, tokens/pearl-luxe.tokens.css, theme/pearl-luxe/theme.css, theme/pearl-luxe-night/theme.css. Open preview/preview.html for the visual target (switch Auto / Light / Night).

Follow IMPLEMENTATION_PLAN.md step by step and stop after each step to show me the diff:
1. Audit and fix every selector marked VERIFY, including the Teams dark-mode marker, in my local session. Record selectors only in SELECTORS.md, no real content.
2. Register Pearl Luxe (auto) and Pearl Luxe Night as built-in themes (app/assets/css/pearlLuxe.css, app/customCSS/themes.js, app/config/options.js, docs).
3. Resolve fonts without loosening CSP.
4. Make sure secondary profile views receive the theme.

Constraints:
- CSS only for the Teams view: colour, type, radius, shadow, spacing. Never hide, move or resize Teams controls.
- Do not change security settings (contextIsolation, sandbox, nodeIntegration), CSP, IPC channels, startup flags or package behaviour.
- Do not touch call/meeting stages, screen-share consent, native menus or notifications.
- Use only the --lx-* tokens; no new hex values outside tokens/pearl-luxe.tokens.css. Every rule must work in both modes through tokens alone (no mode-specific rules).
- Dark mode answer: Pearl Luxe switches to the Night palette in dark mode; Pearl Luxe Night is always dark. Do not change existing defaults.
- Fictional data only in any screenshots or fixtures.
- Keep existing built-in themes and custom:<id> themes working; update tests.
