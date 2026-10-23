"use strict";

// Microsoft 365 apps that Teams embeds as frames from their own origins:
// Outlook (Calendar), Viva Engage, OneDrive and SharePoint, and Copilot.
// These frames receive only the Pearl colour layer. Teams' own host check in
// helpers/teamsHosts.js, used for navigation and security decisions, is
// deliberately separate and unchanged.
const EMBEDDED_APP_HOSTS = Object.freeze([
  "outlook.cloud.microsoft",
  "outlook.office.com",
  "outlook.office365.com",
  "engage.cloud.microsoft",
  "web.yammer.com",
  "onedrive.cloud.microsoft",
  "copilot.cloud.microsoft",
  "m365.cloud.microsoft",
]);

// One tenant label only, e.g. contoso.sharepoint.com or contoso-my.sharepoint.com.
const SHAREPOINT_TENANT_HOST = /^[a-z0-9-]+\.sharepoint\.com$/;

function isEmbeddedAppUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (EMBEDDED_APP_HOSTS.includes(url.hostname) ||
        SHAREPOINT_TENANT_HOST.test(url.hostname));
  } catch {
    return false;
  }
}

module.exports = { EMBEDDED_APP_HOSTS, isEmbeddedAppUrl };
