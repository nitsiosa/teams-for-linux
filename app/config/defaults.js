/**
 * Default configuration values that need to be shared across modules.
 * This file exists to allow unit tests to import default values without
 * initializing the full config system.
 */

// Network error patterns that indicate transient connection issues (proxy, tunnel, DNS, etc.)
// Used by both the global error handlers (app/index.js) and ConnectionManager.
const NETWORK_ERROR_PATTERNS = [
  'ERR_TUNNEL_CONNECTION_FAILED',
  'ERR_PROXY_CONNECTION_FAILED',
  'ERR_INTERNET_DISCONNECTED',
  'ERR_NETWORK_CHANGED',
  'ERR_CONNECTION_RESET',
  'ERR_CONNECTION_REFUSED',
  'ERR_CONNECTION_TIMED_OUT',
  // Distinct from ERR_CONNECTION_TIMED_OUT (-118): Chromium reports the generic
  // ERR_TIMED_OUT (-7) when a host is black-holed rather than refusing, which is
  // what a firewall that drops packets for an unallowed domain looks like. It was
  // missing here, so did-fail-load scheduled no retry and the window sat on
  // "Waiting for network..." with nothing left to recover it (#2875).
  'ERR_TIMED_OUT',
  'ERR_NAME_NOT_RESOLVED',
];

// Chromium net error codes for NETWORK_ERROR_PATTERNS. did-fail-load can report
// a main-frame failure with an empty description, which no name matches; an
// ERR_NETWORK_CHANGED (-21) as Wi-Fi came up after login left the window on
// "Waiting for network..." with no retry scheduled.
const NETWORK_ERROR_CODES = Object.freeze({
  ERR_TUNNEL_CONNECTION_FAILED: -111,
  ERR_PROXY_CONNECTION_FAILED: -130,
  ERR_INTERNET_DISCONNECTED: -106,
  ERR_NETWORK_CHANGED: -21,
  ERR_CONNECTION_RESET: -101,
  ERR_CONNECTION_REFUSED: -102,
  ERR_CONNECTION_TIMED_OUT: -118,
  ERR_TIMED_OUT: -7,
  ERR_NAME_NOT_RESOLVED: -105,
});

const defaults = {
  meetupJoinRegEx: String.raw`^https://teams\.(?:microsoft\.com|live\.com|cloud\.microsoft)/(v2/\?meetingjoin=|meet/|l/(?:app|call|channel|chat|entity|file|meet(?:ing|up-join)|message|task|team)/)`,
  NETWORK_ERROR_CODES,
  NETWORK_ERROR_PATTERNS,
};

module.exports = defaults;
