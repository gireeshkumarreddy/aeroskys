// Small DOM helpers shared by the careers scripts.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ENT[c]);

export const icon = (name, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="careers/icons.svg?v=5#i-${name}"/></svg>`;

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');

export function debounce(fn, ms) {
  let t = 0;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  return d;
}

/** Scroll an element into view below the sticky header, respecting reduced motion. */
export function scrollToEl(el, offset = 0) {
  if (!el) return;
  const header = document.querySelector('[data-header]');
  const top = el.getBoundingClientRect().top + scrollY - (header ? 110 : 20) - offset;
  scrollTo({ top: Math.max(0, top), behavior: reducedMotion() ? 'auto' : 'smooth' });
}

/** Brief status message; also announced to screen readers through the live region. */
export function toast(message, { iconName = 'check-circle', timeout = 4200 } = {}) {
  const root = $('.cr-toasts');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'cr-toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `${icon(iconName)}<span>${esc(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 300); }, timeout);
}

/** Wide tables scroll sideways inside their box on small screens: while one does, it becomes a named,
 *  keyboard-focusable region so it can be scrolled without a mouse. */
export function scrollRegions(root = document) {
  for (const box of root.querySelectorAll('.cr-table-wrap')) {
    if (box.scrollWidth > box.clientWidth + 1) {
      box.tabIndex = 0;
      box.setAttribute('role', 'region');
      box.setAttribute('aria-label', box.querySelector('caption')?.textContent.trim() || 'Table');
    } else if (box.hasAttribute('role')) {
      box.removeAttribute('tabindex'); box.removeAttribute('role'); box.removeAttribute('aria-label');
    }
  }
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
/** Keep Tab / Shift+Tab inside a container (used by the mobile menu). */
export function trapTab(container, e) {
  if (e.key !== 'Tab') return;
  const f = $$(FOCUSABLE, container).filter(x => x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
