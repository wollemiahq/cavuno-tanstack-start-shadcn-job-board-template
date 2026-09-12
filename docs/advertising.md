# Advertising placement decisions

Reviewed 6 September 2026. These are starter defaults, not measured revenue
winners. Operators own the frontend and can replace any unit with a bespoke
Google-issued slot. The SDK provides one default unit, not a placement map.

| Surface / position                                                              | Default                                              | Revenue and usability rationale                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jobs, companies and talent search, outer right edge                             | 160×600, only at 1280px wide and 700px tall          | A standard skyscraper uses otherwise spare space without reducing the results/detail columns, so it covers ordinary laptops as well as large monitors. Short screens omit it so the complete unit fits beside navigation. No automatic second rail — a configured start rail waits for 1600px. |
| Job detail, existing sidebar                                                    | 300×250 below the actions card                       | A standard medium rectangle preserves room for company information and alerts. A 300×600 would push these down. The ad has its own space, separate from Apply/Save controls, and scrolls normally. Mobile omits it so Apply remains the primary action.                                        |
| Company detail, existing sidebar                                                | 300×250 after company facts                          | Fits the existing 320px column. No extra column and no large half-page unit displacing company facts. Scrolls normally. Mobile omits it.                                                                                                                                                       |
| Blog article, author/sidebar column                                             | 300×250 after author information                     | Uses the existing reading layout without interrupting paragraphs. A medium rectangle is a reasonable initial inventory choice; a half-page unit is an experiment for long articles, not the default for every post. Mobile omits the sidebar unit.                                             |
| Salary index/detail, blog archives, homepage, about                             | No manual unit                                       | Preserve full-width charts, tables and cards. Do not invent a sidebar just to hold advertising.                                                                                                                                                                                                |
| Public bottom edge                                                              | Optional Google-managed anchor configured in AdSense | The starter loads the normal script but does not force anchors or simulate their size.                                                                                                                                                                                                         |
| Account, authentication, private messages, posting/payment, legal pages, embeds | No public AdSense boot                               | Configure AdSense page exclusions too, because a script loaded on a public page remains active during client navigation.                                                                                                                                                                       |

## Policy and geometry

Two ads on a page are allowed; the number alone does not establish compliance.
Keep publisher content predominant and distinguish ads from content and controls.
Google's custom sticky rules are separate: at most one sticky ad in view,
desktop-only, maximum width 300px, and no overlap or underlap. The starter's
manual units therefore scroll normally; Google alone controls the real anchor.

The placement preview shows manual units only and reserves no footer space.
To match a compact bottom-anchor setup, enable Auto ads and Anchor ads in AdSense,
select **Bottom only**, turn **Allow dynamic anchors** off, and allow desktop
anchors. Leave intent-driven, automatic in-page, side rail and vignette formats
off unless explicitly wanted. Verify real serving on the deployed domain.
Use page exclusions for utility/private routes and mobile Apply conflicts.
The shared loader intentionally has no `data-overlays`: that attribute can enable
anchors even when disabled in the dashboard. Do not assume a local route guard
unloads Google.

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
- [Bottom-only anchors](https://support.google.com/adsense/answer/7478225?hl=en): supported loader parameter and its effect on anchor settings.
- [Auto ads settings](https://support.google.com/adsense/answer/9305577?hl=en): format controls and page exclusions.

### Floating controls and live anchors

The floating widget stack measures the visible publisher-side fixed Google ad container and moves messaging and other corner controls above it. Resize, dismissal, insertion, removal and viewport changes refresh the offset. Open messaging panels also subtract that space from their maximum height. The observer never changes ad markup or reads the cross-origin creative. It stays mounted across client navigation because Google's loader can outlive the route that loaded it.

AdSense does not expose a documented anchor-height callback. Detection uses the outer Google ad elements and their fixed ancestor geometry, so changes to Google's markup need ongoing live monitoring. Preview and synthetic-container checks exercise the layout behavior; they are not evidence of a real served impression.

The navigation stays at the top of the viewport. The starter does not reserve
space for top anchors or move the header beneath them. Anchor placement and
format are configured in AdSense, and Google controls actual serving.

At widths/heights below the outer rail breakpoint, search results include one 300×250 rectangle after the third result (or after the last result on shorter pages). The unit is outside selectable result cards. It requires at least 332px viewport width to fit the 300px creative plus mobile gutters; it is absent on empty lists and when the wide rail is eligible. This preserves the master/detail widths and exposes the placement on ordinary laptops and phones.
