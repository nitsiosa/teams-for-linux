# Custom CSS Module

Provides custom styling capabilities for the Teams interface and its iframe content. CSS selection and discovery are separate from injection.

## Configuration Options

- **`appearance.cssLocation`**: Path to custom CSS file
- **`appearance.cssName`**: Built-in theme name or `custom:<id>` for a discovered user theme

`appearance.cssName` takes precedence over `appearance.cssLocation`. Existing built-in names and deprecated `customCSSName` / `customCSSLocation` aliases remain supported. Theme settings are restart-only; the native **Settings → Theme** menu persists selection through `AppConfiguration` and offers a restart.

Pearl Luxe is the default. On the first launch of the version that introduced
it, the app makes a permission-preserving
`config.pre-pearl-luxe-v1.json` rollback copy and selects Pearl Luxe with
system-theme following. This migration runs once; later theme choices are
respected.

## Available Themes

- `pearlLuxe`: default warm Light/Night theme, following the OS preference
- `pearlLuxeNight`: forced Night palette
- `compactDark`, `compactLight`: Compact interface variants
- `condensedDark`, `condensedLight`: Condensed layout variants
- `tweaks`: General UI improvements
- `teamsDefault`: Microsoft Teams without injected custom theme CSS

Themes sourced from [userstyles.org](https://userstyles.org). See [issue #77](https://github.com/IsmaelMartinez/teams-for-linux/issues/77) for adding new themes.

Pearl Luxe contains no remote font or image requests. The adaptive theme uses
the OS colour preference; `appearance.followSystemTheme` (enabled by default)
keeps Teams' own preference aligned. Pearl Luxe Night is always dark. Older
themes do not set Teams' preference themselves.

## User Theme Discovery

User themes live under `<configPath>/themes/`, using the application's existing configuration path rather than an installation-specific path. Each immediate child directory contains metadata and a CSS file:

```text
themes/
  my-theme/
    theme.json
    theme.css
```

Minimum `theme.json`:

```json
{
  "id": "my-theme",
  "name": "My Theme",
  "css": "theme.css"
}
```

Optional string metadata fields are `author`, `version`, and `description`. The `id` is the stable persisted identity; the folder name and display `name` may change independently. IDs begin with a letter or digit and contain only letters, digits, dots, underscores, or hyphens. Metadata files are limited to 64 KiB.

Discovery runs at startup and accepts only valid local themes. It does not recursively scan subdirectories or load JavaScript. CSS must resolve to a file inside its theme folder: absolute paths, parent traversal, and escaping symlinks are rejected. Invalid metadata, missing CSS, and unsafe paths produce concise warnings and do not block startup. Built-in IDs are reserved; duplicate custom IDs resolve deterministically to the first valid folder in sorted folder-name order.

## Selection and Fallback

The native **Settings → Theme** menu lists **Default — Pearl Luxe**,
**Microsoft Teams / No custom theme**, **Built-in**, and **Custom** choices
using human-readable names. It also provides **Open themes folder**.
Installing, removing, or updating themes requires a restart; no filesystem
watching is used.

Selecting a theme saves only the relevant theme settings and preserves the
rest of `config.json`. A custom selection uses
`appearance.cssName: "custom:my-theme"`; built-ins retain their existing bare
names. If the selected custom theme is missing or invalid, injection safely
falls back to Pearl Luxe without rewriting the saved selection or using
`appearance.cssLocation` instead.

The **Custom CSS file** option reuses an existing `appearance.cssLocation`.
Selecting a built-in or discovered theme keeps that location available for
later reuse. **Default — Pearl Luxe** selects `pearlLuxe`; **Microsoft Teams /
No custom theme** selects `teamsDefault`. Restarting applies the saved choice
and removes the previous theme's injected styling along with the old web
content.

CSS injection is restricted to supported HTTPS Teams hosts. It is applied to
the root Teams document and to every secondary profile's main document and
Teams content frames, but never to Microsoft sign-in or unrelated embedded
content.

The one exception is the Microsoft 365 apps Teams embeds from their own
origins: Calendar (Outlook), Viva Engage, OneDrive and SharePoint, and
Copilot, listed in `embeddedApps.js`. With a built-in Pearl Luxe theme
selected, their frames receive only the colour layer (`pearlLuxeEmbedded.css`
or `pearlLuxeNightEmbedded.css`) as a constructed stylesheet; other themes
never reach them. Word, Excel, PowerPoint and other `cloud.microsoft` apps are
not on the list.

Configuration details and user instructions: [Theming & Appearance](../../docs-site/docs/configuration.md#theming--appearance).
