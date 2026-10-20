# Product specification: Teams for Linux — Wayland media prototype

## Problem

Ubuntu/Wayland engineers need a usable desktop Teams application; chats alone are insufficient. The minimum viable outcome is dependable interactive meetings with **two-way audio/video** and **sending and receiving screen shares**, including a complete Wayland desktop, without switching operating system.

## Source and users
- Source: fork of https://github.com/IsmaelMartinez/teams-for-linux (GPL-3.0-or-later).
- Primary user/environment: Ubuntu desktop, `XDG_SESSION_TYPE=wayland` (GNOME expected but **verify**, don't assume); corporate Microsoft 365 account permitted at prototype stage where available.
- Audience: engineering/product Linux users; potential upstream community contribution.

## P0 (blocking for signoff)

| ID | Requirement | Evidence / pass condition |
|---|---|---|
| P0-01 | Correct Wayland mode | Packaged `.deb` launches via native Wayland on a Wayland desktop, or supplies a clearly documented reliable Wayland launcher; no unexpected fallback to XWayland for full screen capture. |
| P0-02 | Authorised Teams login | User signs in normally; MFA/Conditional Access honored; no custom credential scraping. |
| P0-03 | Call and camera | Two-way microphone/speaker and camera work with another participant. |
| P0-04 | Window sharing | User selects an application window through host portal; remote party can see dynamic content. |
| P0-05 | Full desktop sharing | User selects a full monitor/screen through host portal; remote party sees actual Wayland desktop, not a black screen or just X11 surfaces. |
| P0-06 | Simultaneous media | Audio continues, and camera behaves as expected, while sharing is active; switching/stopping share does not disconnect meeting. |
| P0-07 | Receive share | Linux user sees remote party's presentation at useful quality with ongoing audio. |
| P0-08 | Isolation and safety | Screen capture only after a user-initiated share and portal consent; source stopped when requested / meeting ends; no unsolicited recording/logging. |
| P0-09 | Reproducible .deb | Build and install on a fresh-ish Ubuntu/Wayland environment; desktop launcher, icon, deep links (if present) remain usable. |

## P1 (valuable, but cannot delay P0)
- GNOME notifications and incoming call handling; preserve existing successful upstream behavior.
- Share source changes within a call, reconnect after transient disruption, screen lock/resume, multiple monitors / HiDPI, USB headset/camera selection.
- Better user-facing diagnostics on missing portals or permissions; copyable **redacted** diagnostic bundle.
- Reasonable CPU and memory in a 30-minute call; log observations rather than inventing performance targets.

## Non-goals
- Remote-control of another person's desktop or allowing another participant to remotely operate the Ubuntu desktop.
- Rebuilding Microsoft's private Teams transport or meeting signalling protocol; bypassing sign-in or corporate controls.
- Custom Teams branding, Outlook reimplementation, chat redesign, media recording/transcription, background capture, tenant-wide rollout or production management.
- Full Snap/Flatpak support in first milestone; package initial prototype as `.deb` to avoid conflating code faults with confinement issues.

## Success criteria

1. Automated lint/unit/targeted E2E green; known upstream failures isolated and documented.
2. `.deb` installs and launches on Ubuntu Wayland using a native Wayland configuration.
3. Two distinct people run test meeting scenarios in `TEST_MATRIX.md`, three successive window/full-screen share cycles, plus 30-minute soak. All P0 checks pass.
4. Minimal fork delta, tests/docs, changelog, threat/privacy notes, and an upstream contribution plan.

**Do not declare P0 passed solely from an Electron fixture or browser automation.** Only another human seeing the actual media on a second account/device can validate it.
