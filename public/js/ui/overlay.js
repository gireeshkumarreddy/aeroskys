// Modal, bottom-sheet and anchored-popover primitives.
// On phones every overlay becomes a sheet and the hardware back button closes it.
import { html, raw, icon, isMobile } from '../core/dom.js';
import { setSheetCloser } from '../core/router.js';

const root = () => document.getElementById('overlay-root');
const stack = [];
let seq = 0;

/** Pop `n` sheet-owned history entries; navigation waits until the step lands (see router.go). */
function stepBack(n) {
  const p = new Promise(res => {
    const done = () => {
      removeEventListener('popstate', done); clearTimeout(t);
      if (window.__aeroskysPendingBack === p) window.__aeroskysPendingBack = null;
      res();
    };
    const t = setTimeout(done, 600);
    addEventListener('popstate', done);
  });
  window.__aeroskysPendingBack = p;
  if (n === 1) history.back(); else history.go(-n);
}

function lockScroll() {
  if (stack.some(o => o.locks)) document.body.classList.add('no-scroll');
  else document.body.classList.remove('no-scroll');
}

function focusables(el) {
  return [...el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null || x === document.activeElement);
}

function makeOverlay({ locks = true, pushHistory = isMobile(), onClose }) {
  const id = ++seq;
  const wrap = document.createElement('div');
  wrap.className = 'ovl';
  wrap.dataset.ovl = id;
  const returnFocus = document.activeElement;
  const o = {
    id, wrap, locks, closed: false, pushed: false,
    close(fromPop = false) {
      if (o.closed) return;
      o.closed = true;
      const i = stack.indexOf(o);
      if (i >= 0) stack.splice(i, 1);
      wrap.classList.remove('is-open');
      wrap.style.pointerEvents = 'none'; // no clicks land on an overlay while it fades out
      lockScroll();
      document.removeEventListener('keydown', o.onKey, true);
      document.removeEventListener('pointerdown', o.onOutside, true);
      removeEventListener('resize', o.onResize);
      removeEventListener('scroll', o.onScroll, true);
      setTimeout(() => wrap.remove(), 280);
      if (o.pushed && !fromPop && history.state && history.state.ovl === id) stepBack(1);
      try { onClose?.(); } catch (e) { console.error(e); }
      if (returnFocus && document.contains(returnFocus) && !fromPop) returnFocus.focus?.({ preventScroll: true });
    },
    onKey(e) {
      if (stack[stack.length - 1] !== o) return;
      if (e.key === 'Escape') { e.preventDefault(); o.close(); return; }
      if (e.key === 'Tab' && o.trap) {
        const f = focusables(o.trap);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  };
  stack.push(o);
  root().appendChild(wrap);
  if (pushHistory) {
    history.pushState({ ...(history.state || {}), ovl: id }, '', location.href);
    o.pushed = true;
  }
  document.addEventListener('keydown', o.onKey, true);
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('is-open')));
  lockScroll();
  return o;
}

// Each pushed overlay owns one history entry ({ ovl: id }). A back step closes only the
// overlays newer than the entry it lands on, so closing a picker never closes its parent sheet.
addEventListener('popstate', e => {
  const cur = (e.state && e.state.ovl) || 0;
  for (let top = stack[stack.length - 1]; top && top.pushed && top.id > cur; top = stack[stack.length - 1]) top.close(true);
  // Back on the page's own entry: apply a query change the view made while a sheet was open.
  const h = window.__aeroskysDeferredHash;
  if (h && !cur) { window.__aeroskysDeferredHash = null; if (h !== location.hash) history.replaceState(e.state, '', h); }
});
addEventListener('hashchange', () => { window.__aeroskysDeferredHash = null; while (stack.length) stack[stack.length - 1].close(true); });

/** Close every overlay; sheets that own history entries are popped in a single step. */
export function closeAll() {
  const owned = stack.filter(o => o.pushed).length;
  const pop = owned && history.state && history.state.ovl && !window.__aeroskysPendingBack;
  while (stack.length) stack[stack.length - 1].close(true);
  if (pop) stepBack(owned);
}
setSheetCloser(closeAll);

/**
 * Centered modal on desktop, bottom sheet on phones.
 * opts: { title, body, foot, size: 'md'|'wide'|'full', fullscreen, className, onOpen(el, api), onClose }
 */
export function openModal(opts) {
  const o = makeOverlay({ onClose: opts.onClose });
  const cls = ['modal', opts.size === 'wide' && 'is-wide', opts.size === 'full' && 'is-full', opts.fullscreen && 'is-fullscreen', opts.className].filter(Boolean).join(' ');
  const titleId = `mt-${o.id}`;
  o.wrap.innerHTML = String(html`<div class="ovl-scrim" data-close></div>
    <div class="${cls}" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
      <div class="sheet-handle" aria-hidden="true"></div>
      ${opts.title !== false ? html`<div class="modal-head"><h2 id="${titleId}">${opts.title || ''}</h2><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>` : html`<h2 id="${titleId}" class="sr-only">${opts.label || 'Dialog'}</h2>`}
      <div class="modal-body">${opts.body instanceof Object ? opts.body : raw(opts.body || '')}</div>
      ${opts.foot ? html`<div class="modal-foot">${opts.foot}</div>` : ''}
    </div>`);
  const dlg = o.wrap.querySelector('.modal');
  o.trap = dlg;
  o.wrap.addEventListener('click', e => { if (e.target.closest('[data-close]')) o.close(); });
  const api = {
    el: dlg, body: dlg.querySelector('.modal-body'), close: () => o.close(),
    setBody(content) { api.body.innerHTML = String(content); },
    setFoot(content) { let f = dlg.querySelector('.modal-foot'); if (!f) { f = document.createElement('div'); f.className = 'modal-foot'; dlg.appendChild(f); } f.innerHTML = String(content); }
  };
  opts.onOpen?.(dlg, api);
  setTimeout(() => {
    const auto = dlg.querySelector('[data-autofocus]') || focusables(dlg.querySelector('.modal-body'))[0] || dlg.querySelector('[data-close]');
    auto?.focus({ preventScroll: true });
  }, 60);
  return api;
}

/**
 * Anchored popover on desktop; full-screen sheet on phones.
 * opts: { content, width, title (mobile header), onOpen(el, api), onClose, align: 'left'|'right' }
 */
export function openPopover(anchor, opts) {
  if (isMobile()) {
    return openModal({ title: opts.title || '', body: opts.content, fullscreen: opts.mobileFull !== false, className: 'picker-sheet', onOpen: opts.onOpen, onClose: opts.onClose });
  }
  // Close sibling popovers first; one anchored picker at a time.
  [...stack].filter(s => s.popover).forEach(s => s.close());
  const o = makeOverlay({ locks: false, pushHistory: false, onClose: opts.onClose });
  o.popover = true;
  o.wrap.classList.add('popover-mode');
  o.wrap.innerHTML = `<div class="popover" role="dialog" aria-modal="false"></div>`;
  const pop = o.wrap.querySelector('.popover');
  pop.innerHTML = String(opts.content);
  if (opts.width) pop.style.width = typeof opts.width === 'number' ? opts.width + 'px' : opts.width;
  o.trap = pop;
  const place = () => {
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight, vw = innerWidth, vh = innerHeight;
    let left = opts.align === 'right' ? r.right - w : r.left;
    left = Math.max(12, Math.min(left, vw - w - 12));
    let top = r.bottom + 8;
    if (top + h > vh - 12 && r.top - h - 8 > 12) top = r.top - h - 8;
    pop.style.left = left + 'px';
    pop.style.top = Math.max(12, top) + 'px';
  };
  o.onResize = place;
  o.onScroll = e => { if (!pop.contains(e.target)) place(); };
  o.onOutside = e => { if (!pop.contains(e.target) && !anchor.contains(e.target)) o.close(); };
  addEventListener('resize', o.onResize);
  addEventListener('scroll', o.onScroll, true);
  document.addEventListener('pointerdown', o.onOutside, true);
  anchor.classList.add('is-open');
  const prevClose = o.close;
  o.close = (fromPop) => { anchor.classList.remove('is-open'); prevClose(fromPop); };
  const api = { el: pop, close: () => o.close(), place };
  opts.onOpen?.(pop, api);
  place();
  requestAnimationFrame(place);
  setTimeout(() => (pop.querySelector('[data-autofocus]') || focusables(pop)[0])?.focus({ preventScroll: true }), 30);
  return api;
}

/** Simple confirm dialog returning a promise<boolean>. */
export function confirmDialog({ title, message, confirm = 'Confirm', cancel = 'Cancel', danger = false }) {
  return new Promise(resolve => {
    let done = false;
    const m = openModal({
      title, body: html`<p class="lead" style="font-size:.95rem">${message}</p>`,
      foot: html`<button class="btn btn-light" data-no>${cancel}</button><button class="btn ${danger ? 'btn-dark' : 'btn-primary'}" data-yes>${confirm}</button>`,
      onClose: () => { if (!done) resolve(false); }
    });
    m.el.querySelector('[data-yes]').addEventListener('click', () => { done = true; resolve(true); m.close(); });
    m.el.querySelector('[data-no]').addEventListener('click', () => { done = true; resolve(false); m.close(); });
  });
}
