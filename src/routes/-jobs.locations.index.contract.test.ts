import { describe, expect, it } from 'vitest';

import { Route } from './jobs.locations.index';

describe('locations index SEO wiring', () => {
  it('emits the loader breadcrumb as structured data in the document head', async () => {
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Fixture jobs',
          item: 'https://fixture.example/jobs',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Fixture locations',
          item: 'https://fixture.example/jobs/locations',
        },
      ],
    };
    const head = Route.options.head!;
    // SAFETY: the head callback reads only the supplied head and JSON-LD fields; the intersection retains fixture evidence while supplying unused framework context types.
    const descriptor = await head({
      loaderData: {
        head: {
          meta: [],
          links: [
            {
              rel: 'canonical',
              href: 'https://fixture.example/jobs/locations',
            },
          ],
        },
        jsonLd: [breadcrumb],
      },
    } as {
      loaderData: {
        head: { meta: never[]; links: { rel: string; href: string }[] };
        jsonLd: (typeof breadcrumb)[];
      };
    } & Parameters<typeof head>[0]);
    expect(descriptor.links).toContainEqual({
      rel: 'canonical',
      href: 'https://fixture.example/jobs/locations',
    });
    const script = descriptor.scripts?.find(
      (entry) => entry?.type === 'application/ld+json',
    );
    expect(JSON.parse(String(script?.children))).toEqual(breadcrumb);
  });
});
