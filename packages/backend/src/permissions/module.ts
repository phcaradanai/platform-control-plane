import { coreServices, createBackendModule } from '@backstage/backend-plugin-api';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';

import { PlatformAccessPolicy } from './policy';

const permissionModulePlatformAccessPolicy = createBackendModule({
  pluginId: 'permission',
  moduleId: 'platform-access-policy',
  register(reg) {
    reg.registerInit({
      deps: {
        policy: policyExtensionPoint,
        logger: coreServices.logger,
      },
      async init({ policy, logger }) {
        policy.setPolicy(new PlatformAccessPolicy(logger));
      },
    });
  },
});

export default permissionModulePlatformAccessPolicy;
