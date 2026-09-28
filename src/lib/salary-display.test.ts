import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  format: vi.fn(),
  year: vi.fn(() => 'year fixture'),
  hour: vi.fn(() => 'hour fixture'),
  join: vi.fn(
    ({ amount, unit }: { amount: string; unit: string }) =>
      `${unit} :: ${amount}`,
  ),
  from: vi.fn(({ amount }: { amount: string }) => `floor(${amount})`),
  upTo: vi.fn(({ amount }: { amount: string }) => `ceiling(${amount})`),
}));
vi.mock('@cavuno/board/format', () => ({ formatSalaryRange: mocks.format }));
vi.mock('../paraglide/runtime', () => ({
  isLocale: (locale: string) => ['en', 'de'].includes(locale),
}));
vi.mock('../paraglide/messages', () => ({
  m: {
    jobSalary_unitPerYear: mocks.year,
    jobSalary_unitPerMonth: () => 'month fixture',
    jobSalary_unitPerWeek: () => 'week fixture',
    jobSalary_unitPerDay: () => 'day fixture',
    jobSalary_unitPerHour: mocks.hour,
    jobSalary_perTimeframe: mocks.join,
    jobSalary_boundFrom: mocks.from,
    jobSalary_boundUpTo: mocks.upTo,
  },
}));

import { formatJobSalary } from './salary-display';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.format.mockReturnValue({
    text: 'SDK amount fixture',
    timeframe: 'per_year',
    bound: null,
  });
});

describe('salary SDK-to-catalog integration', () => {
  it('forwards raw salary inputs and lets the catalog order amount and unit', () => {
    expect(formatJobSalary('de', 100, 200, 'per_year', 'EUR')).toBe(
      'year fixture :: SDK amount fixture',
    );
    expect(mocks.format).toHaveBeenCalledWith(
      'de',
      100,
      200,
      'per_year',
      'EUR',
    );
    expect(mocks.year).toHaveBeenCalledWith({}, { locale: 'de' });
    expect(mocks.join).toHaveBeenCalledWith(
      { amount: 'SDK amount fixture', unit: 'year fixture' },
      { locale: 'de' },
    );
  });

  it('uses the SDK timeframe to select the unit', () => {
    mocks.format.mockReturnValue({
      text: 'hour amount',
      timeframe: 'per_hour',
      bound: null,
    });
    expect(formatJobSalary('en', 40, 60, 'per_hour', 'USD')).toBe(
      'hour fixture :: hour amount',
    );
    expect(mocks.year).not.toHaveBeenCalled();
  });

  it('uses the ambient catalog for unsupported board languages', () => {
    formatJobSalary('unsupported', 100, 200, 'per_year', 'EUR');
    expect(mocks.year).toHaveBeenCalledWith({}, undefined);
  });

  it.each([
    ['from', 'floor(year fixture :: SDK amount fixture)'],
    ['upTo', 'ceiling(year fixture :: SDK amount fixture)'],
  ])('wraps the complete salary for the %s bound', (bound, expected) => {
    mocks.format.mockReturnValue({
      text: 'SDK amount fixture',
      timeframe: 'per_year',
      bound,
    });
    expect(formatJobSalary('en', 100, null, 'per_year', 'USD')).toBe(expected);
  });

  it('preserves an absent salary without inventing display content', () => {
    mocks.format.mockReturnValue(null);
    expect(formatJobSalary('en', 100, 200, 'per_year', null)).toBeNull();
    expect(mocks.join).not.toHaveBeenCalled();
  });
});
