# Human acceptance checklist (one request)

Everything automatable has run; these checks need a person, a signed-in Teams account and a second participant. They map to L-01 to L-12 in `TEST_MATRIX.md`. Mark each PASS, FAIL or BLOCKED; nothing counts as PASS without someone observing it.

## Before you start

- A second person on another device and account, in a test meeting you control.
- Synthetic, non-sensitive content to share, for example a terminal running `watch -n 1 date`. Do not share private documents and do not record the call.
- Close any other Teams for Linux window.

## Install

```bash
cd ~/development/teams-for-linux
sha256sum dist/teams-for-linux_2.27.0_amd64.deb
# expect e15b142204add8bd163ce57a8c597e469cc63f9fdf4adcd95b124c2ac1628237
sudo apt install ./dist/teams-for-linux_2.27.0_amd64.deb
```

The package registers `/usr/bin/teams-for-linux`, installs two launchers ("Teams for Linux" and "Teams for Linux (Wayland)") and loads an AppArmor profile. To remove it later: `sudo apt remove teams-for-linux`.

## Checks

Use "Teams for Linux (Wayland)" unless a step says otherwise.

| ID | Do this | PASS when |
|---|---|---|
| L-01 | Open "Teams for Linux (Wayland)" from the app grid and sign in normally | The window shows content, not a blank or black area; sign-in and MFA work. Optional: `xwininfo -root -tree \| grep -c teams-for-linux` prints 0 (native Wayland, not XWayland) |
| L-02 | Join the test meeting; talk both ways | Both people hear each other clearly |
| L-03 | Turn your camera on | The other person sees you live; you see their video |
| L-04 | Share one window with changing content (the terminal) | One system "Share Screen" dialog appears, offering windows; the other person sees that window, moving |
| L-05 | Stop sharing, then share your entire screen | The other person sees your real desktop, including the moving terminal |
| L-06 | Keep the camera and microphone on while sharing; then stop sharing | Audio continues, the camera keeps running, and stopping the share does not end the call |
| L-07 | Ask the other person to share their screen | You see their share clearly, without black or frozen frames (GPU acceleration is off by default on Wayland) |
| L-08 | Share a window three times and the entire screen three times; once, press Cancel in the dialog | Each share shows exactly one dialog; Cancel cancels cleanly with no Teams error; no dialog hides behind other windows; no error loops |
| L-09 | If you have two monitors, share each one | The right monitor is shared each time |
| L-10 | Stay in the call for 30 minutes with camera and audio on, sharing for part of it | No freeze, crash, lost audio or video, or stuck share; note rough CPU and memory use |
| L-11 | Stop sharing, then leave the call | GNOME's screen-sharing indicator in the top bar disappears when you stop; camera and microphone indicators go off after you leave |
| L-12 | Quit, reopen "Teams for Linux (Wayland)" and join a second call; share once | You are still signed in (if policy allows) and sharing works again |

Optional comparison: in "Teams for Linux" (the default, XWayland), share the entire screen once. Upstream documents a black feed there; the probe saw real content on this machine.

## If something fails

- Fallback: use "Teams for Linux" (the default launcher) for the rest of the call.
- Logs: start `teams-for-linux --ozone-platform=wayland --wayland.portalPicker=true` from a terminal and reproduce. `[SCREEN_SHARE]` lines at startup name missing pieces (PipeWire, portal, backend).
- Report only the step ID, what you saw and the error class (no dialog, black video, dialog behind windows, Teams error after cancel). Do not paste meeting links, names, chat content or screenshots with private content.

## Results

| ID | Result | Notes |
|---|---|---|
| L-01 | | |
| L-02 | | |
| L-03 | | |
| L-04 | | |
| L-05 | | |
| L-06 | | |
| L-07 | | |
| L-08 | | |
| L-09 | | |
| L-10 | | |
| L-11 | | |
| L-12 | | |
