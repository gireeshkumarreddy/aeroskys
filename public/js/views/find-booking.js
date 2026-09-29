// "Manage Your Booking" — Booking Reference Number + First name, as on the live site.
import { html, icon, mount, on, $ } from '../core/dom.js';
import { fmtDate } from '../core/format.js';
import { go } from '../core/router.js';
import { findBooking, allBookings, startDate } from '../engines/bookings.js';
import { crumbs, field } from '../ui/common.js';

const TYPE_ICON = { flight: 'plane', hotel: 'bed', bus: 'bus' };

export default async function findBookingView(el, ctx) {
  document.title = 'Find Booking — AeroSkys';
  const recent = allBookings().slice(0, 4);
  mount(el, html`<section class="band page-hero"><div class="wrap">${crumbs([{ label: 'Home', href: '#/' }, { label: 'Find Booking' }])}
      <h1 class="display">Manage your <em>booking.</em></h1><p>View your itinerary, download your e-ticket or voucher, or request a cancellation.</p></div></section>
    <section class="section-sm bg-wash"><div class="wrap fb-grid">
      <form class="co-card stack gap-16" data-find novalidate>
        <h2 class="h4">Manage Your Booking</h2>
        ${field({ name: 'ref', label: 'Booking Reference Number', required: true, placeholder: 'e.g. ASF2609K7P2Q', value: ctx.query.get('ref') || '', attrs: 'autocapitalize="characters" autocomplete="off" data-autofocus' })}
        ${field({ name: 'first', label: 'First name', required: true, placeholder: 'First name of any traveller', autocomplete: 'given-name' })}
        <p class="field-error" data-find-error role="alert"></p>
        <button class="btn btn-primary btn-lg" type="submit">${icon('search')} Find Booking</button>
        <p class="xs muted">Your reference is on your confirmation page and e-ticket. Prototype bookings are stored on the device they were made on.</p>
      </form>
      <div class="stack gap-12">
        <div class="co-card"><h2 class="h4">Recent bookings on this device</h2>
          ${recent.length ? html`<div class="trip-list" style="margin-top:12px">${recent.map(b => html`<a class="trip-card" href="#/booking/${b.ref}"><span class="co-type">${icon(TYPE_ICON[b.type])}</span><span><b>${b.title}</b><small>${b.ref} · ${fmtDate(startDate(b), 'ddd, d MMM yyyy')}</small></span><span class="trip-r badge ${b.status === 'cancelled' ? 'badge-red' : b.status === 'processing' ? 'badge-amber' : 'badge-green'}">${b.status === 'processing' ? 'Confirming' : b.status[0].toUpperCase() + b.status.slice(1)}</span></a>`)}</div>`
            : html`<p class="small muted" style="margin-top:8px">No bookings yet. When you book a flight, hotel or bus, it appears here.</p>`}
        </div>
        <div class="co-card"><h2 class="h4">Need help with a booking?</h2><p class="small muted" style="margin:6px 0 12px">Our travel experts are available 24/7.</p><div class="row gap-8" style="flex-wrap:wrap"><a class="btn btn-light btn-sm" href="#/support">${icon('headset')} Contact us</a><a class="btn btn-light btn-sm" href="#/cancellation-policy">Cancellation Policy</a><a class="btn btn-light btn-sm" href="#/refund-policy">Refund Policy</a></div></div>
      </div>
    </div></section>`);
  const form = $('[data-find]', el);
  return on(el, 'submit', '[data-find]', e => {
    e.preventDefault();
    const ref = form.elements.ref.value.trim().toUpperCase(), first = form.elements.first.value.trim();
    const err = $('[data-find-error]', el);
    if (!ref || !first) { err.textContent = 'Please enter your Booking Reference Number and first name.'; return; }
    const b = findBooking(ref, first);
    if (!b) { err.textContent = 'We couldn’t find a booking with those details. Check the reference and the first name used when booking.'; return; }
    go('/booking/' + b.ref);
  });
}
