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

import type { Resume } from '@cavuno/board';

const mocks = vi.hoisted(() => ({
  deleteResume: vi.fn(),
  invalidate: vi.fn(),
  uploadResume: vi.fn(),
  toastActionError: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@tanstack/react-router')>();
  return { ...actual, useRouter: () => ({ invalidate: mocks.invalidate }) };
});

vi.mock('../server/account', () => ({
  deleteResume: mocks.deleteResume,
  uploadResume: mocks.uploadResume,
}));

vi.mock('@/lib/action-toast', () => ({
  toastActionError: mocks.toastActionError,
  toastActionSuccess: vi.fn(),
}));

import { ResumeUpload } from './resume-upload';

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
    render(<ResumeUpload resume={resume} />);

    expect(document.querySelector('[data-slot="attachment"]')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mocks.toastActionError).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
    });
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
});
