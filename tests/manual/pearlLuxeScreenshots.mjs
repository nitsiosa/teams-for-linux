import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const source = root;
const output = path.join(root, 'docs', 'design', 'pearl-luxe', 'screenshots');
const chrome = process.env.CHROME || '/usr/bin/google-chrome';
mkdirSync(output, { recursive: true });

const svgData = (label, background, accent = '#ffffff') => {
  const safe = label.replace(/[&<>]/g, '');
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" rx="18" fill="${background}"/><circle cx="92" cy="82" r="34" fill="${accent}" opacity=".9"/><rect x="55" y="135" width="530" height="20" rx="10" fill="${accent}" opacity=".36"/><rect x="55" y="175" width="390" height="14" rx="7" fill="${accent}" opacity=".22"/><rect x="55" y="210" width="470" height="14" rx="7" fill="${accent}" opacity=".22"/><text x="55" y="310" fill="${accent}" font-family="Arial,sans-serif" font-size="28" font-weight="600">${safe}</text></svg>`)}`;
};

const profiles = [
  { id: 'default', name: 'Design Sandbox', avatarInitials: 'DS', avatarColor: '#6264a7', pinned: true },
  { id: 'north', name: 'Northwind Demo', avatarInitials: 'ND', avatarColor: '#287f65', pinned: true },
  { id: 'studio', name: 'Prototype Studio', avatarInitials: 'PS', avatarColor: '#b35c25', pinned: false },
];

const fixtures = {
  screenPicker: {
    displays: [
      { id: 1, label: 'Built-in display', internal: true, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, scaleFactor: 1.25, displayFrequency: 60 },
      { id: 2, label: 'Design monitor', internal: false, bounds: { x: 1920, y: 0, width: 2560, height: 1440 }, scaleFactor: 1, displayFrequency: 60 },
    ],
    sources: [
      { id: 'screen:1:0', name: 'Built-in display', display_id: '1', thumbnailDataUrl: svgData('Built-in display', '#26324a', '#7cb7ff'), appIconDataUrl: null },
      { id: 'screen:2:0', name: 'Design monitor', display_id: '2', thumbnailDataUrl: svgData('Design monitor', '#372b45', '#ff9d76'), appIconDataUrl: null },
      { id: 'window:101:0', name: 'Component inventory', display_id: '', thumbnailDataUrl: svgData('Component inventory', '#173d38', '#8de0bd'), appIconDataUrl: null },
      { id: 'window:102:0', name: 'Prototype notes', display_id: '', thumbnailDataUrl: svgData('Prototype notes', '#3f3020', '#ffd58a'), appIconDataUrl: null },
      { id: 'window:103:0', name: 'Design tokens', display_id: '', thumbnailDataUrl: svgData('Design tokens', '#302b57', '#b6adff'), appIconDataUrl: null },
    ],
  },
  profiles,
  contacts: [
    { id: '1', displayName: 'Avery Example', scoredEmailAddresses: [{ address: 'avery@example.invalid' }], jobTitle: 'Product Designer' },
    { id: '2', displayName: 'Morgan Sample', scoredEmailAddresses: [{ address: 'morgan@example.invalid' }], jobTitle: 'UX Researcher' },
    { id: '3', displayName: 'Riley Prototype', scoredEmailAddresses: [{ address: 'riley@example.invalid' }], jobTitle: 'Frontend Engineer' },
  ],
};

const initMock = ({ type, data }) => {
  if (type === 'screen-picker') {
    globalThis.api = {
      getDisplays: async () => data.displays,
      desktopCapturerGetSources: async () => data.sources,
      selectSource: () => {},
      closeView: () => {},
    };
  } else if (type === 'legacy-picker') {
    globalThis.electron = { ipcRenderer: {
      on: (_channel, callback) => setTimeout(() => callback(data.sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: { toDataURL: () => source.thumbnailDataUrl },
      }))), 0),
      send: () => {},
    }};
  } else if (type === 'add-profile') {
    globalThis.addProfileApi = { submit: () => {}, cancel: () => {}, onError: () => {} };
  } else if (type === 'manage-profiles') {
    globalThis.manageProfileApi = {
      rename: async () => ({}), pin: async () => ({ ok: true }), remove: () => {}, close: () => {},
      onState: (callback) => setTimeout(() => callback({ profiles: data.profiles, activeId: 'default', shortcutsAvailable: true }), 0),
      onError: () => {},
    };
  } else if (type === 'profile-switcher') {
    globalThis.profileSwitcherApi = {
      list: async () => data.profiles,
      getActive: async () => data.profiles[0],
      switch: async () => {}, openAddDialog: () => {}, openManageDialog: () => {},
      setExpanded: async () => {}, onState: () => {},
    };
  } else if (type === 'quick-chat') {
    globalThis.quickChatApi = {
      searchPeople: async () => ({ success: true, data: { value: data.contacts } }),
      sendMessage: async () => ({ success: true }), close: () => {}, onFocus: () => {},
    };
  } else if (type === 'notification') {
    globalThis.notificationApi = {
      onNotificationToastInit: (callback) => setTimeout(() => callback({ title: 'Design review ready', body: 'The synthetic component inventory is ready to inspect.' }), 0),
      notifyClick: () => {},
    };
  } else if (type === 'incoming-call') {
    globalThis.incomingCallApi = {
      onIncomingCallToastInit: (callback) => setTimeout(() => callback({ caller: 'Avery Example', text: 'Incoming test call', image: '' }), 0),
      sendIncomingCallAction: () => {},
    };
  } else if (type === 'join-meeting') {
    globalThis.joinMeetingApi = {
      onInit: (callback) => setTimeout(() => callback({ regexPattern: '^https://teams\\.invalid/l/meetup-join/.+$', clipboardText: '' }), 0),
      submit: () => {}, cancel: () => {},
    };
  } else if (type === 'secure-prompt') {
    globalThis.securePrompt = { submit: () => {}, cancel: () => {} };
  } else if (type === 'preview') {
    globalThis.electronAPI = { resizeWindow: () => {}, onScreenSharingStatusChanged: () => {}, getScreenSharingStatus: async () => true };
  }
};

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--allow-file-access-from-files', '--disable-sync'] });

async function captureOne({ name, relative, width, height, dark = false, transparent = false, mock, after }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    colorScheme: dark ? 'dark' : 'light',
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith('file:') || url.startsWith('data:')) await route.continue();
    else await route.abort();
  });
  if (mock) await page.addInitScript(initMock, mock);
  const [relativePath, query = ''] = relative.split('?');
  const url = pathToFileURL(path.join(source, relativePath)).href + (query ? `?${query}` : '');
  await page.goto(url, { waitUntil: 'load' });
  if (after) await after(page);
  const canvas = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue('--lx-canvas')
      .trim()
      .toUpperCase()
  );
  const expectedCanvas = dark ? '#36312C' : '#F7F3EC';
  if (canvas !== expectedCanvas) {
    throw new Error(`${name}: expected ${expectedCanvas}, got ${canvas}`);
  }
  if (pageErrors.length) {
    throw new Error(`${name}: ${pageErrors.join('; ')}`);
  }
  await page.screenshot({ path: path.join(output, name), omitBackground: transparent });
  console.log(name);
  await context.close();
}

async function capture(options) {
  const stem = options.name.replace(/-(light|dark)\.png$/, '').replace(/\.png$/, '');
  await captureOne({ ...options, dark: false, name: `${stem}-light.png` });
  await captureOne({ ...options, dark: true, name: `${stem}-dark.png` });
}

await capture({
  name: '01-screen-picker-light.png', relative: 'app/screenSharing/index.html', width: 800, height: 600,
  mock: { type: 'screen-picker', data: fixtures.screenPicker },
  after: async (page) => { await page.waitForSelector('.screen-tile'); await page.locator('.screen-tile').first().click(); },
});
await capture({
  name: '02-window-picker-dark.png', relative: 'app/screenSharing/index.html', width: 800, height: 600, dark: true,
  mock: { type: 'screen-picker', data: fixtures.screenPicker },
  after: async (page) => { await page.waitForSelector('.screen-tile'); await page.locator('[data-tab="windows"]').click(); await page.waitForSelector('.window-tile'); await page.locator('.window-tile').first().click(); },
});
await capture({
  name: '03-share-preview.png', relative: 'app/screenSharing/previewWindow.html', width: 400, height: 245,
  mock: { type: 'preview', data: {} },
  after: async (page) => page.evaluate((art) => {
    const canvas = document.getElementById('screen-share-canvas');
    canvas.style.background = `#10151f url("${art}") center / cover no-repeat`;
  }, svgData('Synthetic shared content', '#203456', '#a8ccff')),
});
await capture({
  name: '04-legacy-screen-picker.png', relative: 'app/screenPicker/index.html', width: 800, height: 600,
  mock: { type: 'legacy-picker', data: fixtures.screenPicker },
  after: async (page) => page.waitForSelector('.source'),
});
await capture({
  name: '05-add-profile-light.png', relative: 'app/profileDialogs/addProfile/addProfile.html', width: 460, height: 380,
  mock: { type: 'add-profile', data: {} },
  after: async (page) => { await page.fill('#name-input', 'Design Sandbox'); await page.fill('#url-input', 'https://teams.invalid'); await page.fill('#initials-input', 'DS'); },
});
await capture({
  name: '06-manage-profiles-dark.png', relative: 'app/profileDialogs/manageProfile/manageProfile.html', width: 520, height: 420, dark: true,
  mock: { type: 'manage-profiles', data: { profiles } },
  after: async (page) => page.waitForSelector('.profile-row'),
});
await capture({ name: '07-login-dialog.png', relative: 'app/login/login.html', width: 363, height: 124 });
await capture({
  name: '08-quick-chat.png', relative: 'app/quickChat/quickChatModal.html', width: 350, height: 400,
  mock: { type: 'quick-chat', data: { contacts: fixtures.contacts } },
  after: async (page) => { await page.fill('#search-input', 'exa'); await page.waitForSelector('.contact-item'); },
});
await capture({
  name: '09-profile-switcher-dark.png', relative: 'app/profileSwitcher/switcher.html', width: 800, height: 600, dark: true, transparent: true,
  mock: { type: 'profile-switcher', data: { profiles } },
  after: async (page) => { await page.waitForFunction(() => document.getElementById('pill-avatar').textContent === 'DS'); await page.click('#pill'); await page.waitForSelector('#dropdown:not([hidden])'); },
});
await capture({
  name: '10-notification-toast.png', relative: 'app/notificationSystem/notificationToast.html', width: 360, height: 110, transparent: true,
  mock: { type: 'notification', data: {} },
  after: async (page) => page.waitForFunction(() => document.getElementById('title').textContent.length > 0),
});
await capture({
  name: '11-incoming-call.png', relative: 'app/incomingCallToast/incomingCallToast.html', width: 350, height: 240,
  mock: { type: 'incoming-call', data: {} },
  after: async (page) => page.waitForFunction(() => document.getElementById('caller').textContent.length > 0),
});
const secureQuery = '?heading=Demo%20security%20token&message=Enter%20the%20PIN%20for%20design.example.invalid&warning=One%20attempt%20remaining&submitLabel=Unlock&cancelLabel=Cancel';
await capture({
  name: '12-secure-prompt-warning.png', relative: `app/_shared/securePrompt.html${secureQuery}`, width: 420, height: 280,
  mock: { type: 'secure-prompt', data: {} },
});
await capture({
  name: '13-documentation-error.png', relative: 'app/documentationWindow/documentation.html', width: 1200, height: 800,
  after: async (page) => {
    await page.evaluate(() => {
      const frame = document.getElementById('docs-frame');
      document.getElementById('loading').classList.remove('hidden');
      frame.style.display = 'none';
      frame.dispatchEvent(new Event('error'));
    });
    await page.waitForSelector('text=Error Loading Documentation', { state: 'visible' });
  },
});
await capture({
  name: '14-join-meeting-invalid.png', relative: 'app/joinMeetingDialog/joinMeeting.html', width: 500, height: 250, dark: true,
  mock: { type: 'join-meeting', data: {} },
  after: async (page) => { await page.fill('#url-input', 'not-a-meeting-link'); await page.dispatchEvent('#url-input', 'input'); },
});

await browser.close();
