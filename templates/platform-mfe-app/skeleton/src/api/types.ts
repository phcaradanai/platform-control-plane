/** Shared API response types. Add domain-specific types next to their
 *  feature modules instead of growing this file into a grab-bag. */

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  version: string;
  timestamp: string;
}
