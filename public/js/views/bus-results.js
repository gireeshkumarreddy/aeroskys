// Bus results (#/bus/search?from=Delhi&to=Jaipur&date=YYYY-MM-DD): summary band, date strip,
// filters, sort and bus cards with seat selection — an inline panel on desktop and a
// full-screen sheet on phones. Also exports the small render helpers shared by the bus views.
// Data attributes are namespaced data-bs-* so no other view's delegated handlers can collide.
import { html, raw, icon, mount, on, $, $$, debounce, isMobile } from '../core/dom.js';
import { money, fmtDate, addDays, today, hm12, plural } from '../core/format.js';
import { go, href, setQuery } from '../core/router.js';
import { store, pushRecent } from '../core/store.js';
import { openModal } from '../ui/overlay.js';
import { toast } from '../ui/toast.js';
import { searchCard, bindSearchCard, parseBusQuery } from '../ui/search.js';
import { emptyState, crumbs } from '../ui/common.js';
import { AMENITIES, OPERATOR, POPULAR_BUS_ROUTES, FEATURED_ROUTES } from '../data/bus.js';
import { searchBuses, seatLayout, routeInfo, isBookable, lowestFare, timeBucket, TIME_BUCKETS, CANCEL_TIERS, MAX_SEATS, hrsLabel, stripDates } from '../engines/buses.js';

// ---------------------------------------------------------------- shared render helpers
/** Operator monogram tile. Accepts a bus ({ opShort, opColor }) or an operator ({ short, color }). */
export const opMark = (o, cls = '') => html`<span class="bs-mark ${cls}" style="--op:${o.opColor || o.color}" aria-hidden="true">${o.opShort || o.short}</span>`;

export const rateBadge = (r, count) => html`<span class="bs-rate ${r >= 4.2 ? '' : r >= 3.8 ? 'is-mid' : 'is-low'}" role="img" aria-label="Rated ${r.toFixed(1)} out of 5">${icon('star')}${r.toFixed(1)}</span>${count ? html`<small class="bs-rcount">${count.toLocaleString('en-IN')} ratings</small>` : ''}`;

export function amenityList(ids, max = 7) {
  const shown = ids.slice(0, max);
  return html`<ul class="bs-amen" aria-label="Amenities">${shown.map(a => html`<li title="${AMENITIES[a].label}">${icon(AMENITIES[a].icon)}<span class="sr-only">${AMENITIES[a].label}</span></li>`)}${ids.length > max ? html`<li class="bs-amen-more" title="${ids.slice(max).map(a => AMENITIES[a].label).join(', ')}">+${ids.length - max}</li>` : ''}</ul>`;
}

/** Cancellation tiers; with a total (INR) adds the refund per tier. Prices carry data-inr for currency switches. */
export function policyHTML(total) {
  return html`<div class="bs-policy">
    <div class="bs-ptable-wrap"><table class="bs-ptable">
      <thead><tr><th scope="col">Time before departure</th><th scope="col">Cancellation charge</th>${total ? html`<th scope="col">You get back</th>` : ''}</tr></thead>
      <tbody>${CANCEL_TIERS.map(t => html`<tr><td>${t.label}</td><td>${t.charge === 100 ? 'Non-refundable' : `${t.charge}%`}</td>${total ? html`<td class="tnum" data-inr="${Math.round(total * (100 - t.charge) / 100)}">${money(Math.round(total * (100 - t.charge) / 100))}</td>` : ''}</tr>`)}</tbody>
    </table></div>
    <ul class="bs-pnotes">
      <li>Cancellations made at least 6 hours before departure may qualify for a partial or full refund, as per the operator’s policy.</li>
      <li>Cancellations within 6 hours of departure or after departure are typically non-refundable.</li>
      <li>Refunds, where applicable, reach the original payment method within 7–14 business days.</li>
    </ul>
  </div>`;
}

/** Re-formats every [data-inr] price inside root after a currency switch. */
export function repaintMoney(root) {
  $$('[data-inr]', root).forEach(n => { n.textContent = money(Number(n.dataset.inr)); });
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const TYPE_TILES = [['nonac', 'Non AC', 'sun'], ['seater', 'Seater', 'seat'], ['ac', 'AC', 'snow'], ['sleeper', 'Sleeper', 'bed']];
const SORTS = [['price', 'Price', 'tag'], ['dep', 'Departure time', 'takeoff'], ['arr', 'Arrival time', 'landing']];
const SORT_DIR = { price: ['low to high', 'high to low'], dep: ['earliest first', 'latest first'], arr: ['earliest first', 'latest first'] };
const blankFilters = () => ({ types: new Set(), dep: new Set(), arr: new Set(), bp: new Set(), dp: new Set(), ops: new Set(), price: null });

// Filters, sort and seat selections survive date changes and a trip to the review page.
let memo = { key: '' };

// ---------------------------------------------------------------- seat map pieces
function seatLabel(x) {
  const kind = `${x.deck} deck ${x.type}`;
  if (x.status === 'sold') return `Seat ${x.no}, ${kind}, already booked`;
  const who = x.status === 'ladies' ? ', available for female passengers only' : x.status === 'men' ? ', available for male passengers only' : ', available';
  return `Seat ${x.no}, ${kind}, ${money(x.price)}${who}`;
}

function seatHTML(x, s) {
  const sel = s.seats.includes(x.no);
  const sold = x.status === 'sold';
  return html`<button type="button" class="bs-seat t-${x.type} st-${x.status}${sel ? ' is-sel' : ''}" data-bs-seat="${x.no}" data-r="${x.row}" data-c="${x.col}" style="grid-row:${x.row + 1} / span ${x.h};grid-column:${x.col + 1}" aria-pressed="${sel}" aria-label="${seatLabel(x)}"${sold ? raw(' disabled') : ''}>${x.status === 'ladies' ? html`<i class="bs-g" aria-hidden="true">♀</i>` : x.status === 'men' ? html`<i class="bs-g" aria-hidden="true">♂</i>` : ''}<span class="bs-seat-p">${sold ? 'Sold' : money(x.price)}</span></button>`;
}

function deckHTML(d, s) {
  return html`<section class="bs-deck is-${d.id}" aria-label="${d.label}">
    <header class="bs-deck-head"><span>${d.label}</span>${d.id === 'lower' ? html`<span class="bs-wheel" title="Driver">${icon('steering')}<span class="sr-only">Driver’s cabin</span></span>` : html`<span class="bs-deck-tag">${d.kind === 'sleeper' ? 'Berths' : 'Seats'}</span>`}</header>
    <div class="bs-grid is-${d.kind}" role="group" aria-label="${d.label} seats" style="grid-template-columns:repeat(${d.cols},var(--cell));grid-template-rows:repeat(${d.rows},var(--rowh))">${d.seats.map(x => seatHTML(x, s))}</div>
  </section>`;
}

const legendHTML = () => html`<details class="bs-legend"${isMobile() ? '' : raw(' open')}>
  <summary>${icon('info')}<span>Know your seat types</span>${icon('chevron-down')}</summary>
  <div class="bs-leg">
    <div><h5>Seat Types</h5><ul><li><i class="bs-sw sw-seater" aria-hidden="true"></i>Seater</li><li><i class="bs-sw sw-sleeper" aria-hidden="true"></i>Sleeper</li></ul></div>
    <div><h5>Seat Availability</h5><ul>
      <li><i class="bs-sw sw-avail" aria-hidden="true"></i>Available</li>
      <li><i class="bs-sw sw-men" aria-hidden="true">♂</i>Available for men</li>
      <li><i class="bs-sw sw-ladies" aria-hidden="true">♀</i>Available for female</li>
      <li><i class="bs-sw sw-sold" aria-hidden="true"></i>Already booked</li>
      <li><i class="bs-sw sw-sel" aria-hidden="true"></i>Selected by you</li>
    </ul></div>
  </div>
</details>`;

function seatMapHTML(b, s) {
  const L = seatLayout(b);
  const two = L.decks.length > 1;
  return html`<div class="bs-map">
    ${two ? html`<div class="seg bs-deckseg" role="group" aria-label="Choose deck">${L.decks.map(d => html`<button type="button" data-bs-deck="${d.id}" aria-pressed="${s.deck === d.id}">${d.label}</button>`)}</div>` : ''}
    <div class="bs-decks${two ? ' is-two' : ''}" data-show="${s.deck}">${L.decks.map(d => deckHTML(d, s))}</div>
    ${legendHTML()}
  </div>`;
}

function pointsHTML(b, s, kind, where) {
  const list = kind === 'bp' ? b.boarding : b.dropping;
  return html`<fieldset class="bs-points" data-bs-fs="${kind}">
    <legend><span>${kind === 'bp' ? 'Boarding points' : 'Dropping points'}</span><small>${kind === 'bp' ? b.from : b.to} · ${plural(list.length, 'point')}</small></legend>
    <div class="bs-pt-list">${list.map(p => html`<label class="bs-pt">
      <input type="radio" name="${kind}-${b.id}-${where}" value="${p.id}" data-bs-pt="${kind}"${s[kind] === p.id ? raw(' checked') : ''}>
      <span class="bs-pt-time"><b>${p.time}</b>${p.date !== b.date ? html`<small>${fmtDate(p.date, 'd MMM')}</small>` : ''}</span>
      <span class="bs-pt-txt"><b>${p.name}</b><small>${p.landmark}</small></span>
    </label>`)}</div>
  </fieldset>`;
}

function picked(b, s) {
  const L = seatLayout(b);
  const seats = s.seats.map(no => L.byNo[no]).filter(Boolean);
  return { seats, total: seats.reduce((n, x) => n + x.price, 0) };
}
const needText = (s, seats) => !seats.length ? 'Select at least one seat to continue' : !s.bp ? 'Choose a boarding point' : !s.dp ? 'Choose a dropping point' : '';

function sumHTML(b, s) {
  const { seats, total } = picked(b, s);
  const need = needText(s, seats);
  const restricted = seats.filter(x => x.status === 'ladies' || x.status === 'men');
  return html`<div class="bs-sum-row"><span>Selected seats</span><b>${seats.length ? seats.map(x => x.no).join(', ') : '—'}</b></div>
    <div class="bs-sum-row is-total"><span>Total${b.ac ? html` <small>+ 5% GST</small>` : ''}</span><b class="tnum">${money(total)}</b></div>
    ${restricted.length ? html`<p class="bs-sum-note">${icon('info')}<span>${restricted.map(x => `Seat ${x.no} is for ${x.status === 'ladies' ? 'a female' : 'a male'} passenger`).join('. ')}.</span></p>` : ''}
    <p class="bs-need" role="status">${need}</p>
    <button type="button" class="btn btn-primary btn-block bs-go" data-bs-go="${b.id}"${need ? raw(' disabled') : ''}>Continue ${icon('arrow-right')}</button>`;
}

function panelHTML(b, s) {
  return html`<div class="bs-sp" data-bs-ui="${b.id}">
    <div class="bs-sp-main">
      <div class="bs-sp-top"><h4 tabindex="-1" data-bs-title>Select your seats</h4><small>Up to ${MAX_SEATS} seats per booking</small></div>
      ${seatMapHTML(b, s)}
    </div>
    <aside class="bs-sp-side" aria-label="Trip and points">
      <div class="bs-sp-trip">
        <div class="bs-sp-op">${opMark(b, 'sm')}<div><b>${b.operator}</b><small>${b.busType}</small></div></div>
        <p class="bs-sp-when">${hm12(b.dep)} - ${hm12(b.arr)} • ${fmtDate(b.date, 'd MMM, yyyy')}</p>
        <p class="bs-sp-route">${b.from}-${b.to}</p>
      </div>
      ${pointsHTML(b, s, 'bp', 'in')}
      ${pointsHTML(b, s, 'dp', 'in')}
      <div class="bs-sum" data-bs-sum>${sumHTML(b, s)}</div>
    </aside>
  </div>`;
}

// ---------------------------------------------------------------- view
export default async function busResults(el, ctx) {
  const q = parseBusQuery(ctx.query);
  const info = routeInfo(q.from, q.to);
  const A = info.A, B = info.B;
  const from = A?.name || q.from, to = B?.name || q.to, date = q.date;
  document.title = A && B ? `${from} to ${to} bus tickets — AeroSkys` : 'Search buses — AeroSkys';
  const offs = [];
  const tm = addDays(today(), 1);

  // ------------------------------------------------ route problems: missing, same, unknown or too far
  if (!info.ok) {
    const far = info.reason === 'far';
    const suggestions = [...FEATURED_ROUTES.map(r => [r.from, r.to]), ...POPULAR_BUS_ROUTES].filter(([a]) => a === from).slice(0, 4);
    const list = suggestions.length ? suggestions : POPULAR_BUS_ROUTES.slice(0, 4);
    mount(el, html`<section class="band bs-band bs-band-plain">
        <div class="wrap">
          ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Bus', href: '#/bus' }, { label: far ? `${from} to ${to}` : 'Search' }])}
          <h1 class="bs-h1">${far ? html`${from} <em>to</em> ${to}` : html`Search <em>bus tickets</em>`}</h1>
        </div>
      </section>
      <section class="wrap bs-none">
        ${far ? emptyState({ iconName: 'bus', title: 'No buses on this route', text: `${from} and ${to} are about ${info.km.toLocaleString('en-IN')} km apart by road — too far for direct bus services. Try a flight, or break the journey at a city in between.`, action: html`<div class="bs-empty-actions"><button type="button" class="btn btn-primary" data-bs-modify>${icon('edit')} Modify search</button><a class="btn btn-light" href="#/">${icon('plane')} Search flights</a></div>` })
          : html`<div class="bs-none-card">${searchCard({ service: 'bus', tabs: false, id: 'bus-search' })}</div>
            ${info.reason === 'same' ? html`<div class="note note-amber" style="margin-top:14px">${icon('alert')}<span>Source and destination cannot be the same city. Please choose a different destination.</span></div>` : q.from || q.to ? html`<div class="note" style="margin-top:14px">${icon('info')}<span>We couldn’t find “${q.from && !A ? q.from : q.to}”. Choose your source and destination from the city list.</span></div>` : ''}`}
        <div class="bs-suggest">
          <span class="eyebrow">Popular routes</span>
          <div class="chip-row">${list.map(([a, b]) => html`<a class="route-chip" href="${href('/bus/search', { from: a, to: b, date: tm })}">${a} ${icon('arrow-right')} ${b}</a>`)}</div>
        </div>
      </section>`);
    const form = $('[data-search-card]', el);
    if (form) bindSearchCard(form, { state: { bus: { from: A?.name || '', to: info.reason === 'same' ? '' : B?.name || '', date } } });
    offs.push(on(el, 'click', '[data-bs-modify]', () => openModify({ from, to, date })));
    return () => offs.forEach(f => f());
  }

  // ------------------------------------------------ state
  const all = searchBuses({ from, to, date });
  const buses = all.filter(b => isBookable(b));
  const departed = all.length - buses.length;
  pushRecent('bus', { key: `${from}-${to}`, from, to, state: { from, to, date } });

  const key = `${from}|${to}`;
  if (memo.key !== key) memo = { key, sort: { key: 'price', dir: 1 }, f: blankFilters(), popTab: 'bp', sel: new Map(), open: null };
  const st = memo;
  const byId = id => buses.find(b => b.id === id);

  // Deep links: ?op= (operator filter from the bus landing page) and ?open=&seats=&bp=&dp= ("Change seats").
  const opParam = OPERATOR[ctx.query.get('op')]?.name;
  if (opParam && buses.some(b => b.operator === opParam)) st.f.ops = new Set([opParam]);
  const openParam = ctx.query.get('open');
  if (openParam && byId(openParam)) {
    const b = byId(openParam), L = seatLayout(b);
    const seats = (ctx.query.get('seats') || '').split(',').filter(no => L.byNo[no] && L.byNo[no].status !== 'sold').slice(0, MAX_SEATS);
    const bp = b.boarding.some(p => p.id === ctx.query.get('bp')) ? ctx.query.get('bp') : null;
    const dp = b.dropping.some(p => p.id === ctx.query.get('dp')) ? ctx.query.get('dp') : null;
    st.sel.set(b.id, { seats, bp, dp, deck: 'lower', tab: seats.length ? 'points' : 'seats' });
    st.open = b.id;
  }
  if (ctx.query.has('op') || ctx.query.has('open')) setQuery({ op: null, open: null, seats: null, bp: null, dp: null });
  if (st.open && !byId(st.open)) st.open = null;

  const selOf = b => {
    if (!st.sel.has(b.id)) st.sel.set(b.id, { seats: [], bp: b.boarding.length === 1 ? b.boarding[0].id : null, dp: b.dropping.length === 1 ? b.dropping[0].id : null, deck: 'lower', tab: 'seats' });
    return st.sel.get(b.id);
  };

  // ------------------------------------------------ stats for filters
  const tally = get => {
    const m = new Map();
    buses.forEach(b => new Set(get(b)).forEach(v => m.set(v, (m.get(v) || 0) + 1)));
    return [...m].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  };
  const prices = buses.map(b => b.fareFrom);
  const stats = {
    types: { ac: buses.filter(b => b.ac).length, nonac: buses.filter(b => !b.ac).length, seater: buses.filter(b => b.seater).length, sleeper: buses.filter(b => b.sleeper).length },
    dep: Object.fromEntries(TIME_BUCKETS.map(t => [t.id, buses.filter(b => timeBucket(b.dep) === t.id).length])),
    arr: Object.fromEntries(TIME_BUCKETS.map(t => [t.id, buses.filter(b => timeBucket(b.arr) === t.id).length])),
    bp: tally(b => b.boarding.map(p => p.name)), dp: tally(b => b.dropping.map(p => p.name)), ops: tally(b => [b.operator]),
    pmin: prices.length ? Math.floor(Math.min(...prices) / 10) * 10 : 0,
    pmax: prices.length ? Math.ceil(Math.max(...prices) / 10) * 10 : 0
  };
  // ?board= / ?drop= preselect a boarding or dropping point (e.g. from a point picked in the search autocomplete).
  for (const [param, k] of [['board', 'bp'], ['drop', 'dp']]) {
    const want = (ctx.query.get(param) || '').toLowerCase();
    const hit = want && stats[k].find(o => o.value.toLowerCase() === want);
    if (hit) st.f[k] = new Set([hit.value]);
  }
  if (ctx.query.has('board') || ctx.query.has('drop')) setQuery({ board: null, drop: null });
  // Drop remembered filter values that do not exist on this date.
  for (const k of ['bp', 'dp', 'ops']) st.f[k] = new Set([...st.f[k]].filter(v => stats[k].some(o => o.value === v)));
  if (st.f.price) {
    const [lo, hi] = st.f.price;
    st.f.price = hi < stats.pmin || lo > stats.pmax ? null : [Math.max(lo, stats.pmin), Math.min(hi, stats.pmax)];
  }

  const pass = (b, f = st.f) => {
    const ac = [...f.types].filter(t => t === 'ac' || t === 'nonac');
    const kind = [...f.types].filter(t => t === 'seater' || t === 'sleeper');
    if (ac.length && !ac.includes(b.ac ? 'ac' : 'nonac')) return false;
    if (kind.length && !kind.some(k => b[k])) return false;
    if (f.price && (b.fareFrom < f.price[0] || b.fareFrom > f.price[1])) return false;
    if (f.dep.size && !f.dep.has(timeBucket(b.dep))) return false;
    if (f.arr.size && !f.arr.has(timeBucket(b.arr))) return false;
    if (f.bp.size && !b.boarding.some(p => f.bp.has(p.name))) return false;
    if (f.dp.size && !b.dropping.some(p => f.dp.has(p.name))) return false;
    if (f.ops.size && !f.ops.has(b.operator)) return false;
    return true;
  };
  const activeCount = () => st.f.types.size + st.f.dep.size + st.f.arr.size + st.f.bp.size + st.f.dp.size + st.f.ops.size + (st.f.price ? 1 : 0);
  const sortFn = () => {
    const { key: k, dir } = st.sort;
    const val = b => k === 'price' ? b.fareFrom : k === 'dep' ? b.dep : b.arr;
    return (a, b) => (a.soldOut - b.soldOut) || dir * (val(a) - val(b)) || a.dep - b.dep;
  };
  const visible = () => buses.filter(b => pass(b)).sort(sortFn());

  // ------------------------------------------------ date strip
  let stripCenter = date;
  const lowCache = new Map();
  const lowFor = d => { if (!lowCache.has(d)) lowCache.set(d, lowestFare({ from, to, date: d })); return lowCache.get(d); };
  const datesHTML = () => {
    const days = stripDates(stripCenter, 3);
    const first = days[0], last = days[days.length - 1];
    return html`<button type="button" class="bs-dnav" data-bs-shift="-7" aria-label="Earlier dates"${first <= today() ? raw(' disabled') : ''}>${icon('chevron-left')}</button>
      <div class="bs-dlist">${days.map(d => {
        const p = lowFor(d), sel = d === date;
        return html`<button type="button" class="bs-day${sel ? ' is-on' : ''}" data-bs-day="${d}"${sel ? raw(' aria-current="date"') : ''} aria-label="${fmtDate(d, 'dddd, d MMMM')}${p ? `, buses from ${money(p)}` : ', no buses'}"><span>${fmtDate(d, 'ddd')}</span><b>${fmtDate(d, 'd MMM')}</b><small>${p ? money(p) : '—'}</small></button>`;
      })}</div>
      <button type="button" class="bs-dnav" data-bs-shift="7" aria-label="Later dates"${last >= addDays(today(), 364) ? raw(' disabled') : ''}>${icon('chevron-right')}</button>`;
  };

  // ------------------------------------------------ filters
  const checkList = (k, title, opts) => html`<section class="bs-fsec">
    <div class="bs-fsec-head"><h3>${title}</h3><button type="button" class="text-btn" data-bs-fclear="${k}" aria-label="Clear ${title} filter"${st.f[k].size ? '' : raw(' hidden')}>Clear</button></div>
    ${opts.length > 6 ? html`<label class="bs-fsearch">${icon('search')}<input type="search" placeholder="Search ${title.toLowerCase()}" data-bs-fsearch="${k}" aria-label="Search ${title}" autocomplete="off"></label>` : ''}
    <ul class="bs-checks" data-bs-checks="${k}">${opts.map((o, i) => html`<li${i >= 6 ? raw(' data-more') : ''}><label class="check"><input type="checkbox" data-bs-fchk="${k}" value="${o.value}"${st.f[k].has(o.value) ? raw(' checked') : ''}><span class="grow">${o.value}</span><small>${o.count}</small></label></li>`)}</ul>
    <p class="bs-fnone" hidden>No matches.</p>
    ${opts.length > 6 ? html`<button type="button" class="text-btn bs-fmore" data-bs-fmore="${k}" aria-expanded="false">Show all ${opts.length}</button>` : ''}
  </section>`;

  const pct = v => ((v - stats.pmin) / Math.max(1, stats.pmax - stats.pmin)) * 100;
  const BINS = 14;
  const bins = Array.from({ length: BINS }, () => 0);
  prices.forEach(p => { bins[Math.min(BINS - 1, Math.floor(pct(p) / 100 * BINS))]++; });
  const maxBin = Math.max(1, ...bins);
  const priceHTML = () => {
    const [lo, hi] = st.f.price || [stats.pmin, stats.pmax];
    if (stats.pmax - stats.pmin < 20) return html`<p class="small muted">All buses from ${money(stats.pmin)}</p>`;
    return html`<div class="bs-price">
      <div class="histo" aria-hidden="true">${bins.map((n, i) => html`<i data-bin="${i}" class="${(i + .5) / BINS * 100 >= pct(lo) && (i + .5) / BINS * 100 <= pct(hi) ? 'on' : ''}" style="height:${Math.max(6, n / maxBin * 100)}%"></i>`)}</div>
      <div class="range">
        <div class="range-track"><div class="range-fill" data-bs-fill style="left:${pct(lo)}%;right:${100 - pct(hi)}%"></div></div>
        <input type="range" min="${stats.pmin}" max="${stats.pmax}" step="10" value="${lo}" data-bs-lo aria-label="Minimum price">
        <input type="range" min="${stats.pmin}" max="${stats.pmax}" step="10" value="${hi}" data-bs-hi aria-label="Maximum price">
      </div>
      <div class="bs-price-vals"><span data-bs-plo>${money(lo)}</span><span data-bs-phi>${money(hi)}</span></div>
    </div>`;
  };

  const tileRow = (k, list) => html`<div class="bs-tiles${list.length === 4 && k !== 'types' ? ' is-time' : ''}">${list.map(([v, label, ic]) => html`<button type="button" class="bs-tile" data-bs-ftile="${k}" data-v="${v}" aria-pressed="${st.f[k].has(v)}">${icon(ic)}<span>${label}</span><small>${(k === 'types' ? stats.types : stats[k])[v]}</small></button>`)}</div>`;

  const filtersHTML = () => html`
    <div class="bs-fhead"><h2 class="h4">Filters</h2><button type="button" class="text-btn" data-bs-clear${activeCount() ? '' : raw(' hidden')}>Clear All</button></div>
    <section class="bs-fsec"><div class="bs-fsec-head"><h3>Bus Type</h3></div>${tileRow('types', TYPE_TILES)}</section>
    <section class="bs-fsec"><div class="bs-fsec-head"><h3>Price Range</h3></div><div data-bs-price>${priceHTML()}</div></section>
    <section class="bs-fsec"><div class="bs-fsec-head"><h3>Departure Time</h3></div>${tileRow('dep', TIME_BUCKETS.map(t => [t.id, t.label, t.icon]))}</section>
    <section class="bs-fsec"><div class="bs-fsec-head"><h3>Arrival Time</h3></div>${tileRow('arr', TIME_BUCKETS.map(t => [t.id, t.label, t.icon]))}</section>
    ${checkList('bp', 'Boarding Point', stats.bp)}
    ${checkList('dp', 'Dropping Points', stats.dp)}
    ${checkList('ops', 'Bus Partner', stats.ops)}`;

  const sortHTML = () => html`<span class="bs-sort-label">Sort by:</span>${SORTS.map(([k, l]) => {
    const act = st.sort.key === k, d = act ? st.sort.dir : 1;
    return html`<button type="button" class="bs-sortbtn" data-bs-sort="${k}" aria-pressed="${act}" aria-label="Sort by ${l.toLowerCase()}, ${SORT_DIR[k][d === 1 ? 0 : 1]}">${l}${act ? icon(d === 1 ? 'chevron-up' : 'chevron-down') : ''}</button>`;
  })}`;

  const popularHTML = () => {
    const k = st.popTab;
    const list = stats[k].slice(0, 10);
    return html`<div class="bs-pop-head"><h3>Popular Filters</h3>
        <div class="bs-pop-tabs" role="tablist" aria-label="Popular filters">
          <button type="button" role="tab" data-bs-poptab="bp" aria-selected="${k === 'bp'}">Boarding Points</button>
          <button type="button" role="tab" data-bs-poptab="ops" aria-selected="${k === 'ops'}">Operators</button>
        </div></div>
      <div class="chip-scroll bs-pop-chips" role="tabpanel">${list.map(o => html`<button type="button" class="chip" data-bs-popchip="${k}" data-v="${o.value}" aria-pressed="${st.f[k].has(o.value)}">${k === 'bp' ? icon('pin') : icon('bus')}${o.value}<small>${o.count}</small></button>`)}</div>`;
  };

  // ------------------------------------------------ cards
  const cardHTML = (b, i) => {
    const open = st.open === b.id && !isMobile();
    const low = !b.soldOut && b.seatsLeft <= 5;
    const bp0 = b.boarding[0], dpN = b.dropping[b.dropping.length - 1];
    return html`<article class="bs-card${b.soldOut ? ' is-soldout' : ''}${open ? ' is-open' : ''}" data-bs-card="${b.id}" style="--i:${Math.min(i, 10)}">
      <div class="bs-card-body">
        <div class="bs-op">
          ${opMark(b)}
          <div class="bs-op-txt">
            <h3>${b.operator}</h3>
            <p>${b.busType}</p>
            <div class="bs-op-meta">${rateBadge(b.rating, b.ratingCount)}${b.electric ? html`<span class="badge badge-green">${icon('zap')} Electric</span>` : ''}${b.rating >= 4.5 ? html`<span class="badge badge-blue">Top rated</span>` : ''}</div>
          </div>
        </div>
        <div class="bs-when">
          <div class="bs-t"><small>Departure</small><b>${hm12(b.dep)}</b><span>${bp0.name}</span></div>
          <div class="bs-dur"><span>${hrsLabel(b.duration)}</span><i aria-hidden="true"></i><small>${plural(b.boarding.length, 'boarding point')}</small></div>
          <div class="bs-t is-end"><small>Arrival</small><b>${hm12(b.arr)}${b.dayOffset ? html`<span class="bs-plus" title="Arrives on ${fmtDate(addDays(b.date, b.dayOffset), 'ddd, d MMM')}">+${plural(b.dayOffset, 'day')}</span>` : ''}</b><span>${dpN.name}</span></div>
        </div>
        <div class="bs-buy">
          <div class="bs-fare"><small>Starting from</small><b class="tnum">${money(b.fareFrom)}</b></div>
          ${b.soldOut ? html`<span class="bs-left is-out">Sold out</span>` : html`<span class="bs-left${low ? ' is-low' : ''}">${b.seatsLeft} Seat(s) left</span>`}
          <button type="button" class="btn ${open ? 'btn-dark' : 'btn-primary'} bs-view" data-bs-view="${b.id}" aria-expanded="${open}" aria-controls="bs-sp-${b.id}"${b.soldOut ? raw(' disabled') : ''}>${b.soldOut ? 'Sold Out' : open ? 'Hide Seats' : 'View Seats'}</button>
        </div>
      </div>
      <div class="bs-card-foot">
        ${amenityList(b.amenities)}
        <div class="bs-links">
          <button type="button" class="text-btn" data-bs-points="${b.id}">${icon('pin')}<span>Boarding &amp; dropping</span></button>
          <button type="button" class="text-btn" data-bs-policy="${b.id}">${icon('shield')}<span>Cancellation policy</span></button>
        </div>
      </div>
      <div class="bs-panel" id="bs-sp-${b.id}" data-bs-panel="${b.id}"${open ? '' : raw(' hidden')}>${open ? panelHTML(b, selOf(b)) : ''}</div>
    </article>`;
  };

  // ------------------------------------------------ layout
  mount(el, html`
    <div class="bs-msum" data-bs-msum aria-hidden="true" inert>
      <button type="button" class="bs-msum-main" data-bs-modify aria-label="Modify search: ${from} to ${to}, ${fmtDate(date, 'd MMM')}">
        <span class="bs-msum-route">${from} ${icon('arrow-right')} ${to}</span>
        <small>${fmtDate(date, 'ddd, d MMM')} · <span data-bs-mcount>${plural(buses.length, 'bus', 'buses')}</span></small>
      </button>
      <button type="button" class="icon-btn" data-bs-modify aria-label="Modify search">${icon('edit')}</button>
    </div>
    <section class="band bs-band" data-bs-band aria-label="Your search">
      <div class="wrap">
        ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Bus', href: '#/bus' }, { label: `${from} to ${to}` }])}
        <h1 class="sr-only">Buses from ${from} to ${to} on ${fmtDate(date, 'dddd, d MMMM yyyy')}</h1>
        <div class="bs-summary">
          <div class="bs-sum-route">
            <div class="bs-sum-f"><small>From</small><b>${from}</b><span>(${A.state})</span></div>
            <span class="bs-sum-arrow" aria-hidden="true">${icon('arrow-right')}</span>
            <div class="bs-sum-f"><small>To</small><b>${to}</b><span>(${B.state})</span></div>
          </div>
          <div class="bs-sum-f bs-sum-date"><small>Departure Date</small><b>${fmtDate(date, 'd MMM yyyy')}</b><span>${fmtDate(date, 'dddd')}</span></div>
          <button type="button" class="btn btn-white bs-modify" data-bs-modify aria-label="Modify search">${icon('edit')}<span>Modify Search</span></button>
        </div>
        <div class="bs-dates" data-bs-dates>${datesHTML()}</div>
      </div>
    </section>
    ${buses.length ? html`<div class="wrap bs-layout">
      <aside class="bs-side" aria-label="Filters"><div class="bs-filters" data-bs-filters>${filtersHTML()}</div></aside>
      <div class="bs-main">
        <div class="bs-toolbar">
          <p class="bs-count" data-bs-count role="status"></p>
          <div class="bs-sort" role="group" aria-label="Sort buses" data-bs-sortbar>${sortHTML()}</div>
        </div>
        <div class="bs-banner">
          <span class="bs-banner-ic">${icon('bus')}</span>
          <p><b>3.6+ lakh bus routes on AeroSkys</b><span>Live seat maps, verified bus partners and 24/7 support on every booking.</span></p>
        </div>
        <div class="bs-popular" data-bs-popular>${popularHTML()}</div>
        ${departed ? html`<p class="bs-departed">${icon('clock')} ${plural(departed, 'bus', 'buses')} that ${departed === 1 ? 'has' : 'have'} already left or closed for booking today ${departed === 1 ? 'is' : 'are'} not shown.</p>` : ''}
        <div class="bs-list" data-bs-list></div>
      </div>
    </div>
    <div class="bs-fab" role="group" aria-label="Sort and filter">
      <button type="button" data-bs-open-sort>${icon('sort')}<span>Sort</span></button>
      <span class="bs-fab-sep" aria-hidden="true"></span>
      <button type="button" data-bs-open-filter>${icon('filter')}<span>Filter</span><b class="bs-fab-n" data-bs-fabn hidden></b></button>
    </div>`
    : html`<section class="wrap bs-none">${emptyState({
      iconName: 'clock',
      title: all.length ? 'No more buses today' : 'No buses on this date',
      text: all.length ? `All ${plural(all.length, 'bus', 'buses')} from ${from} to ${to} today have left or closed for booking. Online booking closes 30 minutes before departure.` : `There are no buses from ${from} to ${to} on ${fmtDate(date, 'd MMM yyyy')}. Try another date from the strip above.`,
      action: html`<a class="btn btn-primary" href="${href('/bus/search', { from, to, date: addDays(date, 1) })}">View ${fmtDate(addDays(date, 1), 'ddd, d MMM')} ${icon('arrow-right')}</a>`
    })}</section>`}
  `);

  // ------------------------------------------------ rendering
  let sheet = null;        // { m, bus } — the phone seat sheet
  let filterSheet = null;  // modal api of the phone filter sheet

  function renderList() {
    const listEl = $('[data-bs-list]', el);
    if (!listEl) return;
    const list = visible();
    const n = list.length, filtered = activeCount() > 0;
    $('[data-bs-count]', el).innerHTML = String(html`<b>${n}</b> ${n === 1 ? 'bus' : 'buses'} found${filtered ? html` <span>of ${buses.length}</span>` : ''}`);
    $('[data-bs-mcount]', el).textContent = filtered ? `${n} of ${buses.length} buses` : plural(n, 'bus', 'buses');
    listEl.innerHTML = String(n ? html`${list.map(cardHTML)}` : emptyState({ iconName: 'filter', title: 'No buses match your filters', text: 'Try removing a filter or two to see more buses on this route.', action: html`<button type="button" class="btn btn-primary" data-bs-clear>Clear all filters</button>` }));
    const fabN = $('[data-bs-fabn]', el);
    if (fabN) { fabN.hidden = !activeCount(); fabN.textContent = activeCount(); }
    const show = filterSheet && $('[data-bs-fshow]', filterSheet.el);
    if (show) show.textContent = n ? `Show ${plural(n, 'bus', 'buses')}` : 'No buses match';
  }

  const filterRoots = () => [$('[data-bs-filters]', el), filterSheet?.el].filter(Boolean);
  function syncFilters() {
    for (const root of filterRoots()) {
      $$('[data-bs-ftile]', root).forEach(b => b.setAttribute('aria-pressed', String(st.f[b.dataset.bsFtile].has(b.dataset.v))));
      $$('[data-bs-fchk]', root).forEach(c => { c.checked = st.f[c.dataset.bsFchk].has(c.value); });
      $$('[data-bs-fclear]', root).forEach(b => { b.hidden = !st.f[b.dataset.bsFclear].size; });
      $$('[data-bs-clear]', root).forEach(b => { b.hidden = !activeCount(); });
      paintRange(root);
    }
    const pop = $('[data-bs-popular]', el);
    if (pop) pop.innerHTML = String(popularHTML());
  }
  function paintRange(root) {
    const lo = $('[data-bs-lo]', root), hi = $('[data-bs-hi]', root);
    if (!lo || !hi) return;
    const [a, b] = st.f.price || [stats.pmin, stats.pmax];
    if (document.activeElement !== lo) lo.value = a;
    if (document.activeElement !== hi) hi.value = b;
    const fill = $('[data-bs-fill]', root);
    fill.style.left = pct(a) + '%'; fill.style.right = (100 - pct(b)) + '%';
    $('[data-bs-plo]', root).textContent = money(a);
    $('[data-bs-phi]', root).textContent = money(b);
    $$('[data-bin]', root).forEach(i => { const c = (+i.dataset.bin + .5) / BINS * 100; i.classList.toggle('on', c >= pct(a) && c <= pct(b)); });
  }
  const applyFilters = () => { renderList(); syncFilters(); };
  const applySoon = debounce(renderList, 120);

  function bindFilters(root) {
    return [
      on(root, 'click', '[data-bs-ftile]', (e, b) => { const set = st.f[b.dataset.bsFtile]; set.has(b.dataset.v) ? set.delete(b.dataset.v) : set.add(b.dataset.v); applyFilters(); }),
      on(root, 'change', '[data-bs-fchk]', (e, c) => { const set = st.f[c.dataset.bsFchk]; c.checked ? set.add(c.value) : set.delete(c.value); applyFilters(); }),
      on(root, 'click', '[data-bs-fclear]', (e, b) => { st.f[b.dataset.bsFclear].clear(); applyFilters(); }),
      on(root, 'click', '[data-bs-clear]', () => { st.f = blankFilters(); applyFilters(); }),
      on(root, 'input', '[data-bs-fsearch]', (e, input) => {
        const k = input.dataset.bsFsearch, ul = $(`[data-bs-checks="${k}"]`, root), s = input.value.trim().toLowerCase();
        ul.classList.toggle('is-searching', !!s);
        let shown = 0;
        $$('li', ul).forEach(li => { const hit = !s || li.textContent.toLowerCase().includes(s); li.hidden = !hit; if (hit) shown++; });
        ul.nextElementSibling.hidden = shown > 0;
      }),
      on(root, 'click', '[data-bs-fmore]', (e, b) => {
        const ul = $(`[data-bs-checks="${b.dataset.bsFmore}"]`, root);
        const all2 = ul.classList.toggle('is-all');
        b.setAttribute('aria-expanded', String(all2));
        b.textContent = all2 ? 'Show less' : `Show all ${ul.children.length}`;
      }),
      on(root, 'input', '[data-bs-lo],[data-bs-hi]', (e, input) => {
        const lo = $('[data-bs-lo]', root), hi = $('[data-bs-hi]', root);
        let a = +lo.value, b = +hi.value;
        if (a > b) { if (input === lo) { a = b; lo.value = a; } else { b = a; hi.value = b; } }
        st.f.price = a <= stats.pmin && b >= stats.pmax ? null : [a, b];
        paintRange(root);
        applySoon();
      }),
      on(root, 'change', '[data-bs-lo],[data-bs-hi]', () => syncFilters())
    ];
  }

  // ------------------------------------------------ seat selection
  function uiRoots(b) {
    return [$(`[data-bs-panel="${b.id}"]`, el), sheet?.bus === b ? sheet.m.el : null].filter(Boolean);
  }
  function syncSeats(b) {
    const s = selOf(b);
    for (const root of uiRoots(b)) {
      $$('[data-bs-seat]', root).forEach(x => { const on2 = s.seats.includes(x.dataset.bsSeat); x.classList.toggle('is-sel', on2); x.setAttribute('aria-pressed', String(on2)); });
      $$('[data-bs-sum]', root).forEach(x => { x.innerHTML = String(x.classList.contains('bs-sbar') ? sheetBarHTML(b, s) : sumHTML(b, s)); });
    }
  }
  function toggleSeat(b, no) {
    const s = selOf(b), x = seatLayout(b).byNo[no];
    if (!x || x.status === 'sold') return;
    const i = s.seats.indexOf(no);
    if (i >= 0) s.seats.splice(i, 1);
    else {
      if (s.seats.length >= MAX_SEATS) { toast(`You can select up to ${MAX_SEATS} seats in one booking.`, { type: 'error' }); return; }
      s.seats.push(no);
    }
    syncSeats(b);
  }
  function proceed(b) {
    const s = selOf(b);
    if (!s.seats.length || !s.bp || !s.dp) return;
    st.open = b.id;
    go('/bus/review', { query: { bus: b.id, seats: s.seats.join(','), bp: s.bp, dp: s.dp } });
  }
  const busOf = node => byId(node.closest('[data-bs-ui]')?.dataset.bsUi);

  function bindSeatUI(root) {
    return [
      on(root, 'click', '[data-bs-seat]', (e, btn) => { const b = busOf(btn); if (b) toggleSeat(b, btn.dataset.bsSeat); }),
      on(root, 'keydown', '[data-bs-seat]', (e, btn) => {
        const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
        const mv = moves[e.key];
        if (!mv) return;
        e.preventDefault();
        const r = +btn.dataset.r, c = +btn.dataset.c;
        const seats = $$('[data-bs-seat]', btn.closest('.bs-grid')).filter(x => !x.disabled);
        let best = null, bestD = Infinity;
        for (const x of seats) {
          const dr = +x.dataset.r - r, dc = +x.dataset.c - c;
          if (x === btn || (mv[0] && Math.sign(dr) !== mv[0]) || (mv[1] && Math.sign(dc) !== mv[1])) continue;
          const d = mv[0] ? Math.abs(dr) * 10 + Math.abs(dc) : Math.abs(dc) * 10 + Math.abs(dr);
          if (d < bestD) { best = x; bestD = d; }
        }
        best?.focus();
      }),
      on(root, 'change', '[data-bs-pt]', (e, input) => {
        const b = busOf(input); if (!b) return;
        const s = selOf(b);
        s[input.dataset.bsPt] = input.value;
        syncSeats(b);
        if (input.dataset.bsPt === 'bp' && !s.dp) $('[data-bs-fs="dp"]', root)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }),
      on(root, 'click', '[data-bs-deck]', (e, btn) => {
        const b = busOf(btn); if (!b) return;
        selOf(b).deck = btn.dataset.bsDeck;
        const map = btn.closest('.bs-map');
        $('.bs-decks', map).dataset.show = btn.dataset.bsDeck;
        $$('[data-bs-deck]', map).forEach(x => x.setAttribute('aria-pressed', String(x === btn)));
      }),
      on(root, 'click', '[data-bs-go]', (e, btn) => { const b = byId(btn.dataset.bsGo); if (b) proceed(b); })
    ];
  }

  function setCardOpen(id, open) {
    const card = $(`[data-bs-card="${id}"]`, el);
    if (!card) return;
    const b = byId(id);
    const panel = $('[data-bs-panel]', card), btn = $('[data-bs-view]', card);
    card.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.classList.toggle('btn-dark', open);
    btn.classList.toggle('btn-primary', !open);
    btn.textContent = open ? 'Hide Seats' : 'View Seats';
    if (!open) { panel.hidden = true; panel.innerHTML = ''; return; }
    panel.innerHTML = String(panelHTML(b, selOf(b)));
    panel.hidden = false;
    requestAnimationFrame(() => {
      const top = card.getBoundingClientRect().top;
      if (top < 80 || top > innerHeight * .55) card.scrollIntoView({ block: 'start', behavior: 'smooth' });
      $('[data-bs-title]', panel)?.focus({ preventScroll: true });
    });
  }
  function toggleBus(id) {
    const b = byId(id);
    if (!b || b.soldOut) return;
    if (isMobile()) { openSeatSheet(b); return; }
    const was = st.open;
    st.open = was === id ? null : id;
    if (was && was !== id) setCardOpen(was, false);
    setCardOpen(id, st.open === id);
  }

  // Phone: full-screen sheet with seats / points steps and a sticky bottom bar.
  function sheetBarHTML(b, s) {
    const { seats, total } = picked(b, s);
    const ready = seats.length && s.bp && s.dp;
    const label = seats.length ? `${plural(seats.length, 'seat')} · ${seats.map(x => x.no).join(', ')}` : `Select up to ${MAX_SEATS} seats`;
    const disabled = !seats.length || (s.tab === 'points' && !ready);
    return html`<div class="bs-sbar-info"><small>${label}</small><b class="tnum">${money(total)}</b>${b.ac && seats.length ? html`<small>+ 5% GST</small>` : ''}</div>
      <button type="button" class="btn btn-primary" data-bs-snext${disabled ? raw(' disabled') : ''} aria-label="${ready ? 'Continue to passenger details' : 'Continue to boarding and dropping points'}">Continue ${icon('arrow-right')}</button>
      ${s.tab === 'points' && seats.length && !ready ? html`<p class="bs-need">${needText(s, seats)}</p>` : ''}`;
  }
  function setSheetTab(b, tab) {
    const s = selOf(b);
    s.tab = tab;
    const root = sheet?.m.el;
    if (!root) return;
    $$('[data-bs-stab]', root).forEach(t => t.setAttribute('aria-selected', String(t.dataset.bsStab === tab)));
    $$('[data-bs-spane]', root).forEach(p => { p.hidden = p.dataset.bsSpane !== tab; });
    $('.modal-body', root).scrollTop = 0;
    syncSeats(b);
  }
  function openSeatSheet(b) {
    const s = selOf(b);
    if (!s.seats.length) s.tab = 'seats';
    st.open = b.id;
    let offs2 = [];
    const m = openModal({
      title: b.operator, fullscreen: true, className: 'bs-seat-sheet',
      body: html`<div class="bs-sheet" data-bs-ui="${b.id}">
        <p class="bs-sheet-trip"><span>${b.busType}</span><span>${hm12(b.dep)} → ${hm12(b.arr)}${b.dayOffset ? ` (+${b.dayOffset})` : ''} · ${fmtDate(b.date, 'ddd, d MMM')}</span></p>
        <div class="bs-stabs" role="tablist" aria-label="Seat selection steps">
          <button type="button" role="tab" data-bs-stab="seats" aria-selected="${s.tab === 'seats'}">${icon('seat')}<span>1. Select seats</span></button>
          <button type="button" role="tab" data-bs-stab="points" aria-selected="${s.tab === 'points'}">${icon('pin')}<span>2. Boarding &amp; dropping</span></button>
        </div>
        <div data-bs-spane="seats"${s.tab === 'seats' ? '' : raw(' hidden')}>${seatMapHTML(b, s)}</div>
        <div data-bs-spane="points"${s.tab === 'points' ? '' : raw(' hidden')}>${pointsHTML(b, s, 'bp', 'sheet')}${pointsHTML(b, s, 'dp', 'sheet')}</div>
      </div>`,
      foot: html`<div class="bs-sbar" data-bs-ui="${b.id}" data-bs-sum>${sheetBarHTML(b, s)}</div>`,
      onClose: () => { offs2.forEach(f => f()); if (sheet?.m === m) sheet = null; if (st.open === b.id) st.open = null; }
    });
    sheet = { m, bus: b };
    offs2 = [
      ...bindSeatUI(m.el),
      on(m.el, 'click', '[data-bs-stab]', (e, t) => setSheetTab(b, t.dataset.bsStab)),
      on(m.el, 'click', '[data-bs-snext]', () => {
        const s2 = selOf(b);
        if (!s2.seats.length) return;
        if (s2.bp && s2.dp) return proceed(b);
        if (s2.tab === 'seats') setSheetTab(b, 'points');
      })
    ];
  }

  // ------------------------------------------------ info modals & sheets
  function showPoints(b) {
    const list = pts => html`<ol class="bs-plist">${pts.map(p => html`<li><span class="bs-pt-time"><b>${p.time}</b>${p.date !== b.date ? html`<small>${fmtDate(p.date, 'd MMM')}</small>` : ''}</span><span class="bs-pt-txt"><b>${p.name}</b><small>${p.landmark}</small></span></li>`)}</ol>`;
    openModal({
      title: 'Boarding & dropping points', size: 'wide',
      body: html`<div class="bs-pmodal">
        <div class="bs-pm-op">${opMark(b, 'sm')}<div><b>${b.operator}</b><small>${b.busType}</small></div></div>
        <div class="bs-pm-cols">
          <section><h3 class="h4">${icon('bus')} ${b.from} <small>Boarding</small></h3>${list(b.boarding)}</section>
          <section><h3 class="h4">${icon('pin')} ${b.to} <small>Dropping</small></h3>${list(b.dropping)}</section>
        </div>
        <p class="note">${icon('clock')}<span>Please reach your boarding point at least 15 minutes before the time shown. Timings may vary with traffic.</span></p>
      </div>`,
      foot: html`<button type="button" class="btn btn-light" data-close>Close</button>`
    });
  }
  function showPolicy(b) {
    openModal({
      title: 'Cancellation policy',
      body: html`<div class="bs-pm-op">${opMark(b, 'sm')}<div><b>${b.operator}</b><small>${b.busType}</small></div></div>${policyHTML()}`,
      foot: html`<button type="button" class="btn btn-primary" data-close>Got it</button>`
    });
  }
  function openSortSheet() {
    const opts = SORTS.flatMap(([k, l, ic]) => [[k, 1, l, ic], [k, -1, l, ic]]);
    const m = openModal({
      title: 'Sort by', className: 'bs-sort-sheet',
      body: html`<div class="bs-sortlist" role="radiogroup" aria-label="Sort buses">${opts.map(([k, d, l, ic]) => {
        const act = st.sort.key === k && st.sort.dir === d;
        return html`<button type="button" role="radio" class="bs-sortopt" aria-checked="${act}" data-bs-sopt="${k}:${d}">${icon(ic)}<span><b>${l}</b><small>${cap(SORT_DIR[k][d === 1 ? 0 : 1])}</small></span>${act ? icon('check') : ''}</button>`;
      })}</div>`
    });
    on(m.el, 'click', '[data-bs-sopt]', (e, b) => {
      const [k, d] = b.dataset.bsSopt.split(':');
      st.sort = { key: k, dir: +d };
      $('[data-bs-sortbar]', el).innerHTML = String(sortHTML());
      renderList();
      m.close();
    });
  }
  function openFilterSheet() {
    let offs2 = [];
    const m = openModal({
      title: 'Filters', fullscreen: true, className: 'bs-filter-sheet',
      body: html`<div class="bs-filters is-sheet">${filtersHTML()}</div>`,
      foot: html`<button type="button" class="btn btn-light" data-bs-clear>Clear All</button><button type="button" class="btn btn-primary" data-close data-bs-fshow>Show buses</button>`,
      onClose: () => { offs2.forEach(f => f()); if (filterSheet === m) filterSheet = null; }
    });
    filterSheet = m;
    offs2 = bindFilters(m.el);
    renderList();
    syncFilters();
  }
  function openModify(v = { from, to, date }) {
    let m = null;
    m = openModal({
      title: 'Modify search', size: 'wide', className: 'bs-modify-modal',
      body: searchCard({ service: 'bus', tabs: false, id: 'bus-modify' }),
      onOpen(dlg) {
        bindSearchCard($('[data-search-card]', dlg), {
          state: { bus: { from: v.from || '', to: v.to || '', date: v.date || today() } },
          onSearch: (svc, query) => {
            if (href('/bus/search', query) === location.hash) { m?.close(); return; }
            go('/bus/search', { query });
          }
        });
      }
    });
  }

  // ------------------------------------------------ events
  offs.push(
    on(el, 'click', '[data-bs-modify]', () => openModify()),
    on(el, 'click', '[data-bs-day]', (e, b) => { if (b.dataset.bsDay !== date) go('/bus/search', { query: { from, to, date: b.dataset.bsDay } }); }),
    on(el, 'click', '[data-bs-shift]', (e, b) => {
      stripCenter = addDays(stripCenter, +b.dataset.bsShift);
      if (stripCenter < addDays(today(), 3)) stripCenter = addDays(today(), 3);
      $('[data-bs-dates]', el).innerHTML = String(datesHTML());
    }),
    on(el, 'click', '[data-bs-sort]', (e, b) => {
      const k = b.dataset.bsSort;
      st.sort = st.sort.key === k ? { key: k, dir: -st.sort.dir } : { key: k, dir: 1 };
      $('[data-bs-sortbar]', el).innerHTML = String(sortHTML());
      $(`[data-bs-sort="${k}"]`, el)?.focus();
      renderList();
    }),
    on(el, 'click', '[data-bs-poptab]', (e, b) => {
      st.popTab = b.dataset.bsPoptab;
      $('[data-bs-popular]', el).innerHTML = String(popularHTML());
      $(`[data-bs-poptab="${st.popTab}"]`, el)?.focus();
    }),
    on(el, 'click', '[data-bs-popchip]', (e, b) => {
      const set = st.f[b.dataset.bsPopchip];
      set.has(b.dataset.v) ? set.delete(b.dataset.v) : set.add(b.dataset.v);
      applyFilters();
      $(`[data-bs-popchip][data-v="${CSS.escape(b.dataset.v)}"]`, el)?.focus();
    }),
    on(el, 'click', '[data-bs-view]', (e, b) => toggleBus(b.dataset.bsView)),
    on(el, 'click', '[data-bs-points]', (e, b) => showPoints(byId(b.dataset.bsPoints))),
    on(el, 'click', '[data-bs-policy]', (e, b) => showPolicy(byId(b.dataset.bsPolicy))),
    on(el, 'click', '[data-bs-open-sort]', openSortSheet),
    on(el, 'click', '[data-bs-open-filter]', openFilterSheet),
    ...bindFilters(el),
    ...bindSeatUI(el)
  );

  renderList();
  syncFilters();

  // Selected date centred in the strip on phones (the strip scrolls sideways there).
  requestAnimationFrame(() => {
    const dl = $('.bs-dlist', el), day = $('.bs-day.is-on', el);
    if (dl && day && dl.scrollWidth > dl.clientWidth) dl.scrollLeft = day.offsetLeft - dl.offsetLeft - (dl.clientWidth - day.offsetWidth) / 2;
  });

  // Resume a selection (back from review, or "Change seats").
  if (st.open) {
    const b = byId(st.open);
    if (b && isMobile()) setTimeout(() => { if (document.contains(el) && st.open === b.id && !sheet) openSeatSheet(b); }, 60);
    else if (b) setTimeout(() => {
      const card = $(`[data-bs-card="${b.id}"]`, el);
      if (!card) return;
      const r = card.getBoundingClientRect();
      if (r.top < 70 || r.top > innerHeight * .7) card.scrollIntoView({ block: 'start' });
    }, 80);
  }

  // Compact route summary pinned under the masthead once the band scrolls away (phones).
  const msum = $('[data-bs-msum]', el), band = $('[data-bs-band]', el);
  let io = null;
  if (msum && band && 'IntersectionObserver' in window) {
    io = new IntersectionObserver(([en]) => {
      const show = !en.isIntersecting;
      msum.classList.toggle('is-shown', show);
      msum.setAttribute('aria-hidden', String(!show));
      msum.inert = !show;
    }, { rootMargin: '-72px 0px 0px 0px' });
    io.observe(band);
  }

  // Prices follow the header's currency switch.
  let cur = store.get('currency');
  const unsub = store.subscribe(s => {
    if (s.currency === cur) return;
    cur = s.currency;
    $('[data-bs-dates]', el).innerHTML = String(datesHTML());
    const fl = $('[data-bs-filters]', el);
    if (fl) fl.innerHTML = String(filtersHTML());
    renderList();
  });

  return () => { offs.forEach(f => f()); io?.disconnect(); unsub(); };
}
