# OpenShelf MVP implementation, 2026-11-15

## Existing resources retained
- Supabase: thgqcqfilllldjxxvtzk. Original schema migration was not reapplied.
- R2: openshelf-catalog, private bucket.
- Storage Worker deployed: https://openshelf-storage.openshelf-eb68023f.workers.dev
- Public workers.dev endpoint was explicitly authorized by the user after the first approval review rejected it.
- Existing Google account received administrator membership after the user selected it. Roles are read from the private administrator table, never editable user metadata.

## Implemented code
- Supabase password/Google/magic-link authentication, session subscription, profile creation/loading, sign-out. OAuth redirects to the actual Google login page.
- Public catalog, bookshelf operations, settings saved to profiles. Removed seeded books, users, simulated narration and fabricated statistics.
- Admin metadata CRUD, category create/delete, draft/publish controls, cover HTTPS URL, EPUB validation and upload/replacement/deletion via Worker, actual bucket byte/object usage.
- Worker validates Supabase bearer authorization through the is_admin RPC for mutations and usage. Read access follows Supabase book RLS. R2 credentials are not exposed; Worker uses an R2 binding. Upload size is bounded at 50 MB and EPUB's first uncompressed mimetype entry is checked. Full EPUB parsing also runs in the upload UI. This is not a complete EPUB conformance validator.
- epubjs rendering, nested TOC, previous/next, CFI progress read/write, font/spacing/width/theme settings, selected text, bookmarks/highlights/notes persisted in Supabase.
- Vocabulary save/remove with context and dictionaryapi.dev definitions when available. Missing definitions are explicit.
- Browser SpeechSynthesis chunked chapter/selection playback, pause/resume/stop/rate/voice and cancellation on navigation.
- Google Drive memory-only access tokens, drive.file scope, Picker selection, direct Drive uploads/downloads. Supabase stores personal references and metadata only. Reconnect required after expiry or switching accounts/devices.

## Actual verification
- npm run build: passed before final verification; final run recorded in tool output. Production bundle code split for heavy views.
- npm run lint: exits successfully with React lifecycle/Fast Refresh warnings, not clean-zero-warning.
- Real Supabase transaction tests in supabase/tests/reading_rls.sql passed: nonadmin denial, cross-user book/progress isolation, cross-owner annotation foreign-key rejection, CFI roundtrip, annotations and vocabulary writes. Test data rolled back.
- Actual administrator RPC returned true for the user-approved account.
- Database contains one Google-authenticated user and one profile.
- Browser: Google OAuth reaches Google's sign-in page; unauthenticated administrator access is denied; My Shelf requires sign-in; Drive actions disabled for guests; light/dark switching works.
- Two real, generated EPUB 3 files exist in tests/fixtures, each with two XHTML chapters and navigation.
- npm run test:storage uses those real archives to test Worker auth/origin denial, upload, replacement, exact retrieval bytes, draft privacy, invalid upload, rollback and deletion. External services are isolated test doubles. This is NOT a live R2 end-to-end test.

## Not verified / remaining dependencies
- The test browser does not have the user's Google session. Full authenticated browser journeys (upload to live R2, publish, open rendered EPUB, reload/resume, selection/voice playback) have NOT been completed. No claim that those workflows passed.
- Google Drive: VITE_GOOGLE_CLIENT_ID is populated from the observed Google OAuth client; VITE_GOOGLE_API_KEY and VITE_GOOGLE_APP_ID (Google Cloud project number) are still required. Enable Google Drive API and Google Picker API, add drive.file to the consent screen, and allow http://localhost:5173 and http://127.0.0.1:5173 as authorized JavaScript origins. Restrict the browser API key by origin and Picker API. Do not paste secrets into chat. An OAuth client secret is not needed in browser code.
- Supabase Auth URL configuration must allow the application's actual origin. Production origins also need adding to the Worker's ALLOWED_ORIGINS binding and Google OAuth settings.
- Session persistence, mobile layout and multiple real EPUB rendering are not yet verified in an authenticated browser session.
- Security advisor notes: private.administrators has no RLS policy intentionally (deny direct access); leaked-password protection is disabled in Supabase Auth settings.
- Category rename and bulk user administration are outside this initial UI; catalog admins do not get access to users' private books or notes.

## Files and commands
- server/r2-worker.mjs: deployed Worker source, bindings BOOKS, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, ALLOWED_ORIGINS.
- supabase/migrations/20261115182009_admin_status_rpc.sql: additive, applied admin status RPC migration.
- .env.example: frontend configuration names; .env.local is excluded by *.local.
- npm run dev (port 5173), npm run build, npm run lint, npm run test:storage.
