import { lazy, Suspense, useEffect, useState } from 'react';

/**
 * Root: loads the PUBLIC board shell once (identity, features, SEO, consent)
 * and renders shared chrome. Session-dependent fields (user, employer
 * memberships, paywall grant, preview toolbar) load client-side after paint
 * via RootSessionProvider — hard-refresh may briefly show Sign-in chrome for
 * signed-in users; soft navigations keep session in the root tree.
 * Presentation tokens and light/dark mode are repo-owned (`src/theme.css`).
 */
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useNavigate,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';

import Header from '../components/Header';
import { localeDirection } from '../lib/locale-direction';
import { toPreviewBoardConfig } from '../lib/preview';
import { requestOrigin } from '../lib/request-origin';
import { emitRoutesReport } from '../lib/routes-report';
import { m } from '../paraglide/messages';
import { getLocale } from '../paraglide/runtime';
import { getRootShellData } from '../server/root-shell';
import { themeMeta, themeTokens } from '../theme/resolved';
import { useBlogSuggestions } from './-use-blog-suggestions';
import { useCompanyMarketSuggestions } from './-use-company-market-suggestions';
import '../styles.css';
import { useKeywordSuggestions } from './-use-keyword-suggestions';
import { useLocationSuggestions } from './-use-location-suggestions';

import { AlternateLinks } from '@/components/alternate-links';
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
import { RootSessionProvider, useRootSession } from '@/components/root-session';
import { RouterDevtools } from '@/components/router-devtools';
import {
  MainContentTarget,
  SkipToContentLink,
} from '@/components/shell-accessibility';
import { DirectionProvider } from '@/components/ui/direction';
import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { boardHeadIconLinks } from '@/lib/board-icons';
import { resolveJobDetailBreadcrumbAriaLabel } from '@/lib/breadcrumb-aria-label';
import {
  resolveHeaderRouteLabels,
  resolveHeaderSearchState,
  type HeaderSearchSubmission,
} from '@/lib/header-search';
import { resolveJobsSearchTarget } from '@/lib/jobs-search-target';
import type { UrlSearchInput } from '@/lib/pagination';
import {
  resolveShellBreadcrumb,
  resolveShellBreadcrumbEntities,
  resolveShellBreadcrumbTrail,
  type ShellBreadcrumbLabels,
} from '@/lib/shell-breadcrumb';

const LazyFooter = lazy(() =>
  import('../components/Footer').then((mod) => ({ default: mod.default })),
);

const LazyAnalyticsScripts = lazy(() =>
  import('@/components/analytics-scripts').then(({ AnalyticsScripts }) => ({
    default: AnalyticsScripts,
  })),
);

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
const PSEUDO_LOCALES = new Set(['en-XA', 'ar-XB']);

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
  // Origin lives in CONTEXT, not loader data: the shell renders before
  // loaders resolve, and it must not wait on getRootShellData just to build
  // hreflang hrefs. Zero I/O — request URL on the server, window.location
  // on the client.
  beforeLoad: () => ({ origin: requestOrigin() }),
  // Public shell only (board + SEO + offer gate + consent). Session chrome
  // is RootSessionProvider after paint — see getRootSessionShellData.
  loader: () => getRootShellData(),
  head: ({ loaderData }) => {
    const board = loaderData?.board;
    // Brand icons from board.context() (`logoUrl` + `icons`), not board.seo().
    // Empty / not-yet-generated packs fall back to starter public/ assets.
    const iconLinks = boardHeadIconLinks(board);
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: board?.name ?? m.rootFallback_title() },
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
  const { board, offerGate, consentChoice } = Route.useLoaderData();

  // Embed widget: no site chrome and no session island (third-party iframe).
  const isEmbed = useRouterState({
    select: (s) => s.location.pathname.startsWith('/embed'),
  });
  if (isEmbed) {
    return (
      <MainContentTarget>
        <main className="p-4">
          <Outlet />
        </main>
      </MainContentTarget>
    );
  }

  return (
    <RootSessionProvider candidatePaywall={board.features.candidatePaywall}>
      <RootChrome
        board={board}
        offerGate={offerGate}
        consentChoice={consentChoice}
      />
    </RootSessionProvider>
  );
}

function RootChrome({
  board,
  offerGate,
  consentChoice,
}: {
  board: Awaited<ReturnType<typeof getRootShellData>>['board'];
  offerGate: Awaited<ReturnType<typeof getRootShellData>>['offerGate'];
  consentChoice: Awaited<ReturnType<typeof getRootShellData>>['consentChoice'];
}) {
  const { user, employerCompanies, hasAccessGrant, preview } = useRootSession();
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
  const router = useRouter();

  // Once after hydration, report path templates to the builder parent when
  // this board is embedded in the preview iframe. The tree comes off the
  // live router instance — importing routeTree.gen here would cycle (it
  // imports every route including this one), and a dynamic import of it is
  // ineffective anyway since router.tsx holds it in the client entry.
  useEffect(() => {
    // A normal public tab has no builder parent, so do not walk the route
    // tree merely to let emitRoutesReport no-op.
    if (window.parent === window) return;
    // SAFETY: emitRoutesReport reads the router tree structurally
    // (id/path/fullPath/children), all of which TanStack routeTree provides.
    emitRoutesReport(router.routeTree as never);
  }, [router]);
  // Identity-aware default search scope: an approved employer hunts talent
  // (when the board's directory is visible to them); everyone else hunts
  // jobs. Section routes (companies/talent/blog) still override.
  const isApprovedEmployer = (employerCompanies ?? []).some(
    (membership) => membership.status === 'approved',
  );
  const headerSearch = resolveHeaderSearchState(
    location.pathname,
    // SAFETY: TanStack route search values are URL-serializable scalars here;
    // resolveHeaderSearchState only reads known string/boolean-style keys.
    location.search as UrlSearchInput,
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
  const blogSuggestions = useBlogSuggestions(headerSearch.scope === 'blog');
  // Breadcrumb nav aria-label only — do not import the full jobDetail copy
  // family (21 messages × locales) into the unsplittable root for one string.
  // Operator overrides ride the same jobCardLabels.breadcrumbAriaLabel key
  // that jobDetailCopy resolves via resolveCopyGroup.
  const breadcrumbAriaLabel = resolveJobDetailBreadcrumbAriaLabel();
  const breadcrumbLabels: ShellBreadcrumbLabels = breadcrumbsCopy();
  const shellBreadcrumb = resolveShellBreadcrumb({
    pathname: location.pathname,
    labels: breadcrumbLabels,
    // Authed surfaces get footer trails too — labels from the template
    // catalogs (the SDK's copy.breadcrumbs only knows public segments).
    privateLabels: {
      account: m.accountHome_title(),
      profile: m.accountShell_profileNav(),
      savedJobs: m.accountShell_savedJobsNav(),
      recommendedJobs: m.accountShell_recommendedJobsNav(),
      jobAlerts: m.accountShell_jobAlertsNav(),
      applications: m.accountShell_applicationsNav(),
      applicants: m.employerApplicants_title(),
      subscription: m.accountShell_subscriptionNav(),
      settings: m.accountShell_settingsNav(),
      messages: m.messagesPage_title(),
      signIn: m.siteHeader_signInLabel(),
      signUp: m.siteHeader_signUpLabel(),
      authJoin: m.authJoin_title(),
      authForgotPassword: m.authForgotPassword_title(),
      authResetPassword: m.authResetPassword_title(),
      authMagicLink: m.authMagicLink_title(),
      authVerifyEmail: m.authVerifyEmail_title(),
      postJob: m.siteHeader_postJobLabel(),
      companyProfile: m.accountShell_companyProfileNav(),
      companyMembers: m.accountShell_membersNav(),
      employerDashboard: m.employerDashboard_title(),
      authConfirmEmailChange: m.authConfirmEmailChange_title(),
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
      if (term?.type === 'post') {
        void navigate({
          to: '/blog/$postSlug',
          params: { postSlug: term.slug },
        });
        return;
      }
      if (term?.type === 'tag') {
        void navigate({
          to: '/blog/tag/$tagSlug',
          params: { tagSlug: term.slug },
        });
        return;
      }
      void navigate({ to: '/blog', search: { q: query } });
      return;
    }

    void navigate(
      resolveJobsSearchTarget({
        query,
        location: selectedLocation,
        term,
      }),
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
        blogSuggestions,
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
      {/* Analytics + footer are below-the-fold / post-consent — keep them out
          of the initial public JS budget (PageSpeed unused-JS on index). */}
      <Suspense fallback={null}>
        <LazyAnalyticsScripts analytics={board.analytics} />
      </Suspense>
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
        <Suspense fallback={null}>
          <LazyFooter
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
        </Suspense>
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
  const { origin } = Route.useRouteContext();
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
            humans or crawlers): noindex them. Compare as string[] so the
            branch typechecks under the prod 3-locale Locale union and the
            QA 5-locale build. */}
          {PSEUDO_LOCALES.has(locale) && (
            <meta name="robots" content="noindex, nofollow" />
          )}
          {/* Chrome now translates end to end, so the locale variants are
            first-class: hreflang alternates here + localized
            self-canonicals per page (selfUrl) make /de/ and /fr/
            indexable instead of consolidating into the base locale. */}
          <AlternateLinks origin={origin} />
          <HeadContent />
        </head>
        <body className="bg-background text-foreground flex min-h-screen flex-col font-sans antialiased">
          {/* System-mode resolution before first paint (no theme flash). */}
          <script dangerouslySetInnerHTML={{ __html: themeModeScript(mode) }} />
          <SkipToContentLink label={m.siteHeader_skipToContentLabel()} />
          {children}
          <DeferredToaster />
          <RouterDevtools />
          <Scripts />
        </body>
      </html>
    </DirectionProvider>
  );
}
