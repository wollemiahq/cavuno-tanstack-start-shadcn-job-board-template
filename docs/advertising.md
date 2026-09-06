# Advertising placement decisions

Reviewed 6 September 2026. These are starter defaults, not measured revenue
winners. Operators own the frontend and can replace any unit with a bespoke
Google-issued slot. The SDK provides one default unit, not a placement map.

| Surface / position | Default | Revenue and usability rationale |
| --- | --- | --- |
| Jobs, companies and talent search, outer right edge | 160×600, only at 1600px wide and 900px tall | A standard skyscraper uses otherwise spare space without reducing the results/detail columns. Short screens omit it so the complete unit fits beside navigation and the anchor preview. No automatic second rail. |
| Job detail, existing sidebar | 300×250 below the actions card | A standard medium rectangle preserves room for company information and alerts. A 300×600 would push these down. The ad has its own space, separate from Apply/Save controls, and scrolls normally. Mobile omits it and the anchor preview so Apply remains the primary action. |
| Company detail, existing sidebar | 300×250 after company facts | Fits the existing 320px column. No extra column and no large half-page unit displacing company facts. Scrolls normally. Mobile omits it. |
| Blog article, author/sidebar column | 300×250 after author information | Uses the existing reading layout without interrupting paragraphs. A medium rectangle is a reasonable initial inventory choice; a half-page unit is an experiment for long articles, not the default for every post. Mobile omits the sidebar unit. |
| Salary index/detail, blog archives, homepage, about | Bottom anchor only | Preserve full-width charts, tables and cards. Do not invent a sidebar just to hold advertising. |
| Public bottom edge | Google-managed regular bottom anchor | Persistent visibility with Google's dismissal behavior. `collapsed-bottom` disables dynamic/expanding anchors, but Google still chooses dimensions and whether to serve. No custom sticky manual banner. |
| Account, authentication, private messages, posting/payment, legal pages, embeds | No starter anchor or placeholder | Protect private communication and completion of important tasks; avoid ads on thin utility screens. Configure AdSense page exclusions too, because a script already loaded on a public page remains active during client navigation. |

## Policy and geometry

Two ads on a page are allowed; the number alone does not establish compliance.
Keep publisher content predominant and distinguish ads from content and controls.
Google's custom sticky rules are separate: at most one sticky ad in view,
desktop-only, maximum width 300px, and no overlap or underlap. The starter's
manual units therefore scroll normally; Google alone controls the real anchor.

The local preview uses a sample 728×90 desktop / 320×50 mobile footer. This is
an illustrative placeholder, not a promise of Google's actual anchor size.
The preview reserves footer space and does not request ads. Real serving must
also be checked in AdSense's preview on the approved domain.

Enable only the desired Auto ads formats in AdSense. Disable unwanted side
rails, vignettes and in-page placements; the loader's anchor parameter does not
disable those other formats. Use page exclusions for utility/private routes and
mobile Apply conflicts. Do not assume a local route guard unloads Google.

## What to measure before changing sizes

Compare page RPM and viewable impressions by device and page family alongside
job views, Apply completion, search engagement and article reading. Increase
ad area only when the revenue gain holds without a material task-completion
loss. A 300×600 may attract different demand but is not inherently a higher
earning placement. Dedicated slot overrides enable separate unit reporting;
the shared default deliberately favors easy setup.

## Sources

- [AdSense placement best practices](https://support.google.com/adsense/answer/1282097?hl=en): prioritize content and navigation; avoid clutter; consider responsive units.
- [AdSense viewability guidance](https://support.google.com/adsense/answer/6219980?hl=en): content-rich positions, actual screen dimensions, and at least half the unit visible for one continuous second for a viewable display impression.
- [Google Ad Manager size guidance](https://support.google.com/admanager/answer/1100453): standard-size inventory guidance, including 160×600 for sidebars and 300×250 rectangles. This is general inventory guidance from Ad Manager, not an AdSense revenue guarantee.
- [Multiple AdSense units](https://support.google.com/adsense/answer/17958?hl=en): multiple units are permitted; evaluate overall earnings and balance with content.
- [AdSense placement policies](https://support.google.com/adsense/answer/1346295?hl=en): avoid accidental clicks, misleading placement, and ads in private communications.
- [Custom sticky requirements](https://support.google.com/adsense/answer/10734935?hl=en): size, viewport, and non-overlap requirements.
- [Regular bottom anchors](https://support.google.com/adsense/answer/7478225?hl=en): supported loader parameter and its effect on anchor settings.
- [Auto ads settings](https://support.google.com/adsense/answer/9305577?hl=en): format controls and page exclusions.
