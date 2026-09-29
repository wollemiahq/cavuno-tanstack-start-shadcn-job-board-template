import { describe, expect, it } from 'vitest';

import { toAlertSignupVM } from './alert-signup-view-model';

import { alertsCopy } from '@/copy-groups/alerts';

/**
 * The alert-signup mapper is Layer 1b — it owns the copy resolution for
 * the subscribe form, including the uniform submitted result message. These
 * pin that the pure-markup form has every label + message it renders without
 * exposing whether an address was already subscribed.
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
      expect(value).toBeTypeOf('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('maps submitted and error outcomes to distinct, non-empty messages', () => {
    const { submitted, error } = vm.messages;
    for (const m of [submitted, error]) {
      expect(m.length).toBeGreaterThan(0);
    }
    expect(submitted).toBe(alertsCopy().jobAlertSuccessToast);
    expect(submitted).not.toBe(error);
  });
});
