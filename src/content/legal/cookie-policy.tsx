import { LegalPlaceholderCallout } from './placeholder-callout';

import type { LegalLocale, LegalPageContent } from './types';

/** Titles match `breadcrumbs_cookiePolicy` per locale. */
export const cookiePolicyContent = {
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
  es: {
    title: 'Política de cookies',
    description:
      'Política de cookies de ejemplo. Sustituye esta descripción y este contenido antes del lanzamiento.',
    Body: function CookiePolicyBodyEs() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Qué debe cubrir esta página</h2>
          <p>
            Sustituye esta sección por tu política de cookies tras la revisión
            legal. No dejes la plantilla en producción.
          </p>
          <h2>Qué documentar</h2>
          <p>
            Normalmente se indican las cookies o tecnologías similares que usa
            el sitio, su finalidad y cómo cambiar las preferencias. Redacta esos
            datos para tu configuración: esta plantilla no los define.
          </p>
          <h2>Cómo contactarnos</h2>
          <p>
            Sustituye esta sección por el canal de contacto para consultas sobre
            cookies.
          </p>
        </>
      );
    },
  },
  pl: {
    title: 'Polityka cookies',
    description:
      'Przykładowa polityka cookies. Zastąp ten opis i treść przed uruchomieniem.',
    Body: function CookiePolicyBodyPl() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Co powinna zawierać ta strona</h2>
          <p>
            Zastąp tę sekcję swoją polityką cookies po weryfikacji prawnej. Nie
            zostawiaj szablonu w wersji produkcyjnej.
          </p>
          <h2>Co udokumentować</h2>
          <p>
            Zwykle podaje się, jakich plików cookie lub podobnych technologii
            używa serwis, w jakim celu oraz jak zmienić preferencje. Opisz te
            fakty dla swojej konfiguracji — szablon ich nie określa.
          </p>
          <h2>Jak się z nami skontaktować</h2>
          <p>
            Zastąp tę sekcję kanałem kontaktu w sprawach dotyczących plików
            cookie.
          </p>
        </>
      );
    },
  },
} satisfies Record<LegalLocale, LegalPageContent>;
