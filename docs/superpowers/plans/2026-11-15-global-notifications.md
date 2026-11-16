# OpenShelf Global Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared, accessible OpenShelf notification system and connect it to real user-initiated operations throughout the application.

**Architecture:** `NotificationProvider` owns the typed notification API, stack, deduplication, queue, and lifetimes. `NotificationViewport` renders the stack through a portal using the current theme tokens. Shared context actions and view components publish only confirmed operation results; existing data flows stay authoritative.

**Tech Stack:** React 19, TypeScript, existing Tailwind CSS v4 and `src/index.css`, `lucide-react`, Supabase and Google Drive code already in the project. No new dependency or backend change.

**Spec:** `docs/superpowers/specs/2026-11-15-global-notifications-design.md`

## Global Constraints

- Use in-app toasts, not browser or operating-system notifications.
- Support success, information, warning, error, and in-progress states.
- Long operations begin with an in-progress notification and update that same notification when they finish.
- Keep indeterminate progress indeterminate; display numeric progress only when the underlying operation provides it.
- Allow dismissal by an accessible button; Escape dismisses a toast only while focus is inside the notification viewport.
- Pause auto-dismiss while a notification is hovered or focused. Do not interrupt focus when one appears.
- Respect `prefers-reduced-motion`.
- Limit the visible stack to three notifications and deduplicate repeated identical events.
- Keep field validation beside its field and reader position autosave status in the reader; avoid duplicate inline and toast messages.
- Emit notifications only after actual operation results; cancellation and no-op actions do not show success.
- Preserve existing database, storage, Drive, EPUB, speech, authentication, and access-control flows. Add no backend tables or APIs.
- Keep messages concise and free of raw backend errors or personal data.

---

### Task 1: Add the notification state and typed API

**Files:**
- Create: `src/context/NotificationContext.tsx`

**Interfaces:**
- Produce `NotificationLevel = 'success' | 'info' | 'warning' | 'error' | 'progress'`.
- Produce `NotificationInput` with required `level`, `title`, `message`, and optional `action: { label: string; onSelect: () => void }`, `durationMs`, and `showAfterMs` (used only for `progress`).
- Produce `NotificationRecord extends NotificationInput` with `id`, `createdAt`, `remainingMs`, and `paused` fields for rendering and timer management.
- Produce `NotificationId = string` and `NotificationApi` with `notify(input): NotificationId`, `update(id, input): void`, `dismiss(id): void`, `pause(id): void`, and `resume(id): void`.
- Export `NotificationProvider` and `useNotifications()`; the hook throws a clear error outside the provider.

The shared types should have this shape:

```ts
export type NotificationLevel = 'success' | 'info' | 'warning' | 'error' | 'progress';

export interface NotificationInput {
  level: NotificationLevel;
  title: string;
  message: string;
  action?: { label: string; onSelect: () => void };
  durationMs?: number;
  showAfterMs?: number;
}

export interface NotificationApi {
  notify(input: NotificationInput): string;
  update(id: string, input: NotificationInput): void;
  dismiss(id: string): void;
  pause(id: string): void;
  resume(id: string): void;
}
```

- [ ] Define the notification input, record, action, and API types in `NotificationContext.tsx`.
- [ ] Implement `notify` with a stable unique ID, same-message deduplication, and an in-memory list. Keep no more than three records visible; retain excess records in FIFO order until a visible slot opens.
- [ ] Implement `update` so a caller can change a progress notification to success or error without changing its ID or creating another card.
- [ ] Implement `dismiss`, `pause`, and `resume`; progress notifications and errors with recovery actions do not auto-dismiss.
- [ ] Set defaults: success 4,500 ms; info 5,500 ms; warning 8,000 ms; non-actionable error 10,000 ms; progress and actionable error persist. Use caller-supplied duration only for non-persistent levels.
- [ ] Delay progress visibility by 450 ms by default to prevent a loading toast flash on quick operations. If the operation resolves before the delay, show its final result immediately; if it is canceled, dismiss the pending ID without displaying a toast.
- [ ] Add provider-owned timers that pause on hover/focus and clean up on dismissal/unmount. When a visible item closes, promote the oldest queued item.

**Check:** Run `npm run build` after the API is introduced to catch React and TypeScript errors; do not add or run a test suite unless requested.

### Task 2: Render the accessible, themed notification viewport

**Files:**
- Create: `src/components/common/NotificationViewport.tsx`
- Modify: `src/context/NotificationContext.tsx`
- Modify: `src/index.css`

**Consumes:** `NotificationApi` and the notification record types from Task 1.

The provider renders the single shared viewport as part of its subtree:

```tsx
<NotificationContext.Provider value={api}>
  {children}
  <NotificationViewport
    notifications={visibleNotifications}
    onDismiss={api.dismiss}
    onPause={api.pause}
    onResume={api.resume}
  />
</NotificationContext.Provider>
```

`NotificationViewportProps` accepts `notifications: NotificationRecord[]` and the three ID-based callbacks shown above; it does not own timers or duplicate the queue.

- [ ] Render the viewport from `NotificationProvider` with `createPortal(..., document.body)` so app panels and scroll containers cannot clip it.
- [ ] Render a semantic icon, severity label, title, message, optional real action, and an accessible dismiss button for each notification. Use `CircleCheck`, `Info`, `TriangleAlert`, `CircleX`, and `LoaderCircle` from `lucide-react` or the closest existing exports.
- [ ] Give routine updates a polite live region and blocking errors an assertive live region; do not put the whole changing stack into an assertive region.
- [ ] Pause/resume the corresponding timer on pointer enter/leave and focus enter/leave. Add an Escape listener that dismisses a toast only while focus is inside the viewport; leave unrelated dialog Escape handling intact.
- [ ] Style the desktop stack at lower right and the mobile stack centered above `.mobile-navigation` and `env(safe-area-inset-bottom)`. Set a z-index above the reader selection dock (`z-index: 60`), auth overlay, and app header.
- [ ] Use existing semantic tokens for surfaces, ink, borders, and status colors; include explicit status text/icon so color is not the only cue. Provide visible focus, 44px dismiss targets, and stable width at 320px.
- [ ] Animate entry/exit with opacity and a small transform; disable spatial animation and transitions under `prefers-reduced-motion`.

**Check:** Run `npm run build`; inspect the component source for portal layering, theme-token usage, and all five levels.

### Task 3: Mount the system and notify shared account/shelf actions

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/context/ReadingContext.tsx`

**Consumes:** `NotificationProvider` and `useNotifications()` from Task 1.

- [ ] Wrap `ReadingProvider` and `MainContent` with `NotificationProvider` inside `ThemeProvider`; keep the host mounted across route changes.
- [ ] In `ReadingProvider`, call `useNotifications()` once. In the auth-state listener, show sign-in success only for a new `SIGNED_IN` event, not for `INITIAL_SESSION`, `TOKEN_REFRESHED`, or a restored session.
- [ ] In `toggleBookShelved`, show “Added to your shelf” or “Removed from your shelf” only after the matching Supabase write succeeds. On failure, show a safe error and do not mutate local IDs. Do not also write the same operation error to `authError` because `MainContent` renders that as a second banner.
- [ ] In remote `updateReadingSettings`, show an error only if the Supabase update fails. Keep immediate local preference changes and theme changes silent; send the update failure to notifications instead of the general `authError` banner.
- [ ] Keep catalog load failure in its existing recovery banner with its retry action; do not also toast the same failure.

Use the auth event to distinguish an actual sign-in from session restoration:

```ts
if (event === 'SIGNED_IN' && session?.user.id !== previousUserId) {
  notify({ level: 'success', title: 'You’re signed in', message: 'Your shelf is ready.' });
}
```

**Check:** Run `npm run build`; inspect the auth event guard to confirm restored sessions cannot generate a false success toast.

### Task 4: Cover authentication, import, and saved-word actions

**Files:**
- Modify: `src/components/common/AuthModal.tsx`
- Modify: `src/components/views/MyShelfView.tsx`
- Modify: `src/components/views/SavedWordsView.tsx`

**Consumes:** `useNotifications()` and the progress/update API from Task 1.

- [ ] In `AuthModal`, retain field/form errors beside the form. Use one information notification for a successful email confirmation or magic-link request only if the current form state is not already presenting the same success message. Let the confirmed auth-state event in `ReadingContext` report completed sign-in.
- [ ] In `AuthModal`, keep client-side field validation inline; show API sign-in failures as one error toast and remove the duplicate form-level copy for that same API failure. Keep email confirmation feedback inline if the modal already explains the next step.
- [ ] In `MyShelfView`, replace the `driveNotice`/success-only feedback with one progress notification per Drive connect/pick/import or device upload operation. Update it after actual success; dismiss it quietly when the user cancels the Google Picker or the file chooser; send operation failures to one actionable error toast rather than also assigning the operation error to `error`.
- [ ] Keep the Drive selection and device-upload data flows unchanged: selected Drive file must be remembered in Supabase and added to the shelf before showing success; device file must validate as EPUB, upload to Drive, and be remembered before showing success.
- [ ] Preserve local inline errors for loading the personal-book list; do not show a duplicate background-load toast.
- [ ] In `SavedWordsView`, show success only after delete succeeds; show an error toast if delete fails without also setting the shared inline `error`. Keep load errors inline and keep search/pronunciation start silent. Use a notification only if speech synthesis is unavailable or returns an actual error.
- [ ] Attach `onerror` to the `SpeechSynthesisUtterance` used by `pronounce`; ignore canceled/interrupted speech and notify only on an actual unsupported/error result.
- [ ] Remove stale success/error state only when its replacement notification is wired, so an error never disappears without another recovery path.

**Check:** Run `npm run build`; review that cancellation has no success message and an unsuccessful Drive or shelf write cannot become a success notification.

### Task 5: Cover reader actions without autosave spam

**Files:**
- Modify: `src/components/views/ReaderView.tsx`

**Consumes:** `useNotifications()` and the progress/update API from Task 1.

- [ ] For bookmark, highlight, note, and vocabulary saves, request a progress notification with `showAfterMs: 450`; short writes show only the final success, while longer writes update the same ID from progress to success/error. Send mutation failures to the toast API; keep EPUB opening and background reading-position failures in the existing inline reader state.
- [ ] For removing an annotation, update the UI and show success only after the annotation delete succeeds; surface a failure through an error notification.
- [ ] Keep `setStatus` for opening the book and reading-position autosave; never emit a toast for each relocated location/page turn.
- [ ] Report unsupported speech synthesis and actual speech errors through error notifications; keep normal speak, pause, resume, and stop silent.
- [ ] Remove corresponding inline operation errors when the toast replaces them, while preserving EPUB-open failure inline with its existing page context.

**Check:** Run `npm run build`; inspect each write catch branch to ensure a failure cannot leave a persistent progress toast or show success.

### Task 6: Cover Studio operations and preference failures

**Files:**
- Modify: `src/components/views/AdminView.tsx`
- Modify: `src/context/ReadingContext.tsx`

**Consumes:** `useNotifications()` and the progress/update API from Task 1.

- [ ] Change the admin `run` helper to accept the operation’s exact success title/message, request one progress toast with `showAfterMs: 450`, update it to success after the action and data refresh both finish, and update it to a recovery error on failure. Do not set the same run error into the admin inline operation error; keep access-check and initial data-load errors on the gate.
- [ ] Pass truthful messages for book create/edit, publication status change, category create/delete, R2 usage refresh, and confirmed book deletion. Never show a success result for a cancelled confirmation or failed storage/database request.
- [ ] Remove duplicate admin `notice` and operation-level inline error output once the toast owns those results. Keep administrator access and initial list-loading failures on their existing page gate because the user needs those in place to proceed.
- [ ] Keep all CRUD requests, validation, storage calls, and permission checks unchanged.

**Check:** Run `npm run build`; inspect every `run` call site to confirm it supplies a truthful result message and preserves the existing `busy` state.

### Task 7: Integrate and review the full notification surface

**Files:**
- Review: `src/context/NotificationContext.tsx`
- Review: `src/components/common/NotificationViewport.tsx`
- Review: `src/App.tsx`
- Review: `src/context/ReadingContext.tsx`
- Review: `src/components/common/AuthModal.tsx`
- Review: `src/components/views/MyShelfView.tsx`
- Review: `src/components/views/SavedWordsView.tsx`
- Review: `src/components/views/ReaderView.tsx`
- Review: `src/components/views/AdminView.tsx`
- Review: `src/index.css`

- [ ] Run `npm run build` and fix compilation or type errors without changing existing backend flows.
- [ ] Run `npm run lint` and fix new findings in the touched files without broad unrelated cleanup.
- [ ] Inspect actual viewport rendering in light and dark themes at desktop and mobile widths; verify notifications stay above app controls, avoid bottom navigation and the reader selection dock, and do not cause horizontal overflow.
- [ ] Manually follow available real actions: shelf toggle, saved-word removal, reader save actions when a real EPUB is available, import cancellation, and available Studio actions. Do not upload a personal file or delete a real catalog item as part of review.
- [ ] Check reduced-motion mode, keyboard focus, Escape dismissal while a toast is focused, pause/resume timer behavior, stack limit, duplicate suppression, and progress-to-result updates.
- [ ] Review the final diff and ensure only the notification feature files changed in this implementation batch; preserve the existing uncommitted redesign changes.

