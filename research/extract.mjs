// Reference extraction helper (Part A research — maintainer tooling, not shipped).
//
// The default export is a SELF-CONTAINED, browser-safe function: it runs INSIDE the
// page via the Playwright MCP's `browser_evaluate`, using only browser APIs
// (window, document, getComputedStyle, getBoundingClientRect). It takes no arguments
// and returns a JSON-serializable object of numeric/structural facts for ONE run
// (one viewport + one scheme). The calling subagent wraps the result with `viewport`
// and `scheme` before writing it into a run of research/raw/<slug>.json (see schema.json).
//
// Qualitative fields (layout.pattern, motion.level, component notes) are NOT produced
// here — they are added by the subagent's judgment. Font families are reported as a
// CLASSIFICATION (sans/serif/mono/display) only, never by name.
//
// Usage:
//   node research/extract.mjs          -> prints the function source to paste into browser_evaluate
//   import extract from './extract.mjs' -> the function itself

const extract = () => {
  const safe = (fn, fb) => { try { return fn(); } catch { return fb; } };
  const freq = (arr) => { const m = {}; for (const v of arr) { if (v == null) continue; m[v] = (m[v] || 0) + 1; } return m; };
  const median = (arr) => { if (!arr.length) return null; const s = arr.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const classifyFamily = (fam = '') => {
    const f = fam.toLowerCase();
    if (/mono|consol|courier|menlo|monaco/.test(f)) return 'mono';
    if (/serif/.test(f) && !/sans/.test(f)) return 'serif';
    if (/display|headline|cursive|fantasy/.test(f)) return 'display';
    return 'sans';
  };

  const all = Array.from(document.querySelectorAll('*'));
  const MAX = 4000;
  const step = all.length > MAX ? Math.ceil(all.length / MAX) : 1;
  const sampled = step === 1 ? all : all.filter((_, i) => i % step === 0);
  const vis = sampled.filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity !== 0;
  });

  const pick = (sel) => document.querySelector(sel);
  const colorOf = (el) => { if (!el) return null; const s = getComputedStyle(el); return { color: s.color, background: s.backgroundColor, border: s.borderTopColor }; };
  const buttons = vis.filter((el) => el.tagName === 'BUTTON' || (el.tagName === 'A' && el.getAttribute('role') === 'button') || el.matches('[class*=btn],[class*=button]'));
  const primaryBtn = buttons.sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return (rb.width * rb.height) - (ra.width * ra.height); })[0] || null;

  const out = {};

  out.cssVars = safe(() => {
    const vars = {};
    for (const scope of [document.documentElement, document.body]) {
      if (!scope) continue;
      const s = getComputedStyle(scope);
      for (let i = 0; i < s.length; i++) { const p = s[i]; if (p.startsWith('--')) vars[p] = s.getPropertyValue(p).trim(); }
    }
    return vars;
  }, {});

  out.roleColors = safe(() => ({
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyText: getComputedStyle(document.body).color,
    h1: colorOf(pick('h1')), h2: colorOf(pick('h2')), h3: colorOf(pick('h3')),
    primaryButton: colorOf(primaryBtn),
    link: colorOf(pick('a[href]')),
    card: colorOf(pick('[class*=card],article,section')),
    border: primaryBtn ? getComputedStyle(primaryBtn).borderTopColor : null,
    input: colorOf(pick('input,textarea,select'))
  }), {});

  out.colorArea = safe(() => {
    const areas = {};
    for (const el of vis) {
      const r = el.getBoundingClientRect();
      const a = r.width * r.height;
      if (a <= 0) continue;
      const bg = getComputedStyle(el).backgroundColor;
      if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') continue;
      areas[bg] = (areas[bg] || 0) + a;
    }
    return Object.fromEntries(Object.entries(areas).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => [k, Math.round(v)]));
  }, {});

  out.typography = safe(() => {
    const sizes = [], weights = [], lhs = [], ls = [], fams = {};
    for (const el of vis) {
      const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      const s = getComputedStyle(el);
      sizes.push(s.fontSize); weights.push(s.fontWeight); lhs.push(s.lineHeight); ls.push(s.letterSpacing);
      const c = classifyFamily(s.fontFamily); fams[c] = (fams[c] || 0) + 1;
    }
    return { fontSize: freq(sizes), fontWeight: freq(weights), lineHeight: freq(lhs), letterSpacing: freq(ls), familyClass: fams };
  }, {});

  out.spacing = safe(() => {
    const vals = [];
    const props = ['marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'gap', 'rowGap', 'columnGap'];
    for (const el of vis) { const s = getComputedStyle(el); for (const p of props) { const v = parseFloat(s[p]); if (!isNaN(v) && v > 0 && v <= 200) vals.push(Math.round(v)); } }
    const f = freq(vals);
    const common = Object.entries(f).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => +k).filter(Boolean);
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const base = common.length ? common.reduce((g, v) => gcd(g, v)) : null;
    return { freq: f, base, scale: [...new Set(common)].sort((a, b) => a - b) };
  }, {});

  out.radius = safe(() => {
    const vals = [];
    for (const el of vis) { const n = parseFloat(getComputedStyle(el).borderTopLeftRadius); if (!isNaN(n) && n > 0) vals.push(Math.round(n)); }
    return freq(vals);
  }, {});

  out.shadows = safe(() => {
    const set = new Set();
    for (const el of vis) { const v = getComputedStyle(el).boxShadow; if (v && v !== 'none') set.add(v); }
    const list = [...set];
    return { levels: list.length, values: list.slice(0, 10) };
  }, { levels: 0, values: [] });

  out.motion = safe(() => {
    const td = new Set(), ad = new Set(), ease = new Set();
    for (const el of vis.slice(0, 1500)) {
      const s = getComputedStyle(el);
      if (s.transitionDuration && s.transitionDuration !== '0s') s.transitionDuration.split(',').forEach((x) => td.add(x.trim()));
      if (s.animationDuration && s.animationDuration !== '0s') s.animationDuration.split(',').forEach((x) => ad.add(x.trim()));
      if (s.transitionTimingFunction) s.transitionTimingFunction.split(',').forEach((x) => ease.add(x.trim()));
    }
    return { transitionDurations: [...td].slice(0, 10), animationDurations: [...ad].slice(0, 10), easings: [...ease].slice(0, 10) };
  }, {});

  out.layout = safe(() => {
    const landmarks = {};
    for (const t of ['header', 'nav', 'aside', 'main', 'footer']) landmarks[t] = document.querySelectorAll(t).length;
    const main = document.querySelector('main') || document.body;
    const maxContentWidth = Math.round(main.getBoundingClientRect().width);
    const sidebar = Array.from(document.querySelectorAll('aside,nav')).some((el) => { const r = el.getBoundingClientRect(); return r.height > r.width * 1.5 && r.left < window.innerWidth * 0.33 && r.height > 200; });
    const grids = vis.filter((el) => getComputedStyle(el).display.includes('grid')).map((el) => { const t = getComputedStyle(el).gridTemplateColumns; return t && t !== 'none' ? t.split(' ').length : 0; }).filter(Boolean);
    return { landmarks, sidebar, maxContentWidth, gridColumns: freq(grids) };
  }, {});

  out.components = safe(() => ({
    tables: document.querySelectorAll('table,[role=table],[role=grid]').length,
    inputs: document.querySelectorAll('input,textarea,select').length,
    forms: document.querySelectorAll('form').length,
    cards: document.querySelectorAll('[class*=card]').length,
    tabs: document.querySelectorAll('[role=tab],[class*=tab]').length,
    modals: document.querySelectorAll('[role=dialog],[aria-modal=true],[class*=modal]').length,
    charts: document.querySelectorAll('svg,canvas').length,
    badges: document.querySelectorAll('[class*=badge],[class*=chip],[class*=tag]').length
  }), {});

  out.density = safe(() => {
    const ctl = [];
    for (const el of vis) { if (el.matches('button,input,select,[role=button],a[class*=btn]')) { const h = el.getBoundingClientRect().height; if (h > 0 && h < 120) ctl.push(Math.round(h)); } }
    const rows = [];
    for (const el of document.querySelectorAll('tr,[role=row]')) { const h = el.getBoundingClientRect().height; if (h > 0 && h < 120) rows.push(Math.round(h)); }
    return { controlHeight: median(ctl), rowHeight: median(rows), baseFontSize: parseFloat(getComputedStyle(document.body).fontSize) };
  }, {});

  out.breakpoints = safe(() => {
    const set = new Set();
    for (const ss of Array.from(document.styleSheets)) {
      let rules;
      try { rules = ss.cssRules; } catch { continue; } // cross-origin stylesheet
      if (!rules) continue;
      for (const r of Array.from(rules)) {
        if (r.type === 4) { const m = (r.conditionText || (r.media && r.media.mediaText) || ''); const found = m.match(/(\d+)px/g); if (found) found.forEach((x) => set.add(parseInt(x, 10))); }
      }
    }
    return [...set].sort((a, b) => a - b);
  }, []);

  out.schemeSignal = safe(() => ({
    prefersDark: !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    htmlColorScheme: getComputedStyle(document.documentElement).colorScheme
  }), {});

  out.meta = { url: location.href, viewport: { w: window.innerWidth, h: window.innerHeight }, sampledElements: vis.length, totalElements: all.length };

  return out;
};

export default extract;

// When run directly with Node, print the function source to paste into browser_evaluate.
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(extract.toString() + '\n');
}
