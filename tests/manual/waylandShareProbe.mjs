// Manual screen-sharing probe for Linux desktops. Not part of CI: it launches
// the app from the checkout on the live desktop and needs a person to answer
// every picker it opens.
//
//   node tests/manual/waylandShareProbe.mjs <x11|wayland> [config.json] [attempts]
//
// Each attempt calls getDisplayMedia in the main window and prints one JSON
// line: whether the in-app picker appeared, the xdg-desktop-portal ScreenCast
// calls the app made, the source types it asked the portal for, and whether
// the captured frame has content. Frames never leave the renderer; only their
// mean brightness and its spread are reported. The app runs with --no-sandbox
// because Chromium cannot start sandboxed from a checkout on Ubuntu 24.04.
import { _electron as electron } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findMainTeamsWindow, waitForLoginRedirect } from '../e2e/helpers/electronApp.js';

const PORTAL_SOURCE_TYPES = { 1: 'monitor', 2: 'window', 3: 'monitor+window' };
const ATTEMPT_TIMEOUT_MS = 120000;

const RENDERER_PROBE = `(async () => {
  const started = Date.now();
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const [track] = stream.getVideoTracks();
    const settings = track.getSettings();
    const video = document.createElement('video');
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 90;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    let sumOfSquares = 0;
    for (let i = 0; i < data.length; i += 4) {
      const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += luma;
      sumOfSquares += luma * luma;
    }
    const pixels = data.length / 4;
    const mean = sum / pixels;
    const spread = Math.sqrt(Math.max(0, sumOfSquares / pixels - mean * mean));
    stream.getTracks().forEach((t) => t.stop());
    return {
      granted: true,
      ms: Date.now() - started,
      displaySurface: settings.displaySurface ?? null,
      width: settings.width ?? null,
      height: settings.height ?? null,
      lumaMean: Math.round(mean),
      lumaSpread: Math.round(spread),
    };
  } catch (error) {
    return { granted: false, ms: Date.now() - started, error: error.name };
  }
})()`;

function startPortalMonitor() {
  const monitor = spawn('dbus-monitor', [
    '--session',
    "type='method_call',interface='org.freedesktop.portal.ScreenCast'",
    "type='signal',interface='org.freedesktop.portal.Request',member='Response'",
  ]);
  const lines = [];
  let pending = '';
  monitor.stdout.setEncoding('utf8');
  monitor.stdout.on('data', (chunk) => {
    const parts = (pending + chunk).split('\n');
    pending = parts.pop();
    lines.push(...parts);
  });
  return { monitor, lines };
}

// Portal response codes: 0 granted, 1 cancelled by the user, 2 other failure.
function summarisePortal(lines) {
  const summary = { createSession: 0, selectSources: 0, start: 0, openPipeWireRemote: 0, sourceTypes: [], responses: [] };
  lines.forEach((line, i) => {
    const next = lines[i + 1] ?? '';
    if (line.includes('member=CreateSession')) summary.createSession++;
    else if (line.includes('member=SelectSources')) summary.selectSources++;
    else if (line.includes('member=Start')) summary.start++;
    else if (line.includes('member=OpenPipeWireRemote')) summary.openPipeWireRemote++;
    else if (line.includes('string "types"')) {
      const value = /uint32 (\d+)/.exec(next);
      if (value) summary.sourceTypes.push(PORTAL_SOURCE_TYPES[value[1]] ?? value[1]);
    } else if (line.includes('member=Response')) {
      const code = /uint32 (\d+)/.exec(next);
      if (code) summary.responses.push(Number(code[1]));
    }
  });
  return summary;
}

// Runs in the main process: one getDisplayMedia call with a user gesture,
// while watching for an extra view (the in-app picker) on the main window.
function runAttempt(app) {
  return app.evaluate(async ({ BrowserWindow }, { probe, timeoutMs }) => {
    const hosts = ['teams.cloud.microsoft', 'teams.microsoft.com', 'teams.live.com', 'login.microsoftonline.com'];
    const win = BrowserWindow.getAllWindows().find((w) => {
      try {
        return hosts.includes(new URL(w.webContents.getURL()).hostname);
      } catch {
        return false;
      }
    });
    if (!win) return { granted: false, error: 'main window not found' };
    const baseline = win.contentView.children.length;
    let peak = baseline;
    const timer = setInterval(() => {
      peak = Math.max(peak, win.contentView.children.length);
    }, 200);
    try {
      const result = await Promise.race([
        win.webContents.executeJavaScript(probe, true),
        new Promise((resolve) => setTimeout(() => resolve({ granted: false, error: 'timeout' }), timeoutMs)),
      ]);
      return { ...result, inAppPicker: peak > baseline };
    } finally {
      clearInterval(timer);
    }
  }, { probe: RENDERER_PROBE, timeoutMs: ATTEMPT_TIMEOUT_MS });
}

const [ozone, configPath, attemptsArg = '3'] = process.argv.slice(2);
if (!['x11', 'wayland'].includes(ozone)) {
  console.error('usage: node tests/manual/waylandShareProbe.mjs <x11|wayland> [config.json] [attempts]');
  process.exit(2);
}

const userDataDir = mkdtempSync(join(tmpdir(), 'tfl-probe-'));
if (configPath) {
  writeFileSync(join(userDataDir, 'config.json'), readFileSync(configPath));
}
const env = { ...process.env, E2E_USER_DATA_DIR: userDataDir };
delete env.ELECTRON_RUN_AS_NODE;

const { monitor, lines } = startPortalMonitor();
const app = await electron.launch({
  args: ['./app/index.js', '--no-sandbox', `--ozone-platform=${ozone}`],
  env,
  timeout: 30000,
});

try {
  await app.firstWindow({ timeout: 30000 });
  let mainWindow;
  for (let i = 0; i < 30 && !mainWindow; i++) {
    mainWindow = findMainTeamsWindow(app);
    if (!mainWindow) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!mainWindow) throw new Error('main window not found');
  await waitForLoginRedirect(mainWindow);

  const attempts = Number(attemptsArg);
  for (let attempt = 1; attempt <= attempts; attempt++) {
    console.error(`attempt ${attempt}/${attempts}: waiting for the picker`);
    const from = lines.length;
    const result = await runAttempt(app);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(JSON.stringify({ ozone, attempt, ...result, portal: summarisePortal(lines.slice(from)) }));
  }
} finally {
  await app.close().catch(() => {});
  monitor.kill();
  rmSync(userDataDir, { recursive: true, force: true });
}
