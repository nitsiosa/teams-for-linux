// Display-media handler for native Wayland with wayland.portalPicker on. One
// desktopCapturer.getSources() call opens the xdg-desktop-portal dialog and
// resolves with the single source the user picked, which goes straight to
// Chromium (single enumeration rule, #2713). A cancelled dialog resolves with
// no sources, so Teams gets a rejected getDisplayMedia instead of a stream
// whose track has already ended.
const PORTAL_SOURCE_OPTIONS = {
  types: ["screen", "window"],
  thumbnailSize: { width: 0, height: 0 },
};

// setImmediate and try/catch, as in the in-app picker path, so Teams can retry.
function rejectRequest(callback) {
  setImmediate(() => {
    try {
      callback({});
    } catch {
      console.debug("[SCREEN_SHARE] Failed to complete portal picker callback");
    }
  });
}

/**
 * @param {object} deps
 * @param {(options: object) => Promise<Electron.DesktopCapturerSource[]>} deps.getSources
 * @param {(source: Electron.DesktopCapturerSource, callback: Function) => void} deps.onSourceSelected
 */
function createPortalPickerHandler({ getSources, onSourceSelected }) {
  let dialogOpen = false;

  return async (_request, callback) => {
    // A second request while the dialog is open would stack another dialog.
    if (dialogOpen) {
      console.warn("[SCREEN_SHARE] Portal picker already open, rejecting duplicate request");
      rejectRequest(callback);
      return;
    }

    dialogOpen = true;
    try {
      const sources = (await getSources(PORTAL_SOURCE_OPTIONS)) ?? [];
      if (sources.length === 1) {
        onSourceSelected(sources[0], callback);
        return;
      }
      if (sources.length > 1) {
        // Only the portal may choose what is shared; never take a source the user did not pick.
        console.warn("[SCREEN_SHARE] Portal picker returned several sources, rejecting", {
          count: sources.length,
        });
      } else {
        console.info("[SCREEN_SHARE] Portal picker cancelled");
      }
      rejectRequest(callback);
    } catch (error) {
      // getSources also rejects when the user cancels the dialog, so this is not always a failure.
      console.warn("[SCREEN_SHARE] Portal picker ended without a source", {
        reason: error?.message || String(error),
      });
      rejectRequest(callback);
    } finally {
      dialogOpen = false;
    }
  };
}

module.exports = { createPortalPickerHandler, PORTAL_SOURCE_OPTIONS };
