'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const {
	NETWORK_ERROR_CODES,
	NETWORK_ERROR_PATTERNS,
} = require('../../app/config/defaults');

const electronPath = require.resolve('electron');
const connectionManagerPath = require.resolve('../../app/connectionManager');

function installElectronMock() {
	require.cache[electronPath] = {
		id: electronPath,
		filename: electronPath,
		loaded: true,
		exports: {
			ipcMain: { on() {}, removeListener() {} },
			powerMonitor: { on() {}, removeListener() {} },
			net: {},
		},
	};
}

// Captures the did-fail-load handler start() installs and counts the retries
// it schedules.
function managerWithFailLoadHandler() {
	const ConnectionManager = require('../../app/connectionManager');
	const manager = new ConnectionManager();
	let didFailLoad;
	const window = {
		isDestroyed: () => false,
		setTitle() {},
		reload() {},
		async loadURL() {},
		webContents: {
			on(event, handler) {
				if (event === 'did-fail-load') didFailLoad = handler;
			},
			removeListener() {},
			getURL: () => '',
		},
	};
	manager.refresh = () => {};
	manager.start('https://teams.cloud.microsoft', {
		window,
		config: { url: 'https://teams.cloud.microsoft' },
	});
	let scheduled = 0;
	manager.debouncedRefresh = () => { scheduled += 1; };
	return {
		manager,
		failMainFrame: (code, description) =>
			didFailLoad({}, code, description, 'https://teams.cloud.microsoft/', true),
		scheduled: () => scheduled,
	};
}

describe('ConnectionManager main-frame load failures', () => {
	const original = {};
	let manager;

	beforeEach(() => {
		installElectronMock();
		delete require.cache[connectionManagerPath];
		for (const level of ['error', 'debug']) original[level] = console[level];
		console.error = () => {};
		console.debug = () => {};
	});

	afterEach(() => {
		manager?.cleanup();
		manager = undefined;
		Object.assign(console, original);
		delete require.cache[electronPath];
		delete require.cache[connectionManagerPath];
	});

	it('retries a network change reported with an empty description', () => {
		const harness = managerWithFailLoadHandler();
		manager = harness.manager;
		harness.failMainFrame(-21, '');
		assert.strictEqual(harness.scheduled(), 1);
	});

	it('retries listed errors by name and ignores unlisted failures', () => {
		const harness = managerWithFailLoadHandler();
		manager = harness.manager;
		harness.failMainFrame(-106, 'ERR_INTERNET_DISCONNECTED');
		harness.failMainFrame(-3, 'ERR_ABORTED');
		harness.failMainFrame(-3, '');
		assert.strictEqual(harness.scheduled(), 1);
	});

	it('knows the Chromium code of every retryable network error', () => {
		assert.deepStrictEqual(
			Object.keys(NETWORK_ERROR_CODES).sort(),
			[...NETWORK_ERROR_PATTERNS].sort()
		);
	});
});
