"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  BACKUP_FILE,
  DEFAULT_THEME_ID,
  MIGRATION_VERSION,
  SETTINGS_KEY,
  migrateDefaultTheme,
} = require("../../app/customCSS/defaultThemeMigration");

class MemoryStore {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }

  get(key, fallback) {
    return this.values.has(key) ? this.values.get(key) : fallback;
  }

  set(key, value) {
    this.values.set(key, value);
  }
}

function fixture(t) {
  const directory = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "tfl-pearl-migration-"))
  );
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return {
    directory,
    configFile: path.join(directory, "config.json"),
    backupFile: path.join(directory, BACKUP_FILE),
    store: new MemoryStore(),
  };
}

describe("Pearl Luxe default-theme migration", () => {
  it("creates a private config for a new user", (t) => {
    const context = fixture(t);
    assert.deepStrictEqual(
      migrateDefaultTheme(context.directory, context.store),
      { status: "migrated", backupCreated: false }
    );
    assert.deepStrictEqual(
      JSON.parse(fs.readFileSync(context.configFile, "utf8")),
      {
        appearance: {
          cssName: DEFAULT_THEME_ID,
          followSystemTheme: true,
        },
      }
    );
    assert.strictEqual(
      fs.statSync(context.configFile).mode & 0o777,
      0o600
    );
    assert.strictEqual(fs.existsSync(context.backupFile), false);
    assert.strictEqual(
      context.store.get(SETTINGS_KEY),
      MIGRATION_VERSION
    );
  });

  it("backs up and overrides an existing selection without losing settings", (t) => {
    const context = fixture(t);
    const original = {
      appearance: {
        cssName: "compactDark",
        cssLocation: "/example/theme.css",
        followSystemTheme: false,
      },
      window: { menubar: "auto" },
      appTitle: "Preserve",
    };
    const originalText = `${JSON.stringify(original, null, 2)}\n`;
    fs.writeFileSync(context.configFile, originalText, { mode: 0o640 });

    assert.deepStrictEqual(
      migrateDefaultTheme(context.directory, context.store),
      { status: "migrated", backupCreated: true }
    );
    assert.strictEqual(
      fs.readFileSync(context.backupFile, "utf8"),
      originalText
    );
    assert.strictEqual(
      fs.statSync(context.backupFile).mode & 0o777,
      0o640
    );
    assert.deepStrictEqual(
      JSON.parse(fs.readFileSync(context.configFile, "utf8")),
      {
        ...original,
        appearance: {
          ...original.appearance,
          cssName: DEFAULT_THEME_ID,
          followSystemTheme: true,
        },
      }
    );
  });

  it("runs once and respects every later user choice", (t) => {
    const context = fixture(t);
    fs.writeFileSync(
      context.configFile,
      '{"appearance":{"cssName":"condensedLight"}}\n'
    );
    migrateDefaultTheme(context.directory, context.store);
    fs.writeFileSync(
      context.configFile,
      '{"appearance":{"cssName":"teamsDefault"}}\n'
    );
    assert.deepStrictEqual(
      migrateDefaultTheme(context.directory, context.store),
      { status: "already-migrated" }
    );
    assert.strictEqual(
      fs.readFileSync(context.configFile, "utf8"),
      '{"appearance":{"cssName":"teamsDefault"}}\n'
    );
  });

  it("does not touch invalid config or record a completed migration", (t) => {
    const context = fixture(t);
    fs.writeFileSync(context.configFile, "{ invalid");
    const warnings = [];
    assert.deepStrictEqual(
      migrateDefaultTheme(context.directory, context.store, {
        logger: { warn: (message) => warnings.push(message) },
      }),
      { status: "invalid-config" }
    );
    assert.strictEqual(fs.readFileSync(context.configFile, "utf8"), "{ invalid");
    assert.strictEqual(fs.existsSync(context.backupFile), false);
    assert.strictEqual(context.store.get(SETTINGS_KEY), undefined);
    assert.deepStrictEqual(warnings, [
      "[Pearl Luxe] Default-theme migration skipped: config is not valid JSON.",
    ]);
  });

  it("preserves a managed config symlink and its target mode", (t) => {
    const context = fixture(t);
    const target = path.join(context.directory, "managed-config.json");
    fs.writeFileSync(
      target,
      '{"appearance":{"cssName":"compactLight"}}\n',
      { mode: 0o600 }
    );
    fs.symlinkSync(target, context.configFile);
    migrateDefaultTheme(context.directory, context.store);
    assert.strictEqual(fs.lstatSync(context.configFile).isSymbolicLink(), true);
    assert.strictEqual(fs.statSync(target).mode & 0o777, 0o600);
    assert.strictEqual(
      JSON.parse(fs.readFileSync(target, "utf8")).appearance.cssName,
      DEFAULT_THEME_ID
    );
  });

  it("never overwrites an existing rollback copy", (t) => {
    const context = fixture(t);
    fs.writeFileSync(
      context.configFile,
      '{"appearance":{"cssName":"compactDark"}}\n'
    );
    fs.writeFileSync(context.backupFile, '{"sentinel":true}\n');
    migrateDefaultTheme(context.directory, context.store);
    assert.strictEqual(
      fs.readFileSync(context.backupFile, "utf8"),
      '{"sentinel":true}\n'
    );
  });
});
