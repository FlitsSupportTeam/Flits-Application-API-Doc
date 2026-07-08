# Flits API Documentation — Engineering Handoff

This directory is the **complete handoff package** for continuing development with Claude AI, another LLM, or a human engineer—without re-explaining the project from scratch.

## Start here

| Audience | Document |
|----------|----------|
| **AI agent (Claude)** | Read [INDEX.md](./INDEX.md) in order, then dive into topic files as needed |
| **Human developer** | [README_HUMAN_FIRST.md](./README_HUMAN_FIRST.md) at project root |
| **Quick orientation** | [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) |

## Documentation map

1. [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) — Goals, features, stack
2. [ARCHITECTURE.md](./ARCHITECTURE.md) — System design, SPA model, state
3. [FILE_STRUCTURE.md](./FILE_STRUCTURE.md) — Every folder and file
4. [ROUTING_SYSTEM.md](./ROUTING_SYSTEM.md) — Hash routing, navigation, deep links
5. [RENDERING_FLOW.md](./RENDERING_FLOW.md) — Page types, DOM lifecycle
6. [TOC_SYSTEM.md](./TOC_SYSTEM.md) — **Critical** — On This Page, scroll, scrollspy
7. [POSTMAN_PARSER.md](./POSTMAN_PARSER.md) — Collection → doc model
8. [COMPONENT_STRUCTURE.md](./COMPONENT_STRUCTURE.md) — JS modules and responsibilities
9. [UI_UX_GUIDELINES.md](./UI_UX_GUIDELINES.md) — Design tokens, layout, responsive
10. [AI_CHATBOT_PREPARATION.md](./AI_CHATBOT_PREPARATION.md) — Search, export, embeddings
11. [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) — Bugs, edge cases, limitations
12. [FUTURE_IMPROVEMENTS.md](./FUTURE_IMPROVEMENTS.md) — Roadmap ideas
13. [CHANGELOG.md](./CHANGELOG.md) — Major changes history

## Verification commands

```bash
npm run serve      # Local HTTP server (required for ES modules + fetch)
npm run audit:toc  # Validates TOC entries for all 21 doc pages
```

## Project root

All application code lives one level up: `c:\Users\admin\Downloads\apiDocCursor\` (or your clone path).

**Last handoff update:** June 2026 — reflects TOC architecture refactor (`js/toc/`), scroll engine, and router hash guards.
