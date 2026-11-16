# OpenShelf Global Notifications Design

## Purpose

Give readers clear, consistent feedback when an action they started succeeds, fails, or takes long enough to need an in-progress update. Notifications must feel native to OpenShelf in light and dark themes, remain accessible, and never invent outcomes or progress.

## User experience

- Use in-app toasts, not browser or operating-system notifications.
- Render a shared toast viewport above the application shell. On desktop, align it to the lower right. On small screens, center it above the bottom navigation and safe-area inset. Keep it above reader selection tools and other overlays.
- Show a concise title and a useful sentence. Add a small, explicit action only when it performs a real recovery step such as retrying or opening sign-in.
- Support success, information, warning, error, and in-progress states. Use the existing OpenShelf color tokens, semantic colors, typography, spacing, borders, and dark theme tokens.
- Long operations begin with an in-progress notification and update that same notification when they finish. Keep indeterminate progress indeterminate; display numeric progress only when the underlying operation provides it.
- Allow dismissal by an accessible button; Escape dismisses a toast only while focus is inside the notification viewport, so app dialogs keep their normal Escape behavior. Pause auto-dismiss while a notification is hovered or focused. Do not interrupt focus when one appears.
- Respect `prefers-reduced-motion`. With reduced motion, notifications appear and leave without spatial animation.
- Limit the visible stack to three notifications. Deduplicate repeated identical events. Success and information notifications auto-dismiss after a short readable interval; warnings remain longer; actionable errors persist until dismissed or resolved. In-progress notifications persist until their operation settles.

## Accessibility

- Use a polite live region for routine updates and an assertive announcement for errors that block the current action.
- Provide an accessible label for dismiss controls; maintain visible keyboard focus and at least 44px touch targets where practical.
- Do not encode severity by color alone. Include a text label or icon with an accessible name.
- Keep messages concise, specific, and free of raw backend errors or personal data.

## Architecture

- Add a notification provider and typed hook at the application root, inside the theme provider and around the reading context so both shared context actions and individual views can publish notifications.
- Add one shared viewport component that owns stacking, timers, keyboard dismissal, and accessible announcements.
- Provide an API to create, update, and dismiss a notification by ID. A long operation should update its existing in-progress notification rather than emit a second unrelated toast.
- Use the provider as a presentation layer only. Existing database, storage, Drive, EPUB, speech, and authentication flows remain authoritative for success or failure.
- Keep field validation beside its field and keep reader position autosave status in the reader. Avoid duplicate inline and toast messages for the same outcome.

## Operation coverage

| Area | Notify for | Keep quiet or local |
|---|---|---|
| Authentication | Failed sign-in; completed sign-in; account confirmation or magic-link request when it succeeds | Field validation remains in the form; no toast while typing |
| Shelf | Book added or removed; failures | Loading and shelf refresh |
| Drive and EPUB import | Connecting, file validation/upload progress, selected book added, completed upload, and actionable failures | Picker cancellation; never claim upload before Drive and shelf writes complete |
| Reader annotations | Bookmark, highlight, note, and vocabulary save/removal results; unsupported speech or speech errors | Page/chapter navigation and each reading-position autosave |
| Saved words | Word removal results and failures | Search and pronunciation start |
| Admin / Studio | Book/category create, edit, publish/unpublish, delete, R2 usage refresh, and failures | Loading the workspace; field validation stays local |
| Catalog/account service | User-actionable failure with the existing recovery path | Background catalog loads and token refresh unless they block the active task |
| Preferences | Failed remote preference save | Theme changes and other immediate local controls |

Notifications are emitted only after the actual operation result is known. Cancellation and no-op actions do not show success. Existing persistence and access-control flows are unchanged.

## Acceptance criteria

1. Every listed user-initiated operation has a success, in-progress, or error response appropriate to its real outcome.
2. A user can see and dismiss notifications in light and dark mode without obscuring primary page controls, mobile navigation, or reader selection actions.
3. Repeated background updates do not create a stream of notifications.
4. Long-running work updates one notification and never displays made-up percentages.
5. Keyboard, screen-reader, and reduced-motion behavior work without changing the underlying operations.
6. Existing inline validation and reader position feedback remain available without duplicating toast messages.

## Out of scope

- A persistent notification inbox or history.
- Browser/OS push notifications or notification permissions.
- New backend tables, APIs, or changes to existing persistence.
- Rewriting any operation's database, auth, storage, Drive, or EPUB data flow.
