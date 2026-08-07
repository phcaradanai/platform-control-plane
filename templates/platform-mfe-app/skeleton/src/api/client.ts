import { env } from '../lib/env';

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

async function parseErrorBody(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
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
    const response = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(
        await parseErrorBody(response),
        response.status,
        'HTTP_ERROR',
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
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
