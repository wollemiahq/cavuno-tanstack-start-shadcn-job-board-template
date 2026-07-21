# README media — shot list

The README references the images below from `docs/media/`. All four stills
are **captured** (2026-07-21, hosted sandbox board
`pk_c2f66367a3abaa6bafd00fd3c2de3297`, 1440×900 @2x, light theme, dev SSR).
This file remains the re-capture spec: shoot each on the **sandbox board**
at **1440×900**, light theme, unless noted. Filenames must match exactly so
the README image tags resolve.

| File | Shows | Route / how to reach it |
|---|---|---|
| `home.png` | The hero: real sandbox jobs + company discovery cards | `/` (anonymous) |
| `persona-switcher.png` | The preview toolbar open, showing the 8 personas under Candidates / Employers | Any page; open the bottom-left toolbar persona menu |
| `kanban.png` | The employer applicant pipeline as a drag-and-drop kanban, ideally mid-drag or with a drop indicator visible | Switch to `employer-admin`, open a job's **Applicants** (`/employers/companies/:slug/jobs/:jobId/applicants`) |
| `captured-emails.png` | The captured-email viewer with a row expanded showing a rendered HTML body | Toolbar → **Emails**, expand a message |
| `tour.gif` _(optional)_ | Animated tour: switching personas, dragging an applicant across the kanban, reading a captured email, and paying with a test card | Follow the README's Take-the-tour steps |

## Notes

- The **kanban** and **captured-emails** shots require an
  `employer-admin`-owned company with applicants and captured outbound mail —
  **reseed** first (toolbar → Reseed) and confirm the state is populated
  before shooting.
- Keep these lossless PNGs reasonably sized; crop to the relevant surface
  rather than the whole browser chrome.
- The animated tour GIF must be **recorded separately** — nothing in this repo
  generates it.
