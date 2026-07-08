# Handoff reading order (for AI agents)

Read these in sequence for fastest full-context loading.

## Phase 1 — Context (15 min)

1. **PROJECT_OVERVIEW.md** — What this is and what works today
2. **ARCHITECTURE.md** — How pieces connect
3. **FILE_STRUCTURE.md** — Where code lives

## Phase 2 — Core behavior (20 min)

4. **ROUTING_SYSTEM.md** — SPA navigation and URLs
5. **RENDERING_FLOW.md** — How HTML is produced per page
6. **TOC_SYSTEM.md** — Must read before changing sidebar TOC or scroll

## Phase 3 — Data & UI (15 min)

7. **POSTMAN_PARSER.md** — Source of truth from Postman JSON
8. **COMPONENT_STRUCTURE.md** — Module map
9. **UI_UX_GUIDELINES.md** — CSS and layout constraints

## Phase 4 — Operations (10 min)

10. **KNOWN_ISSUES.md** — Do not re-break fixed bugs
11. **FUTURE_IMPROVEMENTS.md** — Planned work
12. **AI_CHATBOT_PREPARATION.md** — If building Q&A / RAG
13. **CHANGELOG.md** — Historical decisions

## Critical rules (memorize)

- **Scroll container is `#page-scroll`**, not `window`.
- **TOC clicks use `<button>`**, not `<a href="#">` (hash remount bug).
- **Same-route `hashchange` must not call `navigateToRoute`** (only scroll to anchor).
- **API pages**: TOC from `[data-toc-section]` only; prose in API description is excluded.
- **Folder/overview pages**: TOC from markdown `h2`/`h3`/`h4` + structured sections.
- **Requires HTTP server** — `file://` breaks `fetch()` of collection JSON.
