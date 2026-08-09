import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { templateDir, skeletonDir } from './paths';
import { renderSkeleton } from './renderSkeleton';

/**
 * Exercises the Phase 4 capability composition mechanism end to end at the
 * render layer: which capability ids are composed, whether pruning a
 * capability leaves any surviving file importing from it, whether the
 * frozen package.json/package-lock.json ever vary by selection, and
 * whether unknown/duplicate capability values are handled safely. See
 * docs/capabilities.md for the mechanism this pins.
 */

interface PruneStep {
  id: string;
  action: string;
  each: string[];
  if: string;
  input: { files: string[] };
}

function loadTemplate() {
  const raw = fs.readFileSync(path.join(templateDir, 'template.yaml'), 'utf8');
  return parseYaml(raw);
}

/**
 * Reads the composed-capability id list from the real template.yaml
 * `pruneCapabilities` step, rather than hardcoding a second copy here -
 * the same drift that let Phase 1.1's `copyWithoutRender` pass every
 * hermetic test while being a silent no-op against the real scaffolder
 * backend. If this step is renamed, removed, or its shape changes, this
 * throws instead of silently testing nothing.
 */
function loadPruneStep(): PruneStep {
  const template = loadTemplate();
  const step = template.spec.steps.find(
    (s: { id: string }) => s.id === 'pruneCapabilities',
  );
  if (!step || step.action !== 'fs:delete' || !Array.isArray(step.each)) {
    throw new Error(
      'Expected a pruneCapabilities fs:delete step with an `each` array in template.yaml',
    );
  }
  return step as PruneStep;
}

const pruneStep = loadPruneStep();
const COMPOSED_CAPABILITIES = pruneStep.each;

/**
 * Mirrors the step's own `if: ${{ not (each.value in parameters.capabilities) }}`
 * condition (asserted verbatim below so a change to the real condition is
 * caught, not silently untested) to compute, for a given selection, which
 * composed capability directories the real `fs:delete` step would remove.
 */
function capabilitiesToPrune(selected: string[]): string[] {
  return COMPOSED_CAPABILITIES.filter(id => !selected.includes(id));
}

/** Renders the skeleton, then applies the same prune fs:delete would perform. */
function renderAndPrune(capabilities: string[]): Map<string, string> {
  const template = loadTemplate();
  const fetchStep = template.spec.steps.find(
    (s: { id: string }) => s.id === 'fetchBase',
  );
  const rendered = renderSkeleton(
    skeletonDir,
    {
      name: 'sample-app',
      title: 'Sample App',
      description: 'A sample application.',
      owner: 'group:default/platform-team',
      mode: 'platform-mfe',
      lifecycle: 'experimental',
      capabilities,
      repo: { host: 'github.com', owner: 'example-org', repo: 'sample-app' },
    },
    fetchStep.input.copyWithoutTemplating,
  );

  for (const prunedId of capabilitiesToPrune(capabilities)) {
    const prefix = `src/capabilities/${prunedId}/`;
    for (const file of [...rendered.keys()]) {
      if (file.startsWith(prefix)) {
        rendered.delete(file);
      }
    }
  }
  return rendered;
}

/** Every relative import target this file resolves to, repo-relative (POSIX). */
function resolveRelativeImports(filePath: string, content: string): string[] {
  const importRe = /(?:import|export)[^'"]*from\s+['"](\.[^'"]+)['"]/g;
  return [...content.matchAll(importRe)].map(match =>
    path.posix.normalize(path.posix.join(path.posix.dirname(filePath), match[1])),
  );
}

describe('pruneCapabilities step (single source of truth)', () => {
  it('deletes each composed capability directory when not selected', () => {
    expect(pruneStep.action).toBe('fs:delete');
    expect(pruneStep.if).toBe(
      '${{ not (each.value in parameters.capabilities) }}',
    );
    expect(pruneStep.input.files).toEqual([
      'src/capabilities/${{ each.value }}/**',
    ]);
  });

  it('composes exactly notifications, i18n, and observability today', () => {
    // Intentionally exact, not a subset check: adding to this list is a
    // deliberate decision (see docs/capabilities.md's "Adding another
    // composed capability"), not something that should happen silently.
    expect(COMPOSED_CAPABILITIES).toEqual(['notifications', 'i18n', 'observability']);
  });

  it('runs between fetchBase and publish', () => {
    const template = loadTemplate();
    const ids = template.spec.steps.map((s: { id: string }) => s.id);
    expect(ids.indexOf('fetchBase')).toBeLessThan(ids.indexOf('pruneCapabilities'));
    expect(ids.indexOf('pruneCapabilities')).toBeLessThan(ids.indexOf('publish'));
  });
});

describe.each([
  { name: 'none selected (fresh generated application)', capabilities: [] },
  { name: 'only notifications', capabilities: ['notifications'] },
  { name: 'only i18n', capabilities: ['i18n'] },
  { name: 'only observability', capabilities: ['observability'] },
  { name: 'a pair: notifications + observability', capabilities: ['notifications', 'observability'] },
  {
    name: 'all three composed, plus an unrelated recorded-only capability',
    capabilities: ['notifications', 'i18n', 'observability', 'authentication'],
  },
])('capability combination: $name', ({ capabilities }) => {
  const rendered = renderAndPrune(capabilities);
  const pruned = capabilitiesToPrune(capabilities);
  const kept = COMPOSED_CAPABILITIES.filter(id => capabilities.includes(id));

  it('keeps exactly the selected composed capabilities\' directories and removes the rest', () => {
    for (const id of kept) {
      expect(
        [...rendered.keys()].some(f => f.startsWith(`src/capabilities/${id}/`)),
      ).toBe(true);
    }
    for (const id of pruned) {
      expect(
        [...rendered.keys()].some(f => f.startsWith(`src/capabilities/${id}/`)),
      ).toBe(false);
    }
  });

  it('leaves no surviving file importing from a pruned capability directory', () => {
    for (const [file, content] of rendered) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      for (const target of resolveRelativeImports(file, content)) {
        for (const id of pruned) {
          expect({
            file,
            danglingImport: target.startsWith(`src/capabilities/${id}/`) ? target : null,
          }).toEqual({ file, danglingImport: null });
        }
      }
    }
  });

  it('leaves no unresolved scaffolder expression or stray nunjucks block tag', () => {
    const template = loadTemplate();
    const fetchStep = template.spec.steps.find((s: { id: string }) => s.id === 'fetchBase');
    const copyWithoutTemplatingPrefixes = (
      fetchStep.input.copyWithoutTemplating as string[]
    ).map((p: string) => p.replace(/\*\*?$/, ''));

    for (const [file, content] of rendered) {
      if (copyWithoutTemplatingPrefixes.some(prefix => file.startsWith(prefix))) {
        continue;
      }
      expect({ file, hasUnresolvedVariable: content.includes('${{') }).toEqual({
        file,
        hasUnresolvedVariable: false,
      });
      expect({ file, hasStrayBlockTag: /\{%[-\s]*(if|endif|for|endfor|set)\b/.test(content) }).toEqual({
        file,
        hasStrayBlockTag: false,
      });
    }
  });

  it('never varies package.json or package-lock.json by capability selection', () => {
    const baseline = renderAndPrune([]);
    expect(rendered.get('package.json')).toBe(baseline.get('package.json'));
    expect(rendered.get('package-lock.json')).toBe(baseline.get('package-lock.json'));
  });

  it('never references a capability directory from the committed route tree', () => {
    expect(rendered.get('src/routeTree.gen.ts')).not.toContain('capabilities/');
  });
});

describe('invalid and duplicate capability selections are inert', () => {
  it('ignores a capability id outside the curated enum without affecting composed capabilities', () => {
    // template.yaml's own JSON Schema (uniqueItems + closed enum) is the
    // first line of defense at form/task-submission time - this proves the
    // composition layer itself doesn't additionally need to trust that,
    // in case a future change loosens the schema.
    const withUnknown = renderAndPrune(['notifications', 'not-a-real-capability']);
    const withoutUnknown = renderAndPrune(['notifications']);
    expect([...withUnknown.keys()].sort()).toEqual([...withoutUnknown.keys()].sort());
  });

  it('treats a duplicated capability id the same as selecting it once', () => {
    const withDuplicate = renderAndPrune(['i18n', 'i18n']);
    const withoutDuplicate = renderAndPrune(['i18n']);
    expect([...withDuplicate.keys()].sort()).toEqual([...withoutDuplicate.keys()].sort());
  });
});
