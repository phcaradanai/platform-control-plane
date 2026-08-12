import type { FeaturePack } from './contract';

{% if 'dashboard' in values.capabilities %}
import { dashboardFeaturePack } from './dashboard';
{% endif %}
{% if 'settings' in values.capabilities %}
import { settingsFeaturePack } from './settings';
{% endif %}

/** The only generated registry: selection is resolved at scaffold time. */
export const featurePacks: readonly FeaturePack[] = [
{% if 'dashboard' in values.capabilities %}
  dashboardFeaturePack,
{% endif %}
{% if 'settings' in values.capabilities %}
  settingsFeaturePack,
{% endif %}
];
