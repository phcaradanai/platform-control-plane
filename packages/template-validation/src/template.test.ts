import fs from 'fs';
import path from 'path';
import { parse as parseYaml, parseAllDocuments } from 'yaml';
import { templateEntityV1beta3Validator } from '@backstage/plugin-scaffolder-common';
import { templateDir, skeletonDir } from './paths';
import { renderSkeleton } from './renderSkeleton';

const CURATED_CAPABILITIES = [
  'authentication',
  'rbac',
  'dashboard',
  'reports',
  'history',
  'audit-log',
  'notifications',
  'tenant',
  'theme',
  'i18n',
  'observability',
  'desktop-ready',
  'mobile-ready',
];

const SELECTED_CAPABILITIES = ['authentication', 'rbac', 'dashboard'];

const SAMPLE_VALUES = {
  name: 'sample-app',
  title: 'Sample App',
  description: 'A sample application generated for tests.',
  owner: 'group:default/guests',
  mode: 'platform-mfe',
  lifecycle: 'experimental',
  capabilities: SELECTED_CAPABILITIES,
  repo: { host: 'github.com', owner: 'example-org', repo: 'sample-app' },
};

function loadTemplate() {
  const raw = fs.readFileSync(path.join(templateDir, 'template.yaml'), 'utf8');
  return parseYaml(raw);
}

describe('platform-mfe-app template.yaml', () => {
  const template = loadTemplate();

  it('is valid YAML with a single document', () => {
    const docs = parseAllDocuments(
      fs.readFileSync(path.join(templateDir, 'template.yaml'), 'utf8'),
    );
    expect(docs).toHaveLength(1);
    expect(docs[0].errors).toHaveLength(0);
  });

  it('is a valid Template entity', async () => {
    await expect(
      templateEntityV1beta3Validator.check(template),
    ).resolves.toBe(true);
  });

  it('requires the application identity, repository, and metadata fields', () => {
    const required = template.spec.parameters.flatMap(
      (p: { required?: string[] }) => p.required ?? [],
    );
    expect(required).toEqual(
      expect.arrayContaining([
        'name',
        'title',
        'owner',
        'repoUrl',
        'repoVisibility',
        'lifecycle',
        'mode',
      ]),
    );
  });

  it('restricts the repository host to github.com', () => {
    const repoUrlProp = template.spec.parameters
      .flatMap((p: { properties?: Record<string, unknown> }) =>
        Object.entries(p.properties ?? {}),
      )
      .find(([key]: [string, unknown]) => key === 'repoUrl')?.[1] as {
      'ui:options'?: { allowedHosts?: string[] };
    };
    expect(repoUrlProp?.['ui:options']?.allowedHosts).toEqual(['github.com']);
  });

  it('restricts capabilities to the curated list', () => {
    const capabilitiesProp = template.spec.parameters
      .flatMap((p: { properties?: Record<string, unknown> }) =>
        Object.entries(p.properties ?? {}),
      )
      .find(([key]: [string, unknown]) => key === 'capabilities')?.[1] as {
      items?: { enum?: string[] };
    };
    expect(capabilitiesProp?.items?.enum).toEqual(CURATED_CAPABILITIES);
  });

  it('fixes the default branch to main and does not expose it as a parameter', () => {
    const publishStep = template.spec.steps.find(
      (s: { id: string }) => s.id === 'publish',
    );
    expect(publishStep.input.defaultBranch).toBe('main');
    const allProps = template.spec.parameters.flatMap(
      (p: { properties?: Record<string, unknown> }) =>
        Object.keys(p.properties ?? {}),
    );
    expect(allProps).not.toContain('defaultBranch');
  });

  it('uses camelCase built-in action steps in the correct order', () => {
    expect(
      template.spec.steps.map((s: { id: string; action: string }) => [
        s.id,
        s.action,
      ]),
    ).toEqual([
      ['fetchBase', 'fetch:template'],
      ['publish', 'publish:github'],
      ['register', 'catalog:register'],
    ]);
    for (const step of template.spec.steps) {
      expect(step.id).toMatch(/^[a-z][a-zA-Z0-9]*$/);
    }
  });

  it('copies GitHub workflow files without templating them', () => {
    const fetchStep = template.spec.steps.find(
      (s: { id: string }) => s.id === 'fetchBase',
    );
    expect(fetchStep.input.copyWithoutRender).toContain(
      '.github/workflows/**',
    );
  });

  it('produces links to the repository and catalog entity on success', () => {
    const linkTitles = template.spec.output.links.map(
      (l: { title: string }) => l.title,
    );
    expect(linkTitles).toEqual(
      expect.arrayContaining(['Repository', 'Open in catalog']),
    );
  });
});

describe('platform-mfe-app skeleton', () => {
  const requiredFiles = [
    'README.md',
    'package.json',
    'catalog-info.yaml',
    'platform-app.json',
    '.env.example',
    '.gitignore',
    '.github/workflows/ci.yml',
  ];

  it.each(requiredFiles)('includes %s', file => {
    expect(fs.existsSync(path.join(skeletonDir, file))).toBe(true);
  });

  it('includes a src/ directory with at least one file', () => {
    const srcDir = path.join(skeletonDir, 'src');
    expect(fs.existsSync(srcDir)).toBe(true);
    expect(fs.readdirSync(srcDir).length).toBeGreaterThan(0);
  });

  describe('rendered output', () => {
    const template = loadTemplate();
    const fetchStep = template.spec.steps.find(
      (s: { id: string }) => s.id === 'fetchBase',
    );
    const rendered = renderSkeleton(
      skeletonDir,
      SAMPLE_VALUES,
      fetchStep.input.copyWithoutRender,
    );

    it('leaves no unresolved scaffolder expressions in any rendered file', () => {
      const copyWithoutRenderPrefixes = (
        fetchStep.input.copyWithoutRender as string[]
      ).map((p: string) => p.replace(/\*\*?$/, ''));
      for (const [file, content] of rendered) {
        // Files copied verbatim (e.g. GitHub Actions workflows) legitimately
        // keep their own `${{ ... }}` expressions - those aren't scaffolder
        // expressions and are covered by the byte-identical check below.
        if (copyWithoutRenderPrefixes.some(prefix => file.startsWith(prefix))) {
          continue;
        }
        expect({ file, hasUnresolved: content.includes('${{') }).toEqual({
          file,
          hasUnresolved: false,
        });
      }
    });

    it('produces a valid platform-app.json reflecting the selected values', () => {
      const parsed = JSON.parse(rendered.get('platform-app.json')!);
      expect(parsed).toEqual({
        schemaVersion: '1.0',
        id: SAMPLE_VALUES.name,
        title: SAMPLE_VALUES.title,
        mode: SAMPLE_VALUES.mode,
        owner: SAMPLE_VALUES.owner,
        capabilities: SELECTED_CAPABILITIES,
        runtime: { type: 'module-federation', status: 'not-configured' },
      });
    });

    it('produces a valid catalog-info.yaml for the generated component', () => {
      const parsed = parseYaml(rendered.get('catalog-info.yaml')!);
      expect(parsed.kind).toBe('Component');
      expect(parsed.metadata.name).toBe(SAMPLE_VALUES.name);
      expect(parsed.spec.owner).toBe(SAMPLE_VALUES.owner);
      expect(parsed.spec.lifecycle).toBe(SAMPLE_VALUES.lifecycle);
      expect(parsed.spec.system).toBe('application-platform');
      expect(parsed.metadata.annotations['github.com/project-slug']).toBe(
        `${SAMPLE_VALUES.repo.owner}/${SAMPLE_VALUES.repo.repo}`,
      );
    });

    it('produces valid, parseable package.json and tsconfig.json', () => {
      expect(() => JSON.parse(rendered.get('package.json')!)).not.toThrow();
      const pkg = JSON.parse(rendered.get('package.json')!);
      expect(pkg.name).toBe(SAMPLE_VALUES.name);
      expect(fs.existsSync(path.join(skeletonDir, 'tsconfig.json'))).toBe(
        true,
      );
    });

    it('leaves the GitHub Actions workflow byte-identical (copyWithoutRender)', () => {
      const source = fs.readFileSync(
        path.join(skeletonDir, '.github/workflows/ci.yml'),
        'utf8',
      );
      expect(rendered.get('.github/workflows/ci.yml')).toBe(source);
    });

    it('records the exact selected capabilities in README.md', () => {
      const readme = rendered.get('README.md')!;
      for (const capability of SELECTED_CAPABILITIES) {
        expect(readme).toContain(capability);
      }
    });
  });
});
