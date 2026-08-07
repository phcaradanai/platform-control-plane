import { api } from './client';
import type { HealthResponse } from './types';

/** Example domain endpoint demonstrating the API boundary pattern. */
export async function getHealth(): Promise<HealthResponse> {
  return api.get<HealthResponse>('/health');
}
