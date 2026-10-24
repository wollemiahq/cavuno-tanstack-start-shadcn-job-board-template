import { searchString } from './pagination';

/** Bound public RPC work before iterating, coercing, or deduplicating input. */
export function validateAnchorJobInput(input: { jobSlugs?: unknown }) {
  const values = Array.isArray(input?.jobSlugs)
    ? input.jobSlugs.slice(0, 10)
    : [];
  return {
    jobSlugs: [
      ...new Set(
        values.flatMap((value) => {
          const slug = searchString(value);
          return slug && slug.length <= 200 ? [slug] : [];
        }),
      ),
    ],
  };
}
