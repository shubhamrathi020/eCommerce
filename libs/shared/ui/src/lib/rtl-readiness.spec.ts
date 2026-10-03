import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Right-to-left readiness (BRD 18, LX-03). Layout flips for free when spacing, alignment and positioning use logical
 * utilities (`ms-`, `pe-`, `text-start`, `start-0`, `rounded-s`...) instead of physical ones (`ml-`, `pr-`, `text-left`, `left-0`...).
 * This scans every component template and fails if a physical-direction class comes back.
 */
const root = resolve(import.meta.dirname, '../../../../..');
const files: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', '.nx', '.git', 'coverage', 'api'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if ((name.endsWith('.ts') || name.endsWith('.html')) && !name.endsWith('.spec.ts')) files.push(p);
  }
};
walk(join(root, 'libs'));
for (const app of ['storefront', 'admin', 'seller']) walk(join(root, 'apps', app, 'src'));

/** A class token: starts at a boundary, may follow a variant like `md:` or `hover:`. */
const BOUNDARY = String.raw`(?<![\w\-./])`;
const PHYSICAL = new RegExp(
  [
    String.raw`${BOUNDARY}-?(?:ml|mr|pl|pr)-(?=[\w\[.])`,
    String.raw`${BOUNDARY}text-(?:left|right)(?![\w-])`,
    String.raw`${BOUNDARY}-?(?:left|right)-(?=[\w\[./])`,
    String.raw`${BOUNDARY}border-[lr](?![a-z])`,
    String.raw`${BOUNDARY}rounded-[lr](?![a-z])`,
    String.raw`${BOUNDARY}float-(?:left|right)(?![\w-])`,
  ].join('|'),
  'g',
);

describe('right-to-left readiness', () => {
  it('uses no physical-direction utility classes anywhere in the UI', () => {
    const found: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(PHYSICAL)) {
        const line = text.slice(0, m.index).split('\n').length;
        found.push(`${relative(root, f)}:${line} ${m[0]}`);
      }
    }
    expect(found).toEqual([]);
    expect(files.length).toBeGreaterThan(100); // the scan really looked at the codebase
  });

  it('mirrors directional icons and drawers', () => {
    const icon = readFileSync(join(root, 'libs/shared/ui/src/lib/icon/icon.ts'), 'utf8');
    const drawer = readFileSync(join(root, 'libs/shared/ui/src/lib/drawer/drawer.ts'), 'utf8');
    expect(icon).toContain('rtl:-scale-x-100');
    expect(drawer).toContain("'start-0'");
    expect(drawer).toContain("'end-0'");
  });
});
