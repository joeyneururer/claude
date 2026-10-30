// Funnelkit: a small Perspective-style funnel builder.
// State lives in localStorage; the published funnel talks to us only through SDK events.

var $ = function (s, r) { return (r || document).querySelector(s); };
var esc = PF.esc;
function oid() { var h = Math.floor(Date.now() / 1000).toString(16); while (h.length < 24) h += Math.floor(Math.random() * 16).toString(16); return h; }
function uuid() { return crypto.randomUUID ? crypto.randomUUID() : oid(); }
function slug(s) { return String(s).toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'q_' + oid().slice(-6); }

// ---------- store ----------
var KEY = 'funnelkit_v1';
var db = load();
function load() { try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.funnels) return d; } catch (e) {} return seed(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Speichern fehlgeschlagen: ' + e.message); } }
function funnel(id) { return db.funnels.find(function (f) { return f.id === id; }); }
function brand(id) { return db.brands.find(function (b) { return b.id === id; }); }

function seed() {
  var brandId = oid(), fid = oid();
  var p = function (name, role, blocks) { return { id: oid(), name: name, role: role, blocks: blocks }; };
  var n = 0, bid = function () { return 'b' + (++n) + oid().slice(-5); };
  var choice = function (q, title, opts, target, layout) { return { id: bid(), type: 'choice', questionId: q, title: title, layout: layout || 'list', style: {},
    options: opts.map(function (o) { return { label: o[0], icon: o[1] || '', target: target, points: '' }; }) }; };
  return {
    workspaces: [{ id: oid(), name: 'Mein Workspace' }],
    brands: [{ id: brandId, name: 'Küchenstudio Demo', backgroundColor: '#faf7f2', fontColor: '#1f2937', buttonBackgroundColor: '#b45309', primaryText: '#ffffff',
      surface: '#ffffff', border: '#e7e1d8', mutedText: '#57534e', borderRadius: 16, font: 'Inter', contentAlign: 'center', logoUrl: '' }],
    funnels: [{
      id: fid, name: 'Küchen-Quiz', status: 'draft', brandId: brandId, version: 1, createdAt: new Date().toISOString(),
      settings: { progress: true, back: true, title: 'Traumküche in 60 Sekunden', description: '' },
      statuses: ['New', 'Kontaktiert', 'Qualifizierter Interessent', 'Termin', 'Verloren'],
      pages: [
        p('Start', 'home', [
          { id: bid(), type: 'badge', text: '60 Sekunden · kostenlos', style: {} },
          { id: bid(), type: 'heading', level: 1, html: 'Finde in 60 Sekunden deine <span style="color:#b45309">Traumküche</span>', style: {} },
          { id: bid(), type: 'text', html: 'Beantworte 4 kurze Fragen und erhalte ein unverbindliches Angebot von unseren Planern.', style: {} },
          { id: bid(), type: 'button', label: 'Jetzt starten', target: 'Stil', variant: 'primary', url: '', style: {} },
          { id: bid(), type: 'list', icon: 'check', items: ['Persönliche 3D-Planung', 'Festpreis ohne versteckte Kosten', 'Montage durch eigene Schreiner'], style: { space: 'm' } },
          { id: bid(), type: 'testimonial', quote: 'Von der Planung bis zur Montage lief alles reibungslos. Unsere Küche ist ein Traum!', name: 'Familie Berger', role: 'Kunden aus Leipzig', rating: 5, avatar: '', style: {} }]),
        p('Stil', 'page', [choice('stil', 'Welcher Stil gefällt dir?', [['Modern', '✨'], ['Landhaus', '🌾'], ['Industrial', '🏭'], ['Skandinavisch', '🌲']], 'Wünsche', 'grid')]),
        p('Wünsche', 'page', [{ id: bid(), type: 'multi', title: 'Was ist dir besonders wichtig?', questionId: 'wuensche', layout: 'list', min: 1, buttonLabel: 'Weiter', target: 'Budget', style: {},
          options: [{ label: 'Viel Stauraum', icon: '🗄️' }, { label: 'Kochinsel', icon: '🏝️' }, { label: 'Hochwertige Geräte', icon: '🔥' }, { label: 'Pflegeleichte Oberflächen', icon: '🧽' }] }]),
        p('Budget', 'page', [choice('budget', 'Welches Budget planst du?', [['bis 8.000 €'], ['8.000 – 12.000 €'], ['12.000 – 20.000 €'], ['über 20.000 €']], 'Zeitraum')]),
        p('Zeitraum', 'page', [choice('zeitraum', 'Wann soll die Küche kommen?', [['In 1–3 Monaten', '🚀'], ['In 3–6 Monaten', '📅'], ['Später', '⏳']], 'Kontakt')]),
        p('Kontakt', 'page', [
          { id: bid(), type: 'heading', level: 2, html: 'Fast geschafft! Wohin dürfen wir dein Angebot schicken?', style: {} },
          { id: bid(), type: 'form', fields: { firstName: true, lastName: false, email: true, phone: true, company: false, message: false }, required: { phone: false },
            consent: 'Ich stimme der Datenschutzerklärung zu.', submitLabel: 'Angebot anfordern', note: '100 % kostenlos und unverbindlich.', target: 'Danke', style: {} },
          { id: bid(), type: 'faq', items: [{ q: 'Was kostet die Planung?', a: 'Die Erstplanung ist kostenlos und unverbindlich.' }, { q: 'Wie schnell meldet ihr euch?', a: 'Innerhalb von 24 Stunden an Werktagen.' }], style: { space: 'm' } }]),
        p('Danke', 'result', [
          { id: bid(), type: 'heading', level: 1, html: 'Danke! Wir melden uns innerhalb von 24 Stunden.', style: {} },
          { id: bid(), type: 'text', html: 'Schau in dein Postfach: die Bestätigung ist unterwegs.', style: {} },
          { id: bid(), type: 'features', items: [{ icon: '📞', title: 'Rückruf', text: 'Ein Planer ruft dich an.' }, { icon: '📐', title: '3D-Entwurf', text: 'Du bekommst deinen Entwurf.' }], style: {} }])
      ],
      sequences: [{
        id: oid(), name: 'Bestätigung an Lead', published: true, version: 1,
        steps: [
          { id: uuid(), type: 'status', status: 'New' },
          { id: uuid(), type: 'filter', filter: { type: 'group', operator: 'AND', conditions: [{ type: 'condition', fieldName: 'email', operator: 'HAS_VALUE', value: '' }] } },
          { id: uuid(), type: 'delay', delay: { days: 0, hours: 0, minutes: 0, seconds: 5 } },
          { id: uuid(), type: 'email', name: 'Bestätigung', subject: '✅ Anfrage erhalten, {{firstName|hallo}}!',
            body: 'Hallo {{firstName|du}},\n\ndanke für deine Anfrage. Stil: {{stil|-}}, Budget: {{budget|-}}.\nWir melden uns in Kürze.' }]
      }],
      contacts: [], events: [], messages: [], chat: []
    }]
  };
}

function pick(o, keys) { var r = {}; keys.forEach(function (k) { if (o[k]) r[k] = o[k]; }); return r; }

// ---------- event ingestion (the "api.perspective.co" side) ----------
window.addEventListener('message', function (e) { if (e.data && e.data.pf) ingest(e.data.evt); });

function ingest(evt) {
  var f = funnel(evt.funnelId); if (!f) return;
  f.events.push(evt);
  if (evt.type === 'submit') createContact(f, evt);
  save();
  if (route.view === 'analytics' || route.view === 'contacts') render();
}

function createContact(f, evt) {
  var c = evt.contact || {};
  var sessionEvents = f.events.filter(function (e) { return e.sessionId === evt.sessionId; });
  var first = sessionEvents[0];
  var contact = {
    id: oid(), email: c.email || '', firstName: c.firstName || '', phone: c.phone || '', status: f.statuses[0],
    utmParams: evt.utmParams || {}, properties: Object.assign({}, evt.answers, c.consent !== undefined ? { consent: c.consent } : {}, pick(c, ['lastName', 'company', 'message'])),
    meta: { ps_source: 'funnel', ps_first_seen_at: evt.firstSeen || (first && first.ts), ps_converted_at: evt.ts,
      ps_start_page: first && first.page, ps_sessionId: evt.sessionId, simulated: !!evt.simulated }
  };
  f.contacts.unshift(contact);
  onStatus(f, contact);
}

// ---------- automations: status → filter → delay → message ----------
function onStatus(f, contact) {
  f.sequences.filter(function (s) { return s.published; }).forEach(function (s) {
    var trig = s.steps.find(function (x) { return x.type === 'status'; });
    if (!trig || trig.status !== contact.status) return;
    var at = Date.now(), ok = true;
    s.steps.forEach(function (st) {
      if (!ok) return;
      if (st.type === 'filter') ok = evalFilter(st.filter, contact);
      else if (st.type === 'delay') at += ((st.delay.days * 24 + st.delay.hours) * 60 + st.delay.minutes) * 60000 + st.delay.seconds * 1000;
      else if (st.type === 'email') f.messages.push({ id: oid(), sequenceId: s.id, stepId: st.id, contactId: contact.id, to: contact.email,
        subject: fill(st.subject, contact), body: fill(st.body, contact), dueAt: at, status: 'scheduled', log: [{ s: 'scheduled', t: Date.now() }] });
    });
  });
}
function field(contact, name) {
  if (name in contact && typeof contact[name] !== 'object') return contact[name];
  if (contact.properties && name in contact.properties) return contact.properties[name];
  if (contact.utmParams && name in contact.utmParams) return contact.utmParams[name];
  return '';
}
function evalFilter(g, contact) {
  if (!g || !g.conditions || !g.conditions.length) return true;
  var res = g.conditions.map(function (c) {
    if (c.type === 'group') return evalFilter(c, contact);
    var v = String(field(contact, c.fieldName) || '');
    switch (c.operator) {
      case 'HAS_VALUE': return v !== '';
      case 'HAS_NO_VALUE': return v === '';
      case 'EQUALS': return v === c.value;
      case 'NOT_EQUALS': return v !== c.value;
      case 'CONTAINS': return v.toLowerCase().indexOf(String(c.value).toLowerCase()) > -1;
    }
    return true;
  });
  return g.operator === 'OR' ? res.some(Boolean) : res.every(Boolean);
}
function fill(tpl, contact) {
  return String(tpl || '').replace(/\{\{\s*([\w.]+)\s*(?:\|([^}]*))?\}\}/g, function (_, k, d) { var v = field(contact, k); return v !== '' ? v : (d || ''); });
}
// Scheduler: no real mail server, so "sent" means it lands in the outbox log.
setInterval(function () {
  var changed = false;
  db.funnels.forEach(function (f) { f.messages.forEach(function (m) {
    if (m.status === 'scheduled' && m.dueAt <= Date.now()) { m.status = 'sent'; m.log.push({ s: 'sent', t: Date.now() }); changed = true; }
  }); });
  if (changed) { save(); if (route.view === 'automations' || route.view === 'contacts') render(); }
}, 1000);

// ---------- analytics ----------
function analytics(f, days) {
  var since = Date.now() - days * 864e5;
  var ev = f.events.filter(function (e) { return Date.parse(e.ts) >= since; });
  var sessions = {}, viewers = {}, clicks = {}, devices = {}, utm = {};
  ev.forEach(function (e) {
    sessions[e.sessionId] = sessions[e.sessionId] || { submit: false, complete: false, first: e.ts };
    if (e.type === 'pageView') { (viewers[e.page] = viewers[e.page] || {})[e.sessionId] = 1; devices[e.sessionId] = e.device; }
    if (e.type === 'click') clicks[e.trackingId] = (clicks[e.trackingId] || 0) + 1;
    if (e.type === 'submit') { sessions[e.sessionId].submit = true; var src = (e.utmParams && e.utmParams.utm_source) || '(direkt)'; utm[src] = (utm[src] || 0) + 1; }
    if (e.type === 'complete') sessions[e.sessionId].complete = true;
  });
  var ids = Object.keys(sessions), n = ids.length;
  var pages = f.pages.map(function (p) { return { name: p.name, value: Object.keys(viewers[p.name] || {}).length }; });
  pages.forEach(function (p, i) { var next = pages[i + 1]; p.rel = next && p.value ? Math.round(next.value / p.value * 100) : null; });
  var dev = {}; Object.keys(devices).forEach(function (k) { dev[devices[k]] = (dev[devices[k]] || 0) + 1; });
  return {
    sessions: n, contacts: ids.filter(function (k) { return sessions[k].submit; }).length,
    completion: n ? Math.round(ids.filter(function (k) { return sessions[k].complete; }).length / n * 1000) / 10 : 0,
    pages: pages, clicks: clicks, devices: dev, utm: utm
  };
}

// Synthetic traffic so the analytics view has something to show. Marked simulated.
function simulate(f, count) {
  var names = ['Anna', 'Ben', 'Clara', 'David', 'Eva', 'Felix', 'Greta', 'Hanna'];
  var sources = ['meta', 'google', 'newsletter', ''];
  for (var i = 0; i < count; i++) {
    var sid = 'sim' + oid().slice(-10), t = Date.now() - Math.random() * 14 * 864e5, page = f.pages.find(function (p) { return p.role === 'home'; }) || f.pages[0];
    var answers = {}, src = sources[i % sources.length], device = Math.random() < .7 ? 'mobile' : 'desktop';
    var push = function (type, extra) { t += 4000 + Math.random() * 20000; f.events.push(Object.assign({ type: type, funnelId: f.id, sessionId: sid, page: page.name, ts: new Date(t).toISOString(), device: device, simulated: true }, extra)); };
    var guard = 0;
    while (page && guard++ < 30) {
      push('pageView');
      if (page.role === 'result') { push('complete'); break; }
      if (Math.random() < (page.role === 'home' ? .45 : .12)) break; // drop-off
      var b = page.blocks.find(function (x) { return ['choice', 'multi', 'button', 'form', 'input'].indexOf(x.type) > -1 && !x.url; });
      if (!b) break;
      var target;
      if (b.type === 'choice') { var oi = Math.floor(Math.random() * b.options.length), o = b.options[oi]; answers[b.questionId] = o.label; push('click', { trackingId: b.id + '_' + oi }); push('answer', { questionId: b.questionId, value: o.label }); target = o.target; }
      else if (b.type === 'multi') { var picked = b.options.filter(function () { return Math.random() < .5; }).map(function (o) { return o.label; }); if (!picked.length) picked = [b.options[0].label];
        answers[b.questionId] = picked.join('; '); push('click', { trackingId: b.id }); push('answer', { questionId: b.questionId, value: answers[b.questionId] }); target = b.target; }
      else if (b.type === 'form') {
        var nm = names[Math.floor(Math.random() * names.length)];
        push('submit', { contact: { firstName: nm, email: nm.toLowerCase() + '@example.com' }, answers: Object.assign({}, answers), utmParams: src ? { utm_source: src } : {} });
        createContact(f, f.events[f.events.length - 1]); target = b.target;
      } else { push('click', { trackingId: b.id }); target = b.target; }
      page = f.pages.find(function (p) { return p.name === target; });
    }
  }
  save();
}

// ---------- router ----------
var route = {}, curHash = '';
function go(h) { curHash = h; window.scrollTo(0, 0); render(); }
document.addEventListener('click', function (e) {
  var l = e.target.closest('a[href^="#/"]'); if (!l) return;
  e.preventDefault(); go(l.getAttribute('href'));
});
function parse() {
  var parts = curHash.replace(/^#\/?/, '').split('?')[0].split('/');
  if (parts[0] === 'live') return { view: 'live', id: parts[1] };
  if (parts[0] === 'f') return { view: parts[2] || 'edit', id: parts[1] };
  if (parts[0] === 'brands') return { view: 'brands' };
  if (parts[0] === 'evidence') return { view: 'evidence' };
  return { view: 'funnels' };
}

function toast(msg) { var t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2600); }

function render() {
  route = parse();
  var app = $('#app');
  if (route.view === 'live') { renderLive(); return; }
  document.body.classList.remove('live');
  var f = route.id && funnel(route.id);
  if (f) { document.body.classList.add('studio'); app.innerHTML = viewStudio(f); bindStudio(f); if (route.view !== 'edit') bind(f); return; }
  document.body.classList.remove('studio');
  var nav = '<nav class="side"><a class="logo" href="#/">◆ Funnelkit</a>' +
    '<a href="#/" class="' + (route.view === 'funnels' ? 'on' : '') + '">Funnels</a>' +
    '<a href="#/brands" class="' + (route.view === 'brands' ? 'on' : '') + '">Brands</a>' +
    '<a href="#/evidence" class="' + (route.view === 'evidence' ? 'on' : '') + '">So funktioniert Perspective</a></nav>';
  var body;
  if (route.view === 'brands') body = viewBrands();
  else if (route.view === 'evidence') body = '<article class="doc">' + (window.EVIDENCE_HTML || '<p>Siehe EVIDENCE.md im Repository.</p>') + '</article>';
  else body = viewFunnels();
  app.innerHTML = nav + '<div class="main">' + body + '</div>';
  bind(f);
}

// ---------- views ----------
function viewFunnels() {
  var aiBox = '<form class="ai-create" id="ai-create"><label for="ai-desc"><strong>✦ Funnel mit KI erstellen</strong><span class="muted small">Beschreibe Angebot, Zielgruppe und Ziel. Die KI baut alle Seiten, Fragen und das Formular.</span></label>' +
    '<div class="row"><input id="ai-desc" placeholder="z. B. Lead-Funnel für einen Implantologie-Kurs für Zahnärzte, Ziel: Beratungsgespräch"' + (AI.sample ? '' : ' disabled') + '>' +
    '<button class="btn primary" type="submit"' + (AI.sample ? '' : ' disabled') + '>Erstellen</button></div>' +
    (AI.sample === null ? '<span class="muted small">Funktioniert in der veröffentlichten Version auf claude.ai.</span>' : '') + '</form>';
  return '<header class="top"><h1>Funnels</h1><button class="btn primary" data-act="new-funnel">+ Neuer Funnel</button></header>' + aiBox +
    '<div class="grid">' + db.funnels.map(function (f) {
      migrate(f);
      var a = analytics(f, 30);
      return '<a class="fcard" href="#/f/' + f.id + '/edit"><div class="fcard-top"><strong>' + esc(f.name) + '</strong><span class="pill ' + f.status + '">' + f.status + '</span></div>' +
        '<div class="muted small">' + f.pages.length + ' Seiten · ' + f.contacts.length + ' Kontakte · ' + a.sessions + ' Sessions (30 T.)</div></a>';
    }).join('') + '</div>';
}

function viewContacts(f) {
  var props = {};
  f.contacts.forEach(function (c) { Object.keys(c.properties).forEach(function (k) { props[k] = 1; }); });
  var cols = Object.keys(props);
  if (!f.contacts.length) return '<div class="empty">Noch keine Kontakte. Füll das Formular in der Vorschau aus oder simuliere Traffic in Analytics.</div>';
  return '<div class="table-wrap"><table><thead><tr><th>Erstellt</th><th>Name</th><th>E-Mail</th><th>Telefon</th><th>Status</th><th>Quelle</th>' +
    cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '<th>Nachrichten</th></tr></thead><tbody>' +
    f.contacts.map(function (c) {
      var msgs = f.messages.filter(function (m) { return m.contactId === c.id; });
      return '<tr><td class="nowrap">' + new Date(c.meta.ps_converted_at).toLocaleString('de-DE') + (c.meta.simulated ? ' <span class="tag">sim</span>' : '') + '</td><td>' + esc(c.firstName) + '</td><td>' + esc(c.email) + '</td><td>' + esc(c.phone) + '</td>' +
        '<td><select data-status="' + c.id + '">' + f.statuses.map(function (s) { return '<option' + (s === c.status ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></td>' +
        '<td>' + esc(c.utmParams.utm_source || '–') + '</td>' + cols.map(function (k) { return '<td>' + esc(c.properties[k] == null ? '' : c.properties[k]) + '</td>'; }).join('') +
        '<td>' + msgs.map(function (m) { return '<span class="pill ' + m.status + '" title="' + esc(m.subject) + '">' + m.status + '</span>'; }).join(' ') + '</td></tr>';
    }).join('') + '</tbody></table></div><p class="muted small">Status ändern löst Automationen mit diesem Status-Trigger aus. Status-Liste: ' +
    '<input class="inline" data-act="statuses" value="' + esc(f.statuses.join(', ')) + '"></p>';
}

function fieldNames(f) {
  var s = { firstName: 1, email: 1, phone: 1, utm_source: 1 };
  f.pages.forEach(function (p) { p.blocks.forEach(function (b) { if (b.questionId) s[b.questionId] = 1; if (b.type === 'form') ['lastName', 'company', 'message'].forEach(function (k) { if (b.fields[k]) s[k] = 1; }); }); });
  return Object.keys(s);
}

function viewAutomations(f) {
  var fields = fieldNames(f);
  var seqs = f.sequences.map(function (s, si) {
    var steps = s.steps.map(function (st, ti) {
      var body = '';
      if (st.type === 'status') body = '<label class="fld"><span>Auslöser: Kontakt erhält Status</span><select data-st="status">' + f.statuses.map(function (x) { return '<option' + (x === st.status ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></label>';
      if (st.type === 'filter') body = '<div class="row"><span class="small">Filter</span><select data-st="op">' + ['AND', 'OR'].map(function (o) { return '<option' + (o === st.filter.operator ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>' +
        st.filter.conditions.map(function (c, ci) {
          return '<div class="row opt-row" data-ci="' + ci + '"><select data-c="fieldName">' + fields.map(function (x) { return '<option' + (x === c.fieldName ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
            '<select data-c="operator">' + ['HAS_VALUE', 'HAS_NO_VALUE', 'EQUALS', 'NOT_EQUALS', 'CONTAINS'].map(function (x) { return '<option' + (x === c.operator ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
            '<input data-c="value" value="' + esc(c.value || '') + '" placeholder="Wert"><button class="icon danger" data-act="del-cond" data-ci="' + ci + '" title="Bedingung löschen">✕</button></div>';
        }).join('') + '<button class="btn ghost sm" data-act="add-cond">+ Bedingung</button>';
      if (st.type === 'delay') body = '<div class="row">' + ['days', 'hours', 'minutes', 'seconds'].map(function (k) { return '<label class="fld"><span>' + k + '</span><input type="number" min="0" data-d="' + k + '" value="' + st.delay[k] + '"></label>'; }).join('') + '</div>';
      if (st.type === 'email') body = '<label class="fld"><span>Betreff</span><input data-st="subject" value="' + esc(st.subject) + '"></label><label class="fld"><span>Text: Platzhalter {{feld|standard}}</span><textarea rows="4" data-st="body">' + esc(st.body) + '</textarea></label>';
      return '<div class="step" data-ti="' + ti + '"><div class="step-n">' + (ti + 1) + '</div><div class="grow"><div class="block-h"><span class="tag">' + st.type + '</span>' +
        (st.type !== 'status' ? '<button class="icon danger" data-act="del-step" title="Schritt löschen">✕</button>' : '') + '</div>' + body + '</div></div>';
    }).join('');
    var sent = f.messages.filter(function (m) { return m.sequenceId === s.id; });
    return '<div class="panel seq" data-si="' + si + '"><div class="panel-h row between"><input class="inline strong" data-seq="name" value="' + esc(s.name) + '">' +
      '<span class="row"><label class="small"><input type="checkbox" data-seq="published"' + (s.published ? ' checked' : '') + '> aktiv</label><button class="icon danger" data-act="del-seq" title="Automation löschen">✕</button></span></div>' +
      steps + '<div class="add-row">' + ['filter', 'delay', 'email'].map(function (t) { return '<button class="btn ghost sm" data-act="add-step" data-t="' + t + '">+ ' + t + '</button>'; }).join('') + '</div>' +
      (sent.length ? '<details><summary class="small">' + sent.length + ' Nachrichten</summary><ul class="log">' + sent.slice(-20).reverse().map(function (m) {
        return '<li><span class="pill ' + m.status + '">' + m.status + '</span> ' + esc(m.to) + ': <em>' + esc(m.subject) + '</em><pre>' + esc(m.body) + '</pre></li>'; }).join('') + '</ul></details>' : '') + '</div>';
  }).join('');
  return '<div class="row between"><p class="muted">Ablauf wie bei Perspective: <b>Status-Trigger → Filter → Verzögerung → Nachricht</b>. Mails werden nicht wirklich versendet, sondern im Log abgelegt.</p>' +
    '<button class="btn primary" data-act="add-seq">+ Automation</button></div>' + seqs;
}

function viewAnalytics(f) {
  var days = analyticsDays, a = analytics(f, days);
  var max = Math.max.apply(null, a.pages.map(function (p) { return p.value; }).concat(1));
  var kpi = function (label, v) { return '<div class="kpi"><div class="muted small">' + label + '</div><div class="kpi-v">' + v + '</div></div>'; };
  var bars = function (obj) { var k = Object.keys(obj), m = Math.max.apply(null, k.map(function (x) { return obj[x]; }).concat(1));
    return k.length ? k.sort(function (x, y) { return obj[y] - obj[x]; }).map(function (x) { return '<div class="hbar"><span>' + esc(x) + '</span><div><i style="width:' + (obj[x] / m * 100) + '%"></i></div><b>' + obj[x] + '</b></div>'; }).join('') : '<p class="muted small">Keine Daten</p>'; };
  var labels = {}; f.pages.forEach(function (p) { p.blocks.forEach(function (b) { if (b.label) labels[b.id] = b.label; if (b.submitLabel) labels[b.id] = b.submitLabel; if (b.title) labels[b.id] = b.title; (b.options || []).forEach(function (o, i) { labels[b.id + '_' + i] = o.label; }); }); });
  var clicks = {}; Object.keys(a.clicks).forEach(function (k) { clicks[labels[k] || k] = a.clicks[k]; });
  return '<div class="row between"><div class="row">' + [7, 30, 90].map(function (d) { return '<button class="btn sm' + (d === days ? ' primary' : '') + '" data-act="days" data-d="' + d + '">' + d + ' Tage</button>'; }).join('') + '</div>' +
    '<div class="row"><button class="btn sm" data-act="simulate">50 Besucher simulieren</button><button class="btn sm danger" data-act="reset-data">Daten zurücksetzen</button></div></div>' +
    '<div class="kpis">' + kpi('Sessions', a.sessions) + kpi('Neue Kontakte', a.contacts) + kpi('Conversion-Rate', (a.sessions ? Math.round(a.contacts / a.sessions * 1000) / 10 : 0) + ' %') + kpi('Completion-Rate', a.completion + ' %') + '</div>' +
    '<div class="panel"><div class="panel-h">Seite-zu-Seite-Conversion</div><div class="funnel-chart">' + a.pages.map(function (p) {
      return '<div class="fc-col"><div class="fc-bar"><i style="height:' + (p.value / max * 100) + '%"></i></div><b>' + p.value + '</b><span class="small">' + esc(p.name) + '</span>' +
        (p.rel != null ? '<span class="fc-rel">→ ' + p.rel + ' %</span>' : '') + '</div>'; }).join('') + '</div></div>' +
    '<div class="cols3"><div class="panel"><div class="panel-h">Button-Klicks</div>' + bars(clicks) + '</div><div class="panel"><div class="panel-h">Geräte</div>' + bars(a.devices) + '</div><div class="panel"><div class="panel-h">Top UTM-Quellen (Kontakte)</div>' + bars(a.utm) + '</div></div>';
}

function viewBrands() {
  var keys = [['backgroundColor', 'Hintergrund', 'color'], ['fontColor', 'Text', 'color'], ['buttonBackgroundColor', 'Button', 'color'], ['primaryText', 'Button-Text', 'color'],
    ['surface', 'Karten', 'color'], ['border', 'Rahmen', 'color'], ['mutedText', 'Nebentext', 'color'], ['borderRadius', 'Radius (px)', 'number'], ['font', 'Schrift', 'text'], ['logoUrl', 'Logo-URL', 'text']];
  return '<header class="top"><h1>Brands</h1><button class="btn primary" data-act="add-brand">+ Brand</button></header>' +
    '<p class="muted">Design-Tokens, die beim Veröffentlichen in jeden Funnel injiziert werden (gleiche Feldnamen wie Perspective).</p>' +
    db.brands.map(function (b, bi) {
      return '<div class="panel" data-bi="' + bi + '"><div class="panel-h"><input class="inline strong" data-br="name" value="' + esc(b.name) + '"></div><div class="brand-grid">' +
        keys.map(function (k) { return '<label class="fld"><span>' + k[1] + '</span><input type="' + k[2] + '" data-br="' + k[0] + '" value="' + esc(b[k[0]]) + '"></label>'; }).join('') +
        '<label class="fld"><span>Ausrichtung</span><select data-br="contentAlign">' + ['center', 'left'].map(function (x) { return '<option' + (x === b.contentAlign ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label></div>' +
        '<div class="swatches">' + ['backgroundColor', 'surface', 'buttonBackgroundColor', 'fontColor'].map(function (k) { return '<i style="background:' + esc(b[k]) + '"></i>'; }).join('') + '</div></div>';
    }).join('');
}

function renderLive() {
  var f = funnel(route.id);
  document.body.classList.add('live');
  if (!f) { $('#app').innerHTML = '<div class="empty">Funnel nicht gefunden.</div>'; return; }
  $('#app').innerHTML = '<iframe id="live" title="' + esc(f.name) + '"></iframe><a class="btn live-close" href="#/f/' + f.id + '/edit">← Zurück zum Editor</a>';
  // Pass the page's own query (utm params) through to the funnel.
  var q = curHash.split('?')[1] || '';
  var html = PF.toHTML(f, brand(f.brandId)).replace('new URLSearchParams(location.search)', 'new URLSearchParams(' + JSON.stringify(q) + ')');
  $('#live').srcdoc = html;
}

// ---------- interactions ----------
function bind(f) {
  var main = $('.main');
  if (!main) return;
  var aiForm = $('#ai-create');
  if (aiForm) aiForm.onsubmit = function (e) { e.preventDefault(); var d = $('#ai-desc').value.trim(); if (d) createWithAI(d); else $('#ai-desc').focus(); };

  main.onclick = function (e) {
    var a = e.target.closest('[data-act]'); if (!a) return;
    var act = a.dataset.act;
    var sEl = a.closest('.seq'), seq = sEl && f.sequences[+sEl.dataset.si];
    var stEl = a.closest('.step'), step = stEl && seq.steps[+stEl.dataset.ti];
    switch (act) {
      case 'new-funnel':
        var nf = JSON.parse(JSON.stringify(seed().funnels[0])); nf.id = oid(); nf.name = 'Neuer Funnel'; nf.brandId = db.brands[0] && db.brands[0].id;
        db.funnels.unshift(nf); save(); go('#/f/' + nf.id + '/edit'); return;
      case 'export': showExport(f); return;
      case 'add-seq': f.sequences.push({ id: oid(), name: 'Neue Automation', published: false, version: 1, steps: [{ id: uuid(), type: 'status', status: f.statuses[0] }] }); break;
      case 'del-seq': if (!armed(a)) return; f.sequences.splice(+sEl.dataset.si, 1); break;
      case 'add-step': seq.steps.push(a.dataset.t === 'filter' ? { id: uuid(), type: 'filter', filter: { type: 'group', operator: 'AND', conditions: [] } }
        : a.dataset.t === 'delay' ? { id: uuid(), type: 'delay', delay: { days: 0, hours: 0, minutes: 0, seconds: 0 } }
        : { id: uuid(), type: 'email', name: 'E-Mail', subject: 'Hallo {{firstName|}}', body: '' }); break;
      case 'del-step': seq.steps.splice(+stEl.dataset.ti, 1); break;
      case 'add-cond': step.filter.conditions.push({ type: 'condition', fieldName: 'email', operator: 'HAS_VALUE', value: '' }); break;
      case 'del-cond': step.filter.conditions.splice(+a.dataset.ci, 1); break;
      case 'days': analyticsDays = +a.dataset.d; break;
      case 'simulate': simulate(f, 50); toast('50 simulierte Besucher erzeugt'); break;
      case 'reset-data': if (!armed(a)) return; f.events = []; f.contacts = []; f.messages = []; break;
      case 'add-brand': db.brands.push(Object.assign({ id: oid(), name: 'Neue Brand' }, PF.DEFAULT_THEME)); break;
      default: return;
    }
    save(); render();
  };

  main.onchange = function (e) {
    var t = e.target;
    var sEl = t.closest('.seq'), seq = sEl && f.sequences[+sEl.dataset.si];
    var stEl = t.closest('.step'), step = stEl && seq.steps[+stEl.dataset.ti];
    var brEl = t.closest('[data-bi]');
    if (t.dataset.status) { var c = f.contacts.find(function (x) { return x.id === t.dataset.status; }); c.status = t.value; c.meta.ps_user_edited_at = new Date().toISOString(); onStatus(f, c); toast('Status: ' + t.value); }
    else if (t.dataset.act === 'statuses') f.statuses = t.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    else if (t.dataset.seq) seq[t.dataset.seq] = t.type === 'checkbox' ? t.checked : t.value;
    else if (t.dataset.st && step) { if (t.dataset.st === 'op') step.filter.operator = t.value; else step[t.dataset.st] = t.value; }
    else if (t.dataset.c && step) step.filter.conditions[+t.closest('[data-ci]').dataset.ci][t.dataset.c] = t.value;
    else if (t.dataset.d && step) step.delay[t.dataset.d] = Math.max(0, +t.value || 0);
    else if (t.dataset.br && brEl) { var br = db.brands[+brEl.dataset.bi]; br[t.dataset.br] = t.type === 'number' ? +t.value : t.value; }
    else return;
    if (seq) seq.version++;
    save(); render();
  };

}

function renamePage(f, from, to) {
  f.pages.forEach(function (p) {
    if (p.name === from) p.name = to;
    p.blocks.forEach(function (b) { if (b.target === from) b.target = to; (b.options || []).forEach(function (o) { if (o.target === from) o.target = to; }); });
  });
}
function move(arr, i, d) { var j = i + d; if (j < 0 || j >= arr.length) return; var x = arr[i]; arr[i] = arr[j]; arr[j] = x; }
var analyticsDays = 30;
// Destructive buttons need a second click (the artifact viewer has no confirm()).
function armed(btn) {
  if (btn.dataset.armed) return true;
  btn.dataset.armed = '1'; btn.dataset.label = btn.textContent; btn.textContent = 'Nochmal klicken'; btn.classList.add('armed');
  setTimeout(function () { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = btn.dataset.label; btn.classList.remove('armed'); } }, 2500);
  return false;
}
function showExport(f) {
  var m = $('#modal');
  m.innerHTML = '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="exp-h"><div class="row between"><strong id="exp-h">Veröffentlichtes HTML</strong>' +
    '<button class="icon" data-act="close-modal" title="Schließen">✕</button></div><p class="muted small">Eine eigenständige Datei: Seiten, Styles und Tracking-SDK. Kopieren und als .html speichern.</p>' +
    '<textarea id="export-html" readonly rows="14"></textarea><div class="row"><button class="btn primary" data-act="copy-html">Kopieren</button></div></div>';
  $('#export-html').value = PF.toHTML(f, brand(f.brandId));
  m.hidden = false;
}
function copyExport(btn) {
  var t = $('#export-html');
  var done = function () { btn.textContent = 'Kopiert'; };
  try { navigator.clipboard.writeText(t.value).then(done, function () { t.select(); toast('Text markiert: mit Strg/Cmd+C kopieren'); }); }
  catch (e) { t.select(); toast('Text markiert: mit Strg/Cmd+C kopieren'); }
}

document.addEventListener('click', function (e) {
  var a = e.target.closest('#modal [data-act]'); if (!a) return;
  if (a.dataset.act === 'close-modal') $('#modal').hidden = true;
  if (a.dataset.act === 'copy-html') copyExport(a);
});
render();
