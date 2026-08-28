import { describe, expect, it } from 'vitest';

import { entityCount } from './entity-count';

/**
 * The defect this guards: the call sites used to ask `Intl.PluralRules` for the
 * CLDR category and then collapse the answer into singular/plural. Polish
 * `select(2)` is `few` and `select(5)` is `many`; both fell to the plural form,
 * so the home page rendered "5 oferty" where Polish requires "5 ofert".
 */
const pl = (args: { count: number; countLabel: string }) => {
  const category = new Intl.PluralRules('pl').select(args.count);
  const noun =
    category === 'one'
      ? 'oferta'
      : category === 'few'
        ? 'oferty'
        : category === 'many'
          ? 'ofert'
          : 'oferty';
  return `${args.countLabel} ${noun}`;
};

describe('entityCount', () => {
  it('renders all three Polish forms, not just one-vs-rest', () => {
    expect(entityCount(1, 'pl', pl)).toBe('1 oferta');
    expect(entityCount(2, 'pl', pl)).toBe('2 oferty');
    // The case a two-form implementation gets wrong.
    expect(entityCount(5, 'pl', pl)).toBe('5 ofert');
    expect(entityCount(125, 'pl', pl)).toBe('125 ofert');
  });

  it('formats the count for the locale', () => {
    expect(entityCount(1234, 'en', (a) => `${a.countLabel} jobs`)).toBe(
      '1,234 jobs',
    );
  });

  it('prefers a complete chrome override over the catalog message', () => {
    const message = () => 'CATALOG';
    expect(
      entityCount(5, 'en', message, { singular: 'role', plural: 'roles' }),
    ).toBe('5 roles');
    expect(
      entityCount(1, 'en', message, { singular: 'role', plural: 'roles' }),
    ).toBe('1 role');
  });

  it('falls back to the catalog when an override is partial or absent', () => {
    const message = (a: { count: number; countLabel: string }) =>
      `${a.countLabel} CATALOG`;
    expect(entityCount(5, 'en', message)).toBe('5 CATALOG');
    expect(entityCount(5, 'en', message, {})).toBe('5 CATALOG');
    expect(entityCount(5, 'en', message, { singular: 'role' })).toBe(
      '5 CATALOG',
    );
    expect(entityCount(5, 'en', message, { plural: 'roles' })).toBe(
      '5 CATALOG',
    );
  });
});
