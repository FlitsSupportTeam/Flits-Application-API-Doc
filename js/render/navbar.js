/**
 * Top navigation bar renderer.
 */
import { docStore } from '../data/docStore.js';
import { LOGO_LIGHT_URL, LOGO_DARK_URL, LOGO_WIDTH, LOGO_HEIGHT } from '../features/themeLogo.js';

export function renderNavbar(container) {
  container.innerHTML = `
    <header class="topbar" role="banner">
      <div class="topbar__inner">
        <button type="button" class="topbar__menu-btn" id="sidebar-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <a href="#overview" class="topbar__brand" data-nav="overview" aria-label="Flits documentation home">
          <span class="topbar__logo">
            <img
              id="logo-light"
              class="topbar__logo-img topbar__logo-img--light"
              src="${LOGO_LIGHT_URL}"
              width="${LOGO_WIDTH}"
              height="${LOGO_HEIGHT}"
              alt="Flits"
              decoding="async"
              fetchpriority="high"
            />
            <img
              id="logo-dark"
              class="topbar__logo-img topbar__logo-img--dark"
              src="${LOGO_DARK_URL}"
              width="${LOGO_WIDTH}"
              height="${LOGO_HEIGHT}"
              alt="Flits"
              decoding="async"
              aria-hidden="true"
            />
          </span>
        </a>
        <nav class="topbar__breadcrumb" aria-label="Breadcrumb">
          <ol class="breadcrumb" id="breadcrumb"></ol>
        </nav>
        <div class="topbar__actions">
          <div class="search-box topbar__search" role="search">
            <svg class="search-box__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>
            <input type="search" id="global-search" class="search-box__input" placeholder="Search APIs… (Ctrl+K)" autocomplete="off" aria-label="Search documentation" aria-controls="search-results" aria-expanded="false" />
            <kbd class="search-box__kbd" aria-hidden="true">⌘K</kbd>
            <div class="search-results" id="search-results" role="listbox" hidden></div>
          </div>

          <!-- Run in Postman -->
          <button type="button" class="dl-btn rip-btn" id="download-collection-btn"
                  aria-label="Run in Postman — import collection into Postman"
                  title="Run in Postman">
            <!-- Postman play icon (Postman orange) -->
            <svg class="dl-btn__icon rip-btn__icon" width="15" height="15" viewBox="0 0 24 24"
                 fill="none" aria-hidden="true">
              <path d="M5 3l14 9-14 9V3z"
                    fill="currentColor" stroke="currentColor"
                    stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            <!-- Spinner (CSS: .is-loading) -->
            <svg class="dl-btn__spinner" width="15" height="15" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/>
            </svg>
            <span class="dl-btn__label">Run in Postman</span>
          </button>

          <button type="button" class="icon-btn" id="theme-toggle" aria-label="Toggle dark mode">
            <span class="theme-icon theme-icon--light" aria-hidden="true">☀</span>
            <span class="theme-icon theme-icon--dark" aria-hidden="true">☾</span>
          </button>
        </div>
      </div>
      <div class="scroll-progress" id="scroll-progress" aria-hidden="true"></div>
    </header>
  `;
}

export function updateBreadcrumb(slug) {
  const el = document.getElementById('breadcrumb');
  if (!el) return;

  // Custom Support Ironman FLITS - 08-07-2026 START
  const crumbs = [{ label: 'Flits', slug: 'overview' }];
  // Custom Support Ironman FLITS - 08-07-2026 END
  const doc = docStore.doc;
  if (!doc) return;

  if (slug === 'overview') {
    renderBreadcrumbHtml(el, crumbs);
    return;
  }

  const section = docStore.getSectionBySlug(slug);
  if (!section?.data) {
    renderBreadcrumbHtml(el, crumbs);
    return;
  }

  if (section.type === 'api') {
    const parents = section.data.breadcrumbs?.slice(0, -1) || [];
    parents.forEach((name, i) => {
      const folderSlug = findFolderSlugForPath(doc.navTree, parents.slice(0, i + 1));
      crumbs.push({ label: name, slug: folderSlug || 'overview' });
    });
    crumbs.push({ label: section.data.name, slug: section.data.slug, current: true });
  } else if (section.type === 'folder') {
    const parents = section.data.breadcrumbs?.slice(0, -1) || [];
    parents.forEach((name, i) => {
      const folderSlug = findFolderSlugForPath(doc.navTree, parents.slice(0, i + 1));
      crumbs.push({ label: name, slug: folderSlug || 'overview' });
    });
    crumbs.push({ label: section.data.name, slug: section.data.slug, current: true });
  }

  renderBreadcrumbHtml(el, crumbs);
}

function findFolderSlugForPath(tree, pathNames) {
  let nodes = tree;
  let slug = 'overview';
  for (const name of pathNames) {
    const folder = nodes?.find((n) => n.type === 'folder' && n.name === name);
    if (folder) {
      slug = folder.slug;
      nodes = folder.children;
    }
  }
  return slug;
}

function renderBreadcrumbHtml(el, crumbs) {
  el.innerHTML = crumbs
    .map((c, i) => {
      const isLast = i === crumbs.length - 1 || c.current;
      if (isLast) {
        return `<li class="breadcrumb__item breadcrumb__item--current" aria-current="page">${escapeHtml(c.label)}</li>`;
      }
      return `<li class="breadcrumb__item"><a href="#${c.slug}" data-nav="${c.slug}">${escapeHtml(c.label)}</a></li>`;
    })
    .join('<li class="breadcrumb__sep" aria-hidden="true">/</li>');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
