import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';

import { renderSkeleton } from './renderSkeleton';
import { skeletonDir, templateDir } from './paths';

interface PruneStep {
  id: string;
  action: string;
  each: string[];
  if: string;
  input: { files: string[] };
}

function loadTemplate() {
  return parseYaml(
    fs.readFileSync(path.join(templateDir, 'template.yaml'), 'utf8'),
  );
}

function loadFeaturePackPruneStep(): PruneStep {
  const step = loadTemplate().spec.steps.find(
    (candidate: { id: string }) => candidate.id === 'pruneFeaturePacks',
  );
  if (!step || step.action !== 'fs:delete' || !Array.isArray(step.each)) {
    throw new Error(
      'Expected a pruneFeaturePacks fs:delete step with an `each` array',
    );
  }
  return step as PruneStep;
}

const pruneStep = loadFeaturePackPruneStep();
const FEATURE_PACKS = pruneStep.each;

function renderAndPrune(capabilities: string[]) {
  const fetchStep = loadTemplate().spec.steps.find(
    (candidate: { id: string }) => candidate.id === 'fetchBase',
  );
  const rendered = renderSkeleton(
    skeletonDir,
    {
      name: 'sample-app',
      title: 'Sample App',
      description: 'A sample application.',
      owner: 'group:default/platform-team',
      mode: 'standalone',
      lifecycle: 'experimental',
      capabilities,
      repo: { host: 'github.com', owner: 'example-org', repo: 'sample-app' },
    },
    fetchStep.input.copyWithoutTemplating,
  );

  for (const id of FEATURE_PACKS) {
    if (capabilities.includes(id)) continue;
    for (const file of [...rendered.keys()]) {
      if (
        file.startsWith(`src/feature-packs/${id}/`) ||
        file === `src/routes/${id}.tsx`
      ) {
        rendered.delete(file);
      }
    }
  }
  return rendered;
}

function declaredDependencies(content: string): string[] {
  const match = content.match(/platform:\s*\[([^\]]*)\]/);
  return match ? ['@platform/ui', '@platform/sdk'].filter(value => match[1].includes(value)) : [];
}

describe('frontend feature pack composition', () => {
  it('uses one deterministic prune step for all selectable feature packs', () => {
    expect(pruneStep.if).toBe(
      '${{ not (each.value in parameters.capabilities) }}',
    );
    expect(pruneStep.each).toEqual([
      'authentication',
      'profile',
      'rbac',
      'dashboard',
      'settings',
    ]);
    expect(pruneStep.input.files).toEqual([
      'src/feature-packs/${{ each.value }}/**',
      'src/routes/${{ each.value }}.tsx',
    ]);

    const ids = loadTemplate().spec.steps.map(
      (step: { id: string }) => step.id,
    );
    expect(ids.indexOf('fetchBase')).toBeLessThan(
      ids.indexOf('pruneFeaturePacks'),
    );
    expect(ids.indexOf('pruneFeaturePacks')).toBeLessThan(
      ids.indexOf('publish'),
    );
  });

  it.each([
    { name: 'App A: no optional packs', capabilities: [] },
    { name: 'App B0: authentication only', capabilities: ['authentication'] },
    {
      name: 'App B1: authentication + profile',
      capabilities: ['authentication', 'profile'],
    },
    {
      name: 'App B2: authentication + rbac',
      capabilities: ['authentication', 'rbac'],
    },
    { name: 'App B: dashboard only', capabilities: ['dashboard'] },
    { name: 'App C0: settings only', capabilities: ['settings'] },
    {
      name: 'App D: identity + dashboard + settings',
      capabilities: [
        'authentication',
        'profile',
        'rbac',
        'dashboard',
        'settings',
      ],
    },
  ])('$name has only its selected pack code and routes', ({ capabilities }) => {
    const rendered = renderAndPrune(capabilities);
    const registry = rendered.get('src/feature-packs/registry.tsx');
    const routeTree = rendered.get('src/routeTree.gen.ts');
    const appShell = rendered.get('src/components/layout/app-shell.tsx');

    expect(registry).toBeDefined();
    expect(routeTree).toBeDefined();
    expect(appShell).toBeDefined();

    const unselectedReferences: string[] = [];
    for (const id of FEATURE_PACKS) {
      const selected = capabilities.includes(id);
      expect(
        [...rendered.keys()].some(file =>
          file.startsWith(`src/feature-packs/${id}/`),
        ),
      ).toBe(selected);
      expect(rendered.has(`src/routes/${id}.tsx`)).toBe(selected);
      if (!selected) {
        if (registry?.includes(`${id}FeaturePack`)) {
          unselectedReferences.push(`${id} registry export`);
        }
        if (registry?.includes(`./${id}`)) {
          unselectedReferences.push(`${id} registry import`);
        }
        if (routeTree?.includes(`/${id}`)) {
          unselectedReferences.push(`${id} route`);
        }
        if (appShell?.includes(`feature-packs/${id}`)) {
          unselectedReferences.push(`${id} shell reference`);
        }
      }
    }
    expect(unselectedReferences).toEqual([]);
  });

  it('composes both packs through the same application shell and shared UI package', () => {
    const rendered = renderAndPrune([
      'authentication',
      'profile',
      'rbac',
      'dashboard',
      'settings',
    ]);
    expect(rendered.get('src/feature-packs/contract.ts')).toContain(
      "type PlatformDependency = '@platform/ui' | '@platform/sdk'",
    );
    expect(rendered.get('src/components/layout/app-shell.tsx')).toContain(
      "from '@platform/ui'",
    );
    expect(rendered.get('src/components/layout/app-shell.tsx')).toContain(
      "from '../../feature-packs/registry'",
    );
    expect(rendered.get('src/feature-packs/registry.tsx')).toContain(
      'dashboardFeaturePack',
    );
    expect(rendered.get('src/feature-packs/registry.tsx')).toContain(
      'settingsFeaturePack',
    );
    expect(rendered.get('src/routes/dashboard.tsx')).toContain(
      'DashboardScreen',
    );
    expect(rendered.get('src/routes/settings.tsx')).toContain('SettingsScreen');
    expect(rendered.get('src/feature-packs/dashboard/index.tsx')).toContain(
      "platform: ['@platform/ui']",
    );
    expect(rendered.get('src/feature-packs/settings/index.tsx')).toContain(
      "platform: ['@platform/ui']",
    );

    expect(rendered.get('src/feature-packs/profile/index.tsx')).toContain(
      "featurePacks: ['authentication']",
    );
    expect(rendered.get('src/feature-packs/rbac/index.tsx')).toContain(
      "featurePacks: ['authentication']",
    );
    expect(rendered.get('src/feature-packs/registry.tsx')).toContain(
      'validateFeaturePackDependencies',
    );

    const generatedPackage = JSON.parse(rendered.get('package.json')!);
    for (const id of FEATURE_PACKS) {
      const dependencies = declaredDependencies(
        rendered.get(`src/feature-packs/${id}/index.tsx`)!,
      );
      expect(
        dependencies.every(dependency => dependency.startsWith('@platform/')),
      ).toBe(true);
      for (const dependency of dependencies) {
        expect(generatedPackage.dependencies[dependency]).toBeDefined();
      }
    }
  });

  it('declares identity dependencies in the App Factory contract', () => {
    const template = loadTemplate();
    const capabilities = template.spec.parameters.find(
      (parameter: { title: string }) => parameter.title === 'Capabilities',
    );
    expect(capabilities.allOf).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          if: expect.objectContaining({
            properties: expect.objectContaining({
              capabilities: expect.objectContaining({
                contains: { const: 'profile' },
              }),
            }),
          }),
          then: expect.objectContaining({
            properties: expect.objectContaining({
              capabilities: expect.objectContaining({
                contains: { const: 'authentication' },
              }),
            }),
          }),
        }),
        expect.objectContaining({
          if: expect.objectContaining({
            properties: expect.objectContaining({
              capabilities: expect.objectContaining({
                contains: { const: 'rbac' },
              }),
            }),
          }),
          then: expect.objectContaining({
            properties: expect.objectContaining({
              capabilities: expect.objectContaining({
                contains: { const: 'authentication' },
              }),
            }),
          }),
        }),
      ]),
    );
  });

  it('keeps verification routes out of product navigation and localizes shell text only when i18n is selected', () => {
    const base = renderAndPrune([]).get('src/components/layout/app-shell.tsx');
    expect(base).not.toContain("href: '/components'");
    expect(base).not.toContain("href: '/table'");
    expect(base).not.toContain("href: '/form'");

    const withI18n = renderAndPrune([
      'i18n',
      'authentication',
      'profile',
      'rbac',
      'dashboard',
      'settings',
    ]);
    expect(withI18n.get('src/components/layout/app-shell.tsx')).toContain(
      'useI18n',
    );
    expect(withI18n.get('src/components/layout/app-shell.tsx')).toContain(
      'navigation.',
    );
    expect(withI18n.get('src/capabilities/i18n/i18n-provider.tsx')).toContain(
      "'navigation.dashboard'",
    );
  });

  it('leaves no unresolved template tags or optional feature imports after pruning', () => {
    const rendered = renderAndPrune([]);
    for (const [file, content] of rendered) {
      if (file.startsWith('vendor/') || file.startsWith('.github/workflows/')) {
        continue;
      }
      expect({ file, hasVariable: content.includes('${{') }).toEqual({
        file,
        hasVariable: false,
      });
      expect({
        file,
        hasBlockTag: /\{%[-\s]*(if|endif|for|endfor|set)\b/.test(content),
      }).toEqual({
        file,
        hasBlockTag: false,
      });
      expect({
        file,
        hasDashboardReference: content.includes('feature-packs/dashboard'),
      }).toEqual({
        file,
        hasDashboardReference: false,
      });
      expect({
        file,
        hasSettingsReference: content.includes('feature-packs/settings'),
      }).toEqual({
        file,
        hasSettingsReference: false,
      });
      expect({
        file,
        hasAuthenticationReference: content.includes(
          'feature-packs/authentication',
        ),
      }).toEqual({ file, hasAuthenticationReference: false });
      expect({
        file,
        hasProfileReference: content.includes('feature-packs/profile'),
      }).toEqual({ file, hasProfileReference: false });
      expect({
        file,
        hasRbacReference: content.includes('feature-packs/rbac'),
      }).toEqual({ file, hasRbacReference: false });
    }
  });
});
