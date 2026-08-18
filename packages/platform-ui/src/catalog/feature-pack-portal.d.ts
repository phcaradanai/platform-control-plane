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
    readonly dependencies: {
      readonly platform: readonly ['@platform/ui'];
    };
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
    readonly dependencies: {
      readonly platform: readonly ['@platform/ui'];
    };
  };
}

declare module '@platform/feature-packs/authentication' {
  import type { ComponentType } from 'react';
  import type { LucideIcon } from 'lucide-react';

  export const AuthenticationScreen: ComponentType;
  export const authenticationFeaturePack: {
    readonly id: 'authentication';
    readonly route: '/authentication';
    readonly navigation: {
      readonly label: string;
      readonly description: string;
      readonly icon: LucideIcon;
    };
    readonly screen: ComponentType;
    readonly dependencies: {
      readonly platform: readonly ['@platform/ui', '@platform/sdk'];
    };
  };
}

declare module '@platform/feature-packs/profile' {
  import type { ComponentType } from 'react';
  import type { LucideIcon } from 'lucide-react';

  export const ProfileScreen: ComponentType;
  export const profileFeaturePack: {
    readonly id: 'profile';
    readonly route: '/profile';
    readonly navigation: {
      readonly label: string;
      readonly description: string;
      readonly icon: LucideIcon;
    };
    readonly screen: ComponentType;
    readonly dependencies: {
      readonly platform: readonly ['@platform/ui', '@platform/sdk'];
      readonly featurePacks: readonly ['authentication'];
    };
  };
}

declare module '@platform/feature-packs/rbac' {
  import type { ComponentType } from 'react';
  import type { LucideIcon } from 'lucide-react';

  export const PermissionScreen: ComponentType;
  export const rbacFeaturePack: {
    readonly id: 'rbac';
    readonly route: '/rbac';
    readonly navigation: {
      readonly label: string;
      readonly description: string;
      readonly icon: LucideIcon;
    };
    readonly screen: ComponentType;
    readonly dependencies: {
      readonly platform: readonly ['@platform/ui', '@platform/sdk'];
      readonly featurePacks: readonly ['authentication'];
    };
  };
}
