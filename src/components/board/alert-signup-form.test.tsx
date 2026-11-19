// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AlertSignupForm } from './alert-signup-form';

import { BoardConversionAnalyticsProvider } from '@/components/board-conversion-analytics';
import { alertsCopy } from '@/copy-groups/alerts';
import type { BoardDataLayerEvent } from '@/lib/board-datalayer-events';
import { m } from '@/paraglide/messages';

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

  it('offers a likely correction on blur, and one tap takes it', async () => {
    render(
      <AlertSignupForm
        language="en"
        onSubscribe={vi.fn().mockResolvedValue({ status: 'submitted' })}
      />,
    );

    const input = screen.getByRole('textbox', { name: copy.emailAriaLabel });
    fireEvent.change(input, { target: { value: 'person@gmial.com' } });
    fireEvent.blur(input);
    expect(await screen.findByRole('status')).toHaveTextContent(
      m.product_emailSuggestionText({ email: 'person@gmail.com' }),
    );
    // Editing the address hides a hint about the old one.
    fireEvent.change(input, { target: { value: 'person@example.com' } });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.blur(input);

    fireEvent.change(input, { target: { value: 'person@gmial.com' } });
    fireEvent.blur(input);
    fireEvent.click(
      await screen.findByRole('button', { name: 'person@gmail.com' }),
    );

    expect(input).toHaveValue('person@gmail.com');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('drops a check that finishes after the address was edited', async () => {
    render(
      <AlertSignupForm
        language="en"
        onSubscribe={vi.fn().mockResolvedValue({ status: 'submitted' })}
      />,
    );

    const input = screen.getByRole('textbox', { name: copy.emailAriaLabel });
    fireEvent.change(input, { target: { value: 'person@gmial.com' } });
    fireEvent.blur(input);
    // Edited before the checker has loaded.
    fireEvent.change(input, { target: { value: 'person@example.com' } });
    await import('@cavuno/board/email');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps the hint inert while a subscribe is pending', async () => {
    const onSubscribe = vi.fn(
      () => new Promise<{ status: 'submitted' }>(() => {}),
    );
    render(<AlertSignupForm language="en" onSubscribe={onSubscribe} />);

    const input = screen.getByRole('textbox', { name: copy.emailAriaLabel });
    fireEvent.change(input, { target: { value: 'person@gmial.com' } });
    fireEvent.blur(input);
    const hint = await screen.findByRole('button', {
      name: 'person@gmail.com',
    });
    fireEvent.click(screen.getByRole('button', { name: copy.submitAriaLabel }));
    fireEvent.click(hint);

    expect(input).toHaveValue('person@gmial.com');
    expect(
      screen.getByRole('button', { name: copy.submitAriaLabel }),
    ).toBeDisabled();
    expect(onSubscribe).toHaveBeenCalledTimes(1);
  });

  it('says in one line why an undeliverable address was refused, with the API correction', async () => {
    const pushes = captureDataLayer();
    const onSubscribe = vi
      .fn()
      .mockResolvedValueOnce({ status: 'email_domain_undeliverable' })
      .mockResolvedValueOnce({
        status: 'email_domain_undeliverable',
        suggestion: 'person@outlook.com',
      });
    render(
      <BoardConversionAnalyticsProvider boardSlug="acme" analytics={analytics}>
        <AlertSignupForm language="en" onSubscribe={onSubscribe} />
      </BoardConversionAnalyticsProvider>,
    );

    const input = screen.getByRole('textbox', { name: copy.emailAriaLabel });
    // A domain the blur check leaves alone, so a correction can only be the
    // API's.
    fireEvent.change(input, { target: { value: 'person@outlook.zz' } });
    fireEvent.click(screen.getByRole('button', { name: copy.submitAriaLabel }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      m.boardError_emailDomainUndeliverableText(),
    );

    fireEvent.click(screen.getByRole('button', { name: copy.submitAriaLabel }));
    await screen.findByRole('button', { name: 'person@outlook.com' });
    // One message under the field: the refusal and its correction together.
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent(
      m.boardError_emailDomainUndeliverableSuggestionText({
        email: 'person@outlook.com',
      }),
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(pushes).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'person@outlook.com' }));
    expect(input).toHaveValue('person@outlook.com');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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
