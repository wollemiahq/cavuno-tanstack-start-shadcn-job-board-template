import { BOARD_API_ERROR_CODES } from '@cavuno/board';
import { describe, expect, it } from 'vitest';

import { boardErrorMessage, CODE_MESSAGES } from './board-error-message';

/** Codes this repo's own server fns invent (not on the wire contract). */
const APP_LOCAL_CODES = ['unauthorized', 'invalid_file', 'unknown'];

describe('board error code map', () => {
  it('every mapped key is a real SDK code or a declared app-local code', () => {
    const known = new Set<string>([
      ...BOARD_API_ERROR_CODES,
      ...APP_LOCAL_CODES,
    ]);
    const impostors = Object.keys(CODE_MESSAGES).filter((k) => !known.has(k));
    // Guessed code names compile fine and silently render the generic
    // line for every real failure — this pin makes that a red test.
    expect(impostors).toEqual([]);
  });

  it('resolves a real auth failure to its specific copy', () => {
    expect(boardErrorMessage({ code: 'board_auth_invalid_credentials' })).toBe(
      'Wrong email or password.',
    );
  });

  it('unknown codes get the generic line, never the wire message', () => {
    expect(boardErrorMessage({ code: 'space_weather', message: 'wire' })).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
