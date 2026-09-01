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
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  const invalidate = vi
    .spyOn(router, 'invalidate')
    .mockImplementation(async () => {});
  await router.load();
  return Object.assign(render(<RouterProvider router={router} />), {
    router,
    invalidate,
  });
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

    const attachment = document.querySelector(
      '[data-test="resume-attachment"]',
    );
    expect(attachment).toHaveAttribute('data-slot', 'attachment');
    expect(attachment).toHaveAttribute('data-state', 'idle');

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
    expect(
      screen.getByRole('button', { name: 'Replace resume' }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mocks.toastActionError).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
    });
  });

  describe('parse-status polling', () => {
    const parsingResume = {
      ...resume,
      parseStatus: 'parsing',
    } satisfies Resume;

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('invalidates the router every 4s while parsing', async () => {
      const { invalidate } = await renderWithRouter(
        <ResumeUpload resume={parsingResume} dependencies={mocks} />,
      );

      expect(invalidate).not.toHaveBeenCalled();
      await act(() => vi.advanceTimersByTimeAsync(4_000));
      expect(invalidate).toHaveBeenCalledTimes(1);
      await act(() => vi.advanceTimersByTimeAsync(4_000));
      expect(invalidate).toHaveBeenCalledTimes(2);
    });

    it('does not poll when the resume is already parsed', async () => {
      const { invalidate } = await renderWithRouter(
        <ResumeUpload resume={resume} dependencies={mocks} />,
      );

      await act(() => vi.advanceTimersByTimeAsync(8_000));
      expect(invalidate).not.toHaveBeenCalled();
    });

    it('stops polling after 3 minutes and asks for a manual refresh', async () => {
      const { invalidate, getByRole } = await renderWithRouter(
        <ResumeUpload resume={parsingResume} dependencies={mocks} />,
      );

      await act(() => vi.advanceTimersByTimeAsync(3 * 60 * 1_000));
      const calls = invalidate.mock.calls.length;
      expect(calls).toBeGreaterThan(0);
      expect(getByRole('status').textContent).toContain('Still parsing');

      await act(() => vi.advanceTimersByTimeAsync(8_000));
      expect(invalidate).toHaveBeenCalledTimes(calls);
    });

    it('clears the timer on unmount', async () => {
      const { invalidate, unmount } = await renderWithRouter(
        <ResumeUpload resume={parsingResume} dependencies={mocks} />,
      );

      unmount();
      await act(() => vi.advanceTimersByTimeAsync(8_000));
      expect(invalidate).not.toHaveBeenCalled();
    });
  });
});
