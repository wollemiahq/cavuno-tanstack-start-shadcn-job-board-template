// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BoardConversionAnalyticsProvider } from '@/components/board-conversion-analytics';
import type { BoardDataLayerEvent } from '@/lib/board-datalayer-events';

import { AlertSignupForm } from './alert-signup-form';

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
  it('keeps the exact subscription payload visible as pending with an owned spinner', () => {
    const onSubscribe = vi.fn(
      () => new Promise<{ status: 'submitted' }>(() => {}),
    );
    const { container } = render(
      <AlertSignupForm
        language="en"
        filters={{ jobFunctions: ['Design'] }}
        context={{ source: 'jobs_list' }}
        onSubscribe={onSubscribe}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'email' }), {
      target: { value: 'designer@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'get job alerts' }));

    expect(onSubscribe).toHaveBeenCalledWith({
      email: 'designer@example.com',
      consent: true,
      frequency: 'weekly',
      filters: { jobFunctions: ['Design'] },
      context: { source: 'jobs_list' },
    });
    expect(
      screen.getByRole('button', { name: 'get job alerts' }),
    ).toBeDisabled();
    expect(
      container.querySelector("[data-slot='spinner']"),
    ).toBeInTheDocument();
    expect(screen.getByText('Subscribing…')).toBeVisible();
  });

  it('shows one uniform confirmation and clears the email after submission', async () => {
    render(
      <AlertSignupForm
        language="en"
        onSubscribe={vi.fn().mockResolvedValue({ status: 'submitted' })}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'email' });
    fireEvent.change(input, { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'get job alerts' }));

    expect(
      await screen.findByText(
        "If this email isn't already subscribed, we've sent a confirmation link — check your inbox.",
      ),
    ).toHaveAttribute('role', 'status');
    expect(input).toHaveValue('');
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.queryByText(/created|duplicate/i)).not.toBeInTheDocument();
  });

  it('announces a rejected subscription through the owned field error without clearing the email', async () => {
    render(
      <AlertSignupForm
        language="en"
        onSubscribe={vi.fn().mockRejectedValue(new Error('Unavailable'))}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'email' });
    fireEvent.change(input, { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'get job alerts' }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveAttribute('data-slot', 'field-error');
    expect(error).toHaveTextContent('Something went wrong. Please try again.');
    expect(input).toHaveValue('person@example.com');
  });

  it('fires job_alert_subscribe after a successful subscribe', async () => {
    const pushes = captureDataLayer();
    render(
      <BoardConversionAnalyticsProvider boardSlug="acme" analytics={analytics}>
        <AlertSignupForm
          language="en"
          context={{ source: 'job_detail', jobId: 'job-1', jobSlug: 'designer' }}
          onSubscribe={vi.fn().mockResolvedValue({ status: 'submitted' })}
        />
      </BoardConversionAnalyticsProvider>,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'email' }), {
      target: { value: 'person@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'get job alerts' }));

    expect(
      await screen.findByText(
        "If this email isn't already subscribed, we've sent a confirmation link — check your inbox.",
      ),
    ).toBeVisible();
    expect(pushes).toContainEqual({
      event: 'job_alert_subscribe',
      board_slug: 'acme',
      source: 'job_detail',
      job_id: 'job-1',
      job_slug: 'designer',
    });
  });
});
