/**
 * Route-aware client bundle regression gate.
 *
 * TanStack Start's manifest separates the always-loaded root shell from each
 * route's lazy preloads. Budget those graphs independently: a heavy editor or
 * chart is acceptable on the route that owns it, but it must not silently move
 * into the shared shell. Gzip is the transfer proxy; raw size also limits parse
 * and compile work.
 *
 * Run after `pnpm run build`:
 *   node scripts/check-bundle-budgets.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = process.cwd();
const clientRoot = resolve(root, 'dist/client');
const serverAssets = resolve(root, 'dist/server/assets');

// Reduced production baseline plus modest regression headroom. These are not
// arbitrary asset caps: gated root features are charged to the routes that
// actually load them, so moving code out of the shell can legitimately make a
// route increment larger while reducing that route's total first load. Never
// raise a budget merely to make CI green.
const BUDGETS = {
  // Rebaselined 2026-09-04, after three consecutive reactive raises: 222_000
  // was itself "measured + small headroom", #125 lifted it to 224_000 because
  // @cavuno/board 4.21.1 added one error code (222_000 → 222_042), and three
  // open PRs failed on the 24 bytes left before that. Each raise was just
  // enough, so the next small change broke the gate again — and the message
  // ("shared shell gzip is 216.8 KiB; budget 216.8 KiB", both sides rounded to
  // the same figure) named nothing, so every author suspected their own diff.
  //
  // Nothing is misplaced, which is why this is a rebaseline and not a cleanup:
  // attributing the shell by emitted bytes gives 33% react-dom, ~12% TanStack
  // router and start, and the rest spread over ~550 of our own modules, none
  // above 9.3 KiB. There is no import to lift out.
  //
  // 4 KiB (~1.8%) over the measurement rather than the ~2 KiB #125 left:
  // enough that a dependency bump or an ordinary change does not trip the
  // gate, tight enough to still catch a stray heavy import.
  // Advertising adds ~1.7 KiB gzip (223.0 KiB including live anchor clearance). Keep initialization
  // eager to avoid another request before ads can start; the operator accepted
  // this measured feature cost. Other budgets remain unchanged.
  // @cavuno/board 4.27.0 (form layouts, collection and profile-field types)
  // took the shell to 223.9 KiB gzip; main with only the SDK bump was already
  // over 229_000. The operator accepted this cost, and the budget is
  // rebaselined to the measurement plus the same ~4 KiB headroom as above so
  // the next small change does not trip it again.
  // The CVE-2026-102989 TanStack Start security release (server-function
  // response validation) took the shell from 227.4 to 228.1 KiB gzip; main
  // had 0.1 KiB left. The fix is not optional, so the budget is rebaselined
  // to the measurement plus the same ~4 KiB headroom.
  // The 2026-10 dependency refresh, accepted by the operator because these
  // upgrades are needed anyway: React 19.3 adds 8.7 KiB gzip, and Vite+ 1.0's
  // bundler splits the shell into 88 chunks instead of 43 (+3.9 KiB gzip for
  // the same raw bytes). Measured 726.8 KiB raw / 242.3 KiB gzip; rebaselined
  // with the same ~4 KiB gzip headroom.
  // Google's consent message on AdSense boards (#246) measured 252,753 B
  // gzip after rebasing on main (provider + gates in the shell; the TCF
  // bridge itself, ~1 KiB gzip, is lazy-loaded on those boards). Raised to
  // 255_000 for ~2.2 KiB of headroom rather than another just-enough raise;
  // accepted by the operator on 2026-10-06.
  // The coming-soon gate route (#250: its route entry plus the root
  // layout's bare branch) measured 742.8 KiB raw (760,627 B) against the
  // 760,000 raw budget, which main had ~0.1 KiB of headroom left on; gzip
  // stayed inside (248.0 of 249.0 KiB). Trimming the route options did not
  // move it past chunking noise (742.7–743.0 KiB). Accepted by the operator
  // on 2026-10-07 as the feature's cost; raw rebaselined with ~7 KB headroom.
  // Localized URL segments: the client router needs the route-template list
  // and the board's own word lists to translate links, so they ride the
  // shell (other languages' words are filtered out at build time). Measured
  // 746.7 KiB raw / 249.4 KiB gzip on an English board; accepted by the
  // operator on 2026-10-09 and rebaselined with the usual headroom.
  // One shell chunk (vite.config.ts `shellChunk`) instead of 87, and private
  // routes' page, error and not-found components moved out of the shell:
  // measured 659.8 KiB raw / 210.1 KiB gzip (675,619 / 215,164 B) against
  // 749.3 / 250.2 before (2026-10-15). Lowered to the measurement plus the
  // usual ~4 KiB gzip headroom so the code cannot drift back unnoticed.
  // @cavuno/board 4.54.0 (distance sort, resume sharing, required response
  // fields) took the shell to 214.4 KiB gzip; main had ~0.1 KiB left.
  // Accepted by the operator on 2026-10-27; rebaselined with the usual
  // ~4 KiB headroom.
  // @cavuno/board 4.55.0 (board-language taxonomy names, time zones, remote
  // labels; #320) took the shell to 673.9 KiB raw against 673.8. Accepted by
  // the operator on 2026-10-28; raw rebaselined with ~4 KB headroom.
  shell: { raw: 694_000, gzip: 228_900 },
  // UI kit components that nothing imports are left out of Tailwind's scan
  // at build time (scripts/tailwind-unused-kit-plugin.mjs): measured
  // 180.8 KiB raw / 28.0 KiB gzip against 242.9 / 36.4 before (2026-10-15).
  // Lowered to the measurement plus ~2 KiB gzip of headroom, so a file that
  // brings the whole kit back into the stylesheet fails here.
  styles: { raw: 196_000, gzip: 30_700 },
  routeDefault: { raw: 80_000, gzip: 30_000 },
  routes: {
    // The decorative home hero shader is idle-loaded, not initial-route work.
    // Home head + ItemList JSON-LD live in getHomePage, so the ~5 KiB gzip
    // seo client chunk no longer rides the `/` route increment. Rebaseline
    // to measured post-move increment + small headroom.
    '/': { raw: 48_000, gzip: 20_000 },
    // Rebaselined for the intentional RTL-aware Recharts axis support. Keep
    // the increase narrow: the measured route is ~800.6 kB raw.
    '/employers/companies/$slug/profile': { raw: 1_057_500, gzip: 342_000 },
    // @cavuno/board 3.2.0 splits its ESM entries, so the format helpers this
    // form needs are charged here instead of riding the shared shell. Public
    // routes all gained 2.2 KiB gzip; /post is the one surface that nets
    // WORSE (+2.1 KiB total first load) from ~2 KiB of chunk-boundary
    // duplication. Accepted deliberately: /post is an authenticated,
    // low-traffic form, not an indexed surface, and the shell win applies to
    // every public page. Measured 548.6 KiB raw / 178.4 KiB gzip.
    '/post': { raw: 704_500, gzip: 240_000 },
    // Shell→route reassignment after salary SEO left main (job-detail /
    // resolve-copy-group no longer shell-shared). Total first load fell.
    // 2026-10 dependency refresh (Recharts 3.10, Vite+ 1.0 chunking): measured
    // 452.5 KiB raw / 135.4 KiB gzip.
    '/employers/companies/$slug/': { raw: 562_500, gzip: 178_500 },
    // React Aria's drag-and-drop/grid runtime belongs only to this private
    // workflow; it is intentionally charged here instead of every public URL.
    // Removing the leaked messaging/auth graph from the shell also reassigns
    // 32.6 KiB of shared Base UI code to this route. The route's own chunk is
    // 0.3 KiB smaller than the prior baseline; this narrow raw-only increase
    // records the corrected ownership rather than accepting route growth.
    '/employers/companies/$slug/jobs/$jobId/applicants': {
      // Measurement noise after trunk talent Save/lists landed next to the
      // sourced-rail convert path: 400.5 KiB raw vs the prior 410_000 ceil.
      // 2026-10 dependency refresh (Recharts 3.10 alone is +5.9 KiB gzip on
      // the analytics chart, plus Vite+ 1.0 chunking): measured 445.9 KiB raw
      // / 126.5 KiB gzip.
      raw: 510_000,
      // Sourced-rail convert-on-drop (GridList MIME + convert RPC) added
      // ~0.3 KiB gzip on top of the React Aria drag runtime already charged
      // here. 112 KiB was 109.4; CI measured 109.7.
      gzip: 154_000,
    },
    // Desktop-only enhanced search is lazy shell work. Removing the shared
    // Base UI footer menu also made TanStack attribute more of the remaining
    // dynamic graph here, though this route's total first load still fell.
    '/account': { raw: 290_000, gzip: 106_500 },
    // Pre-existing overflow on main after board-user self-service (#40):
    // this route used the default 80 KiB increment and landed at 113.7 /
    // 38.9. English-only compile dropped it to 103.5 / 35.5. Charge the
    // members surface here instead of the default.
    '/employers/companies/$slug/members': { raw: 194_000, gzip: 73_500 },
    // Talent lists picker + Save-to-job menu (#95/#96) are charged here with
    // the All-filters sheet, not the shared shell. Anti-slop replaced
    // module mocks with injected list/save seams on those controls;
    // measured 155.7 / 54.7 after that.
    // 2026-10 dependency refresh: measured 167.5 KiB raw / 59.0 KiB gzip.
    // Search distance on a place search (#266): the shared SearchRadiusScope
    // chunk (5.2 KiB raw, already loaded by the location job listings) is
    // now charged here too. Measured 176.1 KiB raw / 60.7 KiB gzip.
    // Saved people on saved searches (ADR-0142): the All / Saved switch
    // (two Buttons, no toggle group), the stage filter, the Saved view's
    // paging and empty states, and the list-membership Save menu. Measured
    // 177.6 KiB raw / 61.3 KiB gzip (181,847 / 62,783 B) against 170.5 / 59.2
    // on main; the pipeline-stage join was split out of the kanban
    // view-model so it does not drag the kanban's copy along. The operator
    // accepted this cost (2026-10-12); budget is the measurement plus ~3%.
    // With both, measured 183.6 KiB raw / 63.0 KiB gzip (187,958 / 64,506
    // B); includes #266's radius control; Saved-people raise accepted by the
    // operator 2026-10-12. Budget is the measurement plus ~3%.
    // The one-chunk shell (2026-10-15) moved code only private routes and
    // /talent/ share out of the shell, so it is charged here: measured 200.5
    // KiB raw / 69.2 KiB gzip (205,282 / 70,822 B) while the route's total
    // first load fell from 313.3 to 279.3 KiB gzip. Budget is the
    // measurement plus ~3%.
    '/talent/': { raw: 343_000, gzip: 126_000 },
    // The talent location page renders the /talent/ directory view filtered
    // to one place, so it loads the same code: measured 325.4 KiB raw /
    // 120.1 KiB gzip against /talent/'s 325.2 / 120.0 (2026-10-15). Same
    // budget as /talent/.
    '/talent/locations/$location': { raw: 343_000, gzip: 126_000 },
    // TanStack Start 1.0's manifest lists every chunk a route's lazy code
    // imports; 1.168 left out transitive imports, so these routes were
    // measured short and loaded the rest without a preload. The bytes did not
    // change (checked by following every import in both builds). Every route
    // budget below this line, and the values of the ones above that it
    // exceeded, are the complete measurement plus ~3% (2026-10-15).
    '/employers/companies/$slug/jobs/new': { raw: 708_500, gzip: 241_500 },
    '/employers/companies/$slug/jobs/$jobId/edit': {
      raw: 708_500,
      gzip: 241_500,
    },
    '/jobs/locations/$location/$keyword': { raw: 290_000, gzip: 110_500 },
    '/jobs/locations/$location/skills/$skill': { raw: 290_000, gzip: 110_500 },
    '/jobs/locations/$location/': { raw: 290_000, gzip: 110_500 },
    '/jobs/$keyword': { raw: 235_500, gzip: 92_500 },
    '/jobs/skills/$skill': { raw: 235_500, gzip: 92_500 },
    '/jobs/': { raw: 233_500, gzip: 91_000 },
    '/messages': { raw: 244_000, gzip: 87_500 },
    '/me/alerts': { raw: 182_000, gzip: 70_500 },
    '/employers/dashboard': { raw: 172_000, gzip: 65_500 },
    '/matches': { raw: 150_000, gzip: 58_000 },
    '/companies/markets/$market': { raw: 121_500, gzip: 46_500 },
    '/companies/': { raw: 121_000, gzip: 46_000 },
    // Saved-job pagination makes the full saved collection reachable. Its
    // shared cursor controls add ~1.6 KiB gzip (42.2 -> 43.8 KiB measured);
    // retain roughly the original 1.3 KiB headroom on this private route.
    '/saved-jobs': { raw: 123_000, gzip: 46_000 },
    '/companies/$companySlug/jobs/$jobSlug': { raw: 112_500, gzip: 44_500 },
    '/p/$handle': { raw: 113_500, gzip: 43_000 },
    '/settings': { raw: 100_500, gzip: 37_500 },
    '/auth/verify-email-required': { raw: 89_000, gzip: 36_000 },
    '/employers/invites/accept': { raw: 77_000, gzip: 31_000 },
  },
};

function unique(values) {
  return [...new Set(values)];
}

function assetPath(publicPath) {
  if (!publicPath.startsWith('/assets/')) {
    throw new Error(`unexpected client asset path: ${publicPath}`);
  }
  return resolve(clientRoot, publicPath.slice(1));
}

function measure(files) {
  return files.reduce(
    (total, file) => {
      const bytes = readFileSync(assetPath(file));
      total.raw += bytes.length;
      total.gzip += gzipSync(bytes).length;
      return total;
    },
    { raw: 0, gzip: 0 },
  );
}

function rank(files) {
  return files
    .map((file) => ({ file, ...measure([file]) }))
    .sort((a, b) => b.gzip - a.gzip);
}

function format(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function overBudget(label, size, budget, failures) {
  for (const key of ['raw', 'gzip']) {
    if (size[key] <= budget[key]) continue;
    failures.push(
      `${label} ${key} is ${format(size[key])}; budget ${format(budget[key])}`,
    );
  }
}

const manifestFiles = readdirSync(serverAssets).filter(
  (name) =>
    name.startsWith('_tanstack-start-manifest_v-') && name.endsWith('.js'),
);
if (manifestFiles.length !== 1) {
  throw new Error(
    `expected one TanStack Start manifest in dist/server/assets; found ${manifestFiles.length}. Run pnpm run build first.`,
  );
}

const manifestModule = await import(
  pathToFileURL(join(serverAssets, manifestFiles[0])).href
);
const routes = manifestModule.tsrStartManifest().routes;
const rootRoute = routes.__root__;
if (!rootRoute)
  throw new Error('TanStack Start manifest has no __root__ route');

// The entry is an inline `import("…")` loader rather than a `src` script
// (scripts/shell-entry-after-styles-plugin.mjs), and so is no longer among
// the root's preloads either.
const shellFiles = unique([
  ...(rootRoute.preloads ?? []),
  ...(rootRoute.scripts ?? [])
    .map(
      (script) =>
        script.attrs?.src ?? script.children?.match(/^import\("(.+)"\)$/)?.[1],
    )
    .filter(Boolean),
]);
const shellSize = measure(shellFiles);

const styleFiles = readdirSync(resolve(clientRoot, 'assets'))
  .filter((name) => name.endsWith('.css'))
  .map((name) => `/assets/${name}`);
const styleSize = measure(styleFiles);

const routeRows = Object.entries(routes)
  .filter(([routeId]) => routeId !== '__root__')
  .map(([routeId, route]) => {
    const files = unique(route.preloads ?? []).filter(
      (file) => !shellFiles.includes(file),
    );
    return { routeId, files, size: measure(files) };
  })
  .sort((a, b) => b.size.gzip - a.size.gzip);

const failures = [];
overBudget('shared shell', shellSize, BUDGETS.shell, failures);
overBudget('global styles', styleSize, BUDGETS.styles, failures);
for (const row of routeRows) {
  overBudget(
    `route ${row.routeId}`,
    row.size,
    BUDGETS.routes[row.routeId] ?? BUDGETS.routeDefault,
    failures,
  );
}

console.log(
  `shared shell  ${format(shellSize.raw)} raw / ${format(shellSize.gzip)} gzip (${shellFiles.length} files)`,
);
console.log('largest shared-shell assets:');
for (const asset of rank(shellFiles).slice(0, 5)) {
  console.log(
    `  ${asset.file.padEnd(58)} ${format(asset.raw).padStart(10)} raw / ${format(asset.gzip).padStart(10)} gzip`,
  );
}
console.log(
  `global styles ${format(styleSize.raw)} raw / ${format(styleSize.gzip)} gzip (${styleFiles.length} files)`,
);
console.log('largest route increments:');
for (const row of routeRows.slice(0, 8)) {
  console.log(
    `  ${row.routeId.padEnd(58)} ${format(row.size.raw).padStart(10)} raw / ${format(row.size.gzip).padStart(10)} gzip`,
  );
}

if (failures.length > 0) {
  console.error('\nBundle budget failures:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('\nBundle budgets pass.');
