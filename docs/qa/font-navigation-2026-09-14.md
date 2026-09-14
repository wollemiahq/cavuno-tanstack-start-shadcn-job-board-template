# Stable fonts during navigation

Switching Jobs → Companies → Jobs caused TanStack's inline CSS element to receive identical `innerHTML` writes. Chrome recreated the loaded Geist `FontFace` objects each time. On the reported live site the font's `max-age=0` policy also caused repeat revalidation requests; the current starter already has immutable asset headers, but still recreated its font faces.

The starter now sets `server.build.inlineCss: false`. Its fingerprinted CSS is a persistent external stylesheet, covered by the existing `/assets/*` immutable cache policy. No font choice, theme, data binding or dependency changes. A cold document needs a stylesheet request; this deliberately trades that request for stable navigation and reuse of the CSS across documents. No cold-load performance improvement is claimed.

## Browser regression

A headless Chrome test ran the unchanged and changed production builds at `http://127.0.0.1:4183`, using the committed public reference board. After fonts loaded, it retained the actual Geist `FontFace` objects, clicked Companies → Jobs → Companies, and checked that `document.fonts.has(face)` remained true for every original object. This catches the bug even when immutable caching hides repeat HTTP requests.

| Navigation             | Before: original font faces retained | After: original font faces retained | After: repeat font requests |
| ---------------------- | ------------------------------------ | ----------------------------------- | --------------------------- |
| Jobs → Companies       | No                                   | Yes                                 | 0                           |
| Companies → Jobs       | No                                   | Yes                                 | 0                           |
| Jobs → Companies again | No                                   | Yes                                 | 0                           |

The browser assertion was red before the change (`Navigation discarded and recreated the loaded Geist font faces`) and green afterward. This is a browser-only regression; the repository's unit environment does not model the browser font loader. No source-text assertion was added as a substitute.

To repeat interactively on a built preview, retain the faces after `await document.fonts.ready`:

```js
window.savedFaces = [...document.fonts].filter((font) => font.family.includes("Geist"));
```

Click Companies, Jobs, then Companies again. After each transition:

```js
console.assert(
  savedFaces.length > 0 && savedFaces.every((font) => document.fonts.has(font)),
  "Navigation recreated the loaded font faces",
);
```

## Verification

- Typecheck, production build, and 2,096 starter tests pass.
- Chrome shows `/assets/index-Dt6DWjy1.css` as the stylesheet; normal Jobs/Companies navigation and page-two pagination preserve Geist.
- [x] **Smoke** — cold Jobs page → Companies → rendered company results.
- [x] **Journeys**
  - [x] Cross-page navigation — Jobs → Companies → Jobs → Companies; original fonts retained.
  - [x] Pagination — Jobs → page 2; page content updates and Geist remains applied.
- [x] **Edges** — fresh browser context loads the stylesheet and font successfully; repeated warm navigation makes no additional font requests.

Existing deployed sites need to adopt this starter change and rebuild before they receive it. This change alone does not redeploy Venture Capital Careers or other existing sites.
