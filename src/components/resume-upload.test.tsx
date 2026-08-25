// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Resume } from '@cavuno/board';

const mocks = {
  deleteResume: vi.fn(),
  uploadResume: vi.fn(),
  toastActionError: vi.fn(),
  toastActionReconciliationError: vi.fn(),
};

import { ResumeUpload } from './resume-upload';

async function renderWithRouter(node: React.ReactNode) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <>{node}</>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}

const resume = {
  object: 'resume',
  parseStatus: 'parsed',
  parseFailureReason: null,
  parsedAt: '2026-07-14T00:00:00.000Z',
  keepResumeOnFile: true,
  hasResumeOnFile: true,
  file: {
    url: 'https://example.test/resume.pdf',
    contentType: 'application/pdf',
    sizeBytes: 2048,
  },
} satisfies Resume;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const emptyResume = {
  ...resume,
  parseStatus: null,
  parsedAt: null,
  keepResumeOnFile: false,
  hasResumeOnFile: false,
  file: null,
} satisfies Resume;

describe('ResumeUpload', () => {
  it('hides the keep-on-file checkbox on first-run onboarding and still keeps the file', async () => {
    mocks.uploadResume.mockResolvedValue(undefined);
    await renderWithRouter(
      <ResumeUpload
        resume={emptyResume}
        showKeepOnFile={false}
        dependencies={mocks}
      />,
    );

    expect(
      screen.queryByRole('checkbox', { name: 'Keep my resume saved' }),
    ).toBeNull();

    const input = document.querySelector<HTMLInputElement>(
      '[data-test="resume-file-input"]',
    );
    if (!input) throw new Error('Expected the resume file input to render');
    const file = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mocks.uploadResume).toHaveBeenCalled();
    });
    const formData = mocks.uploadResume.mock.calls[0]?.[0]?.data;
    if (!(formData instanceof FormData)) {
      throw new Error('Expected the upload to submit FormData');
    }
    expect(formData.get('keepResumeOnFile')).toBe('true');
  });

  it('fires a recoverable error toast and re-enables delete when deletion fails', async () => {
    mocks.deleteResume.mockRejectedValue(new Error('network unavailable'));
    await renderWithRouter(
      <ResumeUpload resume={resume} dependencies={mocks} />,
    );

    expect(document.querySelector('[data-slot="attachment"]')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mocks.toastActionError).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
    });
  });
});
