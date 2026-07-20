/**
 * Root: loads the board context once (identity, theme, features) plus
 * the session user, injects the board theme as overrides of the shadcn
 * token block, and renders the shared chrome.
 */
import { boardCopy } from '#/copy';

import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';

import Footer from '../components/Footer';
import Header from '../components/Header';
import { toPreviewBoardConfig } from '../lib/preview';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getSessionUser } from '../server/account';
import { listCompanies } from '../server/employers';
import { getPreviewState } from '../server/preview';
import {
  getAnalyticsConfig,
  getBoardContext,
  getBoardSeo,
  getEmployerOfferGate,
} from '../server/queries';
import appCss from '../styles.css?url';
import { themeMeta } from '../theme/resolved';
import { MessagesDockController } from './-messages-dock-controller';
import { MessagesNavController } from './-messages-nav-controller';
import { useCompanyMarketSuggestions } from './-use-company-market-suggestions';
import { useKeywordSuggestions } from './-use-keyword-suggestions';
import { useLocationSuggestions } from './-use-location-suggestions';

import { AppRouteErrorPage } from '@/components/app-route-error';
import { AppRouterProvider } from '@/components/app-router-provider';
import { FloatingStackProvider } from '@/components/floating-stack';
import { ShellBreadcrumb } from '@/components/board/breadcrumb';
import { themeModeScript } from '@/components/cavuno/board-theme';
import { Box } from '@/components/layout/box';
import { Container } from '@/components/layout/container';
import { NavigationProgress } from '@/components/navigation-progress';
import { PreviewToolbar } from '@/components/preview/preview-toolbar';
import {
  MainContentTarget,
  SkipToContentLink,
} from '@/components/shell-accessibility';
import { Toaster } from '@/components/ui/sonner';
import {
  resolveHeaderRouteLabels,
  resolveHeaderSearchState,
  type HeaderSearchSubmission,
} from '@/lib/header-search';
import {
  resolveShellBreadcrumb,
  resolveShellBreadcrumbEntities,
} from '@/lib/shell-breadcrumb';

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    /**
     * Listing routes opt out of the root wrapper so the Page family can own
     * the canonical 80rem content width and any intentional full-bleed bands.
     */
    fullBleed?: boolean;
    /** Migrated PageContent renders the route's single main landmark. */
    ownsMain?: boolean;
    /** Search workspaces fill the desktop viewport below their natural header. */
    fillsViewport?: boolean;
  }
}

export const Route = createRootRoute({
  loader: async () => {
    const [board, user, seo, analytics, offerGate, employerCompanies, preview] =
      await Promise.all([
        getBoardContext(),
        getSessionUser(),
        getBoardSeo(),
        getAnalyticsConfig(),
        getEmployerOfferGate(),
        // Signed-in header menu: the viewer's company workspaces. Signed-out
        // (or any failure) is simply "no companies".
        listCompanies()
          .then((memberships) => memberships.data)
          .catch(() => null),
        // Developer-preview capability + persona roster (Workstream B). The
        // server-verified `sandbox: true` gate resolves false on every tenant
        // board, so the toolbar never renders there. Fail closed so a sandbox
        // hiccup only hides the toolbar, never faults the page.
        getPreviewState().catch(() => ({
          capability: {
            canPreview: false as const,
            reason: 'not-sandbox' as const,
          },
          personas: [],
        })),
      ]);
    return {
      board,
      user,
      seo,
      analytics,
      offerGate,
      employerCompanies,
      preview,
    };
  },
  head: ({ loaderData }) => {
    const board = loaderData?.board;
    const seo = loaderData?.seo;
    const icons = seo?.icons;
    // Board-resolved favicons / app icons — only the configured variants.
    const iconLinks = icons
      ? [
          ...(icons.svg
            ? [{ rel: 'icon', type: 'image/svg+xml', href: icons.svg }]
            : []),
          ...(icons.ico ? [{ rel: 'icon', href: icons.ico }] : []),
          ...(icons.icon192
            ? [
                {
                  rel: 'icon',
                  type: 'image/png',
                  sizes: '192x192',
                  href: icons.icon192,
                },
              ]
            : []),
          ...(icons.icon512
            ? [
                {
                  rel: 'icon',
                  type: 'image/png',
                  sizes: '512x512',
                  href: icons.icon512,
                },
              ]
            : []),
          ...(icons.appleTouch
            ? [{ rel: 'apple-touch-icon', href: icons.appleTouch }]
            : []),
        ]
      : [];
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: board?.name ?? 'Job board' },
        ...(seo?.manifest.themeColor
          ? [{ name: 'theme-color', content: seo.manifest.themeColor }]
          : []),
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        ...(themeMeta.fontsImport
          ? [{ rel: 'stylesheet', href: themeMeta.fontsImport }]
          : []),
        ...iconLinks,
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      ],
    };
  },
  shellComponent: RootDocument,
  component: RootLayout,
  // The tree-wide backstop for a rejecting loader: a `Failed to fetch` inside
  // a public route's loader escaped every boundary and left the page blank.
  // Only the candidate routes carry their own errorComponent; a route without
  // one surfaces its error here, so this covers every public,
  // SEO-load-bearing page. Deliberately at the root rather than the router's
  // `defaultErrorComponent` — that option would give EVERY route its own
  // boundary, so an error would never reach the root at all.
  errorComponent: AppRouteErrorPage,
});

function RootLayout() {
  const { board, user, offerGate, employerCompanies, preview } =
    Route.useLoaderData();
  const isEmbed = useRouterState({
    select: (s) => s.location.pathname.startsWith('/embed'),
  });
  const isFullBleed = useRouterState({
    select: (s) => s.matches.some((match) => match.staticData?.fullBleed),
  });
  const ownsMain = useRouterState({
    select: (s) => s.matches.some((match) => match.staticData?.ownsMain),
  });
  const fillsViewport = useRouterState({
    select: (s) => s.matches.some((match) => match.staticData?.fillsViewport),
  });
  const location = useRouterState({ select: (s) => s.location });
  const resolvedHeaderLabels = useRouterState({
    select: (state) => resolveHeaderRouteLabels(state.matches),
  });
  const breadcrumbEntities = useRouterState({
    select: (state) => resolveShellBreadcrumbEntities(state.matches),
  });
  const navigate = useNavigate();
  // Identity-aware default search scope: an approved employer hunts talent
  // (when the board's directory is visible to them); everyone else hunts
  // jobs. Section routes (companies/talent/blog) still override.
  const isApprovedEmployer = (employerCompanies ?? []).some(
    (membership) => membership.status === 'approved',
  );
  const headerSearch = resolveHeaderSearchState(
    location.pathname,
    location.search as Record<string, unknown>,
    resolvedHeaderLabels.location,
    resolvedHeaderLabels.query,
    isApprovedEmployer && board.talentDirectoryVisibility !== 'off'
      ? 'talent'
      : 'jobs',
  );
  const locationSuggestions = useLocationSuggestions(board.language);
  const keywordSuggestions = useKeywordSuggestions(
    headerSearch.scope === 'jobs',
  );
  const companyMarketSuggestions = useCompanyMarketSuggestions(
    headerSearch.scope === 'companies',
  );
  const copy = boardCopy(board.language, board.labels);
  const shellBreadcrumb = resolveShellBreadcrumb({
    pathname: location.pathname,
    labels: copy.breadcrumbs,
    // Authed surfaces get footer trails too — labels from the template
    // catalogs (the SDK's copy.breadcrumbs only knows public segments).
    privateLabels: {
      account: m.accountHome_title(),
      profile: m.accountShell_profileNav(),
      savedJobs: m.accountShell_savedJobsNav(),
      jobAlerts: m.accountShell_jobAlertsNav(),
      applications: m.accountShell_applicationsNav(),
      applicants: m.employerApplicants_title(),
      subscription: m.accountShell_subscriptionNav(),
      settings: m.accountShell_settingsNav(),
      messages: m.messagesPage_title(),
      signIn: m.siteHeader_signInLabel(),
      signUp: m.siteHeader_signUpLabel(),
      postJob: m.siteHeader_postJobLabel(),
      companyProfile: m.accountShell_companyProfileNav(),
      employerDashboard: m.employerDashboard_title(),
    },
    entities: {
      ...breadcrumbEntities,
      location: breadcrumbEntities.location ?? resolvedHeaderLabels.location,
      query: breadcrumbEntities.query ?? resolvedHeaderLabels.query,
    },
  });

  function submitHeaderSearch({
    scope,
    query,
    location: selectedLocation,
    term,
    market,
  }: HeaderSearchSubmission) {
    if (scope === 'companies') {
      if (market) {
        void navigate({
          to: '/companies/markets/$market',
          params: { market: market.slug },
        });
        return;
      }

      void navigate({ to: '/companies', search: { query } });
      return;
    }

    if (scope === 'talent') {
      void navigate({ to: '/talent', search: { q: query } });
      return;
    }

    if (scope === 'blog') {
      void navigate({ to: '/blog', search: { q: query } });
      return;
    }

    if (selectedLocation && term?.type === 'skill') {
      void navigate({
        to: '/jobs/locations/$location/skills/$skill',
        params: { location: selectedLocation.slug, skill: term.slug },
      });
      return;
    }

    if (selectedLocation && term?.type === 'category') {
      void navigate({
        to: '/jobs/locations/$location/$keyword',
        params: { location: selectedLocation.slug, keyword: term.slug },
      });
      return;
    }

    if (term?.type === 'skill') {
      void navigate({
        to: '/jobs/skills/$skill',
        params: { skill: term.slug },
      });
      return;
    }

    if (term?.type === 'category') {
      void navigate({
        to: '/jobs/$keyword',
        params: { keyword: term.slug },
      });
      return;
    }

    if (selectedLocation) {
      void navigate({
        to: '/jobs/locations/$location',
        params: { location: selectedLocation.slug },
        search: { q: query },
      });
      return;
    }

    void navigate({ to: '/jobs', search: { q: query } });
  }

  // The embed widget is an iframe fragment dropped into a third-party site —
  // render it bare, WITHOUT the site header/footer (parity with the hosted
  // board's minimal `(embed)` route-group layout). A site nav inside the iframe
  // is a parity break the `H ⊆ S` capability gate can't see (it only flags
  // hosted capabilities missing from the starter, not extra starter chrome).
  if (isEmbed) {
    return (
      <AppRouterProvider>
        <MainContentTarget>
          <main className="p-4">
            <Outlet />
          </main>
        </MainContentTarget>
      </AppRouterProvider>
    );
  }

  const header = (
    <Header
      boardName={board.name}
      logoUrl={board.logoUrl}
      user={user}
      language={board.language}
      labels={board.labels}
      features={board.features}
      candidatePaywall={board.features.candidatePaywall}
      employerCompanies={employerCompanies}
      talentDirectoryVisibility={board.talentDirectoryVisibility}
      messagesNav={
        user && board.features.messaging ? <MessagesNavController /> : undefined
      }
      search={{
        ...headerSearch,
        onSubmit: submitHeaderSearch,
        keywordSuggestions,
        companyMarketSuggestions,
        locationSuggestions,
      }}
    />
  );
  const routeContent = ownsMain ? (
    <MainContentTarget
      className={fillsViewport ? 'flex-1 md:h-full md:min-h-0' : 'flex-1'}
    >
      <Outlet />
    </MainContentTarget>
  ) : isFullBleed ? (
    <MainContentTarget className="flex flex-1 flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
    </MainContentTarget>
  ) : (
    <MainContentTarget className="flex flex-1 flex-col">
      <main className="flex-1">
        <Container width="wide">
          <Box paddingY={{ base: '8', md: '10' }}>
            <Outlet />
          </Box>
        </Container>
      </main>
    </MainContentTarget>
  );

  return (
    <AppRouterProvider>
      <FloatingStackProvider>
      <NavigationProgress />
      {fillsViewport ? (
        <div className="md:grid md:h-dvh md:grid-rows-[auto_minmax(0,1fr)]">
          {header}
          {routeContent}
        </div>
      ) : (
        <>
          {header}
          {routeContent}
        </>
      )}
      <Footer
        breadcrumb={
          shellBreadcrumb ? (
            <ShellBreadcrumb
              items={shellBreadcrumb.items}
              ariaLabel={copy.jobDetail.breadcrumbAriaLabel}
            />
          ) : undefined
        }
        connected={shellBreadcrumb !== null}
        flush={fillsViewport}
        boardName={board.name}
        logoUrl={board.logoUrl}
        language={board.language}
        labels={board.labels}
        showCavunoBranding={board.showCavunoBranding}
        primaryDomain={board.primaryDomain}
        slug={board.slug}
        features={board.features}
        footer={board.footer}
        talentDirectoryVisibility={board.talentDirectoryVisibility}
        hasEmployerOfferPage={offerGate.hasEmployerOfferPage}
      />
      {user &&
      board.features.messaging &&
      !location.pathname.startsWith('/messages') ? (
        // Keyed by viewer: the dock holds polled inbox + open-thread state
        // that must unmount wholesale when the signed-in identity changes
        // (sign-out/in, persona switch) — never survive across viewers. The
        // whole messaging surface is hidden when the board flag is off.
        <MessagesDockController key={user.id} />
      ) : null}
      {preview.capability.canPreview ? (
        <PreviewToolbar
          capability={preview.capability}
          personas={preview.personas}
          viewer={
            user
              ? {
                  displayName: user.displayName,
                  email: user.email,
                  role: user.role,
                }
              : null
          }
          config={toPreviewBoardConfig(board)}
        />
      ) : null}
      </FloatingStackProvider>
    </AppRouterProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const data = Route.useLoaderData();
  // Theme mode is repo-canonical too (theme.css → resolved
  // module), not the wire theme (ADR-0065 D5: migrated boards ignore it).
  const mode =
    themeMeta.mode === 'dark' || themeMeta.mode === 'light'
      ? themeMeta.mode
      : ('system' as const);
  return (
    <html
      // The document declares the RUNTIME locale (ADR-0063): the base
      // locale (=== board language, generation-time invariant) on
      // unprefixed routes, the chrome locale under /de/-style prefixes.
      lang={getLocale()}
      className={mode === 'dark' ? 'dark' : undefined}
      data-theme-mode={mode}
      suppressHydrationWarning
    >
      <head>
        {/* en-XA is the CI coverage pseudo-locale (never for humans or
            crawlers): noindex it. Real prefixed chrome locales stay
            indexable — their route canonicals already point at the
            unprefixed base (chrome-translated duplicates, ADR-0063 D4;
            hreflang deliberately deferred until content translates). */}
        {getLocale() === 'en-XA' && (
          <meta name="robots" content="noindex, nofollow" />
        )}
        <HeadContent />
        {/* Tinybird flock analytics (cutover runbook P2, hosted parity):
            first-party page views + custom events keyed by tenant_id =
            board slug, via the /t proxy. Renders only when the
            deployment carries a tracker token. */}
        {data?.analytics?.trackerToken && data?.board?.slug ? (
          <script
            defer
            src="/js/metrics.js"
            data-token={data.analytics.trackerToken}
            data-host="/t"
            data-tenant-id={data.board.slug}
            data-web-vitals="true"
          />
        ) : null}
      </head>
      <body className="bg-background text-foreground flex min-h-screen flex-col font-sans antialiased">
        {/* System-mode resolution before first paint (no theme flash). */}
        <script dangerouslySetInnerHTML={{ __html: themeModeScript(mode) }} />
        <SkipToContentLink label={m.siteHeader_skipToContentLabel()} />
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
