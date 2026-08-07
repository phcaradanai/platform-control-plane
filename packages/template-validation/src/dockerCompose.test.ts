import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { repoRoot } from './paths';

describe('docker-compose.yml', () => {
  const compose = parseYaml(
    fs.readFileSync(path.join(repoRoot, 'docker-compose.yml'), 'utf8'),
  );

  it('defines a postgres service on the postgres image family', () => {
    expect(compose.services.postgres).toBeDefined();
    expect(compose.services.postgres.image).toMatch(/^postgres:/);
  });

  it('drives credentials and database name from environment variables', () => {
    const env = compose.services.postgres.environment;
    expect(env.POSTGRES_USER).toContain('${POSTGRES_USER');
    expect(env.POSTGRES_PASSWORD).toContain('${POSTGRES_PASSWORD');
    expect(env.POSTGRES_DB).toContain('${POSTGRES_DB');
  });

  it('does not hardcode a non-default real credential', () => {
    const env = compose.services.postgres.environment;
    for (const value of Object.values(env) as string[]) {
      expect(value).toMatch(/^\$\{[A-Z_]+(:-[\w-]*)?\}$/);
    }
  });

  it('publishes a configurable port and persists data in a named volume', () => {
    expect(compose.services.postgres.ports[0]).toContain('${POSTGRES_PORT');
    expect(compose.services.postgres.volumes[0]).toMatch(
      /^postgres-data:/,
    );
    expect(compose.volumes['postgres-data']).toBeDefined();
  });

  it('has a healthcheck', () => {
    expect(compose.services.postgres.healthcheck).toBeDefined();
    expect(compose.services.postgres.healthcheck.test).toBeDefined();
  });
});
