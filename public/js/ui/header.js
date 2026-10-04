// Floating capsule masthead, dropdown menus, mobile drawer and tab bar.
import { html, icon, $, $$, on } from '../core/dom.js';
import { store } from '../core/store.js';
import { CURRENCIES, COMPANY } from '../data/content.js';
import { SERVICES, initials } from './common.js';
import { openLogin, logout } from './auth.js';
import { toast } from './toast.js';

let activeService = 'flights';
let activePath = '/';

const serviceOfPath = path => {
  if (path === '/' || path.startsWith('/flights')) return 'flights';
  if (path.startsWith('/hotels')) return 'hotels';
  if (path.startsWith('/holidays')) return 'holidays';
  if (path.startsWith('/bus')) return 'bus';
  if (path.startsWith('/visa')) return 'visa';
  if (path.startsWith('/group')) return 'group';
  if (path.startsWith('/cab')) return 'cab';
  if (path.startsWith('/train')) return 'train';
  if (path.startsWith('/web-checkin')) return 'checkin';
  return '';
};

function currencyLabel() {
  const c = CURRENCIES.find(x => x.code === store.get('currency')) || CURRENCIES[0];
  return c;
}

function headerHTML() {
  const user = store.get('user');
  const cur = currencyLabel();
  const main = SERVICES.filter(s => !s.more);
  const more = SERVICES.filter(s => s.more);
  return html`<div class="masthead" data-masthead>
    <a class="brand" href="#/" aria-label="AeroSkys home"><span class="brand-crop"><img src="assets/brand/aeroskys-logo.png" alt="AeroSkys" width="959" height="190"></span></a>
    <nav class="nav-primary" aria-label="Services">
      ${main.map(s => html`<a class="nav-link ${activeService === s.id ? 'is-active' : ''}" href="${s.href}" ${activeService === s.id ? 'aria-current="page"' : ''}>${icon(s.icon)}${s.label}</a>`)}
      <div class="dropdown" data-dd="more">
        <button type="button" class="nav-link ${more.some(s => s.id === activeService) ? 'is-active' : ''}" aria-expanded="false" aria-haspopup="true" data-dd-btn>More ${icon('chevron-down')}</button>
        <div class="dropdown-panel align-left more-panel" role="menu">
          ${more.map(s => html`<a class="menu-item" role="menuitem" href="${s.href}" ${s.external ? 'target="_blank" rel="noopener"' : ''}>${icon(s.icon)}<span class="grow"><b>${s.label}</b>${s.external ? html`<small>Opens flightradar24.com</small>` : ''}</span>${s.external ? icon('external') : ''}</a>`)}
          <div class="menu-sep"></div>
          <a class="menu-item" role="menuitem" href="#/offers">${icon('tag')}<span class="grow"><b>Offers &amp; Deals</b></span></a>
          <a class="menu-item" role="menuitem" href="#/blog">${icon('file')}<span class="grow"><b>Travel Blog</b></span></a>
        </div>
      </div>
      <a class="nav-link nav-careers" href="careers.html">${icon('users')}Careers<span class="nav-badge">Hiring</span></a>
    </nav>
    <div class="nav-actions">
      <a class="nav-util hide-m" href="#/find-booking" aria-label="Find Booking">${icon('search')}<span class="util-label">Find Booking</span></a>
      <a class="nav-util hide-m" href="tel:${COMPANY.phoneIntl}" aria-label="Call ${COMPANY.phone}">${icon('phone')}<span class="util-label">${COMPANY.phone}</span></a>
      <span class="nav-sep" aria-hidden="true"></span>
      <div class="dropdown" data-dd="currency">
        <button type="button" class="nav-util currency-btn" data-dd-btn aria-expanded="false" aria-haspopup="true" aria-label="Currency: ${cur.code}"><span aria-hidden="true">${cur.symbol === '$' ? 'C$' : cur.symbol}</span><span class="cur-label">${cur.code}</span>${icon('chevron-down')}</button>
        <div class="dropdown-panel" role="menu">
          <div class="menu-head">All currencies</div>
          ${CURRENCIES.map(c => html`<button type="button" class="menu-item ${c.code === cur.code ? 'is-active' : ''}" role="menuitemradio" aria-checked="${c.code === cur.code}" data-currency="${c.code}"><b style="width:26px">${c.code === 'CAD' ? 'C$' : c.symbol}</b><span class="grow"><b>${c.code}</b><small>${c.label}</small></span></button>`)}
        </div>
      </div>
      ${user ? html`<div class="dropdown" data-dd="account">
          <button type="button" class="account-btn is-user" data-dd-btn aria-expanded="false" aria-haspopup="true"><span class="avatar">${initials(user.name)}</span><span class="acc-label">${user.name.split(' ')[0]}</span></button>
          <div class="dropdown-panel" role="menu">
            <div class="menu-head">Signed in as ${user.email || '+91 ' + user.phone}</div>
            <a class="menu-item" role="menuitem" href="#/trips">${icon('ticket')}<span class="grow"><b>My Trips</b></span></a>
            <a class="menu-item" role="menuitem" href="#/account">${icon('user')}<span class="grow"><b>My Profile</b></span></a>
            <a class="menu-item" role="menuitem" href="#/account?tab=enquiries">${icon('chat')}<span class="grow"><b>My Enquiries</b></span></a>
            <div class="menu-sep"></div>
            <button type="button" class="menu-item" role="menuitem" data-logout>${icon('logout')}<span class="grow"><b>Log out</b></span></button>
          </div>
        </div>`
      : html`<button type="button" class="account-btn" data-login>${icon('user')}<span class="acc-label">Log in / Sign up</span></button>`}
      <button type="button" class="icon-btn menu-btn" data-drawer-open aria-label="Open menu" aria-expanded="false">${icon('menu')}</button>
    </div>
  </div>`;
}

function drawerHTML() {
  const user = store.get('user');
  return html`<div class="drawer" data-drawer inert>
    <div class="drawer-scrim" data-drawer-close></div>
    <aside class="drawer-panel" role="dialog" aria-modal="true" aria-label="Menu">
      <div class="drawer-head"><span class="brand-crop"><img src="assets/brand/aeroskys-logo.png" alt="AeroSkys"></span><button type="button" class="icon-btn" data-drawer-close aria-label="Close menu">${icon('x')}</button></div>
      <div class="drawer-body">
        ${user ? html`<a class="drawer-user" href="#/account" data-drawer-close><span class="avatar">${initials(user.name)}</span><span><b>${user.name}</b><small>${user.email || '+91 ' + user.phone}</small></span></a>`
          : html`<button type="button" class="btn btn-dark btn-block" data-login style="margin-bottom:18px">${icon('user')} Log in / Sign up</button>`}
        <span class="eyebrow" style="margin-bottom:10px">Book &amp; enquire</span>
        <div class="service-grid">${SERVICES.map(s => html`<a class="service-tile ${activeService === s.id ? 'is-active' : ''}" href="${s.href}" ${s.external ? 'target="_blank" rel="noopener"' : ''} data-drawer-close>${icon(s.icon)}${s.short || s.label}</a>`)}</div>
        <nav class="drawer-links" aria-label="More links">
          <a class="drawer-careers" href="careers.html" data-drawer-close>${icon('users')} <span>Careers <small>We’re hiring — 3 open roles</small></span> ${icon('chevron-right')}</a>
          <a href="#/trips" data-drawer-close>${icon('ticket')} My Trips ${icon('chevron-right')}</a>
          <a href="#/find-booking" data-drawer-close>${icon('search')} Find Booking ${icon('chevron-right')}</a>
          <a href="#/offers" data-drawer-close>${icon('tag')} Offers &amp; Deals ${icon('chevron-right')}</a>
          <a href="#/blog" data-drawer-close>${icon('file')} Travel Blog ${icon('chevron-right')}</a>
          <a href="#/support" data-drawer-close>${icon('headset')} Contact Us ${icon('chevron-right')}</a>
          <a href="#/about" data-drawer-close>${icon('info')} About Us ${icon('chevron-right')}</a>
          ${user ? html`<button type="button" data-logout>${icon('logout')} Log out</button>` : ''}
        </nav>
        <div class="drawer-support">
          <span class="eyebrow">24/7 Support</span>
          <a class="btn btn-light btn-block" href="tel:${COMPANY.phoneIntl}">${icon('phone')} Call ${COMPANY.phone}</a>
          <a class="btn btn-light btn-block" href="mailto:${COMPANY.email}">${icon('mail')} ${COMPANY.email}</a>
        </div>
      </div>
    </aside>
  </div>`;
}

function tabbarHTML() {
  const p = activePath;
  const items = [
    ['home', 'Explore', '#/', p === '/' || ['flights', 'hotels', 'holidays', 'bus'].includes(serviceOfPath(p)) && !p.includes('/search')],
    ['ticket', 'Trips', '#/trips', p.startsWith('/trips') || p.startsWith('/booking') || p.startsWith('/find-booking')],
    ['tag', 'Offers', '#/offers', p.startsWith('/offers')],
    ['headset', 'Help', '#/support', p.startsWith('/support')],
    ['user', 'Account', '#/account', p.startsWith('/account')]
  ];
  return html`${items.map(([ic, label, href, active]) => html`<a class="tab-item ${active ? 'is-active' : ''}" href="${href}" ${active ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></a>`)}`;
}

function closeDropdowns(except) {
  $$('.dropdown.is-open').forEach(d => { if (d !== except) { d.classList.remove('is-open'); d.querySelector('[data-dd-btn]')?.setAttribute('aria-expanded', 'false'); } });
}

function openDrawer(open) {
  const d = $('[data-drawer]');
  if (!d) return;
  d.classList.toggle('is-open', open);
  d.inert = !open;
  document.body.classList.toggle('no-scroll', open);
  $('[data-drawer-open]')?.setAttribute('aria-expanded', String(open));
  if (open) setTimeout(() => d.querySelector('.drawer-panel button, .drawer-panel a')?.focus(), 50);
}

export function renderHeader() {
  const host = document.getElementById('site-header');
  host.innerHTML = String(headerHTML()) + String(drawerHTML());
  document.getElementById('tabbar').innerHTML = String(tabbarHTML());
  onScroll();
}

function onScroll() {
  const m = $('[data-masthead]');
  if (m) m.classList.toggle('is-scrolled', scrollY > 8);
}

export function initHeader() {
  renderHeader();
  const host = document.getElementById('site-header');
  on(host, 'click', '[data-dd-btn]', (e, btn) => {
    e.stopPropagation();
    const dd = btn.closest('.dropdown');
    const open = !dd.classList.contains('is-open');
    closeDropdowns(dd);
    dd.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  });
  on(host, 'click', '.dropdown-panel a, .dropdown-panel button', () => closeDropdowns());
  on(host, 'click', '[data-currency]', (e, b) => {
    store.set({ currency: b.dataset.currency });
    toast(b.dataset.currency === 'INR' ? 'Showing prices in Indian Rupees.' : `Showing prices in ${b.dataset.currency}. Payments are charged in INR.`, { type: 'info' });
  });
  on(host, 'click', '[data-login]', () => { openDrawer(false); openLogin(); });
  on(host, 'click', '[data-logout]', () => { openDrawer(false); logout(); });
  on(host, 'click', '[data-drawer-open]', () => openDrawer(true));
  on(host, 'click', '[data-drawer-close]', () => openDrawer(false));
  document.addEventListener('click', e => { if (!e.target.closest('.dropdown')) closeDropdowns(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDropdowns(); if ($('[data-drawer].is-open')) openDrawer(false); }
  });
  addEventListener('scroll', onScroll, { passive: true });
  let lastUser = store.get('user'), lastCur = store.get('currency');
  store.subscribe(s => {
    if (s.user !== lastUser || s.currency !== lastCur) { lastUser = s.user; lastCur = s.currency; renderHeader(); }
  });
}

export function setActiveRoute(path) {
  activePath = path;
  activeService = serviceOfPath(path);
  openDrawer(false);
  renderHeader();
}
