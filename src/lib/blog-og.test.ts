import { describe, expect, it } from 'vitest';

import { buildBlogOgHtml, escapeHtml, truncate } from './blog-og';

describe('truncate', () => {
  it('leaves short strings untouched', () => {
    expect(truncate('hello', 70)).toBe('hello');
  });

  it('caps long strings and appends an ellipsis within the budget', () => {
    const long = 'a'.repeat(100);
    const out = truncate(long, 70);
    // The result (incl. the ellipsis) must not exceed the budget — otherwise
    // the card text overflows the 1200×630 frame, the bug this guards.
    expect(out.length).toBeLessThanOrEqual(70);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('escapeHtml', () => {
  it('neutralises markup so a post title cannot break out of the card', () => {
    expect(escapeHtml('<script>"x" & y')).toBe(
      '&lt;script&gt;&quot;x&quot; &amp; y',
    );
  });
});

describe('buildBlogOgHtml', () => {
  const base = {
    boardName: 'Robotics Engineer Jobs',
    themeColor: '#27272A',
    title: 'Why robotics hiring is booming',
    excerpt: 'A look at the market.',
    authorName: 'Ada Lovelace',
    authorAvatarUrl: 'https://cdn.example.com/ada.png',
    dateLabel: 'June 24, 2026',
  };

  it('renders the board name, the Blog label, title, excerpt, author and date', () => {
    const html = buildBlogOgHtml(base);
    expect(html).toContain('Robotics Engineer Jobs');
    expect(html).toContain('Blog');
    expect(html).toContain('Why robotics hiring is booming');
    expect(html).toContain('A look at the market.');
    expect(html).toContain('Ada Lovelace');
    expect(html).toContain('June 24, 2026');
  });

  it('paints the board primary colour as the accent', () => {
    expect(buildBlogOgHtml(base)).toContain('#27272A');
  });

  it('renders the author avatar as an <img> when present', () => {
    expect(buildBlogOgHtml(base)).toContain('https://cdn.example.com/ada.png');
  });

  it('omits the excerpt block when there is no excerpt (no crash, no empty markup)', () => {
    const html = buildBlogOgHtml({ ...base, excerpt: null });
    expect(html).not.toContain('A look at the market.');
    expect(html).toContain('Why robotics hiring is booming');
  });

  it('omits the avatar <img> when no avatar is set but keeps the author name', () => {
    const html = buildBlogOgHtml({ ...base, authorAvatarUrl: null });
    expect(html).not.toContain('<img');
    expect(html).toContain('Ada Lovelace');
  });

  it('escapes the title so markup in a post cannot inject into the card', () => {
    const html = buildBlogOgHtml({ ...base, title: '<b>x</b> & y' });
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt; &amp; y');
    expect(html).not.toContain('<b>x</b>');
  });

  it('truncates an overlong title into the frame', () => {
    const html = buildBlogOgHtml({ ...base, title: 'z'.repeat(120) });
    expect(html).not.toContain('z'.repeat(120));
    expect(html).toContain('…');
  });
});
