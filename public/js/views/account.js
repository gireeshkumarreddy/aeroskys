// My Account — profile, saved travellers, enquiries and preferences.
import { html, icon, mount, on, $ } from '../core/dom.js';
import { fmtDate, iso, ago } from '../core/format.js';
import { store } from '../core/store.js';
import { setQuery } from '../core/router.js';
import { allBookings, allEnquiries } from '../engines/bookings.js';
import { CURRENCIES } from '../data/content.js';
import { crumbs, emptyState, field, validateForm, V, initials } from '../ui/common.js';
import { openLogin, logout } from '../ui/auth.js';
import { confirmDialog } from '../ui/overlay.js';
import { toast } from '../ui/toast.js';

const KIND = { holiday: ['Holiday package', 'palm'], visa: ['Visa', 'passport'], group: ['Group booking', 'users'], cab: ['Cab', 'car'], train: ['Train', 'train'], contact: ['Consultant appointment', 'headset'] };

export default async function account(el, ctx) {
  document.title = 'My Account — AeroSkys';
  let tab = ctx.query.get('tab') || 'profile';
  const render = () => {
    const user = store.get('user');
    if (!user) {
      mount(el, html`<section class="band page-hero"><div class="wrap">${crumbs([{ label: 'Home', href: '#/' }, { label: 'Account' }])}<h1 class="display">Your <em>account.</em></h1><p>Log in with your email or mobile number — we’ll send a one-time password.</p></div></section>
        <section class="section-sm bg-wash"><div class="wrap-narrow">${emptyState({ iconName: 'user', title: 'Log in / Sign up', text: 'See your trips, saved travellers and enquiries in one place.', action: html`<button type="button" class="btn btn-primary btn-lg" data-login>${icon('login')} Log in / Sign up</button>` })}</div></section>`);
      return;
    }
    const trips = allBookings().filter(b => !b.userId || b.userId === user.id);
    const enqs = allEnquiries();
    const saved = store.get('travellers') || [];
    const panes = {
      profile: html`<form class="co-card stack gap-16" data-profile novalidate>
          <div class="acct-hero"><span class="avatar">${initials(user.name)}</span><div><h2 class="h3">${user.name}</h2><p class="small muted">Member since ${fmtDate(iso(new Date(user.since || Date.now())), 'MMMM yyyy')} · ${trips.length} booking${trips.length === 1 ? '' : 's'}</p></div></div>
          <div class="form-grid">
            ${field({ name: 'name', label: 'Full name', value: user.name, required: true, autocomplete: 'name' })}
            ${field({ name: 'email', label: 'Email', type: 'email', value: user.email || '', autocomplete: 'email' })}
            ${field({ name: 'phone', label: 'Mobile number', value: user.phone || '', autocomplete: 'tel-national', attrs: 'inputmode="numeric"' })}
            ${field({ name: 'currency', label: 'Preferred currency', options: CURRENCIES.map(c => [c.code, `${c.code} — ${c.label}`]), value: store.get('currency') })}
          </div>
          <div class="row gap-8"><button class="btn btn-primary" type="submit">Save changes</button><button class="btn btn-light" type="button" data-logout>${icon('logout')} Log out</button></div>
        </form>`,
      travellers: html`<div class="co-card">
          <div class="spread"><h2 class="h4">Saved travellers</h2><span class="small muted">Used to fill traveller details faster</span></div>
          ${saved.length ? html`<div class="trip-list" style="margin-top:12px">${saved.map((t, i) => html`<div class="trip-card"><span class="co-type">${icon('user')}</span><span><b>${t.title} ${t.first} ${t.last}</b><small>${t.dob ? 'Born ' + fmtDate(t.dob, 'd MMM yyyy') : 'Date of birth not saved'}</small></span><button type="button" class="icon-btn" data-del-trav="${i}" aria-label="Remove ${t.first}">${icon('trash')}</button></div>`)}</div>` : html`<p class="small muted" style="margin-top:8px">No saved travellers yet.</p>`}
          <form class="form-grid" data-add-trav novalidate style="margin-top:18px">
            ${field({ name: 'title', label: 'Title', options: ['Mr', 'Mrs', 'Ms'] })}
            ${field({ name: 'dob', label: 'Date of birth', type: 'date' })}
            ${field({ name: 'first', label: 'First name', required: true })}
            ${field({ name: 'last', label: 'Last name', required: true })}
            <div class="span-2"><button class="btn btn-dark" type="submit">${icon('plus')} Add traveller</button></div>
          </form>
        </div>`,
      enquiries: html`<div class="co-card"><h2 class="h4">My enquiries</h2>
          ${enqs.length ? html`<div style="margin-top:8px">${enqs.map(e => { const [label, ic] = KIND[e.kind] || ['Enquiry', 'chat']; const d = e.data || {}; return html`<div class="enq-row"><span class="co-type">${icon(ic)}</span><span><b>${label}${d.destination ? ' · ' + d.destination : d.to ? ' · ' + (d.from ? d.from + ' → ' : '') + d.to : ''}</b><small class="muted">Ref ${e.ref} · ${ago(e.createdAt)}</small></span><span class="badge badge-blue">${e.status}</span></div>`; })}</div>`
            : html`<p class="small muted" style="margin-top:8px">No enquiries yet. Holiday, visa, group, cab and train requests appear here.</p>`}
        </div>`
    };
    mount(el, html`<section class="band page-hero"><div class="wrap">${crumbs([{ label: 'Home', href: '#/' }, { label: 'My Account' }])}<h1 class="display">Hello, <em>${user.name.split(' ')[0]}.</em></h1><p>Manage your profile, travellers and enquiries.</p></div></section>
      <section class="section-sm bg-wash"><div class="wrap acct-grid">
        <nav class="acct-nav" aria-label="Account sections">
          <a href="#/account?tab=profile" data-tab="profile" ${tab === 'profile' ? 'aria-current="page"' : ''}>${icon('user')} Profile</a>
          <a href="#/trips">${icon('ticket')} My Trips (${trips.length})</a>
          <a href="#/account?tab=travellers" data-tab="travellers" ${tab === 'travellers' ? 'aria-current="page"' : ''}>${icon('users')} Saved travellers</a>
          <a href="#/account?tab=enquiries" data-tab="enquiries" ${tab === 'enquiries' ? 'aria-current="page"' : ''}>${icon('chat')} Enquiries (${enqs.length})</a>
          <a href="#/find-booking">${icon('search')} Find Booking</a>
        </nav>
        <div>${panes[tab] || panes.profile}</div>
      </div></section>`);
  };
  render();
  const u = [];
  u.push(on(el, 'click', '[data-login]', () => openLogin()));
  u.push(on(el, 'click', '[data-tab]', (e, a) => { e.preventDefault(); tab = a.dataset.tab; setQuery({ tab }); render(); }));
  u.push(on(el, 'click', '[data-logout]', async () => { if (await confirmDialog({ title: 'Log out?', message: 'You can log back in anytime with an OTP.', confirm: 'Log out' })) logout(); }));
  u.push(on(el, 'submit', '[data-profile]', (e, f) => {
    e.preventDefault();
    const { ok, values } = validateForm(f, { name: V.name, email: v => v && V.email(v), phone: v => v && V.mobile(v) });
    if (!ok) return;
    store.set({ user: { ...store.get('user'), name: values.name, email: values.email.toLowerCase(), phone: values.phone.replace(/\D/g, '').slice(-10) }, currency: values.currency });
    toast('Profile saved.');
  }));
  u.push(on(el, 'submit', '[data-add-trav]', (e, f) => {
    e.preventDefault();
    const { ok, values } = validateForm(f, { first: V.name, last: V.name });
    if (!ok) return;
    store.update(s => { s.travellers.push({ title: values.title, first: values.first, last: values.last, dob: values.dob || null }); });
    toast('Traveller saved.');
  }));
  u.push(on(el, 'click', '[data-del-trav]', (e, b) => { store.update(s => { s.travellers.splice(Number(b.dataset.delTrav), 1); }); }));
  const unsub = store.subscribe(() => render());
  return () => { u.forEach(f => f()); unsub(); };
}
