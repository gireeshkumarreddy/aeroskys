// My Trips — upcoming, completed and cancelled bookings on this device.
import { html, icon, mount, on, $, $$ } from '../core/dom.js';
import { money, fmtDate, today } from '../core/format.js';
import { store } from '../core/store.js';
import { allBookings, startDate } from '../engines/bookings.js';
import { crumbs, emptyState } from '../ui/common.js';
import { openLogin } from '../ui/auth.js';

const TYPE_ICON = { flight: 'plane', hotel: 'bed', bus: 'bus' };

export default async function trips(el, ctx) {
  document.title = 'My Trips — AeroSkys';
  let tab = ctx.query.get('tab') || 'upcoming';
  const render = () => {
    const user = store.get('user');
    const list = allBookings().filter(b => !user || !b.userId || b.userId === user.id);
    const groups = {
      upcoming: list.filter(b => b.status !== 'cancelled' && (startDate(b) || today()) >= today()),
      completed: list.filter(b => b.status !== 'cancelled' && (startDate(b) || today()) < today()),
      cancelled: list.filter(b => b.status === 'cancelled')
    };
    const cur = groups[tab] || [];
    mount(el, html`<section class="band page-hero"><div class="wrap">${crumbs([{ label: 'Home', href: '#/' }, { label: 'My Trips' }])}
        <h1 class="display">My <em>trips.</em></h1><p>${user ? `Bookings for ${user.name}.` : 'Bookings made on this device.'} Open a trip to download tickets or manage it.</p></div></section>
      <section class="section-sm bg-wash"><div class="wrap">
        ${!user ? html`<div class="note" style="margin-bottom:16px">${icon('user')}<span>Log in to keep your trips together across bookings. <button type="button" class="link" data-login>Log in / Sign up</button></span></div>` : ''}
        <div class="pills" role="tablist" style="margin-bottom:16px">${[['upcoming', 'Upcoming'], ['completed', 'Completed'], ['cancelled', 'Cancelled']].map(([k, l]) => html`<button type="button" class="pill" role="tab" data-tab="${k}" aria-selected="${tab === k}">${l} (${groups[k].length})</button>`)}</div>
        ${cur.length ? html`<div class="trip-list">${cur.map(b => html`<a class="trip-card" href="#/booking/${b.ref}"><span class="co-type">${icon(TYPE_ICON[b.type])}</span>
            <span><b>${b.title}</b><small>${b.subtitle}</small><small>Ref ${b.ref}</small></span>
            <span class="trip-r"><span class="badge ${b.status === 'cancelled' ? 'badge-red' : b.status === 'processing' ? 'badge-amber' : 'badge-green'}">${b.status === 'processing' ? 'Confirming' : b.status[0].toUpperCase() + b.status.slice(1)}</span><small style="margin-top:6px">${fmtDate(startDate(b), 'ddd, d MMM yyyy')}</small><b class="tnum">${money(b.pricing.total)}</b></span></a>`)}</div>`
          : emptyState({ iconName: 'ticket', title: tab === 'upcoming' ? 'No upcoming trips' : tab === 'completed' ? 'No completed trips yet' : 'No cancelled bookings', text: 'Search flights, hotels, holidays and buses to plan your next journey.', action: html`<div class="row gap-8" style="justify-content:center;flex-wrap:wrap"><a class="btn btn-primary" href="#/">Book a flight</a><a class="btn btn-light" href="#/find-booking">Find a booking</a></div>` })}
      </div></section>`);
  };
  render();
  const u = [on(el, 'click', '[data-tab]', (e, b) => { tab = b.dataset.tab; render(); }), on(el, 'click', '[data-login]', () => openLogin().then(render))];
  const unsub = store.subscribe((s, patch) => { if ('user' in patch || 'currency' in patch) render(); });
  return () => { u.forEach(f => f()); unsub(); };
}
