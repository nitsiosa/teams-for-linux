#!/usr/bin/env bash
# Read-only, privacy-minimising Ubuntu/Wayland media preflight.
set -u

section() { printf '\n== %s ==\n' "$1"; }
cmd_version() {
  local n="$1"
  if command -v "$n" >/dev/null 2>&1; then
    printf '%-23s found\n' "$n"
  else
    printf '%-23s not in PATH\n' "$n"
  fi
}
service_state() {
  local s="$1" result
  if command -v systemctl >/dev/null 2>&1; then
    result=$(systemctl --user is-active "$s" 2>/dev/null || true)
    printf '%-23s %s\n' "$s" "${result:-unknown}"
  else
    printf '%-23s unavailable (no systemctl)\n' "$s"
  fi
}
section 'OS + desktop (no PII)'
if [ -r /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  printf 'distribution: %s\n' "${PRETTY_NAME:-unknown}"
fi
printf 'kernel: %s\n' "$(uname -r)"
printf 'session: %s\n' "${XDG_SESSION_TYPE:-unset}"
printf 'desktop: %s\n' "${XDG_CURRENT_DESKTOP:-unset}"
printf 'wayland socket configured: %s\n' "$([ -n "${WAYLAND_DISPLAY:-}" ] && printf yes || printf no)"
section 'Commands present'
for c in node npm gh git teams-for-linux pipewire wireplumber xdg-desktop-portal pactl dpkg-deb; do cmd_version "$c"; done
section 'User services'
for s in pipewire wireplumber xdg-desktop-portal xdg-desktop-portal-gnome xdg-desktop-portal-gtk xdg-desktop-portal-kde xdg-desktop-portal-wlr; do service_state "$s"; done
section 'Installed portal/pipewire versions (when Debian dpkg knows them)'
if command -v dpkg-query >/dev/null 2>&1; then
  for p in pipewire wireplumber xdg-desktop-portal xdg-desktop-portal-gnome xdg-desktop-portal-gtk xdg-desktop-portal-wlr; do
    ver=$(dpkg-query -W -f='${Version}' "$p" 2>/dev/null || true)
    if [ -n "$ver" ]; then printf '%-28s %s\n' "$p" "$ver"; fi
  done
fi
section 'Warnings / next step'
if [ "${XDG_SESSION_TYPE:-}" != wayland ]; then
  printf 'WARNING: Desktop is not a Wayland session (or session type unavailable).\n'
fi
printf '%s\n' 'This check is read-only. It does not request screen/microphone permissions.'
printf '%s\n' 'Wayland session alone does not prove the Electron window uses native Wayland.'
printf '%s\n' 'Do not send authentication logs, browser storage, cookies or meeting content to issue trackers.'
