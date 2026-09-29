// Cards shared by home, offers, holidays and blog views.
import { html, icon, img, copyText } from '../core/dom.js';
import { money } from '../core/format.js';
import { openModal } from './overlay.js';
import { toast } from './toast.js';
import { href } from '../core/router.js';

const KIND = { flights: ['Flights', 'plane'], hotels: ['Hotels', 'bed'], holidays: ['Holidays', 'palm'], bus: ['Bus', 'bus'], visa: ['Visa', 'passport'], cab: ['Cabs', 'car'], general: ['Deal', 'tag'] };
export const kindLabel = k => (KIND[k] || KIND.general)[0];
export const kindIcon = k => (KIND[k] || KIND.general)[1];

export function offerCard(o) {
  return html`<button type="button" class="offer-card" data-offer="${o.id}" aria-label="${o.title}. View more details">
    <span class="oc-img">${img(o.image, { alt: '' })}</span>
    <span class="oc-body">
      <span class="oc-kind">${kindLabel(o.kind)}</span>
      <span class="oc-title">${o.title}</span>
      ${o.description && o.description !== o.title ? html`<span class="oc-desc">${o.description}</span>` : ''}
      <span class="oc-foot">${o.coupon ? html`<span class="badge badge-blue">${icon('tag')} ${o.coupon}</span>` : html`<span></span>`}<span class="text-btn">View More Details ${icon('arrow-right')}</span></span>
    </span>
  </button>`;
}

const serviceHref = k => ({ flights: '#/', hotels: '#/hotels', holidays: '#/holidays', bus: '#/bus', visa: '#/visa', cab: '#/cab' })[k] || '#/';

export function openOffer(o) {
  const m = openModal({
    title: kindLabel(o.kind) + ' offer',
    body: html`<div class="offer-modal-img">${img(o.image, { alt: o.title, lazy: false })}</div>
      <h3 class="h3" style="margin-bottom:8px">${o.title}</h3>
      ${o.description ? html`<p class="lead" style="font-size:.95rem;white-space:pre-line">${o.description}</p>` : ''}
      ${o.coupon ? html`<div style="margin-top:18px" class="spread"><span class="small muted">Use code at checkout</span><span class="copy-code">${o.coupon}<button type="button" data-copy>${icon('copy')} Copy</button></span></div>` : ''}
      <div class="note" style="margin-top:18px">${icon('info')}<span>Offer terms, validity and eligible bookings are set by AeroSkys and its partners. The offer is not applicable on Book/Reserve Now Pay later bookings.</span></div>`,
    foot: html`<button class="btn btn-light" data-close>Close</button><a class="btn btn-primary" href="${serviceHref(o.kind)}" data-close>Book now ${icon('arrow-right')}</a>`
  });
  m.el.querySelector('[data-copy]')?.addEventListener('click', async e => {
    const ok = await copyText(o.coupon);
    toast(ok ? `Coupon code ${o.coupon} copied` : 'Could not copy — please note the code manually.', { type: ok ? 'success' : 'error' });
    e.currentTarget.innerHTML = String(html`${icon('check')} Copied`);
  });
}

export function pkgCard(p, { showRegion = false } = {}) {
  const feats = { Hotel: 'bed', Flight: 'plane', Sightseeing: 'binoculars', Transfer: 'car', Activity: 'flag', Cruise: 'ship' };
  return html`<a class="pkg-card" href="${href('/holidays/package/' + p.id)}">
    <span class="pkg-img">${img(p.banner, { alt: p.name, fallback: p.fallback })}<span class="badge">${p.tag}</span><span class="pkg-days">${p.days}D / ${p.nights}N</span></span>
    <div class="pkg-body">
      <h3>${p.name}</h3>
      <span class="pkg-place">${p.place}${showRegion ? ` · ${p.region === 'domestic' ? 'India' : 'International'}` : ''}</span>
      <span class="pkg-feats" role="img" aria-label="Includes ${p.features.join(', ')}">${p.features.map(f => feats[f] ? icon(feats[f]) : '')}</span>
      <span class="pkg-foot"><span><small>Starting from</small><b>${money(p.price)}</b><small>per person</small></span><span class="icon-btn" aria-hidden="true" style="background:var(--wash)">${icon('arrow-up-right')}</span></span>
    </div>
  </a>`;
}

export function postCard(p, { lead = false } = {}) {
  const firstP = (p.blocks || []).find(b => b.t === 'p' && b.text.length > 60)?.text || '';
  return html`<a class="post-card ${lead ? 'is-lead' : ''}" href="#/blog/${p.slug}">
    <span class="post-img">${img(p.image, { alt: '', fallback: 'kerala' })}</span>
    <div class="post-body"><span class="eyebrow">Travel blog</span><h3>${p.title}</h3>${firstP ? html`<p>${firstP}</p>` : ''}<span class="text-btn">Read article ${icon('arrow-right')}</span></div>
  </a>`;
}
