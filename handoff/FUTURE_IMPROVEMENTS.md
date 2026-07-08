# Future Improvements

Prioritized ideas for continued development. Not committed roadmap.

## High value

### TOC / navigation

- [ ] Visible mobile “On this page” toggle button in topbar
- [ ] TOC scroll active item into view in right rail when spy updates
- [ ] `prefers-reduced-motion` already respected — add user setting override

### Content

- [ ] Support Postman folder descriptions in nested folders (populate empty TOCs)
- [ ] Render collection/folder pre-request scripts as read-only code blocks
- [ ] Full GFM markdown or MDX for richer docs

### Search

- [ ] Fuzzy search (Fuse.js or similar)
- [ ] Search within current page (headings)
- [ ] Keyboard shortcut to focus TOC

## Performance

- [ ] Virtualize extremely long folder pages (100+ headings)
- [ ] Lazy-load syntax highlighting per visible block
- [ ] Service worker cache for collection JSON
- [ ] Pre-render static HTML at build time (SSG) from collection

## Accessibility

- [ ] `aria-current="location"` already on TOC — extend to nav
- [ ] Focus trap in mobile drawers
- [ ] Announce route changes via live region
- [ ] Skip link to `#content-root`

## API developer experience

- [ ] “Try it” console with mock server (or documented proxy — CORS aware)
- [ ] OpenAPI export from Postman model
- [ ] Postman sync webhook / CI regenerate

## AI / chatbot

See `AI_CHATBOT_PREPARATION.md`:

- [ ] Embeddings pipeline from `toAIExport()`
- [ ] In-doc chat widget with citation links to `#slug--anchor`
- [ ] Semantic search over `searchIndex` + descriptions

## Analytics

- [ ] Page view events per slug (privacy-preserving)
- [ ] Popular endpoint tracking

## Syntax & code

- [ ] Prism/Shiki for accurate highlighting
- [ ] Ruby/Go sample languages
- [ ] Copy entire page as Markdown

## Theming

- [ ] System theme auto (`prefers-color-scheme`) without flash
- [ ] Merchant white-label (CSS variables from config JSON)

## Engineering

- [ ] TypeScript migration (optional)
- [ ] Vitest unit tests for parser + TOC collector
- [ ] Playwright E2E in CI (`test-toc-scroll.mjs`)
- [ ] ESLint + Prettier

## Shopify / deployment

- [ ] Official embed guide (iframe vs theme app proxy)
- [ ] CDN cache headers for collection JSON versioning
