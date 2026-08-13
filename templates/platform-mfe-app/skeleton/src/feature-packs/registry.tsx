import {
  validateFeaturePackDependencies,
} from './contract';
import type { FeaturePack } from './contract';

{% if 'authentication' in values.capabilities %}
import { authenticationFeaturePack } from './authentication';
{% endif %}
{% if 'profile' in values.capabilities %}
import { profileFeaturePack } from './profile';
{% endif %}
{% if 'rbac' in values.capabilities %}
import { rbacFeaturePack } from './rbac';
{% endif %}
{% if 'dashboard' in values.capabilities %}
import { dashboardFeaturePack } from './dashboard';
{% endif %}
{% if 'settings' in values.capabilities %}
import { settingsFeaturePack } from './settings';
{% endif %}

/** The only generated registry: selection is resolved at scaffold time. */
const selectedFeaturePacks: readonly FeaturePack[] = [
{% if 'authentication' in values.capabilities %}
  authenticationFeaturePack,
{% endif %}
{% if 'profile' in values.capabilities %}
  profileFeaturePack,
{% endif %}
{% if 'rbac' in values.capabilities %}
  rbacFeaturePack,
{% endif %}
{% if 'dashboard' in values.capabilities %}
  dashboardFeaturePack,
{% endif %}
{% if 'settings' in values.capabilities %}
  settingsFeaturePack,
{% endif %}
];

export const featurePacks = validateFeaturePackDependencies(
  selectedFeaturePacks,
);
