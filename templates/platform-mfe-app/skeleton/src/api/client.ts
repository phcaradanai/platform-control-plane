import { env } from '../lib/env';
import {
  getPlatformAccessToken,
  handlePlatformUnauthorized,
} from '../lib/platform-auth';

/** Stable error shape for every failed request. */
export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string;

  constructor(message: string, status: number | null = null, code = 'UNKNOWN') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError('Request timed out', null, 'TIMEOUT');
  }
  if (error instanceof TypeError) {
    // fetch() rejects with TypeError on network failure / invalid URL.
    return new ApiError('Network error - could not reach the API', null, 'NETWORK');
  }
  return new ApiError(error instanceof Error ? error.message : 'Unknown error');
}

async function parseErrorBody(
  response: Response,
  signal: AbortSignal,
): Promise<string> {
  try {
    const body = (await awaitWithAbort(response.json(), signal)) as {
      message?: unknown;
    } | null;
    if (body && typeof body.message === 'string' && body.message.length > 0) {
      return body.message;
    }
    return `${response.status} ${response.statusText}`;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    return `${response.status} ${response.statusText}`;
  }
}

/**
 * Wait for an operation while preserving the caller's cancellation boundary.
 * The underlying promise is still observed after an abort, preventing a late
 * provider rejection from becoming an unhandled rejection.
 */
function awaitWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(
      new DOMException('The operation was aborted.', 'AbortError'),
    );
  }
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      signal.removeEventListener('abort', onAbort);
    };
    const resolveOnce = (value: T) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(value);
    };
    const rejectOnce = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };
    const onAbort = () => {
      rejectOnce(
        new DOMException('The operation was aborted.', 'AbortError'),
      );
    };
    signal.addEventListener('abort', onAbort, { once: true });
    void promise.then(resolveOnce, rejectOnce);
  });
}

/**
 * Single transport for every API call. Components and query hooks never call
 * `fetch` directly - they go through `request`, which centralizes the base
 * URL, JSON handling, timeout, and error normalization.
 *
 * Cancellation: pass the caller's `AbortSignal` (e.g. TanStack Query's
 * `queryFn({ signal })`) as `options.signal`. Aborting it aborts the fetch
 * immediately and the promise rejects with a DOMException named
 * `AbortError` - the convention TanStack Query recognizes as a query
 * cancellation rather than a query error. The internal timeout still works
 * independently and surfaces as `ApiError` code `TIMEOUT`.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { timeoutMs = 10_000, signal: externalSignal, headers, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Forward external cancellation (query unmount/refetch, user abort) to the
  // fetch signal. The timeout and the caller share one controller, so the
  // first abort wins.
  const forwardAbort = () => controller.abort();
  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener('abort', forwardAbort, { once: true });
  }

  try {
    if (controller.signal.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }
    const accessToken = await awaitWithAbort(
      Promise.resolve().then(() =>
        getPlatformAccessToken({ signal: controller.signal }),
      ),
      controller.signal,
    );
    const requestHeaders = new Headers(headers);
    if (!requestHeaders.has('Accept')) {
      requestHeaders.set('Accept', 'application/json');
    }
    if (!requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json');
    }
    if (accessToken && !requestHeaders.has('Authorization')) {
      requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    }
    const response = await awaitWithAbort(
      fetch(`${env.VITE_API_BASE_URL}${path}`, {
        ...rest,
        headers: requestHeaders,
        signal: controller.signal,
      }),
      controller.signal,
    );

    if (!response.ok) {
      if (response.status === 401) {
        handlePlatformUnauthorized();
      }
      throw new ApiError(
        await parseErrorBody(response, controller.signal),
        response.status,
        'HTTP_ERROR',
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await awaitWithAbort(response.json(), controller.signal)) as T;
  } catch (error) {
    if (externalSignal?.aborted) {
      // Genuine cancellation by the caller - rethrow so TanStack Query
      // treats this as a cancelled query, not a failed one.
      throw new DOMException('The operation was aborted.', 'AbortError');
    }
    throw toApiError(error);
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', forwardAbort);
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
};
