/** Public reading/browsing surfaces only. Account, forms and private messages
 * must not mount the starter's shared AdSense loader. AdSense page
 * exclusions are also required once its script has loaded during SPA navigation.
 * With Google's consent message the tag loads on every route, so those
 * exclusions are mandatory then (docs/advertising.md). */
export function isBoardAdPage(pathname: string): boolean {
  return (
    pathname === '/' ||
    /^\/(jobs|companies|blog|salaries)(\/|$)/.test(pathname) ||
    /^\/talent\/?$/.test(pathname) ||
    /^\/about\/?$/.test(pathname)
  );
}
