import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { PlatformSignInPage } from './SignInPage';

/**
 * Real GitHub sign-in, visible in the UI: local development offers GitHub
 * + Guest, production offers GitHub only (guest is unusable there - see
 * docs/identity-and-access.md). See SignInPage.tsx for the environment
 * switch.
 */
export const signInModule = createFrontendModule({
  pluginId: 'app',
  extensions: [PlatformSignInPage],
});
