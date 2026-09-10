// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://board.preview.cavuno.com"}
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { ensureAdSenseScript } from './adsense-script';
import { BoardAdPreviewProvider, useBoardAdPreview } from './board-ad-preview';
import { BoardAdSlot } from './board-ad-slot';

function Preview() {
  const { previewAds, setPreviewAds } = useBoardAdPreview();
  return (
    <>
      <button onClick={() => setPreviewAds(!previewAds)}>
        Toggle placements
      </button>
      <BoardAdSlot
        placement="test-sidebar"
        layout="rectangle"
        ads={{
          enabled: true,
          clientId: 'ca-pub-1234567890123456',
          defaultSlotId: '1234567890',
        }}
      />
    </>
  );
}
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
});
it('automatically shows a placement on hosted preview and hides it without serving ads', () => {
  const view = render(
    <BoardAdPreviewProvider enabled={false}>
      <Preview />
    </BoardAdPreviewProvider>,
  );
  expect(screen.getByRole('complementary')).toBeInTheDocument();
  expect(view.container.querySelector('ins')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Toggle placements' }));
  expect(screen.queryByRole('complementary')).toBeNull();
  expect(view.container.querySelector('ins')).toBeNull();
  ensureAdSenseScript('ca-pub-1234567890123456');
  expect(document.getElementById('cavuno-adsense-loader')).toBeNull();
});
it('respects an explicit hidden preference in hosted preview', () => {
  sessionStorage.setItem('cavuno:preview-ad-placements', 'false');
  render(
    <BoardAdPreviewProvider enabled>
      <Preview />
    </BoardAdPreviewProvider>,
  );
  expect(screen.queryByRole('complementary')).toBeNull();
});
it('shows placeholders when embedded browser storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  render(
    <BoardAdPreviewProvider enabled={false}>
      <Preview />
    </BoardAdPreviewProvider>,
  );
  expect(screen.getByRole('complementary')).toBeInTheDocument();
});
