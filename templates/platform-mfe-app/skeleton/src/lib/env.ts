import { z } from 'zod';
import type { OidcAuthConfig } from '@platform/sdk';

const DEFAULT_API_BASE_URL = 'http://localhost:8080/api';

const optionalEnvString = z.preprocess(
  value => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  /** Absolute base URL of the backend API. Falls back to a local default. */
  VITE_API_BASE_URL: z.url().default(DEFAULT_API_BASE_URL),
  /** Optional runtime override for the app title shown in the header. */
  VITE_APP_TITLE: z.string().min(1).optional(),
  /** Public OIDC issuer; no client secret is accepted in browser configuration. */
  VITE_AUTH_ISSUER_URL: optionalEnvString,
  /** Public OIDC browser client ID. */
  VITE_AUTH_CLIENT_ID: optionalEnvString,
  /** Registered callback URL; defaults to the current browser URL when omitted. */
  VITE_AUTH_REDIRECT_URI: optionalEnvString,
  /** Registered post-logout callback URL; defaults to the sign-in callback. */
  VITE_AUTH_POST_LOGOUT_REDIRECT_URI: optionalEnvString,
  /** Optional OIDC scope override. */
  VITE_AUTH_SCOPE: optionalEnvString,
  /** Optional provider-specific audience, such as a Keycloak API audience. */
  VITE_AUTH_AUDIENCE: optionalEnvString,
});

export type Env = z.infer<typeof envSchema>;

export interface AuthEnvironment {
  status: 'unconfigured' | 'configured' | 'invalid';
  config?: OidcAuthConfig;
  error?: string;
}

type AuthEnvironmentInput = Pick<
  Env,
  | 'VITE_AUTH_ISSUER_URL'
  | 'VITE_AUTH_CLIENT_ID'
  | 'VITE_AUTH_REDIRECT_URI'
  | 'VITE_AUTH_POST_LOGOUT_REDIRECT_URI'
  | 'VITE_AUTH_SCOPE'
  | 'VITE_AUTH_AUDIENCE'
>;

export function parseAuthEnvironment(
  source: AuthEnvironmentInput,
): AuthEnvironment {
  const values = {
    issuerUrl: source.VITE_AUTH_ISSUER_URL,
    clientId: source.VITE_AUTH_CLIENT_ID,
    redirectUri: source.VITE_AUTH_REDIRECT_URI,
    postLogoutRedirectUri: source.VITE_AUTH_POST_LOGOUT_REDIRECT_URI,
    scope: source.VITE_AUTH_SCOPE,
    audience: source.VITE_AUTH_AUDIENCE,
  };
  const issuerUrl = values.issuerUrl;
  const clientId = values.clientId;
  const hasAnyValue = Object.values(values).some(value => value !== undefined);
  if (!hasAnyValue) {
    return { status: 'unconfigured' };
  }
  if (!issuerUrl || !clientId) {
    return {
      status: 'invalid',
      error:
        'Authentication configuration requires both VITE_AUTH_ISSUER_URL and VITE_AUTH_CLIENT_ID.',
    } satisfies AuthEnvironment;
  }
  return {
    status: 'configured',
    config: {
      issuerUrl,
      clientId,
      redirectUri: values.redirectUri,
      postLogoutRedirectUri: values.postLogoutRedirectUri,
      scope: values.scope,
      audience: values.audience,
    },
  };
}

/**
 * Validates the browser-visible environment. Missing optional variables are
 * filled from defaults; a *present but malformed* value throws at module
 * load so misconfiguration surfaces at boot instead of as a confusing
 * network failure later. `main.tsx` imports this before mounting the app.
 */
export function parseEnv(
  source: Partial<Record<string, unknown>>,
): Env & { auth: AuthEnvironment } {
  const result = envSchema.safeParse({
    VITE_API_BASE_URL: source.VITE_API_BASE_URL,
    VITE_APP_TITLE: source.VITE_APP_TITLE,
    VITE_AUTH_ISSUER_URL: source.VITE_AUTH_ISSUER_URL,
    VITE_AUTH_CLIENT_ID: source.VITE_AUTH_CLIENT_ID,
    VITE_AUTH_REDIRECT_URI: source.VITE_AUTH_REDIRECT_URI,
    VITE_AUTH_POST_LOGOUT_REDIRECT_URI:
      source.VITE_AUTH_POST_LOGOUT_REDIRECT_URI,
    VITE_AUTH_SCOPE: source.VITE_AUTH_SCOPE,
    VITE_AUTH_AUDIENCE: source.VITE_AUTH_AUDIENCE,
  });

  if (!result.success) {
    const details = result.error.issues
      .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration - ${details}`);
  }

  return {
    ...result.data,
    auth: parseAuthEnvironment(result.data),
  };
}

export const env = parseEnv(import.meta.env);
