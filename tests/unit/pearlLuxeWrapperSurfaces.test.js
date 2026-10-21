"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
const SURFACES = new Map([
  ["app/_shared/securePrompt.html", "tfl-pl-secure-prompt"],
  ["app/documentationWindow/documentation.html", "tfl-pl-documentation"],
  ["app/incomingCallToast/incomingCallToast.html", "tfl-pl-incoming-call"],
  ["app/joinMeetingDialog/joinMeeting.html", "tfl-pl-join-meeting"],
  ["app/login/login.html", "tfl-pl-login"],
  [
    "app/notificationSystem/notificationToast.html",
    "tfl-pl-notification-toast",
  ],
  [
    "app/profileDialogs/addProfile/addProfile.html",
    "tfl-pl-add-profile",
  ],
  [
    "app/profileDialogs/manageProfile/manageProfile.html",
    "tfl-pl-manage-profiles",
  ],
  ["app/profileSwitcher/switcher.html", "tfl-pl-profile-switcher"],
  ["app/quickChat/quickChatModal.html", "tfl-pl-quick-chat"],
  ["app/screenPicker/index.html", "tfl-pl-legacy-picker"],
  ["app/screenSharing/index.html", "tfl-pl-screen-picker"],
  [
    "app/screenSharing/previewWindow.html",
    "tfl-pl-share-preview",
  ],
  ["app/webauthn/pinDialog.html", "tfl-pl-webauthn-pin"],
  ["app/webauthn/touchPrompt.html", "tfl-pl-webauthn-touch"],
]);

function walkHtml(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkHtml(absolute);
    return entry.name.endsWith(".html")
      ? [path.relative(ROOT, absolute).replaceAll(path.sep, "/")]
      : [];
  });
}

describe("Pearl Luxe wrapper surfaces", () => {
  it("accounts for every packaged app HTML file", () => {
    assert.deepStrictEqual(
      walkHtml(path.join(ROOT, "app")).sort(),
      [...SURFACES.keys()].sort()
    );
  });

  it("links the shared tokens and primitives from every surface", () => {
    for (const [relative, surfaceClass] of SURFACES) {
      const html = fs.readFileSync(path.join(ROOT, relative), "utf8");
      assert.match(html, /pearlLuxe\/tokens\.css/);
      assert.match(html, /pearlLuxe\/components\.css/);
      assert.match(html, /pearlLuxe\/surfaces\.css/);
      assert.ok(html.includes(surfaceClass), relative);
    }
  });

  it("keeps wrapper CSS local, scoped and free of extra color literals", () => {
    for (const name of ["components.css", "surfaces.css"]) {
      const css = fs.readFileSync(
        path.join(ROOT, "app", "_shared", "pearlLuxe", name),
        "utf8"
      );
      assert.doesNotMatch(css, /https?:\/\/|@import/i, name);
      assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i, name);
      assert.doesNotMatch(css, /(^|})\s*(body|button|input|textarea)\b/im, name);
    }
  });

  it("adds keyboard and live-region semantics to dynamic surfaces", () => {
    const notification = fs.readFileSync(
      path.join(
        ROOT,
        "app",
        "notificationSystem",
        "notificationToast.html"
      ),
      "utf8"
    );
    assert.match(notification, /role="button"/);
    assert.match(notification, /tabindex="0"/);
    assert.match(notification, /event\.key === 'Enter'/);

    const quickChat = fs.readFileSync(
      path.join(ROOT, "app", "quickChat", "quickChatModal.html"),
      "utf8"
    );
    assert.match(quickChat, /role="listbox"/);
    assert.match(quickChat, /aria-live="assertive"/);
    assert.match(quickChat, /li\.role = 'option'/);

    const incoming = fs.readFileSync(
      path.join(
        ROOT,
        "app",
        "incomingCallToast",
        "incomingCallToast.html"
      ),
      "utf8"
    );
    assert.strictEqual(
      (incoming.match(/aria-label="(?:Accept|Decline)/g) || []).length,
      3
    );
  });
});
