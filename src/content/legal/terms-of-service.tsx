import { LegalPlaceholderCallout } from './placeholder-callout';

import type { LegalLocale, LegalPageContent } from './types';

/** Titles match `breadcrumbs_termsOfService` per locale. */
export const termsOfServiceContent = {
  en: {
    title: 'Terms of Service',
    description:
      'Placeholder terms of service. Replace this description and body before launch.',
    Body: function TermsOfServiceBodyEn() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>What this page should cover</h2>
          <p>
            Replace this section with your terms of service after legal review.
            Do not leave template scaffolding in production.
          </p>
          <h2>What to document</h2>
          <p>
            Operators typically describe who may use the board, acceptable use,
            accounts, and liability limits. Write those rules for your product —
            this template does not state them.
          </p>
          <h2>How to contact us</h2>
          <p>
            Replace this section with the contact channel for terms questions.
          </p>
        </>
      );
    },
  },
  de: {
    title: 'Nutzungsbedingungen',
    description:
      'Platzhalter-Nutzungsbedingungen. Beschreibung und Inhalt vor dem Launch ersetzen.',
    Body: function TermsOfServiceBodyDe() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Was diese Seite abdecken sollte</h2>
          <p>
            Ersetzen Sie diesen Abschnitt nach rechtlicher Prüfung durch Ihre
            Nutzungsbedingungen. Lassen Sie keine Template-Gerüste in der
            Produktion.
          </p>
          <h2>Was zu dokumentieren ist</h2>
          <p>
            Betreiber beschreiben üblicherweise, wer das Board nutzen darf,
            zulässige Nutzung, Konten und Haftungsgrenzen. Formulieren Sie das
            für Ihr Produkt — dieses Template enthält keine solchen Regeln.
          </p>
          <h2>So erreichen Sie uns</h2>
          <p>
            Ersetzen Sie diesen Abschnitt durch den Kontaktweg für Fragen zu den
            Nutzungsbedingungen.
          </p>
        </>
      );
    },
  },
  fr: {
    title: "Conditions d'utilisation",
    description:
      "Conditions d'utilisation d'espace réservé. Remplacez cette description et le corps avant le lancement.",
    Body: function TermsOfServiceBodyFr() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Ce que cette page doit couvrir</h2>
          <p>
            Remplacez cette section par vos conditions d&apos;utilisation après
            relecture juridique. Ne laissez pas le contenu modèle en production.
          </p>
          <h2>Ce qu&apos;il faut documenter</h2>
          <p>
            Les opérateurs décrivent généralement qui peut utiliser le board,
            l&apos;usage acceptable, les comptes et les limites de
            responsabilité. Rédigez ces règles pour votre produit — ce modèle ne
            les énonce pas.
          </p>
          <h2>Nous contacter</h2>
          <p>
            Remplacez cette section par le canal de contact pour les questions
            sur les conditions.
          </p>
        </>
      );
    },
  },
  es: {
    title: 'Términos del servicio',
    description:
      'Términos del servicio de ejemplo. Sustituye esta descripción y este contenido antes del lanzamiento.',
    Body: function TermsOfServiceBodyEs() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Qué debe cubrir esta página</h2>
          <p>
            Sustituye esta sección por tus términos del servicio tras la
            revisión legal. No dejes la plantilla en producción.
          </p>
          <h2>Qué documentar</h2>
          <p>
            Normalmente se describe quién puede usar el portal, el uso
            aceptable, las cuentas y los límites de responsabilidad. Redacta
            esas normas para tu producto: esta plantilla no las define.
          </p>
          <h2>Cómo contactarnos</h2>
          <p>
            Sustituye esta sección por el canal de contacto para consultas sobre
            los términos.
          </p>
        </>
      );
    },
  },
  pl: {
    title: 'Regulamin',
    description:
      'Przykładowy regulamin. Zastąp ten opis i treść przed uruchomieniem.',
    Body: function TermsOfServiceBodyPl() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Co powinna zawierać ta strona</h2>
          <p>
            Zastąp tę sekcję swoim regulaminem po weryfikacji prawnej. Nie
            zostawiaj szablonu w wersji produkcyjnej.
          </p>
          <h2>Co udokumentować</h2>
          <p>
            Zwykle opisuje się, kto może korzystać z portalu, zasady
            dopuszczalnego użytkowania, konta oraz granice odpowiedzialności.
            Opisz te zasady dla swojego produktu — szablon ich nie określa.
          </p>
          <h2>Jak się z nami skontaktować</h2>
          <p>
            Zastąp tę sekcję kanałem kontaktu w sprawach dotyczących regulaminu.
          </p>
        </>
      );
    },
  },
} satisfies Record<LegalLocale, LegalPageContent>;
