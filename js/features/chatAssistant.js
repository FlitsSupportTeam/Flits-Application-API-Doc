/**
 * Flits API Assistant — intent-driven documentation chatbot.
 * Phase 3: Category-aware multi-step troubleshooting, full conversation context.
 *
 * Architecture: query → detectIntent() → _processQuery() → _renderResponse()
 * Multi-turn flows: awaiting ('which_api' → 'which_api_in_category' → 'error_code')
 *
 * EXTENSION POINT: Replace the setTimeout body in _sendMessage() with an
 * LLM API call. Keep return format: { type, ...data }
 */

import { docStore } from '../data/docStore.js';
import { navigateToRoute } from './router.js';
import { copyToClipboard } from '../utils/clipboard.js';

// ─── Intent constants ──────────────────────────────────────────────────────────
export const INTENT = Object.freeze({
  GREETING:    'greeting',
  CREDENTIAL:  'credential',
  ERROR_VAGUE: 'error_vague',
  ERROR_400:   'error_400',
  ERROR_401:   'error_401',
  ERROR_404:   'error_404',
  ERROR_500:   'error_500',
  API_FIND:    'api_find',
  ESCALATION:  'escalation',
  UNKNOWN:     'unknown',
});

// ─── API category definitions ─────────────────────────────────────────────────
const API_CATEGORIES = {
  loyalty: {
    label:    'Loyalty',
    keywords: ['loyalty', 'points', 'earn', 'earning', 'redeem', 'redemption', 'reward', 'rewards', 'tier', 'tiers'],
    examples: ['Get Loyalty Activity', 'Add Loyalty Points', 'Get Loyalty Balance', 'Redeem Loyalty Points', 'Get Loyalty Tiers'],
    chips:    ['Get Loyalty Activity', 'Add Loyalty Points', 'Get Loyalty Balance', 'Redeem Loyalty Points'],
  },
  wishlist: {
    label:    'Wishlist',
    keywords: ['wishlist', 'wish list', 'saved item', 'favorite', 'favourite', 'bookmark'],
    examples: ['Add to Wishlist', 'Remove from Wishlist', 'Get Wishlist Products', 'Get Wishlist Count'],
    chips:    ['Add to Wishlist', 'Remove from Wishlist', 'Get Wishlist Products', 'Get Wishlist Count'],
  },
  store_credit: {
    label:    'Store Credit',
    keywords: ['store credit', 'store_credit', 'wallet', 'credit balance', 'store wallet'],
    examples: ['Get Store Credit Balance', 'Store Credit Activity', 'Store Credit Adjustment', 'Add Store Credit'],
    chips:    ['Get Store Credit Balance', 'Store Credit Activity', 'Store Credit Adjustment', 'Add Store Credit'],
  },
  customer: {
    label:    'Customer',
    keywords: ['customer', 'user profile', 'member', 'shopper', 'buyer profile', 'account details'],
    examples: ['Get Customer Profile', 'Get Customer Order History', 'Update Customer Details'],
    chips:    ['Get Customer Profile', 'Get Customer Order History', 'Update Customer Details'],
  },
  order: {
    label:    'Order',
    keywords: ['order', 'purchase', 'transaction', 'bought'],
    examples: ['Get Order Details', 'Get Order History', 'Order Status'],
    chips:    ['Get Order Details', 'Get Order History', 'Order Status'],
  },
  referral: {
    label:    'Referral',
    keywords: ['referral', 'refer', 'referring'],
    examples: ['Get Referral Details', 'Referral Activity', 'Referral Tracking'],
    chips:    ['Get Referral Details', 'Referral Activity', 'Referral Tracking'],
  },
  notification: {
    label:    'Notification',
    keywords: ['notification', 'push notification', 'alert', 'notify'],
    examples: ['Send Push Notification', 'Get Notification History', 'Notification Settings'],
    chips:    ['Send Push Notification', 'Get Notification History', 'Notification Settings'],
  },
};

// ─── Chip sets ────────────────────────────────────────────────────────────────
const CHIPS = {
  GREETING:    [
    'How can I fetch loyalty points?',
    'How do I get jwt_token?',
    'How do I get merchant_id?',
    'I am getting an API error.',
    'Which API should I use for wishlist integration?',
  ],
  CATEGORIES:  ['Loyalty APIs', 'Wishlist APIs', 'Store Credit APIs', 'Customer APIs'],
  ERROR_CODES: ['400 Bad Request', '401 Unauthorized', '404 Not Found', '500 Internal Server Error'],
  AFTER_401:   ['The issue still persists.', 'How do I get jwt_token?', 'How do I get flits_token?'],
  AFTER_400:   ['The issue still persists.', 'Show me required parameters', 'Show me request examples'],
  AFTER_404:   ['The issue still persists.', 'What is storeID?', 'Browse related APIs'],
  AFTER_500:   ['The issue still persists.', 'Contact support directly'],
  AFTER_API:   ['How do I authenticate?', 'I need credentials for this', 'I am getting an API error'],
  CREDENTIAL:  ['Show me loyalty APIs', 'I am getting a 401 error', 'How do I integrate loyalty APIs?'],
  FALLBACK:    ['Browse loyalty APIs', 'Show me wishlist APIs', 'Contact support'],
};

// ─── Topic examples for clarifying questions ──────────────────────────────────
const TOPIC_EXAMPLES = {
  loyalty:      ['Fetch customer loyalty points balance', 'Get loyalty activity history', 'Add loyalty points to a customer', 'Redeem loyalty points'],
  wishlist:     ['Get customer wishlist items', 'Add an item to wishlist', 'Remove an item from wishlist', 'Get wishlist item count'],
  customer:     ['Get customer profile', 'Update customer details', 'Get customer order history'],
  order:        ['Get order details', 'Get order history for a customer'],
  store_credit: ['Get store credit balance', 'Add store credits', 'Get store credit activity'],
  referral:     ['Get referral details', 'Track referral activity'],
  notification: ['Send push notification', 'Get notification history'],
};

// ─── Synonym expansion ────────────────────────────────────────────────────────
const SYNONYMS = {
  loyalty:     ['points', 'earn', 'earning', 'redeem', 'redemption', 'reward', 'rewards', 'tier', 'tiers', 'balance', 'credit'],
  points:      ['loyalty', 'earn', 'redeem', 'reward', 'balance', 'credit'],
  earn:        ['loyalty', 'points', 'credit', 'reward', 'accumulate'],
  redeem:      ['loyalty', 'points', 'use', 'apply', 'spend', 'claim'],
  wishlist:    ['wish list', 'saved', 'favorite', 'favourite', 'bookmark'],
  activity:    ['history', 'transaction', 'transactions', 'log', 'events', 'record'],
  history:     ['activity', 'transaction', 'transactions', 'log', 'events'],
  customer:    ['user', 'member', 'account', 'shopper', 'buyer', 'profile'],
  fetch:       ['get', 'retrieve', 'obtain', 'read', 'query', 'find', 'show', 'list'],
  get:         ['fetch', 'retrieve', 'obtain', 'read', 'list', 'show'],
  create:      ['add', 'insert', 'post', 'new', 'register', 'make', 'generate'],
  update:      ['edit', 'modify', 'change', 'patch', 'put', 'set'],
  delete:      ['remove', 'destroy', 'cancel', 'deactivate'],
  list:        ['all', 'show', 'fetch', 'get', 'retrieve', 'find'],
  integrate:   ['integration', 'setup', 'configure', 'connect', 'implement'],
  balance:     ['points', 'loyalty', 'credit', 'amount', 'total'],
};

const SUPPORT_EMAIL = 'support@getflits.com';

// ─── Module state ─────────────────────────────────────────────────────────────
let _open      = false;
let _kb        = null;
let _btnEl     = null;
let _panelEl   = null;
let _msgEl     = null;
let _inputEl   = null;
let _firstOpen = true;
let _busy      = false;

// Conversation context — drives multi-turn flows
let _ctx = {
  lastIntent:          null,
  awaiting:            null,   // null | 'which_api' | 'which_api_in_category' | 'error_code'
  identifiedCategory:  null,   // key from API_CATEGORIES e.g. 'loyalty'
  identifiedApi:       null,   // specific API name e.g. 'Get Loyalty Activity'
  identifiedError:     null,   // INTENT.ERROR_401 etc.
  troubleshootStep:    0,      // 0=start, 1=got_api, 2=got_error, 3=guided
  lastTopic:           null,
};

function _resetCtx() {
  _ctx.awaiting           = null;
  _ctx.identifiedCategory = null;
  _ctx.identifiedApi      = null;
  _ctx.identifiedError    = null;
  _ctx.troubleshootStep   = 0;
  _ctx.lastTopic          = null;
}

// ─── Public: bootstrap ────────────────────────────────────────────────────────
export function initializeChatAssistant() {
  if (docStore.state.loaded) { _bootstrap(); return; }
  const unsub = docStore.subscribe(s => { if (s.loaded) { unsub(); _bootstrap(); } });
}

function _bootstrap() {
  _kb = buildKnowledgeBase();
  _mountButton();
}

// ─── Public: knowledge base ───────────────────────────────────────────────────
export function buildKnowledgeBase() {
  const apis  = docStore.getAllApis();
  const index = docStore.getSearchIndex();
  const vars  = typeof docStore.getVariables === 'function' ? docStore.getVariables() : [];
  return {
    apis: apis.map(api => ({
      slug:        api.slug,
      name:        api.name,
      method:      (api.method || 'GET').toUpperCase(),
      urlDisplay:  api.urlDisplay || '',
      description: (api.descriptionPlain || '').slice(0, 600),
      breadcrumbs: api.breadcrumbs || [],
      curl:        api.curl || '',
    })),
    searchIndex: index,
    variables:   vars,
  };
}

// ─── Public: search ───────────────────────────────────────────────────────────
export function searchRelevantAPIs(query, limit = 3) {
  if (!_kb || !query) return [];
  const terms  = _expandQuery(query);
  const scored = _kb.searchIndex
    .filter(e => e.type === 'api')
    .map(entry => {
      const title    = (entry.title    || '').toLowerCase();
      const text     = (entry.text     || '').toLowerCase();
      const subtitle = (entry.subtitle || '').toLowerCase();
      const url      = (entry.url      || '').toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (term.length < 2) continue;
        if (title === term)              score += 100;
        else if (title.startsWith(term)) score +=  65;
        else if (title.includes(term))   score +=  40;
        if (text.includes(term))         score +=  18;
        if (subtitle.includes(term))     score +=  12;
        if (url.includes(term))          score +=   8;
      }
      return { entry, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored
    .map(x => {
      const api = _kb.apis.find(a => a.slug === x.entry.slug);
      return api ? { ...x.entry, ...api, _score: x.score } : null;
    })
    .filter(Boolean);
}

// ─── Public: category detection ───────────────────────────────────────────────
export function detectApiCategory(query) {
  const q = _norm(query);
  let best      = null;
  let bestScore = 0;
  for (const [key, cat] of Object.entries(API_CATEGORIES)) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (q.includes(kw)) score += kw.split(' ').length > 1 ? 3 : 1;
    }
    if (score > bestScore) { bestScore = score; best = { key, ...cat }; }
  }
  return bestScore > 0 ? best : null;
}

// ─── Public: intent detection ─────────────────────────────────────────────────
export function detectIntent(query) {
  const q = _norm(query);

  const checks = [
    [INTENT.GREETING,    _scoreGreeting(q)],
    [INTENT.ERROR_401,   _scoreError401(q)],
    [INTENT.ERROR_400,   _scoreError400(q)],
    [INTENT.ERROR_404,   _scoreError404(q)],
    [INTENT.ERROR_500,   _scoreError500(q)],
    [INTENT.ERROR_VAGUE, _scoreErrorVague(q)],
    [INTENT.CREDENTIAL,  _scoreCredential(q)],
    [INTENT.ESCALATION,  _scoreEscalation(q)],
    [INTENT.API_FIND,    _scoreApiFind(q)],
  ];

  let topIntent = INTENT.UNKNOWN;
  let topScore  = 0;
  for (const [intent, score] of checks) {
    if (score > topScore) { topScore = score; topIntent = intent; }
  }

  const topic = _detectTopic(q);
  return { intent: topIntent, confidence: topScore, data: { topic, category: topic } };
}

// ─── Public: confidence calculator ───────────────────────────────────────────
export function calculateConfidence(intent, query) {
  const q = _norm(query);
  const scorers = {
    [INTENT.GREETING]:    _scoreGreeting,
    [INTENT.ERROR_401]:   _scoreError401,
    [INTENT.ERROR_400]:   _scoreError400,
    [INTENT.ERROR_404]:   _scoreError404,
    [INTENT.ERROR_500]:   _scoreError500,
    [INTENT.ERROR_VAGUE]: _scoreErrorVague,
    [INTENT.CREDENTIAL]:  _scoreCredential,
    [INTENT.API_FIND]:    _scoreApiFind,
    [INTENT.ESCALATION]:  _scoreEscalation,
  };
  return scorers[intent] ? scorers[intent](q) : 0;
}

// ─── Public: maintain conversation context ────────────────────────────────────
export function maintainConversationContext(intent, data = {}) {
  if (intent)                      _ctx.lastIntent          = intent;
  if (data.category  !== undefined) _ctx.identifiedCategory = data.category;
  if (data.apiName   !== undefined) _ctx.identifiedApi      = data.apiName;
  if (data.error     !== undefined) _ctx.identifiedError    = data.error;
  if (data.awaiting  !== undefined) _ctx.awaiting           = data.awaiting;
  if (data.step      !== undefined) _ctx.troubleshootStep   = data.step;
  return { ..._ctx };
}

// ─── Public: generate follow-up question ─────────────────────────────────────
export function generateFollowUpQuestion(step = 0, context = {}) {
  const ctx = { ..._ctx, ...context };
  switch (step) {
    case 0:  return _genAskWhichApi();
    case 1:  return _genAskErrorCode(ctx.identifiedApi);
    default: return generateEscalationResponse(ctx);
  }
}

// ─── Public: generate troubleshooting flow ────────────────────────────────────
export function generateTroubleshootingFlow(errorType, context = {}) {
  const apiName = context.apiName || _ctx.identifiedApi;
  switch (errorType) {
    case INTENT.ERROR_401: return _gen401(apiName);
    case INTENT.ERROR_400: return _gen400(apiName);
    case INTENT.ERROR_404: return _gen404(apiName);
    case INTENT.ERROR_500: return _gen500(apiName);
    default:               return _genAskErrorCode(apiName);
  }
}

// ─── Public: response generators ─────────────────────────────────────────────
export function generateGreetingResponse() {
  return `
    <p class="chat-welcome">Hi&nbsp;👋</p>
    <p>I'm the <strong>Flits API&nbsp;Assistant</strong>. How can I help you today?</p>
    <p>Are you looking for:</p>
    <ul class="chat-list">
      <li>Loyalty API guidance</li>
      <li>Wishlist API guidance</li>
      <li>Help with API errors</li>
      <li>Authentication &amp; credentials support</li>
      <li>Integration assistance</li>
    </ul>
  `;
}

export function generateErrorFlow(category = null) {
  const note = category ? ` with the <strong>${_eh(category)}</strong> API` : '';
  return `
    <p>I'm sorry you're facing an issue${note}.</p>
    <p>Could you please let me know which error code or response you are receiving?</p>
    <p>For example:</p>
    <ul class="chat-list">
      <li><strong>400</strong> Bad Request</li>
      <li><strong>401</strong> Unauthorized</li>
      <li><strong>404</strong> Not Found</li>
      <li><strong>500</strong> Internal Server Error</li>
    </ul>
    <p>Once I know the error, I can guide you better.</p>
  `;
}

export function generateCredentialResponse() {
  return `
    <div class="chat-cred-card">
      <div class="chat-cred-card__head">
        <span aria-hidden="true">🔑</span>
        <strong>Credentials &amp; Tokens</strong>
      </div>
      <p>These credentials are provided by the Flits team based on your integration requirements.</p>
      <p class="chat-cred-card__sub">Please let us know:</p>
      <ul class="chat-cred-card__list">
        <li>Which application you are integrating with</li>
        <li>The purpose of the integration</li>
        <li>Which credentials you require</li>
      </ul>
      <a href="mailto:${SUPPORT_EMAIL}" class="chat-email-link">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,12 2,6"/>
        </svg>
        ${SUPPORT_EMAIL}
      </a>
    </div>
  `;
}

export function generateApiRecommendation(results) {
  const intro = results.length === 1
    ? 'Here\'s the API that can help:'
    : `Here are ${results.length} APIs that match your question:`;
  return `<p class="chat-response-intro">${_eh(intro)}</p>` +
    results.map(_apiCardHtml).join('');
}

export function generateEscalationResponse(context = null) {
  const ctx      = context || _ctx;
  const apiName  = ctx.identifiedApi;
  const errType  = ctx.identifiedError;
  const errLabel = errType ? errType.replace('error_', '').toUpperCase() : null;
  const ctxLines = [
    apiName  ? `<li>API: <strong>${_eh(apiName)}</strong></li>` : '',
    errLabel ? `<li>Error: <strong>${_eh(errLabel)}</strong></li>` : '',
  ].filter(Boolean).join('');

  return `
    <p>If the issue still persists after reviewing the documentation, please reach out to our support team.</p>
    <div class="chat-escalation-card">
      <div class="chat-escalation-card__head">
        <span aria-hidden="true">📧</span>
        <strong>Contact Support</strong>
      </div>
      <p>Email: <a href="mailto:${SUPPORT_EMAIL}" class="chat-inline-link">${_eh(SUPPORT_EMAIL)}</a></p>
      <p class="chat-escalation-card__sub">Please include in your email:</p>
      <ul class="chat-escalation-card__list">
        ${ctxLines}
        <li>Request details and payload</li>
        <li>Error response received</li>
        <li>Purpose of integration</li>
      </ul>
      <p>Our team will be happy to assist you.</p>
    </div>
  `;
}

// ─── Public: message rendering ────────────────────────────────────────────────
export function renderChatMessage(role, content, { timestamp = false } = {}) {
  if (!_msgEl) return null;
  const el     = document.createElement('div');
  el.className = `chat-msg chat-msg--${role}`;
  const ts     = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const tsHtml = timestamp ? `<time class="chat-msg__time">${ts}</time>` : '';

  if (role === 'bot') {
    el.innerHTML = `
      <div class="chat-msg__avatar" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div class="chat-msg__body">
        <div class="chat-msg__bubble">${content}</div>
        ${tsHtml}
      </div>`;
  } else {
    el.innerHTML = `
      <div class="chat-msg__body">
        <div class="chat-msg__bubble">${_eh(content)}</div>
        ${tsHtml}
      </div>`;
  }

  _msgEl.appendChild(el);
  _scrollBottom();
  return el;
}

// ─── Public: suggested questions ─────────────────────────────────────────────
export function renderSuggestedQuestions(questions = CHIPS.GREETING) {
  if (!_msgEl) return;
  const el = document.createElement('div');
  el.className = 'chat-chips';
  el.setAttribute('role', 'list');
  el.innerHTML = questions
    .map(q => `<button type="button" class="chat-chip" role="listitem" data-q="${_ea(q)}">${_eh(q)}</button>`)
    .join('');
  el.addEventListener('click', e => {
    const btn = e.target.closest('.chat-chip');
    if (!btn) return;
    el.remove();
    _sendMessage(btn.getAttribute('data-q'));
  });
  _msgEl.appendChild(el);
  _scrollBottom();
}

// ─── Public: navigation ───────────────────────────────────────────────────────
export function navigateToDocumentation(slug, anchor = null) {
  navigateToRoute(slug, { anchor, updateHash: true, animate: true });
}

// ─── Intent scoring ───────────────────────────────────────────────────────────
function _scoreGreeting(q) {
  const exact = new Set([
    'hi', 'hello', 'hey', 'hii', 'heya', 'hiya', 'howdy', 'yo', 'sup',
    'greetings', 'hola', 'hi there', 'hello there', 'hey there',
  ]);
  if (exact.has(q)) return 0.98;
  if (/^good\s+(morning|afternoon|evening|night|day)/.test(q)) return 0.98;
  if (/^h+i+$/.test(q) || /^h+e+y+$/.test(q) || /^h+e+l+l+o+$/.test(q)) return 0.95;
  if (/^how are you/.test(q) || /^how r u/.test(q) || /^how'?re you/.test(q)) return 0.92;
  if (/^what'?s\s*up/.test(q)) return 0.90;
  return 0;
}

function _scoreError401(q) {
  let s = 0;
  if (/\b401\b/.test(q))                                              s = Math.max(s, 0.96);
  if (/\bunauthorized\b/.test(q))                                     s = Math.max(s, 0.90);
  if (/auth(entication)?.{0,15}(fail|error|issue|invalid)/.test(q))  s = Math.max(s, 0.85);
  if (/(invalid|expired|fail(ed)?).{0,15}token/.test(q))             s = Math.max(s, 0.82);
  if (/token.{0,15}(invalid|expired|wrong|not.?valid)/.test(q))      s = Math.max(s, 0.80);
  if (/\bforbidden\b/.test(q))                                        s = Math.max(s, 0.75);
  return s;
}

function _scoreError400(q) {
  let s = 0;
  if (/\b400\b/.test(q))                                                           s = Math.max(s, 0.96);
  if (/bad.?request/.test(q))                                                       s = Math.max(s, 0.90);
  if (/invalid.{0,20}(payload|body|param(eter)?|request|format|field)/.test(q))    s = Math.max(s, 0.82);
  if (/validation.{0,15}(fail|error)/.test(q))                                      s = Math.max(s, 0.76);
  if (/missing.{0,15}(field|param(eter)?)/.test(q))                                 s = Math.max(s, 0.72);
  return s;
}

function _scoreError404(q) {
  let s = 0;
  if (/\b404\b/.test(q))                             s = Math.max(s, 0.96);
  if (/not.?found/.test(q))                          s = Math.max(s, 0.86);
  if (/resource.{0,25}not/.test(q))                  s = Math.max(s, 0.80);
  if (/endpoint.{0,15}(not|wrong|invalid)/.test(q)) s = Math.max(s, 0.78);
  return s;
}

function _scoreError500(q) {
  let s = 0;
  if (/\b500\b/.test(q))                 s = Math.max(s, 0.96);
  if (/internal.?server.?error/.test(q)) s = Math.max(s, 0.95);
  if (/server.?error/.test(q))           s = Math.max(s, 0.85);
  if (/\b(502|503|504)\b/.test(q))       s = Math.max(s, 0.80);
  return s;
}

function _scoreErrorVague(q) {
  const hasSignal = /\b(error|issue|problem|fail(ing|ed)?|not\s+work(ing)?|broken|wrong|trouble|bug|stuck|crash(ing)?)\b/.test(q);
  if (!hasSignal) return 0;
  const hasCtx = /\b(api|integration|endpoint|request|response|call|connect|merchant|loyalty|wishlist|customer|app)\b/.test(q);
  return hasCtx ? 0.75 : 0.56;
}

function _scoreCredential(q) {
  const terms = [
    'jwt_token', 'jwt token', 'merchant_id', 'merchant id',
    'storeid', 'store_id', 'store id', 'flits_token', 'flits token',
    'api key', 'api_key', 'credentials', 'credential',
    'access token', 'bearer token',
  ];
  let s = 0;
  for (const t of terms) {
    if (q.includes(t)) s = Math.max(s, t.length > 5 ? 0.88 : 0.75);
  }
  if (s > 0 && /\b(how|get|obtain|receive|request|need|want|find|where|give)\b/.test(q)) {
    s = Math.min(1, s + 0.06);
  }
  return s;
}

function _scoreApiFind(q) {
  const action = /\b(how|which|what|show|fetch|get|retrieve|find|list|give|use|integrate|implement|call)\b/.test(q) ? 0.30 : 0;
  const api    = /\b(api|endpoint|call|request|integration)\b/.test(q) ? 0.20 : 0;
  const topic  = _detectTopic(q) !== null ? 0.30 : 0;
  return Math.min(0.85, action + api + topic);
}

function _scoreEscalation(q) {
  if (/\b(still\s+persists?|still\s+(happening|facing|getting|having)|contact\s+(support|team|flits)|reach\s+out|talk\s+to\s+(someone|human|agent|person))\b/.test(q)) return 0.84;
  if (/\b(contact\s+support|contact\s+directly|human|agent)\b/.test(q)) return 0.68;
  return 0;
}

function _detectTopic(q) {
  const cat = detectApiCategory(q);
  return cat ? cat.key : null;
}

function _detectErrorCode(q) {
  if (_scoreError401(q) >= 0.70) return INTENT.ERROR_401;
  if (_scoreError400(q) >= 0.70) return INTENT.ERROR_400;
  if (_scoreError404(q) >= 0.70) return INTENT.ERROR_404;
  if (_scoreError500(q) >= 0.70) return INTENT.ERROR_500;
  return null;
}

// ─── Core query processing ────────────────────────────────────────────────────
function _processQuery(query) {
  const q = _norm(query);

  // ── Multi-turn: awaiting which API? ──────────────────────────────────────
  if (_ctx.awaiting === 'which_api') {
    const cat = detectApiCategory(query);
    if (cat) {
      _ctx.identifiedCategory = cat.key;
      _ctx.awaiting = 'which_api_in_category';
      return { type: 'ask_which_api_in_category', category: cat };
    }
    _ctx.identifiedApi    = query.trim();
    _ctx.awaiting         = 'error_code';
    _ctx.troubleshootStep = 1;
    return { type: 'ask_error_code' };
  }

  // ── Multi-turn: awaiting which specific API in category? ─────────────────
  if (_ctx.awaiting === 'which_api_in_category') {
    _ctx.identifiedApi    = query.trim();
    _ctx.awaiting         = 'error_code';
    _ctx.troubleshootStep = 1;
    return { type: 'ask_error_code' };
  }

  // ── Multi-turn: awaiting error code ───────────────────────────────────────
  if (_ctx.awaiting === 'error_code') {
    const coded = _detectErrorCode(q);
    if (coded) {
      _ctx.awaiting         = null;
      _ctx.lastIntent       = coded;
      _ctx.identifiedError  = coded;
      _ctx.troubleshootStep = 2;
      return { type: coded, apiName: _ctx.identifiedApi };
    }
    if (_scoreEscalation(q) >= 0.60) {
      _ctx.awaiting = null;
      return { type: 'escalation' };
    }
    return { type: 'error_await_retry' };
  }

  // ── Normal intent routing ─────────────────────────────────────────────────
  const { intent, confidence, data } = detectIntent(query);
  _ctx.lastIntent = intent;
  _ctx.lastTopic  = data.topic;

  switch (intent) {
    case INTENT.GREETING:
      _resetCtx();
      return { type: 'greeting' };

    case INTENT.CREDENTIAL:
      return { type: 'credential' };

    case INTENT.ERROR_VAGUE: {
      const cat = detectApiCategory(query);
      if (cat) {
        _ctx.identifiedCategory = cat.key;
        _ctx.awaiting           = 'which_api_in_category';
        _ctx.troubleshootStep   = 0;
        return { type: 'ask_which_api_in_category', category: cat };
      }
      _ctx.awaiting         = 'which_api';
      _ctx.troubleshootStep = 0;
      return { type: 'ask_which_api' };
    }

    case INTENT.ERROR_400:
      _ctx.identifiedError = INTENT.ERROR_400;
      return { type: 'error_400', apiName: _ctx.identifiedApi };

    case INTENT.ERROR_401:
      _ctx.identifiedError = INTENT.ERROR_401;
      return { type: 'error_401', apiName: _ctx.identifiedApi };

    case INTENT.ERROR_404:
      _ctx.identifiedError = INTENT.ERROR_404;
      return { type: 'error_404', apiName: _ctx.identifiedApi };

    case INTENT.ERROR_500:
      _ctx.identifiedError = INTENT.ERROR_500;
      return { type: 'error_500', apiName: _ctx.identifiedApi };

    case INTENT.ESCALATION:
      return { type: 'escalation' };

    case INTENT.API_FIND:
      if (confidence >= 0.65) {
        const results = searchRelevantAPIs(query, 3);
        if (results.length) return { type: 'api', results };
      }
      if (confidence >= 0.35 && data.topic) {
        return { type: 'clarify', topic: data.topic };
      }
      return { type: 'fallback' };

    default: {
      const results = searchRelevantAPIs(query, 3);
      if (results.length && results[0]._score >= 40) return { type: 'api', results };
      return { type: 'fallback' };
    }
  }
}

// ─── Response dispatcher ──────────────────────────────────────────────────────
function _renderResponse(res) {
  let html  = '';
  let chips = null;

  switch (res.type) {
    case 'greeting':
      html  = generateGreetingResponse();
      chips = CHIPS.GREETING;
      break;

    case 'credential':
      html  = generateCredentialResponse();
      chips = CHIPS.CREDENTIAL;
      break;

    case 'ask_which_api':
      html  = _genAskWhichApi();
      chips = CHIPS.CATEGORIES;
      break;

    case 'ask_which_api_in_category':
      html  = _genAskWhichApiInCategory(res.category);
      chips = (res.category.chips || []).slice(0, 4);
      break;

    case 'ask_error_code':
      html  = _genAskErrorCode();
      chips = CHIPS.ERROR_CODES;
      break;

    case 'error_vague':
      html  = generateErrorFlow(res.category);
      chips = CHIPS.ERROR_CODES;
      break;

    case 'error_400':
      html  = _gen400(res.apiName);
      chips = CHIPS.AFTER_400;
      break;

    case 'error_401':
      html  = _gen401(res.apiName);
      chips = CHIPS.AFTER_401;
      break;

    case 'error_404':
      html  = _gen404(res.apiName);
      chips = CHIPS.AFTER_404;
      break;

    case 'error_500':
      html  = _gen500(res.apiName);
      chips = CHIPS.AFTER_500;
      break;

    case 'error_await_retry':
      html  = `<p>Could you please share the specific error code you're receiving?</p>
               <p>For example: <strong>400</strong>, <strong>401</strong>, <strong>404</strong>, or <strong>500</strong>.</p>`;
      chips = CHIPS.ERROR_CODES;
      break;

    case 'api':
      html  = generateApiRecommendation(res.results);
      chips = CHIPS.AFTER_API;
      break;

    case 'clarify':
      html  = _genClarify(res.topic);
      chips = _clarifyChips(res.topic);
      break;

    case 'escalation':
      html = generateEscalationResponse();
      break;

    default:
      html  = `<p>I couldn't find an exact match in the documentation.</p>
               <p>Please contact <a href="mailto:${SUPPORT_EMAIL}" class="chat-inline-link">${_eh(SUPPORT_EMAIL)}</a> for further assistance.</p>`;
      chips = CHIPS.FALLBACK;
  }

  renderChatMessage('bot', html, { timestamp: true });
  if (chips) setTimeout(() => renderSuggestedQuestions(chips), 80);
}

// ─── Internal response generators ────────────────────────────────────────────
function _genAskWhichApi() {
  return `
    <p>I can help troubleshoot the issue.</p>
    <p>Which API are you integrating with? For example: <em>Loyalty APIs</em>, <em>Wishlist APIs</em>, <em>Store Credit APIs</em>, or a specific API name.</p>
  `;
}

function _genAskWhichApiInCategory(category) {
  const examples = (category.examples || []).slice(0, 5);
  return `
    <p>I understand you're facing an issue with the <strong>${_eh(category.label)}</strong> APIs.</p>
    <p>Which specific <strong>${_eh(category.label)}</strong> API are you working with?</p>
    <p>For example:</p>
    <ul class="chat-list">
      ${examples.map(e => `<li>${_eh(e)}</li>`).join('')}
    </ul>
  `;
}

function _genAskErrorCode() {
  const apiNote = _ctx.identifiedApi
    ? ` with <strong>${_eh(_ctx.identifiedApi)}</strong>`
    : '';
  return `
    <p>Got it. Which error code are you receiving${apiNote}?</p>
    <ul class="chat-list">
      <li><strong>400</strong> Bad Request — invalid payload or parameters</li>
      <li><strong>401</strong> Unauthorized — authentication failure</li>
      <li><strong>404</strong> Not Found — resource or endpoint not found</li>
      <li><strong>500</strong> Internal Server Error — server-side issue</li>
    </ul>
  `;
}

function _gen401(apiName) {
  const note = apiName ? ` with <strong>${_eh(apiName)}</strong>` : '';
  return `
    <p>A <strong>401 Unauthorized</strong> response${note} usually indicates authentication-related issues.</p>
    <p>Please review the <strong>Response Examples</strong> section of the API you are integrating with.</p>
    <p>You can verify:</p>
    <ul class="chat-list">
      <li><strong>jwt_token</strong> validity and expiry</li>
      <li><strong>flits_token</strong> validity</li>
      <li>Authentication headers are correctly formatted</li>
      <li>Credentials match the expected format</li>
    </ul>
    ${_escalationLine()}
  `;
}

function _gen400(apiName) {
  const note = apiName ? ` with <strong>${_eh(apiName)}</strong>` : '';
  return `
    <p>A <strong>400 Bad Request</strong> response${note} usually indicates an issue with the request payload or parameters.</p>
    <p>Please verify:</p>
    <ul class="chat-list">
      <li>Request payload format and structure</li>
      <li>All required parameters are included</li>
      <li>Parameter data types are correct</li>
      <li>JSON syntax is valid</li>
    </ul>
    <p>Review the <strong>Request Parameters</strong> section in the relevant API documentation.</p>
    ${_escalationLine()}
  `;
}

function _gen404(apiName) {
  const note = apiName ? ` for <strong>${_eh(apiName)}</strong>` : '';
  return `
    <p><strong>404 Not Found</strong>${note} usually indicates that the requested resource could not be located.</p>
    <p>Please verify:</p>
    <ul class="chat-list">
      <li><strong>storeID</strong> value is correct</li>
      <li>Customer identifiers are accurate</li>
      <li>Endpoint URL is correctly formatted</li>
    </ul>
    <p>You can also review the <strong>Response Examples</strong> section of the corresponding API documentation.</p>
    ${_escalationLine()}
  `;
}

function _gen500(apiName) {
  const note = apiName ? ` for <strong>${_eh(apiName)}</strong>` : '';
  return `
    <p><strong>500 Internal Server Error</strong>${note} generally indicates a server-side issue.</p>
    <p>Please review the API request payload and examples in the documentation.</p>
    <p>If the issue continues, please contact <a href="mailto:${SUPPORT_EMAIL}" class="chat-inline-link">${_eh(SUPPORT_EMAIL)}</a> with:</p>
    <ul class="chat-list">
      <li>API name</li>
      <li>Request payload</li>
      <li>Error response</li>
      <li>Steps to reproduce the issue</li>
    </ul>
  `;
}

function _escalationLine() {
  return `<p>If the issue still persists, please contact <a href="mailto:${SUPPORT_EMAIL}" class="chat-inline-link">${_eh(SUPPORT_EMAIL)}</a>.</p>`;
}

function _genClarify(topic) {
  const label    = topic || 'API';
  const examples = TOPIC_EXAMPLES[topic] || ['Please describe what you need help with'];
  return `
    <p>Could you tell me a bit more about what you're trying to do with the <strong>${_eh(label)}</strong> API?</p>
    <p>For example:</p>
    <ul class="chat-list">
      ${examples.map(e => `<li>${_eh(e)}</li>`).join('')}
    </ul>
  `;
}

function _clarifyChips(topic) {
  const examples = TOPIC_EXAMPLES[topic];
  if (!examples) return CHIPS.FALLBACK;
  return examples.slice(0, 4).map(e => {
    const words = e.split(' ');
    return words.length > 6 ? words.slice(0, 6).join(' ') + '…' : e;
  });
}

// ─── Sending ──────────────────────────────────────────────────────────────────
function _handleSend() {
  if (_busy) return;
  const query = _inputEl?.value?.trim();
  if (!query) return;
  _inputEl.value = '';
  _autoResize();
  _panelEl?.querySelector('#flits-chat-send')?.setAttribute('disabled', '');
  _sendMessage(query);
}

function _sendMessage(query) {
  if (!query) return;
  _msgEl?.querySelectorAll('.chat-chips').forEach(el => el.remove());
  renderChatMessage('user', query, { timestamp: true });
  _busy = true;
  const thinkEl = _showThinking();
  setTimeout(() => {
    thinkEl?.remove();
    _busy = false;
    _renderResponse(_processQuery(query));
  }, 480 + Math.random() * 320);
}

function _showWelcome() {
  renderChatMessage('bot', `
    <p class="chat-welcome">Hi&nbsp;👋</p>
    <p>I'm the <strong>Flits API&nbsp;Assistant</strong>. How can I help you today?</p>
  `);
  setTimeout(() => renderSuggestedQuestions(CHIPS.GREETING), 220);
}

// ─── DOM: FAB ─────────────────────────────────────────────────────────────────
function _mountButton() {
  if (_btnEl) return;
  _btnEl = document.createElement('button');
  _btnEl.id   = 'flits-chat-fab';
  _btnEl.type = 'button';
  _btnEl.setAttribute('aria-label', 'Open Flits API Assistant');
  _btnEl.setAttribute('aria-haspopup', 'dialog');
  _btnEl.setAttribute('aria-expanded', 'false');
  _btnEl.innerHTML = `
    <span class="chat-fab__icon chat-fab__open" aria-hidden="true">
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </span>
    <span class="chat-fab__icon chat-fab__close" aria-hidden="true">
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.2" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </span>
    <span class="chat-fab__badge" aria-hidden="true">1</span>
  `;
  _btnEl.addEventListener('click', _togglePanel);
  document.body.appendChild(_btnEl);
}

// ─── DOM: chat panel ──────────────────────────────────────────────────────────
function _mountPanel() {
  if (_panelEl) return;
  _panelEl = document.createElement('div');
  _panelEl.id = 'flits-chat-panel';
  _panelEl.setAttribute('role', 'dialog');
  _panelEl.setAttribute('aria-label', 'Flits API Assistant');
  _panelEl.setAttribute('aria-modal', 'false');
  _panelEl.innerHTML = `
    <div class="chat-panel-header">
      <div class="chat-panel-header__brand">
        <div class="chat-panel-header__avatar" aria-hidden="true">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div class="chat-panel-header__text">
          <div class="chat-panel-header__name">Flits API Assistant</div>
          <div class="chat-panel-header__status">
            <span class="chat-status-dot" aria-hidden="true"></span>Online
          </div>
        </div>
      </div>
      <button type="button" class="chat-panel-header__close" aria-label="Close" id="flits-chat-close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="chat-messages" id="flits-chat-messages" role="log" aria-live="polite"></div>
    <div class="chat-panel-footer">
      <div class="chat-input-row">
        <textarea id="flits-chat-input" class="chat-textarea"
          placeholder="Ask about Flits APIs…" rows="1"
          aria-label="Type your question" autocomplete="off" spellcheck="false"></textarea>
        <button type="button" class="chat-send-btn" id="flits-chat-send" aria-label="Send" disabled>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <p class="chat-powered-by">Powered by <strong>Flits</strong> ·
        <a href="mailto:${SUPPORT_EMAIL}" class="chat-support-mail">${SUPPORT_EMAIL}</a>
      </p>
    </div>
  `;

  _msgEl   = _panelEl.querySelector('#flits-chat-messages');
  _inputEl = _panelEl.querySelector('#flits-chat-input');
  const sendBtn  = _panelEl.querySelector('#flits-chat-send');
  const closeBtn = _panelEl.querySelector('#flits-chat-close');

  closeBtn.addEventListener('click', _togglePanel);
  sendBtn.addEventListener('click', _handleSend);
  _inputEl.addEventListener('input', () => {
    _autoResize();
    sendBtn.disabled = !_inputEl.value.trim();
  });
  _inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled && !_busy) _handleSend();
    }
  });

  // Prevent scroll events inside the panel from propagating to the page
  _panelEl.addEventListener('wheel', e => {
    if (!_msgEl) return;
    const atTop    = _msgEl.scrollTop <= 0;
    const atBottom = _msgEl.scrollTop + _msgEl.clientHeight >= _msgEl.scrollHeight - 1;
    if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
      e.preventDefault();
    }
    e.stopPropagation();
  }, { passive: false });

  _msgEl.addEventListener('click', _handleCardClick);
  document.body.appendChild(_panelEl);
}

// ─── Panel toggle ─────────────────────────────────────────────────────────────
function _togglePanel() {
  _open = !_open;
  if (_open) {
    if (!_panelEl) _mountPanel();
    _panelEl.classList.add('is-open');
    _btnEl.classList.add('is-open');
    _btnEl.setAttribute('aria-expanded', 'true');
    _btnEl.querySelector('.chat-fab__badge')?.setAttribute('hidden', '');
    if (_firstOpen) {
      _firstOpen = false;
      requestAnimationFrame(() => setTimeout(_showWelcome, 140));
    }
    setTimeout(() => _inputEl?.focus({ preventScroll: true }), 300);
  } else {
    _panelEl.classList.remove('is-open');
    _btnEl.classList.remove('is-open');
    _btnEl.setAttribute('aria-expanded', 'false');
  }
}

// ─── Thinking indicator ───────────────────────────────────────────────────────
function _showThinking() {
  if (!_msgEl) return null;
  const el = document.createElement('div');
  el.className = 'chat-msg chat-msg--bot';
  el.innerHTML = `
    <div class="chat-msg__avatar" aria-hidden="true">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </div>
    <div class="chat-msg__body">
      <div class="chat-msg__bubble">
        <div class="chat-typing-dots" aria-label="Thinking">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>`;
  _msgEl.appendChild(el);
  _scrollBottom();
  return el;
}

// ─── Card interactions ────────────────────────────────────────────────────────
function _handleCardClick(e) {
  const copyBtn = e.target.closest('.chat-btn-copy');
  if (copyBtn) {
    const text = copyBtn.getAttribute('data-copy');
    copyToClipboard(text)
      .then(() => {
        const orig = copyBtn.innerHTML;
        copyBtn.textContent = '✓ Copied!';
        copyBtn.classList.add('is-success');
        setTimeout(() => { copyBtn.innerHTML = orig; copyBtn.classList.remove('is-success'); }, 2000);
      })
      .catch(() => {});
    return;
  }
  const navBtn = e.target.closest('.chat-btn-nav');
  if (navBtn) {
    navigateToDocumentation(navBtn.getAttribute('data-slug'));
    if (window.innerWidth < 600) _togglePanel();
  }
}

// ─── API card HTML ────────────────────────────────────────────────────────────
function _apiCardHtml(api) {
  const method  = (api.method || 'GET').toUpperCase();
  const curl    = api.curl || `curl "${api.urlDisplay}"`;
  const crumb   = (api.breadcrumbs || []).slice(0, -1).join(' › ');
  const rawDesc = (api.description || '').replace(/\s+/g, ' ').trim();
  const desc    = rawDesc ? rawDesc.split(/(?<=[.!?])\s/)[0] : '';
  return `
    <div class="chat-api-card">
      <div class="chat-api-card__head">
        <span class="method-badge method-${method.toLowerCase()}">${_eh(method)}</span>
        <span class="chat-api-card__name">${_eh(api.name)}</span>
      </div>
      ${crumb ? `<div class="chat-api-card__crumb">${_eh(crumb)}</div>` : ''}
      ${desc  ? `<p class="chat-api-card__desc">${_eh(desc)}${desc.endsWith('.') ? '' : '.'}</p>` : ''}
      <div class="chat-api-card__field">
        <span class="chat-field-label">Endpoint</span>
        <code class="chat-api-card__url">${_eh(api.urlDisplay)}</code>
      </div>
      <div class="chat-api-card__field">
        <span class="chat-field-label">cURL</span>
        <div class="chat-curl-wrap"><pre class="chat-curl-pre"><code>${_eh(curl)}</code></pre></div>
      </div>
      <div class="chat-api-card__actions">
        <button type="button" class="chat-btn-copy" data-copy="${_ea(curl)}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy cURL
        </button>
        <button type="button" class="chat-btn-nav" data-slug="${_ea(api.slug)}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Open Documentation
        </button>
      </div>
    </div>
  `;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function _norm(s) {
  return String(s).toLowerCase().trim().replace(/[?!.,;:]+/g, '');
}

function _expandQuery(query) {
  const words  = query.toLowerCase().replace(/[?!.,]/g, '').split(/\s+/).filter(w => w.length >= 2);
  const result = new Set(words);
  for (const word of words) { (SYNONYMS[word] || []).forEach(s => result.add(s)); }
  return [...result];
}

function _autoResize() {
  if (!_inputEl) return;
  _inputEl.style.height = 'auto';
  _inputEl.style.height = Math.min(_inputEl.scrollHeight, 120) + 'px';
}

function _scrollBottom() {
  if (_msgEl) requestAnimationFrame(() => { _msgEl.scrollTop = _msgEl.scrollHeight; });
}

function _eh(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _ea(s) {
  return _eh(s).replace(/"/g, '&quot;');
}
