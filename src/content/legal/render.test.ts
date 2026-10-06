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
  it('does not let a removed tag reassemble another tag', () => {
    expect(renderLegalHtml('<<x>img src=x onerror=alert(1)>', 'Board')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;',
    );
    expect(renderLegalHtml('<<x>script>alert(1)<<x>/script>', 'Board')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });

  it('cannot open a tag with the board name', () => {
    const html = renderLegalHtml(
      '<p>Hi <{{board_name}}</p>',
      'img src=x onerror=alert(1) ',
    );
    expect(html).toBe('<p>Hi &lt;img src=x onerror=alert(1) </p>');
    expect(
      renderLegalHtml('<a href="{{board_name}}">x</a>', 'javascript:alert(1)'),
    ).toBe('<a>x</a>');
  });

  it('drops an unclosed comment and everything after it', () => {
    expect(renderLegalHtml('<p>Kept</p><!-- <p>lost</p>', 'Board')).toBe(
      '<p>Kept</p>',
    );
    expect(renderLegalHtml('<p>A<!-- note -->B</p>', 'Board')).toBe(
      '<p>AB</p>',
    );
  });

  it('balances tags so the body cannot break the page around it', () => {
    expect(renderLegalHtml('</div><p>Text</p></div>', 'Board')).toBe(
      '<p>Text</p>',
    );
    expect(renderLegalHtml('<table><tr><td>Cell', 'Board')).toBe(
      '<table><tr><td>Cell</td></tr></table>',
    );
    expect(renderLegalHtml('<p><b>Bold</p>', 'Board')).toBe(
      '<p><b>Bold</b></p>',
    );
  });

  it('writes void and self-closing tags as complete elements', () => {
    expect(renderLegalHtml('<p>A<br/>B<hr /></p><div/>C', 'Board')).toBe(
      '<p>A<br>B<hr></p><div></div>C',
    );
    expect(renderLegalHtml('<p>A</br></p>', 'Board')).toBe('<p>A</p>');
  });

  it('keeps an unquoted link whose value contains =', () => {
    expect(
      renderLegalHtml(
        '<a href=https://x.com/?a=b&c=d title=a=b>x</a>',
        'Board',
      ),
    ).toBe('<a href="https://x.com/?a=b&amp;c=d" title="a=b">x</a>');
  });

  it('keeps an escaped query string in a link', () => {
    expect(
      renderLegalHtml('<a href="/jobs?a=1&amp;b=2">jobs</a>', 'Board'),
    ).toBe('<a href="/jobs?a=1&amp;b=2">jobs</a>');
  });

  it.each([
    ['javascript:alert(1)', '<a>x</a>'],
    ['JaVaScRiPt:alert(1)', '<a>x</a>'],
    [
      'java&#115;cript:alert(1)',
      '<a href="java&amp;#115;cript:alert(1)">x</a>',
    ],
    [
      '&#106;avascript:alert(1)',
      '<a href="&amp;#106;avascript:alert(1)">x</a>',
    ],
    ['//evil.test', '<a>x</a>'],
    ['/\\evil.test', '<a>x</a>'],
    ['\\\\evil.test', '<a>x</a>'],
    ['/\t/evil.test', '<a>x</a>'],
    ['?page=2', '<a href="?page=2">x</a>'],
  ])('neutralises the link %s', (href, expected) => {
    expect(renderLegalHtml(`<a href="${href}">x</a>`, 'Board')).toBe(expected);
  });

  it('reads a quote as quoting only after `=`', () => {
    expect(
      renderLegalHtml(
        '<p><a href="https://x.com"">link</a> then "a quote"</p>',
        'Board',
      ),
    ).toBe('<p><a href="https://x.com">link</a> then "a quote"</p>');
    expect(
      renderLegalHtml("<p class=a'b>text</p><p>it's here</p>", 'Board'),
    ).toBe("<p>text</p><p>it's here</p>");
  });

  it.each(['<a ', '<a "'])(
    'renders 100 KB of unclosed %j tags in linear time',
    (unit) => {
      const html = unit.repeat(Math.ceil(100_000 / unit.length));
      const start = performance.now();
      renderLegalHtml(html, 'Board');
      expect(performance.now() - start).toBeLessThan(250);
    },
  );

  it('keeps a `/` that ends an unquoted href inside the link', () => {
    expect(
      renderLegalHtml('<a href=https://example.com/>Example</a>', 'Board'),
    ).toBe('<a href="https://example.com/">Example</a>');
  });

  it('closes `<!-->` and `<!--->` at once', () => {
    expect(renderLegalHtml('<p>a<!-->b<!--->c</p>', 'Board')).toBe(
      '<p>abc</p>',
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
