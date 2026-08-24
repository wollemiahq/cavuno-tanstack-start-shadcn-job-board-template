import { describe, expect, it } from 'vitest';

import {
  parseResumeOnboardingDismissal,
  serializeResumeOnboardingDismissal,
} from './resume-onboarding';

describe('resume onboarding completion cookies', () => {
  it('keeps completion for candidate A after candidate B also skips', () => {
    const candidateA = serializeResumeOnboardingDismissal('candidate-a').split(
      ';',
      1,
    )[0];
    const candidateB = serializeResumeOnboardingDismissal('candidate-b').split(
      ';',
      1,
    )[0];

    expect(
      parseResumeOnboardingDismissal(`${candidateA}; ${candidateB}`),
    ).toEqual(['candidate-a', 'candidate-b']);
  });
});
