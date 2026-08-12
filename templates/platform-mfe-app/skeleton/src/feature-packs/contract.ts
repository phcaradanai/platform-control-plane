import type { ComponentType, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Small contract shared by every generated frontend feature pack.
 *
 * The app registers routes; the pack owns its screen, navigation contribution,
 * and product-neutral interactions. Domain APIs can replace sample data later.
 * Packs may declare platform packages they consume, but may not introduce
 * arbitrary install-time dependencies. The App Factory owns the package
 * manifest and must make every declared dependency available in the base
 * skeleton before a pack is selectable.
 */
export type PlatformDependency = '@platform/ui' | '@platform/sdk';

export interface FeaturePack {
  readonly id: string;
  readonly route: `/${string}`;
  readonly navigation: {
    readonly label: string;
    readonly description: string;
    readonly icon?: LucideIcon;
  };
  readonly screen: ComponentType;
  readonly dependencies?: readonly PlatformDependency[];
  readonly documentation?: ReactNode;
}
