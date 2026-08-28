import { LegalPlaceholderCallout } from './placeholder-callout';

import type { LegalLocale, LegalPageContent } from './types';

/** Titles match `breadcrumbs_about` per locale so h1 / title / crumb agree. */
export const aboutContent = {
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
  es: {
    title: 'Acerca de',
    description:
      'Página «Acerca de» de ejemplo. Sustituye esta descripción y este contenido antes del lanzamiento.',
    Body: function AboutBodyEs() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Quiénes somos</h2>
          <p>
            Sustituye esta sección por una breve presentación de tu organización
            o de tu portal.
          </p>
          <h2>Para qué sirve este portal</h2>
          <p>
            Sustituye esta sección por el propósito del portal y por el público
            al que se dirige.
          </p>
          <h2>Cómo contactarnos</h2>
          <p>
            Sustituye esta sección por los datos de contacto públicos que
            quieras ofrecer a candidatos y empresas.
          </p>
        </>
      );
    },
  },
  pl: {
    title: 'O nas',
    description:
      'Przykładowa strona „O nas”. Zastąp ten opis i treść przed uruchomieniem.',
    Body: function AboutBodyPl() {
      return (
        <>
          <LegalPlaceholderCallout />
          <h2>Kim jesteśmy</h2>
          <p>
            Zastąp tę sekcję krótkim przedstawieniem swojej organizacji lub
            portalu.
          </p>
          <h2>Czemu służy ten portal</h2>
          <p>Zastąp tę sekcję opisem celu portalu i grupy, której służy.</p>
          <h2>Jak się z nami skontaktować</h2>
          <p>
            Zastąp tę sekcję publicznymi danymi kontaktowymi dla kandydatów i
            pracodawców.
          </p>
        </>
      );
    },
  },
} satisfies Record<LegalLocale, LegalPageContent>;
