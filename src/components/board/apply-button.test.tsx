// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApplyButton } from './apply-button'

/**
 * Apply-click analytics (P2, hosted parity): the click that constitutes
 * an APPLY emits `job_apply_click`; the press that only hits the
 * registration wall does not ("forcing sign-up isn't an apply" — hosted
 * native-job-apply-button comment), and an already-applied job never
 * re-emits.
 */
function stubTinybird() {
  const trackEvent = vi.fn()
  ;(window as unknown as Record<string, unknown>).Tinybird = { trackEvent }
  return trackEvent
}

afterEach(() => {
  cleanup()
  delete (window as unknown as Record<string, unknown>).Tinybird
})

const base = {
  jobId: 'j57abc',
  companySlug: 'acme',
  language: 'en',
  onApply: vi.fn(async () => {}),
}

describe('ApplyButton apply-click analytics', () => {
  it('external apply: the outbound click emits job_apply_click', () => {
    const trackEvent = stubTinybird()
    render(
      <ApplyButton
        {...base}
        jobSlug={null}
        applicationUrl="https://jobs.acme.com/123"
        viewer={null}
      />,
    )
    fireEvent.click(screen.getByRole('link'))
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith('job_apply_click', {
      job_id: 'j57abc',
      company_slug: 'acme',
    })
  })

  it('native apply: the press that performs the apply emits once', async () => {
    const trackEvent = stubTinybird()
    render(
      <ApplyButton
        {...base}
        jobSlug="senior-eng"
        applicationUrl={null}
        viewer={{ emailVerified: true }}
      />,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(trackEvent).toHaveBeenCalledExactlyOnceWith('job_apply_click', {
      job_id: 'j57abc',
      company_slug: 'acme',
    })
  })

  it('the registration-wall press is NOT an apply — no event', () => {
    const trackEvent = stubTinybird()
    render(
      <ApplyButton
        {...base}
        jobSlug="senior-eng"
        applicationUrl={null}
        viewer={null}
      />,
    )
    fireEvent.click(screen.getByRole('link')) // sign-in link
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('an already-applied job never re-emits', () => {
    const trackEvent = stubTinybird()
    render(
      <ApplyButton
        {...base}
        jobSlug="senior-eng"
        applicationUrl={null}
        viewer={{ emailVerified: true }}
        alreadyApplied
      />,
    )
    fireEvent.click(screen.getByRole('link')) // "view applications" link
    expect(trackEvent).not.toHaveBeenCalled()
  })
})
