// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AlertSignupForm } from './alert-signup-form';

import { BoardConversionAnalyticsProvider } from '@/components/board-conversion-analytics';
import { alertsCopy } from '@/copy-groups/alerts';
import type { BoardDataLayerEvent } from '@/lib/board-datalayer-events';

const copy = alertsCopy();

const analytics = {
  ga4MeasurementId: null,
  gtmId: 'GTM-TEST',
  metaPixelId: null,
  linkedInPartnerId: null,
  linkedInConversionSignUpId: null,
  linkedInConversionLoginId: null,
  linkedInConversionApplyClickId: null,
  linkedInConversionApplySubmitId: null,
  linkedInConversionJobAlertSubscribeId: null,
};

function captureDataLayer(): BoardDataLayerEvent[] {
  const pushes: BoardDataLayerEvent[] = [];
  Object.defineProperty(window, 'dataLayer', {
    configurable: true,
    writable: true,
    value: pushes,
  });
  return pushes;
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'dataLayer');
});

describe('AlertSignupForm submission', () => {
  it('submits the expected SDK payload and disables resubmission while pending', () => {
    const onSubscribe = vi.fn(
      () => new Promise<{ status: 'submitted' }>(() => {}),
    );
    render(
      <AlertSignupForm
        language="en"
        filters={{ jobFunctions: ['Design'] }}
        context={{ source: 'jobs_list' }}
        onSubscribe={onSubscribe}
      />,
    );

    fireEvent.change(
      screen.getByRole('textbox', { name: copy.emailAriaLabel }),
      {
        target: { value: 'designer@example.com' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: copy.submitAriaLabel }));

    expect(onSubscribe).toHaveBeenCalledWith({
      email: 'designer@example.com',
      consent: true,
      frequency: 'weekly',
      filters: { jobFunctions: ['Design'] },
      context: { source: 'jobs_list' },
    });
    expect(
      screen.getByRole('button', { name: copy.submitAriaLabel }),
    ).toBeDisabled();
    expect(
      screen.getByRole('textbox', { name: copy.emailAriaLabel }),
    ).toBeDisabled();
  });

  it('shows one uniform confirmation and clears the email after submission', async () => {
    render(
      <AlertSignupForm
        language="en"
        onSubscribe={vi.fn().mockResolvedValue({ status: 'submitted' })}
      />,
    );

    const input = screen.getByRole('textbox', { name: copy.emailAriaLabel });
    fireEvent.change(input, { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: copy.submitAriaLabel }));

    expect(await screen.findByText(copy.jobAlertSuccessToast)).toHaveAttribute(
      'role',
      'status',
    );
    expect(input).toHaveValue('');
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('announces a rejected subscription without clearing the email', async () => {
    render(
      <AlertSignupForm
        language="en"
        onSubscribe={vi.fn().mockRejectedValue(new Error('Unavailable'))}
      />,
    );

    const input = screen.getByRole('textbox', { name: copy.emailAriaLabel });
    fireEvent.change(input, { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: copy.submitAriaLabel }));

    const error = await screen.findByRole('alert');
    expect(error).toBeVisible();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveValue('person@example.com');
  });

  it('fires job_alert_subscribe after a successful subscribe', async () => {
    const pushes = captureDataLayer();
    render(
      <BoardConversionAnalyticsProvider boardSlug="acme" analytics={analytics}>
        <AlertSignupForm
          language="en"
          context={{
            source: 'job_detail',
            jobId: 'job-1',
            jobSlug: 'designer',
          }}
          onSubscribe={vi.fn().mockResolvedValue({ status: 'submitted' })}
        />
      </BoardConversionAnalyticsProvider>,
    );

    fireEvent.change(
      screen.getByRole('textbox', { name: copy.emailAriaLabel }),
      {
        target: { value: 'person@example.com' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: copy.submitAriaLabel }));

    expect(await screen.findByText(copy.jobAlertSuccessToast)).toHaveAttribute(
      'role',
      'status',
    );
    expect(pushes).toContainEqual({
      event: 'job_alert_subscribe',
      board_slug: 'acme',
      source: 'job_detail',
      job_id: 'job-1',
      job_slug: 'designer',
    });
  });
});
