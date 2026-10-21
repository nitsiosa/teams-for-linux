# Pearl Luxe selector audit

Audited 2026-10-21 against the current signed-in Teams v2 document. The audit
returned selector counts, visibility counts, safe static `data-tid` values,
ARIA roles, Fluent class names, and theme booleans only. It did not return or
store URLs, text, HTML, attributes containing dynamic values, accessibility
trees, screenshots, console output, profile IDs, messages, contacts, or account
information.

Raw sanitized counts: `selector-audit.json`.

## State covered

- One visible Teams page/frame.
- Light mode (`prefers-color-scheme: dark` false).
- Open chat with chat list, conversation header/tabs, message history,
  reactions, composer, send control, app rail, search, and unread/presence
  badges.
- No visible attachment card, menu, dialog, channel view, call/meeting stage,
  or secondary profile.

Absence in this state is not evidence that a selector is stale. Unseen states
are omitted from the theme rather than guessed.

## Audited selectors used

- Title/search:
  - `[data-tid="title-bar"]`
  - `[data-tid="title-bar"] input[type="search"]`
- App rail:
  - `[data-tid="app-layout-area--nav"]`
  - `[data-tid="app-bar-wrapper"]`
- Chat-list column:
  - `[data-tid="app-layout-area--mid-nav"]`
  - scoped `[role="treeitem"]`, selected tree items, and filter toolbars
- Conversation header:
  - `[data-tid="entity-header"]`
  - `[data-tid="chat-title"]`
  - scoped tablist/tab selectors
- Messages:
  - `[data-tid="message-pane-layout"]`
  - `[data-tid="chat-pane-message"]`
  - `.fui-ChatMyMessage` (audited exact Fluent class; no stable mine attribute
    was present)
  - `[data-tid="message-author-name"]`
- Reactions:
  - `[data-tid*="reaction"] button`
  - `[data-tid*="reaction"] [role="button"]`
- Composer:
  - `[data-tid="chat-pane-compose-message-footer"]`
  - scoped `[data-tid="ckeditor"]`
  - `[data-tid="sendMessageCommands-send"]`
- Unread badge:
  - `.fui-CounterBadge`

## Removed from the supplied candidate CSS

- English/localized selectors:
  - `input[placeholder^="Search"]`
  - `button[aria-label^="Send"]`
  - `nav[aria-label="App bar"]`
  - `[aria-label="Chat list"]`
- Generated/sub-string classes:
  - `[class*="fui-FluentProvider"]`
  - `[class*="header"]`, `[class*="title"]`, `[class*="mine"]`
  - `[class*="CounterBadge"]`
- Overbroad document selectors:
  - `:root`, `body`, `h1`, `time`, global `:focus-visible`, global scrollbars
  - global menu/dialog/listbox selectors
- Unobserved candidates:
  - attachment/file-card selectors
  - message timestamp selector
  - app-header/app-bar/chat-list/left-rail aliases
  - generic compose wrappers and the old send-button ID

## Dark-mode decision

No stable Teams-owned dark marker was verified without changing live UI state.
The adaptive theme therefore uses Electron/Chromium
`prefers-color-scheme: dark`; the forced `pearlLuxeNight` theme is independent
of any Teams marker. The one-time default migration enables
`appearance.followSystemTheme`, keeping Teams and the adaptive CSS aligned.
Users who disable system following and select Teams Dark manually should select
Pearl Luxe Night.

## Remaining manual checks

- User visual confirmation of Light and Night in the existing session.
- Secondary-profile main document and iframe injection when a second safe
  profile is available.
- Attachments, menus, and dialogs may receive token remapping from their
  audited chat-region ancestor, but no dedicated selector is claimed until
  those states can be observed without creating activity.
- Calls and meetings remain excluded and must be checked only for
  non-interference in a controlled acceptance call.
