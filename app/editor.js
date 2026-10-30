// Funnel editor, modeled on Perspective's: top bar with tabs, left panel
// (Übersicht / AI Chat), canvas with click-to-edit and a bottom toolbar,
// inspector on the right. Every change goes through mutate() so undo works.

var ed = { fid: null, page: 0, sel: null, tab: 'overview', mode: 'edit', device: 'mobile', scroll: 0,
  palette: false, undo: [], redo: [], draft: '', busy: false, ctl: null, pending: null, autoSend: null };

// ---------- block defaults & normalization ----------
var BLOCK_GROUPS = [
  ['Inhalt', ['heading', 'text', 'badge', 'image', 'list', 'features', 'divider', 'spacer']],
  ['Fragen', ['choice', 'multi', 'input', 'form', 'score']],
  ['Vertrauen & Aktion', ['testimonial', 'faq', 'button']]
];
var BLOCK_ICONS = { heading: 'H', text: '¶', badge: '◉', image: '▣', list: '☰', features: '▦', divider: '—', spacer: '↕', choice: '◎',
  multi: '☑', input: '⌨', form: '✉', score: '◔', testimonial: '❝', faq: '?', button: '▭' };

function newBlock(t, f, pageIndex) {
  var id = uuid().slice(0, 8);
  var pi = pageIndex == null ? ed.page : pageIndex;
  var next = f && f.pages[pi + 1] ? f.pages[pi + 1].name : '';
  var d = {
    heading: { html: 'Neue Überschrift', level: 2 },
    text: { html: 'Erzähle hier in ein, zwei Sätzen, worum es geht.' },
    badge: { text: '60 Sekunden · kostenlos' },
    image: { url: '', alt: '' },
    button: { label: 'Weiter', target: next, variant: 'primary', url: '' },
    choice: { title: 'Neue Frage', questionId: 'q_' + id, layout: 'list', options: [{ label: 'Ja', icon: '', target: next, points: '' }, { label: 'Nein', icon: '', target: next, points: '' }] },
    multi: { title: 'Was ist dir wichtig?', questionId: 'q_' + id, layout: 'list', min: 1, buttonLabel: 'Weiter', target: next,
      options: [{ label: 'Option A', icon: '' }, { label: 'Option B', icon: '' }, { label: 'Option C', icon: '' }] },
    input: { title: 'Deine Antwort', questionId: 'q_' + id, inputType: 'text', placeholder: '', required: true, buttonLabel: 'Weiter', target: next },
    form: { fields: { firstName: true, lastName: false, email: true, phone: false, company: false, message: false }, required: {},
      consent: 'Ich stimme der Datenschutzerklärung zu.', submitLabel: 'Absenden', note: '', target: next },
    list: { icon: 'check', items: ['Erster Vorteil', 'Zweiter Vorteil', 'Dritter Vorteil'] },
    features: { items: [{ icon: '⚡', title: 'Schnell', text: 'In 60 Sekunden erledigt.' }, { icon: '🎯', title: 'Passgenau', text: 'Auf dich zugeschnitten.' }] },
    faq: { items: [{ q: 'Was kostet das?', a: 'Die Erstberatung ist kostenlos und unverbindlich.' }, { q: 'Wie geht es weiter?', a: 'Wir melden uns innerhalb von 24 Stunden.' }] },
    testimonial: { quote: 'Super Beratung, alles hat perfekt geklappt.', name: 'Maria K.', role: 'Kundin', rating: 5, avatar: '' },
    score: { tiers: [{ min: 0, max: 4, text: 'Da ist noch Luft nach oben.' }, { min: 5, max: 7, text: 'Solide Basis!' }, { min: 8, max: 99, text: 'Hervorragend!' }] },
    divider: {}, spacer: { size: 24 }
  }[t];
  return d ? Object.assign({ id: id, type: t, style: {} }, d) : null;
}

function cloneBlock(b) { var c = JSON.parse(JSON.stringify(b)); c.id = uuid().slice(0, 8); if (c.questionId) c.questionId = c.questionId + '_2'; return c; }

// Accepts pages from storage or from the AI and fills in anything missing.
function normalizePages(pages, f) {
  if (!Array.isArray(pages)) throw new Error('pages fehlt');
  var names = {};
  var out = pages.filter(function (p) { return p && typeof p === 'object'; }).map(function (p, i) {
    var name = String(p.name || 'Seite ' + (i + 1)).trim();
    while (names[name]) name += ' 2';
    names[name] = 1;
    var blocks = (Array.isArray(p.blocks) ? p.blocks : []).map(function (b) {
      if (!b || !PF.LABELS[b.type]) return null;
      var base = newBlock(b.type, null);
      var nb = Object.assign(base, b, { style: Object.assign({}, b.style || {}) });
      if (!nb.id) nb.id = uuid().slice(0, 8);
      if (b.text != null && b.html == null && (b.type === 'heading' || b.type === 'text')) nb.html = PF.esc(b.text);
      if (nb.type === 'heading' || nb.type === 'text') { nb.html = PF.cleanHTML(nb.html); delete nb.text; }
      if (nb.type === 'form') {
        nb.fields = Object.assign({ firstName: false, lastName: false, email: false, phone: false, company: false, message: false }, b.fields || {});
        if (nb.fields.name) { nb.fields.firstName = true; delete nb.fields.name; }
      }
      ['options', 'items', 'tiers'].forEach(function (k) { if (k in base && !Array.isArray(nb[k])) nb[k] = base[k]; });
      return nb;
    }).filter(Boolean);
    return { id: p.id || oid(), name: name, role: ['home', 'page', 'result'].indexOf(p.role) > -1 ? p.role : 'page', blocks: blocks };
  });
  if (!out.length) throw new Error('keine Seiten');
  if (!out.some(function (p) { return p.role === 'home'; })) out[0].role = 'home';
  // Unique block ids across the funnel.
  var seen = {};
  out.forEach(function (p) { p.blocks.forEach(function (b) { if (seen[b.id]) b.id = uuid().slice(0, 8); seen[b.id] = 1; }); });
  return out;
}

function migrate(f) {
  f.settings = Object.assign({ progress: true, back: false, title: '', description: '' }, f.settings || {});
  f.chat = f.chat || [];
  try { f.pages = normalizePages(f.pages, f); } catch (e) { /* keep as is */ }
}

// ---------- history ----------
function snap(f) { return JSON.stringify({ pages: f.pages, settings: f.settings, name: f.name }); }
function restore(f, s) { var o = JSON.parse(s); f.pages = o.pages; f.settings = o.settings; f.name = o.name; }
function commit(f) { ed.undo.push(snap(f)); if (ed.undo.length > 80) ed.undo.shift(); ed.redo = []; }
function undo(f) { if (!ed.undo.length) return toast('Nichts rückgängig zu machen'); ed.redo.push(snap(f)); restore(f, ed.undo.pop()); afterHistory(f); }
function redo(f) { if (!ed.redo.length) return; ed.undo.push(snap(f)); restore(f, ed.redo.pop()); afterHistory(f); }
function afterHistory(f) {
  if (ed.page >= f.pages.length) ed.page = f.pages.length - 1;
  if (ed.sel && !findBlock(f, ed.sel)) ed.sel = null;
  save(); refreshAll(f);
}
function mutate(f, fn, opts) {
  commit(f); fn(); save();
  if (!opts || opts.canvas !== false) refreshCanvas(f);
  refreshPanels(f);
}

function findBlock(f, id) {
  for (var i = 0; i < f.pages.length; i++) {
    var j = f.pages[i].blocks.findIndex(function (b) { return b.id === id; });
    if (j > -1) return { page: f.pages[i], pi: i, i: j, b: f.pages[i].blocks[j] };
  }
  return null;
}
function getPath(o, path) { return path.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
function setPath(o, path, v) {
  var ks = path.split('.'), last = ks.pop();
  var t = ks.reduce(function (a, k) { if (a[k] == null) a[k] = {}; return a[k]; }, o);
  t[last] = v;
}

// ---------- layout ----------
function studioTop(f) {
  var tabs = [['edit', 'Funnel', '▤'], ['analytics', 'Metriken', '▮▮'], ['contacts', 'Kontakte', '◍'], ['automations', 'Automationen', '⚡']];
  return '<header class="st-top"><div class="st-top-l"><a class="st-icon" href="#/" title="Alle Funnels" aria-label="Alle Funnels">⌂</a>' +
    '<input class="st-name" id="st-name" value="' + esc(f.name) + '" aria-label="Funnel-Name"></div>' +
    '<nav class="st-tabs">' + tabs.map(function (t) {
      return '<a href="#/f/' + f.id + '/' + t[0] + '" class="' + (route.view === t[0] ? 'on' : '') + '"><span aria-hidden="true">' + t[2] + '</span>' + t[1] +
        (t[0] === 'contacts' && f.contacts.length ? ' <em>' + f.contacts.length + '</em>' : '') + '</a>';
    }).join('') + '</nav>' +
    '<div class="st-top-r"><a class="st-icon" href="#/live/' + f.id + '?utm_source=demo" title="Live ansehen" aria-label="Live ansehen">◉</a>' +
    '<button class="st-icon" data-ed="settings" title="Einstellungen" aria-label="Einstellungen">⚙</button>' +
    '<span class="pill ' + f.status + '">' + f.status + '</span>' +
    '<button class="btn primary" data-ed="publish">' + (f.status === 'live' ? 'Offline nehmen' : 'Veröffentlichen') + '</button></div></header>';
}

function viewStudio(f) {
  migrate(f);
  if (ed.fid !== f.id) { ed.fid = f.id; ed.page = 0; ed.sel = null; ed.undo = []; ed.redo = []; ed.scroll = 0; }
  if (ed.page >= f.pages.length) ed.page = 0;
  var body;
  if (route.view === 'edit') {
    body = '<div class="st-body"><aside class="st-left" id="st-left"></aside>' +
      '<section class="st-canvas"><div class="st-stage ' + ed.device + '"><iframe id="canvas" title="Funnel-Editor"></iframe></div>' +
      '<div class="st-toolbar" role="toolbar" aria-label="Editor-Werkzeuge">' +
      '<button data-ed="mode" data-v="edit" class="' + (ed.mode === 'edit' ? 'on' : '') + '" title="Auswählen und bearbeiten">➤</button>' +
      '<button data-ed="mode" data-v="preview" class="' + (ed.mode === 'preview' ? 'on' : '') + '" title="Vorschau (klickbar)">◉</button>' +
      '<button data-ed="code" title="HTML ansehen">&lt;/&gt;</button><span class="sep"></span>' +
      '<button data-ed="page-prev" title="Vorherige Seite">‹</button><span class="st-pn" id="st-pn"></span><button data-ed="page-next" title="Nächste Seite">›</button><span class="sep"></span>' +
      '<button data-ed="device" title="Mobil / Desktop">' + (ed.device === 'mobile' ? '▯' : '▭') + '</button>' +
      '<button data-ed="palette" title="Element hinzufügen">＋</button>' +
      '<button data-ed="undo" title="Rückgängig (Strg+Z)">↶</button><button data-ed="redo" title="Wiederholen (Strg+Umschalt+Z)">↷</button></div>' +
      '<div class="st-palette" id="st-palette" hidden></div></section>' +
      '<aside class="st-right" id="st-right"></aside></div>';
  } else {
    var v = route.view === 'contacts' ? viewContacts(f) : route.view === 'automations' ? viewAutomations(f) : viewAnalytics(f);
    body = '<div class="st-page main">' + v + '</div>';
  }
  return studioTop(f) + body;
}

function refreshAll(f) { refreshCanvas(f); refreshPanels(f); }

function refreshCanvas(f, noAnim) {
  var frame = $('#canvas'); if (!frame) return;
  var b = brand(f.brandId);
  frame.srcdoc = ed.mode === 'preview'
    ? PF.toHTML(f, b, { startPage: f.pages[ed.page].name })
    : PF.toHTML(f, b, { edit: { page: ed.page, selected: ed.sel, scroll: ed.scroll, noAnim: noAnim !== false } });
  var pn = $('#st-pn'); if (pn) pn.textContent = (ed.page + 1) + ' / ' + f.pages.length;
}
function selectInCanvas(id) { var fr = $('#canvas'); if (fr && fr.contentWindow) fr.contentWindow.postMessage({ pfSelect: id }, '*'); }

function refreshPanels(f) {
  var l = $('#st-left'), r = $('#st-right'); if (!l) return;
  var keepScroll = l.querySelector('.st-scroll') ? l.querySelector('.st-scroll').scrollTop : 0;
  l.innerHTML = leftPanel(f);
  var sc = l.querySelector('.st-scroll'); if (sc && ed.tab === 'overview') sc.scrollTop = keepScroll;
  r.innerHTML = inspector(f);
  var pn = $('#st-pn'); if (pn) pn.textContent = (ed.page + 1) + ' / ' + f.pages.length;
  var log = $('#chat-log'); if (log) log.scrollTop = log.scrollHeight;
  var ta = $('#chat-input'); if (ta && ed.tab === 'ai' && !ed.busy) ta.focus({ preventScroll: true });
}

// ---------- left panel ----------
function leftPanel(f) {
  return '<div class="st-seg" role="tablist"><button role="tab" data-ed="tab" data-v="overview" aria-selected="' + (ed.tab === 'overview') + '">Übersicht</button>' +
    '<button role="tab" data-ed="tab" data-v="ai" aria-selected="' + (ed.tab === 'ai') + '">✦ AI Chat</button></div>' +
    (ed.tab === 'ai' ? chatPanel(f) : overviewPanel(f));
}

function blockSummary(b) {
  var t = b.html != null ? b.html.replace(/<[^>]+>/g, ' ') : (b.title || b.label || b.text || b.quote || (b.items && b.items[0] && (b.items[0].q || b.items[0].title || b.items[0])) || '');
  return String(t).replace(/\s+/g, ' ').trim().slice(0, 42);
}

function overviewPanel(f) {
  var page = f.pages[ed.page];
  var pages = f.pages.map(function (p, i) {
    return '<li class="st-row' + (i === ed.page ? ' on' : '') + '" draggable="true" data-drag="page" data-i="' + i + '">' +
      '<button class="st-row-main" data-ed="page" data-i="' + i + '"><span class="st-num">' + (i + 1) + '</span><span class="st-row-t">' + esc(p.name) + '</span>' +
      (p.role !== 'page' ? '<span class="tag">' + (p.role === 'home' ? 'Start' : 'Ergebnis') + '</span>' : '') + '</button></li>';
  }).join('');
  var layers = page.blocks.map(function (b, i) {
    return '<li class="st-row' + (b.id === ed.sel ? ' on' : '') + '" draggable="true" data-drag="block" data-i="' + i + '">' +
      '<button class="st-row-main" data-ed="select" data-id="' + esc(b.id) + '"><span class="st-bi">' + BLOCK_ICONS[b.type] + '</span><span class="st-row-t"><b>' + PF.LABELS[b.type] + '</b>' +
      '<span class="muted">' + esc(blockSummary(b)) + '</span></span></button><span class="st-grip" aria-hidden="true">⠿</span></li>';
  }).join('');
  return '<div class="st-scroll">' +
    '<div class="st-sec"><div class="st-sec-h"><span>Seiten</span><span class="row"><button class="btn sm ghost" data-ed="add-page-menu">+ Seite</button></span></div>' +
    '<div id="page-menu" class="st-menu" hidden>' + [['blank', 'Leere Seite'], ['question', 'Frage-Seite'], ['contact', 'Kontakt-Seite'], ['result', 'Danke-/Ergebnis-Seite']].map(function (t) {
      return '<button data-ed="add-page" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
    '<ol class="st-list">' + pages + '</ol></div>' +
    '<div class="st-sec"><div class="st-sec-h"><span>Elemente auf „' + esc(page.name) + '“</span></div>' +
    (layers ? '<ol class="st-list">' + layers + '</ol>' : '<p class="muted small">Noch keine Elemente.</p>') +
    '<p class="muted small st-tip">Ziehen zum Umsortieren · Doppelklick im Canvas bearbeitet Text direkt</p></div>' +
    '<div class="st-sec"><div class="st-sec-h"><span>Element hinzufügen</span></div>' + paletteGrid() + '</div></div>';
}

function paletteGrid() {
  return BLOCK_GROUPS.map(function (g) {
    return '<div class="st-pal-g"><div class="st-pal-h">' + g[0] + '</div><div class="st-pal">' + g[1].map(function (t) {
      return '<button data-ed="add-block" data-t="' + t + '"><span>' + BLOCK_ICONS[t] + '</span>' + PF.LABELS[t] + '</button>'; }).join('') + '</div></div>';
  }).join('');
}

// ---------- AI chat ----------
var AI = { sample: undefined };
(function initAI() {
  if (!window.claude || !window.claude.use) { AI.sample = null; return; }
  window.claude.use('sample').then(function (s) { AI.sample = s; var f = ed.fid && funnel(ed.fid); if (f && $('#st-left')) refreshPanels(f); else if (route.view === 'funnels') render(); maybeAutoSend(); })
    .catch(function () { AI.sample = null; });
})();

var AI_SUGGEST = ['Mach die Überschrift auf Seite 1 kürzer und knackiger', 'Füge vor dem Formular eine FAQ mit 4 Fragen hinzu',
  'Ergänze ein Testimonial auf der Startseite', 'Schreib alle Texte in der Du-Form und etwas emotionaler', 'Füge eine Frage zum Budget mit 4 Antworten hinzu'];

function chatPanel(f) {
  var sb = ed.sel && findBlock(f, ed.sel);
  var msgs = f.chat.map(function (m, i) {
    if (m.role === 'user') return '<div class="msg user">' + esc(m.text) + '</div>';
    return '<div class="msg ai' + (m.error ? ' err' : '') + '">' + (m.summary ? '<div class="msg-done"><span>✓</span>' + esc(m.summary) + '</div>' : '') +
      '<div>' + esc(m.text) + '</div>' + (m.applied && i === f.chat.length - 1 && ed.undo.length ? '<button class="btn sm ghost" data-ed="undo">↶ Änderung rückgängig</button>' : '') + '</div>';
  }).join('');
  var empty = !f.chat.length ? '<div class="chat-empty"><p><strong>Sag der KI, was sie ändern soll.</strong> Sie sieht den ganzen Funnel und das ausgewählte Element und baut die Änderung direkt ein. Jede Änderung lässt sich rückgängig machen.</p>' +
    '<div class="chips">' + AI_SUGGEST.map(function (s) { return '<button class="chip" data-ed="suggest">' + esc(s) + '</button>'; }).join('') + '</div></div>' : '';
  var status = AI.sample === null
    ? '<div class="chat-note">Der KI-Chat läuft über dein Claude-Konto und funktioniert in der veröffentlichten Artifact-Version auf claude.ai. Hier ist er nicht verfügbar.</div>'
    : AI.sample === undefined ? '<div class="chat-note">KI wird verbunden…</div>' : '';
  var busy = ed.busy ? '<div class="msg ai thinking" id="chat-progress"><span class="dots"><i></i><i></i><i></i></span> ' + esc(ed.busyText || 'Denkt nach…') + '</div>' : '';
  return '<div class="chat"><div class="chat-log" id="chat-log" aria-live="polite">' + empty + msgs + busy + '</div>' + status +
    '<div class="composer">' + (sb ? '<span class="ctx-chip">✦ ' + PF.LABELS[sb.b.type] + (blockSummary(sb.b) ? ': ' + esc(blockSummary(sb.b).slice(0, 24)) : '') +
      '<button data-ed="deselect" aria-label="Auswahl entfernen">×</button></span>' : '<span class="ctx-chip page">Seite: ' + esc(f.pages[ed.page].name) + '</span>') +
    '<textarea id="chat-input" rows="3" placeholder="z. B. „Füge einen Kurs am 8.–10. April mit 4 freien Plätzen hinzu“"' + (AI.sample ? '' : ' disabled') + '>' + esc(ed.draft) + '</textarea>' +
    '<div class="composer-row"><span class="muted small">Enter senden · Umschalt+Enter neue Zeile</span>' +
    (ed.busy ? '<button class="btn sm" data-ed="stop">■ Stopp</button>' : '<button class="btn primary sm" data-ed="send"' + (AI.sample ? '' : ' disabled') + '>Senden ↑</button>') + '</div></div></div>';
}

var AI_RULES = [
  'Du bist der Funnel-Editor-Assistent von Funnelkit (ein Perspective-ähnlicher Funnel-Baukasten). Du bekommst den aktuellen Funnel als JSON und eine Anweisung des Nutzers.',
  'Setze die Anweisung direkt um, indem du den geänderten Funnel zurückgibst. Schreibe Texte in der Sprache des Funnels (meist Deutsch), konkret und conversion-stark, ohne Platzhalter wie "Lorem".',
  'Wenn die Anweisung unklar ist, ändere nichts und stelle in "reply" eine kurze Rückfrage (pages = null).',
  '',
  'ANTWORTFORMAT: genau ein JSON-Objekt:',
  '{"reply": "1-3 Sätze an den Nutzer: was du geändert hast (oder Rückfrage)", "summary": "max. 6 Wörter, z.B. \\"FAQ vor Formular ergänzt\\" (leer wenn nichts geändert)", "pages": [...alle Seiten...] oder null, "settings": {...} oder null, "name": "neuer Funnel-Name" oder null}',
  'Wenn du etwas änderst, gib in "pages" IMMER ALLE Seiten vollständig zurück, in der gewünschten Reihenfolge. Behalte die "id" unveränderter Seiten und Blöcke bei. Neue Blöcke/Seiten dürfen ohne id kommen.',
  'Ändere nur, worum gebeten wurde. Ist ein Element ausgewählt, bezieht sich "das", "hier", "diesen Text" usw. auf dieses Element.',
  '',
  'DATENMODELL:',
  'Seite: {"id","name" (eindeutig, wird von Buttons als Ziel referenziert),"role": "home"|"page"|"result","blocks":[...]}. Genau eine Seite hat role "home" (Start). Danke-/Ergebnisseiten haben role "result".',
  'Jeder Block: {"id","type", ...felder, "style": {"align":"left"|"center"|"right","color":"#hex","bg":"#hex","size":"s"|"m"|"l"|"xl","bold":true,"italic":true,"space":"none"|"s"|"m"|"l"}} (style optional).',
  'Block-Typen:',
  '- heading {html, level:1|2|3}   (html erlaubt nur <b>,<i>,<u>,<br>,<a href>, <span style="color:#hex">)',
  '- text {html}',
  '- badge {text}',
  '- image {url, alt}   (nur echte https-URLs, sonst keinen Bildblock anlegen)',
  '- button {label, target: Seitenname, variant:"primary"|"secondary", url: optional externer Link}',
  '- choice {title, questionId (snake_case, eindeutig), layout:"list"|"grid", options:[{label, icon: Emoji oder "", target: Seitenname, points: Zahl oder ""}]}  (Einfachauswahl, Klick springt zu target)',
  '- multi {title, questionId, layout, min, buttonLabel, target, options:[{label, icon}]}  (Mehrfachauswahl)',
  '- input {title, questionId, inputType:"text"|"email"|"tel"|"number"|"url"|"textarea", placeholder, required, buttonLabel, target}',
  '- form {fields:{firstName,lastName,email,phone,company,message: true|false}, required:{feld:true|false}, consent: Text oder "", submitLabel, note, target}  (Lead-Erfassung, erzeugt CRM-Kontakt)',
  '- list {icon:"check"|"cross"|"dot"|"number", items:[string]}',
  '- features {items:[{icon: Emoji, title, text}]}',
  '- faq {items:[{q, a}]}',
  '- testimonial {quote, name, role, rating:0-5}',
  '- score {tiers:[{min,max,text}]}  (summiert "points" der Antworten, für Quiz-Ergebnisseiten)',
  '- divider {} , spacer {size: px}',
  'Navigation: Jede Frage/jeder Button braucht ein gültiges target (Name einer existierenden Seite). Ein typischer Funnel: Start (Hook + Button) → 3-6 Frageseiten (je eine Frage) → Kontaktseite (form) → Ergebnis/Danke (role result).',
  'settings (optional ändern): {"progress": true|false (Fortschrittsbalken), "back": true|false (Zurück-Button), "title": SEO-Titel, "description": SEO-Beschreibung}'
].join('\n');

function aiErrorText(e) {
  return {
    not_granted: 'Du hast der Seite die Nutzung von Claude nicht erlaubt. Über das Berechtigungen-Menü des Artifacts kannst du das ändern.',
    sampling_disabled: 'Claude ist für dieses Konto nicht verfügbar.',
    rate_limited: 'Zu viele Anfragen gerade. Bitte warte kurz und versuche es dann erneut.',
    session_expired: 'Deine Sitzung ist abgelaufen. Bitte melde dich neu an.',
    prompt_too_large: 'Der Funnel ist zu groß für eine Anfrage. Wähle ein Element aus oder beschreibe die Änderung kleiner.',
    invalid_json: 'Die Antwort der KI war unvollständig. Formuliere die Anweisung bitte etwas kleiner und versuche es erneut.',
    refused: 'Die KI hat diese Anfrage abgelehnt. Formuliere sie bitte anders.',
    upstream_error: 'Verbindung unterbrochen. Bitte erneut senden.'
  }[e && e.code] || ('Das hat nicht geklappt (' + ((e && (e.code || e.message)) || 'Fehler') + ').');
}

function sendAI(f, text) {
  text = String(text || '').trim();
  if (!text || ed.busy || !AI.sample) return;
  var sb = ed.sel && findBlock(f, ed.sel);
  f.chat.push({ role: 'user', text: text });
  ed.draft = ''; ed.busy = true; ed.busyText = 'Denkt nach…';
  save(); refreshPanels(f);
  var state = { name: f.name, settings: f.settings, pages: f.pages };
  var b = brand(f.brandId);
  var context = 'AKTUELLER FUNNEL:\n```json\n' + JSON.stringify(state) + '\n```\n' +
    (b ? 'Brand: ' + b.name + ' (Button-Farbe ' + b.buttonBackgroundColor + ', Hintergrund ' + b.backgroundColor + ')\n' : '') +
    'Aktuell geöffnete Seite: "' + f.pages[ed.page].name + '" (Index ' + ed.page + ')\n' +
    (sb ? 'AUSGEWÄHLTES ELEMENT: Block id "' + sb.b.id + '" (Typ ' + sb.b.type + ') auf Seite "' + sb.page.name + '"\n' : 'Kein Element ausgewählt.\n') +
    '\nANWEISUNG: ' + text;
  var history = f.chat.slice(0, -1).slice(-8).map(function (m) { return { role: m.role === 'user' ? 'user' : 'assistant', content: m.text || '…' }; });
  while (history.length && history[0].role !== 'user') history.shift();
  var turns = [{ role: 'user', content: AI_RULES }].concat(history, [{ role: 'user', content: context }]);
  var ctl = new AbortController(); ed.ctl = ctl;
  var started = Date.now();
  AI.sample.json(turns, {
    cache: false, signal: ctl.signal,
    onText: function (u) {
      ed.busyText = 'Baut die Änderung ein… (' + Math.round(u.text.length / 100) / 10 + ' k Zeichen)';
      var p = $('#chat-progress'); if (p) p.lastChild.textContent = ' ' + ed.busyText;
    }
  }).then(function (res) {
    var applied = false, msg = { role: 'assistant', text: String((res && res.reply) || 'Erledigt.'), summary: '' };
    if (res && Array.isArray(res.pages)) {
      var pages = normalizePages(res.pages, f);
      commit(f);
      f.pages = pages;
      if (res.settings && typeof res.settings === 'object') f.settings = Object.assign({}, f.settings, res.settings);
      if (res.name) f.name = String(res.name);
      if (ed.page >= f.pages.length) ed.page = f.pages.length - 1;
      if (ed.sel && !findBlock(f, ed.sel)) ed.sel = null;
      applied = true;
      msg.summary = String(res.summary || 'Änderung übernommen');
    }
    msg.applied = applied;
    f.chat.push(msg);
    finishAI(f, applied);
  }).catch(function (e) {
    if (e && e.code === 'cancelled') f.chat.push({ role: 'assistant', text: 'Abgebrochen. Nichts wurde geändert.' });
    else f.chat.push({ role: 'assistant', text: e instanceof Error ? 'Die Antwort passte nicht zum Funnel-Format (' + e.message + '). Bitte erneut versuchen.' : aiErrorText(e), error: true });
    finishAI(f, false);
  });
  void started;
}
function finishAI(f, applied) {
  ed.busy = false; ed.ctl = null;
  if (f.chat.length > 60) f.chat = f.chat.slice(-60);
  save();
  if (route.view !== 'edit' || ed.fid !== f.id) return;
  if (applied) { refreshCanvas(f); var t = $('#st-name'); if (t) t.value = f.name; }
  refreshPanels(f);
}
function maybeAutoSend() {
  if (!ed.autoSend || !AI.sample) return;
  var job = ed.autoSend; ed.autoSend = null;
  var f = funnel(job.fid); if (f) sendAI(f, job.text);
}

// ---------- inspector ----------
function fld(label, k, v, opts) {
  opts = opts || {};
  var id = 'i-' + k.replace(/\W/g, '-');
  var inp;
  if (opts.select) inp = '<select id="' + id + '" data-k="' + k + '">' + opts.select.map(function (o) { var val = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : o;
    return '<option value="' + esc(val) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(lab) + '</option>'; }).join('') + '</select>';
  else if (opts.area) inp = '<textarea id="' + id + '" data-k="' + k + '" rows="' + (opts.rows || 3) + '">' + esc(v) + '</textarea>';
  else if (opts.check) return '<label class="chk"><input type="checkbox" id="' + id + '" data-k="' + k + '" data-type="bool"' + (v ? ' checked' : '') + '> ' + label + '</label>';
  else inp = '<input id="' + id + '" data-k="' + k + '" value="' + esc(v == null ? '' : v) + '"' + (opts.type ? ' type="' + opts.type + '"' : '') + (opts.num ? ' data-type="num"' : '') + (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : '') + '>';
  return '<label class="fld' + (opts.wide ? ' wide' : '') + '" for="' + id + '"><span>' + label + '</span>' + inp + '</label>';
}
function targetSel(f, k, v, label) { return fld(label || 'Weiter zu Seite', k, v, { select: [['', '– keine –']].concat(f.pages.map(function (p) { return [p.name, p.name]; })) }); }

function arrayEditor(f, b, key, cols, addLabel) {
  var arr = b[key] || [];
  return '<div class="arr">' + arr.map(function (it, i) {
    return '<div class="arr-row">' + cols.map(function (c) {
      var k = key + '.' + i + (c.k ? '.' + c.k : '');
      var v = c.k ? it[c.k] : it;
      if (c.target) return '<select data-k="' + k + '" aria-label="Ziel">' + [['', '–']].concat(f.pages.map(function (p) { return [p.name, '→ ' + p.name]; })).map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
      if (c.area) return '<textarea data-k="' + k + '" rows="2" placeholder="' + esc(c.ph) + '">' + esc(v) + '</textarea>';
      return '<input data-k="' + k + '" value="' + esc(v == null ? '' : v) + '" placeholder="' + esc(c.ph) + '" class="' + (c.cls || '') + '"' + (c.num ? ' data-type="num"' : '') + '>';
    }).join('') + '<span class="arr-act"><button class="icon" data-ed="arr-up" data-arr="' + key + '" data-i="' + i + '" title="Nach oben">↑</button>' +
      '<button class="icon danger" data-ed="arr-del" data-arr="' + key + '" data-i="' + i + '" title="Entfernen">✕</button></span></div>';
  }).join('') + '<button class="btn sm ghost" data-ed="arr-add" data-arr="' + key + '">+ ' + addLabel + '</button></div>';
}

function inspector(f) {
  var sb = ed.sel && findBlock(f, ed.sel);
  if (!sb) {
    var p = f.pages[ed.page];
    return '<div class="st-scroll"><div class="st-sec"><div class="st-sec-h"><span>Seite</span></div>' +
      '<label class="fld" for="pg-name"><span>Name (Ziel für Buttons)</span><input id="pg-name" data-pg="name" value="' + esc(p.name) + '"></label>' +
      '<label class="fld" for="pg-role"><span>Rolle</span><select id="pg-role" data-pg="role">' + [['home', 'Startseite'], ['page', 'Normale Seite'], ['result', 'Ergebnis / Danke']].map(function (r) {
        return '<option value="' + r[0] + '"' + (p.role === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</select></label>' +
      '<div class="row wrap"><button class="btn sm" data-ed="page-move" data-d="-1">↑ Nach vorn</button><button class="btn sm" data-ed="page-move" data-d="1">↓ Nach hinten</button>' +
      '<button class="btn sm" data-ed="page-dup">⧉ Duplizieren</button><button class="btn sm danger" data-ed="page-del">Löschen</button></div></div>' +
      '<div class="st-sec"><div class="st-sec-h"><span>Funnel</span></div>' +
      '<label class="chk"><input type="checkbox" data-fs="progress"' + (f.settings.progress ? ' checked' : '') + '> Fortschrittsbalken anzeigen</label>' +
      '<label class="chk"><input type="checkbox" data-fs="back"' + (f.settings.back ? ' checked' : '') + '> Zurück-Button anzeigen</label></div>' +
      '<div class="st-sec"><p class="muted small st-tip">Klick ein Element im Canvas an, um es hier zu bearbeiten. Doppelklick bearbeitet Text direkt.</p></div></div>';
  }
  var b = sb.b, s = b.style || {}, h = '';
  switch (b.type) {
    case 'heading': h = fld('Ebene', 'level', b.level, { select: [[1, 'H1 · groß'], [2, 'H2 · mittel'], [3, 'H3 · klein']] }) + fld('Text', 'html', b.html, { area: true, rows: 3 }); break;
    case 'text': h = fld('Text', 'html', b.html, { area: true, rows: 6 }); break;
    case 'badge': h = fld('Text', 'text', b.text); break;
    case 'image': h = fld('Bild-URL (https://…)', 'url', b.url, { ph: 'https://…' }) + fld('Alternativtext', 'alt', b.alt); break;
    case 'button': h = fld('Beschriftung', 'label', b.label) + targetSel(f, 'target', b.target) + fld('Stil', 'variant', b.variant, { select: [['primary', 'Primär'], ['secondary', 'Sekundär']] }) +
      fld('Externer Link (optional)', 'url', b.url, { ph: 'https://…' }); break;
    case 'choice': h = fld('Frage', 'title', b.title) + fld('CRM-Feld', 'questionId', b.questionId) + fld('Layout', 'layout', b.layout, { select: [['list', 'Liste'], ['grid', 'Kacheln (2 Spalten)']] }) +
      '<div class="st-sub">Antworten · Emoji · Ziel · Punkte</div>' + arrayEditor(f, b, 'options', [{ k: 'label', ph: 'Antwort' }, { k: 'icon', ph: '🙂', cls: 'xs' }, { k: 'target', target: true }, { k: 'points', ph: 'Pkt', cls: 'xs', num: true }], 'Antwort'); break;
    case 'multi': h = fld('Frage', 'title', b.title) + fld('CRM-Feld', 'questionId', b.questionId) + fld('Layout', 'layout', b.layout, { select: [['list', 'Liste'], ['grid', 'Kacheln']] }) +
      fld('Mindestens', 'min', b.min, { type: 'number', num: true }) + fld('Button', 'buttonLabel', b.buttonLabel) + targetSel(f, 'target', b.target) +
      '<div class="st-sub">Antworten · Emoji</div>' + arrayEditor(f, b, 'options', [{ k: 'label', ph: 'Antwort' }, { k: 'icon', ph: '🙂', cls: 'xs' }], 'Antwort'); break;
    case 'input': h = fld('Frage', 'title', b.title) + fld('CRM-Feld', 'questionId', b.questionId) +
      fld('Feldtyp', 'inputType', b.inputType, { select: [['text', 'Text'], ['textarea', 'Langer Text'], ['email', 'E-Mail'], ['tel', 'Telefon'], ['number', 'Zahl'], ['url', 'URL']] }) +
      fld('Platzhalter', 'placeholder', b.placeholder) + fld('Pflichtfeld', 'required', b.required, { check: true }) + fld('Button', 'buttonLabel', b.buttonLabel) + targetSel(f, 'target', b.target); break;
    case 'form': h = '<div class="st-sub">Felder</div><div class="grid2">' + Object.keys(PF.FORM_FIELDS).map(function (k) { return fld(PF.FORM_FIELDS[k][1], 'fields.' + k, b.fields[k], { check: true }); }).join('') + '</div>' +
      fld('Einwilligungstext (leer = keine Checkbox)', 'consent', b.consent, { area: true, rows: 2 }) + fld('Button', 'submitLabel', b.submitLabel) +
      fld('Hinweis unter dem Button', 'note', b.note) + targetSel(f, 'target', b.target, 'Nach dem Absenden zu'); break;
    case 'list': h = fld('Symbol', 'icon', b.icon, { select: [['check', '✓ Haken'], ['cross', '✕ Kreuz'], ['dot', '• Punkt'], ['number', '1. Nummer']] }) +
      '<div class="st-sub">Einträge</div>' + arrayEditor(f, b, 'items', [{ ph: 'Eintrag' }], 'Eintrag'); break;
    case 'features': h = arrayEditor(f, b, 'items', [{ k: 'icon', ph: '⚡', cls: 'xs' }, { k: 'title', ph: 'Titel' }, { k: 'text', ph: 'Text', area: true }], 'Vorteil'); break;
    case 'faq': h = arrayEditor(f, b, 'items', [{ k: 'q', ph: 'Frage' }, { k: 'a', ph: 'Antwort', area: true }], 'Frage'); break;
    case 'testimonial': h = fld('Zitat', 'quote', b.quote, { area: true }) + fld('Name', 'name', b.name) + fld('Rolle', 'role', b.role) +
      fld('Sterne', 'rating', b.rating, { select: [0, 1, 2, 3, 4, 5] }) + fld('Foto-URL', 'avatar', b.avatar, { ph: 'https://…' }); break;
    case 'score': h = '<p class="muted small">Summiert die Punkte aller Antworten. Stufen: von · bis · Text</p>' + arrayEditor(f, b, 'tiers', [{ k: 'min', ph: 'von', cls: 'xs', num: true }, { k: 'max', ph: 'bis', cls: 'xs', num: true }, { k: 'text', ph: 'Text' }], 'Stufe'); break;
    case 'spacer': h = fld('Höhe (px)', 'size', b.size, { type: 'number', num: true }); break;
    case 'divider': h = '<p class="muted small">Eine dünne Trennlinie.</p>'; break;
  }
  var align = '<div class="fld"><span>Ausrichtung</span><div class="seg">' + [['', 'Auto'], ['left', '⇤'], ['center', '↔'], ['right', '⇥']].map(function (a) {
    return '<button data-ed="style" data-k="align" data-v="' + a[0] + '" class="' + ((s.align || '') === a[0] ? 'on' : '') + '" title="' + (a[0] || 'Standard') + '">' + a[1] + '</button>'; }).join('') + '</div></div>';
  var size = '<div class="fld"><span>Größe</span><div class="seg">' + [['s', 'S'], ['', 'M'], ['l', 'L'], ['xl', 'XL']].map(function (a) {
    return '<button data-ed="style" data-k="size" data-v="' + a[0] + '" class="' + ((s.size || '') === a[0] ? 'on' : '') + '">' + a[1] + '</button>'; }).join('') + '</div></div>';
  var space = '<div class="fld"><span>Abstand oben</span><div class="seg">' + [['', 'Std'], ['none', '0'], ['s', 'S'], ['m', 'M'], ['l', 'L']].map(function (a) {
    return '<button data-ed="style" data-k="space" data-v="' + a[0] + '" class="' + ((s.space || '') === a[0] ? 'on' : '') + '">' + a[1] + '</button>'; }).join('') + '</div></div>';
  var colors = '<div class="row wrap">' + colorFld('Textfarbe', 'color', s.color) + colorFld('Hintergrund', 'bg', s.bg) + '</div>';
  return '<div class="st-scroll"><div class="st-sec"><div class="st-sec-h"><span>' + BLOCK_ICONS[b.type] + ' ' + PF.LABELS[b.type] + '</span>' +
    '<button class="icon" data-ed="deselect" title="Auswahl aufheben">✕</button></div>' + h + '</div>' +
    '<div class="st-sec"><div class="st-sec-h"><span>Design</span></div>' + align + size + space + colors +
    '<div class="row wrap"><label class="chk"><input type="checkbox" data-sty="bold"' + (s.bold ? ' checked' : '') + '> Fett</label><label class="chk"><input type="checkbox" data-sty="italic"' + (s.italic ? ' checked' : '') + '> Kursiv</label></div></div>' +
    '<div class="st-sec"><div class="row wrap"><button class="btn sm" data-ed="blk" data-v="up">↑</button><button class="btn sm" data-ed="blk" data-v="down">↓</button>' +
    '<button class="btn sm" data-ed="blk" data-v="dup">⧉ Duplizieren</button><button class="btn sm" data-ed="blk" data-v="ai">✦ KI fragen</button>' +
    '<button class="btn sm danger" data-ed="blk" data-v="del">Löschen</button></div></div></div>';
}
function colorFld(label, k, v) {
  return '<div class="fld color"><span>' + label + '</span><div class="row"><input type="color" data-sk="' + k + '" value="' + esc(v || '#000000') + '" aria-label="' + label + '">' +
    (v ? '<button class="icon" data-ed="style" data-k="' + k + '" data-v="" title="Zurücksetzen">⟲</button>' : '<span class="muted small">Standard</span>') + '</div></div>';
}

// ---------- block operations ----------
function blockOp(f, op, id, value) {
  var sb = findBlock(f, id); if (!sb) return;
  var arr = sb.page.blocks;
  mutate(f, function () {
    switch (op) {
      case 'del': arr.splice(sb.i, 1); ed.sel = null; break;
      case 'dup': var c = cloneBlock(sb.b); arr.splice(sb.i + 1, 0, c); ed.sel = c.id; break;
      case 'up': move(arr, sb.i, -1); break;
      case 'down': move(arr, sb.i, 1); break;
      case 'align': sb.b.style = sb.b.style || {}; sb.b.style.align = { '': 'left', left: 'center', center: 'right', right: '' }[sb.b.style.align || '']; break;
      case 'color': sb.b.style = sb.b.style || {}; sb.b.style.color = value; break;
      case 'toggle-bold': sb.b.style = sb.b.style || {}; sb.b.style.bold = !sb.b.style.bold; break;
      case 'toggle-italic': sb.b.style = sb.b.style || {}; sb.b.style.italic = !sb.b.style.italic; break;
    }
  });
}

function addBlock(f, t) {
  var b = newBlock(t, f); if (!b) return;
  var page = f.pages[ed.page];
  var sb = ed.sel && findBlock(f, ed.sel);
  mutate(f, function () {
    if (sb && sb.page === page) page.blocks.splice(sb.i + 1, 0, b); else page.blocks.push(b);
    ed.sel = b.id;
  });
  toast(PF.LABELS[t] + ' hinzugefügt');
}

function addPage(f, kind) {
  var n = f.pages.length + 1, name = { blank: 'Seite ' + n, question: 'Frage ' + n, contact: 'Kontakt', result: 'Danke' }[kind];
  while (f.pages.some(function (p) { return p.name === name; })) name += ' 2';
  var page = { id: oid(), name: name, role: kind === 'result' ? 'result' : 'page', blocks: [] };
  var at = ed.page + 1, nextName = f.pages[at] ? f.pages[at].name : '';
  if (kind === 'question') { var q = newBlock('choice', f); q.title = 'Deine Frage'; q.options.forEach(function (o) { o.target = nextName; }); page.blocks.push(q); }
  if (kind === 'contact') { var h = newBlock('heading', f); h.html = 'Fast geschafft!'; var fm = newBlock('form', f); fm.target = nextName; fm.fields.phone = true; page.blocks.push(h, fm); }
  if (kind === 'result') { var h2 = newBlock('heading', f); h2.html = 'Danke! Wir melden uns in Kürze.'; h2.level = 1; var t = newBlock('text', f); t.html = 'Schau in dein Postfach: die Bestätigung ist unterwegs.'; page.blocks.push(h2, t); }
  mutate(f, function () { f.pages.splice(at, 0, page); ed.page = at; ed.sel = null; ed.scroll = 0; });
}

// ---------- settings modal ----------
function showSettings(f) {
  var m = $('#modal');
  m.innerHTML = '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="set-h"><div class="row between"><strong id="set-h">Funnel-Einstellungen</strong>' +
    '<button class="icon" data-act="close-modal" title="Schließen">✕</button></div>' +
    '<label class="fld" for="set-brand"><span>Brand (Farben, Schrift, Logo)</span><select id="set-brand" data-set="brandId">' + db.brands.map(function (b) {
      return '<option value="' + b.id + '"' + (b.id === f.brandId ? ' selected' : '') + '>' + esc(b.name) + '</option>'; }).join('') + '</select></label>' +
    '<label class="fld" for="set-title"><span>SEO-Titel</span><input id="set-title" data-set="title" value="' + esc(f.settings.title) + '" placeholder="' + esc(f.name) + '"></label>' +
    '<label class="fld" for="set-desc"><span>SEO-Beschreibung</span><textarea id="set-desc" data-set="description" rows="2">' + esc(f.settings.description) + '</textarea></label>' +
    '<label class="chk"><input type="checkbox" data-set="progress"' + (f.settings.progress ? ' checked' : '') + '> Fortschrittsbalken</label>' +
    '<label class="chk"><input type="checkbox" data-set="back"' + (f.settings.back ? ' checked' : '') + '> Zurück-Button</label>' +
    '<label class="fld" for="set-st"><span>CRM-Status (kommagetrennt, der erste ist der Startstatus)</span><input id="set-st" data-set="statuses" value="' + esc(f.statuses.join(', ')) + '"></label>' +
    '<div class="row"><button class="btn" data-act="export-from-settings">HTML ansehen &amp; kopieren</button><a class="btn" href="#/brands">Brands bearbeiten</a></div></div>';
  m.hidden = false;
  m.onchange = function (e) {
    var t = e.target, k = t.dataset.set; if (!k) return;
    commit(f);
    if (k === 'brandId') f.brandId = t.value;
    else if (k === 'statuses') f.statuses = t.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    else if (t.type === 'checkbox') f.settings[k] = t.checked;
    else f.settings[k] = t.value;
    save(); refreshAll(f);
  };
  m.onclick = function (e) {
    var a = e.target.closest('[data-act]'); if (!a) { if (e.target === m) m.hidden = true; return; }
    if (a.dataset.act === 'export-from-settings') showExport(f);
    if (a.getAttribute('href')) m.hidden = true;
  };
}

// ---------- events ----------
window.addEventListener('message', function (e) {
  var d = e.data; if (!d || !d.pfEdit) return;
  var f = ed.fid && funnel(ed.fid); if (!f || route.view !== 'edit') return;
  if (d.type === 'select') { ed.sel = d.id; refreshPanels(f); }
  else if (d.type === 'scroll') ed.scroll = d.y;
  else if (d.type === 'text') {
    var sb = findBlock(f, d.id); if (!sb) return;
    var v = d.field === 'html' ? PF.cleanHTML(d.value) : d.value;
    if (getPath(sb.b, d.field) === v) return;
    commit(f); setPath(sb.b, d.field, d.field.match(/\.points$/) ? v : v); save(); refreshPanels(f);
  } else if (d.type === 'action') {
    if (d.action === 'undo') return undo(f);
    if (d.action === 'redo') return redo(f);
    if (d.action === 'ai') { ed.sel = d.id; ed.tab = 'ai'; refreshPanels(f); return; }
    blockOp(f, d.action, d.id, d.value);
  }
});

function bindStudio(f) {
  var name = $('#st-name');
  if (name) name.onchange = function () { commit(f); f.name = name.value.trim() || f.name; save(); };
  if (route.view !== 'edit') return;
  refreshCanvas(f, false);
  refreshPanels(f);
  var root = $('.st-body');
  var top = $('.st-top');

  function onAct(e) {
    var a = e.target.closest('[data-ed]'); if (!a) return;
    var act = a.dataset.ed, sb = ed.sel && findBlock(f, ed.sel);
    switch (act) {
      case 'tab': ed.tab = a.dataset.v; refreshPanels(f); break;
      case 'page': ed.page = +a.dataset.i; ed.sel = null; ed.scroll = 0; refreshAll(f); break;
      case 'page-prev': if (ed.page > 0) { ed.page--; ed.sel = null; ed.scroll = 0; refreshAll(f); } break;
      case 'page-next': if (ed.page < f.pages.length - 1) { ed.page++; ed.sel = null; ed.scroll = 0; refreshAll(f); } break;
      case 'select': ed.sel = a.dataset.id; refreshPanels(f); selectInCanvas(ed.sel); break;
      case 'deselect': ed.sel = null; refreshPanels(f); selectInCanvas(null); break;
      case 'add-page-menu': var pm = $('#page-menu'); pm.hidden = !pm.hidden; break;
      case 'add-page': addPage(f, a.dataset.v); break;
      case 'add-block': $('#st-palette').hidden = true; addBlock(f, a.dataset.t); break;
      case 'palette': var pal = $('#st-palette'); if (pal.hidden) pal.innerHTML = paletteGrid(); pal.hidden = !pal.hidden; break;
      case 'mode': ed.mode = a.dataset.v; root.querySelectorAll('[data-ed=mode]').forEach(function (x) { x.classList.toggle('on', x.dataset.v === ed.mode); }); refreshCanvas(f); break;
      case 'device': ed.device = ed.device === 'mobile' ? 'desktop' : 'mobile'; $('.st-stage').className = 'st-stage ' + ed.device; a.textContent = ed.device === 'mobile' ? '▯' : '▭'; break;
      case 'code': showExport(f); break;
      case 'undo': undo(f); break;
      case 'redo': redo(f); break;
      case 'settings': showSettings(f); break;
      case 'publish': f.status = f.status === 'live' ? 'offline' : 'live'; f.version++; save(); toast(f.status === 'live' ? 'Veröffentlicht (Version ' + f.version + ')' : 'Offline genommen'); render(); break;
      case 'page-move': var d = +a.dataset.d, j = ed.page + d; if (j < 0 || j >= f.pages.length) return; mutate(f, function () { move(f.pages, ed.page, d); ed.page = j; }); break;
      case 'page-dup': mutate(f, function () { var p = JSON.parse(JSON.stringify(f.pages[ed.page])); p.id = oid(); p.name += ' (Kopie)'; p.role = p.role === 'home' ? 'page' : p.role;
        p.blocks.forEach(function (b) { b.id = uuid().slice(0, 8); }); f.pages.splice(ed.page + 1, 0, p); ed.page++; }); break;
      case 'page-del': if (f.pages.length < 2 || !armed(a)) return; mutate(f, function () { f.pages.splice(ed.page, 1); ed.page = Math.max(0, ed.page - 1); ed.sel = null; }); break;
      case 'style': if (!sb) return; mutate(f, function () { sb.b.style = sb.b.style || {}; if (a.dataset.v) sb.b.style[a.dataset.k] = a.dataset.v; else delete sb.b.style[a.dataset.k]; }); break;
      case 'blk': if (!sb) return; if (a.dataset.v === 'ai') { ed.tab = 'ai'; refreshPanels(f); return; } if (a.dataset.v === 'del' && !armed(a)) return; blockOp(f, a.dataset.v, sb.b.id); break;
      case 'arr-add': if (!sb) return; mutate(f, function () { var arr = sb.b[a.dataset.arr], tmpl = newBlock(sb.b.type, f)[a.dataset.arr];
        var item = JSON.parse(JSON.stringify(tmpl[tmpl.length - 1])); if (item && typeof item === 'object' && 'label' in item) item.label = 'Neue Antwort'; arr.push(item); }); break;
      case 'arr-del': if (!sb) return; mutate(f, function () { sb.b[a.dataset.arr].splice(+a.dataset.i, 1); }); break;
      case 'arr-up': if (!sb) return; mutate(f, function () { move(sb.b[a.dataset.arr], +a.dataset.i, -1); }); break;
      case 'suggest': ed.draft = a.textContent; refreshPanels(f); break;
      case 'send': var ta = $('#chat-input'); sendAI(f, ta ? ta.value : ed.draft); break;
      case 'stop': if (ed.ctl) ed.ctl.abort(); break;
    }
  }
  root.onclick = onAct;
  top.onclick = function (e) { if (e.target.closest('[data-ed]')) onAct(e); };

  // Inspector + page fields. Text inputs update live; one undo step per focus.
  var pending = null, timer = null;
  root.addEventListener('focusin', function (e) { if (e.target.matches('#st-right input:not([type=checkbox]):not([type=color]), #st-right textarea')) pending = snap(f); });
  root.oninput = function (e) {
    var t = e.target;
    if (t.id === 'chat-input') { ed.draft = t.value; return; }
    var sb = ed.sel && findBlock(f, ed.sel);
    if (t.dataset.k && sb && t.tagName !== 'SELECT' && t.type !== 'checkbox') {
      if (pending) { ed.undo.push(pending); ed.redo = []; pending = null; }
      var v = t.dataset.type === 'num' ? (t.value === '' ? '' : +t.value) : t.value;
      setPath(sb.b, t.dataset.k, v);
      save(); clearTimeout(timer); timer = setTimeout(function () { refreshCanvas(f); }, 250);
    }
  };
  root.onchange = function (e) {
    var t = e.target, sb = ed.sel && findBlock(f, ed.sel), page = f.pages[ed.page];
    if (t.dataset.k && sb) {
      if (t.tagName === 'SELECT' || t.type === 'checkbox') {
        mutate(f, function () { setPath(sb.b, t.dataset.k, t.type === 'checkbox' ? t.checked : (t.dataset.k === 'level' || t.dataset.k === 'rating' ? +t.value : t.value)); });
      } else if (t.dataset.k === 'html') { sb.b.html = PF.cleanHTML(sb.b.html); save(); refreshPanels(f); }
      else if (t.dataset.k === 'title' && sb.b.questionId && /^q_/.test(sb.b.questionId)) { sb.b.questionId = slug(t.value); save(); refreshPanels(f); }
      else refreshPanels(f);
    } else if (t.dataset.sk && sb) mutate(f, function () { sb.b.style = sb.b.style || {}; sb.b.style[t.dataset.sk] = t.value; });
    else if (t.dataset.sty && sb) mutate(f, function () { sb.b.style = sb.b.style || {}; sb.b.style[t.dataset.sty] = t.checked; });
    else if (t.dataset.pg) mutate(f, function () { if (t.dataset.pg === 'name') renamePage(f, page.name, t.value.trim() || page.name); else page.role = t.value; });
    else if (t.dataset.fs) mutate(f, function () { f.settings[t.dataset.fs] = t.checked; });
  };
  root.onkeydown = function (e) {
    if (e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendAI(f, e.target.value); }
  };

  // Drag & drop for pages and layers.
  var drag = null;
  root.addEventListener('dragstart', function (e) { var r = e.target.closest('[data-drag]'); if (!r) return; drag = { kind: r.dataset.drag, i: +r.dataset.i }; r.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', ''); } catch (x) {} });
  root.addEventListener('dragend', function () { drag = null; root.querySelectorAll('.dragging,.drop-before,.drop-after').forEach(function (x) { x.classList.remove('dragging', 'drop-before', 'drop-after'); }); });
  root.addEventListener('dragover', function (e) {
    var r = e.target.closest('[data-drag]'); if (!drag || !r || r.dataset.drag !== drag.kind) return;
    e.preventDefault();
    root.querySelectorAll('.drop-before,.drop-after').forEach(function (x) { x.classList.remove('drop-before', 'drop-after'); });
    var rect = r.getBoundingClientRect(); r.classList.add(e.clientY < rect.top + rect.height / 2 ? 'drop-before' : 'drop-after');
  });
  root.addEventListener('drop', function (e) {
    var r = e.target.closest('[data-drag]'); if (!drag || !r || r.dataset.drag !== drag.kind) return;
    e.preventDefault();
    var to = +r.dataset.i + (r.classList.contains('drop-after') ? 1 : 0), from = drag.i;
    if (to > from) to--;
    if (to === from) return;
    var arr = drag.kind === 'page' ? f.pages : f.pages[ed.page].blocks;
    mutate(f, function () { var x = arr.splice(from, 1)[0]; arr.splice(to, 0, x); if (drag.kind === 'page') ed.page = to; });
  });
}

// Global shortcuts while the editor (not the canvas) has focus.
document.addEventListener('keydown', function (e) {
  if (route.view !== 'edit' || !ed.fid) return;
  var f = funnel(ed.fid); if (!f) return;
  var typing = e.target.matches && e.target.matches('input,textarea,select,[contenteditable]');
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); if (e.shiftKey) redo(f); else undo(f); }
  else if (e.key === 'Escape' && !typing) { var pal = $('#st-palette'); if (pal && !pal.hidden) pal.hidden = true; else if (ed.sel) { ed.sel = null; refreshPanels(f); selectInCanvas(null); } }
});

// Funnel list: start a new funnel from a description.
function createWithAI(desc) {
  var f = JSON.parse(JSON.stringify(seed().funnels[0]));
  f.id = oid(); f.name = 'Neuer KI-Funnel'; f.brandId = db.brands[0] && db.brands[0].id;
  f.pages = [{ id: oid(), name: 'Start', role: 'home', blocks: [] }]; f.contacts = []; f.events = []; f.messages = []; f.chat = []; f.sequences = [];
  db.funnels.unshift(f); save();
  ed.tab = 'ai';
  ed.autoSend = { fid: f.id, text: 'Erstelle einen vollständigen, conversion-starken Funnel: ' + desc + '\nMit Startseite (Hook, Vorteile, Button), 3-6 Frageseiten mit je einer Frage (Emojis bei Antworten), einer Kontaktseite mit Formular und einer Danke-Seite. Gib dem Funnel einen passenden Namen.' };
  go('#/f/' + f.id + '/edit');
  maybeAutoSend();
}
