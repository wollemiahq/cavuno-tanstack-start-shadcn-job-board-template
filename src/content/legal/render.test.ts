import { describe, expect, it } from 'vitest';

import { renderLegalHtml, renderLegalText } from './render';

describe('renderLegalHtml', () => {
  it('fills in the board name as escaped text', () => {
    expect(
      renderLegalHtml('<p>Welcome to {{board_name}}.</p>', 'A & B <Jobs>'),
    ).toBe('<p>Welcome to A &amp; B &lt;Jobs&gt;.</p>');
  });

  it('keeps formatting markup and entities', () => {
    const html =
      '<h3><strong>1. Data</strong></h3>\n<ul><li><em>Logs</em> &amp; more</li></ul>';
    expect(renderLegalHtml(html, 'Board')).toBe(html);
  });

  it('removes scripts, event handlers and unsafe links', () => {
    const html =
      '<p onclick="steal()" style="color:red">Hi<script>alert(1)</script></p>' +
      '<a href="javascript:alert(1)" onmouseover="x()">bad</a>' +
      '<a href="https://example.org/privacy" target="_blank" rel="noopener">ok</a>' +
      '<iframe src="https://evil.test"></iframe><img src=x onerror=alert(1)>';
    expect(renderLegalHtml(html, 'Board')).toBe(
      '<p>Hi</p><a>bad</a><a href="https://example.org/privacy" target="_blank" rel="noopener">ok</a>',
    );
  });

  it('keeps mailto and relative links', () => {
    expect(
      renderLegalHtml(
        '<a href="mailto:privacy@board.test">mail</a><a href="/cookie-policy">cookies</a>',
        'Board',
      ),
    ).toBe(
      '<a href="mailto:privacy@board.test">mail</a><a href="/cookie-policy">cookies</a>',
    );
  });
});

describe('renderLegalText', () => {
  it('fills in the board name without escaping plain text', () => {
    expect(renderLegalText('About {{ board_name }}', 'A & B')).toBe(
      'About A & B',
    );
  });
});
