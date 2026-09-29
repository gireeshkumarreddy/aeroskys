// Hash router: works on any static host without rewrite rules.

const routes = [];
const hooks = { before: new Set(), after: new Set() };
const scrollMemo = new Map();
let navToken = 0;
let cleanup = null;
let forward = false;
let current = null;

export function route(pattern, loader, opts = {}) {
  const keys = [];
  const src = pattern.replace(/[.+*?^${}()|[\]\\]/g, '\\$&').replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; });
  routes.push({ pattern, re: new RegExp('^' + src + '/?$'), keys, loader, opts });
}

export function parseHash(h = location.hash) {
  const s = decodeURI(h.replace(/^#/, '')) || '/';
  const i = s.indexOf('?');
  const path = (i < 0 ? s : s.slice(0, i)) || '/';
  return { path, query: new URLSearchParams(i < 0 ? '' : s.slice(i + 1)), raw: s };
}

export function href(path, query) {
  const qs = query ? new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])).toString() : '';
  return '#' + path + (qs ? '?' + qs : '');
}

// A phone sheet closes with an async history.back(); navigating before it lands would be undone.
const pendingBack = () => window.__aeroskysPendingBack || null;
// Phone sheets own a history entry ({ ovl }). overlay.js registers how to close them.
const sheetOwnsEntry = () => !!(history.state && history.state.ovl);
let closeSheets = null;
export const setSheetCloser = fn => { closeSheets = fn; };
// Close open sheets before navigating so the new page is pushed after the entry they were
// opened from; otherwise Back from the new page would land on a sheet's leftover entry.
const leaveSheets = () => { if (!pendingBack() && sheetOwnsEntry() && closeSheets) closeSheets(); };

export async function go(path, { query, replace = false } = {}) {
  leaveSheets();
  const wait = pendingBack();
  if (wait) { await wait; window.__aeroskysPendingBack = null; }
  const h = href(path, query);
  scrollMemo.set(location.hash, scrollY);
  forward = true;
  if (replace) { history.replaceState(history.state, '', h); resolve(); }
  else if (location.hash === h) resolve();
  else location.hash = h;
}

/**
 * Update the query string of the current view without re-rendering it. Returns the new hash.
 * While a phone sheet owns the current history entry, closing the sheet steps back to the entry
 * below and would drop the change, so the URL is held and applied once the sheet has closed.
 */
export function setQuery(patch) {
  const { path, query } = parseHash((sheetOwnsEntry() && window.__aeroskysDeferredHash) || location.hash);
  for (const [k, v] of Object.entries(patch)) (v === undefined || v === null || v === '') ? query.delete(k) : query.set(k, v);
  const qs = query.toString();
  const h = '#' + path + (qs ? '?' + qs : '');
  if (sheetOwnsEntry()) window.__aeroskysDeferredHash = h;
  else history.replaceState(history.state, '', h);
  if (current) current.query = query;
  return h;
}

export const onBefore = fn => (hooks.before.add(fn), () => hooks.before.delete(fn));
export const onAfter = fn => (hooks.after.add(fn), () => hooks.after.delete(fn));
export const currentRoute = () => current;

function match(path) {
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) return { r, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

export async function resolve() {
  const { path, query, raw } = parseHash();
  const found = match(path) || match('/404');
  if (!found) return;
  const token = ++navToken;
  const ctx = { path, query, raw, params: found.params, opts: found.r.opts };
  try { cleanup?.(); } catch { /* ignore teardown errors */ }
  cleanup = null;
  current = ctx;
  hooks.before.forEach(fn => fn(ctx));
  const main = document.getElementById('main');
  try {
    const mod = await found.r.loader();
    if (token !== navToken) return;
    main.classList.remove('view-enter');
    void main.offsetWidth;
    main.classList.add('view-enter');
    // Each view gets a fresh host so listeners bound to it never leak into the next page.
    const host = document.createElement('div');
    host.className = 'view';
    main.replaceChildren(host);
    const res = await mod.default(host, ctx);
    if (token !== navToken) { if (typeof res === 'function') res(); return; }
    cleanup = typeof res === 'function' ? res : null;
  } catch (err) {
    console.error(err);
    if (token !== navToken) return;
    main.innerHTML = `<section class="page"><div class="wrap-narrow"><div class="empty"><svg class="i" aria-hidden="true"><use href="#i-alert"/></svg><h3>Something went wrong</h3><p>This page could not be shown. Please go back and try again.</p><a class="btn btn-primary" href="#/">Back to home</a></div></div></section>`;
  }
  const saved = scrollMemo.get(location.hash);
  if (!forward && saved != null) requestAnimationFrame(() => scrollTo(0, saved));
  else scrollTo({ top: 0, behavior: 'instant' });
  forward = false;
  hooks.after.forEach(fn => fn(ctx));
  const focusTarget = main.querySelector('[data-autofocus]');
  if (focusTarget) focusTarget.focus({ preventScroll: true });
}

export function start() {
  addEventListener('hashchange', resolve);
  document.addEventListener('click', e => {
    const a = e.target.closest?.('a[href^="#/"],a[href="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    scrollMemo.set(location.hash, scrollY);
    forward = true;
    leaveSheets();
    const wait = pendingBack();
    if (wait) {
      // A sheet was just closed by this click; follow the link once its history step lands.
      e.preventDefault();
      const target = a.getAttribute('href');
      wait.then(() => { window.__aeroskysPendingBack = null; forward = true; if (location.hash !== target) location.hash = target; else resolve(); });
      return;
    }
    if (a.getAttribute('href') === location.hash || (a.getAttribute('href') === '#/' && (location.hash === '' || location.hash === '#'))) {
      e.preventDefault();
      scrollTo({ top: 0, behavior: 'smooth' });
      forward = false;
    }
  });
  if (!location.hash) history.replaceState(null, '', '#/');
  resolve();
}
