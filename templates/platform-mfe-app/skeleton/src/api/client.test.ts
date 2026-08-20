import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createStandaloneAuthAdapter } from '@platform/sdk';
import { configurePlatformAuth } from '../lib/platform-auth';
import { api, request } from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    configurePlatformAuth(createStandaloneAuthAdapter());
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('GETs and parses JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }));
    const result = await api.get<{ status: string }>('/health');
    expect(result).toEqual({ status: 'ok' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/health'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('maps non-2xx responses to ApiError with the HTTP status', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'nope' }, 500));
    await expect(api.get('/health')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      code: 'HTTP_ERROR',
    });
  });

  it('times out with ApiError TIMEOUT when the server never responds', async () => {
    fetchMock.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );
    await expect(api.get('/health', { timeoutMs: 25 })).rejects.toMatchObject({
      name: 'ApiError',
      code: 'TIMEOUT',
    });
  });

  it('bounds a fetch implementation that ignores abort signals', async () => {
    fetchMock.mockImplementation(
      () => new Promise<Response>(() => {}),
    );

    await expect(api.get('/health', { timeoutMs: 25 })).rejects.toMatchObject({
      name: 'ApiError',
      code: 'TIMEOUT',
    });
  });

  it('times out while token acquisition is hung and never starts the fetch', async () => {
    configurePlatformAuth({
      getSnapshot: () => ({ isAuthenticated: true, user: { id: 'user-1' } }),
      subscribe: () => () => {},
      signIn: vi.fn(),
      signOut: vi.fn(),
      getAccessToken: () => new Promise<string | null>(() => {}),
    });

    await expect(
      api.get('/protected', { timeoutMs: 25 }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      code: 'TIMEOUT',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cancels hung token acquisition when the caller aborts', async () => {
    configurePlatformAuth({
      getSnapshot: () => ({ isAuthenticated: true, user: { id: 'user-1' } }),
      subscribe: () => () => {},
      signIn: vi.fn(),
      signOut: vi.fn(),
      getAccessToken: () => new Promise<string | null>(() => {}),
    });
    const controller = new AbortController();
    const promise = api.get('/protected', {
      signal: controller.signal,
      timeoutMs: 1_000,
    });
    await Promise.resolve();
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('propagates an external abort as AbortError (query cancellation)', async () => {
    fetchMock.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );

    const controller = new AbortController();
    const promise = api.get('/health', { signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('maps network failures to ApiError NETWORK', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(request('/health')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'NETWORK',
    });
  });

  it('attaches a current bearer token from the platform auth boundary', async () => {
    const getAccessToken = vi.fn().mockResolvedValue('access-token-1');
    configurePlatformAuth({
      getSnapshot: () => ({
        isAuthenticated: true,
        user: { id: 'user-1' },
      }),
      subscribe: () => () => {},
      signIn: vi.fn(),
      signOut: vi.fn(),
      getAccessToken,
    });
    fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }));

    await api.get('/protected');

    expect(getAccessToken).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
    });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(new Headers(init.headers).get('Authorization')).toBe(
      'Bearer access-token-1',
    );
  });

  it('does not add an authorization header when no token is available', async () => {
    configurePlatformAuth({
      getSnapshot: () => ({
        isAuthenticated: false,
        user: null,
      }),
      subscribe: () => () => {},
      signIn: vi.fn(),
      signOut: vi.fn(),
      getAccessToken: vi.fn().mockResolvedValue(null),
    });
    fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }));

    await api.get('/public');

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(new Headers(init.headers).has('Authorization')).toBe(false);
  });

  it('notifies the auth boundary when the backend rejects the credential', async () => {
    const handleUnauthorized = vi.fn();
    configurePlatformAuth({
      getSnapshot: () => ({ isAuthenticated: true, user: { id: 'user-1' } }),
      subscribe: () => () => {},
      signIn: vi.fn(),
      signOut: vi.fn(),
      getAccessToken: vi.fn().mockResolvedValue('access-token-1'),
      handleUnauthorized,
    });
    fetchMock.mockResolvedValue(jsonResponse({ message: 'expired' }, 401));

    await expect(api.get('/protected')).rejects.toMatchObject({
      status: 401,
      code: 'HTTP_ERROR',
    });
    expect(handleUnauthorized).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
