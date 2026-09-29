// Bus landing (#/bus): hero search, bus offers, featured and popular routes with live
// "from" fares for tomorrow, top bus partners, why book with us and FAQ.
import { html, raw, icon, mount, on, $, $$, img, copyText } from '../core/dom.js';
import { money, today, addDays, fmtDate } from '../core/format.js';
import { href } from '../core/router.js';
import { store } from '../core/store.js';
import { hero, bindHero } from '../ui/hero.js';
import { sectionHead } from '../ui/common.js';
import { offerCard, openOffer } from '../ui/cards.js';
import { toast } from '../ui/toast.js';
import { OFFERS } from '../data/content.js';
import { PROMOS } from '../data/promos.js';
import { FEATURED_ROUTES, POPULAR_BUS_ROUTES, TOP_OPERATORS, OPERATOR, BUS_WHY, BUS_FAQ } from '../data/bus.js';
import { routeInfo, searchBuses, lowestFare, hrsLabel } from '../engines/buses.js';
import { opMark, rateBadge, repaintMoney } from './bus-results.js';

export default async function busHome(el) {
  document.title = 'Bus Tickets — AC, Sleeper & Seater Buses — AeroSkys';
  const tm = addDays(today(), 1);
  const route = (from, to) => {
    const info = routeInfo(from, to);
    const buses = info.ok ? searchBuses({ from, to, date: tm }) : [];
    return { from, to, info, n: buses.length, fare: info.ok ? lowestFare({ from, to, date: tm }) : null, buses };
  };
  const featured = FEATURED_ROUTES.map(r => ({ ...r, ...route(r.from, r.to) }));
  const popular = POPULAR_BUS_ROUTES.map(([a, b]) => route(a, b));
  const busOffers = OFFERS.filter(o => o.tabs.includes('bus'));
  const busPromo = PROMOS.find(p => p.services.includes('bus'));
  const recent = (store.get('recent')?.bus || []).filter(r => r.from && r.to).slice(0, 4);

  // Each top operator links to a route where it actually runs tomorrow, with its filter applied.
  const candidates = [...featured, ...popular];
  const operators = TOP_OPERATORS.map(id => OPERATOR[id]).filter(Boolean).map(op => {
    let hit = candidates.find(r => r.buses.some(b => b.operatorId === op.id));
    if (!hit && op.hubs.length >= 2) {
      for (let i = 0; i < op.hubs.length && !hit; i++) for (let j = 0; j < op.hubs.length && !hit; j++) {
        if (i === j) continue;
        const r = route(op.hubs[i], op.hubs[j]);
        if (r.buses.some(b => b.operatorId === op.id)) hit = r;
      }
    }
    const count = hit ? hit.buses.filter(b => b.operatorId === op.id).length : 0;
    return { op, link: hit ? href('/bus/search', { from: hit.from, to: hit.to, date: tm, op: op.id }) : '#/bus', via: hit ? `${hit.from} → ${hit.to}` : '', count };
  });

  const when = info => info.overnight ? 'Overnight' : info.duration > 240 ? 'Day & night' : 'All day';
  const price = p => p == null ? html`<b>—</b>` : html`<b class="tnum" data-inr="${p}">${money(p)}</b>`;

  mount(el, html`
    ${hero('bus')}
    <div class="wrap-wide">
      <ul class="bs-trust" aria-label="Why travellers book buses with AeroSkys">
        <li><span class="ic">${icon('map')}</span><span><b>3.6+ lakh routes</b><small>Across India</small></span></li>
        <li><span class="ic">${icon('seat')}</span><span><b>Live seat maps</b><small>Lower &amp; upper decks</small></span></li>
        <li><span class="ic">${icon('user-check')}</span><span><b>Ladies seats</b><small>Clearly marked</small></span></li>
        <li><span class="ic">${icon('headset')}</span><span><b>24/7 support</b><small>Before &amp; during your trip</small></span></li>
      </ul>
      ${recent.length ? html`<div class="bs-recent"><span class="eyebrow">Recent searches</span><div class="chip-scroll">${recent.map(r => {
        const d = r.state?.date && r.state.date >= today() ? r.state.date : tm;
        return html`<a class="route-chip" href="${href('/bus/search', { from: r.from, to: r.to, date: d })}">${icon('clock')} ${r.from} ${icon('arrow-right')} ${r.to} <small>${fmtDate(d, 'd MMM')}</small></a>`;
      })}</div></div>` : ''}
    </div>

    <section class="section wrap" aria-labelledby="bs-offers-t">
      ${sectionHead({ eyebrow: 'Bus offers', title: '<span id="bs-offers-t">Save on <em>bus tickets.</em></span>', aside: 'Instant discounts on bus tickets. Apply the code when you book.', action: html`<a class="underline-link" href="#/offers">All offers ${icon('arrow-up-right')}</a>` })}
      <div class="bs-offers">
        ${busPromo ? html`<div class="coupon-card bs-coupon-card reveal">
          <span class="badge">${icon('ticket')} Coupon</span>
          <div class="plane-art" aria-hidden="true">${icon('bus')}</div>
          <div><h3>Up to ${busPromo.pct}% off bus tickets</h3><p>${busPromo.label}. Minimum booking <span data-inr="${busPromo.min}">${money(busPromo.min)}</span> · save up to <span data-inr="${busPromo.max}">${money(busPromo.max)}</span>.</p></div>
          <div class="spread" style="flex-wrap:wrap"><span class="copy-code">CODE: ${busPromo.code}<button type="button" data-bs-copy="${busPromo.code}">${icon('copy')} Copy</button></span><button type="button" class="text-btn" style="color:#9fd3f3" data-bs-jump="search">Book a bus ${icon('arrow-right')}</button></div>
        </div>` : ''}
        ${busOffers.map((o, i) => html`<div class="bs-offer reveal" style="--d:${.06 + i * .06}s">${offerCard(o)}</div>`)}
        <div class="bs-offer-note reveal" style="--d:.14s">
          <span class="ic">${icon('shield')}</span>
          <h3>Travel safe, travel easy</h3>
          <p>Every bus shows its rating, amenities, live boarding points and cancellation policy before you pay — no surprises at the stop.</p>
          <button type="button" class="text-btn" data-bs-jump="faq">Read the FAQs ${icon('arrow-right')}</button>
        </div>
      </div>
    </section>

    <section class="section-sm bg-wash" aria-labelledby="bs-routes-t">
      <div class="wrap">
        ${sectionHead({ eyebrow: 'Popular routes', title: '<span id="bs-routes-t">Popular bus <em>routes.</em></span>', aside: `Lowest fares for tomorrow, ${fmtDate(tm, 'ddd, d MMM')}. Prices change with demand.` })}
        <div class="bs-feat-grid reveal">${featured.map(r => html`<a class="bs-feat" href="${href('/bus/search', { from: r.from, to: r.to, date: tm })}" aria-label="${r.from} to ${r.to} buses, ${r.n} buses tomorrow${r.fare ? `, from ${money(r.fare)}` : ''}">
          <span class="bs-feat-img">${img(`assets/img/${r.img}.webp`, { alt: '' })}</span>
          <span class="bs-feat-body">
            <span class="bs-feat-top"><span>${when(r.info)} · ${hrsLabel(r.info.duration)}</span><span>${r.n} buses</span></span>
            <span class="bs-feat-route">${r.from}<i aria-hidden="true">${icon('arrow-right')}</i>${r.to}</span>
            <span class="bs-feat-note">${r.note}</span>
            <span class="bs-feat-foot"><span>from ${price(r.fare)}</span><span class="bs-feat-go" aria-hidden="true">${icon('arrow-up-right')}</span></span>
          </span>
        </a>`)}</div>
        <div class="bs-routes reveal" style="--d:.08s">${popular.map(r => html`<a class="bs-route" href="${href('/bus/search', { from: r.from, to: r.to, date: tm })}" aria-label="${r.from} to ${r.to}, ${r.n} buses${r.fare ? `, from ${money(r.fare)}` : ''}">
          <span class="bs-route-top"><span>${when(r.info)}</span><span>${hrsLabel(r.info.duration)}</span></span>
          <span class="bs-route-line"><b>${r.from}</b><span class="bs-road" aria-hidden="true"><i></i>${icon('bus')}<i></i></span><b>${r.to}</b></span>
          <span class="bs-route-foot"><span>${r.n} buses · ${r.info.km.toLocaleString('en-IN')} km</span><span>from ${price(r.fare)}</span></span>
        </a>`)}</div>
      </div>
    </section>

    <section class="section wrap" aria-labelledby="bs-ops-t">
      ${sectionHead({ eyebrow: 'Top bus operators', title: '<span id="bs-ops-t">Top-rated <em>bus operators.</em></span>', aside: 'Well-rated operators, from electric coaches to AC sleepers.' })}
      <div class="bs-ops reveal">${operators.map(({ op, link, via, count }) => html`<a class="bs-op-tile" href="${link}">
        ${opMark(op, 'lg')}
        <span class="bs-op-name"><b>${op.name}</b><small>${op.blurb}</small></span>
        <span class="bs-op-foot">${rateBadge(op.rating)}<span class="bs-op-via">${via ? `${via}${count ? ` · ${count} ${count === 1 ? 'bus' : 'buses'}` : ''}` : 'View buses'}</span>${icon('arrow-right')}</span>
      </a>`)}</div>
    </section>

    <section class="section-sm wrap" aria-labelledby="bs-why-t" style="padding-top:0">
      ${sectionHead({ eyebrow: 'Why book with us', title: '<span id="bs-why-t">Why book buses <em>with AeroSkys?</em></span>', aside: 'Everything you need for a comfortable bus journey.' })}
      <div class="values">${BUS_WHY.map((w, i) => html`<article class="value reveal" style="--d:${i * .06}s"><span class="num">0${i + 1}</span><span class="ic">${icon(w.icon)}</span><h3>${w.title}</h3><p>${w.text}</p></article>`)}</div>
    </section>

    <section class="section wrap" aria-labelledby="bs-faq-t">
      <div class="faq">
        <div class="reveal"><span class="eyebrow">Bus booking FAQs</span><h2 class="h2" id="bs-faq-t" style="margin-top:12px">Questions about<br><em>bus travel?</em></h2>
          <figure class="faq-photo">${img('assets/img/nainital.webp', { alt: 'A hill road winding above a lake in Nainital', fallback: 'himalayas' })}</figure></div>
        <div>${BUS_FAQ.map(([qq, a], i) => html`<details class="acc reveal"${i === 0 ? raw(' open') : ''}><summary>${qq}${icon('chevron-down')}</summary><div class="acc-body">${a}</div></details>`)}</div>
      </div>
    </section>
  `);

  const { cleanup: heroCleanup } = bindHero(el);

  // offerCard() marks cards with data-offer; rename it so no other view's delegated handler reacts too.
  $$('.bs-offers [data-offer]', el).forEach(b => { b.dataset.bsOffer = b.dataset.offer; b.removeAttribute('data-offer'); });

  const offs = [
    on(el, 'click', '[data-bs-offer]', (e, b) => { const o = OFFERS.find(x => x.id === b.dataset.bsOffer); if (o) openOffer(o); }),
    on(el, 'click', '[data-bs-copy]', async (e, b) => {
      const ok = await copyText(b.dataset.bsCopy);
      toast(ok ? `Coupon ${b.dataset.bsCopy} copied — apply it on the review page.` : 'Copy failed — please note the code.', { type: ok ? 'success' : 'error' });
    }),
    on(el, 'click', '[data-bs-jump]', (e, b) => {
      if (b.dataset.bsJump === 'faq') { $('#bs-faq-t', el)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      const card = $('[data-search-card]', el);
      card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => $('[data-field="bfrom"]', card)?.focus({ preventScroll: true }), 400);
    })
  ];

  // Prices follow the header's currency switch.
  let cur = store.get('currency');
  const unsub = store.subscribe(s => { if (s.currency !== cur) { cur = s.currency; repaintMoney(el); } });

  return () => { heroCleanup(); offs.forEach(f => f()); unsub(); };
}
