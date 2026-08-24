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

describe('ResumeUpload', () => {
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
