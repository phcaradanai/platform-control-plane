import fs from 'fs';
import path from 'path';
import nunjucks from 'nunjucks';

/**
 * Reproduces how the built-in `fetch:template` scaffolder action renders
 * skeleton file contents: nunjucks with the `${{ ... }}` delimiters
 * Backstage's SecureTemplater configures (autoescape off, same tag markers).
 * Files matching `copyWithoutTemplatingPrefixes` are copied verbatim,
 * mirroring the template's `copyWithoutTemplating` step input (the key the
 * real fetch:template action handler reads - `copyWithoutRender` is an
 * older, now-inert key that the handler's schema still accepts but never
 * wires into behavior).
 */
export function renderSkeleton(
  skeletonDir: string,
  values: Record<string, unknown>,
  copyWithoutTemplatingPrefixes: string[] = [],
): Map<string, string> {
  const env = new nunjucks.Environment(null, {
    autoescape: false,
    tags: { variableStart: '${{', variableEnd: '}}' },
  });
  // fetch:template's real action handler builds the render context as
  // `{ values: ctx.input.values }` (templateActionHandler.cjs.js), so
  // skeleton files reference `${{ values.x }}`, not `${{ x }}`.
  const context = { values };

  const rendered = new Map<string, string>();

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      const relPath = path
        .relative(skeletonDir, abs)
        .split(path.sep)
        .join('/');
      const source = fs.readFileSync(abs, 'utf8');
      const skipRender = copyWithoutTemplatingPrefixes.some(pattern => {
        const prefix = pattern.replace(/\*\*?$/, '');
        return relPath.startsWith(prefix);
      });
      rendered.set(relPath, skipRender ? source : env.renderString(source, context));
    }
  };

  walk(skeletonDir);
  return rendered;
}
