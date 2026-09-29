// Tiny rendering helpers: auto-escaping template tags, selectors, delegation.

class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);
export const raw = s => new Raw(String(s ?? ''));

function flat(v) {
  if (v == null || v === false || v === true) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(flat).join('');
  return esc(v);
}

/** Escapes interpolated values unless wrapped in raw() or produced by html``.
 *  Booleans inside an attribute value (e.g. aria-pressed="${on}") render as "true"/"false";
 *  elsewhere they render as nothing, so `${cond && html`…`}` is safe. */
export function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    const inAttr = typeof v === 'boolean' && /=["']$/.test(strings[i]);
    out += (inAttr ? String(v) : flat(v)) + strings[i + 1];
  }
  return new Raw(out);
}

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

/** Delegated listener; returns an unsubscribe function. */
export function on(root, type, selector, handler, opts) {
  const fn = e => {
    const t = e.target.closest?.(selector);
    if (t && root.contains(t)) handler(e, t);
  };
  root.addEventListener(type, fn, opts);
  return () => root.removeEventListener(type, fn, opts);
}

export function mount(el, content) {
  el.innerHTML = content instanceof Raw ? content.s : String(content ?? '');
  return el;
}

export const icon = (name, cls = '') => raw(`<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`);

export function cx(...parts) {
  return parts.flat().filter(Boolean).join(' ');
}

/** Image with graceful fallback to a local photograph (or a soft gradient). */
export function img(src, { alt = '', cls = '', fallback = '', lazy = true, w, h, sizes } = {}) {
  const fb = fallback ? `assets/img/${fallback}.webp` : '';
  return raw(`<img src="${esc(src || fb)}" alt="${esc(alt)}" class="${esc(cls)}"${lazy ? ' loading="lazy" decoding="async"' : ''}${w ? ` width="${w}"` : ''}${h ? ` height="${h}"` : ''}${sizes ? ` sizes="${esc(sizes)}"` : ''} data-fallback="${esc(fb)}">`);
}

// Image fallbacks without inline onerror handlers (the Content-Security-Policy blocks those):
// data-fallback="url" swaps in a local photo, data-fallback="" hides the image, data-remove-on-error drops it.
if (typeof document !== 'undefined') {
  document.addEventListener('error', e => {
    const im = e.target;
    if (!(im instanceof HTMLImageElement)) return;
    if ('removeOnError' in im.dataset) { im.remove(); return; }
    if (!('fallback' in im.dataset)) return;
    const fb = im.dataset.fallback;
    delete im.dataset.fallback;
    if (fb) im.src = fb;
    else { im.style.visibility = 'hidden'; im.parentElement?.classList.add('img-fallback'); }
  }, true);
}

export function debounce(fn, ms = 150) {
  let t = 0;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export const isMobile = () => matchMedia('(max-width: 759px)').matches;
export const isTouchNav = () => matchMedia('(max-width: 959px)').matches;
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Observe .reveal elements inside root and add .is-in when they enter. */
export function reveal(root = document) {
  const els = $$('.reveal:not(.is-in)', root);
  if (!els.length) return () => {};
  if (!('IntersectionObserver' in window) || reducedMotion()) {
    els.forEach(e => e.classList.add('is-in'));
    return () => {};
  }
  let pending = els.slice();
  const show = e => { e.classList.add('is-in'); io.unobserve(e); };
  const io = new IntersectionObserver(entries => {
    for (const en of entries) if (en.isIntersecting) show(en.target);
  }, { rootMargin: '0px 0px 4% 0px', threshold: 0 });
  els.forEach(e => io.observe(e));
  // Belt and braces: a throttled scroll check so fast scrolling never lands on empty space.
  let raf = 0;
  const sweep = () => {
    raf = 0;
    pending = pending.filter(e => {
      if (e.classList.contains('is-in') || !e.isConnected) return false;
      if (e.getBoundingClientRect().top < innerHeight * 1.05) { show(e); return false; }
      return true;
    });
    if (!pending.length) removeEventListener('scroll', onScroll);
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(sweep); };
  addEventListener('scroll', onScroll, { passive: true });
  const t = setTimeout(sweep, 1200);
  return () => { io.disconnect(); clearTimeout(t); cancelAnimationFrame(raf); removeEventListener('scroll', onScroll); };
}

export function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
  return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch { return false; }
}
