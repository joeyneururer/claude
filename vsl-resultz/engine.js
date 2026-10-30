/* RESULTZ VSL – frame-exact motion engine. window.renderFrame(t) draws time t. */
const W = 1920, H = 1080;
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const mix = (a, b, t) => a + (b - a) * t;
const P = (t, a, d) => (d <= 0 ? (t >= a ? 1 : 0) : clamp((t - a) / d));
const ease = {
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: t => 1 - Math.pow(1 - t, 4),
  outBack: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
// damped spring 0→1 (~8–12 % overshoot by default)
function spring(t, f = 1.9, z = 0.58) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
}
const S = (t, at, f, z) => spring(t - at, f, z);
function el(parent, html) {
  const d = document.createElement('div'); d.innerHTML = html.trim();
  const e = d.firstElementChild; parent.appendChild(e); return e;
}
const css = (e, o) => { for (const k in o) e.style[k] = o[k]; return e; };
const fmt = (v, dec = 0) => v.toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const ICON = {
  check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3.2L13 4.8"/></svg>',
  x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  arrowDown: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v11M3.5 8.5L8 13l4.5-4.5"/></svg>',
  arrowRight: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8h11M8.5 3.5L13 8l-4.5 4.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 3h4l2 5-2.5 1.5a11 11 0 005 5L15 12l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  bot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  pin: '<svg viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 32 12 32s12-11.2 12-20.1C24 5.3 18.6 0 12 0z" fill="currentColor"/><circle cx="12" cy="12" r="4.6" fill="#0F0F0E"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  euro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 6.5A7 7 0 107 17.5M4 10h10M4 14h9"/></svg>',
  cursor: '<svg viewBox="0 0 28 34"><path d="M3 2l21 18-9.5 1.2 5.6 10.4-4 2.2-5.6-10.6L3 30z" fill="#F3F1EC" stroke="#0F0F0E" stroke-width="2" stroke-linejoin="round"/></svg>',
};

/* ---------------- speaker ---------------- */
const RECTS = {
  full: [0, 0, 1920, 1080, 0], side: [96, 140, 720, 812, 16], sideR: [1104, 140, 720, 812, 16],
  pip: [1468, 712, 356, 272, 14], out: [1990, 712, 356, 272, 14],
};
const ANCH = { full: [0.547, 0.42], side: [0.5, 0.40], sideR: [0.5, 0.40], pip: [0.5, 0.44], out: [0.5, 0.44] };
const FOCUS = [0.547, 0.42];
const spk = document.getElementById('spk'), spkImg = document.getElementById('spkImg'), spkShade = document.getElementById('spkShade');
const SEGS = window.EDL.segments.map(s => s.g);
function segIndex(t) { let i = 0; while (i + 1 < SEGS.length && SEGS[i + 1] <= t) i++; return i; }

function layoutState(t) {
  const L = TL.layout; let i = 0;
  while (i + 1 < L.length && L[i + 1].t <= t) i++;
  const cur = L[i], prev = L[Math.max(0, i - 1)];
  const d = cur.d ?? 0.7;
  let p = i === 0 ? 1 : (d <= 0 ? 1 : spring(t - cur.t, 1.25, 0.82));
  if (d > 0 && t - cur.t > d * 3) p = 1;
  const a = RECTS[prev.m], b = RECTS[cur.m];
  const r = a.map((v, k) => mix(v, b[k], p));
  const an = ANCH[prev.m].map((v, k) => mix(v, ANCH[cur.m][k], clamp(p)));
  return { r, an, mode: p > 0.5 ? cur.m : prev.m, p };
}
function zoomAt(t) {
  const i = segIndex(t);
  const s0 = SEGS[i], s1 = SEGS[i + 1] ?? (s0 + 10);
  let z = (i % 2 ? 1.1 : 1.0) * (1 + 0.025 * clamp((t - s0) / (s1 - s0)));
  for (const pu of TL.punch) {
    if (t >= pu.t && t < pu.t + (pu.d ?? 2.5)) {
      const k = spring(t - pu.t, 1.6, 0.7);
      z = mix(z, pu.z, clamp(k, 0, 1.15));
    }
  }
  return z;
}
let lastFrame = -1;
function drawSpeaker(t, frameIdx) {
  const st = layoutState(t);
  const [x, y, w, h, rad] = st.r;
  css(spk, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRadius: rad + 'px',
    boxShadow: rad > 2 ? '0 40px 90px rgba(0,0,0,.6)' : 'none', zIndex: (st.mode === 'pip' || st.mode === 'out') ? 30 : 5 });
  const z = zoomAt(t);
  const s = Math.max(w / 1280, h / 720) * z, IW = 1280 * s, IH = 720 * s;
  let ix = w * st.an[0] - FOCUS[0] * IW, iy = h * st.an[1] - FOCUS[1] * IH;
  ix = clamp(ix, w - IW, 0); iy = clamp(iy, h - IH, 0);
  spkImg.style.transform = `translate(${ix}px,${iy}px) scale(${s})`;
  const full = st.r[2] > 1500;
  let dR = 0, dT = 0;
  for (const sc of TL.scenes) if (sc.dim) {
    const k = ease.outCubic(P(t, sc.s - 0.15, 0.4)) * (1 - ease.inOutCubic(P(t, sc.e, 0.45)));
    if (sc.dim === 'r') dR = Math.max(dR, k); else dT = Math.max(dT, k);
  }
  spkShade.style.background = full
    ? `linear-gradient(to left, rgba(12,12,11,${.86 * dR}) 0%, rgba(12,12,11,${.7 * dR}) 34%, rgba(12,12,11,0) 62%), linear-gradient(to bottom, rgba(12,12,11,${.85 * dT}) 0%, rgba(12,12,11,${.5 * dT}) 26%, rgba(12,12,11,0) 48%), linear-gradient(to top, rgba(12,12,11,.72) 0%, rgba(12,12,11,.0) 34%), radial-gradient(1400px 900px at 54% 40%, transparent 55%, rgba(0,0,0,.35))`
    : 'linear-gradient(to top, rgba(12,12,11,.86) 0%, rgba(12,12,11,0) 36%)';
  return st;
}

/* ---------------- subtitles ---------------- */
const subsEl = document.getElementById('subs');
let curCue = null;
function drawSubs(t, st, cov, nosubs) {
  const cue = SUBS.cues.find(c => t >= c.s && t < c.e);
  if (!cue || nosubs) { subsEl.style.display = 'none'; return; }
  subsEl.style.display = '';
  if (cue !== curCue) {
    subsEl.innerHTML = cue.words.map((w, i) => `<span class="w" data-i="${i}">${w.w}</span>`).join('');
    curCue = cue;
  }
  const spans = subsEl.children;
  cue.words.forEach((w, i) => spans[i].classList.toggle('on', t >= w.s - 0.03 && t < w.e + 0.08));
  const [x, y, w, h] = st.r; const m = st.mode;
  subsEl.classList.toggle('boxed', cov || m === 'pip' || m === 'out');
  if (cov || m === 'pip' || m === 'out') css(subsEl, { left: '96px', right: 'auto', bottom: '52px', top: 'auto', fontSize: '34px', maxWidth: '1180px' });
  else if (m === 'full') css(subsEl, { left: '120px', right: 'auto', bottom: '84px', top: 'auto', fontSize: '54px', maxWidth: '1320px' });
  else css(subsEl, { left: (x + 40) + 'px', right: 'auto', bottom: (H - (y + h) + 36) + 'px', top: 'auto', fontSize: '40px', maxWidth: (w - 80) + 'px' });
  const k = ease.outBack(P(t, cue.s, 0.22));
  subsEl.style.transform = `translateY(${(1 - k) * 14}px)`;
}

/* ---------------- shared scene helpers ---------------- */
function cover(root, sc, kind) {
  const c = el(root, `<div class="cover">${kind === 'dim' ? '<div class="cdim"></div>' : kind === 'img' ? `<img class="cbg" src="${sc.img}" style="object-fit:cover">` : '<img class="cbg" src="gen/stone.jpg"><div class="abs" style="inset:0;background:radial-gradient(1100px 700px at 22% 18%,rgba(236,137,70,.08),transparent 60%),radial-gradient(1600px 1000px at 50% 50%,transparent 55%,rgba(0,0,0,.45))"></div>'}</div>`);
  const edge = el(root, '<div class="edge" style="display:none"></div>');
  const cin = sc.cin || 'wipe', cout = sc.cout || 'wipe', od = sc.od ?? 0.45;
  const cx = sc.cx ?? 1000, cy = sc.cy ?? 460;
  return t => {
    const pi = cin === 'cut' ? (t >= sc.s ? 1 : 0) : ease.outExpo(P(t, sc.s, 0.55));
    const po = cout === 'cut' ? (t >= sc.e ? 1 : 0) : ease.inOutExpo(P(t, sc.e, od));
    let clip = 'none', tf = '';
    edge.style.display = 'none';
    if (po > 0) {
      if (cout === 'wipe') { clip = `inset(0 ${po * 100}% 0 0)`; edge.style.display = po < 1 ? '' : 'none'; edge.style.left = (W * (1 - po) - 10) + 'px'; }
      else if (cout === 'circle') clip = `circle(${(1 - po) * 1500}px at ${cx}px ${cy}px)`;
      else if (cout === 'up') tf = `translateY(${-po * 100}%)`;
      else if (cout === 'cut') clip = 'inset(0 0 0 100%)';
    } else if (pi < 1) {
      if (cin === 'wipe') { clip = `inset(0 0 0 ${(1 - pi) * 100}%)`; edge.style.display = ''; edge.style.left = (W * (1 - pi)) + 'px'; }
      else if (cin === 'circle') clip = `circle(${pi * 1500}px at ${cx}px ${cy}px)`;
      else if (cin === 'up') tf = `translateY(${(1 - pi) * 100}%)`;
    }
    root.style.clipPath = clip; root.style.transform = tf;
    const bg = c.querySelector('.cbg');
    if (bg) bg.style.transform = `translate(${-(t - sc.s) * 6}px, ${-(t - sc.s) * 2}px) scale(${1 + (t - sc.s) * 0.004})`;
  };
}
// mask-exit for content blocks that are not covers
function exitMask(node, t, sc, dir = 'left') {
  const e = ease.inOutExpo(P(t, sc.e, sc.od ?? 0.4));
  if (sc.cout === 'cut') { node.style.visibility = t >= sc.e ? 'hidden' : ''; return; }
  node.style.clipPath = e > 0 ? (dir === 'left' ? `inset(-200px ${e * 100}% -200px -200px)` : `inset(${e * 100}% -200px -200px -200px)`) : 'none';
  node.style.transform = e > 0 ? (dir === 'left' ? `translateX(${-e * 60}px)` : `translateY(${-e * 40}px)`) : '';
}
function kwHTML(text, cls = '') { return `<span class="kw"><span class="${cls}">${text}</span></span>`; }
function kwAnim(span, t, at, f = 1.7) {
  const p = S(t, at, f, 0.62);
  span.style.transform = `translateY(${(1 - p) * 135}%) rotate(${(1 - clamp(p)) * 5}deg)`;
}
function pop(node, t, at, from = 0.6, f = 2.2) {
  const p = S(t, at, f, 0.55);
  node.style.transform = (node.dataset.base || '') + ` scale(${mix(from, 1, p)})`;
  node.style.visibility = t >= at ? '' : 'hidden';
}
function slideIn(node, t, at, dx = 70, dy = 0, f = 1.8) {
  const p = S(t, at, f, 0.6);
  node.style.visibility = t >= at ? '' : 'hidden';
  node.style.transform = (node.dataset.base || '') + ` translate(${(1 - p) * dx}px, ${(1 - p) * dy}px) rotate(${(1 - clamp(p)) * (dx ? 2.5 : 0)}deg)`;
}
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}
function lerpColor(a, b, t) {
  const pa = a.match(/\w\w/g).map(h => parseInt(h, 16)), pb = b.match(/\w\w/g).map(h => parseInt(h, 16));
  return '#' + pa.map((v, i) => Math.round(mix(v, pb[i], t)).toString(16).padStart(2, '0')).join('');
}
const COL = { green: '5BBF6A', red: 'E5402B', orange: 'EC8946', mute: '8A867E', paper: 'F3F1EC' };

/* ---------------- scene types ---------------- */
const TYPES = {};

// kinetic type: lines of [text, at, cls]
TYPES.kin = (root, sc) => {
  const cv = sc.cover ? cover(root, sc, sc.cover) : null;
  const box = el(root, `<div class="abs" style="left:${sc.x ?? 96}px;top:${sc.y ?? 300}px;width:${sc.w ?? 1700}px"></div>`);
  const words = [], strikes = [];
  sc.lines.forEach((ln, li) => {
    const line = el(box, `<div class="h1" style="font-size:${(ln.size ?? sc.size ?? 140)}px;margin-bottom:${sc.gap ?? 10}px;${ln.style ?? ''}"></div>`);
    ln.w.forEach(([txt, at, cls]) => {
      const k = el(line, kwHTML(txt, cls || ''));
      line.appendChild(document.createTextNode(' '));
      words.push({ sp: k.firstElementChild, at, k });
    });
  });
  (sc.strike || []).forEach(s => {
    const k = words[s.i].k; k.style.position = 'relative'; k.style.overflow = 'visible';
    const b = el(k, '<span class="abs" style="left:-2%;right:-2%;top:52%;height:.09em;background:#E5402B;transform-origin:0 50%;border-radius:4px"></span>');
    strikes.push({ b, at: s.at, sp: words[s.i].sp });
  });
  return t => {
    cv && cv(t);
    words.forEach((w, i) => {
      kwAnim(w.sp, t, w.at);
      const xo = ease.inExpo(P(t, sc.e - 0.05 + i * 0.015, 0.32));
      if (xo > 0 && sc.cout !== 'cut') w.sp.style.transform = `translateY(${-xo * 112}%)`;
    });
    strikes.forEach(s => { s.b.style.transform = `scaleX(${ease.outExpo(P(t, s.at, 0.4))})`; s.sp.style.opacity = t > s.at ? 0.45 : 1; });
    if (sc.cout === 'cut') box.style.visibility = t >= sc.e ? 'hidden' : '';
  };
};

// chapter card: number + title, flies through from scale
TYPES.chapter = (root, sc) => {
  const cv = cover(root, sc, 'stone');
  const num = el(root, `<div class="abs h1" style="left:96px;top:150px;font-size:420px;color:transparent;-webkit-text-stroke:3px #EC8946;transform-origin:20% 50%;letter-spacing:-.04em">${sc.num}</div>`);
  const lab = el(root, `<div class="abs lbl" style="left:110px;top:640px;display:flex;align-items:center;gap:16px"><span class="chapnum">${sc.num}</span><span style="width:120px;height:2px;background:#3A3835;display:inline-block"></span>${sc.kicker || 'Kapitel'}</div>`);
  const title = el(root, `<div class="abs h1" style="left:96px;top:700px;font-size:120px"></div>`);
  const tw = sc.title.map(([txt, at, cls]) => ({ sp: el(title, kwHTML(txt, cls || '')).firstElementChild, at }));
  sc.title.forEach((_, i) => i < sc.title.length - 1 && title.children[i].after(document.createTextNode(' ')));
  return t => {
    cv(t);
    const p = ease.outExpo(P(t, sc.s, 0.9));
    const sh = sc.shrinkAt ? ease.inOutExpo(P(t, sc.shrinkAt, 0.7)) : 0;
    num.style.transform = `scale(${mix(3.2, 1, p) * mix(1, 0.24, sh)}) translate(${mix(260, 0, p)}px, ${mix(0, -420, sh)}px)`;
    num.style.opacity = mix(1, 0, sh);
    lab.style.transform = `translateY(${mix(0, -560, sh)}px)`;
    lab.style.clipPath = `inset(0 ${100 - ease.outExpo(P(t, sc.s + 0.25, 0.6)) * 100}% 0 0)`;
    title.style.transform = `translateY(${mix(0, -1200, sh)}px)`;
    tw.forEach(w => kwAnim(w.sp, t, w.at));
  };
};

// stacked cards (side area by default)
TYPES.cards = (root, sc) => {
  const cv = sc.cover ? cover(root, sc, sc.cover) : null;
  const box = el(root, `<div class="abs" style="left:${sc.x ?? 912}px;top:${sc.y ?? 200}px;width:${sc.w ?? 912}px"></div>`);
  let head = null, headSp = [];
  if (sc.title) {
    head = el(box, `<div class="h1" style="font-size:${sc.tsize ?? 64}px;margin-bottom:34px"></div>`);
    headSp = sc.title.map(([txt, at, cls]) => { const k = el(head, kwHTML(txt, cls || '')); head.appendChild(document.createTextNode(' ')); return { sp: k.firstElementChild, at }; });
  }
  let kick = null;
  if (sc.kicker) { kick = el(box, `<div class="pill ${sc.kicker[2] || ''}" style="margin-bottom:26px">${sc.kicker[0]}</div>`); }
  const cards = sc.items.map((it, i) => {
    const c = el(box, `<div style="position:relative;border-radius:16px;background:var(--card);box-shadow:0 0 0 1px var(--line),0 24px 60px rgba(0,0,0,.4);padding:${it.sub ? 26 : 30}px 32px;display:flex;align-items:center;gap:26px;margin-bottom:18px">
      <div class="check" style="width:58px;height:58px;font-weight:800;font-size:26px;box-shadow:inset 0 0 0 2px var(--line2);color:var(--mute2)">${it.icon === 'x' ? '<span style="width:24px;display:block">' + ICON.x + '</span>' : it.icon === 'check' ? '<span style="width:24px;display:block">' + ICON.check + '</span>' : (it.n ?? i + 1)}</div>
      <div style="flex:1"><div style="font-weight:800;font-size:${it.size ?? 34}px;letter-spacing:-.01em;line-height:1.12">${it.t}</div>${it.sub ? `<div style="font-weight:500;font-size:23px;color:var(--mute2);margin-top:6px;line-height:1.3">${it.sub}</div>` : ''}</div>
      <div class="abs strike" style="left:24px;right:24px;top:50%;height:4px;border-radius:4px;background:#E5402B;transform:scaleX(0);transform-origin:0 50%"></div>
    </div>`);
    return { c, it, ic: c.querySelector('.check'), st: c.querySelector('.strike') };
  });
  return t => {
    cv && cv(t);
    headSp.forEach(w => kwAnim(w.sp, t, w.at));
    if (kick) slideIn(kick, t, sc.kicker[1], 0, 24);
    cards.forEach(({ c, it, ic, st }, i) => {
      slideIn(c, t, it.at, 90, 0);
      const act = (sc.active || []).filter(a => a.i === i && t >= a.at).length > 0;
      const stk = (sc.strike || []).find(a => a.i === i);
      const sp = stk ? ease.outExpo(P(t, stk.at, 0.45)) : 0;
      st.style.transform = `scaleX(${sp})`;
      c.style.opacity = stk && t > stk.at ? mix(1, 0.5, sp) : 1;
      const good = it.icon === 'check' ? ease.outBack(P(t, it.at + 0.25, 0.4)) : 0;
      if (act || good > 0) {
        c.style.boxShadow = '0 0 0 1.5px #5BBF6A,0 24px 60px rgba(0,0,0,.45),0 0 0 6px rgba(91,191,106,.08)';
        css(ic, { background: '#5BBF6A', color: '#0F0F0E', boxShadow: 'none', transform: `scale(${mix(0.6, 1, good || 1)})` });
      }
      if (it.cls === 'bad') css(ic, { background: 'rgba(229,64,43,.16)', color: '#F06A55', boxShadow: 'inset 0 0 0 2px rgba(229,64,43,.45)' });
    });
    exitMask(box, t, sc);
  };
};

// big counter
TYPES.counter = (root, sc) => {
  const cv = sc.cover ? cover(root, sc, sc.cover) : null;
  const box = el(root, `<div class="abs" style="left:${sc.x}px;top:${sc.y}px;width:${sc.w ?? 1400}px;text-align:${sc.align ?? 'left'}"></div>`);
  const lab = sc.label ? el(box, `<div class="lbl" style="font-size:${sc.lsize ?? 26}px;margin-bottom:10px">${sc.label[0]}</div>`) : null;
  const num = el(box, `<div class="h1 num ${sc.cls ?? 'green'}" style="font-size:${sc.size ?? 260}px;letter-spacing:-.045em;display:inline-block;transform-origin:${sc.align === 'right' ? '100%' : '0'} 70%;white-space:nowrap"></div>`);
  const sub = sc.sub ? el(box, `<div style="font-weight:700;font-size:${sc.ssize ?? 40}px;color:var(--paper);margin-top:14px">${sc.sub[0]}</div>`) : null;
  return t => {
    cv && cv(t);
    const p = ease.outExpo(P(t, sc.at, sc.dur ?? 1.2));
    let v = mix(sc.from ?? 0, sc.to, p);
    let txt;
    if (sc.scramble && p < 1) { const n = Math.floor(t * 25); txt = (sc.pre || '') + String(10000 + (n * 7919) % 89999).replace(/(\d\d)(\d\d\d)$/, '$1.$2'); }
    else txt = (sc.pre || '') + fmt(v, sc.dec ?? 0) + (sc.suf || '');
    if (sc.final && p >= 1) txt = sc.final;
    num.innerHTML = txt;
    const vis = t >= sc.at;
    num.style.visibility = vis ? '' : 'hidden';
    const land = S(t, sc.at + (sc.dur ?? 1.2) * 0.55, 2.4, 0.45);
    num.style.transform = `translateY(${(1 - ease.outExpo(P(t, sc.at, 0.5))) * 60}px) scale(${1 + 0.035 * Math.sin(clamp(land) * Math.PI)})`;
    if (lab) slideIn(lab, t, sc.label[1], 0, 20);
    if (sub) slideIn(sub, t, sc.sub[1], 0, 24);
    exitMask(box, t, sc, 'up');
  };
};

// chart: series of points (0..1), drawn with dash offset; optional morph
TYPES.chart = (root, sc) => {
  const cv = sc.cover ? cover(root, sc, sc.cover) : null;
  const X = sc.x ?? 960, Y = sc.y ?? 260, CW = sc.w ?? 820, CH = sc.h ?? 480;
  const box = el(root, `<div class="abs" style="left:${X}px;top:${Y}px;width:${CW}px;height:${CH + 80}px"></div>`);
  const head = sc.title ? el(box, `<div class="lbl" style="position:absolute;left:0;top:-56px">${sc.title}</div>`) : null;
  let grid = '';
  for (let i = 0; i <= 4; i++) grid += `<line x1="0" x2="${CW}" y1="${CH * i / 4}" y2="${CH * i / 4}" stroke="#2E2C29" stroke-width="1.5" stroke-dasharray="${i === 4 ? '0' : '4 8'}"/>`;
  const svg = el(box, `<svg width="${CW}" height="${CH}" style="position:absolute;left:0;top:0;overflow:visible">${grid}</svg>`);
  const series = sc.series.map(s => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); svg.appendChild(g);
    g.innerHTML = `<path class="glow" fill="none" stroke-width="18" stroke-linecap="round" opacity=".14"/><path class="ln" fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle class="dot" r="11"/><circle class="halo" r="22" fill="none" stroke-width="3"/>`;
    const lab = el(box, `<div class="pill ${s.cls || ''}" style="position:absolute;white-space:nowrap">${s.label || ''}</div>`);
    if (!s.label) lab.style.display = 'none';
    return { s, ln: g.querySelector('.ln'), glow: g.querySelector('.glow'), dot: g.querySelector('.dot'), halo: g.querySelector('.halo'), lab };
  });
  return t => {
    cv && cv(t);
    if (head) slideIn(head, t, sc.s, 0, 16);
    svg.style.clipPath = `inset(0 ${100 - ease.outExpo(P(t, sc.s, 0.6)) * 100}% -40px 0)`;
    series.forEach(({ s, ln, glow, dot, halo, lab }) => {
      let pts = s.pts;
      let col = COL[s.color] || s.color;
      if (s.morph) {
        const m = ease.inOutCubic(P(t, s.morph.at, s.morph.dur ?? 1));
        const mm = spring(t - s.morph.at, 1.4, 0.6);
        pts = pts.map((p, i) => [p[0], mix(p[1], s.morph.pts[i][1], s.morph.spring ? mm : m)]);
        col = lerpColor(col, COL[s.morph.color] || col, m);
      }
      const px = pts.map(p => [p[0] * CW, (1 - p[1]) * CH]);
      const d = smoothPath(px);
      ln.setAttribute('d', d); glow.setAttribute('d', d);
      ln.setAttribute('stroke', '#' + col.replace('#', '')); glow.setAttribute('stroke', '#' + col.replace('#', ''));
      const L = ln.getTotalLength();
      const dp = ease.inOutCubic(P(t, s.at, s.dur ?? 1.4));
      ln.style.strokeDasharray = `${L} ${L}`; ln.style.strokeDashoffset = L * (1 - dp);
      glow.style.strokeDasharray = `${L} ${L}`; glow.style.strokeDashoffset = L * (1 - dp);
      const pt = ln.getPointAtLength(L * dp);
      dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); dot.setAttribute('fill', '#' + col.replace('#', ''));
      halo.setAttribute('cx', pt.x); halo.setAttribute('cy', pt.y); halo.setAttribute('stroke', '#' + col.replace('#', ''));
      const hp = (t * 1.3) % 1; halo.setAttribute('r', 12 + hp * 22); halo.setAttribute('opacity', (1 - hp) * 0.7);
      const vis = t >= s.at ? '' : 'hidden';
      dot.style.visibility = halo.style.visibility = vis;
      css(lab, { left: (pt.x + (s.lx ?? 24)) + 'px', top: (pt.y + (s.ly ?? -26)) + 'px' });
      if (s.label) slideIn(lab, t, s.labelAt ?? (s.at + (s.dur ?? 1.4) * 0.8), 0, 16);
      if (s.morph && s.morph.label && t >= s.morph.at) { lab.innerHTML = s.morph.label; lab.className = 'pill ' + (s.morph.cls || ''); }
    });
    exitMask(box, t, sc);
  };
};

// comparison bars
TYPES.bars = (root, sc) => {
  const cv = sc.cover ? cover(root, sc, sc.cover) : null;
  const box = el(root, `<div class="abs" style="left:${sc.x ?? 96}px;top:${sc.y ?? 240}px;width:${sc.w ?? 1300}px"></div>`);
  const head = el(box, `<div class="h1" style="font-size:${sc.tsize ?? 72}px;margin-bottom:70px"></div>`);
  const hw = sc.title.map(([txt, at, cls]) => { const k = el(head, kwHTML(txt, cls || '')); head.appendChild(document.createTextNode(' ')); return { sp: k.firstElementChild, at }; });
  const rows = sc.rows.map(r => {
    const row = el(box, `<div style="margin-bottom:46px"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px"><div style="font-weight:700;font-size:34px">${r.label}</div><div class="h1 num" style="font-size:64px;color:${r.color === 'red' ? 'var(--red)' : 'var(--paper)'}"></div></div>
      <div style="height:34px;border-radius:999px;background:rgba(243,241,236,.06);box-shadow:inset 0 0 0 1px var(--line);overflow:hidden"><div class="fill" style="height:100%;border-radius:999px;transform-origin:0 50%;background:${r.color === 'red' ? 'var(--red)' : r.color === 'green' ? 'var(--green)' : 'var(--grad)'}"></div></div></div>`);
    return { row, r, val: row.querySelector('.num'), fill: row.querySelector('.fill') };
  });
  return t => {
    cv && cv(t);
    hw.forEach(w => kwAnim(w.sp, t, w.at));
    rows.forEach(({ row, r, val, fill }) => {
      slideIn(row, t, r.at, 0, 30);
      let target = 0; (r.steps || []).forEach(s => { if (t >= s.at) { target = s.v; val.textContent = s.txt; } });
      if (t < r.steps[0].at) val.textContent = '';
      // spring towards the latest step value
      let prevV = 0, cur = 0;
      (r.steps || []).forEach(s => { if (t >= s.at) { const k = spring(t - s.at, 1.6, 0.62); cur = mix(prevV, s.v, k); prevV = s.v; } });
      fill.style.width = (Math.max(0.012, cur) * 100) + '%';
    });
    exitMask(box, t, sc);
  };
};

// gap between Anfrage and Käufer, coins fall into it
TYPES.gap = (root, sc) => {
  const cv = cover(root, sc, 'stone');
  const head = el(root, `<div class="abs h1" style="left:96px;top:150px;font-size:76px;width:1700px"></div>`);
  const hw = sc.title.map(([txt, at, cls]) => { const k = el(head, kwHTML(txt, cls || '')); head.appendChild(document.createTextNode(' ')); return { sp: k.firstElementChild, at }; });
  const node = (txt, ic) => el(root, `<div class="abs" style="top:520px;display:flex;align-items:center;gap:18px;background:var(--card);border-radius:16px;padding:26px 34px;box-shadow:0 0 0 1px var(--line2),0 30px 70px rgba(0,0,0,.5)"><span style="width:44px;height:44px;color:var(--mute)">${ic}</span><span style="font-weight:800;font-size:44px">${txt}</span></div>`);
  const a = node('Anfrage', ICON.user.replace('currentColor', '#B8B4AC')), b = node('Käufer', ICON.check.replace('currentColor', '#5BBF6A'));
  const meas = el(root, `<div class="abs" style="top:560px;height:4px;background:repeating-linear-gradient(90deg,#8A867E 0 14px,transparent 14px 26px)"></div>`);
  const ml = el(root, `<div class="abs pill r" style="top:650px;transform:translateX(-50%);font-size:30px;padding:14px 26px">${sc.gapLabel}</div>`);
  const abyss = el(root, `<div class="abs" style="top:620px;height:200px;background:linear-gradient(to bottom,rgba(229,64,43,.2),transparent);border-left:2px dashed rgba(229,64,43,.4);border-right:2px dashed rgba(229,64,43,.4)"></div>`);
  const coins = sc.coins.map(c => ({ at: c, n: el(root, `<div class="abs" style="width:76px;height:76px;border-radius:999px;background:radial-gradient(circle at 35% 30%,#F7B27A,#EC8946 55%,#B8612A);display:grid;place-items:center;font-weight:800;font-size:38px;color:#3A2210;box-shadow:0 10px 30px rgba(0,0,0,.5)">€</div>`) }));
  const money = el(root, `<div class="abs h1 red" style="left:96px;top:860px;font-size:64px"></div>`);
  return t => {
    cv(t);
    hw.forEach(w => kwAnim(w.sp, t, w.at));
    const o = spring(t - sc.openAt, 1.1, 0.7);
    const dist = mix(380, 1180, clamp(o, 0, 1.12));
    const cx = 960, ax = cx - dist / 2, bx = cx + dist / 2;
    slideIn(a, t, sc.s + 0.2, -60, 0); slideIn(b, t, sc.s + 0.4, 60, 0);
    css(a, { left: (ax - 300) + 'px' }); css(b, { left: (bx + 20) + 'px' });
    css(meas, { left: (ax - 10) + 'px', width: Math.max(0, dist + 30) + 'px' });
    meas.style.opacity = t > sc.openAt ? 1 : 0;
    css(ml, { left: cx + 'px' }); slideIn(ml, t, sc.labelAt, 0, 20);
    ml.dataset.base = 'translateX(-50%)';
    css(abyss, { left: (ax + 40) + 'px', width: Math.max(0, dist - 60) + 'px' });
    abyss.style.clipPath = `inset(0 0 ${100 - ease.outExpo(P(t, sc.openAt + 0.3, 0.8)) * 100}% 0)`;
    coins.forEach(({ at, n }, i) => {
      const lt = t - at; const vis = lt >= 0 && lt < 1.6;
      n.style.visibility = vis ? '' : 'hidden';
      const x0 = cx - 140 + i * 95, y = 300 + 980 * lt * lt;
      css(n, { left: x0 + 'px', top: y + 'px', transform: `rotate(${lt * 240 * (i % 2 ? 1 : -1)}deg) scale(${1 - clamp(lt - 0.6) * 0.5})` });
    });
    money.innerHTML = sc.money[0]; slideIn(money, t, sc.money[1], 0, 30);
  };
};

// generic positioned pills / labels / notes
TYPES.pills = (root, sc) => {
  const items = sc.items.map(it => {
    const n = el(root, `<div class="abs pill ${it.cls || ''}" style="left:${it.x}px;top:${it.y}px;font-size:${it.size ?? 26}px;padding:${it.pad ?? '14px 24px'}">${it.icon ? `<span style="width:.85em;height:.85em;display:block">${ICON[it.icon]}</span>` : ''}${it.t}</div>`);
    return { n, it };
  });
  return t => {
    items.forEach(({ n, it }) => {
      slideIn(n, t, it.at, it.dx ?? 0, it.dy ?? 26);
      const e = ease.inOutExpo(P(t, it.out ?? sc.e, 0.35));
      if (e > 0) n.style.clipPath = `inset(0 ${e * 100}% 0 0)`; else n.style.clipPath = 'none';
    });
  };
};

// handwritten note, revealed left→right like writing
TYPES.hand = (root, sc) => {
  const n = el(root, `<div class="abs hand ${sc.cls ?? 'grad'}" style="left:${sc.x}px;top:${sc.y}px;font-size:${sc.size ?? 64}px;transform:rotate(${sc.rot ?? -4}deg);padding:0 12px 18px 0;text-shadow:none">${sc.t}</div>`);
  let arrow = null, ap = null;
  if (sc.arrow) {
    arrow = el(root, `<svg class="abs" style="left:${sc.arrow.x}px;top:${sc.arrow.y}px;overflow:visible" width="${sc.arrow.w}" height="${sc.arrow.h}"><defs><linearGradient id="hg${sc.s}" x1="0" x2="1"><stop offset="0" stop-color="#E5402B"/><stop offset="1" stop-color="#EC8946"/></linearGradient></defs><path d="${sc.arrow.d}" fill="none" stroke="url(#hg${sc.s})" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
    ap = arrow.querySelector('path');
  }
  return t => {
    const p = ease.inOutCubic(P(t, sc.at ?? sc.s, sc.dur ?? 0.9));
    n.style.clipPath = `inset(-20px ${100 - p * 100}% -40px -20px)`;
    n.style.visibility = t >= (sc.at ?? sc.s) ? '' : 'hidden';
    if (ap) {
      const L = ap.getTotalLength(); const q = ease.outCubic(P(t, (sc.at ?? sc.s) + (sc.dur ?? 0.9) * 0.8, 0.45));
      ap.style.strokeDasharray = `${L} ${L}`; ap.style.strokeDashoffset = L * (1 - q);
    }
    const e = ease.inOutExpo(P(t, sc.e, 0.35));
    if (e > 0) { n.style.clipPath = `inset(-20px -20px -40px ${e * 100}%)`; if (arrow) arrow.style.clipPath = `inset(0 0 0 ${e * 100}%)`; }
  };
};

// stamp
TYPES.stamp = (root, sc) => {
  const n = el(root, `<div class="abs" style="left:${sc.x}px;top:${sc.y}px;transform-origin:50% 50%"><div style="border:6px solid ${sc.color ?? '#E5402B'};color:${sc.color ?? '#E5402B'};border-radius:14px;padding:14px 28px;font-weight:800;font-size:${sc.size ?? 58}px;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;transform:rotate(${sc.rot ?? -8}deg);background:rgba(15,15,14,.35);box-shadow:0 0 0 2px rgba(15,15,14,.3)">${sc.t}</div></div>`);
  return t => {
    const p = spring(t - sc.at, 2.6, 0.45);
    n.style.visibility = t >= sc.at ? '' : 'hidden';
    const shake = t - sc.at < 0.25 && t > sc.at ? Math.sin((t - sc.at) * 90) * 4 * (1 - (t - sc.at) / 0.25) : 0;
    n.style.transform = `translate(${shake}px,0) scale(${mix(2.4, 1, clamp(p, 0, 1.2))})`;
    exitMask(n, t, sc, 'up');
  };
};

// image cover (showroom) with ken burns
TYPES.photo = (root, sc) => {
  const cv = cover(root, sc, 'img');
  const shade = el(root, `<div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(12,12,11,.92) 0%,rgba(12,12,11,.7) 38%,rgba(12,12,11,.15) 70%),linear-gradient(to top,rgba(12,12,11,.8),transparent 40%)"></div>`);
  return t => { cv(t); };
};

// cut-out product with parallax float
TYPES.cutout = (root, sc) => {
  const sh = el(root, `<div class="abs" style="left:${sc.x + sc.w * 0.1}px;top:${sc.y + sc.w * 0.5}px;width:${sc.w * 0.8}px;height:60px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.65),transparent)"></div>`);
  const img = el(root, `<img class="abs" src="${sc.src}" style="left:${sc.x}px;top:${sc.y}px;width:${sc.w}px;filter:drop-shadow(0 30px 40px rgba(0,0,0,.45)) brightness(.92) contrast(1.06)">`);
  return t => {
    const p = spring(t - sc.at, 1.1, 0.72);
    const fl = Math.sin((t - sc.at) * 0.9) * 6;
    img.style.visibility = sh.style.visibility = t >= sc.at ? '' : 'hidden';
    img.style.transform = `translate(${(1 - p) * 700 - (t - sc.at) * 9}px, ${fl}px)`;
    sh.style.transform = `translate(${(1 - p) * 700 - (t - sc.at) * 9}px,0) scale(${1 - fl * 0.004})`;
    exitMask(img, t, sc); exitMask(sh, t, sc);
  };
};

// ringing phone
TYPES.phone = (root, sc) => {
  const n = el(root, `<div class="abs" style="left:${sc.x}px;top:${sc.y}px;width:150px;height:150px"><div class="ring" style="position:absolute;inset:0;border-radius:999px;border:3px solid #5BBF6A"></div><div class="ring" style="position:absolute;inset:0;border-radius:999px;border:3px solid #5BBF6A"></div><div class="core" style="position:absolute;inset:0;border-radius:999px;background:#5BBF6A;display:grid;place-items:center"><span style="width:70px;height:70px;color:#0F0F0E">${ICON.phone}</span></div></div>`);
  const core = n.querySelector('.core'), rings = n.querySelectorAll('.ring');
  return t => {
    pop(n, t, sc.at, 0.3);
    const lt = t - sc.at;
    core.style.transform = `rotate(${lt > 0 && lt < 2.4 ? Math.sin(lt * 50) * 12 * (Math.floor(lt * 2.5) % 2 ? 0.2 : 1) : 0}deg)`;
    rings.forEach((r, i) => { const q = ((lt + i * 0.5) % 1); css(r, { transform: `scale(${1 + q * 0.9})`, opacity: lt > 0 ? (1 - q) * 0.8 : 0 }); });
    exitMask(n, t, sc);
  };
};

// "Mehr …" rapid-fire cards
TYPES.mehr = (root, sc) => {
  const cv = cover(root, sc, 'stone');
  const panes = sc.items.map((it, i) => {
    const p = el(root, `<div class="abs" style="inset:0"><div class="abs" style="left:96px;top:260px;width:1500px">
      <div class="h1 mute" style="font-size:120px">${kwHTML('Mehr')}</div>
      <div class="h1" style="font-size:${it.word.length > 10 ? 150 : 190}px;margin-top:-6px">${kwHTML(it.word, 'red')}</div>
      <div class="subs" style="margin-top:34px;display:flex;gap:16px;flex-wrap:wrap"></div></div>
      <div class="abs ic" style="right:140px;top:520px;width:260px;height:260px;color:#3A3835">${ICON[it.icon] || ''}</div></div>`);
    const subs = p.querySelector('.subs');
    const sp = (it.sub || []).map(s => ({ n: el(subs, `<div class="pill ${s.cls || 'r'}" style="font-size:30px;padding:14px 26px">${s.t}</div>`), at: s.at }));
    return { p, it, sp, kw: [...p.querySelectorAll('.kw>span')], ic: p.querySelector('.ic') };
  });
  return t => {
    cv(t);
    panes.forEach(({ p, it, sp, kw, ic }, i) => {
      const end = sc.items[i + 1] ? sc.items[i + 1].at : sc.e + 0.5;
      const vis = t >= it.at && t < end;
      p.style.visibility = vis ? '' : 'hidden';
      if (!vis) return;
      const tr = it.tr || 'cut', pi = ease.outExpo(P(t, it.at, 0.45));
      p.style.clipPath = tr === 'wipe' ? `inset(0 0 0 ${(1 - pi) * 100}%)` : tr === 'up' ? `inset(${(1 - pi) * 100}% 0 0 0)` : 'none';
      kw.forEach((s, k) => kwAnim(s, t, it.at + 0.05 + k * 0.12));
      sp.forEach(s => slideIn(s.n, t, s.at, 0, 26));
      ic.style.transform = `rotate(${(t - it.at) * 8}deg) scale(${mix(0.7, 1, spring(t - it.at, 1.4, 0.6))})`;
    });
  };
};

// contract with empty signature
TYPES.contract = (root, sc) => {
  const cv = cover(root, sc, 'stone');
  const paper = el(root, `<div class="abs" style="left:980px;top:170px;width:640px;height:780px;border-radius:12px;background:#F3F1EC;color:#1F1E1C;padding:56px 60px;box-shadow:0 50px 100px rgba(0,0,0,.6);transform-origin:50% 100%">
    <div style="font-weight:800;font-size:44px;letter-spacing:-.02em">Kaufvertrag</div><div style="font-weight:600;font-size:20px;color:#8A867E;margin-top:6px">Küche · Planung Nr. 0471</div>
    ${[1, 1, 1, 1, 1, 1].map((_, i) => `<div style="height:12px;border-radius:6px;background:#D8D4CC;margin-top:${i ? 18 : 48}px;width:${[100, 92, 96, 70, 88, 60][i]}%"></div>`).join('')}
    <div style="position:absolute;left:60px;right:60px;bottom:120px;border-bottom:3px solid #1F1E1C"></div>
    <div style="position:absolute;left:60px;bottom:80px;font-weight:600;font-size:20px;color:#8A867E">Unterschrift Kunde</div>
    <div class="cur" style="position:absolute;left:66px;bottom:130px;width:4px;height:52px;background:#1F1E1C"></div></div>`);
  const cur = paper.querySelector('.cur');
  const head = el(root, `<div class="abs h1" style="left:96px;top:330px;font-size:100px;width:820px"></div>`);
  const hw = sc.title.map(([txt, at, cls]) => { const k = el(head, kwHTML(txt, cls || '')); head.appendChild(document.createTextNode(' ')); return { sp: k.firstElementChild, at }; });
  return t => {
    cv(t);
    const p = spring(t - sc.s - 0.1, 1.3, 0.65);
    paper.style.transform = `translateY(${(1 - p) * 500}px) rotate(${(1 - clamp(p)) * 8 + 3}deg)`;
    cur.style.opacity = Math.floor(t * 2.2) % 2 ? 1 : 0;
    hw.forEach(w => kwAnim(w.sp, t, w.at));
  };
};

// map with pins, circles, flying address cards
TYPES.map = (root, sc) => {
  const cv = sc.cover ? cover(root, sc, sc.cover) : null;
  const X = sc.x ?? 912, Y = sc.y ?? 140, MW = sc.w ?? 912, MH = sc.h ?? 812;
  const box = el(root, `<div class="abs" style="left:${X}px;top:${Y}px;width:${MW}px;height:${MH}px;border-radius:16px;overflow:hidden;background:#141413;box-shadow:0 0 0 1px var(--line),0 30px 80px rgba(0,0,0,.5)"></div>`);
  // procedural roads
  let roads = '', seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 14; i++) {
    const vert = i % 2; const a = rnd() * (vert ? MW : MH);
    const pts = []; for (let k = 0; k <= 6; k++) { const q = k / 6; pts.push(vert ? [a + (rnd() - 0.5) * 120, q * MH] : [q * MW, a + (rnd() - 0.5) * 120]); }
    roads += `<path d="${smoothPath(pts)}" fill="none" stroke="#252422" stroke-width="${i < 4 ? 9 : 4}" stroke-linecap="round"/>`;
  }
  const svg = el(box, `<svg width="${MW}" height="${MH}" style="position:absolute;inset:0">${roads}<circle class="reg" cx="${sc.circle?.x ?? 0}" cy="${sc.circle?.y ?? 0}" r="0" fill="rgba(91,191,106,.10)" stroke="#5BBF6A" stroke-width="3" stroke-dasharray="10 10"/></svg>`);
  const reg = svg.querySelector('.reg');
  const regLab = sc.circle ? el(box, `<div class="abs pill g" style="left:${sc.circle.x}px;top:${sc.circle.y + sc.circle.r + 18}px;transform:translateX(-50%)">${sc.circle.label}</div>`) : null;
  if (regLab) regLab.dataset.base = 'translateX(-50%)';
  const pins = sc.pins.map(p => {
    const n = el(box, `<div class="abs" style="left:${p.x - 26}px;top:${p.y - 70}px;width:52px;height:70px;transform-origin:50% 100%"><span class="pc" style="display:block;width:52px;height:70px;color:#8A867E">${ICON.pin}</span><div class="pl abs pill" style="left:64px;top:6px;font-size:20px;padding:8px 14px"></div></div>`);
    return { n, p, pc: n.querySelector('.pc'), pl: n.querySelector('.pl') };
  });
  const flies = (sc.fly || []).map(f => ({ f, n: el(box, `<div class="abs" style="left:0;top:0;background:#F3F1EC;color:#1F1E1C;border-radius:10px;padding:12px 16px;font-weight:700;font-size:20px;box-shadow:0 14px 30px rgba(0,0,0,.5);white-space:nowrap;display:flex;gap:10px;align-items:center"><span style="width:22px;height:22px;display:block;color:#1F1E1C">${ICON.user}</span>${f.t}</div>`) }));
  const head = sc.title ? el(box, `<div class="abs" style="left:36px;top:30px;right:36px;font-weight:800;font-size:40px;letter-spacing:-.01em;line-height:1.1;text-shadow:0 2px 14px rgba(0,0,0,.6)">${sc.title[0]}</div>`) : null;
  const STC = { grey: '#4A4743', mine: '#5BBF6A', red: '#E5402B', green: '#5BBF6A', mute: '#8A867E', orange: '#EC8946' };
  return t => {
    cv && cv(t);
    const bi = ease.outExpo(P(t, sc.s, 0.6));
    box.style.clipPath = `inset(0 ${100 - bi * 100}% 0 0 round 16px)`;
    if (head) slideIn(head, t, sc.title[1], 0, 20);
    if (sc.circle) {
      const r = sc.circle.r * spring(t - sc.circle.at, 1.2, 0.65);
      reg.setAttribute('r', Math.max(0, r)); reg.style.strokeDashoffset = -t * 30;
      slideIn(regLab, t, sc.circle.at + 0.3, 0, 16);
    }
    pins.forEach(({ n, p, pc, pl }) => {
      const drop = spring(t - p.at, 2.0, 0.5);
      n.style.visibility = t >= p.at ? '' : 'hidden';
      let stt = 'mute', lab = p.label || '', pulse = 0;
      (p.st || []).forEach(s => { if (t >= s.at) { stt = s.s; if (s.label !== undefined) lab = s.label; pulse = t - s.at; } });
      if (!p.st || t < p.st[0].at) stt = p.s0 || 'mute';
      pc.style.color = STC[stt];
      const bump = pulse > 0 && pulse < 0.5 ? Math.sin(pulse / 0.5 * Math.PI) * 0.25 : 0;
      n.style.transform = `translateY(${(1 - clamp(drop, 0, 1.2)) * -120}px) scale(${(p.big ? 1.35 : 1) * (1 + bump)})`;
      pl.innerHTML = lab; pl.style.display = lab ? '' : 'none';
      pl.className = 'pl abs pill ' + (stt === 'red' ? 'r' : stt === 'green' || stt === 'mine' ? 'g' : '');
    });
    flies.forEach(({ f, n }) => {
      const p0 = f.from, p1 = sc.pins[f.to];
      const k = ease.inOutCubic(P(t, f.at, 0.8));
      const arc = Math.sin(k * Math.PI) * -80;
      n.style.visibility = t >= f.at - 0.4 ? '' : 'hidden';
      css(n, { transform: `translate(${mix(p0[0], p1.x + 30, k)}px, ${mix(p0[1], p1.y - 120, k) + arc}px) scale(${mix(1, 0.8, k)})` });
    });
    exitMask(box, t, sc);
  };
};

// calendar full vs order book empty
TYPES.calbook = (root, sc) => {
  const box = el(root, `<div class="abs" style="left:912px;top:170px;width:912px;height:760px;display:grid;grid-template-columns:1fr 1fr;gap:28px"></div>`);
  const cal = el(box, `<div style="border-radius:16px;background:var(--card);box-shadow:0 0 0 1px var(--line);padding:30px"><div style="display:flex;align-items:center;gap:12px;font-weight:800;font-size:32px"><span style="width:32px;height:32px;color:#B8B4AC">${ICON.cal}</span>Termine</div><div class="g" style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:28px"></div><div class="abs pill g" style="position:relative;margin-top:28px">voll</div></div>`);
  const g = cal.querySelector('.g'); const cells = [];
  for (let i = 0; i < 30; i++) cells.push(el(g, `<div style="height:72px;border-radius:10px;background:rgba(243,241,236,.05);box-shadow:inset 0 0 0 1px var(--line)"></div>`));
  const book = el(box, `<div style="border-radius:16px;background:var(--card);box-shadow:0 0 0 1px var(--line);padding:30px"><div style="display:flex;align-items:center;gap:12px;font-weight:800;font-size:32px"><span style="width:32px;height:32px;color:#B8B4AC">${ICON.euro}</span>Aufträge</div><div class="rows" style="margin-top:28px"></div><div class="abs pill r" style="position:relative;margin-top:28px">viel zu wenig</div></div>`);
  const rows = book.querySelector('.rows'); const rr = [];
  for (let i = 0; i < 8; i++) rr.push(el(rows, `<div style="height:62px;border-bottom:1px dashed var(--line2);display:flex;align-items:center;gap:14px">${i < 2 ? '<span style="width:26px;height:26px;border-radius:99px;background:#5BBF6A;display:block"></span><span style="height:12px;width:60%;border-radius:6px;background:#3A3835;display:block"></span>' : ''}</div>`));
  const pg = cal.querySelector('.pill'), pr = book.querySelector('.pill');
  return t => {
    slideIn(cal, t, sc.s, 0, 40); slideIn(book, t, sc.s + 0.15, 0, 40);
    cells.forEach((c, i) => {
      const at = sc.fillAt + i * 0.045; const k = ease.outBack(P(t, at, 0.3));
      c.style.background = t >= at ? (i % 7 === 3 ? 'rgba(236,137,70,.55)' : 'rgba(243,241,236,.18)') : 'rgba(243,241,236,.05)';
      c.style.transform = `scale(${t >= at ? mix(0.7, 1, k) : 1})`;
    });
    slideIn(pg, t, sc.fillAt + 1.2, 0, 16); slideIn(pr, t, sc.emptyAt, 0, 16);
    rr.forEach((r, i) => slideIn(r, t, sc.emptyAt - 0.5 + i * 0.05, 30, 0));
    exitMask(box, t, sc);
  };
};

// case study card
TYPES.cases = (root, sc) => {
  const cv = cover(root, sc, 'stone');
  const kick = el(root, `<div class="abs lbl" style="left:96px;top:96px;display:flex;align-items:center;gap:16px"><span class="chapnum">${sc.kicker[0]}</span><span style="width:120px;height:2px;background:#3A3835;display:inline-block"></span>${sc.kicker[1]}</div>`);
  const cards = sc.cards.map(c => {
    const n = el(root, `<div class="card" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;padding:40px 44px;overflow:hidden">
      <div style="height:${c.logoH ?? 110}px;display:flex;align-items:center">${c.logo ? `<div style="background:${c.logoBg ?? 'transparent'};border-radius:10px;padding:${c.logoBg ? '14px 18px' : '0'};display:inline-flex"><img src="${c.logo}" style="height:${c.logoImgH ?? 90}px"></div>` : `<div style="font-weight:800;font-size:46px;line-height:1.05">${c.name}</div>`}</div>
      <div class="place" style="font-weight:600;font-size:24px;color:var(--mute2);margin-top:18px">${c.place || ''}</div>
      <div class="v h1 num green" style="font-size:${c.vsize ?? 120}px;letter-spacing:-.04em;margin-top:26px"></div>
      <div class="vs" style="font-weight:700;font-size:30px;margin-top:8px">${c.vsub || ''}</div>
      <div class="chips" style="display:flex;gap:12px;margin-top:22px;flex-wrap:wrap"></div></div>`);
    const chips = (c.chips || []).map(ch => ({ n: el(n.querySelector('.chips'), `<div class="pill ${ch.cls || 'g'}">${ch.t}</div>`), at: ch.at }));
    return { n, c, v: n.querySelector('.v'), vs: n.querySelector('.vs'), pl: n.querySelector('.place'), chips };
  });
  const ghosts = (sc.ghosts || []).map((g, i) => el(root, `<div class="card" style="left:${g.x + i * 26}px;top:${g.y + i * 22}px;width:${g.w}px;height:${g.h}px;opacity:${0.5 - i * 0.12}"></div>`));
  const gl = sc.ghostLabel ? el(root, `<div class="abs pill" style="left:${sc.ghostLabel.x}px;top:${sc.ghostLabel.y}px;font-size:26px">${sc.ghostLabel.t}</div>`) : null;
  return t => {
    cv(t);
    kick.style.clipPath = `inset(0 ${100 - ease.outExpo(P(t, sc.s + 0.2, 0.6)) * 100}% 0 0)`;
    cards.forEach(({ n, c, v, vs, pl, chips }) => {
      slideIn(n, t, c.at, 120, 0);
      if (c.shiftAt) { const k = spring(t - c.shiftAt, 1.3, 0.7); n.style.transform += ` translate(${(t >= c.shiftAt ? k : 0) * c.shiftX}px,0) scale(${mix(1, c.shiftS ?? 1, t >= c.shiftAt ? clamp(k) : 0)})`; }
      slideIn(pl, t, c.placeAt ?? c.at, 0, 14);
      if (c.val) {
        const p = ease.outExpo(P(t, c.val.at, c.val.dur ?? 1.1));
        v.textContent = (c.val.pre || '') + fmt(mix(0, c.val.to, p), c.val.dec ?? 0) + (c.val.suf || '');
        v.style.visibility = t >= c.val.at ? '' : 'hidden';
      } else v.textContent = c.vtext || '';
      slideIn(vs, t, c.vsubAt ?? c.at, 0, 14);
      chips.forEach(ch => slideIn(ch.n, t, ch.at, 0, 20));
    });
    ghosts.forEach((g, i) => slideIn(g, t, sc.ghostAt + i * 0.08, 90, 0));
    if (gl) slideIn(gl, t, sc.ghostAt + 0.2, 0, 20);
  };
};

// Triple-A system board (side area)
TYPES.triple = (root, sc) => {
  const box = el(root, `<div class="abs" style="left:912px;top:${sc.y ?? 150}px;width:912px"></div>`);
  const head = el(box, `<div class="h1" style="font-size:66px;margin-bottom:30px">Auswahl <span class="mute">vor Aufmerksamkeit.</span></div>`);
  const names = [['ANZIEHUNG', 'Die Botschaft filtert vor dem ersten Klick.'], ['AUSWAHL', 'Jede Anfrage geprüft, bevor sie in deinen Kalender kommt.'], ['ABSCHLUSSWEG', 'Vom Klick zum Termin in Stunden, nicht Wochen.']];
  const cards = names.map(([n, d], i) => {
    const c = el(box, `<div style="position:relative;border-radius:16px;background:var(--card);box-shadow:0 0 0 1px var(--line);margin-bottom:18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:26px;padding:24px 30px"><div class="n check" style="width:60px;height:60px;font-weight:800;font-size:26px;box-shadow:inset 0 0 0 2px var(--line2);color:var(--mute2)">${i + 1}</div>
      <div><div style="font-weight:800;font-size:32px;letter-spacing:.08em">${n}</div><div class="d" style="font-weight:500;font-size:24px;color:var(--mute2);margin-top:4px">${d}</div></div></div>
      <div class="ex" style="padding:0 30px 0 116px"></div></div>`);
    const ex = c.querySelector('.ex');
    const extras = (sc.extras[i] || []).map(x => {
      let n;
      if (x.k === 'chip') n = el(ex, `<div class="pill ${x.cls || 'g'}" style="margin:0 10px 12px 0;font-size:25px">${x.icon ? `<span style="width:20px;height:20px;display:block">${ICON[x.icon]}</span>` : ''}${x.t}</div>`);
      if (x.k === 'swap') n = el(ex, `<div style="display:flex;align-items:center;gap:18px;margin-bottom:14px"><div class="a h1" style="font-size:54px;position:relative;display:inline-block">Wochen<span class="abs sk" style="left:-3%;right:-3%;top:52%;height:6px;border-radius:4px;background:#E5402B;transform-origin:0 50%"></span></div><span style="width:34px;height:34px;color:#8A867E;display:block;flex:none">${ICON.arrowRight}</span><div class="b h1 green" style="font-size:54px;display:inline-block">Stunden</div></div>`);
      if (x.k === 'bar') n = el(ex, `<div style="margin:4px 0 16px"><div style="display:flex;justify-content:space-between;font-weight:700;font-size:22px;color:var(--mute)"><span>Kaufkraft</span><span class="dl num">Tag 1</span></div><div style="height:16px;border-radius:99px;background:rgba(243,241,236,.07);margin-top:10px;overflow:hidden"><div class="bf" style="height:100%;border-radius:99px;background:var(--grad);transform-origin:0 50%"></div></div></div>`);
      if (x.k === 'msg') n = el(ex, `<div style="display:inline-flex;gap:14px;align-items:center;background:#1C2A1E;border-radius:16px 16px 16px 4px;padding:14px 20px;box-shadow:inset 0 0 0 1px rgba(91,191,106,.35);margin-bottom:14px"><span style="width:26px;height:26px;color:#5BBF6A;display:block">${ICON.cal}</span><span style="font-weight:600;font-size:22px">${x.t}</span></div>`);
      if (x.k === 'br') n = el(ex, '<div style="height:0"></div>');
      return { x, n };
    });
    return { c, ex, extras, nb: c.querySelector('.n'), d: c.querySelector('.d') };
  });
  const filt = el(box, `<svg class="abs" width="220" height="120" viewBox="0 0 220 120" style="right:34px;top:0;display:none"><g fill="#8A867E" opacity=".7"><circle cx="10" cy="16" r="5"/><circle cx="28" cy="40" r="5"/><circle cx="8" cy="62" r="5"/><circle cx="30" cy="84" r="5"/><circle cx="12" cy="106" r="5"/><circle cx="46" cy="22" r="5"/><circle cx="50" cy="60" r="5"/><circle cx="44" cy="98" r="5"/></g><path d="M70 6 L132 48 L132 72 L70 114" fill="none" stroke="#5BBF6A" stroke-width="3" stroke-linejoin="round" opacity=".6"/><g fill="#5BBF6A"><circle cx="160" cy="60" r="7"/><circle cx="190" cy="60" r="7"/></g></svg>`);
  return t => {
    slideIn(head, t, sc.s, 0, 30);
    let active = -1; (sc.active || []).forEach(a => { if (t >= a.at) active = a.i; });
    cards.forEach(({ c, ex, extras, nb, d }, i) => {
      slideIn(c, t, sc.s + 0.15 + i * 0.12, 90, 0);
      const on = i === active, done = sc.done && sc.done.includes(i);
      const a = (sc.active || []).find(q => q.i === i); const k = a ? spring(t - a.at, 1.6, 0.62) : 0;
      if (on) {
        css(c, { background: '#1B271D', boxShadow: '0 0 0 1.5px #5BBF6A,0 0 0 7px rgba(91,191,106,.09),0 30px 70px rgba(0,0,0,.55)', transform: c.style.transform + ` translateX(${-14 * clamp(k, 0, 1.1)}px)` });
        css(nb, { background: '#5BBF6A', color: '#0F0F0E', boxShadow: 'none' }); nb.innerHTML = i + 1;
        c.style.opacity = 1; d.style.color = 'var(--mute)';
      } else {
        css(c, { background: 'var(--card)', boxShadow: '0 0 0 1px var(--line)' });
        const was = active > i || done;
        css(nb, { background: was ? 'rgba(91,191,106,.16)' : 'transparent', color: was ? '#5BBF6A' : '#8A867E', boxShadow: was ? 'none' : 'inset 0 0 0 2px #3A3835' });
        nb.innerHTML = was ? `<span style="width:24px;display:block">${ICON.check}</span>` : i + 1;
        c.style.opacity = active >= 0 ? 0.55 : 1; d.style.color = 'var(--mute2)';
      }
      // extras only visible while active
      let h = 0;
      extras.forEach(({ x, n }) => {
        const vis = on && t >= x.at;
        n.style.display = vis ? (x.k === 'chip' || x.k === 'msg' ? 'inline-flex' : x.k === 'swap' ? 'flex' : '') : 'none';
        if (!vis) return;
        slideIn(n, t, x.at, 0, 18);
        if (x.strike) { n.style.opacity = t > x.strike ? 0.5 : 1; n.style.textDecoration = t > x.strike ? 'line-through' : ''; }
        if (x.k === 'swap') { n.querySelector('.sk').style.transform = `scaleX(${ease.outExpo(P(t, x.at2, 0.4))})`; slideIn(n.querySelector('.b'), t, x.at2, 30, 0); n.querySelector('.a').style.opacity = t > x.at2 ? 0.45 : 1; }
        if (x.k === 'bar') { const q = P(t, x.at, x.dur); n.querySelector('.bf').style.transform = `scaleX(${1 - 0.82 * ease.inOutCubic(q)})`; n.querySelector('.dl').textContent = 'Tag ' + (1 + Math.floor(q * 6.99)); }
      });
      ex.style.paddingBottom = on && extras.some(e => t >= e.x.at) ? '14px' : '0';
      if (i === 0) { filt.style.display = on && t >= (sc.filterAt ?? 1e9) ? '' : 'none'; filt.style.top = (c.offsetTop + 70) + 'px'; slideIn(filt, t, sc.filterAt ?? 1e9, 40, 0); }
    });
    exitMask(box, t, sc);
  };
};

// end card
TYPES.end = (root, sc) => {
  const cv = cover(root, sc, 'stone');
  const logo = el(root, `<img class="abs" src="assets/resultz.svg" style="left:96px;top:96px;height:120px">`);
  const head = el(root, `<div class="abs h1" style="left:96px;top:330px;font-size:112px;width:1250px"></div>`);
  const hw = sc.title.map(([txt, at, cls]) => { const k = el(head, kwHTML(txt, cls || '')); head.appendChild(document.createTextNode(' ')); return { sp: k.firstElementChild, at }; });
  const btn = el(root, `<div class="abs" style="left:96px;top:690px;display:inline-flex;align-items:center;gap:18px;background:var(--grad);color:#fff;border-radius:999px;padding:30px 46px;font-weight:800;font-size:40px;box-shadow:0 24px 60px rgba(229,64,43,.35);transform-origin:50% 50%">Kostenloses Erstgespräch buchen<span style="width:36px;height:36px;display:block">${ICON.arrowRight}</span></div>`);
  const note = el(root, `<div class="abs" style="left:110px;top:840px;display:flex;gap:28px;font-weight:600;font-size:24px;color:var(--mute)">${['30 Minuten', 'Unverbindlich', 'Ein Studio pro Region'].map(s => `<span style="display:flex;gap:10px;align-items:center"><span style="width:22px;height:22px;color:#5BBF6A;display:block">${ICON.check}</span>${s}</span>`).join('')}</div>`);
  const slot = el(root, `<div class="card abs" style="left:1340px;top:250px;width:480px;padding:30px"><div style="display:flex;align-items:center;gap:12px;font-weight:800;font-size:28px"><span style="width:28px;height:28px;color:#B8B4AC;display:block">${ICON.cal}</span>Termin wählen</div><div class="sl" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px">${['Mo 09:00', 'Mo 14:30', 'Di 10:00', 'Di 16:00', 'Mi 11:30', 'Do 09:30'].map(s => `<div style="border-radius:12px;padding:16px;text-align:center;font-weight:700;font-size:22px;box-shadow:inset 0 0 0 1px var(--line2)">${s}</div>`).join('')}</div></div>`);
  const slots = slot.querySelectorAll('.sl>div');
  const cur = el(root, `<div class="abs" style="width:44px;height:54px;z-index:5">${ICON.cursor}</div>`);
  const hand = el(root, `<div class="abs hand grad" style="left:96px;top:910px;font-size:62px;transform:rotate(-4deg);padding:0 10px 16px 0">Ein Gespräch unter Unternehmern.</div>`);
  return t => {
    cv(t);
    slideIn(logo, t, sc.s + 0.2, 0, 20);
    hw.forEach(w => kwAnim(w.sp, t, w.at));
    const press = t > sc.clickAt && t < sc.clickAt + 0.18 ? 0.94 : 1;
    pop(btn, t, sc.btnAt, 0.7); btn.style.transform += ` scale(${press})`;
    slideIn(note, t, sc.btnAt + 0.3, 0, 20);
    slideIn(slot, t, sc.slotAt, 80, 0);
    slots.forEach((s, i) => { const on = i === 2 && t >= sc.pickAt; css(s, { background: on ? '#5BBF6A' : 'transparent', color: on ? '#0F0F0E' : 'var(--paper)', boxShadow: on ? 'none' : 'inset 0 0 0 1px #3A3835', transform: on ? `scale(${mix(0.9, 1, ease.outBack(P(t, sc.pickAt, 0.3)))})` : '' }); });
    // cursor path: in from bottom right → button → slot
    const k1 = ease.inOutCubic(P(t, sc.clickAt - 0.7, 0.7)), k2 = ease.inOutCubic(P(t, sc.pickAt - 0.6, 0.6));
    let cx = mix(1500, 640, k1), cy = mix(1100, 740, k1);
    cx = mix(cx, 1600, k2); cy = mix(cy, 395, k2);
    css(cur, { left: cx + 'px', top: cy + 'px', visibility: t > sc.clickAt - 0.7 ? '' : 'hidden' });
    const hp = ease.inOutCubic(P(t, sc.handAt, 1.0));
    hand.style.clipPath = `inset(-20px ${100 - hp * 100}% -40px -20px)`;
  };
};

/* ---------------- main ---------------- */
const gfx = document.getElementById('gfx');
gfx.style.zIndex = 10;
const bg = document.getElementById('bg'), grain = document.getElementById('grain');
TL.scenes.forEach(sc => { sc.od = sc.od ?? 0.45; });
window.renderFrame = async (t, frameIdx) => {
  // speaker frame
  const fi = Math.min(window.EDL.frames, Math.max(1, frameIdx + 1));
  const src = `th/${String(fi).padStart(5, '0')}.jpg`;
  if (spkImg.dataset.src !== src) {
    spkImg.src = src; spkImg.dataset.src = src;
    try { await spkImg.decode(); } catch (e) {}
  }
  bg.style.transform = `translate(${Math.sin(t * 0.05) * 60 - t * 0.6 % 120}px, ${Math.cos(t * 0.04) * 30}px)`;
  grain.style.transform = `translate(${((frameIdx * 37) % 64) - 32}px, ${((frameIdx * 53) % 64) - 32}px)`;
  const st = drawSpeaker(t, frameIdx);
  let cov = false, nosubs = false;
  for (const sc of TL.scenes) {
    const vis = t >= sc.s - 0.001 && t < sc.e + sc.od + 0.02;
    if (vis) {
      if (!sc._u) { sc._root = el(gfx, '<div class="scene"></div>'); sc._u = TYPES[sc.type](sc._root, sc); }
      sc._root.style.display = '';
      sc._u(t);
      if ((sc.cover === 'stone' || sc.cover === 'img' || ['chapter', 'gap', 'mehr', 'contract', 'cases', 'end', 'photo'].includes(sc.type)) && t < sc.e) cov = true;
      if (sc.nosubs && t < sc.e) nosubs = true;
    } else if (sc._root) sc._root.style.display = 'none';
  }
  drawSubs(t, st, cov, nosubs);
};
document.fonts.ready.then(() => { window.READY = true; });
