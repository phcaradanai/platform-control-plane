import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { backendStatusModule } from './modules/backend-status';
import { signInModule } from './modules/sign-in';

export default createApp({
  features: [catalogPlugin, navModule, backendStatusModule, signInModule],
});
