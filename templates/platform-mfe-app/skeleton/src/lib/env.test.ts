import { describe, expect, it } from 'vitest';

import { parseAuthEnvironment, parseEnv } from './env';

describe('parseEnv', () => {
  it('applies defaults when variables are absent', () => {
    const env = parseEnv({});
    expect(env.VITE_API_BASE_URL).toBe('http://localhost:8080/api');
    expect(env.VITE_APP_TITLE).toBeUndefined();
  });

  it('accepts a valid absolute API base URL', () => {
    const env = parseEnv({ VITE_API_BASE_URL: 'https://api.example.com/v1' });
    expect(env.VITE_API_BASE_URL).toBe('https://api.example.com/v1');
  });

  it('throws a readable error on a malformed API base URL', () => {
    expect(() => parseEnv({ VITE_API_BASE_URL: 'not-a-url' })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('passes through an optional app title', () => {
    const env = parseEnv({ VITE_APP_TITLE: 'My App' });
    expect(env.VITE_APP_TITLE).toBe('My App');
  });

  it('keeps authentication unconfigured when no provider values are supplied', () => {
    expect(
      parseAuthEnvironment({
        VITE_AUTH_ISSUER_URL: undefined,
        VITE_AUTH_CLIENT_ID: undefined,
        VITE_AUTH_REDIRECT_URI: undefined,
        VITE_AUTH_POST_LOGOUT_REDIRECT_URI: undefined,
        VITE_AUTH_SCOPE: undefined,
        VITE_AUTH_AUDIENCE: undefined,
      }),
    ).toEqual({ status: 'unconfigured' });
  });

  it('reports partial authentication configuration as unavailable', () => {
    expect(
      parseAuthEnvironment({
        VITE_AUTH_ISSUER_URL: 'https://idp.example.com/realms/platform',
        VITE_AUTH_CLIENT_ID: undefined,
        VITE_AUTH_REDIRECT_URI: undefined,
        VITE_AUTH_POST_LOGOUT_REDIRECT_URI: undefined,
        VITE_AUTH_SCOPE: undefined,
        VITE_AUTH_AUDIENCE: undefined,
      }),
    ).toMatchObject({ status: 'invalid' });
  });

  it('returns public provider configuration without a client secret', () => {
    expect(
      parseAuthEnvironment({
        VITE_AUTH_ISSUER_URL: 'https://idp.example.com/realms/platform',
        VITE_AUTH_CLIENT_ID: 'generated-app',
        VITE_AUTH_REDIRECT_URI: 'https://app.example.com/authentication',
        VITE_AUTH_POST_LOGOUT_REDIRECT_URI: undefined,
        VITE_AUTH_SCOPE: 'openid profile',
        VITE_AUTH_AUDIENCE: 'platform-api',
      }),
    ).toMatchObject({
      status: 'configured',
      config: {
        issuerUrl: 'https://idp.example.com/realms/platform',
        clientId: 'generated-app',
        redirectUri: 'https://app.example.com/authentication',
        scope: 'openid profile',
        audience: 'platform-api',
      },
    });
  });

  it('includes configured authentication in the boot environment', () => {
    const env = parseEnv({
      VITE_AUTH_ISSUER_URL: 'https://idp.example.com/realms/platform',
      VITE_AUTH_CLIENT_ID: 'generated-app',
    });
    expect(env.auth).toMatchObject({
      status: 'configured',
      config: {
        issuerUrl: 'https://idp.example.com/realms/platform',
        clientId: 'generated-app',
      },
    });
  });
});
