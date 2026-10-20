'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { findScreenShareProblems } = require('../../app/screenSharing/waylandPrerequisites');

const RUNTIME_DIR = '/run/user/1000';
const SERVICE = '/usr/share/dbus-1/services/org.freedesktop.portal.Desktop.service';
const PORTALS = '/usr/share/xdg-desktop-portal/portals';
const GNOME_PORTAL = [
  '[portal]',
  'DBusName=org.freedesktop.impl.portal.desktop.gnome',
  'Interfaces=org.freedesktop.impl.portal.Access;org.freedesktop.impl.portal.ScreenCast;org.freedesktop.impl.portal.Screenshot;',
  'UseIn=gnome',
].join('\n');
const GTK_PORTAL = '[portal]\nInterfaces=org.freedesktop.impl.portal.FileChooser;\n';

// A fake file system holding the given files, keyed by absolute path.
function fakeFileSystem(files) {
  return {
    existsSync: (p) => Object.hasOwn(files, p),
    readdirSync: (dir) => {
      const names = Object.keys(files)
        .filter((p) => path.dirname(p) === dir)
        .map((p) => path.basename(p));
      if (names.length === 0) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return names;
    },
    readFileSync: (p) => files[p],
  };
}

const HEALTHY = {
  [path.join(RUNTIME_DIR, 'pipewire-0')]: '',
  [SERVICE]: '',
  [path.join(PORTALS, 'gnome.portal')]: GNOME_PORTAL,
  [path.join(PORTALS, 'gtk.portal')]: GTK_PORTAL,
};
const ENV = { XDG_RUNTIME_DIR: RUNTIME_DIR, XDG_DATA_DIRS: '/usr/local/share:/usr/share' };

function problemsWith(files, env = ENV) {
  return findScreenShareProblems({ env, fileSystem: fakeFileSystem(files) });
}

function without(files, ...keys) {
  return Object.fromEntries(Object.entries(files).filter(([key]) => !keys.includes(key)));
}

describe('Wayland screen-sharing prerequisites', () => {
  it('reports nothing when PipeWire, the portal and a ScreenCast backend are present', () => {
    assert.deepStrictEqual(problemsWith(HEALTHY), []);
  });

  it('reports a missing PipeWire socket', () => {
    const problems = problemsWith(without(HEALTHY, path.join(RUNTIME_DIR, 'pipewire-0')));
    assert.strictEqual(problems.length, 1);
    assert.match(problems[0], /PipeWire/);
  });

  it('does not judge PipeWire when it is pointed elsewhere or the runtime dir is unknown', () => {
    const files = without(HEALTHY, path.join(RUNTIME_DIR, 'pipewire-0'));
    assert.deepStrictEqual(problemsWith(files, { ...ENV, PIPEWIRE_REMOTE: 'pipewire-custom' }), []);
    assert.deepStrictEqual(problemsWith(files, { XDG_DATA_DIRS: ENV.XDG_DATA_DIRS }), []);
  });

  it('reports a missing portal service without also blaming the backend', () => {
    const problems = problemsWith(without(HEALTHY, SERVICE));
    assert.strictEqual(problems.length, 1);
    assert.match(problems[0], /xdg-desktop-portal does not seem to be installed/);
  });

  it('reports a portal with no ScreenCast backend', () => {
    const problems = problemsWith(without(HEALTHY, path.join(PORTALS, 'gnome.portal')));
    assert.strictEqual(problems.length, 1);
    assert.match(problems[0], /No xdg-desktop-portal backend offers screen casting/);
  });

  it('finds the portal through XDG_DATA_DIRS and falls back to the spec default', () => {
    const elsewhere = {
      [path.join(RUNTIME_DIR, 'pipewire-0')]: '',
      '/run/current-system/sw/share/dbus-1/services/org.freedesktop.portal.Desktop.service': '',
      '/run/current-system/sw/share/xdg-desktop-portal/portals/gnome.portal': GNOME_PORTAL,
    };
    assert.deepStrictEqual(problemsWith(elsewhere, { ...ENV, XDG_DATA_DIRS: '/run/current-system/sw/share' }), []);
    assert.deepStrictEqual(problemsWith(HEALTHY, { XDG_RUNTIME_DIR: RUNTIME_DIR }), []);
  });

  it('skips the checks inside Flatpak and snap', () => {
    assert.deepStrictEqual(problemsWith({}, { ...ENV, FLATPAK_ID: 'com.github.IsmaelMartinez.teams_for_linux' }), []);
    assert.deepStrictEqual(problemsWith({}, { ...ENV, SNAP: '/snap/teams-for-linux/current' }), []);
  });

  it('keeps user paths out of the messages', () => {
    for (const problem of problemsWith({})) {
      assert.ok(!problem.includes(RUNTIME_DIR), problem);
    }
  });
});
