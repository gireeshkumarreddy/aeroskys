// Holiday search (#/holidays/search?city=Dubai): live-style result cards, destination switcher,
// client-side filters (destination type, duration, budget, holiday type) and sorting.
// Filters and sort live in the URL (region, dur, budget, cat, sort) so results can be shared.
import { html, raw, icon, mount, on, $, $$, img } from '../core/dom.js';
import { money, plural } from '../core/format.js';
import { href, go, setQuery } from '../core/router.js';
import { store, pushRecent } from '../core/store.js';
import { crumbs, emptyState } from '../ui/common.js';
import { pickFromList } from '../ui/pickers.js';
import { openModal } from '../ui/overlay.js';
import { mountHolidayEnquiry, openHolidayEnquiry } from '../ui/enquiry.js';
import { PACKAGES, HOLIDAY_CATEGORIES, HOLIDAY_CITIES } from '../data/packages.js';
import { HOLIDAY_DESTINATIONS } from '../data/content.js';

export const FEATURE_ICON = { Hotel: 'bed', Flight: 'plane', Sightseeing: 'binoculars', Transfer: 'car', Activity: 'flag', Cruise: 'ship' };
const BY_ID = Object.fromEntries(PACKAGES.map(p => [p.id, p]));
const CAT_NAME = Object.fromEntries(HOLIDAY_CATEGORIES.map(c => [c.id, c.name]));
const QUICK = ['Goa', 'Kerala', 'Kashmir', 'Manali', 'Dubai', 'Thailand', 'Singapore', 'Bali', 'Maldives', 'Europe'];
const SUGGEST = ['Goa', 'Kerala', 'Dubai', 'Thailand', 'Bali', 'Singapore', 'Maldives', 'Kashmir'];

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = q => new RegExp('(^|[^a-z0-9])' + escRe(q) + '($|[^a-z0-9])');

/** Canonical destination name as used on the live site (HOLIDAY_CITIES / HOLIDAY_DESTINATIONS), or ''. */
export const destinationKey = city => Object.keys(HOLIDAY_CITIES).find(k => norm(k) === norm(city)) || HOLIDAY_DESTINATIONS.find(d => norm(d) === norm(city)) || '';

/**
 * Packages for a destination: the live site's destination mapping first, then packages whose
 * name or place mentions it; itineraries that visit it are a last resort (mode 'visits').
 */
export function findPackages(city) {
  const q = norm(city);
  if (!q) return { list: [...PACKAGES], mode: 'all' };
  const key = Object.keys(HOLIDAY_CITIES).find(k => norm(k) === q);
  const mapped = key ? HOLIDAY_CITIES[key].map(id => BY_ID[id]).filter(Boolean) : [];
  const re = wordRe(q);
  // "Mussoorie Weekend Tour from Delhi" is a Mussoorie trip, so a trailing "from <city>" doesn't count.
  const nameOf = p => norm(p.name).replace(/\bfrom [a-z .'-]+$/, '');
  const text = q.length < 3 ? [] : PACKAGES.filter(p => !mapped.includes(p) && (re.test(nameOf(p)) || re.test(norm(p.place)) || p.cities.some(c => norm(c) === q)));
  if (mapped.length || text.length) return { list: [...mapped, ...text], mode: 'match' };
  const visits = q.length < 3 ? [] : PACKAGES.filter(p => p.itinerary.some(d => re.test(norm(d.title))));
  return visits.length ? { list: visits, mode: 'visits' } : { list: [], mode: 'none' };
}

// ---------------------------------------------------------------- filters & sorting
const range = (id, min, max) => ({
  id,
  test: p => (min == null || p.price > min) && (max == null || p.price <= max),
  label: () => (min == null ? `Up to ${money(max)}` : max == null ? `Above ${money(min)}` : `${money(min)} – ${money(max)}`)
});
const GROUPS = [
  { key: 'region', title: 'Destination', opts: [
    { id: 'domestic', label: 'Domestic (India)', test: p => p.region === 'domestic' },
    { id: 'international', label: 'International', test: p => p.region === 'international' }
  ] },
  { key: 'dur', title: 'Duration', opts: [
    { id: 'short', label: 'Up to 3 nights', test: p => p.nights <= 3 },
    { id: 'mid', label: '4 – 5 nights', test: p => p.nights >= 4 && p.nights <= 5 },
    { id: 'long', label: '6 – 8 nights', test: p => p.nights >= 6 && p.nights <= 8 },
    { id: 'xlong', label: '9 nights or more', test: p => p.nights >= 9 }
  ] },
  { key: 'budget', title: 'Budget per adult', opts: [range('u15', null, 15000), range('15-30', 15000, 30000), range('30-60', 30000, 60000), range('60-150', 60000, 150000), range('o150', 150000, null)] },
  { key: 'cat', title: 'Holiday type', opts: HOLIDAY_CATEGORIES.map(c => ({ id: c.id, label: c.name, test: p => p.categories.includes(c.id) })) }
];
const optLabel = o => (typeof o.label === 'function' ? o.label() : o.label);
const SORTS = [
  ['rec', 'Recommended', null],
  ['price-asc', 'Price: low to high', (a, b) => a.price - b.price],
  ['price-desc', 'Price: high to low', (a, b) => b.price - a.price],
  ['dur-asc', 'Duration: shortest first', (a, b) => a.nights - b.nights || a.price - b.price],
  ['dur-desc', 'Duration: longest first', (a, b) => b.nights - a.nights || a.price - b.price]
];

function resultCard(p) {
  const url = href('/holidays/package/' + p.id);
  return html`<article class="hd-res">
    <a class="hd-res-img" href="${url}" tabindex="-1" aria-hidden="true">${img(p.banner, { alt: '', fallback: p.fallback })}<span class="badge">${p.tag}</span></a>
    <div class="hd-res-body">
      <p class="hd-res-dur"><b>${plural(p.nights, 'Night')}</b><span>${plural(p.days, 'Day')}</span><span class="hd-res-region">${p.region === 'domestic' ? 'India' : 'International'}</span></p>
      <h2 class="hd-res-title"><a href="${url}">${p.name}</a></h2>
      <p class="hd-res-place">${icon('pin')}<span>${p.place}</span></p>
      <ul class="hd-res-feats" aria-label="Package features">${p.features.map(f => html`<li>${icon(FEATURE_ICON[f] || 'check')}<span>${f}</span></li>`)}</ul>
    </div>
    <div class="hd-res-price">
      <p><small>Starting from</small><b>${money(p.price)}</b><small>Per adult</small></p>
      <a class="btn btn-primary" href="${url}" aria-label="View package: ${p.name}">View Package</a>
    </div>
  </article>`;
}

export default async function holidaySearch(el, ctx) {
  const q = ctx.query;
  const rawCity = (q.get('city') || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const key = destinationKey(rawCity);
  const city = key || rawCity.replace(/(^|\s)[a-z]/g, c => c.toUpperCase());
  const { list: base, mode } = findPackages(rawCity);
  const state = { sort: SORTS.some(s => s[0] === q.get('sort')) ? q.get('sort') : 'rec' };
  for (const g of GROUPS) state[g.key] = new Set((q.get(g.key) || '').split(',').filter(id => g.opts.some(o => o.id === id)));
  if (key && base.length) pushRecent('holidays', { key, city: key, state: { city: key } });

  const heading = () => {
    if (city) return `${city} Holiday Packages`;
    if (state.cat.size === 1 && !state.region.size) return CAT_NAME[[...state.cat][0]];
    if (state.region.size === 1 && !state.cat.size) return state.region.has('domestic') ? 'Domestic Holiday Packages' : 'International Holiday Packages';
    return 'All Holiday Packages';
  };
  const summary = () => {
    if (mode === 'none') return `We don’t have ready-made packages for ${city} yet — our holiday desk can plan one with you.`;
    const from = money(Math.min(...base.map(p => p.price)));
    if (mode === 'visits') return `${plural(base.length, 'itinerary', 'itineraries')} with a stop in ${city} · from ${from} per adult`;
    return `${plural(base.length, 'package')} · starting from ${from} per adult`;
  };
  const setTitle = () => { document.title = `${heading()} — AeroSkys`; };
  setTitle();

  // ---- pure helpers over the current state
  const passes = (p, skip) => GROUPS.every(g => g.key === skip || !state[g.key].size || g.opts.some(o => state[g.key].has(o.id) && o.test(p)));
  const results = () => { const list = base.filter(p => passes(p)); const cmp = SORTS.find(s => s[0] === state.sort)[2]; return cmp ? [...list].sort(cmp) : list; };
  const counts = g => { const pool = base.filter(p => passes(p, g.key)); return Object.fromEntries(g.opts.map(o => [o.id, pool.filter(o.test).length])); };
  const activeCount = () => GROUPS.reduce((n, g) => n + state[g.key].size, 0);

  const sortSelect = id => html`<select class="select" id="${id}" data-hd-sort>${SORTS.map(([v, l]) => html`<option value="${v}"${v === state.sort ? raw(' selected') : ''}>${l}</option>`)}</select>`;
  const filtersHTML = prefix => html`<div class="hd-f">
    ${prefix === 'side' ? html`<div class="hd-f-head"><h2 class="h4" id="hd-f-title">Filters</h2><button type="button" class="text-btn" data-hd-clear hidden>Clear all</button></div>` : ''}
    ${GROUPS.map(g => html`<fieldset class="hd-fg"><legend>${g.title}</legend>${g.opts.map(o => {
      const id = `hd-${prefix}-${g.key}-${o.id}`;
      return html`<label class="check hd-fopt" for="${id}"><input type="checkbox" id="${id}" data-hd-f="${g.key}" value="${o.id}"><span class="grow">${optLabel(o)}</span><span class="hd-fn" data-hd-n="${g.key}:${o.id}"></span></label>`;
    })}</fieldset>`)}
  </div>`;

  const noneHTML = () => html`<div class="wrap hd-none">
    <div class="hd-none-copy">
      <span class="hd-none-ic" aria-hidden="true">${icon('compass')}</span>
      <h2 class="h3">No ready-made packages for ${city} yet</h2>
      <p>Tell us your city and date of departure and our holiday desk will plan a ${city} trip with you. Or explore destinations with packages ready to go:</p>
      <div class="hd-none-dests">${SUGGEST.map(c => html`<a class="chip" href="${href('/holidays/search', { city: c })}">${icon('pin')}${c}<span class="hd-chip-n">${(HOLIDAY_CITIES[c] || []).length}</span></a>`)}</div>
    </div>
    <div class="card hd-none-form" data-hd-enq></div>
  </div>`;

  const shellHTML = () => html`<div class="wrap hd-sl">
    <aside class="hd-filters" aria-labelledby="hd-f-title"><div class="hd-filters-in" data-hd-side>${filtersHTML('side')}</div></aside>
    <div class="hd-results">
      <div class="hd-toolbar">
        <p class="hd-count" data-hd-count role="status" aria-live="polite"></p>
        <div class="hd-toolbar-ctl">
          <button type="button" class="btn btn-light btn-sm hd-filter-btn" data-hd-open-filters aria-haspopup="dialog">${icon('filter')} Filters<span class="hd-fbadge" data-hd-fbadge hidden></span></button>
          <label class="hd-sort" for="hd-sort-main"><span>Sort by</span>${sortSelect('hd-sort-main')}</label>
        </div>
      </div>
      <div class="hd-active" data-hd-active></div>
      ${mode === 'visits' ? html`<div class="note hd-visits-note">${icon('info')}<span>No packages are listed for ${city} itself — these itineraries include a stop there.</span></div>` : ''}
      <div class="hd-list" data-hd-list></div>
      <div class="hd-custom-mini">
        <div><h2 class="h4">Want something different?</h2><p>Tell us where and when — our holiday desk will plan a trip around you.</p></div>
        <button type="button" class="btn btn-dark" data-hd-custom>${icon('sparkles')} Plan a custom holiday</button>
      </div>
    </div>
  </div>`;

  mount(el, html`<div class="hd-view hd-search">
    <section class="band hd-sband" aria-labelledby="hd-s-title">
      <div class="wrap">
        ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Holidays', href: '#/holidays' }, { label: city || heading() }])}
        <div class="hd-sband-row">
          <div class="hd-sband-copy">
            <h1 class="display" id="hd-s-title" data-hd-heading>${heading()}</h1>
            <p data-hd-summary>${summary()}</p>
          </div>
          <button type="button" class="hd-dest" data-hd-dest aria-haspopup="dialog" aria-label="${city ? `Destination: ${city}. Change destination` : 'Search holiday destinations'}">
            <span class="hd-dest-ic" aria-hidden="true">${icon('search')}</span>
            <span class="hd-dest-txt"><small>Where do you want to go?</small><b>${city || 'Search destinations'}</b></span>
            <span class="hd-dest-cta">${city ? 'Change' : 'Search'}</span>
          </button>
        </div>
        <nav class="hd-quick" aria-label="Popular destinations">${QUICK.filter(c => norm(c) !== norm(city)).map(c => html`<a href="${href('/holidays/search', { city: c })}">${c}</a>`)}</nav>
      </div>
    </section>
    ${mode === 'none' ? noneHTML() : shellHTML()}
  </div>`);

  const root = el.firstElementChild;
  let sheet = null;
  let enquiry = null;

  on(root, 'click', '[data-hd-dest]', (e, b) => pickFromList(b, {
    title: 'Where do you want to go?', placeholder: 'Search holiday destinations', popularTitle: 'All destinations', iconName: 'palm',
    items: HOLIDAY_DESTINATIONS.map(c => { const n = (HOLIDAY_CITIES[c] || []).length; return { value: c, label: c, sub: n ? plural(n, 'holiday package') : 'Planned on request' }; }),
    onSelect: it => go('/holidays/search', { query: { city: it.value } })
  }));
  on(root, 'click', '[data-hd-custom]', () => openHolidayEnquiry({ destination: city, title: city ? `Plan a custom ${city} holiday` : 'Plan a custom holiday' }));

  let currency = store.get('currency');
  const offCurrency = store.subscribe(s => {
    if (s.currency === currency) return;
    currency = s.currency;
    $('[data-hd-summary]', root).textContent = summary();
    if (mode === 'none') return;
    $('[data-hd-side]', root).innerHTML = String(filtersHTML('side'));
    if (sheet) $('[data-hd-sheet-filters]', sheet.el).innerHTML = String(filtersHTML('sheet'));
    sync();
  });

  if (mode === 'none') {
    enquiry = mountHolidayEnquiry($('[data-hd-enq]', root), { destination: city, heading: 'full' });
    return () => { offCurrency(); enquiry?.destroy(); };
  }

  // ---- render & sync
  const syncFilterUI = scope => {
    if (!scope) return;
    for (const g of GROUPS) {
      const n = counts(g);
      for (const o of g.opts) {
        const input = $(`[data-hd-f="${g.key}"][value="${o.id}"]`, scope);
        if (!input) continue;
        const on2 = state[g.key].has(o.id);
        input.checked = on2;
        input.disabled = !n[o.id] && !on2;
        input.closest('.hd-fopt').classList.toggle('is-empty', input.disabled);
        const c = $(`[data-hd-n="${g.key}:${o.id}"]`, scope);
        if (c) c.textContent = n[o.id];
      }
    }
    $$('[data-hd-sort]', scope).forEach(s => { s.value = state.sort; });
  };

  const sync = ({ url = true } = {}) => {
    const list = results();
    $('[data-hd-list]', root).innerHTML = String(list.length
      ? html`${list.map(resultCard)}`
      : emptyState({ iconName: 'filter', title: 'No packages match these filters', text: 'Try removing a filter or two to see more trips.', action: html`<button type="button" class="btn btn-primary" data-hd-clear>Clear all filters</button>` }));
    $('[data-hd-count]', root).textContent = list.length === base.length ? `Showing ${plural(list.length, 'package')}` : `Showing ${list.length} of ${plural(base.length, 'package')}`;
    const chips = GROUPS.flatMap(g => g.opts.filter(o => state[g.key].has(o.id)).map(o => html`<button type="button" class="chip hd-chip" data-hd-remove="${g.key}:${o.id}" aria-label="Remove filter: ${optLabel(o)}">${optLabel(o)}${icon('x')}</button>`));
    $('[data-hd-active]', root).innerHTML = chips.length ? String(html`${chips}<button type="button" class="text-btn" data-hd-clear>Clear all</button>`) : '';
    const n = activeCount();
    const badge = $('[data-hd-fbadge]', root);
    badge.hidden = !n; badge.textContent = n ? String(n) : '';
    $$('[data-hd-clear]', $('[data-hd-side]', root)).forEach(b => { b.hidden = !n; });
    syncFilterUI($('[data-hd-side]', root));
    if (sheet) {
      syncFilterUI(sheet.el);
      const show = $('[data-hd-show]', sheet.el);
      if (show) show.textContent = list.length ? `Show ${plural(list.length, 'package')}` : 'No packages — adjust filters';
    }
    $('[data-hd-heading]', root).textContent = heading();
    if (!city) { const last = $('.crumbs [aria-current="page"]', root); if (last) last.textContent = heading(); }
    setTitle();
    if (url) setQuery(Object.fromEntries([...GROUPS.map(g => [g.key, [...state[g.key]].join(',') || null]), ['sort', state.sort === 'rec' ? null : state.sort]]));
  };

  const toggle = input => { const set = state[input.dataset.hdF]; if (input.checked) set.add(input.value); else set.delete(input.value); sync(); };
  const clearAll = () => { GROUPS.forEach(g => state[g.key].clear()); sync(); };
  const setSort = v => { state.sort = SORTS.some(s => s[0] === v) ? v : 'rec'; sync(); };

  on(root, 'change', '[data-hd-f]', (e, input) => toggle(input));
  on(root, 'change', '[data-hd-sort]', (e, s) => setSort(s.value));
  on(root, 'click', '[data-hd-clear]', () => { clearAll(); $('[data-hd-sort]', root)?.focus({ preventScroll: true }); });
  on(root, 'click', '[data-hd-remove]', (e, b) => {
    const [k, id] = b.dataset.hdRemove.split(':');
    state[k]?.delete(id);
    sync();
    ($('[data-hd-remove]', root) || $('[data-hd-sort]', root))?.focus({ preventScroll: true });
  });
  on(root, 'click', '[data-hd-open-filters]', () => {
    sheet = openModal({
      title: 'Filters & sort', className: 'hd-fsheet',
      body: html`<label class="field hd-fsheet-sort" for="hd-sort-sheet"><span class="field-label">Sort by</span>${sortSelect('hd-sort-sheet')}</label><div data-hd-sheet-filters>${filtersHTML('sheet')}</div>`,
      foot: html`<button type="button" class="btn btn-light" data-hd-clear>Clear all</button><button type="button" class="btn btn-primary" data-close data-hd-show></button>`,
      onOpen(dlg) {
        on(dlg, 'change', '[data-hd-f]', (e, input) => toggle(input));
        on(dlg, 'change', '[data-hd-sort]', (e, s) => setSort(s.value));
        on(dlg, 'click', '[data-hd-clear]', () => clearAll());
      },
      onClose() { sheet = null; }
    });
    sync({ url: false });
  });

  sync({ url: false });
  return () => { offCurrency(); sheet?.close(); };
}
