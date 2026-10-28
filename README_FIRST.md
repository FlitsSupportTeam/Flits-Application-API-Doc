# Flits API Docs — Quick Start (Humans)

Simple guide to run, update, and debug the documentation site. For full engineering detail see **`handoff/`**.

## What is this?

A static API reference site built from your **Postman collection**. It looks and behaves like modern docs (Stripe/Klaviyo style): sidebar navigation, one page per API/folder, code samples, and an “On this page” table of contents.

## Run locally

**You need a local web server.** Opening `index.html` directly will not work (browser blocks loading the JSON).

```powershell
cd c:\Users\admin\Downloads\apiDocCursor
npm run serve
```

Open the URL shown (e.g. `http://localhost:3000`).

**Alternatives:** VS Code “Live Server” on `index.html`, or `python -m http.server 8080`.

## Where is the Postman data?

**Canonical file:**

```
data/Flits App.postman_collection.json
```

To update docs:

1. Export collection from Postman (v2.1 format).
2. Replace that file.
3. Refresh the browser.

To use a different filename, edit `COLLECTION_PATH` in `js/parser/postmanParser.js`.

## How routing works

URLs use the hash:

| URL | Meaning |
|-----|---------|
| `#overview` | Introduction |
| `#flits-loyalty-app` | Folder page |
| `#some-api-slug` | API page |
| `#some-api-slug--query-parameters` | API page, scrolled to section |

Clicking sidebar links changes the hash and loads one page in the center column.

## Project folders (simple)

| Folder | Purpose |
|--------|---------|
| `js/` | All application logic |
| `css/` | Styles |
| `data/` | Postman JSON |
| `handoff/` | Detailed docs for developers / AI |
| `scripts/` | `npm run audit:toc` validation |

## Adding a new API

Usually **no code changes**:

1. Add the request in Postman under the right folder.
2. Re-export the collection to `data/`.
3. Reload the site — sidebar and pages update automatically.

Optional: add description markdown in Postman for Overview and TOC richness.

## Debugging “On this page” not scrolling

1. Open DevTools → Console — look for `[FlitsDoc TOC]` warnings.
2. Confirm you’re on `http://localhost` (not `file://`).
3. Check that clicking changes **`#page-scroll` scroll position** (not the window).
4. Run: `npm run audit:toc` — should pass with 0 issues.
5. Read **`handoff/TOC_SYSTEM.md`** — common regressions are documented.

Quick console test after load:

```javascript
FlitsDoc.scrollToSection('authentication'); // on overview page
```

## Debugging search

- Focus search with `Ctrl+K` (Windows) or `⌘K` (Mac).
- Search uses pre-built index at load — re-export collection if new APIs missing.

## Dark mode

Toggle in top bar; preference saved in browser `localStorage`.

## AI / export (optional)

In browser console after load:

```javascript
FlitsDoc.search('wishlist', 5);
FlitsDoc.toAIExport();
```

See `handoff/AI_CHATBOT_PREPARATION.md` for chatbot integration plans.

## Getting help from Claude or another AI

Point the AI at:

1. `handoff/INDEX.md` — reading order
2. `handoff/TOC_SYSTEM.md` — if scroll/TOC is broken
3. `handoff/KNOWN_ISSUES.md` — known pitfalls

## npm scripts

| Command | Purpose |
|---------|---------|
| `npm run serve` | Start static server |
| `npm run audit:toc` | Validate TOC on all 21 pages |

---

**Full engineering handoff:** [handoff/README.md](handoff/README.md)
