import { LegalPlaceholderCallout } from './placeholder-callout';

import type { LegalLocale, LegalPageContent } from './types';

/** Titles match `breadcrumbs_privacyPolicy` per locale. */
export const privacyPolicyContent = {
  en: {
    title: 'Privacy Policy',
    description:
      'Placeholder privacy policy. Replace this description and body before launch.',
    Body: function PrivacyPolicyBodyEn() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>What this page should cover</h2>
          <p>
            Replace this section with your privacy policy after legal review. Do
            not leave template scaffolding in production.
          </p>
          <h2>What to document</h2>
          <p>
            Operators typically list what personal data is collected, why it is
            used, how long it is kept, and how people can contact you. Write
            those facts for your product — this template does not state them.
          </p>
          <h2>How to contact us</h2>
          <p>
            Replace this section with the contact channel for privacy questions.
          </p>
        </>
      );
    },
  },
  de: {
    title: 'Datenschutzerklärung',
    description:
      'Platzhalter-Datenschutzerklärung. Beschreibung und Inhalt vor dem Launch ersetzen.',
    Body: function PrivacyPolicyBodyDe() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Was diese Seite abdecken sollte</h2>
          <p>
            Ersetzen Sie diesen Abschnitt nach rechtlicher Prüfung durch Ihre
            Datenschutzerklärung. Lassen Sie keine Template-Gerüste in der
            Produktion.
          </p>
          <h2>Was zu dokumentieren ist</h2>
          <p>
            Betreiber listen üblicherweise auf, welche personenbezogenen Daten
            erhoben werden, wozu sie genutzt werden, wie lange sie gespeichert
            bleiben und wie man Sie erreichen kann. Formulieren Sie das für Ihr
            Produkt — dieses Template enthält keine solchen Angaben.
          </p>
          <h2>So erreichen Sie uns</h2>
          <p>
            Ersetzen Sie diesen Abschnitt durch den Kontaktweg für
            Datenschutzfragen.
          </p>
        </>
      );
    },
  },
  fr: {
    title: 'Politique de confidentialité',
    description:
      "Politique de confidentialité d'espace réservé. Remplacez cette description et le corps avant le lancement.",
    Body: function PrivacyPolicyBodyFr() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Ce que cette page doit couvrir</h2>
          <p>
            Remplacez cette section par votre politique de confidentialité après
            relecture juridique. Ne laissez pas le contenu modèle en production.
          </p>
          <h2>Ce qu&apos;il faut documenter</h2>
          <p>
            Les opérateurs listent généralement les données personnelles
            collectées, pourquoi elles sont utilisées, combien de temps elles
            sont conservées et comment vous contacter. Rédigez ces faits pour
            votre produit — ce modèle ne les énonce pas.
          </p>
          <h2>Nous contacter</h2>
          <p>
            Remplacez cette section par le canal de contact pour les questions
            de confidentialité.
          </p>
        </>
      );
    },
  },
  es: {
    title: 'Política de privacidad',
    description:
      'Política de privacidad de ejemplo. Sustituye esta descripción y este contenido antes del lanzamiento.',
    Body: function PrivacyPolicyBodyEs() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Qué debe cubrir esta página</h2>
          <p>
            Sustituye esta sección por tu política de privacidad tras la
            revisión legal. No dejes la plantilla en producción.
          </p>
          <h2>Qué documentar</h2>
          <p>
            Normalmente se indica qué datos personales se recogen, con qué
            finalidad, cuánto tiempo se conservan y cómo contactar contigo.
            Redacta esos datos para tu producto: esta plantilla no los define.
          </p>
          <h2>Cómo contactarnos</h2>
          <p>
            Sustituye esta sección por el canal de contacto para consultas sobre
            privacidad.
          </p>
        </>
      );
    },
  },
  pl: {
    title: 'Polityka prywatności',
    description:
      'Przykładowa polityka prywatności. Zastąp ten opis i treść przed uruchomieniem.',
    Body: function PrivacyPolicyBodyPl() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Co powinna zawierać ta strona</h2>
          <p>
            Zastąp tę sekcję swoją polityką prywatności po weryfikacji prawnej.
            Nie zostawiaj szablonu w wersji produkcyjnej.
          </p>
          <h2>Co udokumentować</h2>
          <p>
            Zwykle podaje się, jakie dane osobowe są zbierane, w jakim celu, jak
            długo są przechowywane i jak się z Tobą skontaktować. Opisz te fakty
            dla swojego produktu — szablon ich nie określa.
          </p>
          <h2>Jak się z nami skontaktować</h2>
          <p>
            Zastąp tę sekcję kanałem kontaktu w sprawach dotyczących
            prywatności.
          </p>
        </>
      );
    },
  },
} satisfies Record<LegalLocale, LegalPageContent>;
