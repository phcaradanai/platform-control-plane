import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createOidcAuthAdapter,
  type OidcAuthConfig,
  type StorageLike,
} from '@platform/sdk';

function base64Url(value: string): string {
  return btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function idToken(nonce: string, sub = 'user-1'): string {
  return `header.${base64Url(
    JSON.stringify({
      sub,
      nonce,
      name: 'Ada Lovelace',
      preferred_username: 'ada',
      email: 'ada@example.com',
    }),
  )}.signature`;
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function storage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}

interface TestLocation {
  assigned: string[];
  href: string;
  origin: string;
  pathname: string;
  assign: (url: string) => void;
}

function location(href = 'http://localhost:5173/'): TestLocation {
  const assigned: string[] = [];
  const current = new URL(href);
  return {
    assigned,
    href,
    origin: current.origin,
    pathname: current.pathname,
    assign: url => assigned.push(url),
  };
}

function config(
  currentLocation: TestLocation,
  currentStorage: StorageLike,
  fetchMock: ReturnType<typeof vi.fn>,
  now: () => number,
): OidcAuthConfig {
  return {
    issuerUrl: 'http://localhost:9000/realms/platform',
    clientId: 'generated-app',
    redirectUri: 'http://localhost:5173/authentication',
    postLogoutRedirectUri: 'http://localhost:5173/authentication',
    storage: currentStorage,
    location: currentLocation,
    fetch: fetchMock as unknown as NonNullable<OidcAuthConfig['fetch']>,
    now,
  };
}

async function settle(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => setTimeout(resolve, 0));
}

const metadata = {
  authorization_endpoint: 'http://localhost:9000/authorize',
  token_endpoint: 'http://localhost:9000/token',
  end_session_endpoint: 'http://localhost:9000/logout',
};

describe('OIDC platform auth adapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts a PKCE redirect and keeps the transaction without storing tokens', async () => {
    const currentLocation = location();
    const currentStorage = storage();
    const fetchMock = vi.fn().mockResolvedValue(response(metadata));
    const adapter = createOidcAuthAdapter(
      config(currentLocation, currentStorage, fetchMock, () => 1_000),
    );
    await settle();

    expect(currentLocation.assigned[0]).toContain('prompt=none');
    expect(currentLocation.assigned[0]).toContain('code_challenge=');
    expect(
      currentStorage.getItem('platform-sdk:oidc:generated-app:tokens'),
    ).toBeNull();

    void adapter.signIn({ returnPath: '/profile?tab=identity' });
    await settle();
    const interactive = currentLocation.assigned.at(-1);
    expect(interactive).toContain('client_id=generated-app');
    expect(interactive).not.toContain('prompt=none');
    expect(interactive).toContain(
      'redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauthentication',
    );
  });

  it('validates callback state and nonce, refreshes, and expires safely', async () => {
    let now = 1_000;
    let tokenCall = 0;
    let transactionNonce = '';
    const currentStorage = storage();
    const firstLocation = location();
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/.well-known/openid-configuration')) {
        return Promise.resolve(response(metadata));
      }
      tokenCall += 1;
      if (tokenCall === 1) {
        return Promise.resolve(
          response({
            access_token: 'access-1',
            refresh_token: 'refresh-1',
            id_token: idToken(transactionNonce),
            expires_in: 60,
          }),
        );
      }
      if (tokenCall === 2) {
        return Promise.resolve(
          response({
            access_token: 'access-2',
            refresh_token: 'refresh-2',
            id_token: idToken(transactionNonce),
            expires_in: 60,
          }),
        );
      }
      return Promise.resolve(response({ error: 'invalid_grant' }, 400));
    });

    createOidcAuthAdapter(
      config(firstLocation, currentStorage, fetchMock, () => now),
    );
    await settle();
    const transaction = JSON.parse(
      currentStorage.getItem('platform-sdk:oidc:generated-app:transaction')!,
    ) as { state: string };
    transactionNonce = JSON.parse(
      currentStorage.getItem('platform-sdk:oidc:generated-app:transaction')!,
    ).nonce as string;
    const callbackLocation = location(
      `http://localhost:5173/authentication?code=code-1&state=${transaction.state}`,
    );
    const adapter = createOidcAuthAdapter(
      config(callbackLocation, currentStorage, fetchMock, () => now),
    );
    await settle();

    expect(adapter.getSnapshot()).toMatchObject({
      isAuthenticated: true,
      phase: 'idle',
      user: { id: 'user-1', displayName: 'Ada Lovelace' },
    });
    await expect(adapter.getAccessToken?.()).resolves.toBe('access-1');

    now = 40_000;
    await expect(adapter.getAccessToken?.()).resolves.toBe('access-2');
    expect(adapter.getSnapshot()!.isAuthenticated).toBe(true);

    now = 80_000;
    await expect(adapter.getAccessToken?.()).resolves.toBeNull();
    expect(adapter.getSnapshot()).toMatchObject({
      isAuthenticated: false,
      phase: 'error',
      error: 'Your session expired. Sign in again.',
    });
  });

  it('clears memory credentials and redirects through provider logout', async () => {
    const currentStorage = storage();
    const currentLocation = location();
    const fetchMock = vi.fn().mockResolvedValue(response(metadata));
    const adapter = createOidcAuthAdapter(
      config(currentLocation, currentStorage, fetchMock, () => 1_000),
    );
    await settle();

    void adapter.signOut();
    await settle();
    expect(adapter.getSnapshot()).toMatchObject({
      isAuthenticated: false,
      phase: 'idle',
    });
    expect(currentLocation.assigned.at(-1)).toContain('/logout');
  });
});
