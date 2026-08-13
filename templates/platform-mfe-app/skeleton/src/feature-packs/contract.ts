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

/** Feature-pack ids are closed at the App Factory boundary. */
export type FeaturePackId =
  | 'authentication'
  | 'profile'
  | 'rbac'
  | 'dashboard'
  | 'settings';

export interface FeaturePackDependencies {
  readonly platform?: readonly PlatformDependency[];
  readonly featurePacks?: readonly FeaturePackId[];
}

export interface FeaturePack {
  readonly id: FeaturePackId;
  readonly route: `/${string}`;
  readonly navigation: {
    readonly label: string;
    readonly description: string;
    readonly icon?: LucideIcon;
  };
  readonly screen: ComponentType;
  readonly dependencies?: FeaturePackDependencies;
  readonly documentation?: ReactNode;
}

/**
 * Validates the selected registry at the generated-app boundary. The
 * scaffolder schema prevents invalid standard combinations, while this
 * runtime check keeps hand-edited `platform-app.json`/registry changes from
 * silently importing a pack without its declared identity dependency.
 */
export function validateFeaturePackDependencies(
  packs: readonly FeaturePack[],
): readonly FeaturePack[] {
  const selected = new Set(packs.map(pack => pack.id));

  for (const pack of packs) {
    for (const dependency of pack.dependencies?.featurePacks ?? []) {
      if (!selected.has(dependency)) {
        throw new Error(
          `Feature pack "${pack.id}" requires selected feature pack "${dependency}".`,
        );
      }
    }
  }

  return packs;
}
