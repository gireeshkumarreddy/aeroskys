// Hotel results — live-site summary bar, filters (name, location, price, star, property
// type), sorting and "Show more" paging, in the editorial design.
import { html, raw, icon, mount, on, $, $$, img, debounce } from '../core/dom.js';
import { money, fmtDate, plural } from '../core/format.js';
import { href, go, setQuery } from '../core/router.js';
import { store } from '../core/store.js';
import { openModal } from '../ui/overlay.js';
import { searchCard, bindSearchCard, parseHotelQuery, roomsToParam } from '../ui/search.js';
import { stars, ratingBadge, emptyState, crumbs } from '../ui/common.js';
import { searchHotels, SORTS, PROPERTY_TYPES, AMENITIES, photoUrl, PHOTO_FALLBACK } from '../engines/hotels.js';
import { NATIONALITIES, HOTEL_CITIES } from '../data/cities.js';

const PAGE = 15;
const BINS = 24;
export const LAST_RESULTS_KEY = 'aeroskys:ht-last-results';
export const FROM_RESULTS_KEY = 'aeroskys:ht-from-results';
const list = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);
const numOrNull = v => (v != null && v !== '' && Number.isFinite(+v) ? +v : null);

export function stayHref(id, s) {
  return href('/hotels/stay/' + id, { in: s.checkin, out: s.checkout, rooms: roomsToParam(s.rooms), nat: s.nat !== 'IN' ? s.nat : undefined });
}

export default async function hotelsResults(el, ctx) {
  const q = ctx.query;
  const s = parseHotelQuery(q);
  const res = searchHotels(s);
  if (!res.error) s.city = res.q.city; // canonical name (e.g. "Goa (South)" → "Goa")
  const all = res.all;
  const city = HOTEL_CITIES.find(c => c.name === s.city);
  const nat = (NATIONALITIES.find(n => n[0] === s.nat) || NATIONALITIES[0])[1];
  document.title = `Hotels in ${s.city} — AeroSkys`;

  // ---------------------------------------------------------------- filter state (mirrored in the URL)
  const F = {
    name: q.get('fname') || '', loc: q.get('floc') || '',
    areas: new Set(list(q.get('farea'))),
    stars: new Set(list(q.get('fstar')).map(Number).filter(n => n >= 1 && n <= 5)),
    types: new Set(list(q.get('ftype') || q.get('ptype')).filter(t => PROPERTY_TYPES.includes(t) && all.some(h => h.type === t))),
    min: numOrNull(q.get('pmin')), max: numOrNull(q.get('pmax')),
    sort: SORTS.some(([k]) => k === q.get('sort')) ? q.get('sort') : 'rec',
    shown: Math.max(PAGE, Number(q.get('n')) || PAGE)
  };
  if (!q.has('fstar') && s.star !== 'all') F.stars.add(+s.star);

  const nets = all.map(h => h.price.net);
  const rawLo = nets.length ? Math.min(...nets) : 0, rawHi = nets.length ? Math.max(...nets) : 0;
  const step = [100, 250, 500, 1000, 2500, 5000].find(x => (rawHi - rawLo) / x <= 60) || 10000;
  const lo = Math.floor(rawLo / step) * step, hi = Math.max(lo + step, Math.ceil(rawHi / step) * step);
  if (F.min != null && F.min <= lo) F.min = null;
  if (F.max != null && F.max >= hi) F.max = null;
  const typesPresent = PROPERTY_TYPES.filter(t => all.some(h => h.type === t));
  const areaTotals = {};
  all.forEach(h => { areaTotals[h.area] = (areaTotals[h.area] || 0) + 1; });
  const topAreas = Object.keys(areaTotals).sort((a, b) => areaTotals[b] - areaTotals[a]).slice(0, 10);
  F.areas.forEach(a => { if (!topAreas.includes(a) && areaTotals[a]) topAreas.push(a); });

  const matches = (h, skip) => {
    if (skip !== 'name' && F.name && !h.name.toLowerCase().includes(F.name.toLowerCase())) return false;
    if (skip !== 'loc') {
      if (F.areas.size && !F.areas.has(h.area)) return false;
      if (F.loc && !`${h.area} ${h.address} ${h.nearest.name}`.toLowerCase().includes(F.loc.toLowerCase())) return false;
    }
    if (skip !== 'price' && ((F.min != null && h.price.net < F.min) || (F.max != null && h.price.net > F.max))) return false;
    if (skip !== 'star' && F.stars.size && !F.stars.has(h.stars)) return false;
    if (skip !== 'type' && F.types.size && !F.types.has(h.type)) return false;
    return true;
  };
  const SORTERS = {
    rec: (a, b) => b.rec - a.rec,
    'price-asc': (a, b) => a.price.net - b.price.net,
    'price-desc': (a, b) => b.price.net - a.price.net,
    'rating-desc': (a, b) => b.rating - a.rating || b.reviews - a.reviews,
    'rating-asc': (a, b) => a.rating - b.rating || a.reviews - b.reviews
  };
  let filtered = [];
  const compute = () => { filtered = all.filter(h => matches(h)).sort(SORTERS[F.sort]); };
  const activeCount = () => (F.name ? 1 : 0) + (F.loc ? 1 : 0) + F.areas.size + (F.min != null || F.max != null ? 1 : 0) + F.stars.size + F.types.size;
  const starLabel = () => (F.stars.size ? [...F.stars].sort().map(n => `${n}`).join(', ') + ' Star' : 'ALL');
  const guestsText = `${plural(res.roomCount, 'Room')} · ${plural(res.guests, 'Guest')}`;

  // ---------------------------------------------------------------- markup
  const sumItem = (label, value, sub, key) => html`<button type="button" class="ht-sum-item" data-modify ${key ? raw(`data-sum="${key}"`) : ''}>
    <span class="ht-sum-label">${label}</span><span class="ht-sum-value">${value}</span>${sub ? html`<span class="ht-sum-sub">${sub}</span>` : ''}</button>`;

  const card = h => {
    const link = stayHref(h.id, s), p = h.price;
    const amen = h.amenities.filter(a => a !== 'breakfast').slice(0, 4);
    return html`<article class="ht-card" data-id="${h.id}">
      <a class="ht-card-media" href="${link}" tabindex="-1" aria-hidden="true">${img(photoUrl(h.cover, 640), { alt: '', fallback: PHOTO_FALLBACK })}
        ${p.discPct && p.strike ? html`<span class="ht-deal">${p.discPct}% off</span>` : ''}</a>
      <div class="ht-card-body">
        <div class="ht-card-top"><span class="ht-type">${h.type}</span>${stars(h.stars)}</div>
        <h3 class="ht-card-name"><a href="${link}">${h.name}</a></h3>
        <p class="ht-card-loc">${icon('pin')}<span>${h.area}, ${h.city}<span class="ht-dot">·</span>${h.nearest.km} km from ${h.nearest.name}</span></p>
        <div class="ht-card-rating">${ratingBadge(h.rating)}<b>${h.ratingLabel}</b><span>${h.reviews.toLocaleString('en-IN')} reviews</span></div>
        <ul class="ht-amen" aria-label="Popular amenities">${amen.map(a => html`<li>${icon(AMENITIES[a][1])}<span>${AMENITIES[a][0]}</span></li>`)}</ul>
        <div class="ht-perks">
          ${h.freeCancel ? html`<span class="is-green">${icon('check')}Free cancellation</span>` : html`<span>${icon('info')}Non-refundable</span>`}
          ${h.breakfast ? html`<span class="is-green">${icon('coffee')}Breakfast available</span>` : ''}
          ${p.left <= 3 ? html`<span class="is-red">${icon('zap')}Only ${p.left} left at this price</span>` : ''}
        </div>
      </div>
      <div class="ht-card-price">
        <div class="ht-price-block">
          ${p.strike ? html`<span class="strike tnum">${money(p.strike)}</span>` : ''}
          <span class="ht-from">Starts From</span>
          <b class="ht-price tnum">${money(p.net)}</b>
          <span class="ht-price-sub">+ ${money(p.tax)} taxes &amp; fees</span>
          <span class="ht-price-sub ht-stay-for">${plural(res.roomCount, 'Room')} / ${plural(res.nights, 'Night')}</span>
        </div>
        <a class="btn btn-primary ht-card-cta" href="${link}" aria-label="Select room at ${h.name}">SELECT ROOM</a>
      </div>
    </article>`;
  };

  const counts = skip => all.filter(h => matches(h, skip));
  const starOpts = () => {
    const base = counts('star');
    return html`<button type="button" class="ht-opt" data-star="all" aria-pressed="${!F.stars.size}"><span class="ht-box">${icon('check')}</span><span class="grow">ALL</span><span class="ht-count">${base.length}</span></button>
      ${[1, 2, 3, 4, 5].map(n => html`<button type="button" class="ht-opt" data-star="${n}" aria-pressed="${F.stars.has(n)}"><span class="ht-box">${icon('check')}</span><span class="grow">${n} Star <span aria-hidden="true">${stars(n)}</span></span><span class="ht-count">${base.filter(h => h.stars === n).length}</span></button>`)}`;
  };
  const typeOpts = () => {
    const base = counts('type');
    return html`${typesPresent.map(t => html`<button type="button" class="ht-opt" data-type="${t}" aria-pressed="${F.types.has(t)}"><span class="ht-box">${icon('check')}</span><span class="grow">${t}</span><span class="ht-count">${base.filter(h => h.type === t).length}</span></button>`)}`;
  };
  const areaChips = () => {
    const base = counts('loc');
    return html`${topAreas.map(a => html`<button type="button" class="chip ht-area" data-area="${a}" aria-pressed="${F.areas.has(a)}">${a} <small>${base.filter(h => h.area === a).length}</small></button>`)}`;
  };
  const vmin = () => F.min ?? lo, vmax = () => F.max ?? hi;
  const histoBars = () => {
    const bins = new Array(BINS).fill(0), w = (hi - lo) / BINS;
    counts('price').forEach(h => { bins[Math.min(BINS - 1, Math.floor((h.price.net - lo) / w))]++; });
    const peak = Math.max(1, ...bins);
    return html`${bins.map((c, i) => html`<i class="${lo + (i + 1) * w > vmin() && lo + i * w < vmax() ? 'on' : ''}" style="height:${c ? Math.max(8, Math.round(c / peak * 100)) : 0}%"></i>`)}`;
  };
  const filtersHTML = p => html`<div class="ht-filters-in" data-filters>
    <div class="ht-fhead"><h2 class="h4">Filters</h2><button type="button" class="text-btn" data-clear>Clear all</button></div>
    <div class="ht-fgroup">
      <label class="ht-flabel" for="${p}-name">Hotel Name</label>
      <div class="ht-input">${icon('search')}<input id="${p}-name" class="input" type="search" data-f="name" placeholder="Search by hotel name" value="${F.name}" autocomplete="off" enterkeyhint="search"></div>
    </div>
    <div class="ht-fgroup">
      <label class="ht-flabel" for="${p}-loc">Location</label>
      <div class="ht-input">${icon('pin')}<input id="${p}-loc" class="input" type="search" data-f="loc" placeholder="Area, street or landmark" value="${F.loc}" autocomplete="off" enterkeyhint="search"></div>
      <div class="ht-areas" role="group" aria-label="Popular areas">${areaChips()}</div>
    </div>
    <div class="ht-fgroup" role="group" aria-labelledby="${p}-price-l">
      <div class="ht-flabel" id="${p}-price-l">Price Range <small>for ${plural(res.roomCount, 'room')} · ${plural(res.nights, 'night')}</small></div>
      ${hi > lo ? html`<div class="histo" data-histo aria-hidden="true">${histoBars()}</div>
      <div class="range" data-range><div class="range-track"><div class="range-fill" data-fill></div></div>
        <input type="range" data-pr="min" min="${lo}" max="${hi}" step="${step}" value="${vmin()}" aria-label="Minimum price">
        <input type="range" data-pr="max" min="${lo}" max="${hi}" step="${step}" value="${vmax()}" aria-label="Maximum price"></div>
      <div class="ht-price-vals"><span><small>Min</small><b class="tnum" data-pv="min">${money(vmin())}</b></span><span><small>Max</small><b class="tnum" data-pv="max">${money(vmax())}</b></span></div>` : html`<p class="small muted">All properties are priced at ${money(lo)}.</p>`}
    </div>
    <div class="ht-fgroup" role="group" aria-labelledby="${p}-star-l"><div class="ht-flabel" id="${p}-star-l">Star Category</div><div class="ht-opts" data-facet="stars">${starOpts()}</div></div>
    <div class="ht-fgroup" role="group" aria-labelledby="${p}-type-l"><div class="ht-flabel" id="${p}-type-l">Property Type</div><div class="ht-opts" data-facet="types">${typeOpts()}</div></div>
  </div>`;

  if (res.error || !all.length) {
    mount(el, html`<section class="band ht-band"><div class="wrap">${crumbs([{ label: 'Home', href: '#/' }, { label: 'Hotels', href: '#/hotels' }, { label: s.city || 'Search' }])}
      <h1 class="ht-band-title">Hotels in <em>${s.city || 'your destination'}</em></h1></div></section>
      <section class="ht-results bg-wash"><div class="wrap-narrow">${emptyState({
        iconName: res.error ? 'pin' : 'calendar',
        title: res.error ? `We don’t list stays in “${s.city}” yet` : `No rooms left in ${s.city} for these dates`,
        text: res.error ? `Choose from ${HOTEL_CITIES.length} destinations across India and abroad.` : 'Try different dates or fewer rooms — availability changes quickly.',
        action: html`<button type="button" class="btn btn-primary" data-modify>${icon('search')} Modify Search</button>`
      })}
      <div class="chip-row ht-empty-cities">${['Delhi', 'Goa', 'Jaipur', 'Mumbai', 'Dubai', 'Singapore'].map(c => html`<a class="chip" href="${href('/hotels/search', { city: c, in: s.checkin, out: s.checkout, rooms: roomsToParam(s.rooms) })}">${c}</a>`)}</div></div></section>`);
    const off = on(el, 'click', '[data-modify]', () => openModify());
    return () => off();
  }

  mount(el, html`
    <section class="band ht-band">
      <div class="wrap">
        <div class="ht-band-top">
          ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Hotels', href: '#/hotels' }, { label: s.city }])}
          <h1 class="ht-band-title">Hotels in <em>${s.city}</em></h1>
          <p class="ht-band-sub">${all.length} properties available · ${fmtDate(s.checkin, 'd MMM')} – ${fmtDate(s.checkout, 'd MMM yyyy')} · ${plural(res.nights, 'night')}</p>
        </div>
        <div class="ht-sum" role="group" aria-label="Your search">
          ${sumItem('City', s.city, city ? (city.intl ? city.country : city.region) : '')}
          ${sumItem('Check-In', fmtDate(s.checkin, 'd MMM yyyy'), fmtDate(s.checkin, 'dddd'))}
          ${sumItem('Check-Out', fmtDate(s.checkout, 'd MMM yyyy'), `${fmtDate(s.checkout, 'dddd')} · ${plural(res.nights, 'Night')}`)}
          ${sumItem('Nationality', nat, '')}
          ${sumItem('Star Category', starLabel(), 'Property rating', 'star')}
          ${sumItem('Rooms · Guests', guestsText, res.children ? `${plural(res.adults, 'Adult')}, ${plural(res.children, 'Child', 'Children')}` : plural(res.adults, 'Adult'))}
          <button type="button" class="btn btn-white ht-sum-go" data-modify>${icon('search')} Modify Search</button>
        </div>
      </div>
    </section>
    <div class="ht-msum"><button type="button" class="ht-msum-btn" data-modify aria-label="Modify search: ${s.city}, ${fmtDate(s.checkin, 'd MMM')} to ${fmtDate(s.checkout, 'd MMM')}, ${guestsText}">
      <span class="ht-msum-main"><b>${s.city}</b><small>${fmtDate(s.checkin, 'd MMM')} – ${fmtDate(s.checkout, 'd MMM')} · ${guestsText}</small></span>
      <span class="ht-msum-edit">${icon('edit')}</span></button></div>

    <section class="ht-results bg-wash">
      <div class="wrap ht-layout">
        <aside class="ht-filters card" aria-label="Filters">${filtersHTML('d')}</aside>
        <div class="ht-main">
          <div class="ht-toolbar">
            <p class="ht-countline" aria-live="polite" data-countline></p>
            <label class="ht-sort"><span>Sort by</span><select class="select" data-sort aria-label="Sort by">${SORTS.map(([k, l]) => html`<option value="${k}" ${k === F.sort ? raw('selected') : ''}>${l}</option>`)}</select></label>
          </div>
          <div class="ht-active" data-active></div>
          <div class="ht-list" data-list></div>
          <div class="ht-more" data-more><p class="small muted" data-shown></p><button type="button" class="btn btn-light" data-show-more>Show more properties ${icon('chevron-down')}</button></div>
        </div>
      </div>
    </section>
    <div class="ht-fab" role="group" aria-label="Sort and filter">
      <button type="button" data-open-sort>${icon('sort')} Sort</button><span aria-hidden="true"></span>
      <button type="button" data-open-filter>${icon('filter')} Filter <b data-fcount></b></button>
    </div>`);

  const listEl = $('[data-list]', el), moreEl = $('[data-more]', el);
  let sheet = null;
  const roots = () => [el, sheet].filter(Boolean);

  function renderList(append = false) {
    const countline = $('[data-countline]', el);
    countline.innerHTML = String(html`<b>${filtered.length}</b> of ${all.length} properties in ${s.city}${activeCount() ? ' match your filters' : ''}`);
    if (!filtered.length) {
      listEl.innerHTML = String(emptyState({ iconName: 'search', title: 'No properties match your filters', text: `Try removing a filter or widening the price range — ${all.length} properties are available in ${s.city} for your dates.`, action: html`<button type="button" class="btn btn-primary" data-clear>Clear filters</button>` }));
      moreEl.hidden = true;
      return;
    }
    const from = append ? listEl.querySelectorAll('.ht-card').length : 0;
    const slice = filtered.slice(from, F.shown);
    if (append) listEl.insertAdjacentHTML('beforeend', String(html`${slice.map(card)}`));
    else listEl.innerHTML = String(html`${slice.map(card)}`);
    const shown = Math.min(F.shown, filtered.length);
    moreEl.hidden = shown >= filtered.length;
    $('[data-shown]', el).textContent = `Showing ${shown} of ${filtered.length} properties`;
    if (append) listEl.querySelectorAll('.ht-card')[from]?.querySelector('.ht-card-name a')?.focus({ preventScroll: true });
  }

  function syncRange(root) {
    const a = $('[data-pr="min"]', root), b = $('[data-pr="max"]', root);
    if (!a) return;
    a.value = vmin(); b.value = vmax();
    a.setAttribute('aria-valuetext', money(vmin())); b.setAttribute('aria-valuetext', money(vmax()));
    const pct = v => ((v - lo) / (hi - lo)) * 100;
    Object.assign($('[data-fill]', root).style, { left: pct(vmin()) + '%', right: 100 - pct(vmax()) + '%' });
    $('[data-pv="min"]', root).textContent = money(vmin());
    $('[data-pv="max"]', root).textContent = money(vmax());
    $('[data-histo]', root).innerHTML = String(histoBars());
  }

  function refreshFacets() {
    const starBase = counts('star'), typeBase = counts('type'), areaBase = counts('loc');
    for (const root of roots()) {
      $$('[data-star]', root).forEach(b => {
        const k = b.dataset.star, isOn = k === 'all' ? !F.stars.size : F.stars.has(+k);
        const c = k === 'all' ? starBase.length : starBase.filter(h => h.stars === +k).length;
        b.setAttribute('aria-pressed', String(isOn)); b.disabled = !isOn && !c; b.querySelector('.ht-count').textContent = c;
      });
      $$('[data-type]', root).forEach(b => {
        const isOn = F.types.has(b.dataset.type), c = typeBase.filter(h => h.type === b.dataset.type).length;
        b.setAttribute('aria-pressed', String(isOn)); b.disabled = !isOn && !c; b.querySelector('.ht-count').textContent = c;
      });
      $$('[data-area]', root).forEach(b => {
        b.setAttribute('aria-pressed', String(F.areas.has(b.dataset.area)));
        b.querySelector('small').textContent = areaBase.filter(h => h.area === b.dataset.area).length;
      });
      $$('[data-f]', root).forEach(inp => { if (document.activeElement !== inp) inp.value = F[inp.dataset.f]; });
      syncRange(root);
    }
    if (sheet) { const apply = $('[data-apply]', sheet); if (apply) apply.textContent = `Show ${plural(filtered.length, 'property', 'properties')}`; }
  }

  function renderActive() {
    const chips = [];
    if (F.name) chips.push(['name', `Name: ${F.name}`]);
    if (F.loc) chips.push(['loc', `Location: ${F.loc}`]);
    F.areas.forEach(a => chips.push(['area:' + a, a]));
    if (F.min != null || F.max != null) chips.push(['price', `${money(vmin())} – ${money(vmax())}`]);
    [...F.stars].sort().forEach(n => chips.push(['star:' + n, `${n} Star`]));
    F.types.forEach(t => chips.push(['type:' + t, t]));
    $('[data-active]', el).innerHTML = chips.length ? String(html`${chips.map(([k, l]) => html`<button type="button" class="chip is-active" data-rm="${k}" aria-label="Remove filter: ${l}">${l}${icon('x')}</button>`)}<button type="button" class="text-btn" data-clear>Clear all</button>`) : '';
    const n = activeCount();
    const fc = $('[data-fcount]', el); if (fc) fc.textContent = n ? `(${n})` : '';
    const band = $('[data-sum="star"] .ht-sum-value', el); if (band) band.textContent = starLabel();
  }

  function syncURL() {
    const h = setQuery({
      city: s.city,
      fname: F.name || undefined, floc: F.loc || undefined, farea: [...F.areas].join(',') || undefined,
      fstar: [...F.stars].join(',') || undefined, star: F.stars.size === 1 ? [...F.stars][0] : undefined,
      ftype: [...F.types].join(',') || undefined, ptype: undefined,
      pmin: F.min ?? undefined, pmax: F.max ?? undefined, sort: F.sort !== 'rec' ? F.sort : undefined, n: F.shown > PAGE ? F.shown : undefined
    });
    try { sessionStorage.setItem(LAST_RESULTS_KEY, h); } catch { /* storage unavailable */ }
  }

  function update({ keepShown = false } = {}) {
    if (!keepShown) F.shown = PAGE;
    compute();
    renderList();
    refreshFacets();
    renderActive();
    syncURL();
  }

  function clearAll() {
    Object.assign(F, { name: '', loc: '', min: null, max: null });
    F.areas.clear(); F.stars.clear(); F.types.clear();
    update();
  }

  // ---------------------------------------------------------------- events (shared by sidebar and sheet)
  const typing = debounce(() => update(), 180);
  const priceLater = debounce(() => update(), 120);
  function bindFilters(root) {
    const offs = [
      on(root, 'input', '[data-f]', (e, inp) => { F[inp.dataset.f] = inp.value.trim(); typing(); }),
      on(root, 'click', '[data-star]', (e, b) => { const k = b.dataset.star; if (k === 'all') F.stars.clear(); else F.stars.has(+k) ? F.stars.delete(+k) : F.stars.add(+k); update(); }),
      on(root, 'click', '[data-type]', (e, b) => { const t = b.dataset.type; F.types.has(t) ? F.types.delete(t) : F.types.add(t); update(); }),
      on(root, 'click', '[data-area]', (e, b) => { const a = b.dataset.area; F.areas.has(a) ? F.areas.delete(a) : F.areas.add(a); update(); }),
      on(root, 'input', '[data-pr]', (e, inp) => {
        let v = +inp.value;
        if (inp.dataset.pr === 'min') { v = Math.min(v, vmax() - step); F.min = v <= lo ? null : v; }
        else { v = Math.max(v, vmin() + step); F.max = v >= hi ? null : v; }
        syncRange(root);
        priceLater();
      }),
      on(root, 'click', '[data-clear]', () => clearAll())
    ];
    return () => offs.forEach(f => f());
  }
  const offFilters = bindFilters($('.ht-filters', el));

  const offs = [
    on(el, 'click', '[data-modify]', () => openModify()),
    on(el, 'change', '[data-sort]', (e, sel) => { F.sort = sel.value; update(); }),
    on(el, 'click', '[data-rm]', (e, b) => {
      const [k, v] = b.dataset.rm.split(/:(.*)/s);
      if (k === 'name') F.name = ''; else if (k === 'loc') F.loc = ''; else if (k === 'price') { F.min = null; F.max = null; }
      else if (k === 'area') F.areas.delete(v); else if (k === 'star') F.stars.delete(+v); else if (k === 'type') F.types.delete(v);
      update();
    }),
    on(el, 'click', '.ht-list [data-clear], .ht-active [data-clear]', () => clearAll()),
    on(el, 'click', '[data-show-more]', () => { F.shown += PAGE; renderList(true); syncURL(); }),
    on(el, 'click', '[data-open-sort]', () => openSort()),
    on(el, 'click', '[data-open-filter]', () => openFilters()),
    on(el, 'click', '.ht-card a', (e, a) => { try { sessionStorage.setItem(FROM_RESULTS_KEY, a.getAttribute('href')); } catch { /* storage unavailable */ } })
  ];

  function openSort() {
    const m = openModal({
      title: 'Sort by', className: 'ht-sheet',
      body: html`<div class="ht-sort-list" role="radiogroup" aria-label="Sort by">${SORTS.map(([k, l]) => html`<button type="button" role="radio" data-sort-opt="${k}" aria-checked="${k === F.sort}"><span>${l}</span>${icon('check')}</button>`)}</div>`,
      onOpen(dlg) { on(dlg, 'click', '[data-sort-opt]', (e, b) => { F.sort = b.dataset.sortOpt; $('[data-sort]', el).value = F.sort; update(); m.close(); }); }
    });
  }

  function openFilters() {
    let offSheet = null;
    openModal({
      title: 'Filters', className: 'ht-sheet ht-filter-sheet',
      body: filtersHTML('m'),
      foot: html`<button type="button" class="btn btn-light" data-clear>Clear all</button><button type="button" class="btn btn-primary" data-close data-apply>Show ${plural(filtered.length, 'property', 'properties')}</button>`,
      onOpen(dlg) { sheet = dlg; offSheet = bindFilters(dlg); refreshFacets(); },
      onClose() { offSheet?.(); sheet = null; }
    });
  }

  function openModify() {
    const m = openModal({
      title: 'Modify search', size: 'wide', className: 'ht-modify',
      body: searchCard({ service: 'hotels', tabs: false, id: 'ht-modify-form' }),
      onOpen(dlg) {
        const form = dlg.querySelector('[data-search-card]');
        const star = F.stars.size === 1 ? String([...F.stars][0]) : 'all';
        bindSearchCard(form, {
          state: { hotels: { city: s.city, checkin: s.checkin, checkout: s.checkout, rooms: s.rooms, star, nat: s.nat } },
          onSearch: (svc, query) => { if (href('/hotels/search', query) === location.hash) { m.close(); return; } go('/hotels/search', { query }); }
        });
      }
    });
  }

  const unsub = store.subscribe((st, patch) => { if (patch && 'currency' in patch) { renderList(); refreshFacets(); renderActive(); } });

  compute();
  renderList();
  refreshFacets();
  renderActive();
  syncURL();

  return () => { offFilters(); offs.forEach(f => f()); unsub(); };
}
