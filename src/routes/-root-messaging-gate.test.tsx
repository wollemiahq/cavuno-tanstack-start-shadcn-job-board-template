// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Route } from './__root';
interface FixtureViewer {
  id: string;
  emailVerified: boolean;
}
interface FixtureRouterState {
  location: { pathname: string; search: Record<string, string> };
  matches: never[];
}
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
  }) => select({ location: { pathname: '/', search: {} }, matches: [] }),
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
  AnalyticsScripts: () => null,
}));
vi.mock('@/components/board-analytics-boot', () => ({
  BoardAnalyticsBoot: () => null,
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
  BoardAdsBoot: () => null,
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe('root messaging verification gate', () => {
  it.each([
    [false, true, false],
    [true, true, true],
    [true, false, false],
  ])(
    'verified=%s messaging=%s permits polling=%s',
    async (verified, messaging, permitted) => {
      session.user = { id: 'fixture-viewer', emailVerified: verified };
      // SAFETY: RootLayout and RootChrome consume these shell fields; child components that need the remaining loader data are mocked above.
      vi.spyOn(Route, 'useLoaderData').mockReturnValue({
        board: {
          name: 'Fixture board',
          slug: 'fixture',
          language: 'en',
          features: { messaging },
          analytics: { cookieConsentRequired: false },
          ads: {},
          talentDirectoryVisibility: 'off',
        },
        offerGate: {},
        publishableKey: 'fixture-public',
      } as ReturnType<typeof Route.useLoaderData>);
      const Layout = Route.options.component!;
      await act(async () => {
        render(<Layout />);
      });
      expect(screen.getByTestId('fixture-header')).toBeInTheDocument();
      if (permitted) {
        expect(
          await screen.findByTestId('nav-polling-enabled'),
        ).toBeInTheDocument();
        expect(
          await screen.findByTestId('dock-polling-mounted'),
        ).toBeInTheDocument();
      } else {
        if (messaging)
          expect(
            await screen.findByTestId('nav-polling-disabled'),
          ).toBeInTheDocument();
        expect(screen.queryByTestId('nav-polling-enabled')).toBeNull();
        expect(screen.queryByTestId('dock-polling-mounted')).toBeNull();
      }
    },
  );
});
