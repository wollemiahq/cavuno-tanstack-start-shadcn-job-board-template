// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShareButton } from './share-button';

import { copyLinkCopy } from '@/copy-groups/copy-link';
import { m } from '@/paraglide/messages';

const copy = copyLinkCopy();
const url = 'https://board.example/products/resume-pack';

function stubShare(share: Navigator['share']) {
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: share,
  });
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'clipboard');
});

function clipboard() {
  const writeText = vi
    .fn<(value: string) => Promise<void>>()
    .mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

function clickShare() {
  fireEvent.click(
    screen.getByRole('button', { name: m.product_shareAction() }),
  );
}

describe('ShareButton', () => {
  it('opens the share sheet where the browser has one, and copies nothing', async () => {
    const share = vi.fn<Navigator['share']>().mockResolvedValue(undefined);
    stubShare(share);
    const writeText = clipboard();
    render(<ShareButton url={url} title="Resume pack" />);

    clickShare();

    await vi.waitFor(() =>
      expect(share).toHaveBeenCalledWith({ url, title: 'Resume pack' }),
    );
    expect(writeText).not.toHaveBeenCalled();
  });

  it('takes a closed share sheet as an answer, not a reason to copy', async () => {
    const share = vi
      .fn<Navigator['share']>()
      .mockRejectedValue(new DOMException('closed', 'AbortError'));
    stubShare(share);
    const writeText = clipboard();
    render(<ShareButton url={url} title="Resume pack" />);

    clickShare();

    await vi.waitFor(() => expect(share).toHaveBeenCalled());
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the link and says so where there is no share sheet', async () => {
    const writeText = clipboard();
    render(<ShareButton url={url} title="Resume pack" />);

    clickShare();

    expect(writeText).toHaveBeenCalledWith(url);
    expect(
      await screen.findByRole('button', { name: copy.copiedLabel }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(copy.copiedLabel);
  });

  it('copies instead when the share sheet is refused', async () => {
    stubShare(
      vi
        .fn<Navigator['share']>()
        .mockRejectedValue(new DOMException('', 'NotAllowedError')),
    );
    const writeText = clipboard();
    render(<ShareButton url={url} title="Resume pack" />);

    clickShare();

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(url));
  });

  it('claims nothing when the clipboard is out of reach', async () => {
    render(<ShareButton url={url} title="Resume pack" />);

    clickShare();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      screen.getByRole('button', { name: m.product_shareAction() }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
