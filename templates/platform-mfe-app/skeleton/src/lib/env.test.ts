import { describe, expect, it } from 'vitest';

import { parseEnv } from './env';

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
});
