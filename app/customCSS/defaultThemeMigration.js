"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { isPlainObject } = require("../config/validator");

const DEFAULT_THEME_ID = "pearlLuxe";
const MIGRATION_VERSION = 1;
const SETTINGS_KEY = "appearance.pearlLuxeDefaultMigrationVersion";
const BACKUP_FILE = "config.pre-pearl-luxe-v1.json";
const FALLBACK_MODE = 0o600;

function fileMode(file) {
  try {
    return fs.statSync(file).mode & 0o777;
  } catch {
    return FALLBACK_MODE;
  }
}

function writeExclusive(file, contents, mode) {
  const descriptor = fs.openSync(file, "wx", mode);
  try {
    fs.writeFileSync(descriptor, contents);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.chmodSync(file, mode);
}

function writeAtomic(file, contents, mode) {
  const target = fs.existsSync(file) ? fs.realpathSync(file) : file;
  const temp = path.join(
    path.dirname(target),
    `.config-pearl-luxe-${process.pid}-${Date.now()}.tmp`
  );
  const descriptor = fs.openSync(temp, "wx", mode);
  try {
    try {
      fs.writeFileSync(descriptor, contents);
    } finally {
      fs.closeSync(descriptor);
    }
    fs.renameSync(temp, target);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

/**
 * Forces Pearl Luxe once, before the normal config loader runs. The previous
 * user config is copied with the same permissions and never overwritten.
 * A settings-store marker makes later user theme choices authoritative.
 */
function migrateDefaultTheme(
  configPath,
  settingsStore,
  { logger = console } = {}
) {
  if (
    !settingsStore ||
    typeof settingsStore.get !== "function" ||
    typeof settingsStore.set !== "function"
  ) {
    return { status: "store-unavailable" };
  }
  if (
    Number(settingsStore.get(SETTINGS_KEY, 0)) >= MIGRATION_VERSION
  ) {
    return { status: "already-migrated" };
  }

  const configFile = path.join(configPath, "config.json");
  const backupFile = path.join(configPath, BACKUP_FILE);
  const existed = fs.existsSync(configFile);
  let data = {};
  let originalContents = null;
  if (existed) {
    try {
      originalContents = fs.readFileSync(configFile, "utf8");
      data = JSON.parse(originalContents);
    } catch {
      logger.warn(
        "[Pearl Luxe] Default-theme migration skipped: config is not valid JSON."
      );
      return { status: "invalid-config" };
    }
    if (
      !isPlainObject(data) ||
      (Object.hasOwn(data, "appearance") &&
        !isPlainObject(data.appearance))
    ) {
      logger.warn(
        "[Pearl Luxe] Default-theme migration skipped: config has an invalid shape."
      );
      return { status: "invalid-config" };
    }
  }

  fs.mkdirSync(configPath, { recursive: true });
  const mode = existed ? fileMode(fs.realpathSync(configFile)) : FALLBACK_MODE;
  if (
    existed &&
    originalContents !== null &&
    !fs.existsSync(backupFile)
  ) {
    try {
      writeExclusive(backupFile, originalContents, mode);
    } catch {
      logger.warn(
        "[Pearl Luxe] Default-theme migration skipped: backup could not be written."
      );
      return { status: "backup-failed" };
    }
  }

  const appearance = isPlainObject(data.appearance)
    ? { ...data.appearance }
    : {};
  appearance.cssName = DEFAULT_THEME_ID;
  appearance.followSystemTheme = true;
  data = { ...data, appearance };
  try {
    writeAtomic(
      configFile,
      `${JSON.stringify(data, null, 2)}\n`,
      mode
    );
    settingsStore.set(SETTINGS_KEY, MIGRATION_VERSION);
  } catch {
    logger.warn(
      "[Pearl Luxe] Default-theme migration could not update config."
    );
    return { status: "write-failed" };
  }
  return {
    status: "migrated",
    backupCreated: existed && originalContents !== null,
  };
}

module.exports = {
  BACKUP_FILE,
  DEFAULT_THEME_ID,
  MIGRATION_VERSION,
  SETTINGS_KEY,
  migrateDefaultTheme,
};
