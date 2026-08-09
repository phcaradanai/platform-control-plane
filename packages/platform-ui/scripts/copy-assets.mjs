import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src', 'styles');
const dest = join(root, 'dist');

// Ship the semantic token stylesheet at dist/styles/theme.css so the
// compiled `import './styles/theme.css'` in dist/index.js resolves, and
// mirror it at dist/theme.css for consumers who import it explicitly via
// the "./theme.css" export.
mkdirSync(join(dest, 'styles'), { recursive: true });
cpSync(join(src, 'theme.css'), join(dest, 'styles', 'theme.css'));
cpSync(join(src, 'theme.css'), join(dest, 'theme.css'));
