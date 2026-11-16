# OpenShelf Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Readers who use OpenShelf both to discover and enjoy books and to read with more deliberate study habits. They may browse the public EPUB catalog, bring their own EPUBs, keep their place, and save useful passages or words.

## Product Purpose

OpenShelf is a browser-based EPUB library and reader. It helps people find a book, read it comfortably, continue across sessions, and keep the notes and vocabulary they want to revisit.

## Positioning

OpenShelf joins a curated EPUB catalog with a personal shelf for public and Google Drive books, an EPUB reader, and lightweight reading notes and vocabulary.

## Operating Context

Readers use the Explore catalog to find a volume, the shelf to organize and resume books, and the reader to focus on EPUB text. They can import an EPUB from Google Drive or upload one from their device. Admins manage the public catalog and categories.

## Capabilities and Constraints

- Google authentication and Google Drive `drive.file` access.
- Public catalog administration, category CRUD, and EPUB uploads through the existing Supabase and Cloudflare R2 integrations.
- EPUB rendering and persisted reading progress through epub.js and the existing database.
- Bookmarks, text highlights, annotations, vocabulary saving, and browser text-to-speech.
- Preserve existing API contracts, data flows, permission scopes, and stored user data.
- Do not invent catalog entries, reader activity, statistics, social proof, or functionality.

## Brand Commitments

- The product name is OpenShelf.
- The visual result should feel distinctive and expressive enough to compete with award-winning digital products, while remaining clear and highly usable.
- Editorial sophistication, gentle warmth, and tactile interaction are prior reference qualities, not permission to copy another product's interface.
- Symmetry, alignment, spacing, and type hierarchy matter strongly to the owner.

## Evidence on Hand

- Existing React application, product flows, catalog data model, and EPUB workflow in this repository.
- Product-specific interface references were not present in the checkout during this redesign; current screenshots and code were inspected instead.
- No verified usage counts, testimonials, or performance claims are available. Do not fabricate them.

## Product Principles

1. Make finding and resuming a book obvious.
2. Keep the reading surface comfortable and uninterrupted.
3. Let real book covers and real reader content carry the visual story.
4. Make imports, saving, and errors explicit and recoverable.
5. Keep every screen usable on small touch screens and with reduced motion.

## Accessibility & Inclusion

Preserve semantic structure, keyboard operation, visible focus, readable contrast, large touch targets, responsive text, and reduced-motion support. Reader controls must never obscure the selected passage or active keyboard focus.
