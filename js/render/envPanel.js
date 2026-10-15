/**
 * Global Environment Variables — compact button + floating popup UI.
 * All data/persistence logic lives in envStore.js — nothing here changes that.
 */

import { loadEnv, getEnv, setVar, clearAll, discoverVariables } from '../features/envStore.js';
import { escapeHtml as esc } from './contentHelpers.js';

const BTN_ID   = 'env-panel-btn';
const POPUP_ID = 'env-panel-popup';

// Module-level state — shared between mount code and document-level handlers.
let _knownVars = [];
let _popupOpen = false;
let _popupEl   = null;   // live popup element
let _btnEl     = null;   // live trigger button element

// ── Public API ──────────────────────────────────────────────────────────────

export function initEnvPanel(doc) {
  _knownVars = discoverVariables(doc);
  loadEnv();
  _mount();
}

export function refreshEnvPanel() {
  _updateButton();
  if (_popupOpen && _popupEl) _updatePopupInputs();
}

// ── Mount ───────────────────────────────────────────────────────────────────

function _mount() {
  const contentWrap = document.querySelector('.content-wrap');
  if (!contentWrap) return;

  // Remove document-level handlers from any previous mount to prevent accumulation.
  document.removeEventListener('mousedown', _onOutsideMousedown);
  document.removeEventListener('keydown',   _onEscKey);

  // Reset state
  _popupOpen = false;
  _popupEl   = null;
  _btnEl     = null;

  // Remove previous DOM instances
  document.querySelector('.env-btn-bar')?.remove();
  document.getElementById(POPUP_ID)?.remove();

  // ── Button bar ────────────────────────────────────────────────────────────
  const bar = document.createElement('div');
  bar.className = 'env-btn-bar';
  bar.innerHTML = _buildButtonHtml();
  contentWrap.insertBefore(bar, contentWrap.firstElementChild);

  // ── Popup ─────────────────────────────────────────────────────────────────
  // Appended to <body> to avoid being clipped by any ancestor overflow:hidden.
  const popup = document.createElement('div');
  popup.id        = POPUP_ID;
  popup.className = 'env-popup';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-modal', 'true');
  popup.setAttribute('aria-label', 'Environment Variables');
  popup.hidden    = true;
  popup.innerHTML = _buildPopupHtml(getEnv());
  document.body.appendChild(popup);

  // Store live references for document-level handlers
  _popupEl = popup;
  _btnEl   = bar.querySelector(`#${BTN_ID}`);

  // Wire up all per-component listeners
  _attachListeners(popup);

  // Register document-level listeners once — named functions so they're removable
  document.addEventListener('mousedown', _onOutsideMousedown);
  document.addEventListener('keydown',   _onEscKey);
}

// ── HTML ────────────────────────────────────────────────────────────────────

function _buildButtonHtml() {
  return `
    <button type="button" id="${BTN_ID}" class="env-btn"
            aria-haspopup="dialog" aria-expanded="false"
            title="Configure environment variables">
      ${_iconBraces()}
      <span class="env-btn__label">Environment Variables</span>
    </button>
  `;
}

function _buildPopupHtml(env) {
  const { total, setCount } = _counts(env);
  const hasVars = total > 0;
  return `
    <div class="env-popup__header">
      <div class="env-popup__header-left">
        ${_iconBraces()}
        <span class="env-popup__title">Environment Variables</span>
        <span class="env-popup__badge" data-env-popup-badge>${_badgeText(total, setCount)}</span>
      </div>
      <button type="button" class="env-popup__close" data-env-close
              aria-label="Close environment variables">
        ${_iconClose()}
      </button>
    </div>

    <div class="env-popup__search-wrap">
      <input type="text" class="env-popup__search" data-env-search
             placeholder="Search variables…"
             aria-label="Filter environment variables"
             autocomplete="off" spellcheck="false" />
    </div>

    <div class="env-popup__body" id="env-popup-body" role="list">
      ${!hasVars
        ? `<p class="env-popup__empty">No &#123;&#123;variables&#125;&#125; found in the collection.</p>`
        : _knownVars.map(name => _varRow(name, env[name] ?? '')).join('')
      }
    </div>

    <div class="env-popup__footer">
      <button type="button" class="env-popup__clear-all" data-env-clear-all
              ${setCount === 0 ? 'disabled' : ''}>
        Clear All
      </button>
    </div>
  `;
}

function _varRow(name, value) {
  return `
    <div class="env-popup__var" data-env-row="${esc(name)}" role="listitem">
      <label class="env-popup__var-name"
             title="${esc(name)}"
             for="env-var-${esc(name)}">${esc(name)}</label>
      <div class="env-popup__var-input-wrap">
        <input type="text"
               class="env-popup__var-input"
               id="env-var-${esc(name)}"
               data-env-var="${esc(name)}"
               value="${esc(value)}"
               placeholder="Enter value…"
               autocomplete="off"
               spellcheck="false" />
        <button type="button"
                class="env-popup__var-clear${value ? '' : ' u-hidden'}"
                data-env-var-clear="${esc(name)}"
                aria-label="Clear ${esc(name)}"
                tabindex="-1">×</button>
      </div>
    </div>`;
}

// ── Per-component event listeners ────────────────────────────────────────────
//
// Rules:
//  • Direct listeners for fixed, known single elements (close btn, search, clear-all).
//    → e.target ambiguity is impossible; no reliance on .closest() traversal.
//  • Delegated listeners only for dynamic multi-instance targets (var rows, clear-x btns).

function _attachListeners(popup) {
  // ── Trigger button ──────────────────────────────────────────────────────
  _btnEl?.addEventListener('click', e => {
    e.stopPropagation();
    _popupOpen ? _closePopup() : _openPopup();
  });

  // ── Close button — direct listener, no delegation ──────────────────────
  // Root cause fix for Issue #1: direct listener means e.target is irrelevant;
  // no .closest() call that could fail on SVG child elements.
  popup.querySelector('[data-env-close]')?.addEventListener('click', e => {
    e.stopPropagation();
    _closePopup();
  });

  // ── Clear All button — direct listener ─────────────────────────────────
  popup.querySelector('[data-env-clear-all]')?.addEventListener('click', e => {
    e.stopPropagation();
    clearAll();
    popup.querySelectorAll('.env-popup__var-input').forEach(i => { i.value = ''; });
    popup.querySelectorAll('[data-env-var-clear]').forEach(b => b.classList.add('u-hidden'));
    _updateMeta(popup);
  });

  // ── Search — direct listener on the input element ──────────────────────
  // Root cause fix for Issue #4: attaching directly to the search input means
  // the handler fires exactly when the search input changes, with no delegation
  // chain that could be short-circuited by another branch.
  popup.querySelector('[data-env-search]')?.addEventListener('input', e => {
    _filterVars(popup, e.target.value.trim().toLowerCase());
  });

  // ── Clear single variable — delegated (N dynamic targets) ─────────────
  popup.addEventListener('click', e => {
    const clearBtn = e.target.closest('[data-env-var-clear]');
    if (!clearBtn) return;
    e.stopPropagation();
    const name = clearBtn.dataset.envVarClear;
    setVar(name, '');
    const inp = popup.querySelector(`[data-env-var="${CSS.escape(name)}"]`);
    if (inp) inp.value = '';
    clearBtn.classList.add('u-hidden');
    _updateMeta(popup);
  });

  // ── Variable value inputs — delegated (N dynamic targets) ─────────────
  popup.addEventListener('input', e => {
    const varInput = e.target.closest('.env-popup__var-input');
    if (!varInput) return;
    const name = varInput.dataset.envVar;
    if (!name) return;
    setVar(name, varInput.value);
    _refreshVarClearBtn(popup, name, varInput.value);
    _updateMeta(popup);
  });
}

// ── Document-level handlers (named → removable, no accumulation) ────────────

function _onOutsideMousedown(e) {
  if (!_popupOpen || !_popupEl || !_btnEl) return;
  // Keep open when click is inside the popup or on the trigger button itself
  if (_popupEl.contains(e.target) || _btnEl.contains(e.target)) return;
  _closePopup();
}

function _onEscKey(e) {
  if (e.key === 'Escape' && _popupOpen) {
    _closePopup();
    _btnEl?.focus();
  }
}

// ── Open / Close ─────────────────────────────────────────────────────────────

function _openPopup() {
  if (!_popupEl || !_btnEl) return;
  _positionPopup();
  _popupEl.hidden = false;
  _popupOpen = true;
  _btnEl.setAttribute('aria-expanded', 'true');
  // Focus search input after paint so it's available to the user immediately
  requestAnimationFrame(() => _popupEl?.querySelector('[data-env-search]')?.focus());
}

function _closePopup() {
  if (!_popupEl) return;
  _popupEl.hidden = true;
  _popupOpen = false;
  _btnEl?.setAttribute('aria-expanded', 'false');
  // Clear search so next open starts fresh
  const search = _popupEl.querySelector('[data-env-search]');
  if (search?.value) {
    search.value = '';
    _filterVars(_popupEl, '');
  }
}

// ── Positioning ─────────────────────────────────────────────────────────────
//
// Root cause fix for Issue #3:
// Uses position:absolute + document-coordinate top (rect.bottom + window.scrollY).
// An absolutely-positioned element on <body> renders at a fixed point in the
// document, so it scrolls with the page instead of staying fixed in the viewport.
// On layouts where the window doesn't scroll (inner-div scroller), window.scrollY≈0
// and the popup anchors correctly below the button regardless.

function _positionPopup() {
  const rect   = _btnEl.getBoundingClientRect();
  const popupW = 460;
  const gap    = 6;

  // Vertical: document-Y of button bottom + gap
  _popupEl.style.top = `${rect.bottom + window.scrollY + gap}px`;

  // Horizontal: right-align popup to button's right edge, clamped to viewport
  let left = rect.right - popupW;
  if (left < 8) left = 8;
  if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
  _popupEl.style.left  = `${left}px`;
  _popupEl.style.right = 'auto';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _updateButton() {
  const badge = document.querySelector('.env-btn-bar [data-env-badge]');
  if (!badge) return;
  const env = getEnv();
  const { total, setCount } = _counts(env);
  badge.textContent = _badgeText(total, setCount);
}

function _updatePopupInputs() {
  const env = getEnv();
  _popupEl.querySelectorAll('.env-popup__var-input').forEach(input => {
    const name = input.dataset.envVar;
    if (!name) return;
    const newVal = env[name] ?? '';
    if (input.value !== newVal) input.value = newVal;
    _refreshVarClearBtn(_popupEl, name, newVal);
  });
}

function _filterVars(popup, query) {
  // Ignore Postman-style curly braces so a search for "{{app_name}}" (or a
  // partial like "{{app") still matches the variable "app_name".
  const q = (query || '').replace(/[{}]/g, '').trim();
  popup.querySelectorAll('[data-env-row]').forEach(row => {
    const name = (row.dataset.envRow || '').toLowerCase();
    row.hidden = q ? !name.includes(q) : false;
  });
}

function _refreshVarClearBtn(popup, name, value) {
  const btn = popup.querySelector(`[data-env-var-clear="${CSS.escape(name)}"]`);
  if (btn) btn.classList.toggle('u-hidden', !value);
}

function _updateMeta(popup) {
  const env = getEnv();
  const { total, setCount } = _counts(env);

  const badge = popup.querySelector('[data-env-popup-badge]');
  if (badge) badge.textContent = _badgeText(total, setCount);

  const clearAllBtn = popup.querySelector('[data-env-clear-all]');
  if (clearAllBtn) clearAllBtn.disabled = setCount === 0;

  _updateButton();
}

function _counts(env) {
  const total    = _knownVars.length;
  const setCount = Object.values(env).filter(v => v !== '').length;
  return { total, setCount };
}

function _badgeText(total, setCount) {
  const varLabel = `${total} var${total !== 1 ? 's' : ''}`;
  return setCount > 0 ? `${varLabel} · ${setCount} set` : varLabel;
}

// SVGs get pointer-events:none so the button element is always the click target.
// This eliminates any risk of e.target being an SVGLineElement / SVGPathElement
// when the user clicks on the icon area of a button.
function _iconBraces() {
  return `<svg class="env-icon" width="14" height="14" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true" focusable="false" style="pointer-events:none">
    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/>
    <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>
  </svg>`;
}

function _iconClose() {
  return `<svg width="14" height="14" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true" focusable="false" style="pointer-events:none">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;
}
