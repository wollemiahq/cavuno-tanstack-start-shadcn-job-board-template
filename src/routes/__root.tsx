/**
 * Root: loads the board context once (identity, theme, features) plus
 * the session user, injects the board theme as overrides of the shadcn
 * token block, and renders the shared chrome.
 */
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'

import { themeModeScript } from '@/components/cavuno/board-theme'
import { UntitledUiRouterProvider } from '@/components/untitled-ui/router-provider'
import { getLocale } from '../paraglide/runtime'
import { themeMeta } from '../theme/resolved'

import Footer from '../components/Footer'
import Header from '../components/Header'
import { getSessionUser } from '../server/account'
import {
  getAnalyticsConfig,
  getBoardContext,
  getBoardSeo,
  getEmployerOfferGate,
} from '../server/queries'

import appCss from '../styles.css?url'

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    /**
     * Listing routes opt out of the root container so they can compose
     * full-bleed bands (the Lumen-style gray hero, CAV-497). A fullBleed
     * route owns its own `max-w-container` wrappers per section.
     */
    fullBleed?: boolean
  }
}

export const Route = createRootRoute({
  loader: async () => {
    const [board, user, seo, analytics, offerGate] = await Promise.all([
      getBoardContext(),
      getSessionUser(),
      getBoardSeo(),
      getAnalyticsConfig(),
      getEmployerOfferGate(),
    ])
    return { board, user, seo, analytics, offerGate }
  },
  head: ({ loaderData }) => {
    const board = loaderData?.board
    const seo = loaderData?.seo
    const icons = seo?.icons
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
      : []
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
    }
  },
  shellComponent: RootDocument,
  component: RootLayout,
})

function RootLayout() {
  const { board, user, offerGate } = Route.useLoaderData()
  const isEmbed = useRouterState({
    select: (s) => s.location.pathname.startsWith('/embed'),
  })
  const isFullBleed = useRouterState({
    select: (s) => s.matches.some((match) => match.staticData?.fullBleed),
  })

  // The embed widget is an iframe fragment dropped into a third-party site —
  // render it bare, WITHOUT the site header/footer (parity with the hosted
  // board's minimal `(embed)` route-group layout). A site nav inside the iframe
  // is a parity break the `H ⊆ S` capability gate can't see (it only flags
  // hosted capabilities missing from the starter, not extra starter chrome).
  if (isEmbed) {
    return (
      <UntitledUiRouterProvider>
        <main className="p-4">
          <Outlet />
        </main>
      </UntitledUiRouterProvider>
    )
  }

  return (
    <UntitledUiRouterProvider>
      <Header
        boardName={board.name}
        logoUrl={board.logoUrl}
        user={user}
        language={board.language}
        labels={board.labels}
        features={board.features}
      />
      {isFullBleed ? (
        <main className="flex-1">
          <Outlet />
        </main>
      ) : (
        <main className="mx-auto w-full max-w-container flex-1 px-4 py-8 md:px-8">
          <Outlet />
        </main>
      )}
      <Footer
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
    </UntitledUiRouterProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const data = Route.useLoaderData()
  // Theme mode is repo-canonical too (theme.css → resolved
  // module), not the wire theme (ADR-0065 D5: migrated boards ignore it).
  const mode =
    themeMeta.mode === 'dark' || themeMeta.mode === 'light'
      ? themeMeta.mode
      : ('system' as const)
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
      <body className="flex min-h-screen flex-col bg-primary font-sans text-primary antialiased">
        {/* System-mode resolution before first paint (no theme flash). */}
        <script dangerouslySetInnerHTML={{ __html: themeModeScript(mode) }} />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
