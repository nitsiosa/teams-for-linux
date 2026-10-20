// Startup checks for what screen sharing needs on a Wayland session: the
// PipeWire socket, the xdg-desktop-portal D-Bus service, and a portal backend
// that offers ScreenCast. Each problem is one log line with no user data; an
// empty list means nothing obvious is missing. Flatpak and snap runtimes lay
// these files out differently, so the checks are skipped there.
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_DATA_DIRS = "/usr/local/share:/usr/share";
const PORTAL_SERVICE = path.join("dbus-1", "services", "org.freedesktop.portal.Desktop.service");
const PORTALS_DIR = path.join("xdg-desktop-portal", "portals");
const SCREENCAST_INTERFACE = "org.freedesktop.impl.portal.ScreenCast";

function offersScreenCast(fileSystem, portalsDir) {
  let entries;
  try {
    entries = fileSystem.readdirSync(portalsDir);
  } catch {
    return false;
  }
  return entries.some((name) => {
    if (!name.endsWith(".portal")) return false;
    try {
      return fileSystem.readFileSync(path.join(portalsDir, name), "utf8").includes(SCREENCAST_INTERFACE);
    } catch {
      return false;
    }
  });
}

/**
 * @param {object} [host] the environment and file system to inspect; tests pass fakes.
 * @returns {string[]} problems, empty when nothing obvious is missing.
 */
function findScreenShareProblems({ env = process.env, fileSystem = fs } = {}) {
  if (env.FLATPAK_ID || env.SNAP) return [];

  const problems = [];
  // PIPEWIRE_REMOTE points the client at a socket other than pipewire-0.
  if (
    env.XDG_RUNTIME_DIR &&
    !env.PIPEWIRE_REMOTE &&
    !fileSystem.existsSync(path.join(env.XDG_RUNTIME_DIR, "pipewire-0"))
  ) {
    problems.push("PipeWire does not seem to be running (no pipewire-0 socket); screen sharing on Wayland needs it.");
  }

  const dataDirs = (env.XDG_DATA_DIRS || DEFAULT_DATA_DIRS).split(":").filter(Boolean);
  if (!dataDirs.some((dir) => fileSystem.existsSync(path.join(dir, PORTAL_SERVICE)))) {
    problems.push("xdg-desktop-portal does not seem to be installed; screen sharing on Wayland needs it.");
  } else if (!dataDirs.some((dir) => offersScreenCast(fileSystem, path.join(dir, PORTALS_DIR)))) {
    problems.push(
      "No xdg-desktop-portal backend offers screen casting; install the one for your desktop, " +
        "such as xdg-desktop-portal-gnome, xdg-desktop-portal-kde or xdg-desktop-portal-wlr."
    );
  }
  return problems;
}

module.exports = { findScreenShareProblems };
