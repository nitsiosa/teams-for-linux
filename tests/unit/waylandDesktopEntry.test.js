'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const pkg = require('../../package.json');

const ENTRY_SOURCE = 'build/linux/teams-for-linux-wayland.desktop';
const ENTRY_TARGET = '/usr/share/applications/teams-for-linux-wayland.desktop';

// Parses the [Desktop Entry] group of a .desktop file into a key/value map.
function desktopEntry(source) {
  const entry = {};
  let inGroup = false;
  for (const line of source.split('\n')) {
    if (line.startsWith('[')) {
      inGroup = line.trim() === '[Desktop Entry]';
      continue;
    }
    const separator = line.indexOf('=');
    if (inGroup && separator > 0 && !line.startsWith('#')) {
      entry[line.slice(0, separator)] = line.slice(separator + 1);
    }
  }
  return entry;
}

// The deb ships a second, opt-in launcher for native Wayland next to the
// default one, which keeps --ozone-platform=x11 (ADR-031).
describe('native Wayland desktop entry in the deb', () => {
  const entry = desktopEntry(readFileSync(join(__dirname, '..', '..', ENTRY_SOURCE), 'utf8'));
  const appName = pkg.productName ?? pkg.name;
  const executableName = pkg.build.linux.executableName;

  it('keeps the default launcher on X11 as the fallback', () => {
    assert.deepStrictEqual(pkg.build.linux.executableArgs, ['--ozone-platform=x11']);
  });

  it('is mapped into the deb and not the rpm', () => {
    assert.ok(pkg.build.deb.fpm.includes(`${ENTRY_SOURCE}=${ENTRY_TARGET}`));
    assert.ok(pkg.build.rpm.fpm.every((arg) => !arg.includes(ENTRY_SOURCE)));
  });

  it('starts the installed binary the AppArmor profile covers, in native Wayland mode with the portal picker', () => {
    const [binary, ...args] = entry.Exec.split(' ');
    assert.strictEqual(binary, `/opt/${appName}/${executableName}`);
    assert.deepStrictEqual(args, ['--ozone-platform=wayland', '--wayland.portalPicker=true', '%U']);
  });

  it('leaves msteams: links to the default launcher', () => {
    assert.strictEqual(entry.MimeType, undefined);
  });

  it('uses the same icon and window class as the default launcher', () => {
    const wmClass = pkg.desktopName ? pkg.desktopName.replace(/\.desktop$/, '') : appName;
    assert.strictEqual(entry.Type, 'Application');
    assert.strictEqual(entry.Icon, executableName);
    assert.strictEqual(entry.StartupWMClass, wmClass);
  });
});
