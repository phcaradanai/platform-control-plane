import type { LoggerService } from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import type {
  PermissionPolicy,
  PolicyQuery,
  PolicyQueryUser,
} from '@backstage/plugin-permission-node';
import {
  catalogEntityCreatePermission,
  catalogEntityReadPermission,
  catalogLocationAnalyzePermission,
  catalogLocationCreatePermission,
  catalogLocationReadPermission,
} from '@backstage/plugin-catalog-common/alpha';
import {
  actionExecutePermission,
  taskCancelPermission,
  taskCreatePermission,
  taskReadPermission,
  templateParameterReadPermission,
  templateStepReadPermission,
} from '@backstage/plugin-scaffolder-common/alpha';

/**
 * Catalog group whose members get unrestricted access. See
 * examples/org.yaml for how membership is granted and
 * docs/identity-and-access.md for the full model.
 */
export const PLATFORM_ADMINS_GROUP = 'group:default/platform-admins';

/**
 * Everything a signed-in user needs to browse the catalog and run the
 * App Factory's "create new app" flow end to end, and nothing else.
 * catalogLocationAnalyzePermission is included because it gates the
 * read-only preview step of /catalog-import, not an actual mutation.
 *
 * Deliberately NOT included (admin-only by omission, since the default
 * below is deny): catalog entity delete/refresh/validate, catalog
 * location delete, scaffolder template management, and the kubernetes
 * plugin's permissions (no clusters are configured in this phase).
 */
const DEVELOPER_ALLOWED_PERMISSIONS = new Set([
  catalogEntityReadPermission.name,
  catalogEntityCreatePermission.name,
  catalogLocationReadPermission.name,
  catalogLocationCreatePermission.name,
  catalogLocationAnalyzePermission.name,
  templateParameterReadPermission.name,
  templateStepReadPermission.name,
  actionExecutePermission.name,
  taskCreatePermission.name,
  taskReadPermission.name,
  taskCancelPermission.name,
]);

function isPlatformAdmin(user: PolicyQueryUser | undefined): boolean {
  return (
    user?.info.ownershipEntityRefs.includes(PLATFORM_ADMINS_GROUP) ?? false
  );
}

/**
 * Platform Admin / Developer permission policy.
 *
 * - `group:default/platform-admins` members: allowed everything.
 * - Any other signed-in user ("Developer"): allowed the App Factory's
 *   catalog-browsing and template-running actions above, denied everything
 *   else. In production, sign-in itself is the gate (GitHub sign-in
 *   requires a matching catalog `User` entity - see
 *   app-config.production.yaml and docs/identity-and-access.md), so
 *   "any signed-in user" does not mean "any GitHub user".
 * - No signed-in user (anonymous / guest-provider-disabled requests):
 *   denied everything. Fails closed, mirroring @platform/sdk's
 *   unavailable-capability contract for generated apps.
 */
export class PlatformAccessPolicy implements PermissionPolicy {
  constructor(private readonly logger: LoggerService) {}

  async handle(request: PolicyQuery, user?: PolicyQueryUser) {
    if (isPlatformAdmin(user)) {
      return { result: AuthorizeResult.ALLOW };
    }

    if (user && DEVELOPER_ALLOWED_PERMISSIONS.has(request.permission.name)) {
      return { result: AuthorizeResult.ALLOW };
    }

    this.logger.debug(
      `PlatformAccessPolicy: denied "${request.permission.name}" for ${
        user?.info.userEntityRef ?? 'unauthenticated'
      }`,
    );
    return { result: AuthorizeResult.DENY };
  }
}
