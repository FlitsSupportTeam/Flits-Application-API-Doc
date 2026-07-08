/**
 * In-page code samples and response example blocks.
 */
import { LANGUAGES } from '../utils/codeSamples.js';
import { highlightCode } from '../utils/highlighter.js';
import { escapeHtml } from './contentHelpers.js';

export function renderCodeSamplesSection(api, lang = 'curl') {
  const samples = api.codeSamples || { curl: api.curl };
  const langOptions = LANGUAGES.map(
    (l) => `<option value="${l.id}" ${l.id === lang ? 'selected' : ''}>${l.label}</option>`
  ).join('');

  const sampleCode = samples[lang] || samples.curl || '';
  const hlLang = lang === 'curl' ? 'bash' : lang;
  const highlighted = highlightCode(sampleCode, hlLang);

  return `
    <section class="page-section" id="code-samples" data-toc-section data-toc-level="2" data-toc-title="Code samples">
      <h2 class="page-section__title">Code samples</h2>
      <div class="sample-block">
        <div class="sample-block__toolbar">
          <label class="sample-block__lang">
            <span class="sr-only">Language</span>
            <select class="sample-lang-select" data-api-slug="${api.slug}" aria-label="Code sample language">
              ${langOptions}
            </select>
          </label>
          <button type="button" class="copy-btn" data-copy-target="sample" aria-label="Copy code sample">
            <span class="copy-btn__label">Copy</span>
          </button>
        </div>
        <div class="sample-block__body" data-sample-container>
          <pre class="code-block" data-language="${hlLang}"><code>${highlighted}</code></pre>
        </div>
      </div>
    </section>
  `;
}

export function renderResponsesSection(api) {
  const responses = groupResponses(api.responses);
  const entries = [...responses.entries()];
  if (!entries.length) return '';

  const tabs = entries
    .map(([code, items], i) => {
      const statusClass = statusCodeClass(code);
      return `
        <button type="button" class="sample-tab ${i === 0 ? 'is-active' : ''}" role="tab"
          data-sample-tab="response" data-sample-value="${code}" aria-selected="${i === 0}">
          <span class="status-badge ${statusClass}">${code}</span>
        </button>
      `;
    })
    .join('');

  const panels = entries
    .map(([code, items], i) => {
      const primary = items.find((r) => !r.isExample) || items[0];
      const body = primary?.body || '';
      const highlighted = highlightCode(body, 'json');
      return `
        <div class="sample-tab-panel ${i === 0 ? 'is-active' : ''}" role="tabpanel"
          data-sample-panel="response" data-sample-value="${code}" ${i !== 0 ? 'hidden' : ''}>
          <p class="sample-tab-panel__meta">
            <span class="status-badge ${statusCodeClass(code)}">${code}</span>
            ${escapeHtml(primary?.status || '')} — ${escapeHtml(shortLabel(primary?.name || '', 48))}
          </p>
          <pre class="code-block code-block--response"><code>${highlighted}</code></pre>
        </div>
      `;
    })
    .join('');

  return `
    <section class="page-section" id="responses" data-toc-section data-toc-level="2" data-toc-title="Response examples">
      <h2 class="page-section__title">Response examples</h2>
      <div class="sample-block sample-block--responses">
        <div class="sample-tabs" role="tablist">${tabs}</div>
        <div class="sample-tab-panels">${panels}</div>
        <button type="button" class="copy-btn copy-btn--block" data-copy-target="response" aria-label="Copy response">
          <span class="copy-btn__label">Copy response</span>
        </button>
      </div>
    </section>
  `;
}

export function handleSampleBlockInteraction(target) {
  const select = target.closest('.sample-lang-select');
  if (select) {
    const lang = select.value;
    const slug = select.getAttribute('data-api-slug');
    import('../data/docStore.js').then(({ docStore }) => {
      const api = docStore.getApiBySlug(slug);
      if (!api?.codeSamples) return;
      const code = api.codeSamples[lang] || '';
      const container = select.closest('.sample-block')?.querySelector('[data-sample-container] code');
      if (container) {
        const hlLang = lang === 'curl' ? 'bash' : lang;
        container.innerHTML = highlightCode(code, hlLang);
      }
    });
    return;
  }

  const tab = target.closest('[data-sample-tab]');
  if (tab) {
    const group = tab.getAttribute('data-sample-tab');
    const value = tab.getAttribute('data-sample-value');
    const block = tab.closest('.sample-block--responses');
    block?.querySelectorAll(`[data-sample-tab="${group}"]`).forEach((t) => {
      t.classList.toggle('is-active', t === tab);
      t.setAttribute('aria-selected', String(t === tab));
    });
    block?.querySelectorAll(`[data-sample-panel="${group}"]`).forEach((p) => {
      const active = p.getAttribute('data-sample-value') === value;
      p.classList.toggle('is-active', active);
      p.hidden = !active;
    });
  }
}

function groupResponses(responses) {
  const map = new Map();
  (responses || []).forEach((r) => {
    if (r.isExample && /curl/i.test(r.name)) return;
    const code = r.code || 'other';
    if (!map.has(code)) map.set(code, []);
    map.get(code).push(r);
  });
  return new Map(
    [...map.entries()].sort((a, b) => {
      const ac = typeof a[0] === 'number' ? a[0] : 999;
      const bc = typeof b[0] === 'number' ? b[0] : 999;
      return ac - bc;
    })
  );
}

function statusCodeClass(code) {
  const c = Number(code);
  if (c >= 200 && c < 300) return 'status--success';
  if (c >= 400 && c < 500) return 'status--warning';
  if (c >= 500) return 'status--error';
  return 'status--muted';
}

function shortLabel(str, max) {
  const s = String(str);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
