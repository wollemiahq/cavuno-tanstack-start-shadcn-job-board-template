import { createFileRoute, notFound } from '@tanstack/react-router';

import { ContactForm } from '../components/contact-form';
import { PageLayout } from '../components/layout/page-layout';
import { m } from '../paraglide/messages';
import { getContact } from '../server/contact';

export const Route = createFileRoute('/contact')({
  staticData: { ownsMain: true },
  loader: async () => {
    const contact = await getContact();
    if (!contact.enabled) throw notFound();
    return contact;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${m.contact_title()} | ${loaderData.boardName}`
          : m.contact_title(),
      },
      { name: 'description', content: m.contact_description() },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { boardName } = Route.useLoaderData();
  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-2xl py-10 md:py-16">
        <div className="mb-8">
          <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
            {m.contact_title()}
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">
            {m.contact_intro({ boardName })}
          </p>
        </div>
        <ContactForm />
      </div>
    </PageLayout>
  );
}
