import { LegalPlaceholderCallout } from './placeholder-callout';

import type { LegalLocale, LegalPageContent } from './types';

/**
 * Titles stay "Impressum" (legal term) in en/de; fr uses the catalog
 * `breadcrumbs_impressum` value so h1 / title / crumb agree per locale.
 */
export const impressumContent: Record<LegalLocale, LegalPageContent> = {
  en: {
    title: 'Impressum',
    description:
      'Placeholder impressum. Replace this description and body before launch.',
    Body: function ImpressumBodyEn() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>What this page should cover</h2>
          <p>
            Replace this section with the impressum details required in your
            jurisdiction after legal review. Do not leave template scaffolding
            in production.
          </p>
          <h2>Legal entity facts</h2>
          <p>
            Fill in `legalEntity` in `src/content/legal/types.ts` (legal name
            and address) so the facts card above the body can render. Leave it
            unset until those values are ready.
          </p>
          <h2>How to contact us</h2>
          <p>
            Replace this section with the public contact details required for
            the impressum.
          </p>
        </>
      );
    },
  },
  de: {
    title: 'Impressum',
    description:
      'Platzhalter-Impressum. Beschreibung und Inhalt vor dem Launch ersetzen.',
    Body: function ImpressumBodyDe() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Was diese Seite abdecken sollte</h2>
          <p>
            Ersetzen Sie diesen Abschnitt nach rechtlicher Prüfung durch die in
            Ihrer Rechtsordnung erforderlichen Impressumsangaben. Lassen Sie
            keine Template-Gerüste in der Produktion.
          </p>
          <h2>Angaben zur Rechtsperson</h2>
          <p>
            Tragen Sie `legalEntity` in `src/content/legal/types.ts` ein
            (Rechtsname und Adresse), damit die Faktenkarte über dem Text
            gerendert wird. Lassen Sie sie leer, bis die Werte bereit sind.
          </p>
          <h2>So erreichen Sie uns</h2>
          <p>
            Ersetzen Sie diesen Abschnitt durch die öffentlichen Kontaktdaten,
            die für das Impressum erforderlich sind.
          </p>
        </>
      );
    },
  },
  fr: {
    // Title stays Impressum (legal term) in every locale; FR breadcrumb catalog
    // uses "Mentions légales" — operators may align the catalog if needed.
    title: 'Impressum',
    description:
      "Impressum d'espace réservé. Remplacez cette description et le corps avant le lancement.",
    Body: function ImpressumBodyFr() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Ce que cette page doit couvrir</h2>
          <p>
            Remplacez cette section par les mentions légales requises dans votre
            juridiction après relecture juridique. Ne laissez pas le contenu
            modèle en production.
          </p>
          <h2>Faits sur l&apos;entité légale</h2>
          <p>
            Renseignez `legalEntity` dans `src/content/legal/types.ts` (nom
            légal et adresse) pour que la carte de faits au-dessus du corps
            s&apos;affiche. Laissez-la vide tant que ces valeurs ne sont pas
            prêtes.
          </p>
          <h2>Nous contacter</h2>
          <p>
            Remplacez cette section par les coordonnées publiques requises pour
            les mentions légales.
          </p>
        </>
      );
    },
  },
};
