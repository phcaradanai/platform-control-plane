import type { ComponentType, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Small contract shared by every generated frontend feature pack.
 * The app registers routes; the pack owns its screen, navigation contribution,
 * and product-neutral interactions. Domain APIs can replace sample data later.
 */
export interface FeaturePack {
  readonly id: string;
  readonly route: `/${string}`;
  readonly navigation: {
    readonly label: string;
    readonly description: string;
    readonly icon?: LucideIcon;
  };
  readonly screen: ComponentType;
  readonly dependencies?: readonly string[];
  readonly documentation?: ReactNode;
}
