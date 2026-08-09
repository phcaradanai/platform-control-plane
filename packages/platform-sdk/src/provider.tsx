import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import {
  createStandaloneAuthAdapter,
  createStandaloneNavigationAdapter,
  createStandalonePermissionsAdapter,
  createStandaloneTenantAdapter,
} from './adapters/standalone.js';
import type { PlatformAdapters } from './adapters/types.js';
import type { PlatformAppIdentity, RuntimeMode } from './types.js';

export interface PlatformProviderConfig {
  /** The application's identity, read from its generated `platform-app.json`. */
  app: PlatformAppIdentity;
  /** Defaults to "standalone" - only a platform-hosted shell would pass "hosted". */
  runtimeMode?: RuntimeMode;
  /**
   * Override any capability's default adapter. Omitted capabilities fall back
   * to the standalone defaults (auth/permissions/tenant unavailable,
   * navigation backed by the browser History API).
   */
  adapters?: Partial<PlatformAdapters>;
}

interface PlatformContextValue {
  app: PlatformAppIdentity;
  runtimeMode: RuntimeMode;
  adapters: PlatformAdapters;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({
  config,
  children,
}: {
  config: PlatformProviderConfig;
  children: ReactNode;
}) {
  const { auth, permissions, tenant, navigation } = config.adapters ?? {};
  const adapters = useMemo<PlatformAdapters>(
    () => ({
      auth: auth ?? createStandaloneAuthAdapter(),
      permissions: permissions ?? createStandalonePermissionsAdapter(),
      tenant: tenant ?? createStandaloneTenantAdapter(),
      navigation: navigation ?? createStandaloneNavigationAdapter(),
    }),
    [auth, permissions, tenant, navigation],
  );

  const value = useMemo<PlatformContextValue>(
    () => ({
      app: config.app,
      runtimeMode: config.runtimeMode ?? 'standalone',
      adapters,
    }),
    [config.app, config.runtimeMode, adapters],
  );

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

/** @internal used by hooks/*; not exported from the package barrel. */
export function usePlatformContext(hookName: string): PlatformContextValue {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error(`${hookName}() must be used within a <PlatformProvider>.`);
  }
  return context;
}
