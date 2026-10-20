// Manual screen-sharing probe for Linux desktops. Not part of CI: it launches
// the app from the checkout on the live desktop and needs a person to answer
// every picker it opens.
//
//   node tests/manual/waylandShareProbe.mjs <x11|wayland> [config.json] [attempts] [--camera]
//
// --camera opens the camera and microphone first and reports, after every
// share attempt, whether the camera track is still live and its frames still
// change. Camera frames are reduced to the same brightness numbers; the
// microphone is only checked for a live track, never listened to.
//
// It opens a solid magenta window titled "PICK THIS - TFL probe target" to pick for window
// shares. Each attempt calls getDisplayMedia in the main window and prints one JSON
// line: whether the in-app picker appeared, the xdg-desktop-portal ScreenCast
// calls the app made, the source types it asked the portal for, the app's own
// screen-share log lines, and whether the captured frame has content. An
// attempt that gets no answer ends the run. Frames never leave the renderer; only their
// mean brightness and its spread are reported. The app runs with --no-sandbox
// because Chromium cannot start sandboxed from a checkout on Ubuntu 24.04.
import { _electron as electron } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findMainTeamsWindow, waitForLoginRedirect } from '../e2e/helpers/electronApp.js';

const PORTAL_SOURCE_TYPES = { 1: 'monitor', 2: 'window', 3: 'monitor+window' };
const ATTEMPT_TIMEOUT_MS = 90000;
const LOG_PATTERN = /SCREEN_SHARE|StreamSelector|picker|desktopCapturer|getDisplayMedia/i;

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
    let magenta = 0;
    for (let i = 0; i < data.length; i += 4) {
      const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += luma;
      sumOfSquares += luma * luma;
      if (data[i] > 200 && data[i + 1] < 70 && data[i + 2] > 200) magenta++;
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
      targetShare: Math.round((magenta / pixels) * 100) / 100,
    };
  } catch (error) {
    return { granted: false, ms: Date.now() - started, error: error.name };
  }
})()`;

// Camera helpers for --camera, run in the main window. The stream and a video
// element showing it live on window globals between calls.
const CAMERA_START = `(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    const video = document.createElement('video');
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    window.__tflProbeCamera = { stream, video };
    const [track] = stream.getVideoTracks();
    const settings = track ? track.getSettings() : {};
    return {
      granted: true,
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
      width: settings.width ?? null,
      height: settings.height ?? null,
    };
  } catch (error) {
    return { granted: false, error: error.name };
  }
})()`;

// Two small frames 400 ms apart: frameChange near 0 means a frozen or black feed.
const CAMERA_CHECK = `(async () => {
  const camera = window.__tflProbeCamera;
  if (!camera) return { open: false };
  const sample = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 36;
    const context = canvas.getContext('2d');
    context.drawImage(camera.video, 0, 0, canvas.width, canvas.height);
    return context.getImageData(0, 0, canvas.width, canvas.height).data;
  };
  const first = sample();
  await new Promise((resolve) => setTimeout(resolve, 400));
  const second = sample();
  let change = 0;
  let sum = 0;
  for (let i = 0; i < first.length; i += 4) {
    change += Math.abs(first[i] - second[i]) + Math.abs(first[i + 1] - second[i + 1]) + Math.abs(first[i + 2] - second[i + 2]);
    sum += 0.2126 * second[i] + 0.7152 * second[i + 1] + 0.0722 * second[i + 2];
  }
  const pixels = first.length / 4;
  const live = (tracks) => tracks.length > 0 && tracks.every((t) => t.readyState === 'live' && t.enabled);
  return {
    open: true,
    videoLive: live(camera.stream.getVideoTracks()),
    micLive: live(camera.stream.getAudioTracks()),
    micMuted: camera.stream.getAudioTracks().some((t) => t.muted),
    lumaMean: Math.round(sum / pixels),
    frameChange: Math.round((change / (pixels * 3)) * 100) / 100,
  };
})()`;

const CAMERA_STOP = `(() => {
  const camera = window.__tflProbeCamera;
  if (!camera) return 0;
  const tracks = camera.stream.getTracks();
  tracks.forEach((t) => t.stop());
  delete window.__tflProbeCamera;
  return tracks.length;
})()`;

// ScreenCast sessions the portal still holds (leaves under /session/<sender>/).
function openPortalSessions() {
  const tree = spawnSync('busctl', ['--user', 'tree', 'org.freedesktop.portal.Desktop'], { encoding: 'utf8' });
  return (tree.stdout?.match(/\/org\/freedesktop\/portal\/desktop\/session\/[^/\s]+\/[^/\s]+/g) ?? []).length;
}

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

// The race lives in this process because a stuck share request can stop the
// app's main process from running the probe's own timers.
function withTimeout(promise, ms, fallback) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

function collectLines(stream, lines) {
  let pending = '';
  stream?.on('data', (chunk) => {
    const parts = (pending + String(chunk)).split('\n');
    pending = parts.pop();
    lines.push(...parts);
  });
}

// The app's own screen-share log lines, with URLs removed.
function relevantLines(lines) {
  const matching = lines
    .filter((line) => LOG_PATTERN.test(line))
    .map((line) => line.replace(/https?:\/\/\S+/g, '<url>').slice(0, 160));
  return [...new Set(matching)].slice(0, 12);
}

// Portal response codes: 0 granted, 1 cancelled by the user, 2 other failure.
function summarisePortal(lines) {
  const summary = {
    createSession: 0,
    selectSources: 0,
    start: 0,
    openPipeWireRemote: 0,
    sourceTypes: [],
    // SelectSources persist_mode (0 none, 1 this session, 2 until revoked) and
    // restore tokens sent with SelectSources or returned in a response.
    persistModes: [],
    restoreTokensSent: 0,
    restoreTokensReturned: 0,
    selected: [],
    streamSizes: [],
    responses: [],
    // Time from each Start call to the next portal response: a dialog the user
    // answers takes seconds, a silently restored selection takes milliseconds.
    startToResponseMs: [],
  };
  const timeOf = (line) => Number(/time=(\d+\.\d+)/.exec(line)?.[1]);
  let startedAt = null;
  let message = null;
  lines.forEach((line, i) => {
    const next = lines[i + 1] ?? '';
    const member = /member=(\w+)/.exec(line)?.[1];
    if (member) message = member;
    if (member === 'CreateSession') summary.createSession++;
    else if (member === 'SelectSources') summary.selectSources++;
    else if (member === 'Start') {
      summary.start++;
      startedAt = timeOf(line);
    } else if (member === 'OpenPipeWireRemote') summary.openPipeWireRemote++;
    else if (line.includes('string "persist_mode"') && message === 'SelectSources') {
      const value = /uint32 (\d+)/.exec(next);
      if (value) summary.persistModes.push(Number(value[1]));
    } else if (line.includes('string "restore_token"')) {
      if (message === 'SelectSources') summary.restoreTokensSent++;
      else if (message === 'Response') summary.restoreTokensReturned++;
    } else if (line.includes('string "types"')) {
      const value = /uint32 (\d+)/.exec(next);
      if (value) summary.sourceTypes.push(PORTAL_SOURCE_TYPES[value[1]] ?? value[1]);
    } else if (line.includes('string "source_type"')) {
      const value = /uint32 (\d+)/.exec(next);
      if (value) summary.selected.push(PORTAL_SOURCE_TYPES[value[1]] ?? value[1]);
    } else if (line.includes('string "size"')) {
      const size = lines.slice(i + 1, i + 5).map((l) => /int32 (\d+)/.exec(l)?.[1]).filter(Boolean);
      if (size.length >= 2) summary.streamSizes.push(`${size[0]}x${size[1]}`);
    } else if (member === 'Response') {
      const code = /uint32 (\d+)/.exec(next);
      if (code) summary.responses.push(Number(code[1]));
      if (startedAt !== null) {
        summary.startToResponseMs.push(Math.round((timeOf(line) - startedAt) * 1000));
        startedAt = null;
      }
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

// Runs renderer code in the main window with a user gesture.
function runInMainWindow(app, code) {
  return app.evaluate(async ({ BrowserWindow }, source) => {
    const hosts = ['teams.cloud.microsoft', 'teams.microsoft.com', 'teams.live.com', 'login.microsoftonline.com'];
    const win = BrowserWindow.getAllWindows().find((w) => {
      try {
        return hosts.includes(new URL(w.webContents.getURL()).hostname);
      } catch {
        return false;
      }
    });
    if (!win) return { error: 'main window not found' };
    return win.webContents.executeJavaScript(source, true);
  }, code);
}

const args = process.argv.slice(2);
const withCamera = args.includes('--camera');
const [ozone, configPath, attemptsArg = '3'] = args.filter((arg) => !arg.startsWith('--'));
if (!['x11', 'wayland'].includes(ozone)) {
  console.error('usage: node tests/manual/waylandShareProbe.mjs <x11|wayland> [config.json] [attempts] [--camera]');
  process.exit(2);
}

const userDataDir = mkdtempSync(join(tmpdir(), 'tfl-probe-'));
if (configPath) {
  writeFileSync(join(userDataDir, 'config.json'), readFileSync(configPath));
}
// E2E_TESTING lifts the main process eval() guard that blocks
// electronApp.evaluate; it changes nothing else in the app.
const env = { ...process.env, E2E_USER_DATA_DIR: userDataDir, E2E_TESTING: 'true' };
delete env.ELECTRON_RUN_AS_NODE;

const { monitor, lines } = startPortalMonitor();
const app = await electron.launch({
  args: ['./app/index.js', '--no-sandbox', `--ozone-platform=${ozone}`],
  env,
  timeout: 30000,
});
// Kept here because ElectronApplication.process() throws once the app is closed.
const appProcess = app.process();
const appOutput = [];
collectLines(appProcess.stdout, appOutput);
collectLines(appProcess.stderr, appOutput);
const rendererOutput = [];
console.error(`[probe] app launched (--ozone-platform=${ozone})`);

try {
  await app.firstWindow({ timeout: 30000 });
  let mainWindow;
  for (let i = 0; i < 30 && !mainWindow; i++) {
    mainWindow = findMainTeamsWindow(app);
    if (!mainWindow) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!mainWindow) throw new Error('main window not found');
  mainWindow.on('console', (message) => rendererOutput.push(message.text()));
  await waitForLoginRedirect(mainWindow);
  console.error('[probe] sign-in page loaded');

  // A solid magenta window to pick for window shares: the captured frame's
  // magenta share (targetShare) tells a window capture from a whole screen.
  // Side by side with the main window so the portal dialog is not buried under
  // either; native Wayland compositors may ignore the positions.
  await app.evaluate(({ BrowserWindow }) => {
    const hosts = ['teams.cloud.microsoft', 'teams.microsoft.com', 'teams.live.com', 'login.microsoftonline.com'];
    const main = BrowserWindow.getAllWindows().find((w) => {
      try {
        return hosts.includes(new URL(w.webContents.getURL()).hostname);
      } catch {
        return false;
      }
    });
    main?.setBounds({ x: 760, y: 80, width: 900, height: 650 });
    const target = new BrowserWindow({ x: 40, y: 80, width: 700, height: 450, title: 'PICK THIS - TFL probe target', backgroundColor: '#ff00ff' });
    target.loadURL('data:text/html,<title>PICK THIS - TFL probe target</title><body style="margin:0;background:%23ff00ff"></body>');
  });
  console.error('[probe] magenta "PICK THIS - TFL probe target" window opened');

  if (withCamera) {
    const camera = await withTimeout(runInMainWindow(app, CAMERA_START), 30000, { granted: false, error: 'timeout' });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const before = camera.granted
      ? await withTimeout(runInMainWindow(app, CAMERA_CHECK), 10000, { open: false, error: 'timeout' })
      : null;
    console.log(JSON.stringify({ ozone, step: 'camera-start', ...camera, before }));
  }

  const attempts = Number(attemptsArg);
  for (let attempt = 1; attempt <= attempts; attempt++) {
    console.error(`[probe] attempt ${attempt}/${attempts}: calling getDisplayMedia, answer the prompt if one appears`);
    const fromPortal = lines.length;
    const fromApp = appOutput.length;
    const fromRenderer = rendererOutput.length;
    const result = await withTimeout(runAttempt(app), ATTEMPT_TIMEOUT_MS + 5000, { granted: false, error: 'timeout' });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const mainProcessResponsive = result.error === 'timeout'
      ? await withTimeout(app.evaluate(() => true), 5000, false)
      : true;
    // Give Chromium a moment to close the capture before counting sessions.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const openSessionsAfter = openPortalSessions();
    const cameraAfter = withCamera
      ? await withTimeout(runInMainWindow(app, CAMERA_CHECK), 10000, { open: false, error: 'timeout' })
      : undefined;
    console.log(JSON.stringify({
      ozone,
      attempt,
      ...result,
      mainProcessResponsive,
      openSessionsAfter,
      cameraAfter,
      portal: summarisePortal(lines.slice(fromPortal)),
      appLog: relevantLines(appOutput.slice(fromApp)),
      rendererLog: relevantLines(rendererOutput.slice(fromRenderer)),
    }));
    if (result.error === 'timeout') {
      console.error('[probe] no answer within the timeout; skipping the remaining attempts');
      break;
    }
  }

  if (withCamera) {
    const stopped = await withTimeout(runInMainWindow(app, CAMERA_STOP), 10000, null);
    console.log(JSON.stringify({ ozone, step: 'camera-stop', tracksStopped: stopped, openSessionsAtEnd: openPortalSessions() }));
  }
} finally {
  await withTimeout(app.close().catch(() => {}), 10000);
  if (appProcess.exitCode === null) appProcess.kill('SIGKILL');
  monitor.kill();
  rmSync(userDataDir, { recursive: true, force: true });
}
