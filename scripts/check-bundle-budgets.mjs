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
  shell: { raw: 730_000, gzip: 226_000 },
  styles: { raw: 260_000, gzip: 40_000 },
  routeDefault: { raw: 80_000, gzip: 30_000 },
  routes: {
    // The decorative home hero shader is idle-loaded, not initial-route work.
    // Home head + ItemList JSON-LD live in getHomePage, so the ~5 KiB gzip
    // seo client chunk no longer rides the `/` route increment. Rebaseline
    // to measured post-move increment + small headroom.
    '/': { raw: 48_000, gzip: 20_000 },
    // Rebaselined for the intentional RTL-aware Recharts axis support. Keep
    // the increase narrow: the measured route is ~800.6 kB raw.
    '/employers/companies/$slug/profile': { raw: 820_000, gzip: 250_000 },
    // @cavuno/board 3.2.0 splits its ESM entries, so the format helpers this
    // form needs are charged here instead of riding the shared shell. Public
    // routes all gained 2.2 KiB gzip; /post is the one surface that nets
    // WORSE (+2.1 KiB total first load) from ~2 KiB of chunk-boundary
    // duplication. Accepted deliberately: /post is an authenticated,
    // low-traffic form, not an indexed surface, and the shell win applies to
    // every public page. Measured 548.6 KiB raw / 178.4 KiB gzip.
    '/post': { raw: 565_000, gzip: 183_000 },
    // Shell→route reassignment after salary SEO left main (job-detail /
    // resolve-copy-group no longer shell-shared). Total first load fell.
    '/employers/companies/$slug/': { raw: 440_000, gzip: 135_000 },
    // React Aria's drag-and-drop/grid runtime belongs only to this private
    // workflow; it is intentionally charged here instead of every public URL.
    // Removing the leaked messaging/auth graph from the shell also reassigns
    // 32.6 KiB of shared Base UI code to this route. The route's own chunk is
    // 0.3 KiB smaller than the prior baseline; this narrow raw-only increase
    // records the corrected ownership rather than accepting route growth.
    '/employers/companies/$slug/jobs/$jobId/applicants': {
      // Measurement noise after trunk talent Save/lists landed next to the
      // sourced-rail convert path: 400.5 KiB raw vs the prior 410_000 ceil.
      raw: 412_000,
      // Sourced-rail convert-on-drop (GridList MIME + convert RPC) added
      // ~0.3 KiB gzip on top of the React Aria drag runtime already charged
      // here. 112 KiB was 109.4; CI measured 109.7.
      gzip: 114_000,
    },
    // Desktop-only enhanced search is lazy shell work. Removing the shared
    // Base UI footer menu also made TanStack attribute more of the remaining
    // dynamic graph here, though this route's total first load still fell.
    '/account': { raw: 210_000, gzip: 72_000 },
    // Pre-existing overflow on main after board-user self-service (#40):
    // this route used the default 80 KiB increment and landed at 113.7 /
    // 38.9. English-only compile dropped it to 103.5 / 35.5. Charge the
    // members surface here instead of the default.
    '/employers/companies/$slug/members': { raw: 115_000, gzip: 40_000 },
    // Talent lists picker + Save-to-job menu (#95/#96) are charged here with
    // the All-filters sheet, not the shared shell. Anti-slop replaced
    // module mocks with injected list/save seams on those controls;
    // measured 155.7 / 54.7 after that.
    '/talent/': { raw: 165_000, gzip: 58_000 },
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

const shellFiles = unique([
  ...(rootRoute.preloads ?? []),
  ...(rootRoute.scripts ?? [])
    .map((script) => script.attrs?.src)
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
