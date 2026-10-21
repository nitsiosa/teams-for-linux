# Pearl Luxe — theme handoff for Teams for Linux

A pale, high-end theme for the main Teams view, in two palettes that share every rule:

- **Light:** pearl and linen grounds, champagne "my" bubbles, espresso primary actions, antique-gold accents.
- **Night:** lifted warm graphite-brown grounds with clear steps between layers (readable on dim screens), bronze-champagne "my" bubbles, champagne primary actions, brighter gold accents, ivory text.

Both use serif titles, soft depth and generous spacing. Open `preview/preview.html` in a browser and use the Auto / Light / Night switch to see the target (fictional data).

## What's in here

| Path | What it is |
| --- | --- |
| `CURSOR_PROMPT.md` | Paste this into Cursor Agent to run the implementation. |
| `.cursor/rules/pearl-luxe.mdc` | Project rule Cursor applies while editing (copy into the repo's `.cursor/rules/`). |
| `DESIGN_SPEC.md` | Principles, palette, type, region-by-region spec, accessibility. |
| `IMPLEMENTATION_PLAN.md` | Ordered tasks with exact repo paths and acceptance checks. |
| `tokens/pearl-luxe.tokens.css` / `.json` | Single source of truth for colours, type, radii, depth, space. |
| `theme/pearl-luxe/` | Working user theme that switches light/dark automatically. |
| `theme/pearl-luxe-night/` | Working user theme that is always dark. |
| `preview/preview.html` | Static target mockup. |

## Try it today, no code changes

The app already discovers user themes (see `app/customCSS/README.md`):

```bash
mkdir -p ~/.config/teams-for-linux/themes
cp -r theme/pearl-luxe theme/pearl-luxe-night ~/.config/teams-for-linux/themes/
```

Restart, then pick under **Settings → Theme → Custom** and restart again:

- **Pearl Luxe** follows your system. Turn on `appearance.followSystemTheme` so Teams switches light/dark together with it.
- **Pearl Luxe Night** is always dark. Set Teams itself to **Dark**.

(If your config lives elsewhere, use **Settings → Theme → Open themes folder**.)

Layer 1 of the CSS (Fluent token remap) should work immediately. Layer 2
selectors are marked `VERIFY`; Cursor's first job is to confirm them against
the live DOM.

## Scope

This restyles the remote Teams view through the app's existing CSS injection.
It does not change Teams' behaviour, layout, security settings, IPC or any
native/portal surface, and it ships no Microsoft artwork.
