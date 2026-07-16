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

const mocks = vi.hoisted(() => ({
  fetchLogoByDomain: vi.fn(),
  getPostPlans: vi.fn(),
  submitJobPosting: vi.fn(),
  uploadLogo: vi.fn(),
}));

vi.mock('../server/post', () => mocks);

// post.tsx pulls the location-suggestion controller, whose server fn module
// resolves cloudflare:workers — stub the seam for the jsdom suite.
vi.mock('../server/queries', () => ({ searchPlaces: vi.fn() }));

vi.mock('@/components/post-job-form', () => ({
  PostJobForm: ({
    plans,
    initialPlanId,
    onSubmit,
  }: {
    plans: Array<{ id: string }>;
    initialPlanId?: string;
    onSubmit: (input: { title: string }) => Promise<unknown>;
  }) => (
    <div
      data-testid="post-job-form"
      data-plan={plans[0]?.id}
      data-initial-plan={initialPlanId}
    >
      <button
        type="button"
        onClick={() => void onSubmit({ title: 'Designer' })}
      >
        Submit through route
      </button>
    </div>
  ),
}));

import { Route } from './post';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('/post route composition', () => {
  it('keeps API calls in the route and passes loaded plans to the owned form', async () => {
    vi.spyOn(Route, 'useLoaderData').mockReturnValue({
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
    } as never);
    vi.spyOn(Route, 'useSearch').mockReturnValue({ plan: undefined });
    mocks.submitJobPosting.mockResolvedValue({
      ok: true,
      result: {
        object: 'job_posting_result',
        status: 'published',
        jobId: 'job-1',
        jobSlug: 'designer',
      },
    });
    const PostPage = Route.options.component;
    if (!PostPage) throw new Error('/post must define a page component');

    render(<PostPage />);

    expect(screen.getByTestId('post-job-form')).toHaveAttribute(
      'data-plan',
      'plan-standard',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Submit through route' }),
    );

    await waitFor(() =>
      expect(mocks.submitJobPosting).toHaveBeenCalledWith({
        data: { title: 'Designer' },
      }),
    );
  });

  it('validates and forwards plan continuity from the URL', () => {
    const validate = Route.options.validateSearch;
    if (typeof validate !== 'function') {
      throw new Error('/post must validate the selected plan search parameter');
    }
    expect(validate({ plan: 'plan-standard' })).toEqual({
      plan: 'plan-standard',
    });

    vi.spyOn(Route, 'useLoaderData').mockReturnValue({
      data: [{ id: 'plan-standard' }],
    } as never);
    vi.spyOn(Route, 'useSearch').mockReturnValue({ plan: 'plan-standard' });
    const PostPage = Route.options.component;
    if (!PostPage) throw new Error('/post must define a page component');

    render(<PostPage />);

    expect(screen.getByTestId('post-job-form')).toHaveAttribute(
      'data-initial-plan',
      'plan-standard',
    );
  });
});
