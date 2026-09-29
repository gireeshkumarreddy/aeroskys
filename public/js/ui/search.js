// Tabbed search card (Flights · Hotels · Holidays · Bus) and query encoding helpers.
import { html, raw, icon, $, $$, on } from '../core/dom.js';
import { store, pushRecent } from '../core/store.js';
import { go, href } from '../core/router.js';
import { today, addDays, fmtDate, isValidISO, diffDays } from '../core/format.js';
import { AIRPORT, POPULAR_TO } from '../data/airports.js';
import { HOTEL_CITIES, BUS_CITIES, NATIONALITIES } from '../data/cities.js';
import { HOLIDAY_DESTINATIONS } from '../data/content.js';
import { CABINS, lowestFare } from '../engines/flights.js';
import { pickAirport, pickFromList, pickDate, pickPax, pickRooms, pickOption } from './pickers.js';
import { SERVICES } from './common.js';

// ---------------------------------------------------------------- query codecs
export const roomsToParam = rooms => rooms.map(r => `${r.adults}-${r.children}${r.ages?.length ? '_' + r.ages.join('_') : ''}`).join('|');
export function paramToRooms(s) {
  const out = String(s || '').split('|').filter(Boolean).map(part => {
    const [ac, ...ages] = part.split('_');
    const [a, c] = ac.split('-').map(Number);
    const children = Math.max(0, Math.min(3, c || 0));
    const ag = ages.map(Number).filter(n => n >= 0 && n <= 11).slice(0, children);
    while (ag.length < children) ag.push(5);
    return { adults: Math.max(1, Math.min(4, a || 2)), children, ages: ag };
  });
  return out.length ? out.slice(0, 6) : [{ adults: 2, children: 0, ages: [] }];
}

export function flightQuery(s) {
  return { trip: s.trip, from: s.from, to: s.to, depart: s.depart, return: s.trip === 'round' ? s.ret : undefined, adt: s.adt, chd: s.chd || undefined, inf: s.inf || undefined, cabin: s.cabin, fare: s.fare !== 'regular' ? s.fare : undefined };
}
export function parseFlightQuery(q) {
  const d = defaults().flights;
  const s = {
    trip: q.get('trip') === 'round' || q.get('return') ? 'round' : 'oneway',
    from: (q.get('from') || d.from).toUpperCase(), to: (q.get('to') || d.to).toUpperCase(),
    depart: isValidISO(q.get('depart')) ? q.get('depart') : d.depart, ret: isValidISO(q.get('return')) ? q.get('return') : '',
    adt: clamp(+q.get('adt') || 1, 1, 9), chd: clamp(+q.get('chd') || 0, 0, 8), inf: clamp(+q.get('inf') || 0, 0, 4),
    cabin: CABINS[q.get('cabin')] ? q.get('cabin') : 'E', fare: ['student', 'senior'].includes(q.get('fare')) ? q.get('fare') : 'regular'
  };
  if (s.depart < today()) s.depart = today();
  if (s.ret && s.ret < s.depart) s.ret = s.depart;
  if (s.inf > s.adt) s.inf = s.adt;
  if (s.adt + s.chd > 9) s.chd = 9 - s.adt;
  return s;
}
export const hotelQuery = s => ({ city: s.city, in: s.checkin, out: s.checkout, rooms: roomsToParam(s.rooms), star: s.star !== 'all' ? s.star : undefined, nat: s.nat !== 'IN' ? s.nat : undefined });
export function parseHotelQuery(q) {
  const d = defaults().hotels;
  const s = { city: q.get('city') || d.city, checkin: isValidISO(q.get('in')) ? q.get('in') : d.checkin, checkout: isValidISO(q.get('out')) ? q.get('out') : '', rooms: paramToRooms(q.get('rooms')), star: q.get('star') || 'all', nat: q.get('nat') || 'IN' };
  if (s.checkin < today()) s.checkin = today();
  if (!s.checkout || s.checkout <= s.checkin) s.checkout = addDays(s.checkin, 1);
  if (diffDays(s.checkin, s.checkout) > 30) s.checkout = addDays(s.checkin, 30);
  return s;
}
export const busQuery = s => ({ from: s.from, to: s.to, date: s.date, board: s.board || undefined, drop: s.drop || undefined });
export function parseBusQuery(q) {
  const s = { from: q.get('from') || '', to: q.get('to') || '', date: isValidISO(q.get('date')) ? q.get('date') : today() };
  if (s.date < today()) s.date = today();
  return s;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const travellersLabel = n => `${n} ${n === 1 ? 'Traveller' : 'Travellers'}`;

// ---------------------------------------------------------------- state
function defaults() {
  return {
    flights: { trip: 'oneway', from: 'BOM', to: 'DEL', depart: today(), ret: '', adt: 1, chd: 0, inf: 0, cabin: 'E', fare: 'regular' },
    hotels: { city: 'Delhi', checkin: today(), checkout: addDays(today(), 1), rooms: [{ adults: 2, children: 0, ages: [] }], star: 'all', nat: 'IN' },
    holidays: { city: '' },
    bus: { from: '', to: '', date: today(), board: '', drop: '' }
  };
}

function initialState() {
  const d = defaults();
  const last = store.get('last') || {};
  const s = structuredClone(d);
  if (last.flights?.state) {
    const f = { ...d.flights, ...last.flights.state };
    if (f.depart < today()) { f.depart = today(); f.ret = ''; }
    if (f.ret && f.ret < f.depart) f.ret = '';
    s.flights = f;
  }
  if (last.hotels?.state) {
    const h = { ...d.hotels, ...last.hotels.state };
    if (h.checkin < today()) { h.checkin = today(); h.checkout = addDays(today(), 1); }
    s.hotels = h;
  }
  if (last.bus?.state) { const b = { ...d.bus, ...last.bus.state }; if (b.date < today()) b.date = today(); s.bus = b; }
  if (last.holidays?.state) s.holidays = { ...d.holidays, ...last.holidays.state };
  return s;
}

// ---------------------------------------------------------------- field renderers
const sf = ({ key, label, value, sub, placeholder, ic, cls = '', aria }) => html`<button type="button" class="sf ${cls}" data-field="${key}" aria-label="${aria || label}">
  <span class="sf-label">${ic ? icon(ic) : ''}${label}</span>
  ${value ? html`<span class="sf-value">${raw(value)}</span>` : html`<span class="sf-value is-placeholder">${placeholder || 'Select'}</span>`}
  ${sub ? html`<span class="sf-sub">${sub}</span>` : ''}</button>`;

function flightsFields(s) {
  const A = AIRPORT[s.from], B = AIRPORT[s.to];
  const pax = s.adt + s.chd + s.inf;
  return html`
    <div class="search-options">
      <div class="seg" role="group" aria-label="Trip type">
        <button type="button" data-trip="oneway" aria-pressed="${s.trip === 'oneway'}">One Way</button>
        <button type="button" data-trip="round" aria-pressed="${s.trip === 'round'}">Round Trip</button>
      </div>
      <a class="search-head-link" href="${href('/group-booking', { from: s.from, to: s.to, depart: s.depart, return: s.trip === 'round' ? s.ret : undefined, trip: s.trip === 'round' ? 'round' : undefined })}">${icon('users')} More than 9 travellers? <b>Get group fares</b></a>
    </div>
    <div class="sf-grid flights">
      <div class="sf-pair">
        ${sf({ key: 'from', label: 'From', value: A ? `${A.city} <small>${A.code}</small>` : '', sub: A ? A.name : '', placeholder: 'Leaving from', aria: `From: ${A ? A.city : 'select'}` })}
        <button type="button" class="swap-btn" data-swap aria-label="Swap origin and destination">${icon('swap')}</button>
        ${sf({ key: 'to', label: 'To', value: B ? `${B.city} <small>${B.code}</small>` : '', sub: B ? B.name : '', placeholder: 'Going to', aria: `To: ${B ? B.city : 'select'}` })}
      </div>
      ${sf({ key: 'depart', label: 'Departure', ic: 'calendar', value: fmtDate(s.depart, 'd MMM yy'), sub: fmtDate(s.depart, 'dddd') })}
      ${sf({ key: 'ret', label: 'Return', ic: 'calendar', value: s.trip === 'round' && s.ret ? fmtDate(s.ret, 'd MMM yy') : '', sub: s.trip === 'round' && s.ret ? fmtDate(s.ret, 'dddd') : '', placeholder: 'Tap to add return date', cls: s.trip === 'round' ? '' : 'is-muted' })}
      ${sf({ key: 'pax', label: 'Travellers & class', ic: 'users', value: travellersLabel(pax), sub: CABINS[s.cabin] })}
      <button type="submit" class="btn btn-primary search-go">${icon('search')} Search</button>
    </div>
    <div class="special-fares" role="radiogroup" aria-label="Special fares">
      <div class="special-fares-label"><span>More Benefits</span><b>Special Fares</b></div>
      ${[['regular', 'Regular', 'Lowest Fares', 'user-check'], ['student', 'Student', 'Extra Baggage', 'grad'], ['senior', 'Senior Citizen', 'Exclusive Discount', 'senior']].map(([k, t, sub, ic]) => html`
        <button type="button" class="fare-opt" role="radio" data-fare="${k}" aria-checked="${s.fare === k}"><span class="fo-check">${icon('check')}</span>${icon(ic)}<span><b>${t}</b><small>${sub}</small></span></button>`)}
    </div>`;
}

function hotelsFields(s) {
  const c = HOTEL_CITIES.find(x => x.name === s.city);
  const guests = s.rooms.reduce((n, r) => n + r.adults + r.children, 0);
  const nights = diffDays(s.checkin, s.checkout);
  const nat = NATIONALITIES.find(n => n[0] === s.nat) || NATIONALITIES[0];
  return html`
    <div class="sf-grid hotels">
      ${sf({ key: 'city', label: 'City, Location or Property', ic: 'pin', value: s.city ? `${s.city}${c ? ', ' + (c.intl ? c.country : 'India') : ''}` : '', sub: c ? c.region : '', placeholder: 'Where are you going?' })}
      ${sf({ key: 'checkin', label: 'Check-In', ic: 'calendar', value: fmtDate(s.checkin, 'd MMM yy'), sub: fmtDate(s.checkin, 'dddd') })}
      ${sf({ key: 'checkout', label: 'Check-Out', ic: 'calendar', value: fmtDate(s.checkout, 'd MMM yy'), sub: `${fmtDate(s.checkout, 'dddd')} · ${nights} night${nights > 1 ? 's' : ''}` })}
      ${sf({ key: 'rooms', label: 'Rooms & Guests', ic: 'users', value: `${s.rooms.length} Room${s.rooms.length > 1 ? 's' : ''} <small>${guests} Guest${guests > 1 ? 's' : ''}</small>`, sub: s.rooms.some(r => r.children) ? 'Includes children' : 'Adults' })}
      ${sf({ key: 'star', label: 'Star Category', ic: 'star', value: s.star === 'all' ? 'ALL' : `${s.star} Star`, sub: 'Property rating' })}
      <button type="submit" class="btn btn-primary search-go">${icon('search')} Search</button>
    </div>
    <div class="search-foot"><button type="button" data-field="nat">${icon('globe')} Nationality: <b>${nat[1]}</b></button><span>${icon('shield')} Free cancellation on many rooms</span></div>`;
}

function holidaysFields(s) {
  return html`
    <p class="small muted" style="margin:-4px 0 12px">Pick a destination to see holiday packages with hotels, transfers and sightseeing.</p>
    <div class="sf-grid holidays">
      ${sf({ key: 'hcity', label: 'Where do you want to go?', ic: 'palm', value: s.city || '', sub: s.city ? 'Holiday packages' : 'Choose from 35 destinations', placeholder: 'Search destinations — Dubai, Goa, Bali…' })}
      <button type="submit" class="btn btn-primary search-go">${icon('search')} Search</button>
    </div>
    <div class="chip-scroll" style="margin-top:14px">${['Goa', 'Kerala', 'Manali', 'Dubai', 'Maldives', 'Thailand', 'Singapore', 'Bali', 'Kashmir', 'Europe'].map(c => html`<button type="button" class="chip" data-hq="${c}">${c}</button>`)}</div>`;
}

function busFields(s) {
  const t = today(), tm = addDays(t, 1);
  return html`
    <div class="sf-grid bus">
      <div class="sf-pair">
        ${sf({ key: 'bfrom', label: 'From', ic: 'bus', value: s.from, sub: s.board ? 'Boarding: ' + s.board : s.from ? (BUS_CITIES.find(c => c.name === s.from)?.state || '') + ' · All boarding points' : '', placeholder: 'Source City' })}
        <button type="button" class="swap-btn" data-bswap aria-label="Swap source and destination">${icon('swap')}</button>
        ${sf({ key: 'bto', label: 'To', ic: 'pin', value: s.to, sub: s.drop ? 'Dropping: ' + s.drop : s.to ? (BUS_CITIES.find(c => c.name === s.to)?.state || '') + ' · All dropping points' : '', placeholder: 'Destination City' })}
      </div>
      <div class="stack">
        ${sf({ key: 'bdate', label: 'Departure Date', ic: 'calendar', value: fmtDate(s.date, 'd MMM yy'), sub: fmtDate(s.date, 'dddd') })}
      </div>
      <button type="submit" class="btn btn-primary search-go">${icon('search')} Search</button>
    </div>
    <div class="search-foot"><span>Quick dates:</span><div class="quick-dates" style="margin:0"><button type="button" data-bq="${t}" aria-pressed="${s.date === t}">Today</button><button type="button" data-bq="${tm}" aria-pressed="${s.date === tm}">Tomorrow</button></div><span>${icon('shield')} 3.6+ lakh bus routes</span></div>`;
}

const FIELD_RENDER = { flights: flightsFields, hotels: hotelsFields, holidays: holidaysFields, bus: busFields };

// ---------------------------------------------------------------- card
export function searchCard({ service = 'flights', tabs = true, id = 'search' } = {}) {
  const main = SERVICES.filter(s => !s.more);
  return html`<form class="search-card" data-search-card data-service="${service}" id="${id}" novalidate autocomplete="off">
    ${tabs ? html`<div class="search-head">
      <div class="service-tabs" role="tablist" aria-label="Choose a service">
        ${main.map(s => html`<button type="button" class="service-tab" role="tab" data-tab="${s.id}" aria-selected="${s.id === service}">${icon(s.icon)}${s.label === 'Holidays' ? 'Holiday' : s.label}</button>`)}
      </div>
      <a class="text-btn hide-sm" href="#/offers">${icon('tag')} Today’s offers</a>
    </div>` : ''}
    <div data-sf-body></div>
    <div class="search-error" data-sf-error hidden></div>
  </form>`;
}

/** Binds a rendered search card. opts.onSearch overrides navigation (used by modify-search sheets). */
export function bindSearchCard(form, opts = {}) {
  const S = opts.state ? structuredClone({ ...initialState(), ...opts.state }) : initialState();
  let service = form.dataset.service;
  const body = $('[data-sf-body]', form);
  const err = $('[data-sf-error]', form);
  const render = () => { body.innerHTML = String(FIELD_RENDER[service](S[service])); };
  const showError = msg => { err.hidden = !msg; err.innerHTML = msg ? String(html`<div class="note note-red">${icon('alert')}<span>${msg}</span></div>`) : ''; };
  const flag = key => { const f = $(`[data-field="${key}"]`, form); f?.classList.add('has-error'); setTimeout(() => f?.classList.remove('has-error'), 2400); };
  render();

  on(form, 'click', '[data-tab]', (e, b) => {
    service = b.dataset.tab;
    form.dataset.service = service;
    $$('[data-tab]', form).forEach(t => t.setAttribute('aria-selected', t === b));
    showError('');
    render();
    opts.onTab?.(service);
  });

  on(form, 'click', '[data-trip]', (e, b) => {
    const f = S.flights; f.trip = b.dataset.trip;
    if (f.trip === 'oneway') f.ret = '';
    render();
    if (f.trip === 'round' && !f.ret) $('[data-field="ret"]', form)?.click();
  });
  on(form, 'click', '[data-fare]', (e, b) => { S.flights.fare = b.dataset.fare; render(); });
  on(form, 'click', '[data-swap]', () => { const f = S.flights; [f.from, f.to] = [f.to, f.from]; render(); });
  on(form, 'click', '[data-bswap]', () => { const b = S.bus; [b.from, b.to] = [b.to, b.from]; b.board = ''; b.drop = ''; render(); });
  on(form, 'click', '[data-bq]', (e, b) => { S.bus.date = b.dataset.bq; render(); });
  on(form, 'click', '[data-hq]', (e, b) => { S.holidays.city = b.dataset.hq; render(); submit(); });

  on(form, 'click', '[data-field]', (e, el) => {
    const key = el.dataset.field;
    const f = S.flights, h = S.hotels, bs = S.bus;
    showError('');
    switch (key) {
      case 'from': return pickAirport(el, { title: 'Where from?', exclude: f.to, onSelect: a => { f.from = a.code; render(); if (!f.to) $('[data-field="to"]', form)?.click(); } });
      case 'to': return pickAirport(el, { title: 'Where to?', exclude: f.from, popular: POPULAR_TO, onSelect: a => { f.to = a.code; render(); } });
      case 'depart':
      case 'ret': {
        const round = key === 'ret' || f.trip === 'round';
        if (key === 'ret' && f.trip !== 'round') { f.trip = 'round'; }
        const priceFor = d => (f.from && f.to ? lowestFare({ from: f.from, to: f.to, date: d, cabin: f.cabin, fare: f.fare }) : null);
        return pickDate(el, {
          mode: round ? 'range' : 'single', start: f.depart, end: f.ret, focus: key === 'ret' ? 'end' : 'start',
          labels: ['Departure', 'Return'], priceFor,
          onSelect: ({ start, end }) => { f.depart = start || f.depart; f.ret = round ? (end || '') : ''; render(); }
        });
      }
      case 'pax': return pickPax(el, { ...f, onChange: v => { Object.assign(f, v); const lab = $('[data-field="pax"] .sf-value', form); if (lab) { lab.textContent = travellersLabel(v.adt + v.chd + v.inf); $('[data-field="pax"] .sf-sub', form).textContent = CABINS[v.cabin]; } } });
      case 'city': return pickFromList(el, {
        title: 'Where are you going?', placeholder: 'City, area or property', popularTitle: 'Popular destinations', iconName: 'building',
        items: HOTEL_CITIES.map(c => ({ value: c.name, label: `${c.name}, ${c.intl ? c.country : 'India'}`, sub: c.region, tag: c.intl ? 'Intl' : '' })),
        onSelect: it => { h.city = it.value; render(); }
      });
      case 'checkin':
      case 'checkout': return pickDate(el, {
        mode: 'range', start: h.checkin, end: h.checkout, focus: key === 'checkout' ? 'end' : 'start', labels: ['Check-in', 'Check-out'], minNights: 1, maxNights: 30,
        onSelect: ({ start, end }) => { h.checkin = start; h.checkout = end && end > start ? end : addDays(start, 1); render(); }
      });
      case 'rooms': return pickRooms(el, { rooms: h.rooms, onChange: rooms => { h.rooms = rooms; const guests = rooms.reduce((n, r) => n + r.adults + r.children, 0); const v = $('[data-field="rooms"] .sf-value', form); if (v) v.innerHTML = `${rooms.length} Room${rooms.length > 1 ? 's' : ''} <small>${guests} Guest${guests > 1 ? 's' : ''}</small>`; } });
      case 'star': return pickOption(el, { title: 'Star Category', value: h.star, options: [{ value: 'all', label: 'ALL', sub: 'Any rating' }, ...[5, 4, 3, 2, 1].map(n => ({ value: String(n), label: `${n} Star`, icon: 'star' }))], onSelect: o => { h.star = o.value; render(); } });
      case 'nat': return pickOption(el, { title: 'Nationality', value: h.nat, width: 320, options: NATIONALITIES.map(([v, l]) => ({ value: v, label: l })), onSelect: o => { h.nat = o.value; render(); } });
      case 'hcity': return pickFromList(el, {
        title: 'Where do you want to go?', placeholder: 'Search holiday destinations', popularTitle: 'All destinations', iconName: 'palm',
        items: HOLIDAY_DESTINATIONS.map(c => ({ value: c, label: c })),
        onSelect: it => { S.holidays.city = it.value; render(); }
      });
      case 'bfrom':
      case 'bto': {
        const isFrom = key === 'bfrom';
        const exclude = isFrom ? bs.to : bs.from;
        const kind = isFrom ? 'boarding' : 'dropping';
        const cities = BUS_CITIES.filter(c => c.name !== exclude);
        const cityItems = cities.map(c => ({ value: c.name, label: `${c.name} (All ${kind} points)`, sub: c.state, icon: 'bus' }));
        const choose = it => {
          const [city, point] = String(it.value).split('|');
          if (isFrom) { bs.from = city; bs.board = point || ''; } else { bs.to = city; bs.drop = point || ''; }
          render();
          if (isFrom && !bs.to) $('[data-field="bto"]', form)?.click();
        };
        import('../data/bus.js').then(({ pointsFor }) => {
          const pointItems = cities.flatMap(c => pointsFor(c.name).map(p => ({ value: `${c.name}|${p.name}`, label: p.name, sub: `${c.name}${p.landmark ? ' · ' + p.landmark : ''}`, icon: 'pin' })));
          pickFromList(el, {
            title: isFrom ? 'From Location' : 'To Location', placeholder: `Search city or ${kind} point`, popularTitle: 'Popular cities', iconName: 'bus',
            items: cityItems,
            search: q => [...cityItems.filter(i => i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q)), ...pointItems.filter(i => (i.label + ' ' + i.sub).toLowerCase().includes(q))].slice(0, 30),
            onSelect: choose
          });
        });
        return;
      }
      case 'bdate': return pickDate(el, { mode: 'single', start: bs.date, labels: ['Departure date'], onSelect: ({ start }) => { bs.date = start; render(); } });
    }
  });

  function submit() {
    showError('');
    if (service === 'flights') {
      const f = S.flights;
      if (!f.from || !f.to) { flag(!f.from ? 'from' : 'to'); return showError('Please choose where you are flying from and to.'); }
      if (f.from === f.to) { flag('to'); return showError('Origin and destination cannot be the same airport.'); }
      if (f.trip === 'round' && !f.ret) { flag('ret'); return showError('Please add a return date, or switch to One Way.'); }
      if (f.trip === 'round' && f.ret < f.depart) { flag('ret'); return showError('Return date cannot be before the departure date.'); }
      const query = flightQuery(f);
      pushRecent('flights', { key: `${f.from}-${f.to}-${f.trip}`, from: f.from, to: f.to, state: { ...f } });
      return opts.onSearch ? opts.onSearch('flights', query) : go('/flights/search', { query });
    }
    if (service === 'hotels') {
      const h = S.hotels;
      if (!h.city) { flag('city'); return showError('Please choose a city or property.'); }
      const query = hotelQuery(h);
      pushRecent('hotels', { key: h.city, city: h.city, state: structuredClone(h) });
      return opts.onSearch ? opts.onSearch('hotels', query) : go('/hotels/search', { query });
    }
    if (service === 'holidays') {
      const c = S.holidays.city;
      if (!c) { flag('hcity'); return showError('Please choose a destination.'); }
      pushRecent('holidays', { key: c, city: c, state: { city: c } });
      return opts.onSearch ? opts.onSearch('holidays', { city: c }) : go('/holidays/search', { query: { city: c } });
    }
    if (service === 'bus') {
      const b = S.bus;
      if (!b.from || !b.to) { flag(!b.from ? 'bfrom' : 'bto'); return showError('Please choose your source and destination cities.'); }
      if (b.from === b.to) { flag('bto'); return showError('Source and destination cannot be the same city.'); }
      pushRecent('bus', { key: `${b.from}-${b.to}`, from: b.from, to: b.to, state: { ...b } });
      return opts.onSearch ? opts.onSearch('bus', busQuery(b)) : go('/bus/search', { query: busQuery(b) });
    }
  }
  form.addEventListener('submit', e => { e.preventDefault(); submit(); });
  return { state: S, submit, setService(s) { $(`[data-tab="${s}"]`, form)?.click(); } };
}
