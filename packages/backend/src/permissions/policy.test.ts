import type { LoggerService } from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import type { PolicyQueryUser } from '@backstage/plugin-permission-node';
import {
  catalogEntityCreatePermission,
  catalogEntityDeletePermission,
  catalogEntityReadPermission,
  catalogEntityRefreshPermission,
  catalogEntityValidatePermission,
  catalogLocationCreatePermission,
  catalogLocationDeletePermission,
} from '@backstage/plugin-catalog-common/alpha';
import {
  actionExecutePermission,
  taskCreatePermission,
  templateManagementPermission,
} from '@backstage/plugin-scaffolder-common/alpha';

import { PLATFORM_ADMINS_GROUP, PlatformAccessPolicy } from './policy';

function fakeLogger(): LoggerService {
  return {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    child: () => fakeLogger(),
  };
}

function userWithRefs(...ownershipEntityRefs: string[]): PolicyQueryUser {
  return {
    credentials: {} as PolicyQueryUser['credentials'],
    info: {
      userEntityRef: 'user:default/test',
      ownershipEntityRefs,
    },
  };
}

describe('PlatformAccessPolicy', () => {
  const policy = new PlatformAccessPolicy(fakeLogger());

  it('allows platform-admins group members to do anything', async () => {
    const admin = userWithRefs(PLATFORM_ADMINS_GROUP, 'group:default/platform-team');

    for (const permission of [
      catalogEntityDeletePermission,
      catalogLocationDeletePermission,
      templateManagementPermission,
      catalogEntityValidatePermission,
    ]) {
      const decision = await policy.handle({ permission }, admin);
      expect(decision.result).toBe(AuthorizeResult.ALLOW);
    }
  });

  it('allows any other signed-in user the App Factory allow-list', async () => {
    const developer = userWithRefs('group:default/platform-team');

    for (const permission of [
      catalogEntityReadPermission,
      catalogEntityCreatePermission,
      catalogLocationCreatePermission,
      actionExecutePermission,
      taskCreatePermission,
    ]) {
      const decision = await policy.handle({ permission }, developer);
      expect(decision.result).toBe(AuthorizeResult.ALLOW);
    }
  });

  it('denies a signed-in developer anything outside the allow-list', async () => {
    const developer = userWithRefs('group:default/platform-team');

    for (const permission of [
      catalogEntityDeletePermission,
      catalogEntityRefreshPermission,
      catalogEntityValidatePermission,
      catalogLocationDeletePermission,
      templateManagementPermission,
    ]) {
      const decision = await policy.handle({ permission }, developer);
      expect(decision.result).toBe(AuthorizeResult.DENY);
    }
  });

  it('treats any signed-in user as a developer even with no group memberships', async () => {
    // Deliberate: in production, sign-in itself is the access gate (GitHub
    // sign-in requires a matching catalog User entity - see
    // app-config.production.yaml), so group membership is only what
    // distinguishes admins from everyone else, not sign-in itself.
    const noGroups = userWithRefs('user:default/test');

    const allowed = await policy.handle(
      { permission: catalogEntityReadPermission },
      noGroups,
    );
    expect(allowed.result).toBe(AuthorizeResult.ALLOW);

    const denied = await policy.handle(
      { permission: catalogEntityDeletePermission },
      noGroups,
    );
    expect(denied.result).toBe(AuthorizeResult.DENY);
  });

  it('denies requests with no signed-in user at all', async () => {
    const decision = await policy.handle({
      permission: catalogEntityReadPermission,
    });
    expect(decision.result).toBe(AuthorizeResult.DENY);
  });
});
