'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const ROOT = join(__dirname, '..', '..');
const BUILD_ICONS = new Map([
  [16, '201874cf8753548d46a626189d735e12112a71105869e0a422f2ae47e368fdd5'],
  [24, '5576c737a2da8cdeed5c504d469665310d7464fb4aeccfb65d2f60725c138b0d'],
  [32, 'eac2f089d2552a6275bdf883cb647b6a82fed26b35d1ee14c677c698245414ff'],
  [48, '7555638b7ebd1ee4a2f5d865076aede33bb5f76d7c260daa8fa4b42d11ff389d'],
  [64, '8806932a9f205f69fa4d93c77c785262d499d8217731f6a8603875c0ef343d0f'],
  [96, 'fd9c375c05242d42e3b9927318f9159098f29ce3c7fb70396ea180086476ad1b'],
  [128, '1a748051daa7ea51584df8aab384bc9b190e2f143c9dc99a56efca2ed14dedfe'],
  [256, '65e96c545d8fd0fe3323f3545de43ec37140c2aadc88196dbbe4efa5d85976d8'],
  [512, 'f1ce29f07e03abd252cee3135a4d3f8b65b17803129aae2abb0141f5a158ac14'],
  [1024, '8ffe9310f51bc5af68b84f88c3ed02f3c8a7daf76fe5a69435fb03e6df0e9fe2'],
]);

function file(relative) {
  return readFileSync(join(ROOT, relative));
}

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

function pngSize(data) {
  assert.deepStrictEqual(data.subarray(1, 4).toString('ascii'), 'PNG');
  assert.strictEqual(data.subarray(12, 16).toString('ascii'), 'IHDR');
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

describe('Harbour Huddle application icons', () => {
  it('keeps every packaged PNG at its declared size and reviewed content', () => {
    for (const [size, digest] of BUILD_ICONS) {
      const data = file(`build/icons/${size}x${size}.png`);
      assert.deepStrictEqual(pngSize(data), [size, size], `${size}px dimensions`);
      assert.strictEqual(sha256(data), digest, `${size}px digest`);
    }
  });

  it('uses the same color artwork at runtime and in the package', () => {
    for (const size of [16, 96, 256]) {
      assert.deepStrictEqual(
        file(`app/assets/icons/icon-${size}x${size}.png`),
        file(`build/icons/${size}x${size}.png`),
        `${size}px runtime icon`,
      );
    }
  });

  it('tracks the vector source and its brand colors', () => {
    const source = file('build/icon-source/harbour-huddle-app-icon.svg').toString('utf8');
    for (const color of ['#16233f', '#4f8cff', '#ff8a5b', '#ffffff']) {
      assert.ok(source.includes(color), color);
    }
  });
});
