// Pickers shared by every search form: airports, cities, dates, travellers, rooms.
import { html, raw, icon, esc, $, $$, on, debounce, isMobile } from '../core/dom.js';
import { openPopover } from './overlay.js';
import { AIRPORT, AIRPORTS, POPULAR_FROM, POPULAR_TO, searchAirports } from '../data/airports.js';
import { store } from '../core/store.js';
import { iso, parse, today, addDays, fmtDate, monthName, dowNames, diffDays } from '../core/format.js';
import { CABINS } from '../engines/flights.js';

// ---------------------------------------------------------------- Airports
export function pickAirport(anchor, { title = 'Select airport', exclude, popular = POPULAR_FROM, onSelect }) {
  const recent = [...new Set((store.get('recent').flights || []).flatMap(r => [r.from, r.to]))].filter(c => AIRPORT[c] && c !== exclude).slice(0, 4);
  const row = (a, hl) => html`<button type="button" class="opt ${hl ? 'is-hl' : ''}" data-code="${a.code}">
      <span class="opt-icon">${icon(a.cc === 'IN' ? 'plane' : 'globe')}</span>
      <span class="opt-main"><b>${a.city}, ${a.country}</b><small>${a.name}</small></span>
      <span class="opt-code">${a.code}</span></button>`;
  const defaults = () => html`
    ${recent.length ? html`<div class="picker-section"><div class="picker-title">Recent searches</div>${recent.map(c => row(AIRPORT[c]))}</div>` : ''}
    <div class="picker-section"><div class="picker-title">Popular cities</div>${popular.filter(c => c !== exclude).map(c => row(AIRPORT[c]))}</div>`;
  const content = html`<div class="picker picker-airport">
    <label class="picker-search">${icon('search')}<input type="search" placeholder="Search city, airport or code" aria-label="${title}" data-autofocus autocomplete="off" enterkeyhint="search"></label>
    <div data-list>${defaults()}</div></div>`;
  let pop;
  pop = openPopover(anchor, {
    title, content, width: 440,
    onOpen(el) {
      const input = $('input', el), list = $('[data-list]', el);
      let hl = 0;
      const render = () => {
        const q = input.value;
        if (!q.trim()) { list.innerHTML = String(defaults()); return; }
        const res = searchAirports(q, 14).filter(a => a.code !== exclude);
        hl = 0;
        list.innerHTML = res.length ? String(html`<div class="picker-section">${res.map((a, i) => row(a, i === 0))}</div>`) : `<div class="picker-empty">No airports match “${esc(q)}”. Try a city name or 3-letter code.</div>`;
      };
      input.addEventListener('input', debounce(render, 80));
      input.addEventListener('keydown', e => {
        const opts = $$('.opt', list);
        if (!opts.length) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          hl = (hl + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
          opts.forEach((o, i) => o.classList.toggle('is-hl', i === hl));
          opts[hl].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') { e.preventDefault(); opts[hl]?.click(); }
      });
      on(el, 'click', '[data-code]', (e, b) => { onSelect(AIRPORT[b.dataset.code]); pop.close(); });
    }
  });
  return pop;
}

// ---------------------------------------------------------------- Generic list (cities, destinations)
export function pickFromList(anchor, { title = 'Select', placeholder = 'Search', items, search, popularTitle = 'Popular', onSelect, width = 420, iconName = 'pin' }) {
  const row = (it, hl) => html`<button type="button" class="opt ${hl ? 'is-hl' : ''}" data-v="${it.value}">
    <span class="opt-icon">${icon(it.icon || iconName)}</span><span class="opt-main"><b>${it.label}</b>${it.sub ? html`<small>${it.sub}</small>` : ''}</span>${it.tag ? html`<span class="opt-code">${it.tag}</span>` : ''}</button>`;
  const all = items || [];
  const defaults = () => html`<div class="picker-section"><div class="picker-title">${popularTitle}</div>${all.slice(0, 12).map(it => row(it))}</div>`;
  let pop;
  pop = openPopover(anchor, {
    title, width,
    content: html`<div class="picker picker-city"><label class="picker-search">${icon('search')}<input type="search" placeholder="${placeholder}" aria-label="${title}" data-autofocus autocomplete="off"></label><div data-list>${defaults()}</div></div>`,
    onOpen(el) {
      const input = $('input', el), list = $('[data-list]', el);
      let current = all; let hl = 0;
      const render = () => {
        const q = input.value.trim().toLowerCase();
        if (!q) { current = all; list.innerHTML = String(defaults()); return; }
        current = search ? search(q) : all.filter(it => (it.label + ' ' + (it.sub || '')).toLowerCase().includes(q));
        hl = 0;
        list.innerHTML = current.length ? String(html`<div class="picker-section">${current.slice(0, 20).map((it, i) => row(it, i === 0))}</div>`) : `<div class="picker-empty">No matches for “${esc(input.value)}”.</div>`;
      };
      input.addEventListener('input', debounce(render, 80));
      input.addEventListener('keydown', e => {
        const opts = $$('.opt', list); if (!opts.length) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); hl = (hl + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length; opts.forEach((o, i) => o.classList.toggle('is-hl', i === hl)); opts[hl].scrollIntoView({ block: 'nearest' }); }
        else if (e.key === 'Enter') { e.preventDefault(); opts[hl]?.click(); }
      });
      on(el, 'click', '[data-v]', (e, b) => {
        const it = [...all, ...(current || [])].find(x => String(x.value) === b.dataset.v) || { value: b.dataset.v, label: b.dataset.v };
        onSelect(it); pop.close();
      });
    }
  });
  return pop;
}

// ---------------------------------------------------------------- Calendar
function shortPrice(p) {
  if (p == null) return '';
  if (p >= 100000) return '₹' + (p / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
  if (p >= 1000) return '₹' + (p / 1000).toFixed(p >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return '₹' + Math.round(p);
}

/**
 * opts: { title, mode: 'single'|'range', start, end, focus: 'start'|'end', min, max, maxNights,
 *         priceFor(iso) -> number|null, labels: [startLabel, endLabel], onSelect({start, end}) }
 */
export function pickDate(anchor, opts) {
  const min = opts.min || today();
  const max = opts.max || addDays(today(), 364);
  let start = opts.start || '', end = opts.end || '';
  let focus = opts.focus || 'start';
  const range = opts.mode === 'range';
  const mobile = isMobile();
  const labels = opts.labels || ['Departure', 'Return'];
  const minD = parse(min);
  let viewY = parse(start || min).getFullYear(), viewM = parse(start || min).getMonth();
  if (focus === 'end' && end) { viewY = parse(end).getFullYear(); viewM = parse(end).getMonth(); }
  const prices = new Map();

  const monthHTML = (y, m) => {
    const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(html`<span></span>`);
    for (let d = 1; d <= days; d++) {
      const s = iso(new Date(y, m, d));
      const disabled = s < min || s > max;
      const cls = ['cal-day'];
      if (s === today()) cls.push('is-today');
      if (range) {
        if (s === start) cls.push('is-start', end ? 'has-end' : '');
        if (s === end) cls.push('is-end', start ? 'has-start' : '');
        if (start && end && s > start && s < end) cls.push('in-range');
      } else if (s === start) cls.push('is-sel');
      const p = prices.get(s);
      cells.push(html`<button type="button" class="${cls.filter(Boolean).join(' ')}" data-day="${s}" ${disabled ? raw('disabled') : ''} aria-label="${fmtDate(s, 'dddd, d MMMM yyyy')}" ${s === start || s === end ? raw('aria-pressed="true"') : ''}>${d}${opts.priceFor ? html`<small data-p="${s}" class="${p && p.hi ? 'hi' : ''}">${p ? shortPrice(p.v) : ''}</small>` : ''}</button>`);
    }
    return html`<div class="cal-month" data-month="${y}-${m}"><h4>${monthName(m)} ${y}</h4><div class="cal-grid">${dowNames.map(d => html`<span class="cal-dow">${d.slice(0, 2)}</span>`)}${cells}</div></div>`;
  };

  const months = () => {
    const out = [];
    const count = mobile ? 12 : 2;
    let y = mobile ? minD.getFullYear() : viewY, m = mobile ? minD.getMonth() : viewM;
    for (let i = 0; i < count; i++) { out.push(monthHTML(y, m)); m++; if (m > 11) { m = 0; y++; } }
    return out;
  };

  const summary = () => range
    ? html`<span><span class="muted">${labels[0]}:</span> <b>${start ? fmtDate(start, 'ddd, d MMM') : '—'}</b> &nbsp; <span class="muted">${labels[1]}:</span> <b>${end ? fmtDate(end, 'ddd, d MMM') : '—'}</b>${opts.maxNights && start && end ? html` <span class="muted">· ${diffDays(start, end)} night${diffDays(start, end) === 1 ? '' : 's'}</span>` : ''}</span>`
    : html`<span><span class="muted">${labels[0]}:</span> <b>${start ? fmtDate(start, 'dddd, d MMM yyyy') : '—'}</b></span>`;

  const hint = () => range ? (focus === 'start' ? `Select ${labels[0].toLowerCase()} date` : `Select ${labels[1].toLowerCase()} date`) : (opts.priceFor ? 'Lowest fares shown are per adult' : 'Select a date');

  const body = () => html`<div class="cal" style="--months:${mobile ? 1 : 2}">
      <div class="cal-top"><span class="cal-hint" data-hint>${hint()}</span>
        <div class="cal-nav"><button type="button" data-prev aria-label="Previous month">${icon('chevron-left')}</button><button type="button" data-next aria-label="Next month">${icon('chevron-right')}</button></div></div>
      <div class="cal-months" data-months>${months()}</div>
      <div class="cal-foot"><span data-summary>${summary()}</span><button type="button" class="btn btn-primary btn-sm" data-done>Done</button></div>
    </div>`;

  let pop;
  const commit = () => { opts.onSelect({ start, end }); };
  pop = openPopover(anchor, {
    title: opts.title || (range ? `${labels[0]} & ${labels[1]}` : labels[0]),
    content: body(), width: mobile ? undefined : 700,
    onOpen(el) {
      const rerender = () => {
        $('[data-months]', el).innerHTML = String(html`${months()}`);
        $('[data-summary]', el).innerHTML = String(summary());
        $('[data-hint]', el).textContent = hint();
        const canPrev = new Date(viewY, viewM, 1) > new Date(minD.getFullYear(), minD.getMonth(), 1);
        $('[data-prev]', el).disabled = !canPrev;
        fillPrices();
      };
      let fillToken = 0;
      const fillPrices = () => {
        if (!opts.priceFor) return;
        const token = ++fillToken;
        const days = $$('[data-p]', el).map(s => s.dataset.p).filter(s => s >= min && s <= max && !prices.has(s)).slice(0, mobile ? 120 : 62);
        let i = 0;
        const step = () => {
          if (token !== fillToken) return;
          const end2 = Math.min(i + 8, days.length);
          for (; i < end2; i++) { const s = days[i]; const v = opts.priceFor(s); prices.set(s, v == null ? null : { v }); }
          paint();
          if (i < days.length) setTimeout(step, 16);
        };
        const paint = () => {
          const vals = [...prices.values()].filter(Boolean).map(p => p.v).sort((a, b) => a - b);
          const median = vals[Math.floor(vals.length / 2)] || 0;
          $$('[data-p]', el).forEach(s => { const p = prices.get(s.dataset.p); if (p) { s.textContent = shortPrice(p.v); s.classList.toggle('hi', p.v > median * 1.04); } });
        };
        paint();
        setTimeout(step, 30);
      };
      on(el, 'click', '[data-day]', (e, b) => {
        const s = b.dataset.day;
        if (!range) { start = s; commit(); pop.close(); return; }
        if (focus === 'start' || !start || s < start) {
          start = s;
          if (end && (end <= s || (opts.maxNights && diffDays(s, end) > opts.maxNights) || (opts.minNights && diffDays(s, end) < opts.minNights))) end = '';
          if (opts.minNights && !end) end = '';
          focus = 'end';
          commit();
          rerender();
          if (opts.autoEnd) { end = addDays(start, opts.autoEnd); commit(); rerender(); }
        } else {
          if (opts.minNights && diffDays(start, s) < opts.minNights) return;
          if (opts.maxNights && diffDays(start, s) > opts.maxNights) return;
          end = s; commit(); rerender();
          setTimeout(() => pop.close(), 160);
        }
      });
      $('[data-prev]', el).addEventListener('click', () => { viewM--; if (viewM < 0) { viewM = 11; viewY--; } rerender(); });
      $('[data-next]', el).addEventListener('click', () => { viewM++; if (viewM > 11) { viewM = 0; viewY++; } rerender(); });
      $('[data-done]', el).addEventListener('click', () => { commit(); pop.close(); });
      rerender();
      if (mobile) {
        const target = el.querySelector('.is-start,.is-sel') || el.querySelector('.cal-month');
        setTimeout(() => target?.closest('.cal-month')?.scrollIntoView({ block: 'start' }), 60);
      }
    }
  });
  return pop;
}

// ---------------------------------------------------------------- Travellers & class
export function pickPax(anchor, { adt = 1, chd = 0, inf = 0, cabin = 'E', onChange }) {
  const st = { adt, chd, inf, cabin };
  const rules = {
    adt: { min: 1, max: () => 9 - st.chd },
    chd: { min: 0, max: () => 9 - st.adt },
    inf: { min: 0, max: () => Math.min(st.adt, 4) }
  };
  const row = (k, label, sub, ic) => html`<div class="pax-row"><div>${icon(ic)}</div><div class="grow"><b>${label}</b><small>${sub}</small></div>
    <div class="counter"><button type="button" data-dec="${k}" aria-label="Fewer ${label}">${icon('minus')}</button><output data-out="${k}" aria-live="polite">${st[k]}</output><button type="button" data-inc="${k}" aria-label="More ${label}">${icon('plus')}</button></div></div>`;
  let pop;
  pop = openPopover(anchor, {
    title: 'Travellers & class', width: 400, mobileFull: false,
    content: html`<div class="pax">
      ${row('adt', 'Adults', '12 years & above', 'user')}
      ${row('chd', 'Children', '2 – 12 years', 'users')}
      ${row('inf', 'Infants', 'Under 2 years (on lap)', 'baby')}
      <div class="pax-sub">Travel class</div>
      <div class="chip-row" role="radiogroup" aria-label="Travel class">${Object.entries(CABINS).map(([k, v]) => html`<button type="button" class="chip" role="radio" data-cabin="${k}" aria-checked="${k === st.cabin}">${v}</button>`)}</div>
      <div class="note" style="margin-top:14px">${icon('users')}<span>More than 9 travellers? <a class="link" href="#/group-booking">Get exclusive group fares</a></span></div>
      <div class="pax-foot"><span class="small muted" data-total></span><button type="button" class="btn btn-primary btn-sm" data-done>Done</button></div>
    </div>`,
    onOpen(el) {
      const sync = () => {
        for (const k of ['adt', 'chd', 'inf']) {
          if (st[k] > rules[k].max()) st[k] = rules[k].max();
          $(`[data-out="${k}"]`, el).textContent = st[k];
          $(`[data-dec="${k}"]`, el).disabled = st[k] <= rules[k].min;
          $(`[data-inc="${k}"]`, el).disabled = st[k] >= rules[k].max();
        }
        $$('[data-cabin]', el).forEach(b => { const on2 = b.dataset.cabin === st.cabin; b.setAttribute('aria-checked', on2); });
        const n = st.adt + st.chd + st.inf;
        $('[data-total]', el).textContent = `${n} traveller${n > 1 ? 's' : ''} · ${CABINS[st.cabin]}`;
        onChange({ ...st });
      };
      on(el, 'click', '[data-inc]', (e, b) => { st[b.dataset.inc]++; sync(); });
      on(el, 'click', '[data-dec]', (e, b) => { st[b.dataset.dec]--; sync(); });
      on(el, 'click', '[data-cabin]', (e, b) => { st.cabin = b.dataset.cabin; sync(); });
      $('[data-done]', el).addEventListener('click', () => pop.close());
      sync();
    }
  });
  return pop;
}

// ---------------------------------------------------------------- Rooms & guests
export function pickRooms(anchor, { rooms, onChange }) {
  let st = rooms.map(r => ({ adults: r.adults, children: r.children, ages: [...(r.ages || [])] }));
  const ageOpts = a => ['<1', ...Array.from({ length: 11 }, (_, i) => String(i + 1))].map((l, i) => html`<option value="${i}" ${Number(a) === i ? raw('selected') : ''}>${i === 0 ? 'Under 1' : l + (i === 1 ? ' year' : ' years')}</option>`);
  const roomHTML = (r, i) => html`<div class="room-block" data-room="${i}">
    <h5><span>Room ${i + 1}</span>${st.length > 1 ? html`<button type="button" class="text-btn" data-remove="${i}">${icon('trash')} Remove</button>` : ''}</h5>
    <div class="pax-row"><div class="grow"><b>Adults</b><small>Above 12 years</small></div><div class="counter"><button type="button" data-r="${i}" data-k="adults" data-d="-1" ${r.adults <= 1 ? raw('disabled') : ''} aria-label="Fewer adults">${icon('minus')}</button><output>${r.adults}</output><button type="button" data-r="${i}" data-k="adults" data-d="1" ${r.adults >= 4 ? raw('disabled') : ''} aria-label="More adults">${icon('plus')}</button></div></div>
    <div class="pax-row"><div class="grow"><b>Children</b><small>Below 12 years</small></div><div class="counter"><button type="button" data-r="${i}" data-k="children" data-d="-1" ${r.children <= 0 ? raw('disabled') : ''} aria-label="Fewer children">${icon('minus')}</button><output>${r.children}</output><button type="button" data-r="${i}" data-k="children" data-d="1" ${r.children >= 3 ? raw('disabled') : ''} aria-label="More children">${icon('plus')}</button></div></div>
    ${r.children ? html`<div class="child-ages">${r.ages.map((a, k) => html`<label class="field"><span class="field-label">Child ${k + 1} age</span><select class="select" data-age="${i}-${k}">${ageOpts(a)}</select></label>`)}</div>` : ''}
  </div>`;
  let pop;
  pop = openPopover(anchor, {
    title: 'Rooms & guests', width: 400,
    content: html`<div class="pax"><div data-rooms></div><div class="pax-foot"><button type="button" class="btn btn-light btn-sm" data-add>${icon('plus')} Add Room</button><button type="button" class="btn btn-primary btn-sm" data-done>Done</button></div></div>`,
    onOpen(el) {
      const render = () => {
        $('[data-rooms]', el).innerHTML = String(html`${st.map(roomHTML)}`);
        $('[data-add]', el).disabled = st.length >= 6;
        onChange(st.map(r => ({ ...r, ages: [...r.ages] })));
      };
      on(el, 'click', '[data-d]', (e, b) => {
        const r = st[+b.dataset.r], k = b.dataset.k, d = +b.dataset.d;
        r[k] = Math.max(k === 'adults' ? 1 : 0, Math.min(k === 'adults' ? 4 : 3, r[k] + d));
        if (k === 'children') { while (r.ages.length < r.children) r.ages.push(5); r.ages.length = r.children; }
        render();
      });
      on(el, 'change', '[data-age]', (e, s) => { const [i, k] = s.dataset.age.split('-').map(Number); st[i].ages[k] = +s.value; onChange(st.map(r => ({ ...r, ages: [...r.ages] }))); });
      on(el, 'click', '[data-remove]', (e, b) => { st.splice(+b.dataset.remove, 1); render(); });
      $('[data-add]', el).addEventListener('click', () => { if (st.length < 6) { st.push({ adults: 2, children: 0, ages: [] }); render(); } });
      $('[data-done]', el).addEventListener('click', () => pop.close());
      render();
    }
  });
  return pop;
}

// ---------------------------------------------------------------- Simple option list
export function pickOption(anchor, { title, options, value, onSelect, width = 300 }) {
  let pop;
  pop = openPopover(anchor, {
    title, width, mobileFull: false,
    content: html`<div class="picker"><div class="picker-section">${options.map(o => html`<button type="button" class="opt ${String(o.value) === String(value) ? 'is-hl' : ''}" data-v="${o.value}">${o.icon ? html`<span class="opt-icon">${icon(o.icon)}</span>` : ''}<span class="opt-main"><b>${o.label}</b>${o.sub ? html`<small>${o.sub}</small>` : ''}</span>${String(o.value) === String(value) ? icon('check') : ''}</button>`)}</div></div>`,
    onOpen(el) { on(el, 'click', '[data-v]', (e, b) => { onSelect(options.find(o => String(o.value) === b.dataset.v)); pop.close(); }); }
  });
  return pop;
}

export { AIRPORTS };
