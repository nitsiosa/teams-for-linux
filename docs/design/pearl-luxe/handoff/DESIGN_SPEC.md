# Pearl Luxe — design spec

## Principles

1. **Quiet luxury.** Expensive comes from restraint: few colours, warm neutrals, generous space, fine hairlines, one metallic accent. No gradients on surfaces, no saturated colour blocks.
2. **Pale, not washed out.** Light grounds are pale and text stays dark (`--lx-ink`, 13.7:1). Night grounds are a lifted warm graphite-brown with clear steps between layers, and ivory text (11.4:1). Every text token passes WCAG AA on every ground it is used on, in both modes.
3. **Warm depth.** Shadows are low, wide and brown-tinted (`--lx-shadow-*`), never grey-blue.
4. **Serif for names, sans for work.** Cormorant Garamond only on page and conversation titles; Inter/Ubuntu for everything else.
5. **Gold is jewellery.** `--lx-gold` only for thin indicators (selected-row bar, active tab underline, active rail marker, reaction outline). Gold *text* uses `--lx-gold-ink`.
6. **Theme, don't rebuild.** Only colour, type, radius, shadow, spacing inside components. Never hide, move or resize Teams controls.

## Palette

| Role | Token | Hex |
| --- | --- | --- |
| Conversation ground | `--lx-canvas` | #F7F3EC pearl |
| Chat list | `--lx-sidebar` | #F2ECE2 linen |
| App rail, top bar | `--lx-rail` | #ECE4D7 sand |
| Others' bubbles, cards | `--lx-surface` | #FCFAF6 ivory |
| Menus, dialogs, file cards, composer | `--lx-surface-raised` | #FFFFFF |
| My bubbles | `--lx-mine` | #EEE4D2 champagne |
| Selected row | `--lx-selected` | #E8DCC8 |
| Hover | `--lx-hover` | #EFE7DA |
| Hairlines | `--lx-hairline` / `-strong` | #E3D8C7 / #D3C4AD |
| Primary text | `--lx-ink` | #2A2520 |
| Secondary text | `--lx-ink-muted` | #625850 |
| Primary action fill | `--lx-primary` | #3A322B espresso (ivory text 12:1) |
| Accent indicator | `--lx-gold` | #C4A574 (decor only) |
| Accent text, links, focus | `--lx-gold-ink` | #765826 |
| Pastel pairs (fill / ink) | sage, blush, mist, butter | avatars, status, badges |

Status: available = sage ink `#6F8A72` dot; busy/unread badge = `--lx-blush-ink`; away = `#C9A44E`. Always paired with the existing text/aria labels — never colour alone.

## Night palette (dark mode)

Same token names, so every rule works unchanged. Defined in `tokens/pearl-luxe.tokens.css` under `:root[data-lx-theme="dark"]`.

Night is deliberately lifted (warm graphite-brown, not near-black) and uses large lightness steps between layers, so rail, list, conversation, bubbles and menus stay distinguishable on dim or low-contrast screens.

| Role | Token | Hex |
| --- | --- | --- |
| App rail, top bar | `--lx-rail` | #2B2723 (darkest layer) |
| Conversation ground | `--lx-canvas` | #36312C |
| Chat list | `--lx-sidebar` | #423B35 |
| Others' bubbles, cards | `--lx-surface` | #48413A (bordered with hairline) |
| Menus, dialogs, file cards, composer | `--lx-surface-raised` | #544C44 |
| My bubbles | `--lx-mine` | #5E4F3C bronze champagne |
| Selected / hover | `--lx-selected` / `--lx-hover` | #5C4E3C / #4E463F |
| Hairlines | `--lx-hairline` / `-strong` | #5F564C / #756A5D |
| Primary text | `--lx-ink` | #F6F1E8 ivory (11.4:1 on canvas) |
| Secondary text | `--lx-ink-muted` | #D6CDC0 (8.2:1, 5.1 on selected) |
| Primary action fill | `--lx-primary` | #EBDABA champagne, dark text 10.8:1 |
| Accent indicator / text | `--lx-gold` / `--lx-gold-ink` | #D4B47A / #EBD3A3 (8.8:1) |
| Unread badge | `--lx-badge` | #E3A497 with dark text (7.1:1) |
| Pastels (fill / ink) | sage, blush, mist, butter | tinted fills with light inks (all 5.6:1+) |

Layer separation (contrast between neighbours): rail→canvas 1.15, canvas→list 1.17, canvas→others' bubbles 1.28, bubbles→menus 1.19, canvas→my bubbles 1.63, list→selected row 1.37 plus a gold bar. Every text token stays at 5:1 or more on every Night ground.

Night differences in behaviour: the primary flips from dark espresso to light champagne, so buttons stay the brightest element; shadows are black-based but soft; nothing else changes.

### Switching

- `theme/pearl-luxe` (auto): light by default, Night under `prefers-color-scheme: dark` or Teams' own dark marker (selector to VERIFY).
- `theme/pearl-luxe-night`: always Night.

## Type

| Use | Font | Size / weight |
| --- | --- | --- |
| Column title ("Chat") | display serif | 30 / 600 |
| Conversation title | display serif | 26 / 600 |
| Body, messages | body sans | 14.5 / 400, line-height 1.55 |
| List rows | body sans | 14 / 400 (600 when unread) |
| Meta (author, time) | body sans | 12 / 400, muted |
| Section labels | body sans | 11 / 600, uppercase, 0.08em tracking |

## Regions

- **Title + top bar:** sand ground, hairline bottom. Search is an ivory pill with hairline border.
- **App rail:** sand. Active item: ivory tile with shadow-1 plus a 3px gold bar on the left edge. Unread badge in blush ink with a sand ring.
- **Chat list:** linen. Filter chips are pills; the active chip is espresso with ivory text. Section headers become small-caps labels. Rows are 40px, 10px radius, inset; selected row is `--lx-selected` with a 3px gold bar.
- **Conversation header:** serif name, tabs with a 2px gold underline on the active tab, hairline divider.
- **Messages:** others' bubbles ivory with hairline and shadow-1, 16px radius; mine champagne, no border, no shadow. 6px between bubbles in a group, 18px between groups. Content width capped (~880px) where Teams allows.
- **Attachments / image grids:** white cards, 14px radius, hairline, shadow-1; file icon on a butter tile.
- **Reactions:** pale pills; reacted state champagne with gold outline and gold-ink count.
- **Composer:** white, 18px radius, shadow-2; send is an espresso circle.
- **Menus / popovers / dialogs:** white, 16px radius, shadow-3, hairline.
- **Focus:** 2px `--lx-gold-ink` outline, 2px offset, everywhere.

## Accessibility

- AA contrast verified for all text tokens on canvas, sidebar, rail, surfaces, mine and selected grounds in both modes (lowest: light gold-ink on selected 4.9:1; Night muted on selected 5.1:1).
- Focus ring always visible. `prefers-reduced-motion` removes transitions.
- No information carried by colour alone; existing labels and icons stay.

## Out of scope

Teams high-contrast mode, call/meeting stages, Microsoft sign-in pages, native menus, notifications and the xdg-desktop-portal picker.
