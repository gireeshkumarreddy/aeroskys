// Offers (#/offers): the live coupon card, every live offer with service tabs (?tab=visa etc.)
// and the promo codes accepted at checkout.
import { html, raw, icon, mount, on, $, $$, copyText } from '../core/dom.js';
import { money } from '../core/format.js';
import { setQuery } from '../core/router.js';
import { store } from '../core/store.js';
import { offerCard, openOffer } from '../ui/cards.js';
import { toast } from '../ui/toast.js';
import { pageBand } from '../ui/enquiry.js';
import { OFFERS, COUPON_CARD } from '../data/content.js';
import { PROMOS } from '../data/promos.js';

const TABS = [['all', 'All', 'grid'], ['flights', 'Flights', 'plane'], ['hotels', 'Hotels', 'bed'], ['bus', 'Bus', 'bus'], ['holidays', 'Holidays', 'palm'], ['visa', 'Visa', 'passport'], ['cab', 'Cabs', 'car']];
const ALIAS = { flight: 'flights', hotel: 'hotels', holiday: 'holidays', cabs: 'cab', buses: 'bus' };
const SERVICE = { flight: 'Flights', hotel: 'Hotels', bus: 'Bus', holiday: 'Holiday packages' };
const inTab = (o, t) => t === 'all' || o.kind === t || (o.tabs || []).includes(t);

const promosHTML = () => html`${PROMOS.map(p => html`<li class="pg-promo">
  <div class="pg-promo-main">
    <span class="pg-promo-code">${p.code}</span>
    <b>${p.label}</b>
    <small>Valid on ${p.services.map(s => SERVICE[s] || s).join(', ')}${p.min ? ` · Minimum booking ${money(p.min)}` : ''}${p.max ? ` · Save up to ${money(p.max)}` : ''}</small>
  </div>
  <button type="button" class="btn btn-light btn-sm" data-pg-copy-code="${p.code}" aria-label="Copy code ${p.code}">${icon('copy')} Copy</button>
</li>`)}`;

export default async function offers(el, ctx) {
  document.title = 'Offers & Deals — Flights, Hotels, Holidays, Bus, Visa & Cabs | AeroSkys';
  const want = ALIAS[ctx.query.get('tab')] || ctx.query.get('tab');
  let tab = TABS.some(t => t[0] === want) ? want : 'all';

  mount(el, html`<div class="pg-view pg-offers">
    ${pageBand({ eyebrow: 'Offers & discounts', title: 'All offers <em>in one place.</em>', text: 'Current discounts and coupon codes on flights, hotels, holidays, buses and more. Copy a code and apply it when you book.', trail: [{ label: 'Offers' }], art: 'tag', contact: false })}
    <section class="wrap pg-lift pg-offers-top" aria-label="Coupons and promo codes">
      <div class="coupon-card">
        <span class="badge">${icon('ticket')} Coupon</span>
        <div class="plane-art" aria-hidden="true">${icon('plane')}</div>
        <div><h2 class="pg-coupon-title">${COUPON_CARD.title}</h2><p>${COUPON_CARD.subtitle}</p></div>
        <div class="spread" style="flex-wrap:wrap"><span class="copy-code">CODE: ${COUPON_CARD.code}<button type="button" data-pg-copy-code="${COUPON_CARD.code}">${icon('copy')} Copy</button></span><a class="text-btn pg-coupon-link" href="#/">Book a flight ${icon('arrow-right')}</a></div>
      </div>
      <section class="card pg-promos" aria-labelledby="pg-promos-title">
        <h2 class="h4" id="pg-promos-title">Promo codes you can use</h2>
        <ul class="pg-promo-list" data-pg-promos>${promosHTML()}</ul>
        <p class="pg-promos-note">${icon('info')}<span>Apply a code on the review page before you pay. Discount rules in this prototype are indicative.</span></p>
      </section>
    </section>

    <section class="section-sm wrap" aria-labelledby="pg-all-offers">
      <div class="pg-offers-head">
        <h2 class="h3" id="pg-all-offers">All offers</h2>
        <div class="deal-tabs pg-offer-tabs" role="tablist" aria-label="Offers by service">${TABS.map(([id, label, ic]) => {
          const n = OFFERS.filter(o => inTab(o, id)).length;
          return html`<button type="button" class="deal-tab" role="tab" id="pg-tab-${id}" aria-controls="pg-offer-panel" aria-selected="${id === tab}" tabindex="${id === tab ? '0' : '-1'}" data-pg-tab="${id}"><span class="ic">${icon(ic)}</span>${label}<span class="pg-tab-n">${n}</span></button>`;
        })}</div>
      </div>
      <div class="pg-offer-grid" role="tabpanel" id="pg-offer-panel" aria-labelledby="pg-tab-${tab}" data-pg-grid></div>
    </section>
  </div>`);

  const root = el.firstElementChild;
  const grid = $('[data-pg-grid]', root);
  const render = () => {
    const list = OFFERS.filter(o => inTab(o, tab));
    grid.setAttribute('aria-labelledby', `pg-tab-${tab}`);
    grid.innerHTML = String(list.length ? html`${list.map(offerCard)}` : html`<p class="pg-offer-empty">No offers in this category right now.</p>`);
  };
  const select = (id, focus = false) => {
    tab = id;
    $$('[data-pg-tab]', root).forEach(b => { const on2 = b.dataset.pgTab === id; b.setAttribute('aria-selected', String(on2)); b.tabIndex = on2 ? 0 : -1; if (on2 && focus) b.focus(); });
    render();
    setQuery({ tab: id === 'all' ? null : id });
  };
  render();

  on(root, 'click', '[data-pg-tab]', (e, b) => select(b.dataset.pgTab));
  on(root, 'keydown', '[data-pg-tab]', (e, b) => {
    const i = TABS.findIndex(t => t[0] === b.dataset.pgTab);
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : null;
    if (to == null) return;
    e.preventDefault();
    select(TABS[(to + TABS.length) % TABS.length][0], true);
  });
  // Offer cards carry data-offer (shared markup); handle here and stop the click at this root.
  on(root, 'click', '[data-offer]', (e, b) => { e.stopPropagation(); const o = OFFERS.find(x => x.id === b.dataset.offer); if (o) openOffer(o); });
  on(root, 'click', '[data-pg-copy-code]', async (e, b) => {
    const code = b.dataset.pgCopyCode;
    const ok = await copyText(code);
    toast(ok ? `Code ${code} copied — apply it on the review page.` : 'Could not copy — please note the code.', { type: ok ? 'success' : 'error' });
    if (ok) { const prev = b.innerHTML; b.innerHTML = String(html`${icon('check')} Copied`); setTimeout(() => { if (b.isConnected) b.innerHTML = prev; }, 1800); }
  });

  let currency = store.get('currency');
  const off = store.subscribe(s => {
    if (s.currency === currency) return;
    currency = s.currency;
    $('[data-pg-promos]', root).innerHTML = String(promosHTML());
  });
  return () => off();
}
