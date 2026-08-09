// Test-only harness - not exported from the package's main entry point.
// See mock-host.ts for why this doesn't work in Playwright/Node-driven
// browser automation.

export { installMockPlatformHost, uninstallMockPlatformHost } from './mock-host.js';
