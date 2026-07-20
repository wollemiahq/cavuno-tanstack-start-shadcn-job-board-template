# README media — shot list

The README references the images below from `docs/media/`. They are **not yet
captured** — this file is the spec for capturing them. Shoot each on the
**sandbox board** (`pk_c2f66367a3abaa6bafd00fd3c2de3297`) at **1440×900**,
light theme, real SSR (serve the production build, e.g. `pnpm run preview`),
unless noted. Filenames must match exactly so the README image tags resolve.

Some equivalent captures already exist under
[`../release-evidence/`](../release-evidence/README.md) and can be reused or
re-shot to hero quality — noted per row.

| File | Shows | Route / how to reach it | Reuse from release-evidence? |
|---|---|---|---|
| `home.png` | The hero: real sandbox jobs + company discovery cards | `/` (anonymous) | Yes — `home-desktop-light-1440x900.png` |
| `persona-switcher.png` | The preview toolbar open, showing the 8 personas under Candidates / Employers | Any page; open the bottom-left toolbar persona menu | No — must be captured (toolbar is sandbox-only) |
| `kanban.png` | The employer applicant pipeline as a drag-and-drop kanban, ideally mid-drag or with a drop indicator visible | Switch to `employer-admin`, open a job's **Applicants** (`/employers/companies/:slug/jobs/:jobId/applicants`) | No — release-evidence only has the empty "connect a company" dashboard |
| `captured-emails.png` | The captured-email viewer with a row expanded showing a rendered HTML body | Toolbar → **Emails**, expand a message | No — must be captured |
| `tour.gif` _(optional)_ | Animated tour: switching personas, dragging an applicant across the kanban, reading a captured email, and paying with a test card | Drive the [`DEMO.md`](../DEMO.md) script | No — record separately |

## Notes

- The **kanban** and **captured-emails** shots require an
  `employer-admin`-owned company with applicants and captured outbound mail.
  As recorded in [`../release-evidence/README.md`](../release-evidence/README.md),
  the committed sandbox historically lacked an employer-owned company and a
  verified inbox for some captures — **reseed** first (toolbar → Reseed) and
  confirm the state is populated before shooting.
- Keep these lossless PNGs reasonably sized; crop to the relevant surface
  rather than the whole browser chrome.
- The animated tour GIF must be **recorded separately** — nothing in this repo
  generates it.
