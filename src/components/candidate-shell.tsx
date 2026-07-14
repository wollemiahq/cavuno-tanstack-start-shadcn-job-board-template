import {
  CandidateAccountShell,
  type CandidateAccountNavigationItem,
} from "@/components/board/candidate-account-shell";
import { m } from "../paraglide/messages";

export interface CandidateShellIdentity {
  avatarUrl?: string | null;
  title: string;
  badge?: React.ReactNode;
  subtitle?: string | null;
}

export interface CandidateShellViewer {
  displayName?: string | null;
  email: string;
}

export function CandidateShell({
  active,
  candidatePaywall,
  identity,
  rail,
  viewer,
  children,
}: {
  active: string;
  candidatePaywall: boolean;
  identity?: Partial<CandidateShellIdentity>;
  rail?: React.ReactNode;
  viewer: CandidateShellViewer | null;
  children: React.ReactNode;
}) {
  const title = identity?.title ?? viewer?.displayName ?? viewer?.email ?? "";
  const navigation: CandidateAccountNavigationItem[] = [
    { id: "profile", href: "/account", label: m.accountShell_profileNav() },
    {
      id: "saved",
      href: "/account/saved",
      label: m.accountShell_savedJobsNav(),
    },
    { id: "alerts", href: "/me/alerts", label: m.accountShell_jobAlertsNav() },
    {
      id: "applications",
      href: "/me/applications",
      label: m.accountShell_applicationsNav(),
    },
  ];
  if (candidatePaywall) {
    navigation.push({
      id: "subscription",
      href: "/account/access",
      label: m.accountShell_subscriptionNav(),
    });
  }
  navigation.push({ id: "settings", href: "/settings", label: m.accountShell_settingsNav() });

  return (
    <CandidateAccountShell
      identity={{
        avatarUrl: identity?.avatarUrl ?? null,
        title,
        subtitle: identity?.subtitle ?? viewer?.email ?? null,
        badge: identity?.badge,
      }}
      navigation={navigation}
      navigationLabel={m.accountShell_candidateNavigationLabel()}
      activeSection={active}
      rail={rail}
    >
      {children}
    </CandidateAccountShell>
  );
}
