# OpenShelf UI redesign research

Research notes for the full OpenShelf product redesign. The goal is to give the app a distinct, award-caliber editorial identity while keeping discovery and reading fast, clear, and comfortable. An award-style interaction should make the book or reading action more vivid, not make the interface harder to use.

## Useful first-party references

- [Apple Books](https://www.apple.com/apple-books/) presents one coherent destination for discovery, reading, listening, and reading progress. Apple describes curated collections, personalized recommendations, Want to Read, and reading goals as connected parts of the experience. Use this as a product-structure reference, not a visual template.
- [Apple Books user guide](https://support.apple.com/guide/iphone/read-books-iphc1af7c57/27/ios) distinguishes a Home surface for current reading and recommendations from the Library surface for the complete collection. It also documents custom collections and daily goals. OpenShelf can reflect the same mental model: discovery answers “what next?”, shelf answers “what do I have?”, and resume reading is the strongest shelf action.
- [Readwise Reader: highlights, tags, and notes](https://docs.readwise.io/reader/docs/faqs/highlights-tags-notes) describes a keyboard-first reading workflow, annotations in a side margin on wide screens, a focused document view, and ways to keep highlighting from interrupting reading. This is directly relevant to OpenShelf’s selection toolbar, bookmarks, annotations, vocabulary, and reader chrome.
- [Awwwards Mobile Excellence guidelines](https://www.awwwards.com/mobile-excellence-guidelines.pdf) evaluates practical quality alongside presentation: visible search, useful tap targets, legible text, color contrast, streamlined forms, fast first render, and well-sized media. Award-facing work still has to pass these basics.
- [Awwwards PWA book: Designing Installed Experiences](https://pwa-book.awwwards.com/chapter-5) recommends placing key navigation within easy reach on long mobile screens, adding in-app back navigation, and anchoring sheets or popovers where they are comfortable to use. Its other chapters recommend surfacing prompts in context rather than interrupting a focused task.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) requires that focus remain visible (2.4.11), pointer targets reach 24×24 CSS pixels or meet the spacing exception (2.5.8), and drag interactions have a non-drag alternative (2.5.7). For a premium implementation, use larger, separated controls wherever the layout allows.
- [MDN: `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion) and [MDN: scroll-driven animation timelines](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations/Timelines) recommend respecting the operating-system motion preference. Scroll-driven effects should be progressive enhancement; essential content and navigation cannot depend on motion.

## Patterns to carry into OpenShelf

### Explore and library

- Curate a small number of clear entry points (continue reading, a human editorial selection, and the wider catalog) instead of making every content group compete for the same visual weight.
- Keep search visible and useful; pair it with genre/availability filters that can be changed without losing the current query.
- Let actual cover art do most of the visual work. Establish a distinct featured-book composition with real metadata and direct actions; do not decorate empty space with invented reading counts or generic gradients.
- Make cards express one clear action and retain predictable title/author metadata. A dramatic cover treatment should not push metadata below the scan line.

### Book detail

- Treat the cover as the visual anchor and metadata as a clean adjacent editorial column on desktop; stack the same hierarchy on narrow screens.
- Put one primary action (read/resume) first, with shelf and bookmark actions nearby but quieter.
- Show only known details. Keep description length readable and preserve a stable action location when fields are absent.

### My Shelf

- Separate “in progress,” “want to read,” and finished/archived books by meaning, not by arbitrary decorative groups.
- Give each book a visible progress state and a clear resume action; provide useful filtering and sorting without turning the shelf into a data dashboard.
- Keep imports as explicit, independent paths (Google Drive vs local device) with direct status and recovery copy.

### EPUB reader, annotations, vocabulary

- Reading is the quietest product mode. Keep book text central, constrain the measure, and move controls to a revealable bar or side rail rather than layering permanent dashboard chrome over the page.
- Selection actions should appear adjacent to or just below the selected text in a compact floating dock; on small screens, use a bottom sheet that stays above the safe area and never hides the selected passage or keyboard focus.
- Keep highlighting, bookmark, note, and dictionary actions available from both pointer and keyboard. Keep persistent annotation review in a side panel on wide screens, with a clear mobile equivalent.
- Show reading preferences together and provide a visible reading preview so font, size, line spacing, page color, and theme changes are understandable before returning to the text.
- Use short motion to explain transitions between browsing, detail, and reader states. Do not animate paragraphs, page contents, or typography in a way that disrupts comprehension.

### Admin, auth, dialogs, navigation

- Give admin a task-oriented information hierarchy: compact overview, one well-labeled upload form, and a scannable inventory with edit/delete actions grouped per book. Its visual identity should feel related to OpenShelf while remaining more utilitarian.
- Keep authentication focused on one primary provider/action and clearly label any secondary route; show errors beside the relevant form field and preserve the entered data on recoverable errors.
- Use dialog and menu patterns that preserve focus, close predictably, and never cover an active selection. Use a centered dialog for desktop, a bottom sheet for mobile actions, and a clear in-app back control for standalone/mobile contexts.
- Keep the same primary sections on desktop and mobile; change placement to fit reach, rather than hiding essential sections in hover-only menus.

## Motion and expression

- Give the whole product a recognizable signature moment on discovery (for example, selected-cover-to-detail continuity), then keep reading and admin transitions restrained.
- Use motion only to confirm a user action or explain a state change. Prefer opacity and transform, avoid layout shifts, and keep scroll-linked work limited to decorative editorial surfaces.
- Always provide an equivalent static composition under `prefers-reduced-motion: reduce`; no control, text, search result, or state should require animation to become visible.

## Redesign review checklist

1. Explore is editorially distinctive, while search and the full catalog remain obvious.
2. Detail, shelf, reader, vocabulary, admin, auth, menus, dialogs, and empty/error states feel like one product.
3. No invented book data, fake functionality, hidden core actions, or decoration that competes with reading.
4. Desktop, tablet, 390px, and 320px layouts keep a consistent grid and avoid clipped controls or horizontal overflow.
5. Light and dark themes share the same contrast, hierarchy, and state semantics.
6. Keyboard focus, reduced motion, reading comfort, target sizing, and scroll performance are checked alongside visual craft.
