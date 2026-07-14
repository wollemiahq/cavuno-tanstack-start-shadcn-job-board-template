import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('P0 product surfaces use the owned shadcn layer', () => {
  it('keeps the password submit on the owned shadcn Button', () => {
    const passwordRoute = source('./routes/password.tsx');

    expect(passwordRoute).toContain('@/components/ui/button');
    expect(passwordRoute).not.toContain('@/components/base/');
  });

  it('builds the shared listing search from the owned InputGroup and Button', () => {
    const listingHeader = source('./components/board/listing-page-header.tsx');

    expect(listingHeader).toContain('@/components/ui/input-group');
    expect(listingHeader).toContain('@/components/ui/button');
    expect(listingHeader).not.toContain('@/components/base/');
    expect(listingHeader).not.toContain('react-aria-components');
  });

  it('renders an empty job collection with the owned Empty family', () => {
    const jobList = source('./components/board/job-list.tsx');

    expect(jobList).toContain('@/components/ui/empty');
    expect(jobList).not.toContain('@/components/application/empty-state/');
  });

  it('keeps copy-link actions on the owned shadcn Button', () => {
    const copyLinkButton = source('./components/board/copy-link-button.tsx');

    expect(copyLinkButton).toContain('@/components/ui/button');
    expect(copyLinkButton).not.toContain('@/components/base/');
  });

  it('builds the default not-found page from owned Empty and Button components', () => {
    const notFound = source('./components/app-not-found.tsx');

    expect(notFound).toContain('@/components/ui/empty');
    expect(notFound).toContain('@/components/ui/button');
    expect(notFound).not.toContain('@/components/base/');
  });
});
