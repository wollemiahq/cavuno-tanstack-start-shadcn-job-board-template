import { describe, expect, it } from 'vitest';

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Catalog = Record<
  string,
  | string
  | {
      declarations: string[];
      selectors: string[];
      match: Record<string, string>;
    }[]
>;

const root = join(import.meta.dirname, '..');
const english = {
  greeting: 'Hello {name}',
  count: [
    {
      declarations: ['input count', 'local countPlural = count: plural'],
      selectors: ['countPlural'],
      match: {
        'countPlural=one': '{name} has one result',
        'countPlural=*': '{name} has {count} results',
      },
    },
  ],
};
const complete = {
  greeting: 'Hallo {name}',
  count: [
    {
      declarations: ['input count', 'local countPlural = count: plural'],
      selectors: ['countPlural'],
      match: {
        'countPlural=one': '{name} hat ein Ergebnis',
        'countPlural=*': '{name} hat {count} Ergebnisse',
      },
    },
  ],
};
const script = join(root, 'scripts/locale-add.mjs');

function fixture(
  catalog: Catalog | undefined,
  locales = ['en'],
  extraCatalog?: { locale: string; catalog: Catalog },
) {
  const directory = mkdtempSync(join(tmpdir(), 'locale-add-contract-'));
  mkdirSync(join(directory, 'messages'));
  mkdirSync(join(directory, 'project.inlang'));
  writeFileSync(
    join(directory, 'messages/en.json'),
    `${JSON.stringify(english)}\n`,
  );
  if (catalog) {
    writeFileSync(
      join(directory, 'messages/de.json'),
      `${JSON.stringify(catalog)}\n`,
    );
  }
  if (extraCatalog) {
    writeFileSync(
      join(directory, 'messages', `${extraCatalog.locale}.json`),
      `${JSON.stringify(extraCatalog.catalog)}\n`,
    );
  }
  writeFileSync(
    join(directory, 'project.inlang/settings.json'),
    `${JSON.stringify({ baseLocale: 'en', locales }, null, 2)}\n`,
  );
  return directory;
}

function run(directory: string, locale = 'de') {
  const result = spawnSync(process.execPath, [script, locale], {
    cwd: directory,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return {
    status: result.status ?? -1,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

describe('active locale catalog contract', () => {
  it('leaves settings unchanged when an existing catalog is incomplete', () => {
    const incomplete = { count: structuredClone(complete.count) };
    const directory = fixture(incomplete);
    try {
      const before = readFileSync(
        join(directory, 'project.inlang/settings.json'),
        'utf8',
      );
      expect(run(directory).status).toBe(1);
      expect(
        readFileSync(join(directory, 'project.inlang/settings.json'), 'utf8'),
      ).toBe(before);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('activates a complete existing catalog without translation credentials', () => {
    const directory = fixture(complete);
    try {
      expect(run(directory).status).toBe(0);
      expect(
        JSON.parse(
          readFileSync(join(directory, 'project.inlang/settings.json'), 'utf8'),
        ).locales,
      ).toEqual(['de', 'en']);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('seeds a missing catalog but keeps the locale dormant', () => {
    const directory = fixture(undefined);
    try {
      expect(run(directory).status).toBe(0);
      expect(existsSync(join(directory, 'messages/de.json'))).toBe(true);
      expect(
        JSON.parse(
          readFileSync(join(directory, 'project.inlang/settings.json'), 'utf8'),
        ).locales,
      ).toEqual(['en']);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('does not inspect an incomplete dormant catalog', () => {
    const dormant = { count: structuredClone(complete.count) };
    const directory = fixture(complete, ['en', 'de'], {
      locale: 'fr',
      catalog: dormant,
    });
    try {
      expect(run(directory, 'de').status).toBe(0);
      expect(
        JSON.parse(
          readFileSync(join(directory, 'project.inlang/settings.json'), 'utf8'),
        ).locales,
      ).toEqual(['en', 'de']);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
