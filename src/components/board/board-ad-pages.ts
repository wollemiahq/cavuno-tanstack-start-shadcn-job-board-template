/** Public reading/browsing surfaces only. Outside Google's consent-message
 * mode, the starter's shared AdSense loader mounts only on these pages (not on
 * account, forms or private messages); once loaded, the script stays active
 * during SPA navigation. In Google mode the tag loads on every route, and
 * manual ad slots still render only on these pages (docs/advertising.md). */
export function isBoardAdPage(pathname: string): boolean {
  return (
    pathname === '/' ||
    /^\/(jobs|companies|blog|salaries)(\/|$)/.test(pathname) ||
    /^\/talent\/?$/.test(pathname) ||
    /^\/about\/?$/.test(pathname)
  );
}
