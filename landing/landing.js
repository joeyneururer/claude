// RESULTZ landing page: potential calculator, comparison marks, and lead capture.
// Leads and clicks go through the Funnelkit SDK (app/runtime.js), so they land in the
// same event stream as a published funnel: postMessage when embedded, else the localStorage outbox.

var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

// Set apiUrl to POST the outbox to a backend (same contract as a published funnel).
PF_SDK({ funnelId: 'resultz-landing', versionId: 1, apiUrl: '' });
window.perspective.pageView();

// ---------- comparison table: data-has="011" → one mark per column ----------
var MARK = {
  yes: '<span class="mark yes"><svg class="i" role="img" aria-label="Inklusive"><use href="#i-check"/></svg></span>',
  no: '<span class="mark"><svg class="i" role="img" aria-label="Nicht inklusive"><use href="#i-x"/></svg></span>'
};
$$('#compare tbody tr').forEach(function (tr) {
  tr.dataset.has.split('').forEach(function (c, i) {
    var td = document.createElement('td');
    if (i === 2) td.className = 'win';
    td.innerHTML = c === '1' ? MARK.yes : MARK.no;
    tr.appendChild(td);
  });
});

// ---------- potential calculator ----------
var PRESETS = {
  low: { termine: 8, quote: 25, aov: 10000 },
  mid: { termine: 14, quote: 30, aov: 11000 },
  high: { termine: 20, quote: 35, aov: 13000 }
};
var GUARANTEE = 50000, SCALE = 400000;
var calc = $('#calc');
function fmt(n) { return Math.round(n).toLocaleString('de-AT'); }
function out(k, v) { $('[data-out="' + k + '"]', calc).textContent = v; }

function compute() {
  var s = { termine: +$('#r-termine').value, quote: +$('#r-quote').value, aov: +$('#r-aov').value };
  var deals = s.termine * 3 * (s.quote / 100), result = deals * s.aov, ratio = result / GUARANTEE;
  out('termine', s.termine);
  out('quote', s.quote + ' %');
  out('aov', fmt(s.aov) + ' €');
  out('result', fmt(result) + ' €');
  out('deals', 'Rund ' + Math.round(deals));
  out('compare', result < GUARANTEE ? 'Das liegt unter der Garantie. Mit diesen Werten würden wir dein Studio vermutlich nicht annehmen.'
    : ratio < 1.5 ? 'Knapp über der Garantie. Realistisch, aber mit wenig Puffer.'
    : 'Das ' + (Math.round(ratio * 10) / 10).toLocaleString('de-AT') + '-Fache der Garantie.');
  $('[data-out="bar"]', calc).style.width = Math.min(100, Math.round(result / SCALE * 100)) + '%';
  $('.bar > i', calc).style.left = Math.round(GUARANTEE / SCALE * 100) + '%';
  return s;
}
function setPreset(key) {
  $$('.preset').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.preset === key)); });
}
// Calculator values become contact properties when the lead submits (like funnel answers).
function record() {
  var s = compute();
  Object.keys(s).forEach(function (k) { window.perspective.answer({ questionId: 'rechner_' + k, value: s[k] }); });
}

$$('.preset').forEach(function (b) {
  b.addEventListener('click', function () {
    var p = PRESETS[b.dataset.preset];
    $('#r-termine').value = p.termine; $('#r-quote').value = p.quote; $('#r-aov').value = p.aov;
    setPreset(b.dataset.preset);
    record();
  });
});
$$('input[type=range]', calc).forEach(function (r) {
  r.addEventListener('input', function () { setPreset(''); compute(); });
  r.addEventListener('change', record);
});
compute();

// ---------- lead form ----------
// The SDK's own submit listener (registered first) validates and emits the submit event.
document.addEventListener('submit', function (e) {
  var form = e.target;
  if (form.id !== 'lead-form' || !form.checkValidity()) return;
  form.hidden = true;
  var t = $('#thanks'); t.hidden = false; t.focus();
});

// Close the mobile menu after picking a section.
$$('.menu nav a').forEach(function (a) { a.addEventListener('click', function () { a.closest('details').open = false; }); });
