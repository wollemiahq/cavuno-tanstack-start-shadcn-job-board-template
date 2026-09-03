// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  PostJobPageView,
  postRouteDependencies,
  type PostRouteDependencies,
} from './-post-route-support';
import { Route } from './post';

import type { SubmitJobInput } from '../server/post';

const submission: SubmitJobInput = {
  companyName: 'Acme',
  contactName: 'Ada Lovelace',
  contactEmail: 'ada@example.com',
  title: 'Designer',
  description: '<p>Design thoughtful products.</p>',
  employmentType: 'full_time',
  remoteOption: 'remote',
  officeLocations: [],
  applicationUrl: 'https://example.com/apply',
};

const submitJobPosting = vi.fn<PostRouteDependencies['submitJobPosting']>();
const dependencies: PostRouteDependencies = {
  ...postRouteDependencies,
  submitJobPosting,
  renderForm: ({ plans, initialPlanId, onSubmit }) => (
    <div
      data-testid="post-job-form"
      data-plan={plans[0]?.id}
      data-initial-plan={initialPlanId}
    >
      <button type="button" onClick={() => onSubmit(submission)}>
        Submit through route
      </button>
    </div>
  ),
};

const plans: ReturnType<typeof Route.useLoaderData>['plans'] = {
  object: 'list',
  url: '/v1/job-posting/plans',
  data: [
    {
      object: 'job_posting_plan',
      id: 'plan-standard',
      name: 'Standard listing',
      description: null,
      kind: 'one_time',
      billingInterval: null,
      purpose: 'job_posting',
      isRecommended: false,
      displayOrder: 1,
      invoiceOnly: false,
      publishTiming: null,
      netTermsDays: null,
      prices: [{ currency: 'AUD', amountCents: 14900, isActive: true }],
      features: [],
    },
  ],
  hasMore: false,
  nextCursor: null,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPost(initialPlanId?: string) {
  render(
    <PostJobPageView
      plans={plans}
      remotePermits={null}
      initialPlanId={initialPlanId}
      customFields={[]}
      locale="en"
      officeLocationSuggestions={{
        suggestions: [],
        loading: false,
        onQueryChange: vi.fn(),
      }}
      dependencies={dependencies}
    />,
  );
}

describe('/post route composition', () => {
  it('keeps API calls in the route and passes loaded plans to the owned form', async () => {
    submitJobPosting.mockResolvedValue({
      ok: true,
      result: {
        object: 'job_posting_result',
        status: 'published',
        jobId: 'job-1',
        jobSlug: 'designer',
      },
    });
    renderPost();

    expect(screen.getByTestId('post-job-form')).toHaveAttribute(
      'data-plan',
      'plan-standard',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Submit through route' }),
    );

    await waitFor(() =>
      expect(submitJobPosting).toHaveBeenCalledWith({
        data: submission,
      }),
    );
  });

  it('validates and forwards plan continuity from the URL', () => {
    const validate = Route.options.validateSearch;
    if (!validate) {
      throw new Error('/post must validate the selected plan search parameter');
    }
    if ('parse' in validate) {
      expect(validate.parse({ plan: 'plan-standard' })).toEqual({
        plan: 'plan-standard',
      });
    } else if ('~standard' in validate) {
      throw new Error('/post uses an unexpected async search schema');
    } else {
      expect(validate({ plan: 'plan-standard' })).toEqual({
        plan: 'plan-standard',
      });
    }

    renderPost('plan-standard');

    expect(screen.getByTestId('post-job-form')).toHaveAttribute(
      'data-initial-plan',
      'plan-standard',
    );
  });
});

describe('/post membership gate', () => {
  it('renders the gate instead of the posting form on a members-only board', () => {
    render(
      <PostJobPageView
        plans={plans}
        remotePermits={null}
        customFields={[]}
        locale="en"
        officeLocationSuggestions={{
          suggestions: [],
          loading: false,
          onQueryChange: vi.fn(),
        }}
        gate={<div data-testid="membership-gate">Members only</div>}
        dependencies={dependencies}
      />,
    );

    expect(screen.getByTestId('membership-gate')).toBeVisible();
    // A visitor who cannot post must not be walked through the wizard.
    expect(screen.queryByTestId('post-job-form')).toBeNull();
  });
});
