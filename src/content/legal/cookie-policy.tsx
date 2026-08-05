import { LegalPlaceholderCallout } from './placeholder-callout';

import type { LegalLocale, LegalPageContent } from './types';

/** Titles match `breadcrumbs_cookiePolicy` per locale. */
export const cookiePolicyContent: Record<LegalLocale, LegalPageContent> = {
  en: {
    title: 'Cookie Policy',
    description:
      'Placeholder cookie policy. Replace this description and body before launch.',
    Body: function CookiePolicyBodyEn() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>What this page should cover</h2>
          <p>
            Replace this section with your cookie policy after legal review. Do
            not leave template scaffolding in production.
          </p>
          <h2>What to document</h2>
          <p>
            Operators typically list which cookies or similar technologies the
            site uses, their purpose, and how visitors can change preferences.
            Write those facts for your setup — this template does not state
            them.
          </p>
          <h2>How to contact us</h2>
          <p>
            Replace this section with the contact channel for cookie questions.
          </p>
        </>
      );
    },
  },
  de: {
    title: 'Cookie-Richtlinie',
    description:
      'Platzhalter-Cookie-Richtlinie. Beschreibung und Inhalt vor dem Launch ersetzen.',
    Body: function CookiePolicyBodyDe() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Was diese Seite abdecken sollte</h2>
          <p>
            Ersetzen Sie diesen Abschnitt nach rechtlicher Prüfung durch Ihre
            Cookie-Richtlinie. Lassen Sie keine Template-Gerüste in der
            Produktion.
          </p>
          <h2>Was zu dokumentieren ist</h2>
          <p>
            Betreiber listen üblicherweise auf, welche Cookies oder ähnlichen
            Technologien die Site nutzt, wozu, und wie Besucher Einstellungen
            ändern können. Formulieren Sie das für Ihr Setup — dieses Template
            enthält keine solchen Angaben.
          </p>
          <h2>So erreichen Sie uns</h2>
          <p>
            Ersetzen Sie diesen Abschnitt durch den Kontaktweg für Fragen zu
            Cookies.
          </p>
        </>
      );
    },
  },
  fr: {
    title: 'Politique de cookies',
    description:
      "Politique de cookies d'espace réservé. Remplacez cette description et le corps avant le lancement.",
    Body: function CookiePolicyBodyFr() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Ce que cette page doit couvrir</h2>
          <p>
            Remplacez cette section par votre politique de cookies après
            relecture juridique. Ne laissez pas le contenu modèle en production.
          </p>
          <h2>Ce qu&apos;il faut documenter</h2>
          <p>
            Les opérateurs listent généralement les cookies ou technologies
            similaires utilisés, leur finalité et comment les visiteurs peuvent
            modifier leurs préférences. Rédigez ces faits pour votre
            configuration — ce modèle ne les énonce pas.
          </p>
          <h2>Nous contacter</h2>
          <p>
            Remplacez cette section par le canal de contact pour les questions
            sur les cookies.
          </p>
        </>
      );
    },
  },
};
