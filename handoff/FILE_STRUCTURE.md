# File Structure

Project root: `apiDocCursor/`

```
apiDocCursor/
├── index.html                 # Single HTML entry, loads main.js
├── README.md                  # Short project readme
├── README_FIRST.md              # Human quick-start (handoff)
├── package.json               # npm scripts: serve, audit:toc
├── .gitignore                 # node_modules, package-lock
│
├── handoff/                   # ★ ENGINEERING HANDOFF DOCS (this package)
│   ├── README.md
│   ├── INDEX.md
│   ├── PROJECT_OVERVIEW.md
│   ├── ARCHITECTURE.md
│   ├── TOC_SYSTEM.md
│   ├── RENDERING_FLOW.md
│   ├── ROUTING_SYSTEM.md
│   ├── POSTMAN_PARSER.md
│   ├── COMPONENT_STRUCTURE.md
│   ├── UI_UX_GUIDELINES.md
│   ├── KNOWN_ISSUES.md
│   ├── FUTURE_IMPROVEMENTS.md
│   ├── AI_CHATBOT_PREPARATION.md
│   ├── FILE_STRUCTURE.md
│   └── CHANGELOG.md
│
├── data/
│   └── Flits App.postman_collection.json   # ★ Canonical Postman source
│
├── Flits App.postman_collection.json       # Duplicate copy (optional backup)
│
├── css/
│   ├── variables.css          # Design tokens, light/dark
│   ├── main.css               # Layout, imports page.css + toc.css
│   ├── page.css               # Page view, sections, code blocks
│   └── toc.css                # Right rail TOC
│
├── js/
│   ├── main.js                # Application bootstrap
│   │
│   ├── parser/
│   │   └── postmanParser.js   # Collection → doc model
│   │
│   ├── data/
│   │   └── docStore.js        # State, search, FlitsDoc global
│   │
│   ├── state/
│   │   └── routeState.js      # currentRoute slug
│   │
│   ├── render/
│   │   ├── pageView.js        # Page HTML templates
│   │   ├── codeBlocks.js      # Samples + responses
│   │   ├── sidebar.js         # Left navigation
│   │   ├── navbar.js          # Top bar
│   │   ├── toc.js             # TOC shell + setTocActive
│   │   └── contentHelpers.js  # escapeHtml, etc.
│   │
│   ├── toc/                   # ★ On This Page system
│   │   ├── index.js           # Public exports
│   │   ├── constants.js
│   │   ├── tocCollector.js
│   │   ├── tocRenderer.js
│   │   ├── tocController.js
│   │   ├── tocEvents.js
│   │   ├── scrollEngine.js
│   │   └── tocScrollspy.js
│   │
│   ├── features/
│   │   ├── router.js          # SPA navigation
│   │   ├── tocManager.js      # Re-export → toc/
│   │   ├── tocScrollspy.js    # Deprecated alias
│   │   ├── search.js
│   │   ├── theme.js
│   │   ├── deepLink.js
│   │   ├── scrollspy.js       # Navbar progress bar only
│   │   └── sidebarCollapse.js
│   │
│   └── utils/
│       ├── markdown.js
│       ├── variables.js
│       ├── slug.js
│       ├── curl.js
│       ├── codeSamples.js
│       ├── highlighter.js
│       ├── clipboard.js
│       └── debounce.js
│
├── scripts/
│   ├── audit-toc.mjs          # TOC validation all pages
│   └── test-toc-scroll.mjs    # Optional Playwright test
│
├── assets/                    # Images from editor/screenshots (if any)
│
└── node_modules/              # Dev only (linkedom for audit)
```

## Critical paths quick reference

| Task | File(s) |
|------|---------|
| Change collection path | `js/parser/postmanParser.js` → `COLLECTION_PATH` |
| Add API page section | `js/render/pageView.js`, `js/render/codeBlocks.js` |
| Fix TOC scroll | `js/toc/scrollEngine.js`, `js/toc/tocEvents.js` |
| Fix routing | `js/features/router.js` |
| Change layout scroll | `css/main.css` → `.page-scroll`, `handoff/TOC_SYSTEM.md` |
| Change theme colors | `css/variables.css` |
| Add search field | `js/parser/postmanParser.js` `buildSearchIndex` |
| AI export shape | `js/data/docStore.js` `toAIExport` |

## Removed files (historical)

Do not expect these in repo:

- `js/render/content.js`
- `js/render/rightPanel.js`
- `css/panel.css`
- `js/toc/tocScroll.js` (replaced by `scrollEngine.js`)

## Generated / optional

- `package-lock.json` — after `npm install`
- `node_modules/` — not deployed to static host

## Deployment artifact

Upload everything except `node_modules`, `scripts/` (optional), `handoff/` (optional for prod), and dev tooling. Minimum:

- `index.html`, `css/`, `js/`, `data/*.json`
