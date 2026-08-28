import { getLocale } from '../../paraglide/runtime';

import type { LegalLocale } from './types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Visible, unmistakable placeholder banner for template legal/about pages.
 * Operators must replace the surrounding content before launch — this callout
 * is deliberately not subtle.
 */
const CALLOUT = {
  en: {
    title: 'Placeholder — replace before launch',
    description:
      'This is placeholder content for a template board. Do not ship it as a real policy or about page. Replace the sections below with your own copy (and have counsel review legal pages) before going live.',
  },
  de: {
    title: 'Platzhalter — vor dem Launch ersetzen',
    description:
      'Dies ist Platzhalterinhalt für ein Template-Board. Nicht als echte Richtlinie oder About-Seite veröffentlichen. Ersetzen Sie die Abschnitte unten durch Ihren eigenen Text (und lassen Sie rechtliche Seiten anwaltlich prüfen), bevor Sie live gehen.',
  },
  fr: {
    title: 'Espace réservé — à remplacer avant le lancement',
    description:
      "Ceci est un contenu d'espace réservé pour un board modèle. Ne le publiez pas comme une vraie politique ou page à propos. Remplacez les sections ci-dessous par votre propre texte (et faites relire les pages juridiques) avant la mise en ligne.",
  },
  es: {
    title: 'Contenido de ejemplo — sustituir antes del lanzamiento',
    description:
      'Este es contenido de ejemplo de un portal de plantilla. No lo publiques como una política o una página «Acerca de» reales. Sustituye las secciones siguientes por tu propio texto (y somete las páginas legales a revisión jurídica) antes de salir a producción.',
  },
  pl: {
    title: 'Treść przykładowa — zastąp przed uruchomieniem',
    description:
      'To jest treść przykładowa szablonu portalu. Nie publikuj jej jako prawdziwej polityki ani strony „O nas”. Zastąp poniższe sekcje własnym tekstem (a strony prawne poddaj weryfikacji prawnej) przed uruchomieniem.',
  },
} satisfies Record<LegalLocale, { title: string; description: string }>;

const CALLOUT_LOCALES = [
  'en',
  'de',
  'fr',
  'es',
  'pl',
] as const satisfies readonly LegalLocale[];

function resolveCalloutLocale(locale: string): LegalLocale {
  return CALLOUT_LOCALES.find((candidate) => candidate === locale) ?? 'en';
}

export function LegalPlaceholderCallout() {
  const copy = CALLOUT[resolveCalloutLocale(getLocale())];

  return (
    <div className="not-typeset mb-6">
      <Alert>
        <AlertTitle>{copy.title}</AlertTitle>
        <AlertDescription>{copy.description}</AlertDescription>
      </Alert>
    </div>
  );
}
