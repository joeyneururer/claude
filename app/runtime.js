// Funnel runtime: turns a funnel document into one standalone HTML file
// (same architecture as Perspective: <section data-page-name> pages + a
// window.perspective SDK that emits pageView/click/answer/submit events).
// The same renderer also produces the editor canvas (opts.edit).

// This function is serialized into every published page. Keep it self-contained.
function PF_SDK(meta) {
  var KEY_UID = 'pf_user_id', KEY_OUTBOX = 'pf_outbox_v1';
  function rid() { return Math.random().toString(16).slice(2, 14); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var uid = store(KEY_UID) || (store(KEY_UID, rid()), store(KEY_UID)) || rid();
  var sessionId = rid();
  var answers = {}, points = {}, listeners = {}, current = null, stack = [], firstSeen = new Date().toISOString();
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
    goBack: function () { if (stack.length) { var prev = stack.pop(); sdk.goToPage(prev, true); } },
    goToPage: function (name, isBack) {
      var from = current, found = false;
      pages().forEach(function (s) {
        var on = s.dataset.pageName === name; s.hidden = !on; found = found || on;
        if (on) s.setAttribute('data-page-active', ''); else s.removeAttribute('data-page-active');
      });
      if (!found) return;
      if (from && !isBack) stack.push(from);
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
    if (e.target.closest('[data-pf-back]')) { sdk.goBack(); return; }
    var multi = e.target.closest('[data-multi-option]');
    if (multi) { multi.classList.toggle('is-selected'); multi.setAttribute('aria-pressed', multi.classList.contains('is-selected')); return; }
    var btn = e.target.closest('[data-ps-btn]');
    if (!btn) return;
    if (btn.type === 'submit') return; // handled on submit
    if (btn.tagName === 'A') { sdk.click({ trackingId: btn.dataset.psBtn }); return; }
    var group = btn.closest('[data-ps-question]');
    if (btn.hasAttribute('data-answer-option') && group) {
      sdk.click({ trackingId: btn.dataset.psBtn });
      sdk.answer({ questionId: group.dataset.psQuestion, value: btn.dataset.psValue || btn.textContent.trim() });
      if (btn.dataset.points) points[group.dataset.psQuestion] = +btn.dataset.points;
    } else if (btn.hasAttribute('data-multi-next') && group) {
      var picked = [].slice.call(group.querySelectorAll('[data-multi-option].is-selected')).map(function (o) { return o.dataset.psValue; });
      var min = +(group.dataset.min || 1);
      var err = group.querySelector('.pf-err');
      if (picked.length < min) { if (err) err.hidden = false; return; }
      if (err) err.hidden = true;
      sdk.click({ trackingId: btn.dataset.psBtn });
      sdk.answer({ questionId: group.dataset.psQuestion, value: picked.join('; ') });
    } else if (btn.hasAttribute('data-input-next') && group) {
      var inp = group.querySelector('input,textarea');
      if (inp && !inp.reportValidity()) return;
      sdk.click({ trackingId: btn.dataset.psBtn });
      if (inp) sdk.answer({ questionId: group.dataset.psQuestion, value: inp.value.trim() });
    } else sdk.click({ trackingId: btn.dataset.psBtn });
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
    var total = 0;
    Object.keys(points).forEach(function (k) { total += points[k]; });
    document.querySelectorAll('[data-score]').forEach(function (el) { el.textContent = total; });
    document.querySelectorAll('[data-tier]').forEach(function (el) {
      el.hidden = !(total >= +el.dataset.min && total <= +el.dataset.max);
    });
  });
  var start = (meta.startPage && document.querySelector('section[data-page-name="' + CSS.escape(meta.startPage) + '"]')) ||
    document.querySelector('section[data-page-role="home"]') || pages()[0];
  if (start) sdk.goToPage(start.dataset.pageName);
}

// Runs inside the editor canvas: selection, hover labels, inline text editing,
// floating toolbar. Talks to the editor only through postMessage.
function PF_EDIT(opts) {
  var post = function (m) { m.pfEdit = true; window.parent.postMessage(m, '*'); };
  var sel = null, editing = null;
  var LABELS = opts.labels;
  var hover = document.createElement('div'); hover.className = 'pfx-hover'; hover.innerHTML = '<span></span>';
  var box = document.createElement('div'); box.className = 'pfx-sel'; box.innerHTML = '<span class="pfx-tag"></span>';
  var bar = document.createElement('div'); bar.className = 'pfx-bar';
  bar.innerHTML =
    '<button data-x="bold" title="Fett (beim Bearbeiten)"><b>B</b></button>' +
    '<button data-x="italic" title="Kursiv (beim Bearbeiten)"><i>I</i></button>' +
    '<button data-x="align" title="Ausrichtung wechseln">≡</button>' +
    '<label title="Textfarbe" class="pfx-color"><input type="color" data-x="color"><span></span></label>' +
    '<span class="pfx-sep"></span>' +
    '<button data-x="up" title="Nach oben">↑</button><button data-x="down" title="Nach unten">↓</button>' +
    '<button data-x="dup" title="Duplizieren">⧉</button>' +
    '<button data-x="ai" title="KI zu diesem Element fragen">✦</button>' +
    '<button data-x="del" title="Löschen" class="pfx-del">🗑</button>';
  hover.hidden = box.hidden = bar.hidden = true;
  document.body.append(hover, box, bar);

  function blockOf(el) { return el && el.closest ? el.closest('[data-bid]') : null; }
  function place(el, frame) {
    var r = el.getBoundingClientRect();
    frame.style.top = (r.top + scrollY) + 'px'; frame.style.left = (r.left + scrollX) + 'px';
    frame.style.width = r.width + 'px'; frame.style.height = r.height + 'px';
  }
  function placeBar() {
    if (!sel) return;
    var el = document.querySelector('[data-bid="' + sel + '"]'); if (!el) return;
    place(el, box);
    var r = el.getBoundingClientRect(), top = r.top + scrollY - 62;
    if (top < scrollY + 4) top = r.top + scrollY + 6; // no room above: overlay the selected element itself
    bar.style.top = top + 'px';
    bar.style.left = Math.max(6, Math.min(r.left + r.width / 2 - bar.offsetWidth / 2, innerWidth - bar.offsetWidth - 6)) + 'px';
  }
  function select(id, notify) {
    sel = id;
    var el = id && document.querySelector('[data-bid="' + id + '"]');
    box.hidden = bar.hidden = !el;
    if (!el) { if (notify) post({ type: 'select', id: null }); return; }
    box.querySelector('.pfx-tag').textContent = LABELS[el.dataset.btype] || el.dataset.btype;
    bar.querySelector('[data-x=color]').value = el.dataset.color || '#000000';
    placeBar();
    if (notify) post({ type: 'select', id: id });
  }
  function stopEditing() {
    if (!editing) return;
    var el = editing; editing = null;
    el.removeAttribute('contenteditable');
    var rich = el.hasAttribute('data-rich');
    post({ type: 'text', id: blockOf(el).dataset.bid, field: el.dataset.field, value: rich ? el.innerHTML : el.innerText.replace(/\n+$/, '') });
  }
  function startEditing(el) {
    if (editing === el) return;
    stopEditing();
    editing = el; el.setAttribute('contenteditable', 'true'); el.focus();
    var range = document.createRange(); range.selectNodeContents(el); range.collapse(false);
    var s = getSelection(); s.removeAllRanges(); s.addRange(range);
  }

  document.addEventListener('mouseover', function (e) {
    var b = blockOf(e.target);
    hover.hidden = !b || b.dataset.bid === sel;
    if (b && b.dataset.bid !== sel) { place(b, hover); hover.querySelector('span').textContent = LABELS[b.dataset.btype] || b.dataset.btype; }
  });
  document.addEventListener('click', function (e) {
    if (bar.contains(e.target)) return;
    if (editing && editing.contains(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    var b = blockOf(e.target);
    stopEditing();
    if (!b) { select(null, true); return; }
    if (b.dataset.bid === sel) { var t = e.target.closest('[data-field]'); if (t) startEditing(t); return; }
    select(b.dataset.bid, true);
  }, true);
  document.addEventListener('dblclick', function (e) {
    var t = e.target.closest('[data-field]'); var b = blockOf(t);
    if (!t || !b) return;
    e.preventDefault();
    if (b.dataset.bid !== sel) select(b.dataset.bid, true);
    startEditing(t);
  }, true);
  document.addEventListener('submit', function (e) { e.preventDefault(); }, true);
  document.addEventListener('keydown', function (e) {
    if (editing) {
      if (e.key === 'Escape' || (e.key === 'Enter' && !editing.hasAttribute('data-rich'))) { e.preventDefault(); stopEditing(); }
      if ((e.metaKey || e.ctrlKey) && /^[bi]$/i.test(e.key)) { e.preventDefault(); document.execCommand(e.key.toLowerCase() === 'b' ? 'bold' : 'italic'); }
      return;
    }
    if (e.target.matches && e.target.matches('input,textarea')) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); post({ type: 'action', action: 'del', id: sel }); }
    else if (e.key === 'Escape') select(null, true);
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); post({ type: 'action', action: e.shiftKey ? 'redo' : 'undo' }); }
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && sel) { e.preventDefault(); post({ type: 'action', action: 'dup', id: sel }); }
  });
  bar.addEventListener('mousedown', function (e) { if (e.target.closest('[data-x=bold],[data-x=italic]')) e.preventDefault(); });
  bar.addEventListener('click', function (e) {
    var x = e.target.closest('[data-x]'); if (!x || x.dataset.x === 'color') return;
    if (x.dataset.x === 'bold' || x.dataset.x === 'italic') {
      if (editing && editing.hasAttribute('data-rich')) document.execCommand(x.dataset.x);
      else post({ type: 'action', action: 'toggle-' + x.dataset.x, id: sel });
      return;
    }
    stopEditing();
    post({ type: 'action', action: x.dataset.x, id: sel });
  });
  bar.querySelector('[data-x=color]').addEventListener('change', function (e) { post({ type: 'action', action: 'color', id: sel, value: e.target.value }); });
  window.addEventListener('message', function (e) { if (e.data && e.data.pfSelect !== undefined) select(e.data.pfSelect, false); });
  var st; window.addEventListener('scroll', function () { clearTimeout(st); st = setTimeout(function () { post({ type: 'scroll', y: scrollY }); }, 120); });
  window.addEventListener('resize', placeBar);
  window.scrollTo(0, opts.scroll || 0);
  select(opts.selected, false);
  // Images and fonts can shift the layout after first paint.
  window.addEventListener('load', placeBar); setTimeout(placeBar, 300);
}

var PF = (function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // Rich text keeps only inline formatting. Runs in the editor (has a DOM).
  var ALLOWED = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, BR: 1, A: 1, MARK: 1, SPAN: 1 };
  function cleanHTML(html) {
    if (typeof DOMParser === 'undefined') return esc(html);
    var doc = new DOMParser().parseFromString('<div>' + String(html || '') + '</div>', 'text/html');
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) return;
        if (n.nodeType !== 1) { n.remove(); return; }
        walk(n);
        if (n.tagName === 'DIV' || n.tagName === 'P') { n.after(doc.createElement('br')); n.replaceWith.apply(n, [].slice.call(n.childNodes)); return; }
        if (!ALLOWED[n.tagName]) { n.replaceWith.apply(n, [].slice.call(n.childNodes)); return; }
        var href = n.getAttribute('href'), color = n.style && n.style.color;
        [].slice.call(n.attributes).forEach(function (a) { n.removeAttribute(a.name); });
        if (n.tagName === 'A' && href && /^(https?:|mailto:|tel:)/i.test(href)) { n.setAttribute('href', href); n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener'); }
        if (n.tagName === 'SPAN' && color) n.style.color = color;
      });
    })(doc.body.firstChild);
    return doc.body.firstChild.innerHTML.replace(/(<br>)+$/, '');
  }
  function rich(b) { return b.html != null ? cleanHTML(b.html) : esc(b.text); }

  var LABELS = { heading: 'Überschrift', text: 'Absatz', badge: 'Badge', image: 'Bild', button: 'Button', choice: 'Einfachauswahl', multi: 'Mehrfachauswahl',
    input: 'Eingabefeld', form: 'Kontaktformular', list: 'Liste', features: 'Vorteile', faq: 'FAQ', testimonial: 'Testimonial', score: 'Ergebnis-Score',
    divider: 'Trennlinie', spacer: 'Abstand' };
  var FORM_FIELDS = { firstName: ['text', 'Vorname', true], lastName: ['text', 'Nachname', false], email: ['email', 'E-Mail', true],
    phone: ['tel', 'Telefon', false], company: ['text', 'Firma', false], message: ['textarea', 'Nachricht', false] };
  var ICONS = { check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    dot: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' };
  var SIZES = { s: .88, m: 1, l: 1.2, xl: 1.45 };

  function blockStyle(b) {
    var s = b.style || {}, css = [];
    if (s.align) css.push('text-align:' + s.align, '--pf-align:' + (s.align === 'center' ? 'center' : s.align === 'right' ? 'flex-end' : 'flex-start'));
    if (s.color) css.push('color:' + s.color, '--pf-fg-b:' + s.color);
    if (s.bg) css.push('background:' + s.bg, 'padding:18px', 'border-radius:var(--r)');
    if (s.size && SIZES[s.size]) css.push('--pf-scale:' + SIZES[s.size]);
    if (s.bold) css.push('font-weight:700');
    if (s.italic) css.push('font-style:italic');
    if (s.space) css.push('margin-top:' + ({ none: 0, s: 4, m: 16, l: 32 }[s.space] || 0) + 'px');
    return css.join(';');
  }

  function inner(b, ctx) {
    var ed = ctx.edit;
    var f = function (field, isRich) { return ed ? ' data-field="' + field + '"' + (isRich ? ' data-rich' : '') : ''; };
    switch (b.type) {
      case 'heading':
        var lv = Math.min(3, Math.max(1, +b.level || 1));
        return '<h' + lv + ' class="pf-h pf-h' + lv + '"' + f('html', true) + '>' + rich(b) + '</h' + lv + '>';
      case 'text': return '<p class="pf-p"' + f('html', true) + '>' + rich(b) + '</p>';
      case 'badge': return '<span class="pf-badge"' + f('text') + '>' + esc(b.text) + '</span>';
      case 'image': return b.url ? '<img class="pf-img" src="' + esc(b.url) + '" alt="' + esc(b.alt) + '"' + (b.rounded === false ? ' style="border-radius:0"' : '') + '>'
        : (ed ? '<div class="pf-img-empty">Bild-URL im Inspektor eintragen</div>' : '');
      case 'button':
        var cls = 'pf-btn' + (b.variant === 'secondary' ? ' pf-btn-2' : '');
        if (b.url) return '<a class="' + cls + '" href="' + esc(b.url) + '" target="_blank" rel="noopener" data-ps-btn="' + esc(b.id) + '"' + f('label') + '>' + esc(b.label) + '</a>';
        return '<button type="button" class="' + cls + '" data-ps-btn="' + esc(b.id) + '" data-page-target="' + esc(b.target) + '"' + f('label') + '>' + esc(b.label) + '</button>';
      case 'choice':
        return '<fieldset class="pf-q" data-ps-question="' + esc(b.questionId) + '" data-ps-title="' + esc(b.title) + '">' +
          (b.title ? '<legend class="pf-legend"' + f('title') + '>' + esc(b.title) + '</legend>' : '') +
          '<div class="pf-opts' + (b.layout === 'grid' ? ' pf-grid' : '') + '">' +
          (b.options || []).map(function (o, i) {
            return '<button type="button" class="pf-opt" data-answer-option data-ps-btn="' + esc(b.id + '_' + i) + '" data-ps-value="' + esc(o.label) +
              '" data-page-target="' + esc(o.target) + '"' + (o.points !== '' && o.points != null ? ' data-points="' + (+o.points) + '"' : '') + '>' +
              (o.icon ? '<span class="pf-ico">' + esc(o.icon) + '</span>' : '') + '<span' + f('options.' + i + '.label') + '>' + esc(o.label) + '</span>' +
              (b.layout === 'grid' ? '' : '<span class="pf-chev">' + ICONS.arrow + '</span>') + '</button>';
          }).join('') + '</div></fieldset>';
      case 'multi':
        return '<fieldset class="pf-q" data-ps-question="' + esc(b.questionId) + '" data-ps-title="' + esc(b.title) + '" data-min="' + (+b.min || 1) + '">' +
          (b.title ? '<legend class="pf-legend"' + f('title') + '>' + esc(b.title) + '</legend>' : '') +
          '<p class="pf-hint">Mehrere Antworten möglich</p><div class="pf-opts' + (b.layout === 'grid' ? ' pf-grid' : '') + '">' +
          (b.options || []).map(function (o, i) {
            return '<button type="button" class="pf-opt pf-multi" data-multi-option aria-pressed="false" data-ps-value="' + esc(o.label) + '">' +
              '<span class="pf-box">' + ICONS.check + '</span>' + (o.icon ? '<span class="pf-ico">' + esc(o.icon) + '</span>' : '') +
              '<span' + f('options.' + i + '.label') + '>' + esc(o.label) + '</span></button>';
          }).join('') + '</div><p class="pf-err" hidden>Bitte wähle mindestens ' + (+b.min || 1) + ' Antwort' + ((+b.min || 1) > 1 ? 'en' : '') + '.</p>' +
          '<button type="button" class="pf-btn" data-multi-next data-ps-btn="' + esc(b.id) + '" data-page-target="' + esc(b.target) + '"' + f('buttonLabel') + '>' + esc(b.buttonLabel || 'Weiter') + '</button></fieldset>';
      case 'input':
        var field = b.inputType === 'textarea' ? '<textarea class="pf-input" rows="4"' + (b.required ? ' required' : '') + ' placeholder="' + esc(b.placeholder) + '"></textarea>'
          : '<input class="pf-input" type="' + esc(b.inputType || 'text') + '"' + (b.required ? ' required' : '') + ' placeholder="' + esc(b.placeholder) + '">';
        return '<div class="pf-q" data-ps-question="' + esc(b.questionId) + '" data-ps-title="' + esc(b.title) + '">' +
          (b.title ? '<label class="pf-legend"' + f('title') + '>' + esc(b.title) + '</label>' : '') + field +
          '<button type="button" class="pf-btn" data-input-next data-ps-btn="' + esc(b.id) + '" data-page-target="' + esc(b.target) + '"' + f('buttonLabel') + '>' + esc(b.buttonLabel || 'Weiter') + '</button></div>';
      case 'form':
        var fl = b.fields || {};
        return '<form class="pf-form" data-page-target-on-submit="' + esc(b.target) + '"' + (ed ? ' onsubmit="return false"' : '') + '>' +
          Object.keys(FORM_FIELDS).filter(function (k) { return fl[k]; }).map(function (k) {
            var d = FORM_FIELDS[k], req = (b.required && b.required[k] != null) ? b.required[k] : d[2];
            var lbl = d[1] + (req ? '' : ' (optional)');
            return '<label class="pf-fl"><span>' + lbl + '</span>' + (d[0] === 'textarea' ? '<textarea class="pf-input" name="' + k + '" rows="3"' + (req ? ' required' : '') + '></textarea>'
              : '<input class="pf-input" name="' + k + '" type="' + d[0] + '"' + (req ? ' required' : '') + ' autocomplete="' + ({ firstName: 'given-name', lastName: 'family-name', email: 'email', phone: 'tel', company: 'organization' }[k] || 'off') + '">') + '</label>';
          }).join('') +
          (b.consent ? '<label class="pf-consent"><input type="checkbox" name="consent" required> <span' + f('consent') + '>' + esc(b.consent) + '</span></label>' : '') +
          '<button type="submit" class="pf-btn" data-ps-btn="' + esc(b.id) + '"' + f('submitLabel') + '>' + esc(b.submitLabel || 'Absenden') + '</button>' +
          (b.note ? '<p class="pf-hint"' + f('note') + '>' + esc(b.note) + '</p>' : '') + '</form>';
      case 'list':
        var icon = b.icon || 'check';
        return '<ul class="pf-list pf-list-' + esc(icon) + '">' + (b.items || []).map(function (it, i) {
          return '<li><span class="pf-li-ico">' + (icon === 'number' ? (i + 1) : (ICONS[icon] || ICONS.check)) + '</span><span' + f('items.' + i) + '>' + esc(it) + '</span></li>';
        }).join('') + '</ul>';
      case 'features':
        return '<div class="pf-features">' + (b.items || []).map(function (it, i) {
          return '<div class="pf-feature">' + (it.icon ? '<span class="pf-fico">' + esc(it.icon) + '</span>' : '') + '<strong' + f('items.' + i + '.title') + '>' + esc(it.title) + '</strong>' +
            '<span class="pf-p"' + f('items.' + i + '.text') + '>' + esc(it.text) + '</span></div>';
        }).join('') + '</div>';
      case 'faq':
        return '<div class="pf-faq">' + (b.items || []).map(function (it, i) {
          return '<details' + (ed && i === 0 ? ' open' : '') + '><summary' + f('items.' + i + '.q') + '>' + esc(it.q) + '</summary><p class="pf-p"' + f('items.' + i + '.a') + '>' + esc(it.a) + '</p></details>';
        }).join('') + '</div>';
      case 'testimonial':
        var stars = Math.max(0, Math.min(5, +b.rating || 0));
        return '<figure class="pf-testi">' + (stars ? '<div class="pf-stars" aria-label="' + stars + ' von 5 Sternen">' + '★★★★★'.slice(0, stars) + '<span>' + '★★★★★'.slice(stars) + '</span></div>' : '') +
          '<blockquote' + f('quote') + '>' + esc(b.quote) + '</blockquote><figcaption>' + (b.avatar ? '<img src="' + esc(b.avatar) + '" alt="">' : '') +
          '<span><strong' + f('name') + '>' + esc(b.name) + '</strong>' + (b.role ? '<span' + f('role') + '>' + esc(b.role) + '</span>' : '') + '</span></figcaption></figure>';
      case 'score':
        return '<div class="pf-scorebox"><div class="pf-score"><span data-score>' + (ed ? '7' : '0') + '</span></div>' +
          (b.tiers || []).map(function (t, i) { return '<p class="pf-p" data-tier data-min="' + (+t.min) + '" data-max="' + (+t.max) + '"' + (ed ? (i === 1 ? '' : ' hidden') : ' hidden') + '>' + esc(t.text) + '</p>'; }).join('') + '</div>';
      case 'divider': return '<hr class="pf-hr">';
      case 'spacer': return '<div style="height:' + Math.max(0, Math.min(200, +b.size || 24)) + 'px"></div>';
    }
    return '';
  }

  function block(b, ctx) {
    var html = inner(b, ctx);
    if (!html) return '';
    return '<div class="pf-b pf-b-' + b.type + '" data-bid="' + esc(b.id) + '" data-btype="' + b.type + '"' +
      (b.style && b.style.color ? ' data-color="' + esc(b.style.color) + '"' : '') + ' style="' + blockStyle(b) + '">' + html + '</div>';
  }

  function css(t) {
    return ':root{--bg:' + t.backgroundColor + ';--fg:' + t.fontColor + ';--btn:' + t.buttonBackgroundColor + ';--btnfg:' + t.primaryText +
      ';--surface:' + t.surface + ';--border:' + t.border + ';--muted:' + t.mutedText + ';--r:' + t.borderRadius + 'px;--pf-scale:1}' +
      '*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--fg);font-family:' + t.font + ',system-ui,sans-serif;-webkit-font-smoothing:antialiased}' +
      'header.pf-head{padding:16px;text-align:center}header.pf-head img{max-height:40px;display:inline-block}' +
      'section{max-width:600px;margin:0 auto;padding:16px 20px 48px;display:flex;flex-direction:column;gap:16px;text-align:' + t.contentAlign + '}section[hidden]{display:none}' +
      'section[data-page-active]{animation:rise .45s cubic-bezier(.23,1,.32,1) both}@keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}' +
      '@media (prefers-reduced-motion:reduce){section[data-page-active]{animation:none}}' +
      '.pf-b{--pf-align:' + (t.contentAlign === 'left' ? 'flex-start' : 'center') + ';font-size:calc(1rem * var(--pf-scale))}' +
      '.pf-h{margin:0;line-height:1.1;font-weight:800;letter-spacing:-.02em;text-wrap:balance}.pf-h1{font-size:calc(clamp(1.7rem,5vw,2.4rem) * var(--pf-scale))}.pf-h2{font-size:calc(1.5rem * var(--pf-scale))}.pf-h3{font-size:calc(1.15rem * var(--pf-scale))}' +
      '.pf-p{margin:0;color:var(--pf-fg-b,var(--muted));line-height:1.6;font-size:calc(1.05rem * var(--pf-scale))}.pf-p a,.pf-h a{color:var(--btn)}' +
      '.pf-badge{display:inline-block;font-size:.75rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:5px 12px;border-radius:99px;border:1px solid var(--btn);color:var(--btn)}' +
      '.pf-img{width:100%;border-radius:var(--r);display:block}.pf-img-empty{border:2px dashed var(--border);border-radius:var(--r);padding:40px 16px;color:var(--muted);text-align:center;font-size:.9rem}' +
      '.pf-q{border:1px solid var(--border);background:var(--surface);border-radius:var(--r);padding:20px;display:flex;flex-direction:column;gap:12px;margin:0;text-align:left}' +
      '.pf-legend{font-weight:650;font-size:1.08rem;padding:0;margin-bottom:4px;float:left;width:100%;text-align:inherit}.pf-hint{margin:0;font-size:.82rem;color:var(--muted);clear:both}' +
      '.pf-opts{clear:both;display:flex;flex-direction:column;gap:10px}.pf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}' +
      '.pf-opt{font:inherit;display:flex;align-items:center;gap:12px;text-align:left;padding:14px 16px;min-height:54px;border-radius:calc(var(--r) * .7);border:1.5px solid var(--border);background:var(--bg);color:var(--fg);cursor:pointer;transition:border-color .15s,transform .1s,background .15s}' +
      '.pf-grid .pf-opt{flex-direction:column;justify-content:center;text-align:center;padding:18px 10px}.pf-grid .pf-ico{font-size:2rem}' +
      '.pf-opt:hover,.pf-opt.is-selected{border-color:var(--btn)}.pf-opt.is-selected{box-shadow:inset 0 0 0 1px var(--btn);background:color-mix(in srgb,var(--btn) 8%,var(--bg))}.pf-opt:active{transform:scale(.98)}' +
      '.pf-opt>span:not(.pf-ico):not(.pf-chev):not(.pf-box){flex:1}.pf-ico{font-size:1.4rem;line-height:1}.pf-chev{width:18px;height:18px;opacity:.45;flex:none}.pf-chev svg,.pf-box svg,.pf-li-ico svg{width:100%;height:100%}' +
      '.pf-box{width:20px;height:20px;border:1.5px solid var(--border);border-radius:5px;flex:none;padding:2px;color:transparent}.pf-multi.is-selected .pf-box{background:var(--btn);border-color:var(--btn);color:var(--btnfg)}' +
      '.pf-err{margin:0;color:#d23f3f;font-size:.85rem}' +
      '.pf-btn{font:inherit;font-weight:650;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;padding:14px 20px;min-height:52px;border:0;border-radius:calc(var(--r) * .7);background:var(--btn);color:var(--btnfg);cursor:pointer;width:100%;font-size:calc(1rem * var(--pf-scale));transition:filter .15s,transform .1s}.pf-btn:hover{filter:brightness(1.08)}.pf-btn:active{transform:scale(.99)}' +
      '.pf-btn-2{background:transparent;color:var(--fg);border:1.5px solid var(--border)}' +
      '.pf-input{font:inherit;padding:13px 14px;border-radius:calc(var(--r) * .6);border:1.5px solid var(--border);background:var(--bg);color:var(--fg);width:100%}.pf-input:focus{outline:2px solid var(--btn);outline-offset:1px}' +
      '.pf-form{display:flex;flex-direction:column;gap:12px;text-align:left;border:1px solid var(--border);background:var(--surface);border-radius:var(--r);padding:20px}' +
      '.pf-fl{display:flex;flex-direction:column;gap:5px;font-size:.88rem;font-weight:600}' +
      '.pf-consent{display:flex;gap:8px;font-size:.85rem;color:var(--muted);align-items:flex-start;line-height:1.4}.pf-consent input{margin-top:3px}' +
      '.pf-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;text-align:left}.pf-list li{display:flex;gap:12px;align-items:flex-start;line-height:1.5}' +
      '.pf-li-ico{width:24px;height:24px;border-radius:50%;flex:none;display:grid;place-items:center;padding:5px;background:color-mix(in srgb,var(--btn) 14%,transparent);color:var(--btn);font-size:.8rem;font-weight:700}' +
      '.pf-list-cross .pf-li-ico{background:color-mix(in srgb,#d23f3f 14%,transparent);color:#d23f3f}' +
      '.pf-features{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;text-align:left}.pf-feature{border:1px solid var(--border);background:var(--surface);border-radius:var(--r);padding:16px;display:flex;flex-direction:column;gap:6px}.pf-fico{font-size:1.6rem}' +
      '.pf-faq{display:flex;flex-direction:column;gap:8px;text-align:left}.pf-faq details{border:1px solid var(--border);background:var(--surface);border-radius:calc(var(--r) * .7);padding:14px 16px}.pf-faq summary{font-weight:650;cursor:pointer}.pf-faq details .pf-p{margin-top:8px}' +
      '.pf-testi{margin:0;border:1px solid var(--border);background:var(--surface);border-radius:var(--r);padding:20px;text-align:left;display:flex;flex-direction:column;gap:10px}.pf-stars{color:#f5a524;letter-spacing:2px}.pf-stars span{opacity:.25}' +
      '.pf-testi blockquote{margin:0;font-size:1.05rem;line-height:1.55}.pf-testi figcaption{display:flex;gap:10px;align-items:center}.pf-testi figcaption img{width:40px;height:40px;border-radius:50%;object-fit:cover}.pf-testi figcaption>span{display:flex;flex-direction:column;font-size:.9rem}.pf-testi figcaption>span>span{color:var(--muted)}' +
      '.pf-scorebox{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}.pf-score{width:120px;height:120px;border-radius:50%;border:8px solid var(--btn);display:grid;place-items:center;font-size:2.6rem;font-weight:800}' +
      '.pf-hr{border:0;border-top:1px solid var(--border);margin:4px 0;width:100%}' +
      '.pf-progress{height:6px;border-radius:99px;background:var(--border);overflow:hidden}.pf-progress i{display:block;height:100%;background:var(--btn);border-radius:99px;transition:width .4s}' +
      '.pf-back{font:inherit;align-self:flex-start;background:none;border:0;color:var(--muted);cursor:pointer;padding:4px 0;font-size:.9rem}';
  }

  var EDIT_CSS = 'body{padding-top:48px}.pf-b{position:relative;cursor:default}[data-field]{cursor:text}[contenteditable]{outline:none;cursor:text}' +
    '.pfx-hover,.pfx-sel{position:absolute;pointer-events:none;z-index:50;border:1.5px dashed #3b82f6;border-radius:4px}.pfx-sel{border:2px solid #2563eb;background:rgba(37,99,235,.06)}' +
    '.pfx-hover span,.pfx-tag{position:absolute;top:-22px;left:-2px;font:600 11px/1 system-ui,sans-serif;background:#2563eb;color:#fff;padding:5px 7px;border-radius:4px 4px 4px 0;white-space:nowrap}.pfx-hover span{background:#60a5fa}' +
    '.pfx-bar{position:absolute;z-index:60;display:flex;align-items:center;gap:2px;background:#16181d;border-radius:99px;padding:4px 6px;box-shadow:0 8px 24px rgba(0,0,0,.25)}' +
    '.pfx-bar button,.pfx-color{font:600 13px system-ui,sans-serif;width:30px;height:30px;border:0;border-radius:99px;background:none;color:#e8eaee;cursor:pointer;display:grid;place-items:center;position:relative}' +
    '.pfx-bar button:hover,.pfx-color:hover{background:#2c3038}.pfx-del{color:#f87171!important}.pfx-sep{width:1px;height:18px;background:#3a3f48;margin:0 3px}' +
    '.pfx-color input{position:absolute;inset:0;opacity:0;cursor:pointer}.pfx-color span{width:14px;height:14px;border-radius:50%;background:conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)}' +
    '[hidden]{display:none!important}';

  // Publish: funnel doc → standalone HTML string.
  // opts.edit = {page, selected, scroll} renders the editor canvas instead.
  // opts.startPage starts the preview on a given page.
  function toHTML(funnel, brand, opts) {
    opts = opts || {};
    var t = Object.assign({}, DEFAULT_THEME, brand || {});
    var settings = funnel.settings || {};
    var meta = { funnelId: funnel.id, versionId: funnel.version || 1, apiUrl: opts.apiUrl || '', startPage: opts.startPage || '' };
    var flow = funnel.pages.filter(function (p) { return p.role === 'page'; });
    var ctx = { edit: !!opts.edit };
    var sections = funnel.pages.map(function (p, i) {
      var hidden = opts.edit ? i !== opts.edit.page : true;
      var pos = flow.indexOf(p);
      var top = '';
      if (settings.back && p.role !== 'home') top += '<button type="button" class="pf-back" data-pf-back>← Zurück</button>';
      if (settings.progress && pos > -1) top += '<div class="pf-progress" role="progressbar" aria-valuenow="' + Math.round((pos + 1) / (flow.length + 1) * 100) + '"><i style="width:' + Math.round((pos + 1) / (flow.length + 1) * 100) + '%"></i></div>';
      return '<section data-page-name="' + esc(p.name) + '" data-page-role="' + esc(p.role || 'page') + '"' + (hidden ? ' hidden' : ' data-page-active') + '>' + top +
        p.blocks.map(function (b) { return block(b, ctx); }).join('') +
        (opts.edit && !p.blocks.length ? '<div class="pf-img-empty">Leere Seite: füge links ein Element hinzu oder frag die KI.</div>' : '') + '</section>';
    }).join('');
    var head = '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(settings.title || funnel.name) + '</title>' + (settings.description ? '<meta name="description" content="' + esc(settings.description) + '">' : '') +
      '<style>' + css(t) + (opts.edit ? EDIT_CSS : '') + '</style>';
    var logo = t.logoUrl ? '<header class="pf-head"><img src="' + esc(t.logoUrl) + '" alt=""></header>' : '';
    if (opts.edit) {
      if (opts.edit.noAnim) head = head.replace('section[data-page-active]{animation:rise', 'section[data-page-active]{animation:none;--x:rise');
      return head + '</head><body>' + logo + '<main>' + sections + '</main><script>(' + PF_EDIT.toString() + ')(' +
        JSON.stringify({ selected: opts.edit.selected || null, scroll: opts.edit.scroll || 0, labels: LABELS }).replace(/</g, '\\u003c') + ');<\/script></body></html>';
    }
    return head + '<script id="perspective-metadata" type="application/json">' + JSON.stringify(meta).replace(/</g, '\\u003c') + '<\/script></head><body>' + logo + '<main>' + sections +
      '</main><script>(' + PF_SDK.toString() + ')(' + JSON.stringify(meta).replace(/</g, '\\u003c') + ');<\/script></body></html>';
  }

  var DEFAULT_THEME = { backgroundColor: '#ffffff', fontColor: '#111827', buttonBackgroundColor: '#4f46e5', primaryText: '#ffffff',
    surface: '#f8fafc', border: '#e2e8f0', mutedText: '#475569', borderRadius: 14, font: 'Inter', contentAlign: 'center', logoUrl: '' };

  return { toHTML: toHTML, DEFAULT_THEME: DEFAULT_THEME, esc: esc, cleanHTML: cleanHTML, LABELS: LABELS, FORM_FIELDS: FORM_FIELDS };
})();
