// Page shell for the Careers page: footer year, sticky header, dropdown menus, the phone menu and the
// scroll reveals. Runs on import.
import { $, $$, reducedMotion, trapTab } from './ui.js';

const yearEl = $('[data-year]');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------------------------------------------------------------- header */
const header = $('[data-header]');
const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 30);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Dropdown menus (Open positions, language)
const dds = $$('[data-dd]');
function closeDropdowns(except) {
  for (const dd of dds) {
    if (dd === except) continue;
    const btn = dd.querySelector('button[aria-expanded]');
    const panel = dd.querySelector('.cr-dd-panel');
    if (btn.getAttribute('aria-expanded') !== 'true') continue;
    btn.setAttribute('aria-expanded', 'false');
    panel.classList.remove('is-open');
    setTimeout(() => { if (btn.getAttribute('aria-expanded') === 'false') panel.hidden = true; }, 220);
  }
}
for (const dd of dds) {
  const btn = dd.querySelector('button[aria-expanded]');
  const panel = dd.querySelector('.cr-dd-panel');
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    closeDropdowns(dd);
    if (open) { closeDropdowns(); return; }
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => panel.classList.add('is-open'));
  });
  dd.addEventListener('keydown', e => {
    const items = $$('.cr-dd-item', panel);
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { closeDropdowns(); btn.focus(); }
    if (e.key === 'ArrowDown' && btn.getAttribute('aria-expanded') === 'true') {
      e.preventDefault();
      const i = items.indexOf(document.activeElement);
      items[(i + 1) % items.length]?.focus();
    }
    if (e.key === 'ArrowUp' && btn.getAttribute('aria-expanded') === 'true') {
      e.preventDefault();
      const i = items.indexOf(document.activeElement);
      items[(i - 1 + items.length) % items.length]?.focus();
    }
  });
  panel.addEventListener('click', e => { if (e.target.closest('a, [data-close-dd]')) closeDropdowns(); });
}
document.addEventListener('pointerdown', e => { if (!e.target.closest('[data-dd]')) closeDropdowns(); });

// Mobile menu
const mnav = $('#cr-mnav');
const menuBtn = $('[data-menu-open]');
function openMenu() {
  mnav.hidden = false;
  menuBtn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { mnav.classList.add('is-open'); $('.cr-mnav-panel button', mnav)?.focus(); });
}
function closeMenu({ restoreFocus = true } = {}) {
  if (mnav.hidden) return;
  mnav.classList.remove('is-open');
  menuBtn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
  setTimeout(() => { mnav.hidden = true; }, 380);
  if (restoreFocus) menuBtn.focus();
}
menuBtn.addEventListener('click', openMenu);
mnav.addEventListener('click', e => {
  if (e.target.closest('[data-menu-close]')) closeMenu();
  else if (e.target.closest('a')) closeMenu({ restoreFocus: false });
});
mnav.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); trapTab($('.cr-mnav-panel', mnav), e); });
const MENU_MAX = Number(header.dataset.menuMax || 1139);   // widest window that shows the menu button
addEventListener('resize', () => { if (innerWidth > MENU_MAX) closeMenu({ restoreFocus: false }); });

/* ---------------------------------------------------------------- reveals */
// Reveal once at ~85% viewport entry. Connector artwork draws when its stage is revealed.
$$('.cr-draw:not(.cr-dash)').forEach(p => p.setAttribute('pathLength', '1'));
const revealIo = new IntersectionObserver(entries => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    en.target.classList.add(en.target.matches('[data-reveal]') ? 'is-in' : 'is-drawn');
    revealIo.unobserve(en.target);
  }
}, { rootMargin: '0px 0px -15% 0px', threshold: 0.01 });
if (reducedMotion()) $$('[data-reveal]').forEach(el => el.classList.add('is-in'));
else $$('[data-reveal]').forEach(el => revealIo.observe(el));
$$('.cr-stage, .cr-swoosh, .cr-pay-path').forEach(el => (reducedMotion() ? el.classList.add('is-drawn') : revealIo.observe(el)));
$$('.cr-swoosh .cr-draw').forEach(p => p.classList.add('cr-draw'));
// Safety net: never leave content hidden if the observer is throttled (e.g. background tabs).
setTimeout(() => $$('[data-reveal]:not(.is-in)').forEach(el => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-in'); }), 1800);
