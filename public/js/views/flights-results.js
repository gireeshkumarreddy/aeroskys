// Flight listing — mirrors the live results page: modify-search band, date fare strip,
// filters (stops, price, departure/arrival time, airlines, fare type), flight cards with
// Flight Details (Overview / Fare Summary & Rules / Baggage), More Fare and Book Now.
import { html, raw, icon, mount, on, $, $$, isTouchNav } from '../core/dom.js';
import { money, hm, dur, fmtDate, today, addDays, plural, diffDays } from '../core/format.js';
import { go, href, setQuery } from '../core/router.js';
import { store } from '../core/store.js';
import { AIRPORT } from '../data/airports.js';
import { airline } from '../data/airlines.js';
import { searchFlights, fareStrip, timeBucket, CABINS } from '../engines/flights.js';
import { parseFlightQuery, flightQuery, searchCard, bindSearchCard } from '../ui/search.js';
import { airlineMark, emptyState } from '../ui/common.js';
import { openModal } from '../ui/overlay.js';
import { detailsPanel, bindDetailTabs, openFareOptions, exclusiveNotice, stopsLabel, dayMark } from '../ui/flight-ui.js';
import { toast } from '../ui/toast.js';

const PAGE = 20;
const BUCKETS = [['early', 'Early Morning', 'Before 6 AM', 'sunrise'], ['morning', 'Morning', '6 AM - 12 PM', 'sun'], ['afternoon', 'Afternoon', '12 PM - 6 PM', 'sunset'], ['evening', 'Evening', 'After 6 PM', 'moon']];
const SORTS = [['price', 'Cheapest'], ['duration', 'Fastest'], ['early', 'Early departure'], ['late', 'Late departure']];

const blankFilters = () => ({ stops: new Set(), dep: new Set(), arr: new Set(), airlines: new Set(), refundable: null, price: null });

export default async function results(el, ctx) {
  const s = parseFlightQuery(ctx.query);
  const round = s.trip === 'round' && s.ret;
  const A = AIRPORT[s.from], B = AIRPORT[s.to];
  if (!A || !B || s.from === s.to) {
    mount(el, html`<section class="page"><div class="wrap-narrow">${emptyState({ iconName: 'alert', title: 'Please check your search', text: 'The origin and destination need to be two different airports.', action: html`<a class="btn btn-primary" href="#/">New search</a>` })}</div></section>`);
    return;
  }
  document.title = `${A.city} to ${B.city} flights — AeroSkys`;
  const pax = { adt: s.adt, chd: s.chd, inf: s.inf };
  const paxN = s.adt + s.chd + s.inf;
  const q = { from: s.from, to: s.to, cabin: s.cabin, fare: s.fare };
  const qr = { from: s.to, to: s.from, cabin: s.cabin, fare: s.fare };

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const usable = (list, date) => date === today() ? list.filter(r => r.depMin > nowMin + 120) : list;
  const outList = usable(searchFlights({ ...q, date: s.depart }).results, s.depart);
  const retList = round ? usable(searchFlights({ ...qr, date: s.ret }).results, s.ret) : [];

  const st = {
    filters: blankFilters(), sort: ctx.query.get('sort') || 'price', shown: { out: PAGE, ret: PAGE }, leg: 'out',
    sel: { out: null, ret: null } // { it, fare }
  };

  const special = s.fare !== 'regular' ? html`<span class="badge badge-amber">${icon(s.fare === 'student' ? 'grad' : 'senior')} ${s.fare === 'student' ? 'Student fare' : 'Senior citizen fare'}</span>` : '';

  mount(el, html`
    <section class="band fl-band">
      <div class="wrap-wide fl-band-inner">
        <div class="fl-band-icon" aria-hidden="true">${icon('plane')}</div>
        <div class="fl-sum">
          <div class="fl-sum-item"><small>From</small><b>${A.city.toUpperCase()} <span>${A.code}</span></b></div>
          <div class="fl-sum-item"><small>To</small><b>${B.city.toUpperCase()} <span>${B.code}</span></b></div>
          <div class="fl-sum-item"><small>Departure</small><b>${fmtDate(s.depart, 'd MMM yyyy')}</b></div>
          <div class="fl-sum-item"><small>Return</small><b>${round ? fmtDate(s.ret, 'd MMM yyyy') : html`<span class="fl-muted">Tap to add return date</span>`}</b></div>
          <div class="fl-sum-item"><small>Travellers · Class</small><b>${plural(paxN, 'Traveller')} <span>· ${CABINS[s.cabin]}</span></b></div>
        </div>
        <button type="button" class="btn btn-white fl-modify" data-modify>${icon('edit')} Modify Search</button>
      </div>
      <button type="button" class="fl-sum-mobile" data-modify aria-label="Modify search">
        <span><b>${A.code} ${icon('arrow-right')} ${B.code}${round ? html` ${icon('arrow-left')}` : ''}</b><small>${fmtDate(s.depart, 'ddd, d MMM')}${round ? ' – ' + fmtDate(s.ret, 'ddd, d MMM') : ''} · ${plural(paxN, 'Traveller')} · ${CABINS[s.cabin]}</small></span>
        <span class="icon-btn">${icon('edit')}</span>
      </button>
    </section>
    <section class="fl-page">
      <div class="wrap-wide">
        ${round ? '' : html`<div class="fl-strip-wrap"><button type="button" class="fl-strip-nav" data-strip="-1" aria-label="Earlier dates">${icon('chevron-left')}</button><div class="fl-strip" data-strip-list role="list"></div><button type="button" class="fl-strip-nav" data-strip="1" aria-label="Later dates">${icon('chevron-right')}</button></div>`}
        <div class="fl-layout">
          <aside class="fl-filters" data-filters aria-label="Filters"></aside>
          <div class="fl-main">
            <div class="fl-head">
              <div><h1 class="h4" data-count></h1><p class="small muted">${fmtDate(s.depart, 'ddd, d MMM')}${round ? ` – ${fmtDate(s.ret, 'ddd, d MMM')}` : ''} ${special}</p></div>
              <div class="fl-sorts" role="group" aria-label="Sort flights" data-sorts></div>
            </div>
            ${round ? html`<div class="fl-legs" role="tablist" aria-label="Choose journey">
              <button type="button" class="fl-leg" role="tab" data-leg="out" aria-selected="true"><small>Departure</small><b>${A.code} ${icon('arrow-right')} ${B.code}</b><span data-leg-sel="out">Select a flight</span></button>
              <button type="button" class="fl-leg" role="tab" data-leg="ret" aria-selected="false"><small>Return</small><b>${B.code} ${icon('arrow-right')} ${A.code}</b><span data-leg-sel="ret">Select a flight</span></button>
            </div>` : ''}
            <div class="${round ? 'fl-rt' : ''}" data-lists>
              <div class="fl-list" data-list="out" aria-live="polite"></div>
              ${round ? html`<div class="fl-list" data-list="ret" aria-live="polite"></div>` : ''}
            </div>
          </div>
        </div>
      </div>
    </section>
    ${round ? html`<div class="fl-rtbar" data-rtbar hidden></div>` : ''}
    <div class="fl-fab" data-fab><button type="button" data-open-sort>${icon('sort')} Sort</button><span></span><button type="button" data-open-filters>${icon('filter')} Filters <b data-fcount></b></button></div>
  `);

  // ---------------------------------------------------------------- date strip
  const strip = $('[data-strip-list]', el);
  if (strip) {
    const days = fareStrip(q, s.depart, 15);
    const prices = days.filter(d => d.price).map(d => d.price);
    const lo = Math.min(...prices);
    strip.innerHTML = String(html`${days.map(d => html`<a role="listitem" class="fl-day ${d.date === s.depart ? 'is-active' : ''} ${d.price === lo ? 'is-low' : ''}" href="${href('/flights/search', { ...flightQuery({ ...s, depart: d.date }), sort: st.sort !== 'price' ? st.sort : undefined })}" ${d.date === s.depart ? raw('aria-current="date"') : ''}>
      <span>${fmtDate(d.date, 'ddd, d MMM')}</span><b class="tnum">${d.price ? money(d.price) : '—'}</b></a>`)}`);
    requestAnimationFrame(() => strip.querySelector('.is-active')?.scrollIntoView({ inline: 'center', block: 'nearest' }));
    on(el, 'click', '[data-strip]', (e, b) => strip.scrollBy({ left: Number(b.dataset.strip) * strip.clientWidth * .7, behavior: 'smooth' }));
  }

  // ---------------------------------------------------------------- filtering
  const all = () => round ? [...outList, ...retList] : outList;
  const priceBounds = () => { const p = all().map(r => r.cheapest.payable); return p.length ? [Math.floor(Math.min(...p)), Math.ceil(Math.max(...p))] : [0, 0]; };
  const [pMin, pMax] = priceBounds();
  const applies = (r, legFrom) => {
    const f = st.filters;
    if (f.stops.size && !f.stops.has(Math.min(r.stops, 2))) return false;
    if (f.dep.size && !f.dep.has(timeBucket(r.depMin))) return false;
    if (f.arr.size && !f.arr.has(timeBucket(((r.arrMin % 1440) + 1440) % 1440))) return false;
    if (f.airlines.size && !f.airlines.has(r.airline)) return false;
    if (f.refundable === true && !r.cheapest.refundable) return false;
    if (f.refundable === false && r.cheapest.refundable) return false;
    if (f.price && r.cheapest.payable > f.price) return false;
    return true;
  };
  const sorted = list => {
    const l = list.slice();
    const k = st.sort;
    if (k === 'duration') l.sort((a, b) => a.duration - b.duration || a.cheapest.payable - b.cheapest.payable);
    else if (k === 'early') l.sort((a, b) => a.depMin - b.depMin);
    else if (k === 'late') l.sort((a, b) => b.depMin - a.depMin);
    else l.sort((a, b) => a.cheapest.payable - b.cheapest.payable);
    return l;
  };
  const activeCount = () => { const f = st.filters; return f.stops.size + f.dep.size + f.arr.size + f.airlines.size + (f.refundable !== null ? 1 : 0) + (f.price && f.price < pMax ? 1 : 0); };

  function filtersHTML() {
    const list = all();
    const minBy = (pred) => { const x = list.filter(pred).map(r => r.cheapest.payable); return x.length ? Math.min(...x) : null; };
    const stops = [[0, 'Direct', '(Recommended)'], [1, '1 Stop', ''], [2, '2+ Stops', '']];
    const airlines = [...new Set(list.map(r => r.airline))].map(c => ({ c, min: minBy(r => r.airline === c) })).sort((a, b) => a.min - b.min);
    const f = st.filters;
    const bins = 24, hist = Array(bins).fill(0);
    list.forEach(r => { const i = Math.min(bins - 1, Math.floor((r.cheapest.payable - pMin) / Math.max(1, pMax - pMin) * bins)); hist[i]++; });
    const hmax = Math.max(...hist, 1);
    const cur = f.price || pMax;
    const ranges = [0, .25, .5, .75].map(t => Math.round(pMin + (pMax - pMin) * t));
    const bucket = (key, title) => html`<div class="fl-fsec"><div class="fl-fsec-head"><h3>${title}</h3>${f[key].size ? html`<button type="button" class="text-btn small" data-clear="${key}">Clear</button>` : ''}</div>
      <div class="fl-times-grid">${BUCKETS.map(([k, l, sub, ic]) => html`<button type="button" class="fl-time ${f[key].has(k) ? 'is-on' : ''}" data-f="${key}" data-v="${k}" aria-pressed="${f[key].has(k)}">${icon(ic)}<b>${l}</b><small>${sub}</small></button>`)}</div></div>`;
    return html`<div class="fl-fhead"><h2 class="h4">Filters</h2><button type="button" class="text-btn small" data-clear-all>Clear all</button></div>
      <div class="fl-fsec"><h3>Stops</h3>${stops.map(([v, l, sub]) => { const m = minBy(r => Math.min(r.stops, 2) === v); return html`<label class="check fl-check ${m == null ? 'is-disabled' : ''}"><input type="checkbox" data-f="stops" data-v="${v}" ${f.stops.has(v) ? raw('checked') : ''} ${m == null ? raw('disabled') : ''}><span class="grow">${l} <small class="muted">${sub}</small></span><span class="tnum small">${m == null ? '—' : money(m)}</span></label>`; })}</div>
      <div class="fl-fsec"><h3>Price range</h3>
        <div class="histo" aria-hidden="true">${hist.map((n, i) => html`<i class="${pMin + (pMax - pMin) * (i / bins) <= cur ? 'on' : ''}" style="height:${Math.max(6, n / hmax * 100)}%"></i>`)}</div>
        <div class="range"><div class="range-track"><div class="range-fill" style="left:0;right:${100 - ((cur - pMin) / Math.max(1, pMax - pMin)) * 100}%"></div></div><input type="range" min="${pMin}" max="${pMax}" step="50" value="${cur}" data-price aria-label="Maximum price"></div>
        <div class="spread small"><span><b class="tnum">${money(pMin)}</b><br><small class="muted">Min</small></span><span style="text-align:right"><b class="tnum" data-price-label>${money(cur)}</b><br><small class="muted">Max</small></span></div>
        <p class="small muted" style="margin:12px 0 8px">Popular ranges</p>
        <div class="chip-row">${ranges.map((v, i) => { const hi = i < 3 ? ranges[i + 1] : pMax; const label = i === 0 ? `Under ${money(ranges[1])}` : i === 3 ? `${money(v)}+` : `${money(v)} - ${money(hi)}`; return html`<button type="button" class="chip" data-price-to="${hi}">${label}</button>`; })}</div>
      </div>
      ${bucket('dep', `Departure time (${s.from})`)}
      ${bucket('arr', `Arrival time (${s.to})`)}
      <div class="fl-fsec"><h3>Airlines</h3>${airlines.map(a => html`<label class="check fl-check"><input type="checkbox" data-f="airlines" data-v="${a.c}" ${f.airlines.has(a.c) ? raw('checked') : ''}>${airlineMark(a.c, 'sm')}<span class="grow">${airline(a.c).name}</span><span class="tnum small">${money(a.min)}</span></label>`)}</div>
      <div class="fl-fsec"><h3>Fare type</h3>
        <label class="check fl-check"><input type="radio" name="fl-rf" data-rf="any" ${f.refundable === null ? raw('checked') : ''}><span class="grow">All fares</span></label>
        <label class="check fl-check"><input type="radio" name="fl-rf" data-rf="yes" ${f.refundable === true ? raw('checked') : ''}><span class="grow">Refundable</span></label>
        <label class="check fl-check"><input type="radio" name="fl-rf" data-rf="no" ${f.refundable === false ? raw('checked') : ''}><span class="grow">Non-Refundable</span></label></div>
      <button type="button" class="btn btn-light btn-block fl-reset" data-clear-all>Reset all filters</button>`;
  }

  // ---------------------------------------------------------------- cards
  function cardHTML(r, leg) {
    const f = r.cheapest;
    const selected = round && st.sel[leg]?.it.id === r.id;
    return html`<article class="fl-card ${selected ? 'is-selected' : ''}" data-id="${r.id}" data-leg="${leg}">
      <div class="fl-disc">${icon('percent')} Get Instant Discount of <b>${money(f.discount, { decimals: true })}/-</b>${f.exclusive ? html`<span class="fl-exc">${icon('thumb')} Exclusive Fare</span>` : ''}</div>
      <div class="fl-row">
        <div class="fl-air">${airlineMark(r.airline)}<div><b>${airline(r.airline).name}</b><small>${r.segments.map(x => x.flightNo).join(', ')}</small></div></div>
        <div class="fl-times">
          <div class="fl-pt"><b class="tnum">${hm(r.depMin)}</b><small>${r.from}</small></div>
          <div class="fl-path"><small>${dur(r.duration)}</small><span class="fl-line" aria-hidden="true">${icon('plane')}</span><small class="${r.stops ? 'fl-stop' : ''}">${stopsLabel(r)}</small></div>
          <div class="fl-pt"><b class="tnum">${hm(r.arrMin)}${r.dayOffset ? html`<sup>${dayMark(r.dayOffset)}</sup>` : ''}</b><small>${r.to}</small></div>
        </div>
        <div class="fl-price"><b class="tnum">${money(f.payable)}</b><s class="tnum">${money(f.total)}</s><small>per adult</small></div>
        <button type="button" class="btn ${selected ? 'btn-dark' : 'btn-primary'} fl-book" data-book>${round ? (selected ? html`${icon('check')} Selected` : 'Select') : 'Book Now'}</button>
      </div>
      <div class="fl-foot">
        <button type="button" class="fl-dbtn" data-details aria-expanded="false">Flight Details ${icon('chevron-down')}</button>
        <span class="fl-flags"><span class="fl-rf ${f.refundable ? 'ok' : 'no'}">${f.refundable ? 'Refundable' : 'Non-Refundable'}</span><span class="fl-left ${f.seats <= 3 ? 'is-low' : ''}">${icon('seat')} ${f.seats} Left</span></span>
        <button type="button" class="btn btn-outline btn-sm" data-more>More Fare</button>
      </div>
      <div class="fl-detail" hidden></div>
    </article>`;
  }

  function renderList(leg) {
    const base = leg === 'out' ? outList : retList;
    const list = sorted(base.filter(r => applies(r)));
    const box = $(`[data-list="${leg}"]`, el);
    if (!box) return list.length;
    if (!base.length) {
      box.innerHTML = String(emptyState({ iconName: 'plane', title: 'No flights on this date', text: 'Try another date from the fare strip above, or search a nearby airport.', action: html`<a class="btn btn-primary" href="#/">New search</a>` }));
      return 0;
    }
    if (!list.length) {
      box.innerHTML = String(emptyState({ iconName: 'filter', title: 'No flights match these filters', text: 'Adjust or clear your filters to see more options.', action: html`<button type="button" class="btn btn-primary" data-clear-all>Clear all filters</button>` }));
      return 0;
    }
    const n = st.shown[leg];
    box.innerHTML = String(html`${round ? html`<h2 class="fl-list-title">${leg === 'out' ? html`Departure · ${A.city} ${icon('arrow-right')} ${B.city}` : html`Return · ${B.city} ${icon('arrow-right')} ${A.city}`} <small>${fmtDate(leg === 'out' ? s.depart : s.ret, 'ddd, d MMM')}</small></h2>` : ''}
      ${list.slice(0, n).map(r => cardHTML(r, leg))}
      ${list.length > n ? html`<button type="button" class="btn btn-light btn-block fl-more" data-show-more="${leg}">Show ${Math.min(PAGE, list.length - n)} more flights (${list.length - n} remaining)</button>` : html`<p class="center small muted fl-end">Showing all ${list.length} flights</p>`}`);
    return list.length;
  }

  function renderSorts() {
    const list = (st.leg === 'ret' ? retList : outList).filter(r => applies(r));
    const cheap = list.length ? Math.min(...list.map(r => r.cheapest.payable)) : null;
    const fast = list.length ? Math.min(...list.map(r => r.duration)) : null;
    $('[data-sorts]', el).innerHTML = String(html`${SORTS.map(([k, l]) => html`<button type="button" class="fl-sort" data-sort="${k}" aria-pressed="${st.sort === k}"><b>${l}</b>${k === 'price' && cheap ? html`<small>${money(cheap)}</small>` : k === 'duration' && fast ? html`<small>${dur(fast)}</small>` : ''}</button>`)}`);
  }

  function renderAll() {
    const n1 = renderList('out');
    const n2 = round ? renderList('ret') : 0;
    $('[data-count]', el).textContent = round ? `${n1} departure · ${n2} return flights` : `${n1} of ${outList.length} flights · ${A.city} to ${B.city}`;
    $('[data-filters]', el).innerHTML = String(filtersHTML());
    renderSorts();
    const c = activeCount();
    $('[data-fcount]', el).textContent = c ? `(${c})` : '';
    if (round) renderRtBar();
  }

  // ---------------------------------------------------------------- round-trip selection
  function renderRtBar() {
    const bar = $('[data-rtbar]', el);
    const o = st.sel.out, r = st.sel.ret;
    ['out', 'ret'].forEach(leg => { const sel = st.sel[leg]; const lab = $(`[data-leg-sel="${leg}"]`, el); if (lab) lab.textContent = sel ? `${airline(sel.it.airline).name} · ${hm(sel.it.depMin)} · ${money(sel.fare.payable)}` : 'Select a flight'; });
    if (!o && !r) { bar.hidden = true; document.body.classList.remove('has-mobile-cta'); return; }
    bar.hidden = false;
    document.body.classList.add('has-mobile-cta');
    const total = (o ? o.fare.payable : 0) + (r ? r.fare.payable : 0);
    const pick = (sel, label) => sel ? html`<div class="fl-rt-pick">${airlineMark(sel.it.airline, 'sm')}<div><small>${label}</small><b>${hm(sel.it.depMin)} → ${hm(sel.it.arrMin)}</b><small>${sel.fare.name} · ${money(sel.fare.payable)}</small></div></div>` : html`<div class="fl-rt-pick is-empty"><div><small>${label}</small><b>Select a flight</b></div></div>`;
    bar.innerHTML = String(html`<div class="wrap-wide fl-rt-inner">${pick(o, 'Departure')}${pick(r, 'Return')}
      <div class="fl-rt-total"><small>Total per adult</small><b class="tnum">${money(total)}</b></div>
      <button type="button" class="btn btn-primary btn-lg" data-rt-book ${!(o && r) ? raw('disabled') : ''}>Book Now ${icon('arrow-right')}</button></div>`);
  }

  function selectFor(leg, it, fare) {
    st.sel[leg] = { it, fare };
    renderAll();
    if (leg === 'out' && !st.sel.ret) {
      if (isTouchNav()) switchLeg('ret');
      toast('Now choose your return flight.', { type: 'info' });
    }
  }
  function switchLeg(leg) {
    st.leg = leg;
    $$('[data-leg]', el).forEach(b => b.getAttribute('role') === 'tab' && b.setAttribute('aria-selected', String(b.dataset.leg === leg)));
    $('[data-lists]', el).dataset.active = leg;
    renderSorts();
    if (isTouchNav()) scrollTo({ top: $('.fl-page', el).offsetTop - 70, behavior: 'smooth' });
  }

  async function proceed(selOut, selRet) {
    const exclusive = selOut.fare.exclusive || selRet?.fare.exclusive;
    if (exclusive && !(await exclusiveNotice())) return;
    go('/flights/review', {
      query: { ...flightQuery(s), ob: selOut.it.id, obf: selOut.fare.id, ib: selRet?.it.id, ibf: selRet?.fare.id }
    });
  }

  const findIt = (leg, id) => (leg === 'ret' ? retList : outList).find(r => r.id === id);

  // ---------------------------------------------------------------- events
  const unbind = [];
  unbind.push(bindDetailTabs(el));
  unbind.push(on(el, 'click', '[data-details]', (e, b) => {
    const card = b.closest('.fl-card');
    const it = findIt(card.dataset.leg, card.dataset.id);
    const panel = $('.fl-detail', card);
    const open = panel.hidden;
    if (open && !panel.innerHTML) panel.innerHTML = String(detailsPanel(it, (round && st.sel[card.dataset.leg]?.it.id === it.id ? st.sel[card.dataset.leg].fare : it.cheapest), pax));
    panel.hidden = !open;
    b.setAttribute('aria-expanded', String(open));
    b.classList.toggle('is-open', open);
  }));
  unbind.push(on(el, 'click', '[data-more]', async (e, b) => {
    const card = b.closest('.fl-card');
    const leg = card.dataset.leg;
    const it = findIt(leg, card.dataset.id);
    const fare = await openFareOptions(it, { current: round ? st.sel[leg]?.it.id === it.id && st.sel[leg].fare.id : null, cta: round ? 'Select this fare' : undefined });
    if (!fare) return;
    if (round) selectFor(leg, it, fare); else proceed({ it, fare });
  }));
  unbind.push(on(el, 'click', '[data-book]', (e, b) => {
    const card = b.closest('.fl-card');
    const leg = card.dataset.leg;
    const it = findIt(leg, card.dataset.id);
    if (round) selectFor(leg, it, it.cheapest); else proceed({ it, fare: it.cheapest });
  }));
  unbind.push(on(el, 'click', '[data-rt-book]', () => { if (st.sel.out && st.sel.ret) proceed(st.sel.out, st.sel.ret); }));
  unbind.push(on(el, 'click', '[data-leg]', (e, b) => { if (b.getAttribute('role') === 'tab') switchLeg(b.dataset.leg); }));
  unbind.push(on(el, 'click', '[data-show-more]', (e, b) => { st.shown[b.dataset.showMore] += PAGE; renderList(b.dataset.showMore); }));
  unbind.push(on(el, 'click', '[data-sort]', (e, b) => { st.sort = b.dataset.sort; setQuery({ sort: st.sort === 'price' ? null : st.sort }); renderAll(); }));

  const filterEvents = root => {
    const u = [];
    u.push(on(root, 'change', 'input[data-f]', (e, i) => {
      const key = i.dataset.f; const v = key === 'stops' ? Number(i.dataset.v) : i.dataset.v;
      i.checked ? st.filters[key].add(v) : st.filters[key].delete(v);
      st.shown = { out: PAGE, ret: PAGE }; renderAll(); refreshSheet();
    }));
    u.push(on(root, 'click', 'button[data-f]', (e, b) => {
      const key = b.dataset.f, v = b.dataset.v;
      st.filters[key].has(v) ? st.filters[key].delete(v) : st.filters[key].add(v);
      st.shown = { out: PAGE, ret: PAGE }; renderAll(); refreshSheet();
    }));
    u.push(on(root, 'change', 'input[data-rf]', (e, i) => { st.filters.refundable = i.dataset.rf === 'any' ? null : i.dataset.rf === 'yes'; renderAll(); refreshSheet(); }));
    u.push(on(root, 'input', 'input[data-price]', (e, i) => {
      st.filters.price = Number(i.value);
      const lab = $('[data-price-label]', root); if (lab) lab.textContent = money(st.filters.price);
      const fill = i.parentElement.querySelector('.range-fill'); if (fill) fill.style.right = (100 - ((st.filters.price - pMin) / Math.max(1, pMax - pMin)) * 100) + '%';
    }));
    u.push(on(root, 'change', 'input[data-price]', () => { renderAll(); refreshSheet(); }));
    u.push(on(root, 'click', '[data-price-to]', (e, b) => { st.filters.price = Number(b.dataset.priceTo); renderAll(); refreshSheet(); }));
    u.push(on(root, 'click', '[data-clear]', (e, b) => { st.filters[b.dataset.clear].clear(); renderAll(); refreshSheet(); }));
    u.push(on(root, 'click', '[data-clear-all]', () => { st.filters = blankFilters(); renderAll(); refreshSheet(); }));
    return () => u.forEach(f => f());
  };
  unbind.push(filterEvents(el));

  // Mobile sheets for filters and sort
  let sheet = null;
  const refreshSheet = () => { if (sheet?.kind === 'filters') { sheet.api.setBody(filtersHTML()); } };
  unbind.push(on(el, 'click', '[data-open-filters]', () => {
    const api = openModal({ title: 'Filters', body: filtersHTML(), foot: html`<button type="button" class="btn btn-light" data-clear-all>Clear all</button><button type="button" class="btn btn-primary" data-close>Show flights</button>`, fullscreen: true, onClose: () => { off(); sheet = null; } });
    const off = filterEvents(api.el);
    sheet = { kind: 'filters', api };
  }));
  unbind.push(on(el, 'click', '[data-open-sort]', () => {
    const api = openModal({ title: 'Sort by', body: html`<div class="stack gap-8">${SORTS.map(([k, l]) => html`<button type="button" class="opt ${st.sort === k ? 'is-hl' : ''}" data-sort-pick="${k}"><span class="opt-main"><b>${l}</b></span>${st.sort === k ? icon('check') : ''}</button>`)}</div>` });
    on(api.el, 'click', '[data-sort-pick]', (e, b) => { st.sort = b.dataset.sortPick; setQuery({ sort: st.sort === 'price' ? null : st.sort }); renderAll(); api.close(); });
  }));

  unbind.push(on(el, 'click', '[data-modify]', () => {
    const api = openModal({
      title: 'Modify search', size: 'wide', fullscreen: true,
      body: searchCard({ service: 'flights', tabs: false, id: 'modify-search' }),
      onOpen: (m) => bindSearchCard(m.querySelector('[data-search-card]'), { state: { flights: { ...s } }, onSearch: (svc, query) => { api.close(); go('/flights/search', { query }); } })
    });
  }));

  // Pre-select from the query when coming back from the review page.
  const pre = (leg, idKey) => { const it = findIt(leg, ctx.query.get(idKey)); if (it) st.sel[leg] = { it, fare: it.fares.find(f => f.id === ctx.query.get(idKey + 'f')) || it.cheapest }; };
  if (round) { pre('out', 'ob'); pre('ret', 'ib'); }

  // Brief "Searching flights…" state like the live site, then results.
  const lists = $('[data-lists]', el);
  lists.dataset.active = 'out';
  $$('[data-list]', el).forEach(b => { b.innerHTML = String(html`<p class="fl-searching">${icon('plane')} Searching flights…</p>${Array.from({ length: 4 }, () => html`<div class="fl-card fl-skel"><div class="skeleton" style="height:16px;width:30%"></div><div class="skeleton" style="height:44px;margin-top:14px"></div><div class="skeleton" style="height:12px;width:60%;margin-top:14px"></div></div>`)}`); });
  $('[data-count]', el).textContent = 'Searching flights…';
  const timer = setTimeout(renderAll, 550);
  unbind.push(() => clearTimeout(timer));

  const unsub = store.subscribe((stt, patch) => { if ('currency' in patch) renderAll(); });
  return () => { unbind.forEach(f => f()); unsub(); document.body.classList.remove('has-mobile-cta'); };
}
