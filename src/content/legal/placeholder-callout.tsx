import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Visible, unmistakable placeholder banner for template legal/about pages.
 * Operators must replace the surrounding content before launch — this callout
 * is deliberately not subtle.
 */
export function LegalPlaceholderCallout() {
  return (
    <div className="not-typeset mb-6">
      <Alert>
        <AlertTitle>Placeholder — replace before launch</AlertTitle>
        <AlertDescription>
          This is placeholder content for a template board. Do not ship it as a
          real policy or about page. Replace the sections below with your own
          copy (and have counsel review legal pages) before going live.
        </AlertDescription>
      </Alert>
    </div>
  );
}
