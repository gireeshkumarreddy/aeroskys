// Booking confirmation & manage booking (flight / hotel / bus).
import { html, raw, icon, mount, on, $, img } from '../core/dom.js';
import { money, inr, fmtDate, hm, hm12, dur, plural, ago, iso, addDays } from '../core/format.js';
import { href, setQuery } from '../core/router.js';
import { store } from '../core/store.js';
import { AIRPORT } from '../data/airports.js';
import { airline, WEB_CHECKIN } from '../data/airlines.js';
import { COMPANY } from '../data/content.js';
import { getBooking, refundQuote, cancelBooking } from '../engines/bookings.js';
import { steps, emptyState, priceLines, airlineMark, stars } from '../ui/common.js';
import { journeyCard } from '../ui/flight-ui.js';
import { FLIGHT_STEPS } from './flight-review.js';
import { openModal, confirmDialog } from '../ui/overlay.js';
import { toast } from '../ui/toast.js';

const STATUS = { confirmed: ['Confirmed', 'badge-green', 'check-circle'], processing: ['Confirmation in progress', 'badge-amber', 'clock'], cancelled: ['Cancelled', 'badge-red', 'x'] };
const TYPE = { flight: ['Flight', 'plane'], hotel: ['Hotel', 'bed'], bus: ['Bus', 'bus'] };

function flightBody(b) {
  const it = b.item;
  const seatsFor = (ti) => it.addons?.seats ? Object.entries(it.addons.seats).map(([k, m]) => m[ti] ? m[ti].id : null).filter(Boolean).join(', ') : '';
  const mealsFor = (ti) => it.addons?.meals ? Object.values(it.addons.meals).map(m => m[ti]?.name).filter(Boolean).join(', ') : '';
  const bagsFor = (ti) => it.addons?.bags ? Object.values(it.addons.bags).map(m => m[ti] ? `+${m[ti].kg} Kg` : null).filter(Boolean).join(', ') : '';
  const checkin = [...new Set(it.journeys.map(j => j.itinerary.airline))].map(c => WEB_CHECKIN.find(w => w[0] === c)).filter(Boolean);
  return html`
    <div class="bk-card">
      <div class="bk-sec-head"><h2 class="h4">${icon('plane')} Flight itinerary</h2><div class="bk-pnrs">${it.journeys.map((j, i) => html`<span><small>${i ? 'Return' : 'Onward'} PNR</small><b class="tnum">${b.status === 'processing' ? 'Pending' : b.pnrs?.[i] || '—'}</b></span>`)}</div></div>
      ${it.journeys.map((j, i) => journeyCard(j, { label: i ? 'Return' : 'Depart', pax: it.pax, open: i === 0 }))}
    </div>
    <div class="bk-card">
      <div class="bk-sec-head"><h2 class="h4">${icon('users')} Travellers</h2></div>
      <div class="bk-table-wrap"><table class="bk-table"><thead><tr><th>Traveller</th><th>Type</th><th>E-ticket</th><th>Seat</th><th>Meal</th><th>Extra baggage</th></tr></thead>
      <tbody>${b.travellers.map((t, i) => html`<tr><td><b>${t.title} ${t.first} ${t.last}</b>${t.passport ? html`<br><small class="muted">Passport ${t.passport.slice(0, 2)}•••${t.passport.slice(-2)}</small>` : ''}</td><td>${t.type}</td><td class="tnum">${b.status === 'processing' ? 'Pending' : b.eticket?.[i] || '—'}</td><td>${seatsFor(i) || '—'}</td><td>${mealsFor(i) || '—'}</td><td>${bagsFor(i) || '—'}</td></tr>`)}</tbody></table></div>
    </div>
    <div class="bk-card bk-info">
      <h2 class="h4">${icon('info')} Before you fly</h2>
      <ul>
        <li>Carry a valid government photo ID${it.journeys.some(j => !j.itinerary.dom) ? ', your passport and any visa needed' : ''}. Names must match the ticket.</li>
        <li>Reach the airport at least ${it.journeys.some(j => !j.itinerary.dom) ? '3 hours' : '2 hours'} before departure and verify the terminal on your boarding pass.</li>
        ${it.exclusive ? html`<li><b>Exclusive fare:</b> web check-in is mandatory; names are updated with the airline 12–24 hours before departure.</li>` : ''}
        ${it.special === 'student' ? html`<li>Student fare: carry your student ID for the extra baggage allowance.</li>` : ''}
        ${it.special === 'senior' ? html`<li>Senior citizen fare: carry valid age proof.</li>` : ''}
        <li>Cancellation/Date change requests are accepted up to 30 hrs before departure.</li>
      </ul>
      ${checkin.length ? html`<div class="row gap-8" style="flex-wrap:wrap;margin-top:12px">${checkin.map(w => html`<a class="btn btn-light btn-sm" href="${w[2]}" target="_blank" rel="noopener">${airlineMark(w[0], 'sm')} ${w[1]} web check-in ${icon('external')}</a>`)}</div>` : ''}
    </div>`;
}

function hotelBody(b) {
  const it = b.item;
  return html`<div class="bk-card">
      <div class="bk-hotel">
        <div class="bk-hotel-img">${img(it.image, { alt: it.name, fallback: 'maldives-villas' })}</div>
        <div><h2 class="h3">${it.name}</h2><p class="muted small">${stars(it.stars)} ${it.type || 'Hotel'} · ${[it.area, it.city].filter(Boolean).join(', ')}</p><p class="small" style="margin-top:6px">${icon('pin')} ${it.address || ''}</p>
          <p class="small" style="margin-top:6px"><b>Voucher</b> <span class="tnum">${b.voucher || '—'}</span></p></div>
      </div>
      <div class="bk-stay">
        <div><small>Check-in</small><b>${fmtDate(it.checkin, 'ddd, d MMM yyyy')}</b><span>from ${it.checkinTime || '14:00'}</span></div>
        <div class="bk-nights">${it.nights} night${it.nights > 1 ? 's' : ''}</div>
        <div><small>Check-out</small><b>${fmtDate(it.checkout, 'ddd, d MMM yyyy')}</b><span>until ${it.checkoutTime || '12:00'}</span></div>
      </div>
      <dl class="kv" style="margin-top:16px"><dt>Room</dt><dd>${it.room?.name} × ${it.rooms?.length || 1}</dd><dt>Meal plan</dt><dd>${it.room?.meal}</dd><dt>Guests</dt><dd>${(it.rooms || []).reduce((n, r) => n + r.adults, 0)} adults${(it.rooms || []).reduce((n, r) => n + r.children, 0) ? ', ' + (it.rooms || []).reduce((n, r) => n + r.children, 0) + ' children' : ''}</dd>
        <dt>Cancellation</dt><dd>${it.room?.refundable && it.room?.freeCancelUntil ? `Free until ${fmtDate(it.room.freeCancelUntil, 'd MMM yyyy')}` : 'Non-refundable'}</dd>
        ${it.specialRequest ? html`<dt>Special request</dt><dd>${it.specialRequest}</dd>` : ''}</dl>
    </div>
    <div class="bk-card"><div class="bk-sec-head"><h2 class="h4">${icon('users')} Guests</h2></div>
      <ul class="bk-list">${(it.guests || b.travellers || []).map(g => html`<li>${icon('user')} ${g.title || ''} ${g.first} ${g.last}${g.room ? html` <span class="muted small">· Room ${g.room}</span>` : ''}</li>`)}</ul></div>`;
}

function busBody(b) {
  const it = b.item;
  const pt = p => p ? html`<b>${typeof p.time === 'number' ? hm12(p.time) : p.time || ''}</b> ${p.name}${p.landmark ? html`<small class="muted"> · ${p.landmark}</small>` : ''}` : '—';
  return html`<div class="bk-card">
      <div class="bk-sec-head"><h2 class="h4">${icon('bus')} ${it.operator}</h2><div class="bk-pnrs"><span><small>PNR</small><b class="tnum">${b.pnrs?.[0] || '—'}</b></span><span><small>Ticket</small><b class="tnum">${b.ticketNo || '—'}</b></span></div></div>
      <p class="muted small">${it.busType}</p>
      <div class="bk-stay">
        <div><small>${it.from}</small><b>${typeof it.dep === 'number' ? hm12(it.dep) : it.dep}</b><span>${fmtDate(it.date, 'ddd, d MMM yyyy')}</span></div>
        <div class="bk-nights">${typeof it.duration === 'number' ? dur(it.duration) : it.duration || ''}</div>
        <div><small>${it.to}</small><b>${typeof it.arr === 'number' ? hm12(it.arr) : it.arr}</b><span>${fmtDate(addDays(it.date, it.dayOffset || 0), 'ddd, d MMM yyyy')}</span></div>
      </div>
      <dl class="kv" style="margin-top:16px"><dt>Boarding</dt><dd>${pt(it.boarding)}</dd><dt>Dropping</dt><dd>${pt(it.dropping)}</dd></dl>
    </div>
    <div class="bk-card"><div class="bk-sec-head"><h2 class="h4">${icon('seat')} Passengers &amp; seats</h2></div>
      <div class="bk-table-wrap"><table class="bk-table"><thead><tr><th>Seat</th><th>Passenger</th><th>Age</th><th>Gender</th></tr></thead><tbody>
      ${(it.passengers || []).map(p => html`<tr><td><b>${p.seat}</b></td><td>${p.name}</td><td>${p.age}</td><td>${p.gender}</td></tr>`)}</tbody></table></div>
      <p class="small muted" style="margin-top:12px">Reach your boarding point 15 minutes early and show this ticket (printed or on your phone) with a valid photo ID.</p></div>`;
}

export default async function booking(el, ctx) {
  const render = () => {
    const b = getBooking(ctx.params.ref);
    if (!b) {
      mount(el, html`<section class="page"><div class="wrap-narrow">${emptyState({ iconName: 'search', title: 'We couldn’t find that booking', text: 'Bookings made in this prototype are stored on the device they were made on. Try Find Booking with your reference and first name.', action: html`<a class="btn btn-primary" href="#/find-booking">Find Booking</a>` })}</div></section>`);
      return;
    }
    document.title = `Booking ${b.ref} — AeroSkys`;
    const isNew = ctx.query.get('new') === '1' && b.status !== 'cancelled';
    const [label, badge, ic] = STATUS[b.status] || STATUS.confirmed;
    const [tLabel, tIcon] = TYPE[b.type];
    const q = b.status !== 'cancelled' ? refundQuote(b) : null;
    mount(el, html`<section class="page co-page bk-page">
      <div class="wrap-wide">
        ${isNew && b.type === 'flight' ? steps(FLIGHT_STEPS, 4) : ''}
        ${isNew ? html`<div class="bk-hero ${b.status}">
            <span class="bk-hero-ic">${icon(b.status === 'processing' ? 'clock' : 'check')}</span>
            <div><h1 class="h2">${b.status === 'processing' ? 'Booking received!' : 'Booking Confirmed!'}</h1>
              <p>${b.status === 'processing' ? 'Exclusive fares take 30–45 minutes to confirm. We’ll update your PNR here and by email.' : `Your ${tLabel.toLowerCase()} booking is confirmed.`} Confirmation details go to <b>${b.contact?.email}</b>${b.contact?.phone ? html` and <b>${b.contact.countryCode || '+91'} ${b.contact.phone}</b>` : ''}.</p>
              <p class="xs" style="opacity:.8;margin-top:6px">Prototype: no email or SMS is actually sent, and no payment was taken.</p></div>
          </div>` : html`<div class="co-top"><div><a class="text-btn small" href="#/trips">${icon('chevron-left')} My Trips</a><h1 class="h3" style="margin-top:6px">${tLabel} booking</h1></div></div>`}
        <div class="co-layout">
          <div class="co-main">
            <div class="bk-card bk-head">
              <div class="bk-head-l"><span class="co-type">${icon(tIcon)}</span><div><small class="muted">Booking Reference Number</small><b class="bk-ref tnum">${b.ref}</b><small class="muted">Booked ${fmtDate(iso(new Date(b.createdAt)), 'd MMM yyyy')} · ${ago(b.createdAt)}</small></div></div>
              <span class="badge ${badge}">${icon(ic)} ${label}</span>
            </div>
            <div class="bk-card bk-title"><h2 class="h3">${b.title}</h2><p class="muted">${b.subtitle}</p></div>
            ${b.status === 'cancelled' ? html`<div class="note note-red">${icon('info')}<span>This booking was cancelled on ${fmtDate(iso(new Date(b.cancelledAt)), 'd MMM yyyy')}. ${b.refund?.amount ? html`A refund of <b>${inr(b.refund.amount)}</b> will reach the original payment method by ${fmtDate(b.refund.eta, 'd MMM yyyy')} (7–14 business days).` : 'No refund is due under the fare rules.'}</span></div>` : ''}
            ${b.type === 'flight' ? flightBody(b) : b.type === 'hotel' ? hotelBody(b) : busBody(b)}
            <div class="bk-card"><div class="bk-sec-head"><h2 class="h4">${icon('user')} Contact</h2></div>
              <dl class="kv"><dt>Name</dt><dd>${b.contact?.name}</dd><dt>Email</dt><dd>${b.contact?.email}</dd><dt>Mobile</dt><dd>${b.contact?.countryCode || '+91'} ${b.contact?.phone}</dd>${b.gst ? html`<dt>GSTIN</dt><dd>${b.gst.number} · ${b.gst.company}</dd>` : ''}</dl></div>
          </div>
          <aside class="co-side">
            <div class="co-card"><h2 class="h4">Payment summary</h2><div style="margin-top:12px">${priceLines(b.pricing.lines.map(l => ({ ...l, decimals: l.neg })), b.pricing.total, { totalLabel: 'Total paid' })}</div>
              <p class="small muted" style="margin-top:10px">${icon('card')} ${b.payment?.method} · ${b.payment?.detail}<br>Transaction ${b.payment?.txn}</p></div>
            <div class="co-card bk-actions no-print">
              <button class="btn btn-primary btn-block" data-print>${icon('download')} Download ${b.type === 'hotel' ? 'voucher' : 'e-ticket'}</button>
              <button class="btn btn-light btn-block" data-email>${icon('mail')} Email ${b.type === 'hotel' ? 'voucher' : 'e-ticket'}</button>
              ${b.status !== 'cancelled' ? html`<button class="btn btn-light btn-block" data-cancel ${q && !q.allowed ? raw('disabled') : ''}>${icon('x')} Cancel booking</button>${q && !q.allowed ? html`<p class="xs muted">${q.reason}</p>` : ''}` : ''}
              <a class="btn btn-ghost btn-block" href="#/support">${icon('headset')} Need help? 24/7 support</a>
            </div>
            ${b.type === 'flight' && b.status !== 'cancelled' ? html`<a class="co-card bk-xsell" href="${href('/hotels/search', { city: AIRPORT[b.item.journeys[0].to]?.city, in: b.item.journeys[0].date, out: b.item.journeys[1]?.date || undefined })}">${icon('bed')}<span><b>Need a stay in ${AIRPORT[b.item.journeys[0].to]?.city}?</b><small>Find hotels for your dates</small></span>${icon('arrow-right')}</a>` : ''}
          </aside>
        </div>
      </div>
    </section>`);
  };
  render();

  const unbind = [];
  unbind.push(on(el, 'click', '[data-print]', () => window.print()));
  unbind.push(on(el, 'click', '[data-email]', () => { const b = getBooking(ctx.params.ref); toast(`We’d email this to ${b.contact?.email}. (Prototype: no email is sent.)`, { type: 'info' }); }));
  unbind.push(on(el, 'click', '[data-cancel]', async () => {
    const b = getBooking(ctx.params.ref);
    const q = refundQuote(b);
    if (!q.allowed) { toast(q.reason, { type: 'error' }); return; }
    const m = openModal({
      title: 'Cancel this booking?',
      body: html`<p class="small muted" style="margin-bottom:14px">${b.title} · ${b.subtitle}</p>
        ${priceLines([{ label: 'Amount paid', amount: b.pricing.total }, ...q.lines.map(l => ({ label: l.label, amount: l.amount, neg: true }))], q.refund, { totalLabel: 'Estimated refund' })}
        <p class="xs muted" style="margin-top:12px">${q.note}</p>`,
      foot: html`<button class="btn btn-light" data-close>Keep booking</button><button class="btn btn-dark" data-confirm-cancel>Confirm cancellation</button>`
    });
    m.el.querySelector('[data-confirm-cancel]').addEventListener('click', () => {
      const r = cancelBooking(b.ref);
      m.close();
      if (r?.error) toast(r.error, { type: 'error' });
      else { toast(r.refund?.amount ? `Cancelled. Refund of ${inr(r.refund.amount)} initiated.` : 'Booking cancelled.', { title: 'Cancellation confirmed' }); setQuery({ new: null }); render(); }
    });
  }));
  // Exclusive fares settle after a minute in the prototype; refresh the page state.
  const b0 = getBooking(ctx.params.ref);
  const poll = b0?.status === 'processing' ? setInterval(() => { const b = getBooking(ctx.params.ref); if (b?.status !== 'processing') { clearInterval(poll); toast('Your PNR is confirmed.', { title: 'Booking confirmed' }); render(); } }, 5000) : 0;
  const unsub = store.subscribe((s, patch) => { if ('currency' in patch) render(); });
  return () => { unbind.forEach(f => f()); clearInterval(poll); unsub(); };
}
