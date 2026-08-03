/**
 * Route-family-owned server boundary for talent directory + public profile.
 */
import { isNotFound } from '@cavuno/board';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { headTitle } from '../lib/page-title';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';
import { readTalentDirectory } from './talent-directory-read';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function asJsonObjects(value: unknown): JsonObject[] {
  return JSON.parse(JSON.stringify(value)) as JsonObject[];
}

async function seoBase() {
  const boardContext = await getBoard().context();
  const origin = new URL(getRequest().url).origin;
  return {
    boardName: boardContext.name,
    language: boardContext.language,
    labels: boardContext.labels,
    origin,
  };
}

export const getTalentIndexPage = createServerFn({ method: 'GET' })
  .validator(
    (input: { offset: number; limit: number; q?: string; skill?: string }) =>
      input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const seo = await seoBase();
      const head = {
        meta: [
          {
            title: headTitle(seo.boardName, m.talentDirectory_title()),
          },
          {
            name: 'description',
            content: m.talentDirectory_metaDescription({
              boardName: seo.boardName,
            }),
          },
        ],
        links: [{ rel: 'canonical', href: `${seo.origin}/talent` }],
      };
      const c = breadcrumbsCopy(seo.language, seo.labels);
      const jsonLd = asJsonObjects(
        [
          createBreadcrumbJsonLd([
            { label: c.home, href: seo.origin },
            { label: c.talent },
          ]),
        ].filter((e) => e !== null),
      );

      try {
        const result = await readTalentDirectory(() =>
          getBoard().talent.list(
            {
              offset: data.offset,
              q: data.q,
              skill: data.skill,
              limit: data.limit,
            },
            { headers },
          ),
        );
        if (result.status === 'restricted') {
          return { seo, page: null, restricted: true as const, head, jsonLd };
        }
        return {
          seo,
          page: result.page,
          restricted: false as const,
          head,
          jsonLd,
        };
      } catch (error) {
        if (isNotFound(error)) throw error;
        throw error;
      }
    }),
  );

export const getTalentProfilePage = createServerFn({ method: 'GET' })
  .validator((input: { handle: string }) => input)
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      const [profile, seo] = await Promise.all([
        getBoard().talent.retrieve(data.handle, { headers }),
        seoBase(),
      ]);
      const title =
        profile.displayName ?? m.publicProfile_profileFallbackLabel();
      const head = {
        meta: [
          { title: headTitle(seo.boardName, title) },
          ...(profile.headline
            ? [{ name: 'description', content: profile.headline }]
            : []),
        ],
        links: [
          {
            rel: 'canonical',
            href: `${seo.origin}/p/${profile.handle}`,
          },
        ],
      };
      const displayName =
        profile.displayName ?? m.publicProfile_anonymousCandidateLabel();
      const canonical = `${seo.origin}/p/${profile.handle}`;
      const c = breadcrumbsCopy(seo.language, seo.labels);
      const jsonLd = asJsonObjects(
        [
          {
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            url: canonical,
            mainEntity: {
              '@type': 'Person',
              '@id': `${canonical}#person`,
              ...(profile.displayName ? { name: profile.displayName } : {}),
              ...(profile.headline ? { jobTitle: profile.headline } : {}),
              ...(profile.bio ? { description: profile.bio } : {}),
              ...(profile.location ? { homeLocation: profile.location } : {}),
              ...(profile.skills.length > 0
                ? { knowsAbout: profile.skills.map((skill) => skill.name) }
                : {}),
            },
          },
          createBreadcrumbJsonLd([
            { label: c.home, href: seo.origin },
            { label: c.talent, href: `${seo.origin}/talent` },
            { label: displayName },
          ]),
        ].filter((e) => e !== null),
      );
      return { profile, seo, head, jsonLd };
    }),
  );
