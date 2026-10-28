// Funnel runtime: turns a funnel document into one standalone HTML file
// (same architecture as Perspective: <section data-page-name> pages + a
// window.perspective SDK that emits pageView/click/answer/submit events).

// This function is serialized into every published page. Keep it self-contained.
function PF_SDK(meta) {
  var KEY_UID = 'pf_user_id', KEY_OUTBOX = 'pf_outbox_v1';
  function rid() { return Math.random().toString(16).slice(2, 14); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var uid = store(KEY_UID) || (store(KEY_UID, rid()), store(KEY_UID)) || rid();
  var sessionId = rid();
  var answers = {}, listeners = {}, current = null, firstSeen = new Date().toISOString();
  var params = new URLSearchParams(location.search);
  var utm = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) { if (params.get(k)) utm[k] = params.get(k); });
  ['fbclid', 'gclid'].forEach(function (k) { if (params.get(k)) answers[k] = params.get(k); });

  function emit(type, data) {
    var evt = Object.assign({ type: type, funnelId: meta.funnelId, sessionId: sessionId, userId: uid,
      page: current, ts: new Date().toISOString(),
      device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop' }, data || {});
    if (window.parent !== window) { window.parent.postMessage({ pf: true, evt: evt }, '*'); return; }
    // Standalone page: offline-first outbox, flushed to apiUrl if configured.
    var box = JSON.parse(store(KEY_OUTBOX) || '[]'); box.push(evt); store(KEY_OUTBOX, JSON.stringify(box));
    if (meta.apiUrl) fetch(meta.apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(box) })
      .then(function (r) { if (r.ok) store(KEY_OUTBOX, '[]'); }).catch(function () {});
  }
  function fire(name, payload) { (listeners[name] || []).forEach(function (fn) { fn(payload); }); }
  function pages() { return [].slice.call(document.querySelectorAll('section[data-page-name]')); }

  var sdk = {
    on: function (name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    pageView: function () { emit('pageView'); },
    click: function (o) { emit('click', { trackingId: o && o.trackingId }); },
    answer: function (o) { answers[o.questionId] = o.value; emit('answer', { questionId: o.questionId, value: o.value }); },
    track: function (name, data) { emit('custom', { name: name, data: data }); },
    getAnswers: function () { return Object.assign({}, answers); },
    getPages: function () { return pages().map(function (s) { return s.dataset.pageName; }); },
    getCurrentPage: function () { return current; },
    goToPage: function (name) {
      var from = current, found = false;
      pages().forEach(function (s) {
        var on = s.dataset.pageName === name; s.hidden = !on; found = found || on;
        if (on) s.setAttribute('data-page-active', ''); else s.removeAttribute('data-page-active');
      });
      if (!found) return;
      current = name; window.scrollTo(0, 0);
      fire('page:navigate', { from: from, to: name });
      sdk.pageView();
      var sec = document.querySelector('section[data-page-name="' + CSS.escape(name) + '"]');
      if (sec && sec.dataset.pageRole === 'result') emit('complete');
    },
    submitForm: function (form) {
      var fd = new FormData(form), contact = {};
      fd.forEach(function (v, k) { contact[k] = v; });
      form.querySelectorAll('input[type=checkbox][name]').forEach(function (c) { contact[c.name] = c.checked; });
      emit('submit', { contact: contact, answers: sdk.getAnswers(), utmParams: utm, firstSeen: firstSeen });
      return Promise.resolve();
    }
  };
  window.perspective = sdk;

  // Generic data-attribute wiring (same contract as Perspective's published HTML).
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-ps-btn]');
    if (!btn) return;
    if (btn.type === 'submit') return; // handled on submit
    sdk.click({ trackingId: btn.dataset.psBtn });
    var group = btn.closest('[data-ps-question]');
    if (btn.hasAttribute('data-answer-option') && group) {
      sdk.answer({ questionId: group.dataset.psQuestion, value: btn.dataset.psValue || btn.textContent.trim() });
      if (btn.dataset.points) { var pts = JSON.parse(sessionStorage.getItem('pf_points') || '{}'); pts[group.dataset.psQuestion] = +btn.dataset.points; sessionStorage.setItem('pf_points', JSON.stringify(pts)); }
    }
    if (btn.hasAttribute('data-input-next')) {
      var inp = group && group.querySelector('input,textarea');
      if (inp && inp.required && !inp.value.trim()) { inp.reportValidity(); return; }
      if (inp) sdk.answer({ questionId: group.dataset.psQuestion, value: inp.value.trim() });
    }
    if (btn.dataset.pageTarget) {
      btn.classList.add('is-selected');
      setTimeout(function () { sdk.goToPage(btn.dataset.pageTarget); }, btn.hasAttribute('data-answer-option') ? 250 : 0);
    }
  });
  document.addEventListener('submit', function (e) {
    var form = e.target; e.preventDefault();
    if (!form.reportValidity()) return;
    var b = form.querySelector('[data-ps-btn]'); if (b) sdk.click({ trackingId: b.dataset.psBtn });
    sdk.submitForm(form).then(function () { if (form.dataset.pageTargetOnSubmit) sdk.goToPage(form.dataset.pageTargetOnSubmit); });
  });
  sdk.on('page:navigate', function () {
    var pts = JSON.parse(sessionStorage.getItem('pf_points') || '{}'), total = 0;
    Object.keys(pts).forEach(function (k) { total += pts[k]; });
    document.querySelectorAll('[data-score]').forEach(function (el) { el.textContent = total; });
    document.querySelectorAll('[data-tier]').forEach(function (el) {
      el.hidden = !(total >= +el.dataset.min && total <= +el.dataset.max);
    });
  });
  sessionStorage.removeItem('pf_points');
  var home = document.querySelector('section[data-page-role="home"]') || pages()[0];
  if (home) sdk.goToPage(home.dataset.pageName);
}

var PF = (function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function elId() { return 'ps-el-' + Math.random().toString(16).slice(2, 14); }

  function block(b, page, funnel) {
    switch (b.type) {
      case 'heading': return '<h1 id="' + elId() + '" class="pf-h">' + esc(b.text) + '</h1>';
      case 'text': return '<p id="' + elId() + '" class="pf-p">' + esc(b.text) + '</p>';
      case 'image': return b.url ? '<img id="' + elId() + '" class="pf-img" src="' + esc(b.url) + '" alt="">' : '';
      case 'button':
        return '<button type="button" class="pf-btn" data-ps-btn="' + esc(b.id) + '" data-page-target="' + esc(b.target) + '">' + esc(b.label) + '</button>';
      case 'choice':
        return '<fieldset class="pf-card" data-ps-question="' + esc(b.questionId) + '" data-ps-title="' + esc(b.title) + '">' +
          '<legend class="pf-legend">' + esc(b.title) + '</legend><div class="pf-opts">' +
          (b.options || []).map(function (o, i) {
            return '<button type="button" class="pf-opt" data-answer-option data-ps-btn="' + esc(b.id + '_' + i) + '" data-ps-value="' + esc(o.label) +
              '" data-page-target="' + esc(o.target) + '"' + (o.points !== '' && o.points != null ? ' data-points="' + (+o.points) + '"' : '') + '>' + esc(o.label) + '</button>';
          }).join('') + '</div></fieldset>';
      case 'input':
        return '<div class="pf-card" data-ps-question="' + esc(b.questionId) + '" data-ps-title="' + esc(b.title) + '">' +
          '<label class="pf-legend">' + esc(b.title) + '</label>' +
          '<input class="pf-input" type="' + esc(b.inputType || 'text') + '"' + (b.required ? ' required' : '') + ' placeholder="' + esc(b.placeholder || '') + '">' +
          '<button type="button" class="pf-btn" data-input-next data-ps-btn="' + esc(b.id) + '" data-page-target="' + esc(b.target) + '">' + esc(b.buttonLabel || 'Weiter') + '</button></div>';
      case 'form':
        var f = b.fields || {};
        return '<form class="pf-card" data-page-target-on-submit="' + esc(b.target) + '">' +
          (f.name ? '<input class="pf-input" name="firstName" placeholder="Vorname" required>' : '') +
          (f.email ? '<input class="pf-input" name="email" type="email" placeholder="E-Mail" required>' : '') +
          (f.phone ? '<input class="pf-input" name="phone" type="tel" placeholder="Telefon"' + (f.phoneRequired ? ' required' : '') + '>' : '') +
          (b.consent ? '<label class="pf-consent"><input type="checkbox" name="consent" required> ' + esc(b.consent) + '</label>' : '') +
          '<button type="submit" class="pf-btn" data-ps-btn="' + esc(b.id) + '">' + esc(b.submitLabel || 'Absenden') + '</button></form>';
      case 'score':
        return '<div class="pf-card pf-center"><div class="pf-score"><span data-score>0</span></div>' +
          (b.tiers || []).map(function (t) { return '<p class="pf-p" data-tier data-min="' + (+t.min) + '" data-max="' + (+t.max) + '" hidden>' + esc(t.text) + '</p>'; }).join('') + '</div>';
    }
    return '';
  }

  function css(t) {
    return ':root{--bg:' + t.backgroundColor + ';--fg:' + t.fontColor + ';--btn:' + t.buttonBackgroundColor + ';--btnfg:' + t.primaryText +
      ';--surface:' + t.surface + ';--border:' + t.border + ';--muted:' + t.mutedText + ';--r:' + t.borderRadius + 'px}' +
      '*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--fg);font-family:' + t.font + ',system-ui,sans-serif;-webkit-font-smoothing:antialiased}' +
      'header{padding:16px;text-align:center}header img{max-height:40px}' +
      'section{max-width:560px;margin:0 auto;padding:16px 20px 48px;display:flex;flex-direction:column;gap:16px;text-align:' + t.contentAlign + '}' +
      'section[hidden]{display:none}section[data-page-active]{animation:rise .45s cubic-bezier(.23,1,.32,1) both}@keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}' +
      '@media (prefers-reduced-motion:reduce){section[data-page-active]{animation:none}}' +
      '.pf-h{font-size:clamp(1.7rem,5vw,2.4rem);line-height:1.1;margin:0;font-weight:800;letter-spacing:-.02em;text-wrap:balance}' +
      '.pf-p{margin:0;color:var(--muted);line-height:1.55;font-size:1.05rem}.pf-img{width:100%;border-radius:var(--r)}' +
      '.pf-card{border:1px solid var(--border);background:var(--surface);border-radius:var(--r);padding:20px;display:flex;flex-direction:column;gap:12px;margin:0;text-align:left}' +
      '.pf-legend{font-weight:600;font-size:1.05rem;padding:0;margin-bottom:4px;float:left;width:100%}.pf-opts{clear:both;display:flex;flex-direction:column;gap:10px}' +
      '.pf-opt{font:inherit;text-align:left;padding:14px 16px;min-height:52px;border-radius:calc(var(--r) * .7);border:1.5px solid var(--border);background:var(--bg);color:var(--fg);cursor:pointer;transition:border-color .15s,transform .1s}' +
      '.pf-opt:hover,.pf-opt.is-selected{border-color:var(--btn)}.pf-opt.is-selected{box-shadow:inset 0 0 0 1px var(--btn)}.pf-opt:active{transform:scale(.98)}' +
      '.pf-btn{font:inherit;font-weight:600;padding:14px 20px;min-height:50px;border:0;border-radius:calc(var(--r) * .7);background:var(--btn);color:var(--btnfg);cursor:pointer;width:100%}.pf-btn:hover{filter:brightness(1.08)}' +
      '.pf-input{font:inherit;padding:13px 14px;border-radius:calc(var(--r) * .6);border:1.5px solid var(--border);background:var(--bg);color:var(--fg);width:100%}.pf-input:focus{outline:2px solid var(--btn);outline-offset:1px}' +
      '.pf-consent{display:flex;gap:8px;font-size:.85rem;color:var(--muted);align-items:flex-start}.pf-center{align-items:center;text-align:center}' +
      '.pf-score{width:120px;height:120px;border-radius:50%;border:8px solid var(--btn);display:grid;place-items:center;font-size:2.6rem;font-weight:800}';
  }

  // Publish: funnel doc → standalone HTML string (also used for the editor preview).
  function toHTML(funnel, brand, opts) {
    var t = brand || DEFAULT_THEME;
    var meta = { funnelId: funnel.id, versionId: funnel.version || 1, apiUrl: (opts && opts.apiUrl) || '' };
    return '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(funnel.name) + '</title><style>' + css(t) + '</style>' +
      '<script id="perspective-metadata" type="application/json">' + JSON.stringify(meta).replace(/</g, '\\u003c') + '<\/script></head><body>' +
      (t.logoUrl ? '<header><img src="' + esc(t.logoUrl) + '" alt=""></header>' : '') + '<main>' +
      funnel.pages.map(function (p) {
        return '<section data-page-name="' + esc(p.name) + '" data-page-role="' + esc(p.role || 'page') + '" hidden>' +
          p.blocks.map(function (b) { return block(b, p, funnel); }).join('') + '</section>';
      }).join('') +
      '</main><script>(' + PF_SDK.toString() + ')(' + JSON.stringify(meta).replace(/</g, '\\u003c') + ');<\/script></body></html>';
  }

  var DEFAULT_THEME = { backgroundColor: '#ffffff', fontColor: '#111827', buttonBackgroundColor: '#4f46e5', primaryText: '#ffffff',
    surface: '#f8fafc', border: '#e2e8f0', mutedText: '#475569', borderRadius: 14, font: 'Inter', contentAlign: 'center', logoUrl: '' };

  return { toHTML: toHTML, DEFAULT_THEME: DEFAULT_THEME, esc: esc };
})();
