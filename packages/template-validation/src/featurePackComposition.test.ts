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
  const match = content.match(/dependencies:\s*\[([^\]]*)\]/);
  return match
    ? [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map(result => result[1])
    : [];
}

describe('frontend feature pack composition', () => {
  it('uses one deterministic prune step for dashboard and settings', () => {
    expect(pruneStep.if).toBe(
      '${{ not (each.value in parameters.capabilities) }}',
    );
    expect(pruneStep.each).toEqual(['dashboard', 'settings']);
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
    { name: 'App B: dashboard only', capabilities: ['dashboard'] },
    { name: 'App B2: settings only', capabilities: ['settings'] },
    {
      name: 'App C: dashboard + settings',
      capabilities: ['dashboard', 'settings'],
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
    const rendered = renderAndPrune(['dashboard', 'settings']);
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
      "dependencies: ['@platform/ui']",
    );
    expect(rendered.get('src/feature-packs/settings/index.tsx')).toContain(
      "dependencies: ['@platform/ui']",
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

  it('keeps verification routes out of product navigation and localizes shell text only when i18n is selected', () => {
    const base = renderAndPrune([]).get('src/components/layout/app-shell.tsx');
    expect(base).not.toContain("href: '/components'");
    expect(base).not.toContain("href: '/table'");
    expect(base).not.toContain("href: '/form'");

    const withI18n = renderAndPrune(['i18n', 'dashboard', 'settings']);
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
    }
  });
});
