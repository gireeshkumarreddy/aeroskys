// Aeroskys Careers — page behaviour. The page has two views:
//   /careers                     the landing, the 15 open positions, life at Aeroskys and how we hire
//   /careers?position=<key>      one designation: its role page, how we hire, and its application
// Every designation follows the same sequence (role → pay → how we hire → apply). The header, menus and
// reveals live in shell.js; the application itself in apply.js; the roles in roles.js.
import { $, $$, esc, icon, inr, reducedMotion, scrollToEl, scrollRegions, debounce } from './ui.js';
import { ROLES, ROLE_ORDER, isRole, EXEC_NOTE, EXEC_FOOTNOTE } from './roles.js';
import { initApply } from './apply.js';
import './shell.js';

const HOME_TITLE = document.title;
const pad = n => String(n).padStart(2, '0');
// Links from the earlier one-role page (#pay, #hr-role …) open the designation they belong to.
const LEGACY = { roles: 'tag', 'the-role': 'tag', pay: 'tag', ladder: 'tag', profile: 'tag', 'hr-role': 'hr', 'hr-details': 'hr' };
// The sections of each view, in order (for the section navigators and the nav highlight).
const pageOf = key => ({ tag: 'tag', hr: 'hr' }[ROLES[key].details.page] || 'generic');
const SEQUENCE = {
  home: ['top', 'positions', 'direction', 'how-we-hire'],
  tag: ['roles', 'the-role', 'pay', 'profile', 'how-we-hire', 'apply'],
  hr: ['hr-role', 'how-we-hire', 'apply'],
  generic: ['role', 'how-we-hire', 'apply']
};
const DETAILS = { tag: 'the-role', hr: 'hr-details', generic: 'role-details' };
const TITLE = { tag: 'roles-title', hr: 'hr-title', generic: 'role-title' };

let current = null;                       // the open designation, or null on the landing
const apply = initApply($('[data-apply]'));
const urlRole = () => { const p = new URLSearchParams(location.search).get('position'); return isRole(p) ? p : null; };
const view = () => (current ? pageOf(current) : 'home');

/* ---------------------------------------------------------------- role pages (positions 02, 04–15) */
function chips(list) { return `<ul class="cr-tags" aria-label="About the role">${list.map((c, i) => `<li${i === 0 ? ' class="is-blue"' : ''}>${esc(c)}</li>`).join('')}</ul>`; }
function compCard(c) {
  return `<div class="cr-comp" role="group" aria-labelledby="comp-k">
    <p class="cr-comp-k" id="comp-k">${esc(c.label)}</p>
    <p class="cr-comp-fig">${esc(c.figure)} <span>${esc(c.unit)}</span></p>
    <p class="cr-comp-line">${esc(c.line)}</p>
    ${c.rows?.length ? `<dl class="cr-comp-rows">${c.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
    <p class="cr-comp-note">${icon('info')}<span>${esc(c.note)}</span></p>
  </div>`;
}
function roleHead(r, { lead, tags, comp, note = '' }) {
  return `<div class="cr-wrap cr-rolehead">
    <div class="cr-rolehead-copy">
      <p class="cr-eyebrow is-blue">Position ${r.num} · ${esc(r.group)}</p>
      <h1 class="cr-rolehead-title" id="role-title" tabindex="-1">${esc(r.title)}</h1>
      <p class="cr-lead">${esc(lead)}</p>
      ${chips(tags)}
      <div class="cr-cta-row">
        <a class="cr-btn cr-btn-primary cr-btn-lg" href="#apply">Start your application ${icon('arrow-right')}</a>
        <a class="cr-btn cr-btn-outline cr-btn-lg" href="#role-details">Read the role</a>
      </div>
      ${note ? `<p class="cr-rolehead-note">${icon('info')}<span>${esc(note)}</span></p>` : ''}
    </div>
    ${compCard(comp)}
  </div>`;
}
function dataTable(t, { caption, target = -1, total = null, numeric = true }) {
  const num = numeric ? ' class="num"' : '';
  const cells = row => row.map((c, i) => (i ? `<td${num}>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`)).join('');
  return `<div class="cr-table-wrap"><table class="cr-dtable">
    <caption class="sr-only">${esc(caption)}</caption>
    <thead><tr>${t.head.map((h, i) => `<th scope="col"${i ? num : ''}>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${t.rows.map((row, j) => `<tr${j === target ? ' class="is-target"' : ''}>${cells(row)}</tr>`).join('')}</tbody>
    ${total ? `<tfoot><tr>${cells(total)}</tr></tfoot>` : ''}
  </table></div>`;
}
const applyCta = (extra = '') => `<div class="cr-cta-row cr-rd-cta"><a class="cr-btn cr-btn-primary" href="#apply">Apply for this role ${icon('arrow-right')}</a>${extra}</div>`;

function execPage(r) {
  const d = r.details;
  const [figure] = d.fixed.split(' / ');
  return roleHead(r, {
    lead: r.summary,
    tags: [r.type, `Reports to ${r.reportsTo}`, `Hire: ${r.hire}`],
    note: EXEC_NOTE,
    comp: { label: 'Compensation — monthly', figure, unit: '/ month fixed', line: r.pay[0].label + '.', rows: r.pay.slice(1).map(p => [p.label, p.value]), note: r.payNote }
  }) + `
  <div class="cr-wrap cr-rd" id="role-details" tabindex="-1">
    <div class="cr-rd-grid">
      <div class="cr-rd-main">
        <p class="cr-eyebrow">Position ${r.num} · The role</p>
        <h2 class="cr-h2 cr-rd-title">What the job actually is</h2>
        <p class="cr-rd-desc">${esc(d.desc)}</p>
        <p class="cr-rd-lead">${esc(d.lead)}</p>
        <h3 class="cr-kicker cr-rd-k">Responsibilities</h3>
        <ul class="cr-plus-list">${d.duties.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>
      <div class="cr-rd-side">
        <div class="cr-rd-card"><h3 class="cr-kicker">KPIs</h3><p>${esc(d.kpis)}</p></div>
        <div class="cr-rd-card"><h3 class="cr-kicker">Looking for</h3><p>${esc(d.lookingFor)}</p></div>
        ${applyCta()}
      </div>
    </div>
    <p class="cr-rd-foot">${esc(EXEC_FOOTNOTE)}</p>
  </div>`;
}

function growthPage(r) {
  const d = r.details;
  return roleHead(r, {
    lead: d.lead, tags: d.chips,
    comp: { ...d.comp, rows: [[r.pay[2].label, r.pay[2].value], [r.pay[4].label, r.pay[4].value]] }
  }) + `
  <div class="cr-wrap cr-rd" id="role-details" tabindex="-1">
    <p class="cr-eyebrow">Position ${r.num} · The role</p>
    <h2 class="cr-h2 cr-rd-title">How the role is measured and paid</h2>
    <div class="cr-rd-two">
      <div class="cr-rd-block">
        <h3 class="cr-rd-h">${esc(d.kpi.title)}</h3>
        <p class="cr-rd-text">${esc(d.kpi.text)}</p>
        ${dataTable(d.kpi, { caption: 'Primary KPI targets' })}
        <p class="cr-rd-note">${esc(d.kpi.note)}</p>
      </div>
      <div class="cr-rd-block">
        <h3 class="cr-rd-h">${esc(d.bonus.title)}</h3>
        ${dataTable(d.bonus, { caption: 'Quarterly performance bonus by achievement', target: d.bonus.target })}
        ${d.bonus.notes.map(n => `<p class="cr-rd-note">${esc(n)}</p>`).join('')}
      </div>
      <div class="cr-rd-block">
        <h3 class="cr-rd-h">Key responsibilities</h3>
        <ul class="cr-plus-list">${d.duties.map(([b, t]) => `<li><b>${esc(b)}</b> ${esc(t)}</li>`).join('')}</ul>
        <h3 class="cr-kicker cr-rd-k">Required qualifications</h3>
        <p class="cr-rd-text">${esc(d.qualifications)}</p>
      </div>
      <div class="cr-rd-block">
        <h3 class="cr-rd-h">${esc(d.ctc.title)}</h3>
        ${dataTable(d.ctc, { caption: 'Indicative CTC structure, annual and monthly', total: d.ctc.total })}
        <p class="cr-rd-note">${esc(d.ctc.note)}</p>
        ${applyCta(`<a class="cr-btn cr-btn-outline" href="membership">See the membership plans ${icon('arrow-up-right')}</a>`)}
      </div>
    </div>
  </div>`;
}

function tasaPage(r) {
  const d = r.details;
  return roleHead(r, {
    lead: d.lead, tags: [...d.chips.slice(0, 1), `Reports to ${r.reportsTo}`, `Hire: ${r.hire}`, ...d.chips.slice(1)],
    comp: { ...d.comp, rows: r.pay.slice(4).map(p => [p.label, p.value]) }
  }) + `
  <div class="cr-wrap cr-rd" id="role-details" tabindex="-1">
    <p class="cr-eyebrow">Position ${r.num} · The role</p>
    <h2 class="cr-h2 cr-rd-title">How you earn, and where it leads</h2>
    <div class="cr-rd-two">
      <div class="cr-rd-block">
        <h3 class="cr-rd-h">How you earn</h3>
        <p class="cr-rd-text">${esc(r.summary)}</p>
        <dl class="cr-kv cr-kv-pay">${r.pay.map(p => `<div><dt>${esc(p.label)}</dt><dd>${esc(p.value)}</dd></div>`).join('')}</dl>
        <p class="cr-rd-note">${esc(r.payNote)}</p>
      </div>
      <div class="cr-rd-block">
        <h3 class="cr-rd-h">${esc(d.ladderTitle)}</h3>
        ${dataTable({ head: ['Period', 'TASA / sales track'], rows: d.ladder }, { caption: d.ladderTitle, numeric: false })}
        <p class="cr-rd-note">${esc(d.ladderNote)}</p>
        ${applyCta()}
      </div>
    </div>
  </div>`;
}

function renderRolePage(key) {
  const r = ROLES[key];
  const page = r.details.page;
  $('#role').innerHTML = pageOf(key) !== 'generic' ? '' : page === 'exec' ? execPage(r) : page === 'growth' ? growthPage(r) : tasaPage(r);
}

function renderRoleBar(key) {
  const i = ROLE_ORDER.indexOf(key);
  const r = ROLES[key];
  const prev = ROLES[ROLE_ORDER[i - 1]], next = ROLES[ROLE_ORDER[i + 1]];
  const step = (x, dir) => x
    ? `<a class="cr-rolebar-step is-${dir}" href="?position=${x.key}" data-position="${x.key}">${dir === 'prev' ? icon('arrow-left') : ''}<span><small>${dir === 'prev' ? 'Previous' : 'Next'}<span class="cr-rb-word"> position</span></small><b>${esc(x.title)}</b></span>${dir === 'next' ? icon('arrow-right') : ''}</a>`
    : '<span class="cr-rolebar-step is-empty" aria-hidden="true"></span>';
  $('[data-rolebar]').innerHTML = `
    <nav class="cr-crumbs" aria-label="Breadcrumb"><ol>
      <li><a href="#positions">Open positions</a></li>
      <li><a href="#group-${r.group.toLowerCase()}">${esc(r.group)}</a></li>
      <li><span aria-current="page">${esc(r.title)}</span></li>
    </ol></nav>
    <p class="cr-rolebar-meta">Position <b>${r.num}</b> of ${ROLE_ORDER.length}</p>
    <nav class="cr-rolebar-nav" aria-label="Previous and next positions">${step(prev, 'prev')}${step(next, 'next')}</nav>`;
}

/* ---------------------------------------------------------------- views */
function render(key) {
  current = key;
  const page = view();
  const tokens = key ? ['role', page] : ['home'];
  for (const el of $$('[data-show]')) el.hidden = !el.dataset.show.split(' ').some(t => tokens.includes(t));
  document.documentElement.classList.remove('cr-role-view');
  document.body.dataset.view = key ? 'role' : 'home';
  if (key) {
    renderRolePage(key);
    renderRoleBar(key);
    setTimeout(() => { if (current === key) apply.setRole(key); });   // the form draws in its own task, after the role page
    document.title = `${ROLES[key].title} — Careers at Aeroskys`;
  } else document.title = HOME_TITLE;
  // the same controls lead somewhere sensible in each view
  $$('[data-header-cta]').forEach(a => { a.href = key ? '#apply' : '#positions'; });
  const hireCta = $('[data-hire-cta]');
  hireCta.href = key ? '#apply' : '#positions';
  $('[data-cta-label]', hireCta).textContent = key ? 'Start your application' : 'View open positions';
  $$('[data-role-details]').forEach(a => { a.href = '#' + DETAILS[page]; });
  requestAnimationFrame(() => scrollRegions());
  $$('.cr-nav [data-position], .cr-mnav [data-position]').forEach(a => { if (a.dataset.position === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  updateSecnavs();
}

/** Jump (not glide) to a place in the new view, so a view change never scrolls across the whole page. */
function land(id, focusId) {
  requestAnimationFrame(() => {
    const el = id && document.getElementById(id);
    if (el && !el.closest('[hidden]')) {
      const header = $('[data-header]');
      scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + scrollY - (header ? 110 : 20)), behavior: 'instant' });
    } else scrollTo({ top: 0, behavior: 'instant' });
    const f = focusId && document.getElementById(focusId);
    f?.focus({ preventScroll: true });
  });
}

function openRole(key, { anchor = null, push = true } = {}) {
  if (push) {
    history.replaceState({ ...(history.state || {}), crScroll: scrollY }, '');
    history.pushState({ crView: key }, '', `${location.pathname}?position=${key}${anchor ? '#' + anchor : ''}`);
  }
  render(key);
  land(anchor, anchor ? null : TITLE[view()]);
}

function goHome({ anchor = 'positions', push = true, from = current } = {}) {
  if (push) history.pushState({ crView: null }, '', `${location.pathname}${anchor ? '#' + anchor : ''}`);
  render(null);
  // back on the list, the designation the visitor just left is where focus returns
  const link = from && anchor === 'positions' && $(`#positions [data-position="${from}"]`);
  if (link) {
    requestAnimationFrame(() => {
      link.closest('.cr-pos').scrollIntoView({ block: 'center', behavior: 'instant' });
      link.focus({ preventScroll: true });
    });
  } else land(anchor, anchor === 'positions' ? 'positions-title' : null);
}

addEventListener('popstate', e => {
  const key = urlRole();
  if (key === current) return;                       // a jump within the same view: the browser scrolls
  const from = current;
  render(key);
  const y = e.state?.crScroll;
  if (typeof y === 'number') requestAnimationFrame(() => scrollTo({ top: y, behavior: 'instant' }));
  else if (!key && from) goHome({ push: false, from, anchor: location.hash.slice(1) || 'positions' });
  else land(location.hash.slice(1) || null, key ? TITLE[view()] : null);
});

// Links: designations open their page; a link to a section of the other view switches view first.
document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]');
  if (!a) return;
  const key = a.dataset.position;
  if (isRole(key)) { e.preventDefault(); openRole(key); return; }
  const href = a.getAttribute('href');
  if (!href.startsWith('#') || href.length < 2) return;
  const id = decodeURIComponent(href.slice(1));
  const target = document.getElementById(id);
  if (!target) return;
  const box = target.closest('[data-show]');
  if (!box || !box.closest('[hidden]')) return;                  // visible here: the browser scrolls to it
  const show = box.dataset.show.split(' ');
  e.preventDefault();
  if (show.includes('home')) goHome({ anchor: id });
  else if (show.includes('tag')) openRole('tag', { anchor: id });
  else if (show.includes('hr')) openRole('hr', { anchor: id });
  else goHome({ anchor: 'positions' });                // the application needs a designation first
});

/* ---------------------------------------------------------------- nav highlight */
const NAV_OF = { positions: 'positions', roles: 'details', 'the-role': 'details', pay: 'details', profile: 'details', 'hr-role': 'details', role: 'details', 'how-we-hire': 'hire' };
const spyLinks = $$('[data-nav]');
const spyIo = new IntersectionObserver(entries => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    const key = NAV_OF[en.target.id] ?? null;
    spyLinks.forEach(l => l.classList.toggle('is-active', l.dataset.nav === key));
  }
}, { rootMargin: '-45% 0px -50% 0px' });
[...Object.keys(NAV_OF), 'top', 'direction', 'apply'].forEach(id => { const s = document.getElementById(id); if (s) spyIo.observe(s); });

/* ---------------------------------------------------------------- section navigators */
const secnavs = $$('[data-secnav]');
function updateSecnavs() {
  const list = SEQUENCE[view()];
  for (const nav of secnavs) {
    if (nav.hasAttribute('data-hire-nav')) continue;  // counts the hiring steps instead
    const i = list.indexOf(nav.dataset.secnav);
    if (i < 0) continue;
    $('[data-secnav-count]', nav).textContent = `${pad(i + 1)} / ${pad(list.length)}`;
    $('[data-secnav-bar]', nav).style.width = `${((i + 1) / list.length) * 100}%`;
  }
}
for (const nav of secnavs) {
  const isHire = nav.hasAttribute('data-hire-nav');
  nav.innerHTML = `
    <span class="cr-secnav-count" data-secnav-count>${isHire ? '01 / 04' : ''}</span>
    <span class="cr-secnav-slash" aria-hidden="true"></span>
    <button class="cr-secnav-down" type="button" data-go="next">${isHire ? 'Next step' : 'Scroll down'}</button>
    <span class="cr-secnav-bar" aria-hidden="true"><i style="width:${isHire ? 25 : 0}%" data-secnav-bar></i></span>
    <span class="cr-secnav-btns">
      <button class="cr-secnav-btn" type="button" data-go="prev" aria-label="${isHire ? 'Previous hiring step' : 'Previous section'}">${icon('arrow-left')}</button>
      <button class="cr-secnav-btn" type="button" data-go="next" aria-label="${isHire ? 'Next hiring step' : 'Next section'}">${icon('arrow-right')}</button>
    </span>`;
  nav.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (!b) return;
    const dir = b.dataset.go === 'next' ? 1 : -1;
    if (isHire && hire.step(dir)) return;           // move through the four steps first
    const list = SEQUENCE[view()];
    const i = list.indexOf(nav.dataset.secnav);
    if (!current && dir > 0 && nav.dataset.secnav === 'how-we-hire') { scrollToEl(document.getElementById('positions')); return; }
    scrollToEl(document.getElementById(list[Math.max(0, Math.min(i + dir, list.length - 1))]));
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

/* ---------------------------------------------------------------- TAG Manager pay calculator */
// Bands from the client's pay table (monthly performance tiers).
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
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
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
      const cap = $('.cr-car-cap', it);
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
  ['Written Application', 'The application form for your chosen designation, reached from its position page. The primary-evaluation question is read first, so bring specific numbers from your track record.'],
  ['Commercial Review', 'A 30-minute call on your track record and the numbers you have personally owned. Be ready to walk us through the figures in your written answers.'],
  ['Role Plan', 'You present your KPI design and first-90-days plan for the designation, and we work through it together. Bring your career and commercial plan with a 3/6/9/12-month roadmap.'],
  ['Offer & Benchmark', 'Offer, confirmed pay structure, KPI benchmark and joining date in writing.']
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
      $('.cr-secnav-down', nav).textContent = i === 3 ? (current ? 'Start your application' : 'View open positions') : 'Next step';
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

addEventListener('resize', debounce(() => scrollRegions(), 200));

/* ---------------------------------------------------------------- first view */
{
  let key = urlRole();
  const hash = location.hash.slice(1);
  if (!key && LEGACY[hash]) {                         // an old link such as /careers#pay
    key = LEGACY[hash];
    history.replaceState({ crView: key }, '', `${location.pathname}?position=${key}#${hash}`);
  }
  render(key);
  if (key) land(hash || null, null);
  else if (hash === 'apply') land('positions', null);    // the application starts from a designation
  else if (hash) land(hash, null);
}
