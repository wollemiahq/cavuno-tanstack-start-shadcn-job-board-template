import {
  boardThemeToCss,
  googleFontsUrl,
  themeMode,
  type ThemeInput,
} from '@cavuno/board/theme';

/**
 * Neutralise any `<style>` breakout in generated theme CSS. `<` and `>`
 * are not valid in a CSS declaration value/selector, so removing them
 * cannot alter a legitimate theme but defeats `…</style><script>…`.
 */
export function sanitizeThemeCss(css: string): string {
  return css.replace(/[<>]/g, '');
}

/**
 * The board's dark/system mode, applied without framework wiring: sets
 * `data-theme-mode` on <html> (for consumer CSS/scripts to key off) and
 * adds the `dark` class when the mode is `dark`, or when it is `system`
 * and the OS prefers dark. `mode` is the closed `themeMode()` union —
 * never operator text — so inlining it into the script is injection-safe.
 * For a flash-free dark mode under SSR, ALSO render the class/dataset on
 * your <html> element server-side (see the wiring docs) — this script
 * then only resolves the OS-dependent `system` case.
 */
export function themeModeScript(mode: 'light' | 'dark' | 'system'): string {
  // Runtime guard, not just the type: this is a public export whose
  // return value lands in a raw <script> sink, so an untyped caller must
  // never be able to smuggle script text through `mode`.
  if (mode !== 'light' && mode !== 'dark' && mode !== 'system') {
    throw new Error(`themeModeScript: invalid mode ${String(mode)}`);
  }
  return `(function(){try{var d=document.documentElement,m='${mode}';d.dataset.themeMode=m;if(m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){d.classList.add('dark')}}catch(e){}})()`;
}

export function BoardTheme({ theme }: { theme: ThemeInput | null }) {
  const css = sanitizeThemeCss(boardThemeToCss(theme));
  // `fonts` is safe by construction: googleFontsUrl always returns a
  // fixed `https://fonts.googleapis.com/css2?…` string (or null), with
  // operator theme data flowing only into the `family=` query params —
  // never the scheme or host — and React escapes the `href` attribute.
  // So there is no javascript:/breakout path to guard here.
  const fonts = googleFontsUrl(theme);
  return (
    <>
      {fonts ? <link rel="stylesheet" href={fonts} /> : null}
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      <script
        dangerouslySetInnerHTML={{ __html: themeModeScript(themeMode(theme)) }}
      />
    </>
  );
}
