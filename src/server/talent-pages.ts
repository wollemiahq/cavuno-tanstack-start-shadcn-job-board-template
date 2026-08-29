/**
 * Route-family-owned server boundary for talent directory + public profile.
 */
import { isNotFound } from '@cavuno/board';
import { createBreadcrumbJsonLd } from '@cavuno/board/seo';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { getBoard } from '../lib/board';
import { boardAccessMiddleware } from '../lib/board-access-middleware';
import { readBoardContext } from '../lib/board-context-cache';
import { headTitle } from '../lib/page-title';
import { m } from '../paraglide/messages';
import { gatedRead } from './board-access';
import { readTalentDirectory } from './talent-directory-read';

import { breadcrumbsCopy } from '@/copy-groups/breadcrumbs';
import { selfUrl } from '@/lib/self-url';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };
type ProfilePersonJsonLd = {
  '@type': 'Person';
  '@id': string;
  name?: string;
  jobTitle?: string;
  description?: string;
  homeLocation?: string;
  knowsAbout?: string[];
};

function asJsonObjects<T>(value: T): JsonObject[] {
  // SAFETY: Structured data is composed from literal schema.org objects and
  // Board strings, then JSON round-tripped to erase readonly SDK helper types.
  return JSON.parse(JSON.stringify(value)) as JsonObject[];
}

async function seoBase() {
  // Same isolate memo as root/company/job pages — do not re-hit board.context().
  const boardContext = await readBoardContext();
  const origin = new URL(getRequest().url).origin;
  return {
    boardName: boardContext.name,
    language: boardContext.language,
    origin,
  };
}

export const getTalentIndexPage = createServerFn({ method: 'GET' })
  .validator(
    (input: {
      offset: number;
      limit: number;
      q?: string;
      skill?: string;
      jobSearchStatus?: 'actively_looking' | 'open_to_offers' | 'not_looking';
      languages?: string;
      openToRelocate?: 'true' | 'false';
      place?: string;
      sort?: 'relevance' | 'newest';
      seniority?: string;
      permitCountry?: string;
      interestedRole?: string;
    }) => input,
  )
  .middleware([boardAccessMiddleware])
  .handler(({ data, context }) =>
    gatedRead(context, async (headers) => {
      // The directory read does not depend on the SEO base, so it starts
      // first and is awaited below — these used to be two serial waves.
      const directory = readTalentDirectory(() => {
        const query = {
          offset: data.offset,
          q: data.q,
          skill: data.skill,
          limit: data.limit,
          jobSearchStatus: data.jobSearchStatus,
          languages: data.languages,
          openToRelocate: data.openToRelocate,
          place: data.place,
          sort: data.sort,
          seniority: data.seniority,
          permitCountry: data.permitCountry,
          interestedRole: data.interestedRole,
        };
        // SAFETY: Published @cavuno/board 4.13.0 talent.list query omits the
        // frozen filter keys; the live /talent contract on this branch
        // accepts them. Drop when the SDK minor ships.
        return getBoard().talent.list(query as never, { headers });
      });
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
        links: [{ rel: 'canonical', href: selfUrl(seo.origin, '/talent') }],
      };
      const c = breadcrumbsCopy();
      const jsonLd = asJsonObjects(
        [
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            { label: c.talent },
          ]),
        ].filter((e) => e !== null),
      );

      try {
        const result = await directory;
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
            href: selfUrl(seo.origin, `/p/${profile.handle}`),
          },
        ],
      };
      const displayName =
        profile.displayName ?? m.publicProfile_anonymousCandidateLabel();
      const canonical = selfUrl(seo.origin, `/p/${profile.handle}`);
      const c = breadcrumbsCopy();
      const person: ProfilePersonJsonLd = {
        '@type': 'Person',
        '@id': `${canonical}#person`,
      };
      if (profile.displayName) {
        person.name = profile.displayName;
      }
      if (profile.headline) {
        person.jobTitle = profile.headline;
      }
      if (profile.bio) {
        person.description = profile.bio;
      }
      if (profile.location) {
        person.homeLocation = profile.location;
      }
      if (profile.skills.length > 0) {
        person.knowsAbout = profile.skills.map((skill) => skill.name);
      }
      const jsonLd = asJsonObjects(
        [
          {
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            url: canonical,
            mainEntity: person,
          },
          createBreadcrumbJsonLd([
            { label: c.home, href: selfUrl(seo.origin, '/') },
            { label: c.talent, href: `${seo.origin}/talent` },
            { label: displayName },
          ]),
        ].filter((e) => e !== null),
      );
      return { profile, seo, head, jsonLd };
    }),
  );
