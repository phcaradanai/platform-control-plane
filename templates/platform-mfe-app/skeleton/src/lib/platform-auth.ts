import {
  createOidcAuthAdapter,
  createStandaloneAuthAdapter,
  type AuthAdapter,
} from '@platform/sdk';

import { env } from './env';

function createApplicationAuthAdapter(): AuthAdapter {
  if (env.auth.status === 'unconfigured') {
    return createStandaloneAuthAdapter();
  }
  if (env.auth.status === 'invalid' || !env.auth.config) {
    return createStandaloneAuthAdapter(
      env.auth.error ?? 'Authentication configuration is invalid.',
    );
  }
  try {
    return createOidcAuthAdapter(env.auth.config);
  } catch (error) {
    return createStandaloneAuthAdapter(
      error instanceof Error
        ? error.message
        : 'Authentication configuration is invalid.',
    );
  }
}

/** Default app-level adapter; a host adapter takes precedence at boot. */
export const appAuthAdapter = createApplicationAuthAdapter();

let activeAuthAdapter: AuthAdapter = appAuthAdapter;

/** Selects the host adapter when the runtime provides one. */
export function configurePlatformAuth(adapter: AuthAdapter): void {
  activeAuthAdapter = adapter;
}

/** Used by the generated API transport without coupling product code to React hooks. */
export async function getPlatformAccessToken(): Promise<string | null> {
  return (await activeAuthAdapter.getAccessToken?.()) ?? null;
}

/** Lets the API boundary surface a backend-rejected credential to the auth UX. */
export function handlePlatformUnauthorized(): void {
  activeAuthAdapter.handleUnauthorized?.();
}
