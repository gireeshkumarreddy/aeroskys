// Aeroskys Careers — page behaviour: section navigation and the interactive pieces of each section.
// The header, menus and reveals live in shell.js; the application itself in apply.js.
import { $, $$, esc, icon, inr, reducedMotion, scrollToEl } from './ui.js';
import { initApply } from './apply.js';
import './shell.js';

// Active top-level nav item follows the section in view
const SPY = [['roles', 'roles'], ['direction', 'life'], ['the-role', 'life'], ['pay', 'pay'], ['profile', 'life'], ['hr-role', 'roles'], ['how-we-hire', 'hire'], ['apply', null]];
const spyLinks = $$('[data-nav]');
const spyIo = new IntersectionObserver(entries => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    const key = SPY.find(([id]) => id === en.target.id)?.[1];
    spyLinks.forEach(l => l.classList.toggle('is-active', l.dataset.nav === key));
  }
}, { rootMargin: '-45% 0px -50% 0px' });
SPY.forEach(([id]) => { const s = document.getElementById(id); if (s) spyIo.observe(s); });


/* ---------------------------------------------------------------- section navigators */
const NUMBERED = ['direction', 'the-role', 'pay', 'profile', 'hr-role', 'how-we-hire', 'apply'];
const pad = n => String(n).padStart(2, '0');
function goSection(id) { scrollToEl(document.getElementById(id)); }
for (const nav of $$('[data-secnav]')) {
  const id = nav.dataset.secnav;
  const i = NUMBERED.indexOf(id);
  const isHire = nav.hasAttribute('data-hire-nav');
  nav.innerHTML = `
    <span class="cr-secnav-count" data-secnav-count>${isHire ? '01 / 04' : `${pad(i + 1)} / ${pad(NUMBERED.length)}`}</span>
    <span class="cr-secnav-slash" aria-hidden="true"></span>
    <button class="cr-secnav-down" type="button" data-go="next">${isHire ? 'Next step' : 'Scroll down'}</button>
    <span class="cr-secnav-bar" aria-hidden="true"><i style="width:${isHire ? 25 : ((i + 1) / NUMBERED.length) * 100}%" data-secnav-bar></i></span>
    <span class="cr-secnav-btns">
      <button class="cr-secnav-btn" type="button" data-go="prev" aria-label="${isHire ? 'Previous hiring step' : 'Previous section'}">${icon('arrow-left')}</button>
      <button class="cr-secnav-btn" type="button" data-go="next" aria-label="${isHire ? 'Next hiring step' : 'Next section'}">${icon('arrow-right')}</button>
    </span>`;
  nav.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (!b) return;
    const dir = b.dataset.go === 'next' ? 1 : -1;
    if (isHire && hire.step(dir)) return;           // move through the four steps first
    const j = i + dir;
    goSection(j < 0 ? 'roles' : NUMBERED[Math.min(j, NUMBERED.length - 1)]);
  });
}

/* ---------------------------------------------------------------- landing: "+" details */
const plus = $('.cr-hero-plus');
const more = $('#hero-more');
function setMore(open) {
  plus.setAttribute('aria-expanded', String(open));
  if (open) { more.hidden = false; requestAnimationFrame(() => more.classList.add('is-open')); }
  else { more.classList.remove('is-open'); setTimeout(() => { if (plus.getAttribute('aria-expanded') === 'false') more.hidden = true; }, 260); }
}
plus.addEventListener('click', () => setMore(plus.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('pointerdown', e => { if (!e.target.closest('.cr-hero-float')) setMore(false); });
more.addEventListener('keydown', e => { if (e.key === 'Escape') { setMore(false); plus.focus(); } });
more.addEventListener('click', e => { if (e.target.closest('a')) setMore(false); });

/* ---------------------------------------------------------------- "Read our story" dialog */
for (const b of $$('[data-open-dialog]')) {
  const dlg = document.getElementById('dialog-' + b.dataset.openDialog);
  b.addEventListener('click', () => { dlg.opener = b; if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  // Return focus to the button that opened it (Safari does not focus buttons on click).
  dlg.addEventListener('close', () => dlg.opener?.focus({ preventScroll: true }));
}

/* ---------------------------------------------------------------- performance pay calculator */
// Bands from the client's pay table (Performance Pay reference screen).
const BANDS = [
  { min: 0, name: 'Below threshold', bonus: 0 },
  { min: 70, name: 'Developing', bonus: 45000 },
  { min: 90, name: 'On-target', bonus: 60000 },
  { min: 110, name: 'Outperforming', bonus: 80000 },
  { min: 131, name: 'Stretch', bonus: 100000 }
];
const BASE = 42000;
const calc = $('[data-calc]');
if (calc) {
  const range = $('#calc-range', calc), pct = $('#calc-pct', calc);
  const rows = $$('.cr-paytable tbody tr');
  const update = () => {
    const v = Number(range.value);
    const bi = BANDS.reduce((acc, b, i) => (v >= b.min ? i : acc), 0);
    const b = BANDS[bi];
    pct.textContent = v + '%';
    $('[data-calc-level]', calc).textContent = b.name;
    $('[data-calc-bonus]', calc).textContent = inr(b.bonus);
    $('[data-calc-total]', calc).textContent = inr(BASE + b.bonus);
    rows.forEach((r, i) => r.classList.toggle('is-live', i === bi));
    range.setAttribute('aria-valuetext', `${v}% of benchmark: ${b.name}, total ${inr(BASE + b.bonus)} a month`);
  };
  range.addEventListener('input', update);
  update();
}

/* ---------------------------------------------------------------- career ladder tabs */
const tabs = $$('.cr-tabs [role="tab"]');
function selectTab(tab, focus = false) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    panel.hidden = !on;
  }
  if (focus) tab.focus();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      selectTab(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
    }
    if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0], true); }
    if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1], true); }
  });
});

/* ---------------------------------------------------------------- candidate profile check */
const fit = $('[data-fit]');
if (fit) {
  const result = $('[data-fit-result]', fit);
  const boxes = $$('input[type=checkbox]', fit);
  const update = () => {
    const ess = boxes.filter(b => b.closest('[data-kind="essential"]'));
    const pref = boxes.filter(b => b.closest('[data-kind="preferred"]'));
    const e = ess.filter(b => b.checked).length, p = pref.filter(b => b.checked).length;
    if (!e && !p) result.textContent = 'Build a rewarding career';
    else if (e === ess.length) result.textContent = p ? `All ${e} essentials, plus ${p} preferred — apply now` : `All ${e} essentials — you could be a strong fit`;
    else result.textContent = `You’ve ticked ${e} of ${ess.length} essentials${p ? ` and ${p} preferred` : ''}`;
  };
  boxes.forEach(b => b.addEventListener('change', update));
}

/* ---------------------------------------------------------------- HR carousel */
const car = $('[data-carousel]');
if (car) {
  const items = $$('.cr-car-item', car);
  const live = $('[data-car-live]', car);
  const track = $('.cr-car-track', car);
  let active = 2;
  // On small screens the track scrolls sideways: centre the active photo by scrolling the track only, never the page.
  const centre = smooth => {
    if (track.scrollWidth <= track.clientWidth) return;
    const tr = track.getBoundingClientRect(), ir = items[active].getBoundingClientRect();
    track.scrollBy({ left: ir.left + ir.width / 2 - (tr.left + tr.width / 2), behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
  };
  const render = (announce = false) => {
    items.forEach((it, i) => {
      const on = i === active;
      it.classList.toggle('is-active', on);
      it.setAttribute('aria-current', on ? 'true' : 'false');
      let cap = $('.cr-car-cap', it);
      if (on && !cap) {
        it.insertAdjacentHTML('beforeend', `<div class="cr-car-cap"><div><b>${esc(it.dataset.caption)}</b><small>HR &amp; Recruitment</small><p class="cr-car-detail" hidden>${esc(it.dataset.detail)}</p></div>
          <button class="cr-car-plus" type="button" aria-expanded="false" aria-label="More about ${esc(it.dataset.caption)}">${icon('plus')}</button></div>`);
      } else if (!on && cap) cap.remove();
    });
    if (announce) live.textContent = `${items[active].dataset.caption}: ${items[active].dataset.detail}`;
    centre(announce);
  };
  const go = d => { active = (active + d + items.length) % items.length; render(true); };
  $('[data-car-prev]', car).addEventListener('click', () => go(-1));
  $('[data-car-next]', car).addEventListener('click', () => go(1));
  car.addEventListener('click', e => {
    const plusBtn = e.target.closest('.cr-car-plus');
    if (plusBtn) {
      const open = plusBtn.getAttribute('aria-expanded') !== 'true';
      plusBtn.setAttribute('aria-expanded', String(open));
      $('.cr-car-detail', plusBtn.closest('.cr-car-item')).hidden = !open;
      return;
    }
    const it = e.target.closest('.cr-car-item');
    if (it && !it.classList.contains('is-active')) { active = items.indexOf(it); render(true); }
  });
  car.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
  items.forEach((it, i) => { it.tabIndex = 0; it.setAttribute('aria-label', `${it.dataset.caption} (${i + 1} of ${items.length})`); });
  render();
}

/* ---------------------------------------------------------------- how we hire */
const HIRE = [
  ['Written Application', 'Complete the application below. We read your KPI and execution answers first, so bring your latest CV and specific numbers from your track record.'],
  ['Commercial Review', 'A 30-minute call on your track record and the numbers you have personally owned. Be ready to walk us through the figures in your written answers.'],
  ['POD Plan', 'You present your KPI system and first 30-days plan, and we work through it together. Bring your career and commercial plan with a 3/6/9/12-month roadmap.'],
  ['Offer & Benchmark', 'Your offer, assigned pod benchmark and onboarding date are confirmed in writing.']
];
const hire = (() => {
  const root = $('[data-hire]');
  const btns = $$('.cr-hstep', root);
  const panel = $('#hire-panel', root);
  let cur = 0;
  function set(i, focus = false) {
    cur = i;
    btns.forEach((b, j) => { b.setAttribute('aria-selected', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
    panel.setAttribute('aria-labelledby', btns[i].id);
    $('[data-hire-k]', panel).textContent = `Step ${pad(i + 1)} of 04 · ${HIRE[i][0]}`;
    $('[data-hire-t]', panel).textContent = HIRE[i][1];
    const nav = $('[data-hire-nav]');
    if (nav) {
      $('[data-secnav-count]', nav).textContent = `${pad(i + 1)} / 04`;
      $('[data-secnav-bar]', nav).style.width = `${((i + 1) / 4) * 100}%`;
      $('.cr-secnav-down', nav).textContent = i === 3 ? 'Start your application' : 'Next step';
    }
    panel.animate?.([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: reducedMotion() ? 0 : 320, easing: 'cubic-bezier(.22,1,.36,1)' });
    if (focus) btns[i].focus();
  }
  btns.forEach((b, i) => {
    b.addEventListener('click', () => set(i));
    b.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); set((i + 1) % 4, true); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); set((i + 3) % 4, true); }
    });
  });
  return {
    /** Move one step; returns false when already at the first/last step. */
    step(d) { const n = cur + d; if (n < 0 || n > 3) return false; set(n); return true; }
  };
})();

/* ---------------------------------------------------------------- application */
const apply = initApply($('[data-apply]'), $('[data-rolepick]'));
// "Apply as …" links anywhere on the page preselect the role before scrolling to the form.
document.addEventListener('click', e => {
  const a = e.target.closest('[data-apply-role]');
  if (a) apply.setRole(a.dataset.applyRole, { fromLink: true });
});
