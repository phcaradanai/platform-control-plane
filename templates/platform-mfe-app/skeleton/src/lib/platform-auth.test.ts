import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  createOidcAuthAdapter,
  createStandaloneAuthAdapter,
  type AuthAdapter,
  type OidcAuthConfig,
  type StorageLike,
} from '@platform/sdk';

import {
  appAuthAdapter,
  configurePlatformAuth,
  createApplicationAuthAdapter,
  getPlatformAccessToken,
  handlePlatformUnauthorized,
  safeReturnPath,
} from './platform-auth';

const ISSUER = 'http://localhost:9000/realms/platform';
const CLIENT_ID = 'generated-app';
const PRIVATE_JWK: JsonWebKey = {
  kty: 'RSA',
  n: 'pOmFcLYMmYw5namuepOR2QC9i6f6y7i9wrf9FJtNfAIeuEDIIix3TMeptINlPfeYLjvYSGH3Zmu1ELOX0xpkXLxxwTa75jZpCapLeJYIrVntSPR_bwEjlJawZhL_ChsNR7B5LRPzKw4GMXHXg36G6aNEameWb0DfEV-KN_lVKWbPXoW53MYlSeEu8X5cdSimkUIzyVnZgvCsoiXdEo1_1ZOWzh9WclLOvbsOOl8S6uKGxc2kXE5KywZctZWtLHVBfUA7V9kmArPMGEZg8pTHwkjkCT7TcGzDTd3f6GWWiQ2911mm0tNOIA2WiXIH_tvwKLxLjjeRhg05tAYysJfjXw',
  e: 'AQAB',
  d: 'BRk7_FMa92uKPUfWUokNDk988yKbZc1tZUxfV7hbE4VuDul501l0MS-1g644S0uQ-etbV-MngGDxTsKusMkoTZgWtqmLJgy_ZjWzDArF2k4yDUctFXDmLIOukOLvd0Mecv2PkYdqkjjM-jeR0smIdEeNWvJru6U4Zroa20YrJ6xIWFTZjA2YRZESE6KZ55AlEUJmWUD_AzoP4CRgC3cajF-7gY3NXBPHTb6gHqBJBJlgxfpF4RqzlImiEYIph1mrCyjyh9pG7GkSFw3cqF-2jCPCHKYPp-QnKWVAd5cYVrtk-OrI4fWDjBrdl580QjZ0gN7ohC9jdrqjjymBPtmI-Q',
  p: '0VqHrMl8vkm1JPsnYHN7nWgXJK2nLUorCguyAVFDhjTihEa2BTgM2fUAU3neQeY4Im0J31OsNUFaVQ2bXZFMv7kWOWwbz8R1HjgdLPhxgrzjigqMpg8nUJ-vVM2XRLM0EXVgP5NGtZGIbKPPlxqJhY2m5ZmXvZFJjc9vTnnkI8U',
  q: 'yagQg0VGrstxZZL_Ym0dBic9QG0sDnbzFMCevdTaiYZTcNJlYuFvc0PZS_3Uk9tNAFZ1mwOoVxSf2XjL9oTLq2F28KmCNeNG-uEz-o-72ofsDc7dgBdiOP9x8_2tUknJcABDuCqm9psAXOdt2Jf4UV8X87pdt9eXSbkK-eZzSNM',
  dp: 'OsScA3AIGW6dcAUkt5mTYMtge8ZXgIoqbMZ9sIr8Vocv8wvaerqSOPjin4w9TOhwZ5GOTOezFrwCvI92RpzMG6G8UGA9qmQusE32OrJ_QsD9armtY8wrMCGzWS3hQcLAYgo9-3q_RabV0hFl67fiVOA_soIcK3XGXQ2W5EOpPDU',
  dq: 'sMqXL37cqQHTOKnXHANtHqfoG0ObDFNcaSU2BldGAKuzG4ZZPIdHnlYte2HdrILmzxT9phlezHlYauBscIOby3R3QiZZ8cR_xhMJ7vF0T_I6ESD7MAFQK4hH7xDHkwz9fSO-OwepuSnK96gttWYGXdBwv0z0POjVydxgsxZGm-E',
  qi: 'tuspswKiBVDzIW5-wl5Rd-DlztL8OcfMhi6oPdQQleJO4Rw1zUXvqs5zeITC1tGkvuzdR47qiOkYR3BbCxszwF9L9fCN1mrOmVH6t74RcMHDE_F5v52uyGeMnYcaQSSk4fr9yGKFhSMNzugidYyuwHpXsL0KF-7ADr5e-udejy8',
};
const PUBLIC_JWK: JsonWebKey = {
  kty: 'RSA',
  n: 'pOmFcLYMmYw5namuepOR2QC9i6f6y7i9wrf9FJtNfAIeuEDIIix3TMeptINlPfeYLjvYSGH3Zmu1ELOX0xpkXLxxwTa75jZpCapLeJYIrVntSPR_bwEjlJawZhL_ChsNR7B5LRPzKw4GMXHXg36G6aNEameWb0DfEV-KN_lVKWbPXoW53MYlSeEu8X5cdSimkUIzyVnZgvCsoiXdEo1_1ZOWzh9WclLOvbsOOl8S6uKGxc2kXE5KywZctZWtLHVBfUA7V9kmArPMGEZg8pTHwkjkCT7TcGzDTd3f6GWWiQ2911mm0tNOIA2WiXIH_tvwKLxLjjeRhg05tAYysJfjXw',
  e: 'AQAB',
};
let privateKey: CryptoKey;
let publicJwk: Record<string, unknown>;

function base64Url(value: string | Uint8Array): string {
  const bytes =
    typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function idToken(
  nonce: string,
  sub = 'user-1',
  options: {
    issuer?: string;
    audience?: string | string[];
    expiresAt?: number;
  } = {},
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(
    JSON.stringify({ alg: 'RS256', kid: 'test-key', typ: 'JWT' }),
  );
  const payload = base64Url(
    JSON.stringify({
      sub,
      nonce,
      name: 'Ada Lovelace',
      preferred_username: 'ada',
      email: 'ada@example.com',
      iss: options.issuer ?? ISSUER,
      aud: options.audience ?? CLIENT_ID,
      iat: now,
      exp: options.expiresAt ?? now + 600,
    }),
  );
  const signingInput = header + '.' + payload;
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    new TextEncoder().encode(signingInput),
  );
  return signingInput + '.' + base64Url(new Uint8Array(signature));
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
    issuerUrl: ISSUER,
    clientId: CLIENT_ID,
    redirectUri: 'http://localhost:5173/authentication',
    postLogoutRedirectUri: 'http://localhost:5173/authentication',
    storage: currentStorage,
    location: currentLocation,
    fetch: fetchMock as unknown as NonNullable<OidcAuthConfig['fetch']>,
    now,
  };
}

async function settle(): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

const metadata = {
  issuer: ISSUER,
  authorization_endpoint: 'http://localhost:9000/authorize',
  token_endpoint: 'http://localhost:9000/token',
  jwks_uri: 'http://localhost:9000/jwks',
  end_session_endpoint: 'http://localhost:9000/logout',
};

describe('OIDC platform auth adapter', () => {
  beforeAll(async () => {
    privateKey = await crypto.subtle.importKey(
      'jwk',
      PRIVATE_JWK,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    publicJwk = {
      ...PUBLIC_JWK,
      kid: 'test-key',
      alg: 'RS256',
      use: 'sig',
    };
  });

  afterEach(() => {
    configurePlatformAuth(createStandaloneAuthAdapter());
    vi.restoreAllMocks();
  });

  it('keeps host auth ahead of the local fallback and shares the API adapter', async () => {
    const snapshot = {
      isAuthenticated: true,
      user: { id: 'host-user' },
      phase: 'idle' as const,
    };
    const signIn = vi.fn().mockResolvedValue(undefined);
    const signOut = vi.fn().mockResolvedValue(undefined);
    const getAccessToken = vi.fn().mockResolvedValue('host-token');
    const handleUnauthorized = vi.fn();
    const hostAdapter: AuthAdapter = {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
      signIn,
      signOut,
      getAccessToken,
      handleUnauthorized,
    };

    configurePlatformAuth(hostAdapter);

    expect(appAuthAdapter.getSnapshot()).toBe(snapshot);
    await expect(getPlatformAccessToken()).resolves.toBe('host-token');
    expect(getAccessToken).toHaveBeenCalledOnce();
    await appAuthAdapter.signIn({ returnPath: 'https://evil.example' });
    expect(signIn).toHaveBeenCalledWith({ returnPath: '/' });
    handlePlatformUnauthorized();
    expect(handleUnauthorized).toHaveBeenCalledOnce();
  });

  it('preserves nested query/hash state and rejects open return targets', () => {
    const origin = 'http://localhost:5173';
    expect(safeReturnPath('/reports?tab=identity#focus', origin)).toBe(
      '/reports?tab=identity#focus',
    );
    expect(safeReturnPath('https://evil.example/account', origin)).toBe('/');
    expect(safeReturnPath('//evil.example/account', origin)).toBe('/');
    expect(safeReturnPath('/\\evil.example/account', origin)).toBe('/');
  });

  it('captures the nested route for silent restore and suppresses a repeat after failure', async () => {
    const currentStorage = storage();
    const firstLocation = location(
      'http://localhost:5173/reports?tab=identity#focus',
    );
    const fetchMock = vi.fn(() => Promise.resolve(response(metadata)));
    const authEnvironment = {
      status: 'configured' as const,
      config: config(firstLocation, currentStorage, fetchMock, () => 1_000),
    };

    createApplicationAuthAdapter(authEnvironment);
    await settle();

    const transaction = JSON.parse(
      currentStorage.getItem('platform-sdk:oidc:generated-app:transaction')!,
    ) as { returnPath: string };
    expect(transaction.returnPath).toBe('/reports?tab=identity#focus');

    const repeatedLocation = location(
      'http://localhost:5173/reports?tab=identity#focus',
    );
    const repeated = createApplicationAuthAdapter({
      ...authEnvironment,
      config: config(repeatedLocation, currentStorage, fetchMock, () => 1_000),
    });
    await settle();

    expect(repeated.getSnapshot()).toMatchObject({
      isAuthenticated: false,
      phase: 'error',
    });
    expect(repeatedLocation.assigned).toEqual([]);

    void repeated.signIn({ returnPath: '/reports?tab=identity#focus' });
    await settle();
    const interactive = repeatedLocation.assigned.at(-1);
    expect(interactive).toContain('client_id=generated-app');
    expect(interactive).not.toContain('prompt=none');
  });

  it('keeps a cancelled silent restore signed out without starting a loop', async () => {
    const currentStorage = storage();
    const firstLocation = location('http://localhost:5173/profile');
    const fetchMock = vi.fn(() => Promise.resolve(response(metadata)));
    const firstEnvironment = {
      status: 'configured' as const,
      config: config(firstLocation, currentStorage, fetchMock, () => 1_000),
    };

    createApplicationAuthAdapter(firstEnvironment);
    await settle();
    const transaction = JSON.parse(
      currentStorage.getItem('platform-sdk:oidc:generated-app:transaction')!,
    ) as { state: string };

    const callbackLocation = location(
      `http://localhost:5173/authentication?error=login_required&state=${transaction.state}`,
    );
    const callbackAdapter = createApplicationAuthAdapter({
      status: 'configured',
      config: config(callbackLocation, currentStorage, fetchMock, () => 1_000),
    });
    await settle();

    expect(callbackAdapter.getSnapshot()).toMatchObject({
      isAuthenticated: false,
      phase: 'idle',
    });
    expect(callbackLocation.assigned).toEqual([]);

    const afterFailureLocation = location('http://localhost:5173/profile');
    const afterFailure = createApplicationAuthAdapter({
      ...firstEnvironment,
      config: config(
        afterFailureLocation,
        currentStorage,
        fetchMock,
        () => 1_000,
      ),
    });
    await settle();
    expect(afterFailure.getSnapshot()).toMatchObject({
      isAuthenticated: false,
      phase: 'error',
    });
    expect(afterFailureLocation.assigned).toEqual([]);
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

  it('rejects a callback with an unexpected state before exchanging the code', async () => {
    const currentStorage = storage();
    currentStorage.setItem(
      'platform-sdk:oidc:generated-app:transaction',
      JSON.stringify({
        state: 'expected-state',
        nonce: 'expected-nonce',
        codeVerifier: 'verifier-1',
        returnPath: '/',
        createdAt: Date.now(),
        mode: 'interactive',
      }),
    );
    const currentLocation = location(
      'http://localhost:5173/authentication?code=code-1&state=wrong-state',
    );
    const fetchMock = vi.fn().mockResolvedValue(response(metadata));
    const adapter = createOidcAuthAdapter(
      config(currentLocation, currentStorage, fetchMock, Date.now),
    );

    await settle();

    expect(adapter.getSnapshot()).toMatchObject({
      isAuthenticated: false,
      phase: 'error',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('validates callback state and nonce, refreshes, and expires safely', async () => {
    let now = 1_000;
    let tokenCall = 0;
    let transactionNonce = '';
    const currentStorage = storage();
    const firstLocation = location();
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/.well-known/openid-configuration')) {
        return Promise.resolve(response(metadata));
      }
      if (url.endsWith('/jwks')) {
        return response({ keys: [publicJwk] });
      }
      tokenCall += 1;
      if (tokenCall === 1) {
        return Promise.resolve(
          response({
            access_token: 'access-1',
            refresh_token: 'refresh-1',
            token_type: 'Bearer',
            id_token: await idToken(transactionNonce),
            expires_in: 60,
          }),
        );
      }
      if (tokenCall === 2) {
        return Promise.resolve(
          response({
            access_token: 'access-2',
            refresh_token: 'refresh-2',
            token_type: 'Bearer',
            id_token: await idToken(transactionNonce),
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

  it('rejects unsigned, wrong-issuer, wrong-audience, and expired ID tokens', async () => {
    const now = Math.floor(Date.now() / 1000);
    const unsignedPayload = btoa(
      JSON.stringify({
        sub: 'attacker',
        nonce: 'nonce-1',
        iss: ISSUER,
        aud: CLIENT_ID,
        iat: now,
        exp: now + 600,
      }),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const invalidTokens = [
      `eyJhbGciOiJub25lIn0.${unsignedPayload}.`,
      await idToken('nonce-1', 'user-1', {
        issuer: 'http://localhost:9000/realms/other',
      }),
      await idToken('nonce-1', 'user-1', { audience: 'other-client' }),
      idToken('nonce-1', 'user-1', {
        audience: [CLIENT_ID, 'untrusted-client'],
      }),
      idToken('unexpected-nonce'),
      await idToken('nonce-1', 'user-1', { expiresAt: now - 60 }),
    ];

    for (const [index, invalidToken] of invalidTokens.entries()) {
      const currentStorage = storage();
      currentStorage.setItem(
        'platform-sdk:oidc:generated-app:transaction',
        JSON.stringify({
          state: 'state-1',
          nonce: 'nonce-1',
          codeVerifier: 'verifier-1',
          returnPath: '/',
          createdAt: Date.now(),
          mode: 'interactive',
        }),
      );
      const currentLocation = location(
        'http://localhost:5173/authentication?code=code-1&state=state-1',
      );
      const fetchMock = vi.fn(async (url: string) => {
        if (url.endsWith('/.well-known/openid-configuration')) {
          return response(metadata);
        }
        if (url.endsWith('/jwks')) {
          return response({ keys: [publicJwk] });
        }
        return response({
          access_token: 'access-1',
          token_type: 'Bearer',
          id_token: invalidToken,
          expires_in: 60,
        });
      });

      const adapter = createOidcAuthAdapter(
        config(currentLocation, currentStorage, fetchMock, Date.now),
      );
      await settle();
      expect(adapter.getSnapshot(), 'invalid token case ' + index).toMatchObject({
        isAuthenticated: false,
        phase: 'error',
      });
    }
  });
});
