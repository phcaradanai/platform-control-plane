import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { BackendStatusBanner } from './BackendStatusBanner';

/**
 * Surfaces backend unavailability to the user: polls the backend
 * readiness endpoint and shows a banner while the required APIs are
 * unreachable, so the frontend is never mistaken for healthy while the
 * catalog/scaffolder APIs are down.
 */
export const backendStatusModule = createFrontendModule({
  pluginId: 'app',
  extensions: [BackendStatusBanner],
});
