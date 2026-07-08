/**
 * Run in Postman
 * ──────────────
 * Postman's official "Run in Postman" button forks a collection that is HOSTED
 * ON POSTMAN'S CLOUD, referenced by a collection UID:
 *
 *   https://god.gw.postman.com/run-collection/{UID}?action=collection/fork&...
 *
 * That is the ONLY officially supported mechanism for a silent one-click fork
 * into the user's workspace. There is NO documented way to auto-fork an
 * arbitrary self-hosted JSON URL — the old `postman://import/folder?url=`
 * route is undocumented and silently ignored (Postman opens but never imports),
 * which is why the previous implementation appeared broken.
 *
 * This project self-hosts the collection JSON (Shopify CDN / local), so the
 * default experience is Postman's officially supported IMPORT-BY-LINK flow:
 *   1. Open Postman → Import → Link
 *   2. Paste the collection URL (auto-copied to the clipboard on open)
 *
 * UPGRADE PATH (optional, no code change beyond this constant):
 * If you publish "Flits App" to a PUBLIC Postman workspace you'll get a
 * collection UID. Paste it into POSTMAN_COLLECTION_UID below and the button
 * automatically becomes a true one-click fork — no other change required.
 */

import { getCollectionPath } from '../parser/postmanParser.js';
import { docStore } from '../data/docStore.js';

// ─── Configuration ──────────────────────────────────────────────────────────
// Leave empty for the self-hosted import-by-link flow (default).
// Set to a published collection UID (e.g. '12345678-abcd-...') to enable the
// official one-click fork. Obtain it via Postman → Share → "Via Run in Postman".
const POSTMAN_COLLECTION_UID = '';

const BTN_ID     = 'download-collection-btn';
const POPOVER_ID = 'rip-popover';

// ─── Entry point ──────────────────────────────────────────────────────────────
export function runInPostman() {
  const btn = document.getElementById(BTN_ID);

  // If a published UID is configured → real official one-click fork.
  if (POSTMAN_COLLECTION_UID) {
    _launchOfficialFork(POSTMAN_COLLECTION_UID);
    return;
  }

  // Default: officially-supported import-by-link flow.
  _openPopover(btn, _absoluteCollectionUrl());
}

// ─── Official fork (only when a published UID is configured) ───────────────────
function _launchOfficialFork(uid) {
  const collectionRef = `entityId=${uid}&entityType=collection`;
  const forkUrl =
    `https://god.gw.postman.com/run-collection/${encodeURIComponent(uid)}` +
    `?action=collection/fork` +
    `&source=rip_website` +
    `&collection-url=${encodeURIComponent(collectionRef)}`;
  window.open(forkUrl, '_blank', 'noopener,noreferrer');
}

// ─── Open Postman desktop app (best-effort launch; import done by the user) ────
function _openPostmanApp() {
  // Bare scheme focuses/opens the desktop app if installed. We intentionally do
  // NOT pass an undocumented import action — the user completes Import → Link.
  const a = Object.assign(document.createElement('a'), {
    href: 'postman://app',
    style: 'display:none',
  });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 200);
}

// ─── Popover lifecycle ────────────────────────────────────────────────────────
function _openPopover(anchorBtn, collectionUrl) {
  _closePopover();

  const collectionName = docStore.doc?.meta?.name || 'API';

  const pop = document.createElement('div');
  pop.id        = POPOVER_ID;
  pop.className = 'rip-popover';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Run in Postman');
  pop.setAttribute('tabindex', '-1');

  pop.innerHTML = `
    <div class="rip-popover__header">
      ${_svgPostman()}
      <div class="rip-popover__header-text">
        <p class="rip-popover__title">Run in Postman</p>
        <p class="rip-popover__sub">Import the full <strong>${_he(collectionName)}</strong> collection in two steps.</p>
      </div>
    </div>

    <hr class="rip-popover__rule" aria-hidden="true">

    <ol class="rip-popover__flow">
      <li class="rip-popover__step">
        <span class="rip-popover__step-num">1</span>
        <div class="rip-popover__step-body">
          <p class="rip-popover__step-title">Open Postman, then choose <kbd>Import</kbd> &rarr; <kbd>Link</kbd></p>
          <button type="button" class="rip-popover__btn" id="rip-btn-open">
            ${_svgExternal()}<span>Open Postman app</span>
          </button>
        </div>
      </li>
      <li class="rip-popover__step">
        <span class="rip-popover__step-num">2</span>
        <div class="rip-popover__step-body">
          <p class="rip-popover__step-title">
            Paste this URL then click <kbd>Continue</kbd>
          </p>
          <div class="rip-popover__url-row">
            <code class="rip-popover__url-text">${_he(collectionUrl)}</code>
            <button type="button" class="rip-popover__copy-btn" id="rip-btn-copy"
                    aria-label="Copy collection URL">
              ${_svgCopy()}
            </button>
          </div>
        </div>
      </li>
    </ol>

    <hr class="rip-popover__rule rip-popover__rule--flush" aria-hidden="true">

    <div class="rip-popover__action-row">
      <button type="button" class="rip-popover__btn" id="rip-btn-download">
        ${_svgDownload()}<span>Download JSON instead</span>
      </button>
    </div>
  `;

  document.body.appendChild(pop);
  _positionPopover(pop, anchorBtn);
  pop.focus({ preventScroll: true });

  if (anchorBtn) anchorBtn.classList.add('is-open');

  // Auto-copy the URL while we're still inside the click gesture, so the user's
  // only remaining action in Postman is paste → Continue.
  _autoCopy(collectionUrl, pop);

  // ── Actions ───────────────────────────────────────────────────────────────
  pop.querySelector('#rip-btn-open')?.addEventListener('click', () => {
    _openPostmanApp();
  });

  pop.querySelector('#rip-btn-copy')?.addEventListener('click', () => {
    _copyToClipboard(collectionUrl, pop.querySelector('#rip-btn-copy'));
  });

  pop.querySelector('#rip-btn-download')?.addEventListener('click', () => {
    _downloadCollection(collectionUrl);
    _closePopover(anchorBtn);
  });

  // ── Dismiss ───────────────────────────────────────────────────────────────
  pop.addEventListener('keydown', e => {
    if (e.key === 'Escape') { _closePopover(anchorBtn); anchorBtn?.focus(); }
  });

  const outsideHandler = e => {
    if (!pop.contains(e.target) && e.target !== anchorBtn) {
      _closePopover(anchorBtn);
      document.removeEventListener('click', outsideHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', outsideHandler), 80);
}

function _closePopover(anchorBtn) {
  const btn = anchorBtn || document.getElementById(BTN_ID);
  btn?.classList.remove('is-open');
  document.getElementById(POPOVER_ID)?.remove();
}

function _positionPopover(pop, anchor) {
  if (!anchor) {
    pop.style.top   = '72px';
    pop.style.right = '16px';
    return;
  }
  const rect        = anchor.getBoundingClientRect();
  const viewW       = window.innerWidth;
  const rightOffset = Math.max(viewW - rect.right, 8);
  pop.style.top   = `${Math.round(rect.bottom + 8)}px`;
  pop.style.right = `${rightOffset}px`;
}

// ─── Clipboard ──────────────────────────────────────────────────────────────
function _autoCopy(text, pop) {
  if (!navigator.clipboard?.writeText) return;
  navigator.clipboard.writeText(text).then(
    () => {
      const btn = pop.querySelector('#rip-btn-copy');
      if (btn) {
        btn.classList.add('is-copied');
        btn.innerHTML = _svgCheck();
        setTimeout(() => { btn.innerHTML = _svgCopy(); btn.classList.remove('is-copied'); }, 2000);
      }
    },
    () => {/* clipboard blocked — user can click the copy button manually */}
  );
}

async function _copyToClipboard(text, btn) {
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(text);
    btn.innerHTML = _svgCheck();
    btn.classList.add('is-copied');
    setTimeout(() => { btn.innerHTML = _svgCopy(); btn.classList.remove('is-copied'); }, 2000);
  } catch (_) {}
}

// ─── Download fallback ────────────────────────────────────────────────────────
async function _downloadCollection(collectionUrl) {
  try {
    const res  = await fetch(collectionUrl);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);

    const rawName  = docStore.doc?.meta?.name || 'api-collection';
    const filename = rawName.trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '.postman_collection.json';

    const a = Object.assign(document.createElement('a'), {
      href:     url,
      download: filename,
      style:    'display:none',
    });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
  } catch (err) {
    console.error('[RunInPostman] Download failed:', err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function _absoluteCollectionUrl() {
  const path = getCollectionPath();
  return /^https?:\/\//.test(path) ? path : new URL(path, window.location.href).href;
}

function _he(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── SVG icons ────────────────────────────────────────────────────────────────
function _svgPostman() {
  return `
    <svg class="rip-popover__postman-logo" width="32" height="32" viewBox="0 0 32 32"
         fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="currentColor" fill-opacity="0.1"
              stroke="currentColor" stroke-width="1.5"/>
      <path d="M12.5 10.5l9 5.5-9 5.5V10.5z" fill="currentColor"/>
    </svg>`;
}

function _svgExternal() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`;
}

function _svgDownload() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`;
}

function _svgCopy() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>`;
}

function _svgCheck() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`;
}
