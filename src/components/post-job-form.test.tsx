// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PostJobForm } from './post-job-form';

import type { JobPostingPlan } from '@cavuno/board';

vi.mock('./rich-text-editor', () => ({
  RichTextEditor: ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(`<p>${event.target.value}</p>`)}
    />
  ),
}));

const plans: JobPostingPlan[] = [
  {
    object: 'job_posting_plan',
    id: 'plan-standard',
    name: 'Standard listing',
    description: 'Published for 30 days',
    kind: 'one_time',
    billingInterval: null,
    purpose: 'job_posting',
    isRecommended: true,
    displayOrder: 1,
    invoiceOnly: false,
    publishTiming: null,
    netTermsDays: null,
    prices: [{ currency: 'AUD', amountCents: 14900, isActive: true }],
    features: [],
  },
  {
    object: 'job_posting_plan',
    id: 'plan-premium',
    name: 'Premium listing',
    description: 'Featured for 30 days',
    kind: 'one_time',
    billingInterval: null,
    purpose: 'job_posting',
    isRecommended: false,
    displayOrder: 2,
    invoiceOnly: false,
    publishTiming: null,
    netTermsDays: null,
    prices: [{ currency: 'AUD', amountCents: 24900, isActive: true }],
    features: [],
  },
];

afterEach(cleanup);

describe('PostJobForm', () => {
  it('submits the complete public posting contract through the selected plan', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      ok: true,
      result: {
        object: 'job_posting_result',
        status: 'published',
        jobId: 'job-1',
        jobSlug: 'staff-product-designer',
      },
    });

    render(
      <PostJobForm
        locale="en"
        officeLocationSuggestions={{
          suggestions: [],
          loading: false,
          onQueryChange: vi.fn(),
        }}
        plans={plans}
        onSubmit={onSubmit}
        onLogoFetch={vi.fn()}
        onLogoUpload={vi.fn()}
        onCheckout={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Company name'), {
      target: { value: 'Acme Studio' },
    });
    fireEvent.change(screen.getByLabelText('Company website'), {
      target: { value: 'acme.example' },
    });
    fireEvent.change(screen.getByLabelText('Contact name'), {
      target: { value: 'Ada Lovelace' },
    });
    fireEvent.change(screen.getByLabelText('Contact email'), {
      target: { value: 'ada@acme.example' },
    });
    fireEvent.change(screen.getByLabelText('Job title'), {
      target: { value: 'Staff Product Designer' },
    });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Lead product design across the company.' },
    });
    fireEvent.change(screen.getByLabelText('Application URL'), {
      target: { value: 'acme.example/careers/staff-designer' },
    });
    fireEvent.change(screen.getByLabelText('Salary min'), {
      target: { value: '140000' },
    });
    fireEvent.change(screen.getByLabelText('Salary max'), {
      target: { value: '180000' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit job' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        companyName: 'Acme Studio',
        companyWebsite: 'https://acme.example',
        contactName: 'Ada Lovelace',
        contactEmail: 'ada@acme.example',
        title: 'Staff Product Designer',
        description: '<p>Lead product design across the company.</p>',
        employmentType: 'full_time',
        remoteOption: 'remote',
        officeLocations: [],
        applicationUrl: 'https://acme.example/careers/staff-designer',
        salaryMin: 140000,
        salaryMax: 180000,
        salaryCurrency: 'USD',
        salaryTimeframe: 'per_year',
        selectedPlan: 'plan-standard',
        logoUrl: undefined,
      }),
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Your job is live' }),
    ).toBeInTheDocument();
  });

  it('explains when posting is unavailable instead of rendering an unusable form', () => {
    render(
      <PostJobForm
        locale="en"
        officeLocationSuggestions={{
          suggestions: [],
          loading: false,
          onQueryChange: vi.fn(),
        }}
        plans={[]}
        onSubmit={vi.fn()}
        onLogoFetch={vi.fn()}
        onLogoUpload={vi.fn()}
        onCheckout={vi.fn()}
      />,
    );

    expect(
      screen.getByText('No job posting plans are available.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Submit job' }),
    ).not.toBeInTheDocument();
  });

  it('uses the owned Field and InputGroup anatomy for every labelled control', () => {
    const { container } = render(
      <PostJobForm
        locale="en"
        officeLocationSuggestions={{
          suggestions: [],
          loading: false,
          onQueryChange: vi.fn(),
        }}
        plans={plans}
        onSubmit={vi.fn()}
        onLogoFetch={vi.fn()}
        onLogoUpload={vi.fn()}
        onCheckout={vi.fn()}
      />,
    );

    expect(
      screen.getByLabelText('Company name').closest('[data-slot="field"]'),
    ).not.toBeNull();
    expect(
      screen
        .getByLabelText('Company website')
        .closest('[data-slot="input-group"]'),
    ).not.toBeNull();
    expect(
      container.querySelectorAll('[data-slot="field"]').length,
    ).toBeGreaterThan(8);
  });

  it('keeps a deep-linked posting plan selected when the form opens', () => {
    render(
      <PostJobForm
        locale="en"
        officeLocationSuggestions={{
          suggestions: [],
          loading: false,
          onQueryChange: vi.fn(),
        }}
        plans={plans}
        initialPlanId="plan-premium"
        onSubmit={vi.fn()}
        onLogoFetch={vi.fn()}
        onLogoUpload={vi.fn()}
        onCheckout={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('radio', { name: /Premium listing/ }),
    ).toBeChecked();
  });

  it('uploads a dropped logo through the same owned file flow', async () => {
    const onLogoUpload = vi.fn().mockResolvedValue({
      ok: true,
      publicUrl: 'https://cdn.example/acme.webp',
    });
    render(
      <PostJobForm
        locale="en"
        officeLocationSuggestions={{
          suggestions: [],
          loading: false,
          onQueryChange: vi.fn(),
        }}
        plans={plans}
        onSubmit={vi.fn()}
        onLogoFetch={vi.fn()}
        onLogoUpload={onLogoUpload}
        onCheckout={vi.fn()}
      />,
    );
    const file = new File(['logo'], 'acme.png', { type: 'image/png' });

    fireEvent.drop(screen.getByTestId('company-logo-dropzone'), {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => expect(onLogoUpload).toHaveBeenCalledTimes(1));
    const uploadedData = onLogoUpload.mock.calls[0]?.[0];
    expect(uploadedData).toBeInstanceOf(FormData);
    if (!(uploadedData instanceof FormData)) {
      throw new Error('Logo upload must receive FormData');
    }
    expect(uploadedData.get('file')).toBe(file);
  });

  it('uses owned shadcn loading and field feedback for the logo workflow', async () => {
    let resolveUpload!: (value: { ok: false; message: string }) => void;
    const onLogoUpload = vi.fn(
      () =>
        new Promise<{ ok: false; message: string }>((resolve) => {
          resolveUpload = resolve;
        }),
    );
    const { container } = render(
      <PostJobForm
        locale="en"
        officeLocationSuggestions={{
          suggestions: [],
          loading: false,
          onQueryChange: vi.fn(),
        }}
        plans={plans}
        onSubmit={vi.fn()}
        onLogoFetch={vi.fn()}
        onLogoUpload={onLogoUpload}
        onCheckout={vi.fn()}
      />,
    );
    const file = new File(['logo'], 'acme.png', { type: 'image/png' });

    fireEvent.drop(screen.getByTestId('company-logo-dropzone'), {
      dataTransfer: { files: [file] },
    });

    expect(container.querySelector('[data-slot="spinner"]')).toBeVisible();

    await act(async () =>
      resolveUpload({ ok: false, message: 'Logo upload failed' }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('data-slot', 'field-error');
    expect(alert).toHaveTextContent('Logo upload failed');
  });

  it('never presents an inactive paid plan as free', () => {
    render(
      <PostJobForm
        locale="en-AU"
        officeLocationSuggestions={{
          suggestions: [],
          loading: false,
          onQueryChange: vi.fn(),
        }}
        plans={[
          {
            ...plans[0]!,
            id: 'plan-inactive-price',
            kind: 'one_time',
            prices: [{ currency: 'AUD', amountCents: 19900, isActive: false }],
          },
        ]}
        onSubmit={vi.fn()}
        onLogoFetch={vi.fn()}
        onLogoUpload={vi.fn()}
        onCheckout={vi.fn()}
      />,
    );

    expect(screen.getByText('$199')).toBeVisible();
    expect(screen.queryByText('Free')).toBeNull();
  });
});
