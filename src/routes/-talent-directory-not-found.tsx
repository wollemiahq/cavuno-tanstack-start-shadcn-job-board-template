/**
 * The talent directory routes' not-found page, in its own module so the
 * `/talent/locations` index does not load the directory view with it.
 */
import { NotFound } from '@/components/app-not-found';
import { Page, PageContent } from '@/components/layout/page';

/**
 * The directory API 404s only when the board has no talent directory (Off),
 * so this is the site's ordinary 404, not an empty directory: no talent
 * wording, matching the head's not-found title. The route owns `<main>`, so
 * the shared page frame supplies the landmark the root shell leaves out.
 */
export function TalentDirectoryNotFound() {
  return (
    <Page width="wide">
      <PageContent>
        <NotFound />
      </PageContent>
    </Page>
  );
}
