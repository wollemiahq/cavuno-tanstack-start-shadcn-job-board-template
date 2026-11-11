/**
 * schema.org `WebSite` and `Organization` for the home page: the board's
 * name, its home URL, the jobs search it actually serves (the jobs listing
 * reads `q`), and its logo when the operator has uploaded one.
 */
export type WebSiteJsonLd = {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  name: string;
  url: string;
  potentialAction: {
    '@type': 'SearchAction';
    target: { '@type': 'EntryPoint'; urlTemplate: string };
    'query-input': 'required name=search_term_string';
  };
};

export type OrganizationJsonLd = {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo?: string;
};

export function homeJsonLd(options: {
  boardName: string;
  /** Absolute home URL, as the page canonicalizes. */
  homeUrl: string;
  /** Absolute URL of the jobs listing, which filters on `?q=`. */
  jobsUrl: string;
  logoUrl: string | null;
}): [WebSiteJsonLd, OrganizationJsonLd] {
  const { boardName, homeUrl, jobsUrl, logoUrl } = options;
  const organization: OrganizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: boardName,
    url: homeUrl,
  };
  if (logoUrl) organization.logo = new URL(logoUrl, homeUrl).href;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: boardName,
      url: homeUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${jobsUrl}?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    organization,
  ];
}
