/**
 * Route-like SPA navigation — one page visible at a time.
 */
import { docStore } from '../data/docStore.js';
import { renderPage, enhanceProseHeadings } from '../render/pageView.js';
import { setSidebarActive } from '../render/sidebar.js';
import { updateBreadcrumb } from '../render/navbar.js';
import { buildRightTOC, scrollToSection, cleanupTOC } from '../toc/rightTOC.js';
import { mountDevPanel, unmountDevPanel, handleDevPanelInteraction, handleDevPanelInputSync } from '../render/devPanel.js';
import { handleSampleBlockInteraction } from '../render/codeBlocks.js';
import { currentRoute, setCurrentRoute } from '../state/routeState.js';

export { currentRoute };

export function initRouter() {
  window.addEventListener('hashchange', () => {
    const { slug, anchor } = parseHash();

    // Same page — only scroll to the anchor (do NOT remount; that resets scroll)
    if (slug === currentRoute) {
      if (anchor) {
        requestAnimationFrame(() =>
          scrollToSection(anchor, { smooth: false, updateHash: true })
        );
      }
      return;
    }

    navigateToRoute(slug, { anchor, updateHash: false });
  });

  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) {
      e.preventDefault();
      // Folders navigate (load their description page) AND expand — on both
      // desktop and the mobile drawer. The drawer stays open for folders and
      // closes only on leaf nodes; that is handled in main.js (initMobileMenu).
      navigateToRoute(nav.getAttribute('data-nav'));
    }
  });
}

export function parseHash() {
  const raw = location.hash.slice(1);
  if (!raw) return { slug: currentRoute || 'overview', anchor: null };

  const sep = raw.indexOf('--');
  if (sep > -1) {
    return {
      slug: raw.slice(0, sep) || 'overview',
      anchor: raw.slice(sep + 2) || null,
    };
  }

  // In-page fragment (e.g. #headers) — not a route slug
  if (_isInPageFragment(raw)) {
    return { slug: currentRoute || 'overview', anchor: raw };
  }

  if (docStore.getSectionBySlug(raw)) {
    return { slug: raw, anchor: null };
  }

  return { slug: raw, anchor: null };
}

function _isInPageFragment(id) {
  if (!id) return false;
  const pageView = document.getElementById('content-root')?.querySelector('.page-view');
  if (!pageView) return false;
  const el = document.getElementById(id);
  return el != null && pageView.contains(el);
}

export function navigateToRoute(slug, options = {}) {
  const { anchor = null, updateHash = true, animate = true } = options;
  if (!slug) slug = 'overview';

  const root     = document.getElementById('content-root');
  const scroller = document.getElementById('page-scroll');
  if (!root) return;

  // Tear down previous page's TOC (no-op if dev panel was showing)
  cleanupTOC();
  setCurrentRoute(slug);

  if (updateHash) {
    const hash = anchor ? `#${slug}--${anchor}` : `#${slug}`;
    if (location.hash !== hash) history.pushState(null, '', hash);
  }

  const section = docStore.getSectionBySlug(slug);

  if (!section) {
    root.innerHTML = renderPage(null);
    unmountDevPanel();          // ensure TOC shell is present
    buildRightTOC(root);
    setSidebarActive(slug);
    updateBreadcrumb(slug);
    setPageTitle(null);
    return;
  }

  // Render center column
  root.innerHTML = renderPage(section);
  enhanceProseHeadings(root);
  setSidebarActive(slug);
  updateBreadcrumb(slug);
  setPageTitle(section);

  if (scroller) scroller.scrollTop = 0;

  if (animate) {
    root.classList.add('page-view--enter');
    requestAnimationFrame(() => root.classList.remove('page-view--enter'));
  }

  if (section.type === 'api') {
    // ── API pages: TOC at top of right rail, dev panel appended below ───
    buildRightTOC(root, { initialActiveId: anchor || undefined });
    mountDevPanel(section.data);

    if (anchor) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          scrollToSection(anchor, { smooth: false, updateHash: false })
        )
      );
    }
  } else {
    // ── Folder / overview pages: TOC only ───────────────────────────────
    unmountDevPanel();           // remove any stale panel section
    buildRightTOC(root, { initialActiveId: anchor || undefined });

    if (anchor) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          scrollToSection(anchor, { smooth: false, updateHash: false })
        )
      );
    }
  }
}

// Custom Support Ironman FLITS - 08-07-2026 START
const BASE_TITLE = 'Flits — API Documentation';
// Custom Support Ironman FLITS - 08-07-2026 END

/** Keep the browser tab / document title in sync with the active page. */
function setPageTitle(section) {
  if (!section || section.type === 'overview') {
    document.title = BASE_TITLE;
    return;
  }
  const name = section.data?.name;
  // Custom Support Ironman FLITS - 08-07-2026 START
  document.title = name ? `${name} — Flits API Docs` : BASE_TITLE;
  // Custom Support Ironman FLITS - 08-07-2026 END
}

/** @deprecated use scrollToSection from rightTOC */
export function scrollToAnchor(id, smooth = true) {
  scrollToSection(id, { smooth, updateHash: true });
}

export function initPageInteractions() {
  document.addEventListener('click', (e) => {
    // Dev panel — language / response tab / copy
    handleDevPanelInteraction(e.target);

    // Existing code-sample interactions (still used when blocks appear in content)
    if (e.target.closest('.sample-lang-select') || e.target.closest('[data-sample-tab]')) {
      handleSampleBlockInteraction(e.target);
    }

    // Copy buttons inside the center content column
    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn && !copyBtn.classList.contains('dev-panel__copy')) {
      let codeEl;
      if (copyBtn.dataset.copyTarget === 'response') {
        codeEl = copyBtn
          .closest('.sample-block--responses')
          ?.querySelector('.sample-tab-panel:not([hidden]) code');
      } else if (copyBtn.dataset.copyTarget === 'sample') {
        codeEl = copyBtn.closest('.sample-block')?.querySelector('[data-sample-container] code');
      } else {
        codeEl = copyBtn.closest('.sample-block, .code-panel')?.querySelector('code');
      }
      if (codeEl) {
        import('../utils/clipboard.js').then(({ copyToClipboard, showCopyFeedback }) => {
          copyToClipboard(codeEl.textContent).then(() => showCopyFeedback(copyBtn));
        });
      }
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.classList?.contains('sample-lang-select')) {
      handleSampleBlockInteraction(e.target);
    }
    // Dev panel dropdowns (language select, response select)
    handleDevPanelInteraction(e.target);
  });

  // Input events: bidirectional URL ↔ query-param sync + dirty tracking
  document.addEventListener('input', (e) => {
    const input = e.target;
    if (!input.closest?.('.dev-panel')) return;

    // Mark template-bearing fields as user-modified (stops env auto-fill for this field)
    // Clearing a field (value === '') un-marks it so env can fill it again on next change
    if (input.hasAttribute('data-template')) {
      if (input.value !== '') {
        input.dataset.userModified = '1';
      } else {
        delete input.dataset.userModified;
      }
    }

    handleDevPanelInputSync(input);
  });
}
