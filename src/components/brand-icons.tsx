// Brand-glyph SVGs (same paths as the hosted board's footer icons). Inlined
// because the icon library ships no brand marks and dependencies are fixed.
//
// The monochrome marks below take their colour from `currentColor`, so a
// caller tints them by setting text colour. `GoogleIcon` is the exception:
// Google's mark is four fixed brand colours and must not be recoloured, so it
// carries its own fills.

/**
 * Google's "G" in its required brand colours — an identity mark, so the fills
 * are deliberately literal rather than themed.
 */
export function GoogleIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M23.52 12.273c0-.851-.076-1.67-.218-2.455H12v4.642h6.458a5.52 5.52 0 0 1-2.395 3.622v3.01h3.878c2.269-2.089 3.578-5.165 3.578-8.819z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.956-1.075 7.941-2.908l-3.878-3.01c-1.075.72-2.45 1.145-4.063 1.145-3.125 0-5.77-2.11-6.714-4.947H1.276v3.107A11.995 11.995 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.286 14.28a7.213 7.213 0 0 1 0-4.56V6.613H1.276a11.998 11.998 0 0 0 0 10.774l4.01-3.107z"
      />
      <path
        fill="#EA4335"
        d="M12 4.773c1.762 0 3.344.606 4.589 1.795l3.442-3.442C17.951 1.19 15.235 0 12 0 7.31 0 3.255 2.69 1.276 6.613l4.01 3.107C6.23 6.883 8.875 4.773 12 4.773z"
      />
    </svg>
  );
}

export function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function FacebookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function LinkedInIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

/**
 * Gmail's envelope mark in its required brand colours — like `GoogleIcon`, an
 * identity mark, so the fills are literal rather than themed.
 */
export function GmailIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 18" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M22.364 18h-3.273V6.955L12 12.273 4.909 6.955V18H1.636A1.636 1.636 0 0 1 0 16.364V1.636C0 .733.733 0 1.636 0h.55L12 7.364 21.814 0h.55C23.267 0 24 .733 24 1.636v14.728C24 17.267 23.267 18 22.364 18z"
      />
      <path
        fill="#34A853"
        d="M19.091 18V6.955L24 3.273v13.09c0 .904-.733 1.637-1.636 1.637h-3.273z"
      />
      <path
        fill="#FBBC04"
        d="M22.364 0C23.267 0 24 .733 24 1.636v1.637l-4.909 3.682V0h3.273z"
      />
      <path
        fill="#EA4335"
        d="M4.909 18H1.636A1.636 1.636 0 0 1 0 16.364V3.273l4.909 3.682V18z"
      />
      <path
        fill="#C5221F"
        d="M0 3.273V1.636C0 .733.733 0 1.636 0h3.273v6.955L0 3.273z"
      />
    </svg>
  );
}

/**
 * Yahoo's "Y" on the Mail purple tile — an identity mark, so the fill is
 * literal rather than themed.
 */
export function YahooIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect width="24" height="24" rx="5.5" fill="#6001D2" />
      <path
        fill="#fff"
        d="M6.7 5.2h3.2L12 11l2.1-5.8h3.2L13.4 13.3V18.8h-2.8v-5.5L6.7 5.2z"
      />
    </svg>
  );
}

/**
 * Apple's mark, tinted from `currentColor` so it holds up on light and dark
 * surfaces — there is no single required fill the way Google's G has.
 */
export function AppleIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

/**
 * Proton Mail's envelope mark in Proton purple — an identity mark, so the
 * fill is literal rather than themed.
 */
export function ProtonMailIcon({
  className = 'size-4',
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#6D4AFF"
        d="m15.24 8.998 3.656-3.073v15.81H2.482C1.11 21.735 0 20.609 0 19.223V6.944l7.58 6.38a2.186 2.186 0 0 0 2.871-.042l4.792-4.284zm-5.456 3.538 1.809-1.616a2.438 2.438 0 0 1-1.178-.533L.905 2.395A.552.552 0 0 0 0 2.826v2.811l8.226 6.923a1.186 1.186 0 0 0 1.558-.024zM23.871 2.463a.551.551 0 0 0-.776-.068l-3.199 2.688v16.653h1.623c1.371 0 2.481-1.127 2.481-2.513V2.824a.551.551 0 0 0-.129-.36z"
      />
    </svg>
  );
}

/**
 * Outlook's mark, in Microsoft's Outlook blue — an identity mark, so the fills
 * are literal rather than themed.
 */
export function OutlookIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#0364B8"
        d="M24 12.048c0-.37-.19-.71-.5-.9l-.01-.006-7.94-4.7a1.06 1.06 0 0 0-1.13.005l-7.94 4.7-.01.006c-.31.19-.5.53-.5.9v8.71c0 .69.56 1.24 1.25 1.24h15.53c.69 0 1.25-.55 1.25-1.24v-8.71z"
      />
      <path fill="#0A2767" d="M8.47 8.9h6.9v6.32h-6.9z" />
      <path
        fill="#28A8EA"
        d="M23.5 11.142a1.06 1.06 0 0 0-1.06 0l-9.44 5.42a1.06 1.06 0 0 1-1.06 0l-9.44-5.42a1.06 1.06 0 0 0-1.06 0V20.76c0 .69.56 1.24 1.25 1.24h19.56c.69 0 1.25-.55 1.25-1.24v-9.618z"
        opacity=".6"
      />
      <path
        fill="#0078D4"
        d="M13.06 1.5H1.06C.47 1.5 0 1.97 0 2.56v18.88c0 .59.47 1.06 1.06 1.06h12c.59 0 1.06-.47 1.06-1.06V2.56c0-.59-.47-1.06-1.06-1.06z"
      />
      <path
        fill="#fff"
        d="M7.06 6.62c-2.1 0-3.62 1.7-3.62 4.13 0 2.42 1.52 4.13 3.62 4.13s3.62-1.71 3.62-4.13c0-2.43-1.52-4.13-3.62-4.13zm0 6.62c-1.11 0-1.85-1.02-1.85-2.49 0-1.48.74-2.5 1.85-2.5s1.85 1.02 1.85 2.5c0 1.47-.74 2.49-1.85 2.49z"
      />
    </svg>
  );
}
