/**
 * Developer panel — right-side panel for API pages.
 *
 * Two tabs:
 *   Code Samples  — language-switchable code + response examples
 *   Try It        — interactive API playground
 *
 * Public API
 * ──────────
 *   mountDevPanel(api)
 *   unmountDevPanel()
 *   handleDevPanelInteraction(el)   — click + change events (delegated)
 *   handleDevPanelInputSync(el)     — input events (delegated from router)
 *   refreshAllTryItPanels()         — called when env vars change
 */

import { LANGUAGES } from '../utils/codeSamples.js';
import { highlightCode } from '../utils/highlighter.js';
import { escapeHtml as esc } from './contentHelpers.js';
import { applyEnv } from '../features/envStore.js';

// ── Token persistence (survives same-session navigation) ──────────────────
function _getToken()  {
  try { return sessionStorage.getItem('_fdev_token') || ''; } catch { return ''; }
}
function _saveToken(t) {
  try { sessionStorage.setItem('_fdev_token', t); } catch {}
}

// ══════════════════════════════════════════════════════════════════════════
// MOUNT / UNMOUNT
// ══════════════════════════════════════════════════════════════════════════

export function mountDevPanel(api) {
  const tocRoot    = document.getElementById('toc-root');
  const docsLayout = document.querySelector('.docs-layout');

  if (tocRoot) {
    tocRoot.querySelector('.dev-panel-section')?.remove();
    const wrapper = document.createElement('div');
    wrapper.className = 'dev-panel-section';
    wrapper.innerHTML = _buildPanel(api);
    tocRoot.appendChild(wrapper);
    tocRoot.classList.add('toc-root--with-panel');

    // Apply global env vars to all template fields, then sync URL preview
    const panel = wrapper.querySelector('.dev-panel');
    if (panel) {
      _applyEnvToPanel(panel);
      _syncParamsToUrl(panel);
    }
  }

  if (docsLayout) docsLayout.classList.add('docs-layout--api-panel');
}

export function unmountDevPanel() {
  const tocRoot    = document.getElementById('toc-root');
  const docsLayout = document.querySelector('.docs-layout');

  if (tocRoot) {
    tocRoot.querySelector('.dev-panel-section')?.remove();
    tocRoot.classList.remove('toc-root--with-panel');
  }

  if (docsLayout) docsLayout.classList.remove('docs-layout--api-panel');
}

// ══════════════════════════════════════════════════════════════════════════
// ENV APPLICATION
// ══════════════════════════════════════════════════════════════════════════

/**
 * Apply global env vars to all template-bearing inputs in the panel.
 * Skips any input the user has already modified (data-user-modified).
 */
function _applyEnvToPanel(panel) {
  const apply = (input) => {
    if (!input || !input.dataset.template) return;
    if (input.dataset.userModified) return;          // respect user edits
    const resolved = applyEnv(input.dataset.template);
    if (input.value !== resolved) input.value = resolved;
  };

  apply(panel.querySelector('[data-tryit-url]'));
  panel.querySelectorAll('[data-tryit-params="headers"] .tryit__val').forEach(apply);
  panel.querySelectorAll('[data-tryit-params="query"]   .tryit__val').forEach(apply);
  panel.querySelectorAll('[data-tryit-params="body"] .tryit__bval').forEach(apply);
  apply(panel.querySelector('[data-tryit-body]'));
}

/**
 * Re-apply env to all currently visible Try It panels.
 * Called whenever the global env changes.
 */
export function refreshAllTryItPanels() {
  document.querySelectorAll('.dev-panel').forEach(panel => {
    const tryItPane = panel.querySelector('[data-pane="tryit"]');
    if (!tryItPane || tryItPane.hidden) return;
    _applyEnvToPanel(panel);
    _syncParamsToUrl(panel);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// URL ↔ QUERY PARAMETER SYNCHRONIZATION
// ══════════════════════════════════════════════════════════════════════════

/**
 * Rebuild the URL preview from the base path + current query-param rows.
 * Called whenever a query param key or value changes.
 *
 * The URL bar is a live preview — not the source of truth for query params.
 * The rows are authoritative.
 */
function _syncParamsToUrl(panel) {
  if (panel._syncing) return;
  const urlInput = panel.querySelector('[data-tryit-url]');
  if (!urlInput) return;

  const baseUrl = urlInput.value.split('?')[0];

  const pairs = [
    ...[...panel.querySelectorAll('[data-tryit-params="query"] .tryit__row')]
      .map(r => [
        r.querySelector('.tryit__key')?.value?.trim() || '',
        r.querySelector('.tryit__val')?.value?.trim() || '',
      ])
      .filter(([k]) => k),
    ..._lockedPairs(panel),   // fixed params are always part of the URL
  ];

  panel._syncing = true;
  if (pairs.length) {
    // Show readable preview (not encoded) — encoding happens in _send
    const qs = pairs.map(([k, v]) => `${k}=${v}`).join('&');
    urlInput.value = `${baseUrl}?${qs}`;
  } else {
    urlInput.value = baseUrl;
  }
  panel._syncing = false;
}

/**
 * Parse the URL bar's query string and update the param rows to match.
 * Called when the user edits the URL directly.
 */
function _syncUrlToParams(panel) {
  if (panel._syncing) return;
  const urlInput   = panel.querySelector('[data-tryit-url]');
  const container  = panel.querySelector('[data-tryit-params="query"]');
  if (!urlInput || !container) return;

  const qIdx = urlInput.value.indexOf('?');

  panel._syncing = true;
  if (qIdx === -1) {
    container.innerHTML = '';
  } else {
    let params;
    try { params = new URLSearchParams(urlInput.value.slice(qIdx + 1)); }
    catch { panel._syncing = false; return; }

    const locked = _lockedKeySet(panel);
    container.innerHTML = '';
    for (const [k, v] of params.entries()) {
      if (locked.has(k)) continue;   // fixed params stay in their locked block
      container.insertAdjacentHTML('beforeend', _row(k, v));
    }
  }
  panel._syncing = false;
}

/**
 * Delegated handler for `input` events inside a dev panel.
 * Called from router.js — keeps sync logic here rather than in the router.
 */
export function handleDevPanelInputSync(target) {
  const panel = target.closest('.dev-panel');
  if (!panel) return;

  if (target.hasAttribute('data-tryit-url')) {
    _syncUrlToParams(panel);
    return;
  }

  if (target.closest('[data-tryit-params="query"]') &&
      (target.classList.contains('tryit__key') || target.classList.contains('tryit__val'))) {
    _syncParamsToUrl(panel);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// INTERACTION  (click + change — delegated from router.js)
// ══════════════════════════════════════════════════════════════════════════

export function handleDevPanelInteraction(target) {
  const panel = target.closest('.dev-panel');
  if (!panel) return;

  // ── Tab switch ──────────────────────────────────────────────────────
  if (target.closest('[data-panel-tab]')) {
    _switchTab(target.closest('[data-panel-tab]'), panel);
    return;
  }

  // ── Code-tab controls ───────────────────────────────────────────────
  if (target.hasAttribute('data-lang-select')) { _switchLang(target, panel); return; }
  if (target.hasAttribute('data-resp-select')) { _switchResp(target, panel); return; }

  // ── Copy (both tabs) ────────────────────────────────────────────────
  const copyBtn = target.closest('.dev-panel__copy');
  if (copyBtn) { _copy(copyBtn, panel); return; }

  // ── Optional body-field checkbox ────────────────────────────────────
  if (target.classList.contains('tryit__opt-cb')) {
    const field = target.closest('.tryit__field');
    const inp   = field?.querySelector('.tryit__bval');
    if (inp) inp.disabled = !target.checked;
    return;
  }

  // ── Try-It controls ─────────────────────────────────────────────────
  if (target.closest('[data-tryit-add]')) {
    _addParamRow(target.closest('[data-tryit-add]'));
    return;
  }
  if (target.closest('[data-tryit-del]')) {
    target.closest('.tryit__row')?.remove();
    _syncParamsToUrl(panel);   // URL must reflect the removed param
    return;
  }
  if (target.closest('[data-tryit-send]'))      { _send(panel); return; }
  if (target.closest('[data-tryit-clear]'))     { _clearResponse(panel); return; }
  if (target.closest('[data-tryit-toggle-pw]')) {
    const inp = panel.querySelector('[data-tryit-token]');
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
    return;
  }
}

// ══════════════════════════════════════════════════════════════════════════
// HTML — outer panel wrapper
// ══════════════════════════════════════════════════════════════════════════

function _buildPanel(api) {
  const samples   = api.codeSamples || { curl: api.curl || '' };
  const respList  = _orderedResponses(api.responses);

  return `
    <aside class="dev-panel"
           aria-label="Developer panel"
           data-api-slug="${esc(api.slug)}"
           data-api-method="${esc((api.method || 'GET').toUpperCase())}"
           data-api-body-mode="${esc(api.bodyMode || 'formdata')}">

      <div class="dev-panel__stack">

        <!-- ── Tab bar ──────────────────────────────────────────── -->
        <div class="dev-panel__tabbar" role="tablist">
          <button type="button" class="dev-panel__tab is-active"
                  data-panel-tab="code" role="tab" aria-selected="true">
            Code
          </button>
          <button type="button" class="dev-panel__tab"
                  data-panel-tab="tryit" role="tab" aria-selected="false">
            Try It
          </button>
        </div>

        <!-- ── Code Samples pane ────────────────────────────────── -->
        <div class="dev-panel__pane" data-pane="code">
          ${_buildRequestCard(samples)}
          ${respList.length ? _buildResponseCard(respList) : ''}
        </div>

        <!-- ── Try It pane ──────────────────────────────────────── -->
        <div class="dev-panel__pane" data-pane="tryit" hidden>
          ${_buildTryItPane(api)}
        </div>

      </div>
    </aside>`;
}

// ══════════════════════════════════════════════════════════════════════════
// CODE-SAMPLES PANE
// ══════════════════════════════════════════════════════════════════════════

function _buildRequestCard(samples) {
  const firstLang = LANGUAGES[0].id;
  const hlLang    = firstLang === 'curl' ? 'bash' : firstLang;
  const code      = samples[firstLang] || samples.curl || '';
  const hl        = highlightCode(code, hlLang);
  const options   = LANGUAGES.map(l => `<option value="${esc(l.id)}">${esc(l.label)}</option>`).join('');

  return `
    <div class="dev-panel__card">
      <div class="dev-panel__card-head">
        <span class="dev-panel__card-label">Request</span>
        <div class="dev-panel__controls">
          <div class="dev-panel__select-wrap">
            <select class="dev-panel__select dev-panel__select--lang"
                    data-lang-select aria-label="Select code language">
              ${options}
            </select>
          </div>
          <button type="button" class="dev-panel__copy"
                  data-copy-role="request" aria-label="Copy request code">
            <span class="copy-btn__label">Copy</span>
          </button>
        </div>
      </div>
      <div class="dev-panel__code-wrap" data-panel-code>
        <pre class="dev-panel__pre" data-language="${esc(hlLang)}"><code>${hl}</code></pre>
      </div>
    </div>`;
}

function _buildResponseCard(list) {
  const firstCls = _respClass(String(list[0].code));
  // One option + one panel per saved example (not one per status code), so every
  // captured scenario — including several that share a code, e.g. multiple
  // "200 OK — <scenario>" or "400 — <scenario>" — is individually selectable.
  const options  = list.map(({ code, r }, i) => {
    const label = r.name || `${code}${r.status ? ' ' + r.status : ''}`;
    return `<option value="${i}" data-code="${esc(String(code))}">${esc(_truncate(label, 54))}</option>`;
  }).join('');

  const panels = list.map(({ code, r }, i) => {
    const hl     = highlightCode(r.body || '', 'json');
    const status = esc(r.status || '');
    const name   = esc(_truncate(r.name || '', 56));
    const cls    = _respClass(code);
    return `
      <div class="dev-panel__resp-panel${i === 0 ? ' is-active' : ''}"
           data-resp-panel="${i}" ${i !== 0 ? 'hidden' : ''}>
        ${(status || name) ? `
        <p class="dev-panel__resp-meta">
          <span class="dev-panel__resp-dot ${cls}"></span>
          ${status}${name ? ` — ${name}` : ''}
        </p>` : ''}
        <pre class="dev-panel__pre" data-language="json"><code>${hl}</code></pre>
      </div>`;
  }).join('');

  return `
    <div class="dev-panel__card">
      <div class="dev-panel__card-head">
        <span class="dev-panel__card-label">Response</span>
        <div class="dev-panel__controls">
          <div class="dev-panel__select-wrap">
            <select class="dev-panel__select dev-panel__select--resp ${firstCls}"
                    data-resp-select aria-label="Select response status">
              ${options}
            </select>
          </div>
          <button type="button" class="dev-panel__copy"
                  data-copy-role="response" aria-label="Copy response">
            <span class="copy-btn__label">Copy</span>
          </button>
        </div>
      </div>
      <div class="dev-panel__code-wrap" data-panel-response>${panels}</div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════
// TRY-IT PANE
// ══════════════════════════════════════════════════════════════════════════

function _buildTryItPane(api) {
  const method      = (api.method || 'GET').toUpperCase();
  const methodLower = method.toLowerCase();

  // Strip query string from URL — params live in the query-params section.
  // The URL bar is rebuilt as a live preview via _syncParamsToUrl.
  const fullUrl     = api.urlDisplay || api.urlRaw || '';
  const baseUrl     = fullUrl.includes('?') ? fullUrl.split('?')[0] : fullUrl;

  const headers     = (api.headers     || []).filter(h => h.key && !h.disabled);
  const qParams     = (api.queryParams || []).filter(q => q.key);
  const qEditable   = qParams.filter(q => !q.locked);
  const qLocked     = qParams.filter(q => q.locked);
  const noBodyMethod = ['GET', 'HEAD'].includes(method);
  const bodyFields  = (api.bodyParams || []).filter(p => p.key && !p.disabled);
  const hasFormBody = bodyFields.length > 0 && !noBodyMethod;        // form-data / urlencoded
  const hasRawBody  = !hasFormBody && !!api.bodyRaw && !noBodyMethod; // raw JSON textarea
  const savedToken  = _getToken();

  return `
    <div class="tryit">

      <!-- URL bar — visual preview, rebuilt by _syncParamsToUrl -->
      <div class="tryit__url-bar">
        <span class="tryit__badge method-${methodLower}">${esc(method)}</span>
        <input type="text" class="tryit__url"
               value="${esc(baseUrl)}"
               data-tryit-url
               data-template="${esc(baseUrl)}"
               spellcheck="false"
               aria-label="Request URL" />
      </div>

      <!-- Authorization -->
      <details class="tryit__section"${savedToken || api.auth ? ' open' : ''}>
        <summary class="tryit__section-hd">
          <span class="tryit__section-name">Authorization</span>
          <span class="tryit__chip">${api.auth ? 'Bearer' : 'optional'}</span>
        </summary>
        <div class="tryit__section-bd">
          <label class="tryit__lbl">Bearer Token</label>
          <div class="tryit__token-wrap">
            <input type="password" class="tryit__input" data-tryit-token
                   value="${esc(savedToken)}"
                   placeholder="Paste your token here…"
                   autocomplete="off" />
            <button type="button" class="tryit__eye" data-tryit-toggle-pw
                    aria-label="Show/hide token">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>
      </details>

      <!-- Headers -->
      <details class="tryit__section"${headers.length ? ' open' : ''}>
        <summary class="tryit__section-hd">
          <span class="tryit__section-name">Headers</span>
          ${headers.length ? `<span class="tryit__chip">${headers.length}</span>` : ''}
        </summary>
        <div class="tryit__section-bd">
          <div class="tryit__rows" data-tryit-params="headers">
            ${headers.map(h => _row(h.key, h.value)).join('')}
          </div>
          <button type="button" class="tryit__add" data-tryit-add="headers">
            + Add header
          </button>
        </div>
      </details>

      <!-- Query Parameters -->
      <details class="tryit__section"${qParams.length ? ' open' : ''}>
        <summary class="tryit__section-hd">
          <span class="tryit__section-name">Query Parameters</span>
          ${qParams.length ? `<span class="tryit__chip">${qParams.length}</span>` : ''}
        </summary>
        <div class="tryit__section-bd">
          <div class="tryit__rows" data-tryit-params="query">
            ${qEditable.map(p => _row(p.key, p.value)).join('')}
          </div>
          <button type="button" class="tryit__add" data-tryit-add="query">
            + Add parameter
          </button>
          ${qLocked.length ? `
          <div class="tryit__locked" data-tryit-locked>
            <p class="tryit__locked-label">
              ${_svgLock()} Fixed — always sent, cannot be edited
            </p>
            ${qLocked.map(p => _lockedRow(p.key, p.value)).join('')}
          </div>` : ''}
        </div>
      </details>

      ${hasFormBody ? `
      <!-- Body (form-data / urlencoded) — editable labelled fields -->
      <details class="tryit__section" open>
        <summary class="tryit__section-hd">
          <span class="tryit__section-name">Request Body</span>
          <span class="tryit__chip">${esc(api.bodyMode === 'urlencoded' ? 'form-urlencoded' : 'form-data')}</span>
        </summary>
        <div class="tryit__section-bd" data-tryit-params="body">
          ${bodyFields.map(_bodyField).join('')}
        </div>
      </details>` : hasRawBody ? `
      <!-- Body -->
      <details class="tryit__section" open>
        <summary class="tryit__section-hd">
          <span class="tryit__section-name">Request Body</span>
          <span class="tryit__chip">JSON</span>
        </summary>
        <div class="tryit__section-bd">
          <textarea class="tryit__body" data-tryit-body
                    data-template="${esc(api.bodyRaw || '')}"
                    spellcheck="false">${esc(api.bodyRaw || '')}</textarea>
        </div>
      </details>` : ''}

      <!-- Send -->
      <div class="tryit__actions">
        <button type="button" class="tryit__send" data-tryit-send>
          Send Request
        </button>
        <button type="button" class="tryit__clear" data-tryit-clear hidden>
          Clear
        </button>
      </div>

      <!-- Live Response (hidden until first send) -->
      <div class="tryit__response" data-tryit-response hidden>
        <div class="tryit__resp-bar">
          <span class="tryit__status" data-tryit-status></span>
          <span class="tryit__elapsed" data-tryit-elapsed></span>
          <button type="button" class="dev-panel__copy tryit__resp-copy"
                  data-copy-role="tryit" aria-label="Copy response">
            <span class="copy-btn__label">Copy</span>
          </button>
        </div>
        <pre class="dev-panel__pre tryit__resp-body"
             data-tryit-resp-body></pre>
      </div>

    </div>`;
}

/**
 * Generate a single key-value row.
 * data-template on the value input allows env-var substitution.
 */
function _row(key = '', value = '') {
  return `
    <div class="tryit__row">
      <input type="text" class="tryit__key"  value="${esc(key)}"   placeholder="Key" />
      <input type="text" class="tryit__val"  value="${esc(value)}" placeholder="Value"
             data-template="${esc(value)}" />
      <button type="button" class="tryit__del" data-tryit-del aria-label="Remove">×</button>
    </div>`;
}

/**
 * A labelled, editable form-body field (form-data / urlencoded). The field key
 * is fixed (it's the API's documented body parameter); the value is editable
 * and env-aware. `description` renders as a hint, `placeholder` as the input
 * placeholder — both come from the collection (no per-field hardcoding).
 *
 * Each field renders with an opt-in checkbox. Fields are excluded from the
 * request body by default; checking the checkbox enables and includes them.
 */
function _bodyField(param) {
  const key = param.key || '';
  const val = param.value || '';
  const hint = param.description || '';
  const placeholder = param.placeholder || '';
  // Unique ID for the checkbox↔label pair (safe for any ASCII key name)
  const cbId = `tryit-opt-${key.replace(/[^a-z0-9]/gi, '_')}`;
  return `
    <div class="tryit__field">
      <div class="tryit__field-head">
        <input type="checkbox" class="tryit__opt-cb"
               id="${esc(cbId)}" data-bkey="${esc(key)}" />
        <label class="tryit__lbl tryit__lbl--opt" for="${esc(cbId)}">${esc(key)}</label>
      </div>
      <input type="text" class="tryit__input tryit__bval"
             data-bkey="${esc(key)}"
             value="${esc(val)}"
             data-template="${esc(val)}"
             placeholder="${esc(placeholder)}"
             spellcheck="false" autocomplete="off"
             disabled />
      ${hint ? `<p class="tryit__hint">${esc(hint)}</p>` : ''}
    </div>`;
}

/**
 * A read-only "locked" query-param row. Its value is fixed (no edit, no
 * delete) and is always included in the request. The authoritative key/value
 * live in data-attributes so the URL/send sync can read them reliably.
 */
function _lockedRow(key = '', value = '') {
  return `
    <div class="tryit__row tryit__row--locked"
         data-locked-key="${esc(key)}" data-locked-value="${esc(value)}">
      <input type="text" class="tryit__key" value="${esc(key)}" readonly tabindex="-1"
             aria-label="Fixed parameter name" />
      <input type="text" class="tryit__val" value="${esc(value)}" readonly tabindex="-1"
             aria-label="Fixed parameter value" />
      <span class="tryit__lock" title="Fixed parameter — cannot be edited">${_svgLock()}</span>
    </div>`;
}

function _svgLock() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>`;
}

/** Authoritative [key,value] pairs for all locked (fixed) query params. */
function _lockedPairs(panel) {
  return [...panel.querySelectorAll('[data-tryit-locked] .tryit__row--locked')]
    .map(r => [r.getAttribute('data-locked-key') || '', r.getAttribute('data-locked-value') || ''])
    .filter(([k]) => k);
}
function _lockedKeySet(panel) {
  return new Set(_lockedPairs(panel).map(([k]) => k));
}

// ══════════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ══════════════════════════════════════════════════════════════════════════

function _switchTab(tab, panel) {
  const target = tab.getAttribute('data-panel-tab');
  panel.querySelectorAll('[data-panel-tab]').forEach(t => {
    const on = t === tab;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', String(on));
  });
  panel.querySelectorAll('.dev-panel__pane').forEach(p => {
    p.hidden = p.getAttribute('data-pane') !== target;
  });

  // When switching to Try It: apply env + sync URL
  if (target === 'tryit') {
    _applyEnvToPanel(panel);
    _syncParamsToUrl(panel);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// CODE-TAB EVENT HANDLERS
// ══════════════════════════════════════════════════════════════════════════

function _switchLang(select, panel) {
  const lang   = select.value;
  const slug   = panel.getAttribute('data-api-slug');
  const hlLang = lang === 'curl' ? 'bash' : lang;

  import('../data/docStore.js').then(({ docStore }) => {
    const api = docStore.getApiBySlug(slug);
    if (!api?.codeSamples) return;
    const code = api.codeSamples[lang] || '';
    const wrap = panel.querySelector('[data-panel-code]');
    if (!wrap) return;
    const codeEl = wrap.querySelector('code');
    const preEl  = wrap.querySelector('pre');
    if (codeEl) codeEl.innerHTML = highlightCode(code, hlLang);
    if (preEl)  preEl.setAttribute('data-language', hlLang);
  });
}

function _switchResp(select, panel) {
  const idx  = select.value;
  const code = select.selectedOptions?.[0]?.dataset.code || '';
  select.className = select.className.replace(/\bresp-\w+/g, '').trim();
  select.classList.add(_respClass(code));
  panel.querySelectorAll('.dev-panel__resp-panel').forEach(p => {
    const on = p.getAttribute('data-resp-panel') === idx;
    p.classList.toggle('is-active', on);
    p.hidden = !on;
  });
}

function _copy(btn, panel) {
  const role = btn.getAttribute('data-copy-role');
  let text = '';
  if (role === 'request')
    text = panel.querySelector('[data-panel-code] code')?.textContent || '';
  else if (role === 'response')
    text = panel.querySelector('[data-panel-response] .dev-panel__resp-panel.is-active code')?.textContent || '';
  else if (role === 'tryit')
    text = panel.querySelector('[data-tryit-resp-body]')?.textContent || '';
  if (!text) return;
  import('../utils/clipboard.js').then(({ copyToClipboard, showCopyFeedback }) => {
    copyToClipboard(text).then(() => showCopyFeedback(btn));
  });
}

// ══════════════════════════════════════════════════════════════════════════
// TRY-IT EVENT HANDLERS
// ══════════════════════════════════════════════════════════════════════════

function _addParamRow(btn) {
  const type = btn.getAttribute('data-tryit-add');
  const list = btn.closest('.tryit__section-bd')?.querySelector(`[data-tryit-params="${type}"]`);
  if (!list) return;
  list.insertAdjacentHTML('beforeend', _row());
  list.lastElementChild?.querySelector('.tryit__key')?.focus();
}

async function _send(panel) {
  const sendBtn    = panel.querySelector('[data-tryit-send]');
  const responseEl = panel.querySelector('[data-tryit-response]');

  // Base URL: strip any query string already in the URL bar (params come from rows)
  const rawUrl = (panel.querySelector('[data-tryit-url]')?.value || '').trim();
  if (!rawUrl) return;
  const baseUrl = rawUrl.split('?')[0];

  const token  = (panel.querySelector('[data-tryit-token]')?.value || '').trim();
  _saveToken(token);

  const method = panel.getAttribute('data-api-method') || 'GET';

  // ── Headers ─────────────────────────────────────────────────────────
  const headers = {};
  panel.querySelectorAll('[data-tryit-params="headers"] .tryit__row').forEach(r => {
    const k = r.querySelector('.tryit__key')?.value?.trim();
    const v = r.querySelector('.tryit__val')?.value?.trim() || '';
    if (!k) return;
    // Custom Support Ironman FLITS - 08-07-2026 START
    // A header whose value is still an unresolved `{{var}}` placeholder (e.g.
    // x-integration-app-name when app_name hasn't been set) must not be sent
    // to the live API as literal template text — skip it instead.
    if (/^\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}$/.test(v)) return;
    // Custom Support Ironman FLITS - 08-07-2026 END
    headers[k] = v;
  });
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // ── Query params → build final URL with proper encoding ──────────────
  const qPairs = [
    ...[...panel.querySelectorAll('[data-tryit-params="query"] .tryit__row')]
      .map(r => [
        r.querySelector('.tryit__key')?.value?.trim() || '',
        r.querySelector('.tryit__val')?.value?.trim() || '',
      ])
      .filter(([k]) => k),
    ..._lockedPairs(panel),   // always send fixed params (e.g. filters)
  ];

  let finalUrl = baseUrl;
  if (qPairs.length) {
    const qs = qPairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    finalUrl = `${baseUrl}?${qs}`;
  }

  // ── Body ─────────────────────────────────────────────────────────────
  const fetchOpts = { method, headers };
  const bodyFieldEls = [...panel.querySelectorAll('[data-tryit-params="body"] .tryit__bval')];
  if (bodyFieldEls.length && !['GET', 'HEAD'].includes(method)) {
    // Custom Support Ironman FLITS - 08-07-2026 START
    // The collection distinguishes "urlencoded" vs "formdata" bodies
    // (js/parser/postmanParser.js bodyMode) and documents the matching
    // Content-Type header. Previously this always built multipart FormData
    // regardless of mode, so urlencoded endpoints (Apply Loyalty Points,
    // Apply Store Credit, Update Profile, Get Customer Available Spent Rule)
    // were sent as multipart/form-data instead of the required
    // application/x-www-form-urlencoded, causing the live API to reject or
    // misread the body even when every field value was correct.
    const bodyMode = panel.getAttribute('data-api-body-mode') || 'formdata';
    if (bodyMode === 'urlencoded') {
      const params = new URLSearchParams();
      bodyFieldEls.forEach(inp => {
        const field = inp.closest('.tryit__field');
        const cb    = field?.querySelector('.tryit__opt-cb');
        if (cb && !cb.checked) return;
        const k = inp.getAttribute('data-bkey');
        if (k) params.append(k, inp.value);
      });
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      fetchOpts.body = params.toString();
    } else {
      // Form-data body — send as multipart. Let the browser set the
      // Content-Type (with boundary); a manual JSON content-type would break it.
      const fd = new FormData();
      bodyFieldEls.forEach(inp => {
        // If the field has an opt-in checkbox, only include it when checked.
        const field = inp.closest('.tryit__field');
        const cb    = field?.querySelector('.tryit__opt-cb');
        if (cb && !cb.checked) return;
        const k = inp.getAttribute('data-bkey');
        if (k) fd.append(k, inp.value);
      });
      delete headers['Content-Type'];
      delete headers['content-type'];
      fetchOpts.body = fd;
    }
    // Custom Support Ironman FLITS - 08-07-2026 END
  } else {
    const bodyText = panel.querySelector('[data-tryit-body]')?.value?.trim() || null;
    if (bodyText && !['GET', 'HEAD'].includes(method)) fetchOpts.body = bodyText;
  }

  // Loading state
  if (sendBtn)    { sendBtn.disabled = true; sendBtn.textContent = 'Sending…'; }
  if (responseEl) responseEl.hidden = true;

  const t0 = performance.now();

  try {
    const resp    = await fetch(finalUrl, fetchOpts);
    const elapsed = Math.round(performance.now() - t0);
    const body    = await resp.text();
    _showResponse(panel, { ok: true, status: resp.status, statusText: resp.statusText, body, elapsed });
  } catch (err) {
    const elapsed = Math.round(performance.now() - t0);
    // fetch() rejects with a TypeError for network failures AND for CORS blocks —
    // the most common reason a browser-side Try It request fails against an API
    // hosted on a different origin. Give a clear, actionable message instead of
    // the bare "Failed to fetch".
    const isNetworkOrCors = err instanceof TypeError;
    const body = isNetworkOrCors
      ? `Could not reach the API from the browser.\n\n`
        + `This usually means the request was blocked by CORS (the API must allow `
        + `requests from this documentation's domain) or the network is unavailable.\n\n`
        + `The cURL / code samples above run fine from a terminal or server — Try It `
        + `is limited to APIs that permit cross-origin browser requests.\n\n`
        + `(${err.message || 'Failed to fetch'})`
      : (err.message || 'Request failed');
    _showResponse(panel, { ok: false, body, elapsed });
  } finally {
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send Request'; }
    panel.querySelector('[data-tryit-clear]').hidden = false;
  }
}

function _showResponse(panel, { ok, status, statusText, body, elapsed }) {
  const responseEl = panel.querySelector('[data-tryit-response]');
  const statusEl   = panel.querySelector('[data-tryit-status]');
  const elapsedEl  = panel.querySelector('[data-tryit-elapsed]');
  const bodyEl     = panel.querySelector('[data-tryit-resp-body]');

  if (!responseEl) return;
  responseEl.hidden = false;

  if (elapsedEl) elapsedEl.textContent = `${elapsed}ms`;

  if (ok) {
    const cls = status >= 200 && status < 300 ? 'resp-2xx'
              : status >= 400 && status < 500 ? 'resp-4xx' : 'resp-5xx';
    if (statusEl) {
      statusEl.textContent = `${status} ${statusText}`;
      statusEl.className   = `tryit__status ${cls}`;
    }
    let display = body;
    try { display = JSON.stringify(JSON.parse(body), null, 2); } catch {}
    if (bodyEl) bodyEl.innerHTML = highlightCode(display, 'json');
  } else {
    if (statusEl) {
      statusEl.textContent = 'Error';
      statusEl.className   = 'tryit__status resp-5xx';
    }
    if (bodyEl) bodyEl.textContent = body;
  }

  responseEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function _clearResponse(panel) {
  const responseEl = panel.querySelector('[data-tryit-response]');
  const clearBtn   = panel.querySelector('[data-tryit-clear]');
  if (responseEl) responseEl.hidden = true;
  if (clearBtn)   clearBtn.hidden   = true;
}

// ══════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════

function _groupResponses(responses) {
  const map = new Map();
  (responses || []).forEach(r => {
    if (r.isExample && /curl/i.test(r.name || '')) return;
    const code = r.code || 'other';
    if (!map.has(code)) map.set(code, []);
    map.get(code).push(r);
  });
  return new Map([...map.entries()].sort((a, b) => {
    const av = typeof a[0] === 'number' ? a[0] : 999;
    const bv = typeof b[0] === 'number' ? b[0] : 999;
    return av - bv;
  }));
}

/**
 * Flat, display-ordered list of saved examples: grouped by status code (via
 * _groupResponses, which also drops curl-only examples) and then flattened so
 * every example keeps its own entry. Each entry is { code, r }.
 */
function _orderedResponses(responses) {
  const flat = [];
  for (const [code, items] of _groupResponses(responses)) {
    for (const r of items) flat.push({ code, r });
  }
  return flat;
}

function _respClass(code) {
  const n = Number(code);
  if (n >= 200 && n < 300) return 'resp-2xx';
  if (n >= 400 && n < 500) return 'resp-4xx';
  if (n >= 500)            return 'resp-5xx';
  return 'resp-other';
}

function _truncate(str, max) {
  const s = String(str);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
