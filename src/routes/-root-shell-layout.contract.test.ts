import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('public root shell layout contract', () => {
  it('places the one shell breadcrumb inside the footer after route content', () => {
    const rootSource = readFileSync(
      resolve(process.cwd(), 'src/routes/__root.tsx'),
      'utf8',
    );
    const footerSource = readFileSync(
      resolve(process.cwd(), 'src/components/Footer.tsx'),
      'utf8',
    );
    const routeContent = rootSource.indexOf('{routeContent}');
    const footer = rootSource.indexOf('<Footer');
    const breadcrumb = rootSource.indexOf('<ShellBreadcrumb');

    expect(routeContent).toBeGreaterThan(-1);
    expect(footer).toBeGreaterThan(routeContent);
    expect(breadcrumb).toBeGreaterThan(footer);
    expect(rootSource).toContain('breadcrumb=');
    expect(rootSource).toContain('connected={shellBreadcrumb !== null}');
    expect(footerSource.indexOf('{breadcrumb}')).toBeLessThan(
      footerSource.indexOf("<Box paddingY={{ base: '10', md: '12' }}>"),
    );
  });

  it('keeps route content canonical while the site header owns fluid gutters', () => {
    const rootSource = readFileSync(
      resolve(process.cwd(), 'src/routes/__root.tsx'),
      'utf8',
    );
    const headerSource = readFileSync(
      resolve(process.cwd(), 'src/components/Header.tsx'),
      'utf8',
    );

    expect(rootSource).toContain('<Container width="wide">');
    expect(headerSource).toContain("<Box paddingX={{ base: '4', md: '8' }}>");
    expect(headerSource).not.toContain('<Container width="wide">');
  });
});
