import { describe, expect, it } from 'vitest';

import { isWorkingPreviewHostname } from './analytics-preview';

describe('isWorkingPreviewHostname', () => {
  it.each([
    '5173-workspace-token.preview.cavuno.com',
    '5173-workspace-token.preview-dev.cavuno.com',
  ])('recognizes the WORKING preview zone: %s', (hostname) => {
    expect(isWorkingPreviewHostname(hostname)).toBe(true);
  });

  it.each([
    'preview.cavuno.com',
    'preview-dev.cavuno.com',
    'preview-board.cavuno.app',
    'share-board.cavuno.app',
    'www.cavuno.com',
    '5173-workspace-token.preview.cavuno.com.evil.example',
  ])('does not suppress analytics on a non-WORKING host: %s', (hostname) => {
    expect(isWorkingPreviewHostname(hostname)).toBe(false);
  });
});
