import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');

const publicContentSurfaces = [
  'src/routes/jobs.locations.index.tsx',
  'src/components/board/taxonomy-tags.tsx',
  'src/routes/embed.jobs.tsx',
] as const;

const legacyImport =
  /from\s+["'](?:@\/components\/(?:application|base)(?:\/|["'])|@\/components\/text["']|@\/utils\/cx["']|@untitledui\/icons["']|react-aria-components["'])/g;

describe('public content shadcn contraction', () => {
  it.each(publicContentSurfaces)(
    '%s has no legacy presentation imports',
    (file) => {
      const source = readFileSync(join(root, file), 'utf8');
      const imports = source.match(legacyImport) ?? [];

      expect(
        imports,
        `${file} still reaches into the inherited Untitled UI presentation layer`,
      ).toEqual([]);
      expect(
        source,
        `${file} must compose at least one owned shadcn primitive`,
      ).toMatch(/from\s+["']@\/components\/ui\//);
    },
  );
});
