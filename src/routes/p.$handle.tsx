import {
  createFileRoute,
  getRouteApi,
  useLocation,
} from '@tanstack/react-router';
import { UserRoundX } from 'lucide-react';

import { m } from '../paraglide/messages';
import { createTalentProfileLoader } from './-talent-loaders';
import { TalentProfilePageView } from './-talent-profile-view';

import { jsonLdHeadScripts } from '@/components/json-ld';
import { Page, PageContent, PageHeader } from '@/components/layout/page';
import { useRootSession } from '@/components/root-session';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { localizePath } from '@/lib/localized-path';
import { startConversation } from '@/server/messaging';
const rootApi = getRouteApi('__root__');

export const Route = createFileRoute('/p/$handle')({
  staticData: { fullBleed: true, ownsMain: true },
  loader: createTalentProfileLoader(),
  head: ({ loaderData }) =>
    loaderData
      ? { ...loaderData.head, scripts: jsonLdHeadScripts(loaderData.jsonLd) }
      : {},
  component: TalentProfilePage,
  notFoundComponent: TalentProfileNotFound,
});

function TalentProfileNotFound() {
  return (
    <Page width="wide">
      <PageContent
        header={<PageHeader title={m.publicProfile_profileFallbackLabel()} />}
      >
        <Empty className="min-h-80 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserRoundX aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{m.publicProfile_notFoundText()}</EmptyTitle>
            <EmptyDescription>
              {m.talentDirectory_notFoundText()}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <a
              href="/talent"
              className={buttonVariants({ variant: 'outline' })}
            >
              {m.talentDirectory_title()}
            </a>
          </EmptyContent>
        </Empty>
      </PageContent>
    </Page>
  );
}

function TalentProfilePage() {
  const { profile } = Route.useLoaderData();
  // Viewer session comes from RootSessionProvider (client after paint);
  // board features stay on the public root loader.
  const { board } = rootApi.useLoaderData();
  const { user } = useRootSession();
  const location = useLocation();
  return (
    <TalentProfilePageView
      profile={profile}
      user={user}
      messagingEnabled={board.features.messaging}
      locationHref={location.href}
      onStartConversation={(input) => startConversation({ data: input })}
      onConversationStarted={(conversationId) =>
        window.location.assign(
          localizePath(`/messages/${encodeURIComponent(conversationId)}`),
        )
      }
    />
  );
}
