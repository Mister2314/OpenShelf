# OpenShelf Design System

## Direction: The Living Book Fair

OpenShelf should feel like stepping into a lively independent book fair: covers and typography create the energy, while the underlying system is aligned, deliberate, and easy to use. The interface should be distinctive without turning reading, library management, or EPUB imports into a performance.

The visual world is a contemporary print festival, not a quiet green library. A sharp cobalt field, warm paper, ink-dark type, and small tangerine signals give the catalog a memorable presence. The book itself supplies any additional colors; UI accents stay consistent by role.

## Color system

| Role | Light | Dark | Use |
|---|---|---|---|
| Canvas | `#F5F2EA` | `#11141D` | Main page ground |
| Surface | `#FFFEFA` | `#1B202C` | Forms, panels, reading controls |
| Raised surface | `#EAE7DE` | `#252C3A` | Secondary regions and selected states |
| Ink | `#171A24` | `#F1F0EA` | Primary text |
| Secondary ink | `#515867` | `#BBC1CF` | Supporting text |
| Brand field | `#344AFF` | `#8090FF` | Explore feature, primary navigation state, links |
| Brand ink | `#FFFFFF` | `#101322` | Text on the brand field |
| Signal | `#EF684B` | `#FF8A70` | Small active markers, destructive/attention states where semantic |
| Book accent | `#D9EA71` | `#D9EA71` | Sparse progress and tactile confirmations |
| Border | `#B5B6B4` | `#626D80` | Structural boundaries |

Use the cobalt as a designed region on Explore and as a restrained functional accent elsewhere. Keep semantic warning, error, and success colors distinct from decorative brand colors. Never reduce text contrast to make the composition feel softer.

## Typography

- **Display and editorial headings:** Bricolage Grotesque, variable, with compact line-height and optical size tuned by viewport.
- **Interface and body copy:** DM Sans, variable, for clear controls and long descriptions.
- **EPUB content:** preserve each book's own typography unless the reader preference explicitly overrides it; interface labels must not leak into the book text.
- Use sentence case for labels. Reserve uppercase microcopy for occasional navigation and metadata, not every section heading.
- Keep reading copy to comfortable line lengths; avoid oversized UI headings on task-heavy screens.

## Layout and spacing

- Use a 12-column desktop grid with a 72rem content measure and consistent 24px gutters; expand to 88rem only for cover galleries and admin tables.
- Align masthead, page title, section edges, controls, and cover captions to the same grid.
- Use a 4px base spacing scale and the steps 8, 12, 16, 24, 32, 48, 64, and 88px.
- Desktop navigation stays in a stable masthead. Mobile navigation uses a compact bottom bar with safe-area spacing.
- Use cards only when they express a grouping, state, or action. A border around an empty region is not a composition.

## Shape and depth

- Use 4px corners for tables and structural controls, 10px for media and inputs, and 20px only for large surfaces or floating reader tools.
- Use cover shadows to suggest a physical object. Keep other shadows narrow and purposeful.
- Prefer one strong color field, actual cover art, and deliberate alignment over decorative gradients, blur layers, or repeated floating panels.

## Motion language

- The signature motion is a **cover handoff**: selecting a book visually carries its cover from the catalog into the detail hero, then into the reader entry, using View Transitions when supported and a calm opacity/transform fallback.
- Explore may use a single scroll-linked reveal on the featured cover stage and restrained stagger on entering the book grid. The catalog remains fully visible when motion is reduced or unavailable.
- Button press feedback is tactile but brief; menus and dialogs use opacity and small transforms. Do not animate layout dimensions or reader paragraphs.
- Reader typography and page content never parallax, scroll, scale, or animate automatically.
- Respect `prefers-reduced-motion`; motion is never required to reveal content, state, or functionality.

## Surface rules

### Explore / Library

Lead with real catalog material, an expressive cover-led feature, visible search, and fast filters. Keep the complete library hierarchy obvious and aligned. Do not invent editorial recommendations, labels, or statistics when the source data does not support them.

### Book detail

Use the actual cover as the anchor. Keep title, known author, format, and description on a deliberate baseline. Put the reading action first and shelf/bookmark actions close by. Absent metadata should disappear cleanly.

### My Shelf

Make resume reading the first action for in-progress books. Show real progress, use meaningful groupings, and keep Google Drive and device import paths visually separate. Give signed-out and empty states a useful next action.

### EPUB Reader

Keep book text calm and centered within the chosen reading width. Group settings into a readable control panel. Keep bookmark, table of contents, progress, speech, and annotations available without covering the text. Show text-selection actions in a fixed centered floating dock on desktop and a safe-area-aware bottom sheet on mobile.

### Saved Words

Treat vocabulary as a personal index, not a dashboard. Prioritize the saved word, definition, original passage, source, pronunciation, search, and removal states with one repeatable card grammar.

### Admin / Studio

Use a utilitarian, high-clarity inventory and editor. Keep catalog CRUD, category management, upload validation, publication state, and storage usage intact. Brand color is limited to orientation and primary actions; data remains easy to scan.

### Authentication, dialogs, navigation, and feedback

Keep one clear primary action per dialog. Use aligned labels, visible validation, retained input after recoverable failure, predictable close behavior, and keyboard focus management. Present success or error next to the workflow that caused it.

## Responsive and accessible behavior

- Preserve a deliberate composition at 1440px, 768px, 390px, and 320px; collapse columns before labels, controls, or book titles collide.
- No horizontal page overflow. Inputs and buttons remain reachable with touch and keyboard.
- Controls target at least 44px where practical; focus indicators remain visible and unobscured.
- Light and dark themes use the same hierarchy and clear semantic states.
- Reduced-motion mode removes scroll-linked and non-essential spatial movement while leaving the full page readable.

### Control clarity and contrast

- Use `--color-control-border` (`#858B94` light, `#626D80` dark) for input and button boundaries; these reach 3:1 against the canvas and surface colors. Structural borders can remain softer.
- Dark promotional panels use a fixed dark background with light foreground text. Never use a theme-dependent surface token as the text color on an inverse panel.
- SelectField provides styled single-choice menus with visible labels, arrow/Home/End navigation, Enter selection, Escape dismissal, and focus restoration. Native select menus are not used in Studio or reader settings.
- Studio separates the catalog, book editor, and category management. Storage loads automatically with an independent retry state; size is formatted in B/KB/MB. Empty categories explain Uncategorized and link to category creation.
- Reader annotation filters and passage actions use visible button boundaries. Remove actions use centered 44px square targets. Opening a saved passage scrolls to and focuses the reader; selected text can be bookmarked directly.
