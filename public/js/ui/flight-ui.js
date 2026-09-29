// Flight presentation pieces shared by results, review, add-ons and confirmation.
import { html, raw, icon, on, $, $$ } from '../core/dom.js';
import { money, hm, dur, fmtDate, addDays, plural } from '../core/format.js';
import { AIRPORT } from '../data/airports.js';
import { airline } from '../data/airlines.js';
import { CABINS, FARE_NOTES, EXCLUSIVE_NOTES, fareRules, paxPricing } from '../engines/flights.js';
import { airlineMark } from './common.js';
import { openModal } from './overlay.js';

export const city = c => AIRPORT[c]?.city || c;
export const stopsLabel = it => it.stops === 0 ? 'Non Stop' : `${it.stops} Stop${it.stops > 1 ? 's' : ''} via ${it.via.map(city).join(', ')}`;
export const dayMark = n => n > 0 ? `+${n}` : n < 0 ? `${n}` : '';

// Segment times are stored as minutes after 00:00 UTC on the trip date; adding an
// airport's offset gives minutes after that airport's local midnight on the trip date.
export function segTimes(it, s) {
  const depLocal = s.depUTC + AIRPORT[s.from].tz * 60, arrLocal = s.arrUTC + AIRPORT[s.to].tz * 60;
  return {
    dep: hm(depLocal), arr: hm(arrLocal),
    depDate: addDays(it.date, Math.floor(depLocal / 1440)), arrDate: addDays(it.date, Math.floor(arrLocal / 1440))
  };
}

export function segmentsHTML(it, fare) {
  const parts = [];
  it.segments.forEach((s, i) => {
    const t = segTimes(it, s), A = AIRPORT[s.from], B = AIRPORT[s.to];
    if (i > 0) {
      const l = it.layovers[i - 1];
      parts.push(html`<div class="fl-layover">${icon('clock')}<span>Change of planes · <b>${dur(l.min)}</b> layover in ${l.city}${l.min >= 480 ? html` <span class="badge badge-amber">Long layover</span>` : ''}</span></div>`);
    }
    parts.push(html`<div class="fl-seg">
      <div class="fl-seg-head">${airlineMark(s.airline, 'sm')}<b>${airline(s.airline).name}</b><span class="muted">${s.flightNo.replace('-', ' - ')}</span>
        <span class="fl-seg-meta"><span><small>Aircraft</small>${s.aircraft}</span><span><small>Cabin Class</small>${CABINS[it.cabin].toUpperCase()}</span><span><small>Travel Class</small>${(fare?.name || '').replace('*', '').toUpperCase() || '—'}</span></span></div>
      <div class="fl-seg-body">
        <div class="fl-seg-pt"><b>${t.dep}</b><span>${fmtDate(t.depDate, 'ddd, d MMM yy')}</span><strong>${A.city} [${A.code}]</strong><small>${A.name}</small><small>${A.country}${s.depTerminal ? ' · ' + s.depTerminal : ''}</small></div>
        <div class="fl-seg-mid"><small>${dur(s.block)}</small><span class="fl-line">${icon('plane')}</span></div>
        <div class="fl-seg-pt"><b>${t.arr}</b><span>${fmtDate(t.arrDate, 'ddd, d MMM yy')}</span><strong>${B.city} [${B.code}]</strong><small>${B.name}</small><small>${B.country}${s.arrTerminal ? ' · ' + s.arrTerminal : ''}</small></div>
      </div>
    </div>`);
  });
  return html`<div class="fl-segs">${parts}</div>`;
}

export function fareSummaryHTML(it, fare, pax = { adt: 1, chd: 0, inf: 0 }) {
  const p = paxPricing(it, fare, pax);
  const rules = fareRules(fare, it.dom);
  return html`<div class="fl-rules">
    <div class="fl-rules-box">
      <h4>Fare Details</h4>
      <div class="price-lines">
        ${p.lines.map(l => html`<div class="pl"><span>${l.type} × ${l.n} · Base Fare</span><span class="tnum">${money(l.base * l.n)}</span></div>`)}
        <div class="pl"><span>Tax &amp; Charges</span><span class="tnum">${money(p.tax)}</span></div>
        <div class="pl green"><span>Instant Discount</span><span class="tnum">(−) ${money(p.discount, { decimals: true })}</span></div>
        <div class="pl total"><span>Total Amount</span><span class="tnum">${money(p.total, { decimals: true })}</span></div>
      </div>
    </div>
    <div class="fl-rules-box">
      <h4>Fare Rules</h4>
      <p class="small strong" style="margin-bottom:8px">${it.from} ${raw('&rarr;')} ${it.to} · ${fare.name}</p>
      <table class="fl-table"><thead><tr><th>Changes / Reissue</th><th>Penalty (Airline fee)</th></tr></thead><tbody><tr><td>0 DAY - 365 DAY</td><td>${rules.change}</td></tr></tbody></table>
      <table class="fl-table"><thead><tr><th>Cancel Penalty</th><th>Penalty (Airline fee)</th></tr></thead><tbody><tr><td>0 DAY - 365 DAY</td><td>${rules.cancel}</td></tr></tbody></table>
      <ul class="fl-notes">${FARE_NOTES.map(n => html`<li>${n}</li>`)}</ul>
    </div>
  </div>`;
}

export function baggageHTML(it, fare, pax = { adt: 1, chd: 0, inf: 0 }) {
  const b = fare.bag;
  const rows = [['ADULT', `${b.checkin} Kg${b.pieces > 1 ? ` (${b.pieces} pieces)` : ''}`, `${b.cabin} Kg`]];
  if (pax.chd) rows.push(['CHILD', `${b.checkin} Kg`, `${b.cabin} Kg`]);
  if (pax.inf) rows.push(['INFANT', it.dom ? '0 Kg' : '10 Kg', '0 Kg']);
  return html`<div><table class="fl-table"><thead><tr><th></th><th>${icon('luggage')} Check in Baggage</th><th>${icon('bag')} Cabin Baggage</th></tr></thead>
    <tbody>${rows.map(r => html`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`)}</tbody></table>
    ${it.special === 'student' ? html`<p class="note note-green" style="margin-top:10px">${icon('grad')}<span>Student fare: includes 10 Kg extra check-in baggage. Carry a valid student ID at check-in.</span></p>` : ''}
    <ul class="fl-notes"><li>The information presented above is as obtained from the airline reservation system. AeroSkys does not guarantee the accuracy of this information.</li><li>The baggage allowance may vary according to stop-overs, connecting flights and changes in airline rules.</li></ul></div>`;
}

export function detailsPanel(it, fare, pax) {
  return html`<div class="fl-detail-tabs tabs" role="tablist">
      <button class="tab" role="tab" aria-selected="true" data-dt="ov">Overview</button>
      <button class="tab" role="tab" aria-selected="false" data-dt="fare">Fare Summary &amp; Rules</button>
      <button class="tab" role="tab" aria-selected="false" data-dt="bag">Baggage</button>
    </div>
    <div class="fl-detail-body" data-dt-body="ov">${segmentsHTML(it, fare)}</div>
    <div class="fl-detail-body" data-dt-body="fare" hidden>${fareSummaryHTML(it, fare, pax)}</div>
    <div class="fl-detail-body" data-dt-body="bag" hidden>${baggageHTML(it, fare, pax)}</div>`;
}

export function bindDetailTabs(root) {
  return on(root, 'click', '[data-dt]', (e, b) => {
    const box = b.closest('.fl-detail');
    $$('[data-dt]', box).forEach(t => t.setAttribute('aria-selected', String(t === b)));
    $$('[data-dt-body]', box).forEach(p => { p.hidden = p.dataset.dtBody !== b.dataset.dt; });
  });
}

function flexLines(f) {
  if (f.exclusive) return ['Date Change Fee as per Airline + Platform Fee', 'Cancellation Fee as per Airline + Platform Fee', 'Non Refundable'];
  return [
    f.change === 0 ? 'Free date change (fare difference applies)' : 'Date Change Fee as per Airline + Platform Fee',
    f.zeroCancel ? 'Zero cancellation up to 26 hrs before departure' : 'Cancellation Fee as per Airline + Platform Fee',
    f.refundable ? 'Refundable' : 'Non Refundable'
  ];
}

export function fareOptionCard(it, f, { selected = false } = {}) {
  return html`<article class="fo-card ${selected ? 'is-selected' : ''} ${f.exclusive ? 'is-exclusive' : ''}">
    <div class="fo-head"><div><b class="price tnum">${money(f.payable)}</b> <span class="strike small tnum">${money(f.total)}</span></div><span class="fo-name">${f.exclusive ? icon('thumb') : ''}${f.name}</span></div>
    <div class="fo-sec"><h5>${icon('luggage')} Baggage</h5><p>${f.bag.checkin} Kg${f.bag.pieces > 1 ? ` total in ${f.bag.pieces} pieces` : ''} Check-in Baggage</p><p>${f.bag.cabin} Kg Cabin Baggage</p></div>
    <div class="fo-sec"><h5>${icon('refresh')} Flexibility</h5>${flexLines(f).map(l => html`<p>${l}</p>`)}</div>
    <div class="fo-sec"><h5>${icon('meal')} Seat, Meals &amp; More</h5><p>${f.seat ? 'Standard seat included' : 'Seat as per airline'}</p><p>${f.meal ? 'Complimentary meal included' : 'Meals as per airline'}</p></div>
    <p class="fo-note">${f.note}</p>
    ${f.special ? html`<p class="fo-note fo-special">${f.special}</p>` : ''}
    <button type="button" class="btn ${selected ? 'btn-dark' : 'btn-primary'} btn-block" data-pick-fare="${f.id}">${selected ? 'Selected' : 'Book Now'}</button>
  </article>`;
}

/** "More Fare" modal. Resolves with the chosen fare (or null). */
export function openFareOptions(it, { current, cta } = {}) {
  return new Promise(resolve => {
    let done = false;
    const A = AIRPORT[it.from], B = AIRPORT[it.to];
    const m = openModal({
      title: html`<span class="fo-title"><b>${it.fares.length} FARE OPTIONS</b> available for your trip.</span>`,
      size: 'full',
      body: html`<div class="fo-trip">${airlineMark(it.airline)}<div><b>${A.city} - ${B.city}</b><small>${fmtDate(it.date, 'ddd, d MMM')}, Departure at ${hm(it.depMin)} - Arrival at ${hm(it.arrMin)}${it.dayOffset ? ` (+${it.dayOffset})` : ''}, ${stopsLabel(it)}</small><small>${airline(it.airline).name}, ${it.segments.map(s => s.flightNo).join(', ')}</small></div></div>
        <div class="fo-grid">${it.fares.map(f => fareOptionCard(it, f, { selected: current === f.id }))}</div>`,
      onClose: () => { if (!done) resolve(null); }
    });
    on(m.el, 'click', '[data-pick-fare]', (e, b) => { done = true; const f = it.fares.find(x => x.id === b.dataset.pickFare); m.close(); resolve(f); });
    if (cta) $$('[data-pick-fare]', m.el).forEach(b => { if (!b.closest('.is-selected')) b.textContent = cta; });
  });
}

/** Live-site "Exclusive Deal" acknowledgement. Resolves true when accepted. */
export function exclusiveNotice() {
  return new Promise(resolve => {
    let done = false;
    const m = openModal({
      title: html`<span style="color:var(--red)">Exclusive Deal</span>`,
      body: html`<div class="center" style="margin-bottom:12px"><span class="fo-thumb">${icon('thumb')}</span><h3 class="h4" style="margin-top:10px">Important Notes for an exclusive deal!</h3></div>
        <ul class="fl-notes fl-notes-strong">${EXCLUSIVE_NOTES.map((n, i) => html`<li class="${i === 2 || i === 3 ? 'strong' : ''}">${n}</li>`)}</ul>`,
      foot: html`<button class="btn btn-light" data-no>Close</button><button class="btn btn-primary" data-yes>I Accept</button>`,
      onClose: () => { if (!done) resolve(false); }
    });
    m.el.querySelector('[data-yes]').addEventListener('click', () => { done = true; m.close(); resolve(true); });
    m.el.querySelector('[data-no]').addEventListener('click', () => { done = true; m.close(); resolve(false); });
  });
}

/** Compact journey summary used on review / add-ons / payment / booking pages. */
export function journeyCard(j, { label = 'Depart', pax, open = false } = {}) {
  const it = j.itinerary, f = j.fare;
  const A = AIRPORT[it.from], B = AIRPORT[it.to];
  return html`<details class="co-journey" ${open ? raw('open') : ''}>
    <summary>
      <div class="co-j-top"><span class="badge badge-navy">${label}</span><b>${A.city} ${icon('arrow-right')} ${B.city}</b><span class="muted small">${fmtDate(it.date, 'ddd, d MMM')} · ${stopsLabel(it)} · ${dur(it.duration)}</span>
        <span class="badge ${f.refundable ? 'badge-green' : 'badge-red'}">${f.refundable ? 'Refundable' : 'Non-Refundable'}</span></div>
      <div class="co-j-row">${airlineMark(it.airline, 'sm')}<span><b>${airline(it.airline).name}</b> <span class="muted small">${it.segments.map(s => s.flightNo).join(', ')}</span></span>
        <span class="co-j-times tnum"><b>${hm(it.depMin)}</b> ${it.from} ${raw('&rarr;')} <b>${hm(it.arrMin)}</b>${it.dayOffset ? html`<sup>+${it.dayOffset}</sup>` : ''} ${it.to}</span>
        <span class="co-j-fare">${f.name}</span>${icon('chevron-down')}</div>
    </summary>
    <div class="co-j-body">${segmentsHTML(it, f)}
      <div class="co-j-bag">${icon('luggage')} Check-in ${f.bag.checkin} Kg · ${icon('bag')} Cabin ${f.bag.cabin} Kg${pax ? ` · ${plural(pax.adt + pax.chd + pax.inf, 'traveller')}` : ''}</div>
    </div>
  </details>`;
}
