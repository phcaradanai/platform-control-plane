import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
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
});
