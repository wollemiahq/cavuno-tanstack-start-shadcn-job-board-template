import { LegalPlaceholderCallout } from './placeholder-callout';

import type { LegalLocale, LegalPageContent } from './types';

/** Titles match `breadcrumbs_about` per locale so h1 / title / crumb agree. */
export const aboutContent: Record<LegalLocale, LegalPageContent> = {
  en: {
    title: 'About',
    description:
      'Placeholder about page. Replace this description and body before launch.',
    Body: function AboutBodyEn() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Who we are</h2>
          <p>
            Replace this section with a short introduction to your organization
            or board.
          </p>
          <h2>What this board is for</h2>
          <p>
            Replace this section with the purpose of the board and who it
            serves.
          </p>
          <h2>How to contact us</h2>
          <p>
            Replace this section with the public contact details you want
            candidates and employers to use.
          </p>
        </>
      );
    },
  },
  de: {
    title: 'Über uns',
    description:
      'Platzhalter-About-Seite. Beschreibung und Inhalt vor dem Launch ersetzen.',
    Body: function AboutBodyDe() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Wer wir sind</h2>
          <p>
            Ersetzen Sie diesen Abschnitt durch eine kurze Vorstellung Ihrer
            Organisation oder Ihres Boards.
          </p>
          <h2>Wofür dieses Board ist</h2>
          <p>
            Ersetzen Sie diesen Abschnitt durch den Zweck des Boards und die
            Zielgruppe.
          </p>
          <h2>So erreichen Sie uns</h2>
          <p>
            Ersetzen Sie diesen Abschnitt durch die öffentlichen Kontaktdaten
            für Kandidaten und Arbeitgeber.
          </p>
        </>
      );
    },
  },
  fr: {
    title: 'À propos',
    description:
      "Page à propos d'espace réservé. Remplacez cette description et le corps avant le lancement.",
    Body: function AboutBodyFr() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Qui nous sommes</h2>
          <p>
            Remplacez cette section par une courte présentation de votre
            organisation ou board.
          </p>
          <h2>À quoi sert ce board</h2>
          <p>
            Remplacez cette section par l&apos;objectif du board et le public
            qu&apos;il sert.
          </p>
          <h2>Nous contacter</h2>
          <p>
            Remplacez cette section par les coordonnées publiques destinées aux
            candidats et employeurs.
          </p>
        </>
      );
    },
  },
};
