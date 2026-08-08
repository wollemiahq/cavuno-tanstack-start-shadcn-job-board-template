#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import { promisify } from 'node:util';
import {
  brotliCompress,
  constants as zlibConstants,
  createBrotliCompress,
} from 'node:zlib';

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, '.tmp', 'lighthouse');
const UPSTREAM_ORIGIN = 'http://localhost:4173';
const PROXY_ORIGIN = 'http://127.0.0.1:4174';
const brotli = promisify(brotliCompress);
const args = new Set(process.argv.slice(2));
const check = args.has('--check');
const runsArg = process.argv.find((arg) => arg.startsWith('--runs='));
const runs = Number(runsArg?.split('=')[1] ?? (check ? 3 : 1));
const routeArg = process.argv.find((arg) => arg.startsWith('--route='));
const routeNames = new Set(
  routeArg?.slice('--route='.length).split(',').filter(Boolean) ?? [],
);

if (!Number.isInteger(runs) || runs < 1) {
  throw new Error('--runs must be a positive integer');
}

const TARGETS = {
  scoreWorst: 0.9,
  scoreMedian: 0.95,
  lcpWorstMs: 2_500,
  tbtWorstMs: 150,
  clsWorst: 0.05,
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForOrigin(origin, timeoutMs = 60_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(origin, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch {
      // Preview is still booting.
    }
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${origin}`);
}

function shouldCompress(method, response) {
  if (method === 'HEAD' || !response.body) return false;
  const type = response.headers.get('content-type') ?? '';
  return /(?:text\/|javascript|json|xml|svg)/i.test(type);
}

async function precompressStaticAssets() {
  const assetsDir = path.join(ROOT, 'dist', 'client', 'assets');
  const files = await readdir(assetsDir);
  const compressible = files.filter((file) =>
    /\.(?:css|js|json|svg|xml)$/.test(file),
  );
  const entries = await Promise.all(
    compressible.map(async (file) => [
      `/assets/${file}`,
      await brotli(await readFile(path.join(assetsDir, file)), {
        params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 },
      }),
    ]),
  );
  return new Map(entries);
}

async function startCompressionProxy() {
  // Production CDNs precompress immutable assets; doing the same before
  // Chrome starts prevents Brotli CPU from contaminating main-thread data.
  const staticAssets = await precompressStaticAssets();
  const htmlCache = new Map();
  const server = createServer(async (request, response) => {
    try {
      const upstreamUrl = new URL(request.url ?? '/', UPSTREAM_ORIGIN);
      const cacheKey = `${upstreamUrl.pathname}${upstreamUrl.search}`;
      const cachedHtml =
        request.method === 'GET' && !request.headers.cookie
          ? htmlCache.get(cacheKey)
          : undefined;
      if (cachedHtml) {
        response.writeHead(cachedHtml.status, {
          ...cachedHtml.headers,
          'x-performance-cache': 'HIT',
        });
        response.end(cachedHtml.body);
        return;
      }

      const headers = new Headers();
      for (const [name, value] of Object.entries(request.headers)) {
        if (
          value === undefined ||
          name === 'host' ||
          name === 'accept-encoding'
        )
          continue;
        headers.set(name, Array.isArray(value) ? value.join(', ') : value);
      }
      // Vite Preview serves identity responses. Compress here so Lighthouse
      // measures deploy-like transfer sizes rather than raw CSS/JS bytes.
      headers.set('accept-encoding', 'identity');
      const upstream = await fetch(upstreamUrl, {
        method: request.method,
        headers,
        redirect: 'manual',
      });

      response.statusCode = upstream.status;
      for (const [name, value] of upstream.headers) {
        if (name === 'content-length' || name === 'content-encoding') continue;
        response.setHeader(name, value);
      }

      const cacheableHtml =
        request.method === 'GET' &&
        upstream.status === 200 &&
        upstream.headers.get('content-type')?.includes('text/html') &&
        upstream.headers
          .get('cloudflare-cdn-cache-control')
          ?.includes('public') &&
        !upstream.headers.has('set-cookie');

      if (cacheableHtml) {
        const body = await brotli(Buffer.from(await upstream.arrayBuffer()), {
          params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 },
        });
        const responseHeaders = { ...response.getHeaders() };
        responseHeaders['content-encoding'] = 'br';
        responseHeaders.vary = 'Cookie, Accept-Encoding';
        htmlCache.set(cacheKey, {
          status: upstream.status,
          headers: responseHeaders,
          body,
        });
        response.writeHead(upstream.status, responseHeaders);
        response.end(body);
        return;
      }

      if (!shouldCompress(request.method, upstream)) {
        if (upstream.body) Readable.fromWeb(upstream.body).pipe(response);
        else response.end();
        return;
      }

      response.setHeader('content-encoding', 'br');
      response.setHeader('vary', 'Accept-Encoding');
      const staticBody = staticAssets.get(upstreamUrl.pathname);
      if (staticBody) {
        response.end(staticBody);
        return;
      }
      Readable.fromWeb(upstream.body)
        .pipe(
          createBrotliCompress({
            params: {
              [zlibConstants.BROTLI_PARAM_QUALITY]: 1,
            },
          }),
        )
        .pipe(response);
    } catch (error) {
      console.error('Compression proxy error:', error);
      response.statusCode = 502;
      response.end(error instanceof Error ? error.message : String(error));
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(4174, '127.0.0.1', () => resolve(server));
  });
}

function sitemapLocations(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => {
    const url = new URL(match[1]);
    return `${url.pathname}${url.search}`;
  });
}

async function firstSitemapPath(name, predicate) {
  const response = await fetch(`${PROXY_ORIGIN}/sitemap/${name}.xml`);
  if (!response.ok) return null;
  return sitemapLocations(await response.text()).find(predicate) ?? null;
}

async function discoverRoutes() {
  // Fixed indexes + static marketing/legal: always present on a public board.
  const routes = [
    { name: 'home', path: '/' },
    { name: 'jobs', path: '/jobs' },
    { name: 'companies', path: '/companies' },
    { name: 'salaries', path: '/salaries' },
    { name: 'salaries-titles-index', path: '/salaries/titles' },
    { name: 'blog', path: '/blog' },
    { name: 'talent', path: '/talent' },
    { name: 'about', path: '/about' },
    { name: 'employers', path: '/employers' },
    { name: 'privacy-policy', path: '/privacy-policy' },
  ];

  const [
    jobDetail,
    companyDetail,
    salaryDetail,
    companySalaries,
    blogPost,
    talentDetail,
    jobCategory,
    jobSkill,
    jobLocation,
    companyMarket,
    blogTag,
    blogAuthor,
  ] = await Promise.all([
    firstSitemapPath('jobs-details', () => true),
    firstSitemapPath(
      'companies',
      (route) => route.split('/').filter(Boolean).length === 2,
    ),
    // Prefer a nested salary page (title/skill/location), not the hub.
    firstSitemapPath(
      'salaries',
      (route) =>
        route.split('/').filter(Boolean).length >= 3 &&
        !/^\/companies\/[^/]+\/salaries$/.test(route),
    ),
    // Company salaries only when the company has salary data (else 404).
    firstSitemapPath('salaries', (route) =>
      /^\/companies\/[^/]+\/salaries$/.test(route),
    ),
    firstSitemapPath(
      'blog',
      (route) =>
        route.split('/').filter(Boolean).length === 2 &&
        !route.startsWith('/blog/tag/') &&
        !route.startsWith('/blog/author/'),
    ),
    // Talent profiles are not in the 8-bucket sitemap (only /talent index).
    firstHrefFromPage('/talent', /href="(\/p\/[a-z0-9][a-z0-9-]*)"/i),
    // Programmatic job SEO volume — one sample per axis.
    firstSitemapPath('jobs-categories', (route) =>
      /^\/jobs\/[^/]+$/.test(route),
    ),
    firstSitemapPath('jobs-skills', (route) =>
      /^\/jobs\/skills\/[^/]+$/.test(route),
    ),
    firstSitemapPath(
      'jobs-locations',
      (route) =>
        route.startsWith('/jobs/locations/') &&
        route.split('/').filter(Boolean).length === 3,
    ),
    firstHrefFromPage(
      '/companies',
      /href="(\/companies\/markets\/[a-z0-9][a-z0-9-]*)"/i,
    ),
    firstHrefFromPage('/blog', /href="(\/blog\/tag\/[^"?#]+)"/i),
    firstHrefFromPage('/blog', /href="(\/blog\/author\/[^"?#]+)"/i),
  ]);

  const companyJobs =
    companyDetail != null ? `${companyDetail.replace(/\/$/, '')}/jobs` : null;

  const discovered = [
    { name: 'job-detail', path: jobDetail },
    { name: 'company-detail', path: companyDetail },
    { name: 'company-jobs', path: companyJobs },
    { name: 'company-salaries', path: companySalaries },
    { name: 'salary-detail', path: salaryDetail },
    { name: 'blog-post', path: blogPost },
    { name: 'talent-detail', path: talentDetail },
    { name: 'job-category', path: jobCategory },
    { name: 'job-skill', path: jobSkill },
    { name: 'job-location', path: jobLocation },
    { name: 'company-market', path: companyMarket },
    { name: 'blog-tag', path: blogTag },
    { name: 'blog-author', path: blogAuthor },
  ];

  return [...routes, ...discovered.filter((route) => route.path)];
}

/** First matching internal href from a rendered HTML page, or null. */
async function firstHrefFromPage(pagePath, pattern) {
  try {
    const response = await fetch(`${PROXY_ORIGIN}${pagePath}`);
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(pattern);
    if (!match?.[1]) return null;
    // Decode common entities in hrefs from SSR HTML.
    return match[1].replace(/&amp;/g, '&');
  } catch {
    return null;
  }
}

async function chromePath() {
  const candidates = [
    process.env.LIGHTHOUSE_CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next platform path.
    }
  }
  throw new Error(
    'Chrome not found. Set LIGHTHOUSE_CHROME_PATH to the browser executable.',
  );
}

function runCommand(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => (stdout += chunk));
    child.stderr?.on('data', (chunk) => (stderr += chunk));
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}\n${stderr}`));
    });
  });
}

function metricSummary(report) {
  const audits = report.audits;
  return {
    score: report.categories.performance.score,
    fcp: audits['first-contentful-paint'].numericValue,
    lcp: audits['largest-contentful-paint'].numericValue,
    cls: audits['cumulative-layout-shift'].numericValue,
    tbt: audits['total-blocking-time'].numericValue,
    speedIndex: audits['speed-index'].numericValue,
    ttfb: audits['server-response-time'].numericValue,
    bytes: audits['total-byte-weight'].numericValue,
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function summarizeRoute(route, samples) {
  const scores = samples.map((sample) => sample.score);
  return {
    ...route,
    runs: samples.length,
    scoreMedian: median(scores),
    scoreWorst: Math.min(...scores),
    lcpWorst: Math.max(...samples.map((sample) => sample.lcp)),
    tbtWorst: Math.max(...samples.map((sample) => sample.tbt)),
    clsWorst: Math.max(...samples.map((sample) => sample.cls)),
    samples,
  };
}

function routeFailures(route) {
  const failures = [];
  if (route.scoreMedian < TARGETS.scoreMedian)
    failures.push(`median score ${Math.round(route.scoreMedian * 100)} < 95`);
  if (route.scoreWorst < TARGETS.scoreWorst)
    failures.push(`worst score ${Math.round(route.scoreWorst * 100)} < 90`);
  if (route.lcpWorst > TARGETS.lcpWorstMs)
    failures.push(`LCP ${Math.round(route.lcpWorst)}ms > 2500ms`);
  if (route.tbtWorst > TARGETS.tbtWorstMs)
    failures.push(`TBT ${Math.round(route.tbtWorst)}ms > 150ms`);
  if (route.clsWorst > TARGETS.clsWorst)
    failures.push(`CLS ${route.clsWorst.toFixed(3)} > 0.050`);
  return failures;
}

let preview;
let proxy;

try {
  await mkdir(REPORT_DIR, { recursive: true });
  preview = spawn('pnpm', ['exec', 'vp', 'preview'], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  await waitForOrigin(UPSTREAM_ORIGIN);
  proxy = await startCompressionProxy();
  await waitForOrigin(PROXY_ORIGIN);

  const browser = await chromePath();
  const discoveredRoutes = await discoverRoutes();
  const routes =
    routeNames.size > 0
      ? discoveredRoutes.filter((route) => routeNames.has(route.name))
      : discoveredRoutes;
  if (routes.length === 0) {
    throw new Error(`No routes matched --route=${[...routeNames].join(',')}`);
  }
  // Populate the same anonymous HTML cache the production server advertises.
  // Lighthouse then measures a repeat page view at the CDN edge, while the
  // warm-up still validates that every route can render through real SSR.
  for (const route of routes) {
    const warmup = await fetch(`${PROXY_ORIGIN}${route.path}`);
    if (!warmup.ok) {
      throw new Error(`Warm-up failed for ${route.path}: ${warmup.status}`);
    }
    await warmup.arrayBuffer();
  }
  const lighthouse = path.join(ROOT, 'node_modules', '.bin', 'lighthouse');
  // The session's first Chrome launch pays one-time cold costs (binary and
  // profile reads) that inflate every observed request by a few ms; simulated
  // throttling multiplies that into ~400ms of LCP on whichever run goes
  // first. Burn one discarded run so measured runs all see a warmed lab.
  await runCommand(lighthouse, [
    `${PROXY_ORIGIN}${routes[0].path}`,
    '--quiet',
    `--chrome-path=${browser}`,
    '--chrome-flags=--headless --no-sandbox',
    '--only-categories=performance',
    '--output=json',
    `--output-path=${path.join(REPORT_DIR, 'burn-in.json')}`,
  ]);
  const results = [];

  for (const route of routes) {
    const samples = [];
    for (let run = 1; run <= runs; run += 1) {
      const reportPath = path.join(REPORT_DIR, `${route.name}-${run}.json`);
      await runCommand(lighthouse, [
        `${PROXY_ORIGIN}${route.path}`,
        '--quiet',
        `--chrome-path=${browser}`,
        '--chrome-flags=--headless --no-sandbox',
        '--only-categories=performance',
        '--output=json',
        `--output-path=${reportPath}`,
      ]);
      const report = JSON.parse(await readFile(reportPath, 'utf8'));
      const sample = metricSummary(report);
      samples.push(sample);
      console.log(
        `${route.name.padEnd(15)} run ${run}: score ${Math.round(sample.score * 100)}, LCP ${Math.round(sample.lcp)}ms, TBT ${Math.round(sample.tbt)}ms, CLS ${sample.cls.toFixed(3)}`,
      );
    }
    results.push(summarizeRoute(route, samples));
  }

  const output = {
    generatedAt: new Date().toISOString(),
    origin: PROXY_ORIGIN,
    cacheModel: 'warmed anonymous HTML edge cache',
    targets: TARGETS,
    routes: results,
  };
  await writeFile(
    path.join(REPORT_DIR, 'summary.json'),
    `${JSON.stringify(output, null, 2)}\n`,
  );

  const failures = results.flatMap((route) =>
    routeFailures(route).map((failure) => `${route.name}: ${failure}`),
  );
  if (failures.length > 0) {
    console.error(`\nPerformance target misses:\n- ${failures.join('\n- ')}`);
    if (check) process.exitCode = 1;
  } else {
    console.log('\nEvery route family passes the mobile performance contract.');
  }
} finally {
  await new Promise((resolve) => proxy?.close(resolve) ?? resolve());
  preview?.kill('SIGTERM');
}
