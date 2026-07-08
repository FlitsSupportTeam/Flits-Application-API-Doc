/**
 * Single-page route view — renders ONLY the active documentation page.
 */
import { docStore } from '../data/docStore.js';
import { markdownToHtml } from '../utils/markdown.js';
import { highlightCode } from '../utils/highlighter.js';
import { escapeHtml as esc } from './contentHelpers.js';
// renderCodeSamplesSection and renderResponsesSection moved to the right-side dev panel
import { assignProseHeadingIds } from '../toc/tocCollector.js';

export function renderPage(section) {
  if (!section) return renderNotFound();

  switch (section.type) {
    case 'overview':
      return renderOverviewPage(section.data, docStore.doc);
    case 'folder':
      return renderFolderPage(section.data);
    case 'api':
      return renderApiPage(section.data);
    default:
      return renderNotFound();
  }
}

function renderOverviewPage(overview, doc) {
  return `
    <article class="page-view page-view--overview" data-page-type="overview">
      <header class="page-hero">
        <h1 class="page-hero__title">${esc(overview.name)}</h1>
        <p class="page-hero__lead">API reference for Flits Loyalty and Wishlist integrations.</p>
      </header>
      <div class="page-body prose" id="overview-content">
        ${markdownToHtml(overview.description)}
      </div>
      <section class="page-section" id="authentication" data-toc-section data-toc-level="2" data-toc-title="Authentication">
        ${renderAuthOverviewBlock(doc.collectionAuth)}
      </section>
    </article>
  `;
}

function renderFolderPage(folder) {
  return `
    <article class="page-view page-view--folder" data-page-type="folder">
      <header class="page-hero">
        <p class="page-hero__eyebrow">${esc(folder.breadcrumbs.slice(0, -1).join(' › ') || 'Documentation')}</p>
        <h1 class="page-hero__title">${esc(folder.name)}</h1>
        ${folder.apiCount ? `<p class="page-hero__meta"><span class="badge">${folder.apiCount} endpoints</span></p>` : ''}
      </header>
      <div class="page-body prose">
        ${folder.description ? markdownToHtml(folder.description) : '<p class="text-muted">No description provided for this section.</p>'}
      </div>
    </article>
  `;
}

function renderCopyLinkButton(api) {
  return `<button type="button" class="btn btn--ghost btn--sm page-hero__copy" data-copy-link="${esc(api.slug)}" aria-label="Copy link to this API">Copy page link</button>`;
}

function renderApiTitleRow(api) {
  return `
    <div class="page-hero__title-row">
      <h1 class="page-hero__title">${esc(api.name)}</h1>
      ${renderCopyLinkButton(api)}
    </div>
  `;
}

function renderApiMetaRow(api) {
  const method = (api.method || 'GET').toLowerCase();
  return `
    <div class="page-hero__meta-row">
      <span class="method-badge method-${method}">${esc(api.method)}</span>
      <code class="page-hero__url">${esc(api.urlDisplay)}</code>
    </div>
  `;
}

function renderApiHeader(api) {
  const eyebrow = api.breadcrumbs?.slice(0, -1).join(' › ') || '';
  return `
    <header class="page-hero page-hero--api">
      ${eyebrow ? `<p class="page-hero__eyebrow">${esc(eyebrow)}</p>` : ''}
      ${renderApiTitleRow(api)}
      ${renderApiMetaRow(api)}
    </header>
  `;
}

function renderApiPage(api) {
  return `
    <article class="page-view page-view--api" data-page-type="api" data-method="${api.method}">
      ${renderApiHeader(api)}

      ${
        api.description
          ? `<section class="page-section" id="overview" data-toc-section data-toc-level="2" data-toc-title="Overview">
        <h2 class="page-section__title">Overview</h2>
        <div class="prose prose--api-description">${markdownToHtml(api.description)}</div>
      </section>`
          : ''
      }

      <section class="page-section" id="endpoint" data-toc-section data-toc-level="2" data-toc-title="Endpoint">
        <h2 class="page-section__title">Endpoint</h2>
        <div class="endpoint-bar">
          <span class="method-badge method-${api.method.toLowerCase()}">${api.method}</span>
          <code class="endpoint-bar__url">${esc(api.urlDisplay)}</code>
        </div>
        ${api.baseUrl ? `<p class="page-meta">Base URL: <code>${esc(api.baseUrl)}</code></p>` : ''}
      </section>

      ${
        api.auth
          ? `<section class="page-section" id="authorization" data-toc-section data-toc-level="2" data-toc-title="Authorization">
        <h2 class="page-section__title">Authorization</h2>
        ${renderAuthBlock(api.auth)}
      </section>`
          : ''
      }

      ${
        api.headers?.length
          ? `<section class="page-section" id="headers" data-toc-section data-toc-level="2" data-toc-title="Headers">
        <h2 class="page-section__title">Headers</h2>
        ${renderParamsTable(api.headers)}
      </section>`
          : ''
      }

      ${
        api.pathVariables?.length
          ? `<section class="page-section" id="path-parameters" data-toc-section data-toc-level="2" data-toc-title="Path parameters">
        <h2 class="page-section__title">Path parameters</h2>
        ${renderParamsTable(
          api.pathVariables.map((v) => ({
            key: v.key,
            value: `{{${v.key}}}`,
            description: v.description,
          }))
        )}
      </section>`
          : ''
      }

      ${
        api.queryParams?.length
          ? `<section class="page-section" id="query-parameters" data-toc-section data-toc-level="2" data-toc-title="Query parameters">
        <h2 class="page-section__title">Query parameters</h2>
        ${renderParamsTable(api.queryParams)}
      </section>`
          : ''
      }

      ${
        api.bodyParams?.length
          ? `<section class="page-section" id="request-body" data-toc-section data-toc-level="2" data-toc-title="Request body">
        <h2 class="page-section__title">Request body</h2>
        <p class="page-meta">Content-Type: <code>${esc(_bodyContentType(api.bodyMode))}</code> · Mode: ${esc(api.bodyMode)}</p>
        ${renderParamsTable(api.bodyParams)}
      </section>`
          : api.bodyRaw
          ? `<section class="page-section" id="request-body" data-toc-section data-toc-level="2" data-toc-title="Request body">
        <h2 class="page-section__title">Request body</h2>
        <p class="page-meta">Content-Type: <code>application/json</code> · Mode: ${esc(api.bodyMode)}</p>
        <div class="sample-block">
          <pre class="code-block"><code>${highlightCode(api.bodyRaw, api.bodyLanguage || 'json')}</code></pre>
        </div>
      </section>`
          : ''
      }

    </article>
  `;
}

function renderAuthBlock(auth) {
  if (auth.type === 'bearer') {
    return `<p><span class="badge badge--auth">Bearer Token</span></p><pre class="code-inline-block"><code>${esc(auth.value)}</code></pre>`;
  }
  return `<p class="text-muted">${esc(auth.type || 'See documentation')}</p>`;
}

function renderAuthOverviewBlock(collectionAuth) {
  if (!collectionAuth) return '';
  return `
    <h2 class="page-section__title">Authentication</h2>
    <div class="info-grid">
      <!-- Custom Support Ironman FLITS - 08-07-2026 START -->
      <div class="info-card">
        <h3>Loyalty</h3>
        <p>${esc(collectionAuth.loyalty?.description || '')}</p>
        <code class="code-inline">token={{flits_token}}</code>
      </div>
      <div class="info-card">
        <h3>Wishlist</h3>
        <p>${esc(collectionAuth.wishlist?.description || '')}</p>
      <!-- Custom Support Ironman FLITS - 08-07-2026 END -->
        <code class="code-inline">Authorization: Bearer {{jwt_token}}</code><br/>
        <code class="code-inline">merchant_id: {{merchant_id}}</code>
      </div>
    </div>
  `;
}

function renderParamsTable(params) {
  const rows = params
    .map(
      (p) => `
    <tr class="${p.disabled ? 'is-disabled' : ''}">
      <td><code>${esc(p.key)}</code></td>
      <td><code>${esc(p.value || '')}</code></td>
      <td>${esc(p.description || '—')}</td>
    </tr>
  `
    )
    .join('');

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Value</th><th>Description</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function _bodyContentType(mode) {
  if (mode === 'formdata') return 'multipart/form-data';
  if (mode === 'urlencoded') return 'application/x-www-form-urlencoded';
  return 'application/json';
}

function renderNotFound() {
  return `
    <article class="page-view page-view--error">
      <h1>Page not found</h1>
      <p class="text-muted">The documentation page you're looking for doesn't exist.</p>
      <a href="#overview" class="btn btn--primary" data-nav="overview">Back to Introduction</a>
    </article>
  `;
}

/** Assign prose heading IDs (TOC) and syntax-highlight embedded code blocks. */
export function enhanceProseHeadings(container) {
  assignProseHeadingIds(container);

  container.querySelectorAll('.md-embedded code').forEach((codeEl) => {
    const pre = codeEl.parentElement;
    const lang = pre?.dataset?.language || 'text';
    codeEl.innerHTML = highlightCode(codeEl.textContent, lang);
  });
}
