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

import type { RichTextEditorProps } from './rich-text-editor';
import { m } from '@/paraglide/messages';
import type { JobPostingPlan } from '@cavuno/board';

function DescriptionEditor({
  value,
  onChange,
  ariaLabel,
}: RichTextEditorProps) {
  return (
    <textarea
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(`<p>${event.target.value}</p>`)}
    />
  );
}

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
        DescriptionEditor={DescriptionEditor}
        customFields={[]}
        remotePermits={null}
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

    fireEvent.change(screen.getByLabelText(m.postJob_companyNameLabel()), {
      target: { value: 'Acme Studio' },
    });
    fireEvent.change(screen.getByLabelText(m.postJob_companyWebsiteLabel()), {
      target: { value: 'acme.example' },
    });
    fireEvent.change(screen.getByLabelText(m.postJob_contactNameLabel()), {
      target: { value: 'Ada Lovelace' },
    });
    fireEvent.change(screen.getByLabelText(m.postJob_contactEmailLabel()), {
      target: { value: 'ada@acme.example' },
    });
    fireEvent.change(screen.getByLabelText(m.postJob_jobTitleLabel()), {
      target: { value: 'Staff Product Designer' },
    });
    fireEvent.change(screen.getByLabelText(m.postJob_descriptionLabel()), {
      target: { value: 'Lead product design across the company.' },
    });
    fireEvent.change(screen.getByLabelText(m.postJob_applicationUrlLabel()), {
      target: { value: 'acme.example/careers/staff-designer' },
    });
    // Hybrid (the default) requires somewhere to be on-site at — commit a
    // free-text office location through the place picker.
    const officeLocations = screen.getByLabelText(
      m.postJob_officeLocationsLabel(),
    );
    fireEvent.change(officeLocations, { target: { value: 'Berlin' } });
    fireEvent.keyDown(officeLocations, { key: 'Enter' });
    fireEvent.change(screen.getByLabelText(m.postJob_salaryMinLabel()), {
      target: { value: '140000' },
    });
    fireEvent.change(screen.getByLabelText(m.postJob_salaryMaxLabel()), {
      target: { value: '180000' },
    });

    // Select the submit control structurally — its label now tracks the chosen
    // plan (free → publish, paid → checkout), so pinning the copy would be brittle.
    const submitButton = screen
      .getAllByRole('button')
      .find((button) => button.getAttribute('type') === 'submit');
    if (!submitButton) throw new Error('The post form needs a submit button');
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        companyName: 'Acme Studio',
        companyWebsite: 'https://acme.example',
        contactName: 'Ada Lovelace',
        contactEmail: 'ada@acme.example',
        title: 'Staff Product Designer',
        description: '<p>Lead product design across the company.</p>',
        employmentType: 'full_time',
        remoteOption: 'hybrid',
        officeLocations: [{ displayName: 'Berlin' }],
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
      screen.getByRole('heading', {
        level: 2,
        name: m.postJob_publishedTitle(),
      }),
    ).toBeInTheDocument();
  });

  it('explains when posting is unavailable instead of rendering an unusable form', () => {
    render(
      <PostJobForm
        DescriptionEditor={DescriptionEditor}
        customFields={[]}
        remotePermits={null}
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

    expect(screen.getByText(m.postJob_noPlansTitle())).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: m.postJob_submitButtonLabel() }),
    ).not.toBeInTheDocument();
  });

  it('uses the owned Field and InputGroup anatomy for every labelled control', () => {
    const { container } = render(
      <PostJobForm
        DescriptionEditor={DescriptionEditor}
        customFields={[]}
        remotePermits={null}
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
      screen
        .getByLabelText(m.postJob_companyNameLabel())
        .closest('[data-slot="field"]'),
    ).not.toBeNull();
    expect(
      screen
        .getByLabelText(m.postJob_companyWebsiteLabel())
        .closest('[data-slot="input-group"]'),
    ).not.toBeNull();
    expect(
      container.querySelectorAll('[data-slot="field"]').length,
    ).toBeGreaterThan(8);
  });

  it('keeps a deep-linked posting plan selected when the form opens', () => {
    render(
      <PostJobForm
        DescriptionEditor={DescriptionEditor}
        customFields={[]}
        remotePermits={null}
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
        DescriptionEditor={DescriptionEditor}
        customFields={[]}
        remotePermits={null}
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
    const dropzone = screen.getByTestId('company-logo-dropzone');
    expect(dropzone).toHaveAttribute('data-slot', 'attachment');
    expect(dropzone).toHaveAttribute('data-state', 'idle');

    fireEvent.drop(dropzone, {
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
    let resolveUpload!: (value: {
      ok: false;
      code: string;
      message: string;
    }) => void;
    const onLogoUpload = vi.fn(
      () =>
        new Promise<{ ok: false; code: string; message: string }>((resolve) => {
          resolveUpload = resolve;
        }),
    );
    const { container } = render(
      <PostJobForm
        DescriptionEditor={DescriptionEditor}
        customFields={[]}
        remotePermits={null}
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

    const dropzone = screen.getByTestId('company-logo-dropzone');
    expect(dropzone).toHaveAttribute('data-slot', 'attachment');
    expect(dropzone).toHaveAttribute('data-state', 'uploading');
    expect(container.querySelector('[data-slot="spinner"]')).toBeVisible();

    await act(async () =>
      resolveUpload({
        ok: false,
        code: 'unknown',
        message: 'Logo upload failed',
      }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('data-slot', 'field-error');
    // Unknown code resolves to the generic viewer-locale line, never
    // the wire sentence.
    expect(alert).toHaveTextContent('Something went wrong. Please try again.');
  });

  it('never presents an inactive paid plan as free', () => {
    render(
      <PostJobForm
        DescriptionEditor={DescriptionEditor}
        customFields={[]}
        remotePermits={null}
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

    // Delegation-style: the expectation runs the SAME Intl formatting the
    // component uses, instead of pinning its locale-dependent output.
    const expectedPrice = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(199);
    expect(screen.getByText(expectedPrice)).toBeVisible();
    expect(screen.queryByText(m.postJob_freeLabel())).toBeNull();
  });

  it('hides salary, seniority, and office location when the job form says so', () => {
    render(
      <PostJobForm
        DescriptionEditor={DescriptionEditor}
        customFields={[]}
        jobForm={{
          salary: { visible: false },
          seniority: { visible: false },
          location: { visible: false },
          sponsorship: { visible: true },
        }}
        remotePermits={null}
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

    expect(screen.queryByLabelText(m.postJob_salaryMinLabel())).toBeNull();
    expect(screen.queryByLabelText(m.postJob_seniorityLabel())).toBeNull();
    expect(
      screen.queryByLabelText(m.postJob_officeLocationsLabel()),
    ).toBeNull();
  });
});
