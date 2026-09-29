import { describe, expect, it } from 'vitest';

import { subjectFromMessage, validateContactInput } from './contact';

const valid = {
  name: ' Ada Lovelace ',
  email: ' ada@example.com ',
  body: '  Hello\n  from the board  ',
  requestId: '123e4567-e89b-42d3-a456-426614174000',
};

describe('validateContactInput', () => {
  it('trims user-authored fields, derives the title, and preserves the retry id', () => {
    expect(validateContactInput(valid)).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      subject: 'Hello from the board',
      body: 'Hello\n  from the board',
      requestId: valid.requestId,
    });
  });

  it.each([
    ['name', { name: 'x'.repeat(151) }],
    ['email', { email: 'invalid' }],
    ['body', { body: 'x'.repeat(20_001) }],
    ['empty message', { body: ' \n  ' }],
    ['requestId', { requestId: 'not-a-uuid' }],
  ])('rejects an invalid %s', (_field, override) => {
    expect(() => validateContactInput({ ...valid, ...override })).toThrow();
  });

  it('creates a concise deterministic title from a long opening', () => {
    const message =
      'Please help me understand the application process for this role and what I should prepare before applying.';
    const title = subjectFromMessage(message);
    expect(title).toBe(
      'Please help me understand the application process for this role and what I…',
    );
    expect(title.length).toBeLessThanOrEqual(80);
    expect(subjectFromMessage(message)).toBe(title);
  });

  it('uses a complete opening question when the rest of the message is long', () => {
    expect(
      subjectFromMessage(
        'Can you help me update a job alert? This message has additional details for the team.',
      ),
    ).toBe('Can you help me update a job alert?');
  });

  it('keeps a single long word within the title limit', () => {
    expect(Array.from(subjectFromMessage('😀'.repeat(100)))).toHaveLength(80);
  });
});
