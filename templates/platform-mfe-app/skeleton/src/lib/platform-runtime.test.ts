import { afterEach, describe, expect, it } from 'vitest';

import {
  detectPlatformHost,
  PlatformRuntimeUnavailableError,
  resolvePlatformRuntime,
} from '@platform/sdk';
import { installMockPlatformHost, uninstallMockPlatformHost } from '@platform/sdk/testing';

import { appInfo } from './app-info';
import { resolveAppRuntime } from './platform-runtime';

// This exercises the real @platform/sdk vendored into this app (not a
// mock) - proof that the runtime boundary + this app's own wiring in
// main.tsx/app.tsx behave as documented, not just that the package builds
// in isolation. See docs/platform-sdk.md's "Standalone vs. hosted" section.

afterEach(() => {
  uninstallMockPlatformHost();
});

describe('resolvePlatformRuntime', () => {
  it('never uses a host in "standalone" mode, even if one is present', () => {
    expect(resolvePlatformRuntime('standalone', null)).toEqual({
      runtimeMode: 'standalone',
    });
    expect(
      resolvePlatformRuntime('standalone', { contractVersion: 1 }),
    ).toEqual({ runtimeMode: 'standalone' });
  });

  it('requires a host in "platform-mfe" mode and fails clearly without one', () => {
    expect(() => resolvePlatformRuntime('platform-mfe', null)).toThrow(
      PlatformRuntimeUnavailableError,
    );
    expect(() => resolvePlatformRuntime('platform-mfe', null)).toThrow(
      /requires running inside a platform host/,
    );
  });

  it('uses the host when present in "platform-mfe" mode', () => {
    const adapters = { auth: {} } as never;
    expect(
      resolvePlatformRuntime('platform-mfe', { contractVersion: 1, adapters }),
    ).toEqual({ runtimeMode: 'hosted', adapters });
  });

  it('falls back to standalone in "standalone-and-mfe" mode with no host', () => {
    expect(resolvePlatformRuntime('standalone-and-mfe', null)).toEqual({
      runtimeMode: 'standalone',
    });
  });

  it('uses the host in "standalone-and-mfe" mode when present', () => {
    expect(
      resolvePlatformRuntime('standalone-and-mfe', { contractVersion: 1 }),
    ).toEqual({ runtimeMode: 'hosted', adapters: undefined });
  });
});

describe('detectPlatformHost', () => {
  it('returns null when no host is installed', () => {
    expect(detectPlatformHost()).toBeNull();
  });

  it('returns the host context when a valid mock host is installed', () => {
    installMockPlatformHost({ adapters: {} });
    expect(detectPlatformHost()).toEqual({ contractVersion: 1, adapters: {} });
  });

  it('returns null for an unrecognized contract version', () => {
    (window as unknown as Record<string, unknown>).__PLATFORM_HOST__ = {
      contractVersion: 999,
    };
    expect(detectPlatformHost()).toBeNull();
  });
});

describe('resolveAppRuntime (this app\'s own scaffolded mode)', () => {
  it('reflects this app\'s platform-app.json mode with no host present', () => {
    if (appInfo.mode === 'platform-mfe') {
      expect(() => resolveAppRuntime()).toThrow(PlatformRuntimeUnavailableError);
    } else {
      expect(resolveAppRuntime()).toEqual({ runtimeMode: 'standalone' });
    }
  });

  it('reports hosted when a mock host is installed, for any mode', () => {
    installMockPlatformHost();
    if (appInfo.mode === 'standalone') {
      expect(resolveAppRuntime()).toEqual({ runtimeMode: 'standalone' });
    } else {
      expect(resolveAppRuntime().runtimeMode).toBe('hosted');
    }
  });
});
