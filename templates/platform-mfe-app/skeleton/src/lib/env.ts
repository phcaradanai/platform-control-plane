import { z } from 'zod';

const DEFAULT_API_BASE_URL = 'http://localhost:8080/api';

const envSchema = z.object({
  /** Absolute base URL of the backend API. Falls back to a local default. */
  VITE_API_BASE_URL: z.url().default(DEFAULT_API_BASE_URL),
  /** Optional runtime override for the app title shown in the header. */
  VITE_APP_TITLE: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates the browser-visible environment. Missing optional variables are
 * filled from defaults; a *present but malformed* value throws at module
 * load so misconfiguration surfaces at boot instead of as a confusing
 * network failure later. `main.tsx` imports this before mounting the app.
 */
export function parseEnv(source: Partial<Record<string, unknown>>): Env {
  const result = envSchema.safeParse({
    VITE_API_BASE_URL: source.VITE_API_BASE_URL,
    VITE_APP_TITLE: source.VITE_APP_TITLE,
  });

  if (!result.success) {
    const details = result.error.issues
      .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration - ${details}`);
  }

  return result.data;
}

export const env: Env = parseEnv(import.meta.env);
