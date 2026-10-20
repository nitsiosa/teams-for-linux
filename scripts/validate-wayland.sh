#!/usr/bin/env bash
# Strict repository verification. No network access unless npm/electron-builder require it.
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [ ! -f package.json ] || [ ! -d app ]; then
  echo 'Run this only from a bootstrapped teams-for-linux checkout.' >&2
  exit 2
fi
run() { printf '\n>>> %s\n' "$*"; "$@"; }
run npm run lint
run npm run test:unit
case "${1:-}" in
  --e2e) run npm run test:e2e ;;
  --deb) run npm run dist:linux:deb ;;
  --all) run npm run test:e2e; run npm run dist:linux:deb ;;
  '' ) printf '\nAutomated basic verification completed. Live media still requires human test.\n' ;;
  *) echo 'Usage: bash scripts/validate-wayland.sh [--e2e|--deb|--all]' >&2; exit 2 ;;
esac
