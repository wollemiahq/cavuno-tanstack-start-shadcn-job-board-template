// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Route } from './__root';

import { CREDENTIAL_ROUTE_IDS } from '@/lib/credential-routes';
interface FixtureViewer {
  id: string;
  emailVerified: boolean;
}
interface FixtureRouterState {
  location: { pathname: string; search: Record<string, string> };
  matches: { routeId: string }[];
}
interface FixtureRouter {
  pathname: string;
  matches: { routeId: string }[];
}
const router = vi.hoisted((): FixtureRouter => ({
  pathname: '/',
  matches: [],
}));
interface FixtureSession {
  user: FixtureViewer | null;
  employerCompanies: never[];
  hasAccessGrant: boolean;
  clearSession: ReturnType<typeof vi.fn>;
  preview: {
    devToolsEnabled: boolean;
    demoConfigured: boolean;
    capability: { canPreview: boolean };
  };
}
const session = vi.hoisted((): FixtureSession => {
  const user: FixtureViewer | null = null;
  return {
    user,
    employerCompanies: [],
    hasAccessGrant: false,
    clearSession: vi.fn(),
    preview: {
      devToolsEnabled: false,
      demoConfigured: false,
      capability: { canPreview: false },
    },
  };
});
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Outlet: () => null,
  useNavigate: () => vi.fn(),
  useRouter: () => ({}),
  useRouterState: <Selected,>({
    select,
  }: {
    select: (state: FixtureRouterState) => Selected;
  }) =>
    select({
      location: { pathname: router.pathname, search: {} },
      matches: router.matches,
    }),
}));
vi.mock('@/components/root-session', () => ({
  RootSessionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useRootSession: () => session,
}));
vi.mock('../components/Header', () => ({
  default: ({ messagesNav }: { messagesNav: React.ReactNode }) => (
    <header data-testid="fixture-header">{messagesNav}</header>
  ),
}));
vi.mock('../components/Footer', () => ({ default: () => null }));
vi.mock('./-messages-nav-controller', () => ({
  MessagesNavController: ({ enabled }: { enabled: boolean }) => (
    <span
      data-testid={enabled ? 'nav-polling-enabled' : 'nav-polling-disabled'}
    />
  ),
}));
vi.mock('./-messages-dock-controller', () => ({
  MessagesDockController: () => <span data-testid="dock-polling-mounted" />,
}));
vi.mock('@/components/cookie-consent', () => ({
  CookieConsentProvider: ({ children }: { children?: React.ReactNode }) =>
    children ?? null,
  CookieConsentBanner: ({ children }: { children?: React.ReactNode }) =>
    children ?? null,
  CookiePreferencesFooterAction: ({
    children,
  }: {
    children?: React.ReactNode;
  }) => children ?? null,
}));
vi.mock('@/components/board-ads-provider', () => ({
  BoardAdsProvider: ({ children }: { children?: React.ReactNode }) =>
    children ?? null,
}));
vi.mock('@/components/board/board-ad-preview', () => ({
  BoardAdPreviewProvider: ({ children }: { children?: React.ReactNode }) =>
    children ?? null,
}));
vi.mock('@/components/board-conversion-analytics', () => ({
  BoardConversionAnalyticsProvider: ({
    children,
  }: {
    children?: React.ReactNode;
  }) => children ?? null,
}));
vi.mock('@/components/floating-stack', () => ({
  FloatingStackProvider: ({ children }: { children?: React.ReactNode }) =>
    children ?? null,
}));
vi.mock('@/components/analytics-scripts', () => ({
  AnalyticsScripts: () => <span data-testid="third-party-analytics" />,
}));
vi.mock('@/components/board-analytics-boot', () => ({
  BoardAnalyticsBoot: () => <span data-testid="cavuno-analytics" />,
}));
vi.mock('@/components/board-auth-conversion-tracker', () => ({
  BoardAuthConversionTracker: () => null,
}));
vi.mock('@/components/navigation-progress', () => ({
  NavigationProgress: () => null,
}));
vi.mock('./-use-location-suggestions', () => ({
  useLocationSuggestions: () => ({}),
}));
vi.mock('./-use-keyword-suggestions', () => ({
  useKeywordSuggestions: () => ({}),
}));
vi.mock('./-use-company-market-suggestions', () => ({
  useCompanyMarketSuggestions: () => ({}),
}));
vi.mock('./-use-blog-suggestions', () => ({ useBlogSuggestions: () => ({}) }));
vi.mock('@/components/board/board-ads-boot', () => ({
  BoardAdsBoot: () => <span data-testid="board-ads" />,
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function renderAt(pathname: string, routeIds: string[]) {
  router.pathname = pathname;
  router.matches = [
    { routeId: '__root__' },
    ...routeIds.map((routeId) => ({ routeId })),
  ];
  // SAFETY: RootLayout and RootChrome consume these shell fields; child components that need the remaining loader data are mocked above.
  vi.spyOn(Route, 'useLoaderData').mockReturnValue({
    board: {
      name: 'Fixture board',
      slug: 'fixture',
      language: 'en',
      features: { messaging: false },
      analytics: { cookieConsentRequired: false, gtmId: 'GTM-FIXTURE' },
      ads: { enabled: true, clientId: 'ca-pub-fixture' },
      talentDirectoryVisibility: 'off',
    },
    offerGate: {},
    publishableKey: 'pk_fixture',
  } as ReturnType<typeof Route.useLoaderData>);
  const Layout = Route.options.component!;
  await act(async () => {
    render(<Layout />);
  });
}

describe('root analytics on credential pages', () => {
  it('mounts analytics and ads on a public page', async () => {
    await renderAt('/jobs', ['/jobs/']);
    expect(
      await screen.findByTestId('third-party-analytics'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('cavuno-analytics')).toBeInTheDocument();
    expect(screen.getByTestId('board-ads')).toBeInTheDocument();
  });

  it.each([...CREDENTIAL_ROUTE_IDS])(
    'loads no analytics or ads on %s',
    async (routeId) => {
      // A localized URL: the decision follows the matched route, not the path.
      await renderAt('/nl/localized-slug', [routeId]);
      expect(screen.getByTestId('fixture-header')).toBeInTheDocument();
      expect(screen.queryByTestId('third-party-analytics')).toBeNull();
      expect(screen.queryByTestId('cavuno-analytics')).toBeNull();
      expect(screen.queryByTestId('board-ads')).toBeNull();
    },
  );
});
