import { describe, expect, it } from 'vitest';

import { toAlertSignupVM } from './alert-signup-view-model';

/**
 * The alert-signup mapper is Layer 1b — it owns the copy resolution for
 * the subscribe form, including the per-status result messages. These pin
 * that the pure-markup form has every label + message it renders, and that
 * the three API-status messages are distinct (a returning subscriber must
 * see "already subscribed", not the success text).
 */
describe('toAlertSignupVM', () => {
  const vm = toAlertSignupVM('en');

  it('resolves every label the markup renders', () => {
    for (const value of [
      vm.sectionAriaLabel,
      vm.defaultTitle,
      vm.emailAriaLabel,
      vm.emailPlaceholder,
      vm.submitAriaLabel,
      vm.subscribingLabel,
      vm.buttonText,
    ]) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('maps each API status to a distinct, non-empty message', () => {
    const { created, duplicate, error } = vm.messages;
    for (const m of [created, duplicate, error]) {
      expect(m.length).toBeGreaterThan(0);
    }
    // The three outcomes must read differently — a duplicate is not a
    // success, and an error is neither.
    expect(new Set([created, duplicate, error]).size).toBe(3);
  });
});
