/**
 * Flits API Documentation — application entry point.
 */
import { loadAndParseCollection } from './parser/postmanParser.js';
import { docStore } from './data/docStore.js';
import { renderNavbar } from './render/navbar.js';
import { renderSidebar } from './render/sidebar.js';
import { renderTocShell } from './render/toc.js';
import { initTheme } from './features/theme.js';
import { initRouter, initPageInteractions, navigateToRoute, parseHash } from './features/router.js';
import { initDeepLink } from './features/deepLink.js';
import { initScrollspy } from './features/scrollspy.js';
import { initSearch } from './features/search.js';
import { initSidebarCollapse, isExpandableFolder } from './features/sidebarCollapse.js';
import { runInPostman } from './features/runInPostman.js';
import { initializeThemeLogo } from './features/themeLogo.js';
import { initializeChatAssistant } from './features/chatAssistant.js';
import { initEnvPanel, refreshEnvPanel } from './render/envPanel.js';
import { onEnvChange } from './features/envStore.js';
import { refreshAllTryItPanels } from './render/devPanel.js';

const app = document.getElementById('app');

async function bootstrap() {
  showLoading();

  try {
    docStore.setLoading();
    const doc = await loadAndParseCollection();
    docStore.setDoc(doc);

    mountLayout();
    initTheme();
    initializeThemeLogo();
    initSearch();
    initSidebarCollapse();
    initRouter();
    initPageInteractions();
    initDeepLink();
    initScrollspy();
    initializeChatAssistant();

    // Global Environment Variables panel — discover vars, load from localStorage
    initEnvPanel(doc);
    // When env changes: refresh the panel badge + all open Try It panels
    onEnvChange(() => {
      refreshEnvPanel();
      refreshAllTryItPanels();
    });

    document.getElementById('download-collection-btn')
      ?.addEventListener('click', runInPostman);

    initMobileMenu();
    initTocCollapse();
    initSkipLink();
  } catch (err) {
    console.error(err);
    showError(err);
  }
}

function showLoading() {
  app.innerHTML = `
    <div class="app-loading" role="status" aria-live="polite">
      <div class="app-loading__spinner" aria-hidden="true"></div>
      <p class="app-loading__text">Loading API documentation…</p>
    </div>
  `;
}

function mountLayout() {
  app.innerHTML = `
    <div class="app-layout">
      <a class="skip-link" id="skip-to-content" href="#content-root">Skip to content</a>
      <div id="navbar-root"></div>
      <div class="app-body">
        <div id="sidebar-root"></div>
        <div class="content-wrap">
          <div class="docs-layout">
            <div class="page-scroll" id="page-scroll">
              <main id="content-root" class="page-viewport" role="main" tabindex="-1"></main>
            </div>
            <div id="toc-root"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderNavbar(document.getElementById('navbar-root'));
  renderSidebar(document.getElementById('sidebar-root'));
  renderTocShell(document.getElementById('toc-root'));
}

function initMobileMenu() {
  const toggle = document.getElementById('sidebar-toggle');
  const overlay = document.getElementById('sidebar-overlay');

  const isOpen = () => document.body.classList.contains('sidebar-open');

  const openDrawer = () => {
    document.body.classList.add('sidebar-open');
    toggle?.setAttribute('aria-expanded', 'true');
    // NOTE: do NOT programmatically focus the search input here — focusing a
    // text field pops the mobile soft keyboard on drawer open. Keyboard users
    // can still Tab into the filter; aria-expanded keeps SR users informed.
  };

  const closeDrawer = (returnFocus = false) => {
    if (!isOpen()) return;
    document.body.classList.remove('sidebar-open');
    toggle?.setAttribute('aria-expanded', 'false');
    if (returnFocus) toggle?.focus();
  };

  toggle?.addEventListener('click', () => {
    isOpen() ? closeDrawer() : openDrawer();
  });

  // Dimmed overlay behind the drawer.
  overlay?.addEventListener('click', () => closeDrawer());

  // Close ONLY when a leaf nav item is chosen; folder nodes (with children)
  // just expand and the drawer stays open. (Node type comes from the DOM.)
  document.addEventListener('click', (e) => {
    const navItem = e.target.closest('.nav-tree__link, .nav-tree__folder-btn');
    if (!navItem || !isOpen()) return;
    if (isExpandableFolder(navItem)) return;   // folder w/ children → keep open
    closeDrawer();
  });

  // Outside click (content, overlay, anywhere that is not the drawer or the
  // menu button) closes the drawer.
  document.addEventListener('click', (e) => {
    if (!isOpen()) return;
    const sidebar = document.getElementById('sidebar');
    if (sidebar?.contains(e.target)) return;   // inside drawer: nav, search, toggles
    if (toggle?.contains(e.target)) return;    // the menu button itself
    closeDrawer();
  });

  // ESC closes the drawer and returns focus to the menu button.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) closeDrawer(true);
  });
}

/**
 * Skip-to-content link (keyboard / screen-reader users). Intercepts the click
 * so it focuses the main region directly instead of pushing a #content-root
 * hash (which the router would treat as an unknown route).
 */
function initSkipLink() {
  const link = document.getElementById('skip-to-content');
  link?.addEventListener('click', (e) => {
    e.preventDefault();
    const main = document.getElementById('content-root');
    if (!main) return;
    main.focus({ preventScroll: false });
    main.scrollIntoView({ block: 'start' });
  });
}

/**
 * "On this page" collapse toggle. The TOC label is a disclosure button on
 * mobile (≤1199px); collapsing only has a visual effect at those widths.
 */
function initTocCollapse() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-toc-collapse]');
    if (!btn) return;
    const aside = btn.closest('.toc-aside');
    if (!aside) return;
    const collapsed = aside.classList.toggle('is-collapsed');
    btn.setAttribute('aria-expanded', String(!collapsed));
  });
}

function showError(err) {
  app.innerHTML = `
    <div class="app-error" role="alert">
      <h1>Unable to load documentation</h1>
      <p>${escapeHtml(String(err.message || err))}</p>
      <button type="button" class="btn btn--primary" onclick="location.reload()">Retry</button>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

bootstrap();
