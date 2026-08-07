import { api } from './client';
import type { HealthResponse } from './types';

/**
 * Example domain endpoint demonstrating the API boundary pattern. Accepts
 * an AbortSignal so TanStack Query cancellation propagates to fetch.
 */
export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return api.get<HealthResponse>('/health', { signal });
}
