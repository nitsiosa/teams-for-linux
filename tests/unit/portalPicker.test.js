'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { createPortalPickerHandler, PORTAL_SOURCE_OPTIONS } = require('../../app/screenSharing/portalPicker');

const SCREEN = { id: 'screen:63:0', name: 'Entire screen' };
const WINDOW = { id: 'window:71:0', name: 'Some window' };

// Builds a handler around a fake getSources. share() calls it the way Chromium
// does and resolves with whatever reached the callback.
function harness(getSources) {
  const getSourcesCalls = [];
  const selected = [];
  const handler = createPortalPickerHandler({
    getSources: async (options) => {
      getSourcesCalls.push(options);
      return getSources();
    },
    onSourceSelected: (source, callback) => {
      selected.push(source);
      callback({ video: { id: source.id, name: source.name } });
    },
  });
  const share = () => new Promise((resolve) => handler({}, resolve));
  return { share, handler, getSourcesCalls, selected };
}

describe('portal picker display-media handler', () => {
  it('asks the portal once, for screens and windows, without thumbnails', async () => {
    const { share, getSourcesCalls } = harness(() => [SCREEN]);
    await share();
    assert.deepStrictEqual(getSourcesCalls, [PORTAL_SOURCE_OPTIONS]);
    assert.deepStrictEqual(PORTAL_SOURCE_OPTIONS.types, ['screen', 'window']);
    assert.deepStrictEqual(PORTAL_SOURCE_OPTIONS.thumbnailSize, { width: 0, height: 0 });
  });

  it('passes the picked source straight to Chromium', async () => {
    const { share, selected } = harness(() => [WINDOW]);
    assert.deepStrictEqual(await share(), { video: { id: WINDOW.id, name: WINDOW.name } });
    assert.deepStrictEqual(selected, [WINDOW]);
  });

  it('rejects the request when the portal dialog is cancelled', async () => {
    const { share, selected } = harness(() => []);
    assert.deepStrictEqual(await share(), {});
    assert.deepStrictEqual(selected, []);
  });

  it('never shares a source the portal did not pick', async () => {
    const { share, selected } = harness(() => [SCREEN, WINDOW]);
    assert.deepStrictEqual(await share(), {});
    assert.deepStrictEqual(selected, []);
  });

  it('rejects the request when getSources fails', async () => {
    const { share, selected } = harness(() => {
      throw new Error('portal unavailable');
    });
    assert.deepStrictEqual(await share(), {});
    assert.deepStrictEqual(selected, []);
  });

  it('rejects a second request while the dialog is open, then accepts new ones', async () => {
    let answer;
    const pending = new Promise((resolve) => {
      answer = resolve;
    });
    const { share, getSourcesCalls } = harness(() => pending);

    const first = share();
    assert.deepStrictEqual(await share(), {}, 'duplicate rejected');
    assert.strictEqual(getSourcesCalls.length, 1, 'no second dialog');

    answer([SCREEN]);
    assert.deepStrictEqual(await first, { video: { id: SCREEN.id, name: SCREEN.name } });

    await share();
    assert.strictEqual(getSourcesCalls.length, 2, 'next share opens a new dialog');
  });

  it('survives a callback that throws on rejection', async () => {
    const { handler } = harness(() => []);
    await handler({}, () => {
      throw new Error('request already gone');
    });
    await new Promise((resolve) => setImmediate(resolve));
  });
});
