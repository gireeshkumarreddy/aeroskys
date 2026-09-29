// Flight step 3 — "Seat & Meal": seat maps per segment, meals and prepaid excess baggage.
import { html, raw, icon, mount, on, $, $$ } from '../core/dom.js';
import { money } from '../core/format.js';
import { go, href } from '../core/router.js';
import { store } from '../core/store.js';
import { AIRPORT } from '../data/airports.js';
import { airline } from '../data/airlines.js';
import { getDraft, updateDraft } from '../engines/bookings.js';
import { seatMap, mealsFor, baggageOptions } from '../engines/addons.js';
import { steps, emptyState, airlineMark } from '../ui/common.js';
import { FLIGHT_STEPS } from './flight-review.js';
import { toast } from '../ui/toast.js';

export default async function addons(el, ctx) {
  const d = getDraft(ctx.query.get('d') || '');
  if (!d || d.type !== 'flight') {
    mount(el, html`<section class="page"><div class="wrap-narrow">${emptyState({ iconName: 'clock', title: 'Your booking session has expired', text: 'Please search again to pick your flight.', action: html`<a class="btn btn-primary" href="#/">New search</a>` })}</div></section>`);
    return;
  }
  document.title = 'Seats & meals — AeroSkys';
  const item = d.item;
  const pax = d.travellers.map((t, i) => ({ ...t, i })).filter(t => t.type !== 'Infant');
  const segs = [];
  item.journeys.forEach((j, ji) => j.itinerary.segments.forEach((seg, si) => segs.push({ key: `${ji}-${si}`, ji, si, seg, it: j.itinerary, fare: j.fare, map: seatMap(seg, j.date, j.fare.seat, j.itinerary.dom), meals: mealsFor(seg, j.fare, j.itinerary.dom) })));
  const prev = item.addons || {};
  const sel = { seats: structuredClone(prev.seats || {}), meals: structuredClone(prev.meals || {}), bags: structuredClone(prev.bags || {}) };
  const st = { tab: 'seats', seg: segs[0].key, pax: pax[0].i };
  const segOf = k => segs.find(x => x.key === k);
  const name = t => `${t.title} ${t.first} ${t.last}`;

  const totals = () => {
    let seats = 0, meals = 0, bags = 0;
    Object.values(sel.seats).forEach(m => Object.values(m).forEach(v => { seats += v.price; }));
    Object.values(sel.meals).forEach(m => Object.values(m).forEach(v => { meals += v.price; }));
    Object.values(sel.bags).forEach(m => Object.values(m).forEach(v => { bags += v.price; }));
    return { seats, meals, bags, all: seats + meals + bags };
  };

  const seatLegend = html`<div class="co-legend"><span><i class="st free"></i>Free</span><span><i class="st paid"></i>Paid</span><span><i class="st front"></i>Front rows</span><span><i class="st xl"></i>XL legroom</span><span><i class="st taken"></i>Occupied</span><span><i class="st mine"></i>Selected</span></div>`;

  function seatMapHTML(s) {
    const taken = new Set(Object.entries(sel.seats[s.key] || {}).map(([p, v]) => v.id));
    const mineHere = sel.seats[s.key]?.[st.pax]?.id;
    return html`<div class="co-cabin" role="grid" aria-label="Seat map ${s.seg.flightNo}">
      <div class="co-nose">${icon('plane')}<span>Front of aircraft · ${s.seg.aircraft}</span></div>
      <div class="co-cols">${s.map.cols.map(c => c === '|' ? html`<span class="co-aisle"></span>` : html`<span>${c}</span>`)}</div>
      ${s.map.rows.map(r => html`<div class="co-row ${r.exit ? 'is-exit' : ''}" role="row">${r.exit ? html`<span class="co-exit">EXIT</span>` : ''}
        ${s.map.cols.map((c, ci) => {
          if (c === '|') return html`<span class="co-aisle">${r.row}</span>`;
          const seat = r.seats[ci];
          const isMine = mineHere === seat.id, isOther = !isMine && taken.has(seat.id);
          const cls = ['co-seat', seat.taken ? 'is-taken' : isMine ? 'is-mine' : isOther ? 'is-other' : seat.tier === 'xl' ? 'is-xl' : seat.tier === 'front' ? 'is-front' : seat.price === 0 ? 'is-free' : 'is-paid'].join(' ');
          return html`<button type="button" class="${cls}" role="gridcell" data-seat="${seat.id}" ${seat.taken || isOther ? raw('disabled') : ''} aria-label="Seat ${seat.id}${seat.window ? ', window' : seat.aisle ? ', aisle' : ''}${seat.exit ? ', exit row' : ''}, ${seat.taken ? 'occupied' : seat.price ? '₹' + seat.price : 'free'}" aria-pressed="${isMine}"><span>${seat.col}</span>${!seat.taken && !isOther ? html`<small>${seat.price ? '₹' + seat.price : 'Free'}</small>` : ''}</button>`;
        })}</div>`)}
    </div>`;
  }

  function paxChips(s) {
    return html`<div class="co-pax" role="tablist" aria-label="Travellers">${pax.map(t => {
      const seat = sel.seats[s.key]?.[t.i], meal = sel.meals[s.key]?.[t.i];
      const val = st.tab === 'meals' ? (meal ? meal.name : 'No meal') : (seat ? `Seat ${seat.id} · ${seat.price ? money(seat.price) : 'Free'}` : 'No seat selected');
      return html`<button type="button" class="co-pax-chip" role="tab" data-pax="${t.i}" aria-selected="${st.pax === t.i}"><span class="avatar">${t.first[0]}${t.last[0]}</span><span><b>${name(t)}</b><small>${val}</small></span></button>`;
    })}</div>`;
  }

  function bodyHTML() {
    const s = segOf(st.seg);
    if (st.tab === 'bags') {
      return html`<div class="stack gap-16">${item.journeys.map((j, ji) => html`<div class="co-card co-bagcard">
        <h3 class="h4">${AIRPORT[j.from].city} → ${AIRPORT[j.to].city} <span class="muted small">· Included: ${j.fare.bag.checkin} Kg check-in, ${j.fare.bag.cabin} Kg cabin</span></h3>
        ${pax.map(t => html`<div class="co-bagrow"><span class="grow"><b>${name(t)}</b><small class="muted"> · Pre-purchase at a lower price than the airport</small></span>
          <div class="chip-row">${[{ id: 'none', kg: 0, price: 0 }, ...baggageOptions(j.itinerary.dom)].map(o => html`<button type="button" class="chip" data-bag="${ji}:${t.i}:${o.kg}:${o.price}" aria-pressed="${(sel.bags[ji]?.[t.i]?.kg || 0) === o.kg}">${o.kg ? html`+${o.kg} Kg · ${money(o.price)}` : 'None'}</button>`)}</div></div>`)}
      </div>`)}</div>`;
    }
    const segChips = html`<div class="chip-scroll co-segs">${segs.map(x => html`<button type="button" class="chip" data-seg="${x.key}" aria-pressed="${x.key === st.seg}">${airlineMark(x.seg.airline, 'sm')} ${x.seg.from} → ${x.seg.to} · ${x.seg.flightNo}</button>`)}</div>`;
    if (st.tab === 'meals') {
      const m = s.meals;
      return html`${segChips}${paxChips(s)}
        ${m.complimentary ? html`<div class="note note-green" style="margin-bottom:12px">${icon('meal')}<span>Your fare includes a complimentary meal on this flight — choose a preference.</span></div>` : ''}
        <div class="co-meals">${m.options.map(o => { const on2 = sel.meals[s.key]?.[st.pax]?.id === o.id; return html`<button type="button" class="co-meal ${on2 ? 'is-on' : ''}" data-meal="${o.id}" aria-pressed="${on2}"><span class="co-meal-ic">${icon('meal')}</span><span class="grow"><b>${o.name}</b><small>${o.desc}</small></span><span class="price small">${o.price ? money(o.price) : 'Free'}</span><span class="co-meal-add">${on2 ? icon('check') : icon('plus')}</span></button>`; })}</div>`;
    }
    return html`${segChips}${paxChips(s)}${seatLegend}<div class="co-cabin-wrap">${seatMapHTML(s)}</div>`;
  }

  function sideHTML() {
    const t = totals();
    const fareTotal = d.pricing.total - (d.pricing.addons || 0);
    return html`<div class="co-card">
      <h2 class="h4">Your add-ons</h2>
      <div class="price-lines" style="margin-top:14px">
        <div class="pl"><span>Flight fare</span><span class="tnum">${money(fareTotal, { decimals: true })}</span></div>
        <div class="pl"><span>${icon('seat')} Seats</span><span class="tnum">${money(t.seats)}</span></div>
        <div class="pl"><span>${icon('meal')} Meals</span><span class="tnum">${money(t.meals)}</span></div>
        <div class="pl"><span>${icon('luggage')} Excess baggage</span><span class="tnum">${money(t.bags)}</span></div>
        <div class="pl total"><span>Total Amount</span><span class="tnum">${money(fareTotal + t.all, { decimals: true })}</span></div>
      </div>
      <button class="btn btn-primary btn-lg btn-block" style="margin-top:18px" data-next>Continue to Payment ${icon('arrow-right')}</button>
      <button class="btn btn-ghost btn-block" style="margin-top:6px" data-skip>Skip add-ons</button>
      <p class="xs muted" style="margin-top:10px">Seats, meals and excess baggage are non-refundable once purchased.</p>
    </div>`;
  }

  mount(el, html`<section class="page co-page">
    <div class="wrap-wide">
      <div class="co-top"><div><h1 class="h3">Seat &amp; Meal</h1><p class="muted small">${d.title} · ${d.subtitle}</p></div><a class="text-btn" href="${d.returnTo}">${icon('chevron-left')} Back to traveller details</a></div>
      ${steps(FLIGHT_STEPS, 2)}
      <div class="co-layout">
        <div class="co-main">
          <div class="co-card">
            <div class="tabs co-addon-tabs" role="tablist">
              <button class="tab" role="tab" data-tab="seats" aria-selected="true">${icon('seat')} Seats</button>
              <button class="tab" role="tab" data-tab="meals" aria-selected="false">${icon('meal')} Meals</button>
              <button class="tab" role="tab" data-tab="bags" aria-selected="false">${icon('luggage')} Excess Baggage</button>
            </div>
            <div data-body style="margin-top:16px"></div>
          </div>
        </div>
        <aside class="co-side" data-side></aside>
      </div>
    </div>
  </section>
  <div class="mobile-cta"><div class="mc-price"><small>Total incl. add-ons</small><b class="tnum" data-mtotal></b></div><button class="btn btn-primary" data-next>Continue ${icon('arrow-right')}</button></div>`);
  document.body.classList.add('has-mobile-cta');

  const render = () => {
    $('[data-body]', el).innerHTML = String(bodyHTML());
    $('[data-side]', el).innerHTML = String(sideHTML());
    $('[data-mtotal]', el).textContent = money(d.pricing.total - (d.pricing.addons || 0) + totals().all, { decimals: true });
  };
  render();

  const unbind = [];
  unbind.push(on(el, 'click', '[data-tab]', (e, b) => { st.tab = b.dataset.tab; $$('[data-tab]', el).forEach(t => t.setAttribute('aria-selected', String(t === b))); render(); }));
  unbind.push(on(el, 'click', '[data-seg]', (e, b) => { st.seg = b.dataset.seg; render(); }));
  unbind.push(on(el, 'click', '[data-pax]', (e, b) => { st.pax = Number(b.dataset.pax); render(); }));
  unbind.push(on(el, 'click', '[data-seat]', (e, b) => {
    const s = segOf(st.seg);
    const seat = s.map.rows.flatMap(r => r.seats).find(x => x && x.id === b.dataset.seat);
    const m = (sel.seats[s.key] ||= {});
    if (m[st.pax]?.id === seat.id) delete m[st.pax];
    else {
      if (seat.exit) toast('Exit-row seats are for travellers aged 15+ who can assist in an emergency.', { type: 'info' });
      m[st.pax] = { id: seat.id, price: seat.price, tier: seat.tier };
      const next = pax.find(t => !m[t.i]);
      if (next) st.pax = next.i;
    }
    render();
  }));
  unbind.push(on(el, 'click', '[data-meal]', (e, b) => {
    const s = segOf(st.seg);
    const o = s.meals.options.find(x => x.id === b.dataset.meal);
    const m = (sel.meals[s.key] ||= {});
    if (m[st.pax]?.id === o.id) delete m[st.pax]; else m[st.pax] = { id: o.id, name: o.name, price: o.price };
    render();
  }));
  unbind.push(on(el, 'click', '[data-bag]', (e, b) => {
    const [ji, pi, kg, price] = b.dataset.bag.split(':').map(Number);
    const m = (sel.bags[ji] ||= {});
    if (!kg) delete m[pi]; else m[pi] = { kg, price };
    render();
  }));

  const commit = (skip) => {
    const t = skip ? { seats: 0, meals: 0, bags: 0, all: 0 } : totals();
    const base = d.pricing.total - (d.pricing.addons || 0);
    const lines = d.pricing.lines.filter(l => !l.addon);
    if (t.seats) lines.push({ label: 'Seats', amount: t.seats, addon: true });
    if (t.meals) lines.push({ label: 'Meals', amount: t.meals, addon: true });
    if (t.bags) lines.push({ label: 'Excess baggage', amount: t.bags, addon: true });
    const addonsSel = skip ? null : sel;
    const item2 = { ...item, addons: addonsSel };
    updateDraft(d.id, { item: item2, pricing: { ...d.pricing, lines, addons: t.all, total: Math.round((base + t.all) * 100) / 100 } });
    go('/checkout', { query: { d: d.id } });
  };
  unbind.push(on(el, 'click', '[data-next]', () => commit(false)));
  unbind.push(on(el, 'click', '[data-skip]', () => commit(true)));
  const unsub = store.subscribe((s2, patch) => { if ('currency' in patch) render(); });
  return () => { unbind.forEach(f => f()); unsub(); document.body.classList.remove('has-mobile-cta'); };
}
