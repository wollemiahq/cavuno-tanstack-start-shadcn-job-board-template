import { lazy, Suspense, useEffect, useState } from 'react';

/**
 * Root: loads the board context once (identity, features) plus the
 * session user, and renders the shared chrome. Presentation tokens and
 * light/dark mode are repo-owned (`src/theme.css` → resolved module) —
 * board context no longer carries a wire theme (SDK 3.x).
 */
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
import { localeDirection } from '../lib/locale-direction';
import { toPreviewBoardConfig } from '../lib/preview';
import { emitRoutesReport } from '../lib/routes-report';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getRootShellData } from '../server/root-shell';
import { themeMeta, themeTokens } from '../theme/resolved';
import { useCompanyMarketSuggestions } from './-use-company-market-suggestions';
import '../styles.css';
import { useKeywordSuggestions } from './-use-keyword-suggestions';
import { useLocationSuggestions } from './-use-location-suggestions';

import { AnalyticsScripts } from '@/components/analytics-scripts';
import { AppRouteErrorPage } from '@/components/app-route-error';
import { ShellBreadcrumb } from '@/components/board/breadcrumb';
import { themeModeScript } from '@/components/cavuno/board-theme';
import {
  CookieConsentBanner,
  CookieConsentProvider,
  CookiePreferencesFooterAction,
} from '@/components/cookie-consent';
import { FloatingStackProvider } from '@/components/floating-stack';
import { Box } from '@/components/layout/box';
import { Container } from '@/components/layout/container';
import { NavigationProgress } from '@/components/navigation-progress';
import {
  MainContentTarget,
  SkipToContentLink,
} from '@/components/shell-accessibility';
import { DirectionProvider } from '@/components/ui/direction';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { resolveJobDetailBreadcrumbAriaLabel } from '@/lib/breadcrumb-aria-label';
import {
  resolveHeaderRouteLabels,
  resolveHeaderSearchState,
  type HeaderSearchSubmission,
} from '@/lib/header-search';
import {
  resolveShellBreadcrumb,
  resolveShellBreadcrumbEntities,
  resolveShellBreadcrumbTrail,
} from '@/lib/shell-breadcrumb';

const LazyMessagesDockController = lazy(() =>
  import('./-messages-dock-controller').then(({ MessagesDockController }) => ({
    default: MessagesDockController,
  })),
);

const LazyMessagesNavController = lazy(() =>
  import('./-messages-nav-controller').then(({ MessagesNavController }) => ({
    default: MessagesNavController,
  })),
);

const LazyToaster = lazy(() =>
  import('@/components/ui/sonner').then(({ Toaster }) => ({
    default: Toaster,
  })),
);

function DeferredToaster() {
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const request = () => setRequested(true);
    window.addEventListener('pointerdown', request, {
      once: true,
      passive: true,
      capture: true,
    });
    window.addEventListener('keydown', request, { once: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', request, { capture: true });
      window.removeEventListener('keydown', request, { capture: true });
    };
  }, []);

  return requested ? (
    <Suspense fallback={null}>
      <LazyToaster />
    </Suspense>
  ) : null;
}

const LazyPreviewToolbar = lazy(() =>
  import('@/components/preview/preview-toolbar').then(({ PreviewToolbar }) => ({
    default: PreviewToolbar,
  })),
);

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
  loader: () => getRootShellData(),
  head: ({ loaderData }) => {
    const board = loaderData?.board;
    // 4.0.0 dropped board.seo().icons — starter-owned public assets.
    const boardIconLinks = [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'icon', href: '/favicon.ico' },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        href: '/logo192.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '512x512',
        href: '/logo512.png',
      },
      { rel: 'apple-touch-icon', href: '/logo192.png' },
    ];
    const iconLinks = boardIconLinks;
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: board?.name ?? 'Job board' },
        { name: 'theme-color', content: themeTokens.light['--background'] },
      ],
      links: [
        ...(themeMeta.fontsImport
          ? [{ rel: 'stylesheet', href: themeMeta.fontsImport }]
          : []),
        ...iconLinks,
        { rel: 'manifest', href: '/site.webmanifest' },
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
  const {
    board,
    user,
    offerGate,
    employerCompanies,
    preview,
    hasAccessGrant,
    consentChoice,
  } = Route.useLoaderData();
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
  const breadcrumbOverride = useRouterState({
    select: (state) => resolveShellBreadcrumbTrail(state.matches),
  });
  const navigate = useNavigate();

  // Once after hydration, report path templates to the builder parent when
  // this board is embedded in the preview iframe.
  // Lazy-import routeTree so the root module does not statically cycle
  // with routeTree.gen (which imports every route including this one).
  useEffect(() => {
    // A normal public tab has no builder parent, so do not download or walk
    // the generated route tree merely to let emitRoutesReport no-op.
    if (window.parent === window) return;
    void import('../routeTree.gen')
      .then(({ routeTree }) => {
        // Structural cast: SDK walker accepts id/path/fullPath/children only.
        emitRoutesReport(routeTree as never);
      })
      .catch(() => {
        // Fire-and-forget: never block render on a missing tree.
      });
  }, []);
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
  // Breadcrumb nav aria-label only — do not import the full jobDetail copy
  // family (21 messages × locales) into the unsplittable root for one string.
  // Operator overrides ride the same jobCardLabels.breadcrumbAriaLabel key
  // that jobDetailCopy resolves via resolveCopyGroup.
  const breadcrumbAriaLabel = resolveJobDetailBreadcrumbAriaLabel();
  const shellBreadcrumb = resolveShellBreadcrumb({
    pathname: location.pathname,
    labels: breadcrumbsCopy(board.language) as unknown as import("@/lib/shell-breadcrumb").ShellBreadcrumbLabels,
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
    override: breadcrumbOverride,
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
      <MainContentTarget>
        <main className="p-4">
          <Outlet />
        </main>
      </MainContentTarget>
    );
  }

  const header = (
    <Header
      boardName={board.name}
      logoUrl={board.logoUrl}
      user={user}
      language={board.language}
      features={board.features}
      hasAccessGrant={hasAccessGrant}
      employerCompanies={employerCompanies}
      talentDirectoryVisibility={board.talentDirectoryVisibility}
      messagesNav={
        user && board.features.messaging ? (
          <Suspense fallback={null}>
            <LazyMessagesNavController />
          </Suspense>
        ) : undefined
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
    <CookieConsentProvider
      required={board.analytics.cookieConsentRequired}
      initialChoice={consentChoice}
    >
      {/* Consent state wraps the whole chrome: the banner (floating stack),
          the footer's "Cookie preferences" reopener, the job-alert prompt's
          yield, and the analytics gate all read the same choice. The embed
          iframe path above deliberately gets neither trackers nor banner. */}
      <AnalyticsScripts analytics={board.analytics} />
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
                ariaLabel={breadcrumbAriaLabel}
              />
            ) : undefined
          }
          connected={shellBreadcrumb !== null}
          flush={fillsViewport}
          boardName={board.name}
          logoUrl={board.logoUrl}
          language={board.language}
          showCavunoBranding={board.showCavunoBranding}
          primaryDomain={board.primaryDomain}
          slug={board.slug}
          features={board.features}
          footer={board.footer}
          talentDirectoryVisibility={board.talentDirectoryVisibility}
          hasEmployerOfferPage={offerGate.hasEmployerOfferPage}
          cookiePreferencesAction={<CookiePreferencesFooterAction />}
        />
        <CookieConsentBanner />
        {user &&
        board.features.messaging &&
        !location.pathname.startsWith('/messages') ? (
          // Keyed by viewer: the dock holds polled inbox + open-thread state
          // that must unmount wholesale when the signed-in identity changes
          // (sign-out/in, persona switch) — never survive across viewers. The
          // whole messaging surface is hidden when the board flag is off.
          <Suspense fallback={null}>
            <LazyMessagesDockController key={user.id} />
          </Suspense>
        ) : null}
        {preview.capability.canPreview || preview.demoConfigured ? (
          <Suspense fallback={null}>
            <LazyPreviewToolbar
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
              demoConfigured={preview.demoConfigured}
              demoBoardPrivate={preview.demoBoardPrivate}
              dataSource={preview.dataSource}
            />
          </Suspense>
        ) : null}
      </FloatingStackProvider>
    </CookieConsentProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  // Theme mode is repo-canonical (theme.css → resolved module).
  const mode =
    themeMeta.mode === 'dark' || themeMeta.mode === 'light'
      ? themeMeta.mode
      : ('system' as const);
  const locale = getLocale();
  const direction = localeDirection(locale);
  return (
    // The SAME resolved direction the document declares, published as React
    // context so components whose direction lives in JS rather than CSS can
    // read it (recharts axes, embla's scroll axis) and Base UI reads it for
    // popup placement. Computed in this server render, so the value is
    // already correct on the first byte and hydration cannot flip it.
    <DirectionProvider direction={direction}>
      <html
        // The document declares the runtime locale: the base
        // locale (=== board language, generation-time invariant) on
        // unprefixed routes, the chrome locale under /de/-style prefixes.
        lang={locale}
        // …and its writing direction, server-side on the first byte, so
        // logical properties and `rtl:` variants resolve before paint
        // rather than mirroring the page after hydration. en/de/fr → ltr;
        // the ar-XB pseudo-bidi CI locale → rtl.
        dir={direction}
        className={mode === 'dark' ? 'dark' : undefined}
        data-theme-mode={mode}
        suppressHydrationWarning
      >
        <head>
          {/* en-XA / ar-XB are the CI coverage pseudo-locales (never for
            humans or crawlers): noindex them. Real prefixed chrome
            locales stay indexable — their route canonicals already point
            at the unprefixed base; hreflang is deliberately deferred until
            content translates). Compare as string[] so the branch typechecks
            under the prod 3-locale Locale union and the QA 5-locale build. */}
          {(['en-XA', 'ar-XB'] as readonly string[]).includes(locale) && (
            <meta name="robots" content="noindex, nofollow" />
          )}
          <HeadContent />
        </head>
        <body className="bg-background text-foreground flex min-h-screen flex-col font-sans antialiased">
          {/* System-mode resolution before first paint (no theme flash). */}
          <script dangerouslySetInnerHTML={{ __html: themeModeScript(mode) }} />
          <SkipToContentLink label={m.siteHeader_skipToContentLabel()} />
          {children}
          <DeferredToaster />
          <Scripts />
        </body>
      </html>
    </DirectionProvider>
  );
}
