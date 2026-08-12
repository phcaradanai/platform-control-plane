declare module '@platform/feature-packs/dashboard' {
  import type { ComponentType } from 'react';
  import type { LucideIcon } from 'lucide-react';

  export const DashboardScreen: ComponentType;
  export const dashboardFeaturePack: {
    readonly id: 'dashboard';
    readonly route: '/dashboard';
    readonly navigation: {
      readonly label: string;
      readonly description: string;
      readonly icon: LucideIcon;
    };
    readonly screen: ComponentType;
  };
}

declare module '@platform/feature-packs/settings' {
  import type { ComponentType } from 'react';
  import type { LucideIcon } from 'lucide-react';

  export const SettingsScreen: ComponentType;
  export const settingsFeaturePack: {
    readonly id: 'settings';
    readonly route: '/settings';
    readonly navigation: {
      readonly label: string;
      readonly description: string;
      readonly icon: LucideIcon;
    };
    readonly screen: ComponentType;
  };
}
