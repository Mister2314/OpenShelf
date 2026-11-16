# OpenShelf interface checks — 15 November 2026

## Scope and evidence

Reviewed Explore, book details, My Shelf/import, Saved Words, Studio, reader preferences/annotations, authentication, and shared navigation. Used the actual local site for public/member surfaces and an isolated local fixture for administrator actions and annotation mutations. The browser account did not have administrator access; no live catalog records or permissions were changed.

Browser checks covered 1440px/1280px desktop, 390px mobile, and focused 320px Studio/reader checks, in light and dark themes. A rendered-DOM contrast scan composites foreground alpha over ancestor backgrounds and checks direct text nodes at 4.5:1 (3:1 for large text). Final inspected states had no detected text-contrast failures or horizontal page overflow. This is a targeted check, not a full WCAG certification; arbitrary book artwork and EPUB publisher styling are outside that scan.

## Fixed

- My Shelf's inverse import panel used the dark theme's dark surface token as its text color. It now has stable light text in both themes, including progress copy.
- Shared masthead, hero footnote, and cover metadata had low-contrast translucent text. Increased text opacity.
- Authentication editorial heading, selected tabs, input labels/autocomplete, and narrow password-label layout were corrected. Tailwind dark variants now follow the app's class-based theme.
- Interactive control boundaries use a dedicated token: light #858B94 gives 3.40:1 on the surface and 3.07:1 on the canvas; dark #626D80 gives 3.12:1 on the surface.
- Studio now separates inventory, editor, and category management; explains draft/publish/file states; loads storage totals automatically; formats sizes; and keeps storage errors independent of catalog availability.
- Replaced native select menus in Studio and reader settings/speech controls with a labeled keyboard-operable custom listbox.
- Reader passage links scroll to and focus the reading area. Added selection-level bookmarking, visible filter/action borders, and centered 44×44 delete controls.

## Interaction checks

- Automatic storage: fixture with one EPUB showed 2.0 KB / 1 stored file without clicking Refresh.
- Storage failure: Unavailable + retry control appeared while the catalog remained usable.
- Added a category in isolated data: appeared immediately and was selected in the open editor.
- Saved a draft without an EPUB: appeared in catalog with Publish disabled and an explanatory message.
- Custom menus: Enter opens/chooses, Home/End selects boundary items, status filtering changes catalog results; mouse selection changes reader page palette.
- Delete confirmation: described the effect, cancellation preserved the item and returned focus to the trigger.
- Reader: selected a word in a real fixture EPUB, saved a bookmark and a note, and verified the resulting entries and counts.
- Go to passage: opened the saved CFI, scrolled back to the reader, focused “Book reading area,” and announced completion.
- Charcoal reading preference: actual iframe body used rgb(28,27,25) background and rgb(237,233,225) text.
- Annotation delete buttons measured exactly 44×44; mobile filter wrapping stayed inside the viewport at 320px.

## Reproduce the isolated checks

Run `node tests/ui/serve.mjs`, then open:

- `http://127.0.0.1:5175/tests/ui/index.html?theme=light`
- Same URL with `theme=dark`
- Add `view=reader` for EPUB/annotation checks, `view=auth` for sign-in layouts, or `usageError=1` for storage failure.

All catalog/annotation changes in this fixture are memory-only and reset on reload. Supabase and storage imports are replaced only in this separate test server. Production build configuration is unchanged. File uploads are deliberately disabled in the fixture.

Build passed. Lint completed without errors; existing context/hook warnings remain. The UI detector reported no findings in the changed component targets.
