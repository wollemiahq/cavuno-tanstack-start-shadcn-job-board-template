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
