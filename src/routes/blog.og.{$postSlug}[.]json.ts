import { isNotFound } from '@cavuno/board';
/** Blog OG JSON payload — hosted-parity data route for /blog/og/:slug.json. */
import { createFileRoute, notFound } from '@tanstack/react-router';

import { getBoard } from '../lib/board';
import { themeTokens } from '../theme/resolved';

const CACHE_CONTROL = 'public, max-age=600, stale-while-revalidate=3600';

export const Route = createFileRoute('/blog/og/{$postSlug}.json')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        let post;
        try {
          post = await getBoard().blog.posts.retrieve(params.postSlug);
        } catch (error) {
          if (isNotFound(error)) throw notFound();
          throw error;
        }

        const seo = await getBoard().seo();

        return Response.json(
          {
            boardName: seo.manifest.name,
            primaryColor: themeTokens.light['--primary'],
            post: {
              title: post.title,
              slug: post.slug,
              featureImageUrl: post.coverUrl,
              authors: post.authors.map((author) => author.name),
            },
            slugRedirect:
              post.slug !== params.postSlug.toLowerCase() ? post.slug : null,
          },
          {
            headers: {
              'Cache-Control': CACHE_CONTROL,
            },
          },
        );
      },
    },
  },
});
