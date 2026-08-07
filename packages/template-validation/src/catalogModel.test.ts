import fs from 'fs';
import path from 'path';
import { parse as parseYaml, parseAllDocuments } from 'yaml';
import { repoRoot } from './paths';

describe('control-plane catalog-info.yaml', () => {
  const raw = fs.readFileSync(
    path.join(repoRoot, 'catalog-info.yaml'),
    'utf8',
  );
  const docs = parseAllDocuments(raw);
  const entities = docs.map(d => d.toJS());

  it('is valid multi-document YAML', () => {
    for (const doc of docs) {
      expect(doc.errors).toHaveLength(0);
    }
  });

  it('defines Domain, System, and Component entities with names from the spec', () => {
    const byKind = Object.fromEntries(
      entities.map((e: any) => [e.kind, e]),
    );
    expect(byKind.Domain.metadata.name).toBe('internal-platform');
    expect(byKind.System.metadata.name).toBe('application-platform');
    expect(byKind.Component.metadata.name).toBe('platform-control-plane');
  });

  it('links System to Domain and Component to System', () => {
    const byKind = Object.fromEntries(
      entities.map((e: any) => [e.kind, e]),
    );
    expect(byKind.System.spec.domain).toBe(byKind.Domain.metadata.name);
    expect(byKind.Component.spec.system).toBe(byKind.System.metadata.name);
  });

  it('gives every entity a name, description, owner, and lifecycle where applicable', () => {
    for (const entity of entities) {
      expect(entity.metadata.name).toBeTruthy();
      expect(entity.metadata.description).toBeTruthy();
      expect(entity.spec.owner).toBeTruthy();
    }
    const byKind = Object.fromEntries(
      entities.map((e: any) => [e.kind, e]),
    );
    expect(byKind.Component.spec.lifecycle).toBeTruthy();
    expect(byKind.Component.spec.type).toBeTruthy();
  });
});

describe('app-config catalog wiring', () => {
  for (const configFile of ['app-config.yaml', 'app-config.production.yaml']) {
    it(`${configFile} allows Domain/System/Component and registers the platform locations`, () => {
      const config = parseYaml(
        fs.readFileSync(path.join(repoRoot, configFile), 'utf8'),
      );
      const allowed = config.catalog.rules.flatMap(
        (r: { allow: string[] }) => r.allow,
      );
      expect(allowed).toEqual(
        expect.arrayContaining(['Domain', 'System', 'Component']),
      );

      const targets = config.catalog.locations.map(
        (l: { target: string }) => l.target,
      );
      expect(targets.some((t: string) => t.endsWith('catalog-info.yaml'))).toBe(
        true,
      );
      expect(
        targets.some((t: string) =>
          t.endsWith('templates/platform-mfe-app/template.yaml'),
        ),
      ).toBe(true);
    });
  }
});
