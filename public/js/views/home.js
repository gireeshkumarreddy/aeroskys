// Home (Flights) — the live site's flight home content in the editorial design.
import { html, raw, icon, mount, on, $, $$, reveal, img } from '../core/dom.js';
import { money, today, addDays } from '../core/format.js';
import { href, go } from '../core/router.js';
import { hero, bindHero } from '../ui/hero.js';
import { SERVICES, sectionHead, airlineMark } from '../ui/common.js';
import { offerCard, openOffer, pkgCard, postCard, kindIcon } from '../ui/cards.js';
import { showcaseHTML, bindShowcase } from '../ui/showcase.js';
import { reviewsHTML, bindReviews } from '../ui/reviews.js';
import { toast } from '../ui/toast.js';
import { copyText } from '../core/dom.js';
import { OFFERS, COUPON_CARD, TICKER, WHY_CHOOSE, POPULAR_DESTINATIONS, POPULAR_AIRLINES, TOP_FARES, TOP_ROUTES, ABOUT_BLURB, AIRLINE_BANNER } from '../data/content.js';
import { AIRPORT } from '../data/airports.js';
import { airline } from '../data/airlines.js';

export const FAQ = [
  ['How do I find or manage my booking?', 'Use Find Booking with your Booking Reference Number and first name. You can view your itinerary, download or print your ticket and request a cancellation from there, or from My Trips when you are logged in.'],
  ['What is an Exclusive Fare?', 'Exclusive fares are special, instant-purchase fares. Confirmation takes a minimum of 30 to 45 minutes, and the fare is 100% non-refundable, non-changeable and non-cancellable. Names are updated on the airline website 12 to 24 hours before departure, web check-in is mandatory, and seats, meals and other add-ons can only be bought at web check-in.'],
  ['Can I cancel or change my flight?', 'Cancellation and date-change requests are accepted up to 30 hours before departure. Charges follow the airline fare rules shown under Fare Summary & Rules, plus a platform fee. GST and RAF charges apply to cancellation and reissue penalties.'],
  ['When will I receive my refund?', 'Refunds, where applicable, are processed to the original payment method within 7–14 business days. If a payment fails but money is deducted, it is credited back to the source account within 7 working days. Payment-gateway convenience fees are non-refundable.'],
  ['Are student and senior citizen fares available?', 'Yes. Choose Student for extra check-in baggage (valid student ID required at check-in) or Senior Citizen for an exclusive discount for travellers aged 60 and above (carry valid age proof). Eligibility is checked by the airline.'],
  ['How do I book for more than 9 travellers?', 'Send a Group Booking request with your route, dates, number of travellers and preferred airline. Our team will share exclusive group fares.'],
  ['Can I claim GST on my booking?', 'Yes. Add your company’s GSTIN, registered name, email, phone and address in the traveller details step. GST input credit cannot be availed on Exclusive fares.'],
  ['Is my payment secure?', 'Payments are processed by PCI-DSS compliant gateways over SSL/TLS encryption, with card tokenization and continuous fraud monitoring. We never store your full card details.']
];

const DEAL_TABS = [['all', 'All Offers', 'grid'], ['flights', 'Flight', 'plane'], ['hotels', 'Hotels', 'bed'], ['bus', 'Bus', 'bus'], ['holidays', 'Holidays', 'palm']];

function faresHTML() {
  const d = addDays(today(), 15);
  return html`<div class="fares-grid">${TOP_FARES.filter(f => AIRPORT[f.from] && AIRPORT[f.to]).map(f => html`
    <a class="fare-card reveal" href="${href('/flights/search', { from: f.from, to: f.to, depart: d, adt: 1, cabin: 'E' })}">
      ${airlineMark(f.airline)}
      <span><span class="fare-route">${AIRPORT[f.from].city} ${icon('arrow-right')} ${AIRPORT[f.to].city}</span><small>${airline(f.airline).name} · ${f.from} – ${f.to}</small></span>
      <span class="fare-price"><small>Fares from</small><b>${money(f.price)}</b></span>
    </a>`)}</div>`;
}

function routesHTML(region) {
  const d = addDays(today(), 15);
  const list = TOP_ROUTES.filter(r => AIRPORT[r.from] && AIRPORT[r.to] && ((AIRPORT[r.from].cc === 'IN' && AIRPORT[r.to].cc === 'IN') === (region === 'domestic')));
  return list.map(r => html`<a class="route-chip" href="${href('/flights/search', { from: r.from, to: r.to, depart: d, adt: 1 })}">${AIRPORT[r.from].city} ${icon('arrow-right')} ${AIRPORT[r.to].city}</a>`);
}

export default async function home(el) {
  document.title = 'AeroSkys — Book Flights, Hotels, Holidays & Bus';
  const prices = Object.fromEntries(POPULAR_DESTINATIONS.map(p => [p.city, p.price]));
  const more = SERVICES.filter(s => s.more);
  mount(el, html`
    ${hero('flights')}
    <div class="wrap-wide">
      <nav class="shortcuts" aria-label="More services">${more.map(s => html`<a class="shortcut" href="${s.href}" ${s.external ? raw('target="_blank" rel="noopener"') : ''}><span class="ic">${icon(s.icon)}</span><span>${s.short || s.label}<small>${s.external ? 'Live flight status' : s.id === 'checkin' ? '31 airlines' : 'Quick enquiry'}</small></span></a>`)}</nav>
      <div class="ticker" role="region" aria-label="What's new"><span class="ticker-label">What’s new</span><div class="ticker-viewport"><div class="ticker-track">${[...TICKER, ...TICKER].map(t => html`<span>${t}</span>`)}</div></div></div>
    </div>

    <section class="section wrap" id="offers" aria-labelledby="offers-title">
      ${sectionHead({ eyebrow: 'Offers & discounts', title: '<span id="offers-title">Today’s top <em>deals.</em></span>', aside: 'Save on flights, hotels, holidays and buses. Copy a coupon code and apply it when you book.', action: html`<a class="underline-link" href="#/offers">All offers ${icon('arrow-up-right')}</a>` })}
      <div class="offers-top">
        <div class="coupon-card reveal">
          <span class="badge">${icon('ticket')} Coupon</span>
          <div class="plane-art" aria-hidden="true">${icon('plane')}</div>
          <div><h3>${COUPON_CARD.title}</h3><p>${COUPON_CARD.subtitle}</p></div>
          <div class="spread" style="flex-wrap:wrap"><span class="copy-code">CODE: ${COUPON_CARD.code}<button type="button" data-copy-coupon>${icon('copy')} Copy</button></span><a class="text-btn" style="color:#9fd3f3" href="#/offers">View all offers ${icon('arrow-right')}</a></div>
        </div>
        <div class="deals reveal" style="--d:.08s">
          <div class="spread" style="margin-bottom:0">
            <div class="deal-tabs" role="tablist" aria-label="Deals & offers">${DEAL_TABS.map(([k, l, ic], i) => html`<button type="button" class="deal-tab" role="tab" data-deal-tab="${k}" aria-selected="${i === 0}"><span class="ic">${icon(ic)}</span>${l}</button>`)}</div>
            <div class="rail-nav hide-sm"><button type="button" data-rail="-1" aria-label="Scroll offers left">${icon('arrow-left')}</button><button type="button" data-rail="1" aria-label="Scroll offers right">${icon('arrow-right')}</button></div>
          </div>
          <div class="rail" data-deals role="tabpanel"></div>
        </div>
      </div>
      <a class="airline-banner reveal" href="#/offers" aria-label="Airline offers"><span class="eyebrow">Airline offers</span>${img(AIRLINE_BANNER.image, { alt: AIRLINE_BANNER.alt })}</a>
    </section>

    <section class="section-sm bg-wash" aria-labelledby="fares-title">
      <div class="wrap">
        ${sectionHead({ eyebrow: 'Popular flights', title: '<span id="fares-title">Cheap flights on <em>popular routes.</em></span>', aside: 'Recent low fares found by our customers. Prices can change — tap a route to see today’s fares.' })}
        ${faresHTML()}
        <div class="routes-row reveal">
          <div class="pills" role="group" aria-label="Popular routes"><button type="button" class="pill" data-routes="domestic" aria-pressed="true">Domestic</button><button type="button" class="pill" data-routes="international" aria-pressed="false">International</button></div>
          <div class="chip-row" data-routes-list>${routesHTML('domestic')}</div>
        </div>
      </div>
    </section>

    <section class="section wrap" aria-labelledby="why-title">
      ${sectionHead({ eyebrow: 'Why book with us', title: '<span id="why-title">Travel with <em>peace of mind.</em></span>', aside: 'Here’s what you get every time you book with AeroSkys.' })}
      <div class="values">${WHY_CHOOSE.map((w, i) => html`<article class="value reveal" style="--d:${i * .06}s"><span class="num">0${i + 1}</span><span class="ic">${icon({ personal: 'sparkles', deals: 'tag', support: 'headset', sustainable: 'leaf' }[w.id])}</span><h3>${w.title}</h3><p>${w.text}</p></article>`)}</div>
    </section>

    <section class="section-sm" aria-labelledby="dest-title" style="padding-top:0">
      <div class="wrap">${sectionHead({ eyebrow: 'Popular destinations', title: '<span id="dest-title">Top holiday <em>destinations.</em></span>', aside: 'Holiday packages to the places our travellers love most.', action: html`<a class="underline-link" href="#/holidays">All holidays ${icon('arrow-up-right')}</a>` })}</div>
      <div class="wrap">${showcaseHTML(prices)}
        <div class="showcase-foot"><span>Also popular</span>${POPULAR_DESTINATIONS.filter(p => !['Manali', 'Jaipur', 'Dubai', 'Singapore'].includes(p.city)).map(p => html`<a href="${href('/holidays/search', { city: p.city })}">${p.city} · from ${money(p.price)} ${icon('arrow-up-right')}</a>`)}<a href="${href('/holidays/search', { city: 'Kerala' })}">Kerala ${icon('arrow-up-right')}</a><a href="${href('/holidays/search', { city: 'Maldives' })}">Maldives ${icon('arrow-up-right')}</a></div>
      </div>
    </section>

    <section class="section bg-ivory" aria-labelledby="hp-title">
      <div class="wrap">
        ${sectionHead({ eyebrow: 'Holiday packages', title: '<span id="hp-title">Handpicked <em>holiday packages.</em></span>', aside: 'Hotels, transfers and sightseeing in one package. Send an enquiry and we’ll help you plan.', action: html`<div class="pills" role="group" aria-label="Package region"><button type="button" class="pill" data-hp="domestic" aria-pressed="true">Domestic</button><button type="button" class="pill" data-hp="international" aria-pressed="false">International</button></div>` })}
        <div class="pkg-grid" data-hp-grid>${Array.from({ length: 8 }, () => html`<div class="pkg-card"><div class="pkg-img skeleton"></div><div class="pkg-body"><div class="skeleton" style="height:16px;width:70%"></div><div class="skeleton" style="height:12px;width:45%;margin-top:8px"></div></div></div>`)}</div>
        <div class="center" style="margin-top:28px"><a class="btn btn-dark" href="#/holidays">View all holiday packages ${icon('arrow-right')}</a></div>
      </div>
    </section>

    <section class="section-sm wrap" aria-labelledby="al-title">
      ${sectionHead({ eyebrow: 'Popular airlines', title: '<span id="al-title">Book flights on <em>top airlines.</em></span>', aside: 'Tap an airline to find its web check-in page.' })}
      <div class="airline-band">${POPULAR_AIRLINES.map((c, i) => html`<a class="airline-tile reveal" style="--d:${i * .03}s" href="#/web-checkin">${airlineMark(c)}<span>${airline(c).name}</span></a>`)}</div>
    </section>

    <section class="section wrap" aria-labelledby="journal-title">
      ${sectionHead({ eyebrow: 'Travel blog', title: '<span id="journal-title">Travel tips <em>and guides.</em></span>', action: html`<a class="underline-link" href="#/blog">Read more articles ${icon('arrow-up-right')}</a>` })}
      <div class="journal" data-journal></div>
    </section>

    <section class="section bg-wash"><div class="wrap" data-reviews>${reviewsHTML()}</div></section>

    <section class="section wrap" aria-labelledby="faq-title">
      <div class="faq">
        <div class="reveal"><span class="eyebrow">Frequently asked questions</span><h2 class="h2" id="faq-title" style="margin-top:12px">Questions?<br><em>We’ve got answers.</em></h2>
          <figure class="faq-photo">${img('assets/img/thailand.webp', { alt: 'Limestone islands and turquoise water in Thailand' })}</figure></div>
        <div>${FAQ.map(([q, a], i) => html`<details class="acc reveal" ${i === 0 ? raw('open') : ''}><summary>${q}${icon('chevron-down')}</summary><div class="acc-body">${a}</div></details>`)}</div>
      </div>
      <div class="about-blurb reveal" style="margin-top:clamp(40px,6vw,72px)"><h2 class="h3">About AeroSkys</h2><p>${ABOUT_BLURB}.</p></div>
    </section>
  `);

  const { cleanup: heroCleanup } = bindHero(el);

  // Deals & offers tabs
  const deals = $('[data-deals]', el);
  const renderDeals = tab => {
    const list = tab === 'all' ? OFFERS : OFFERS.filter(o => o.tabs.includes(tab));
    deals.innerHTML = String(html`${list.map(offerCard)}`);
    deals.scrollLeft = 0;
  };
  renderDeals('all');
  on(el, 'click', '[data-deal-tab]', (e, b) => { $$('[data-deal-tab]', el).forEach(t => t.setAttribute('aria-selected', String(t === b))); renderDeals(b.dataset.dealTab); });
  on(el, 'click', '[data-offer]', (e, b) => openOffer(OFFERS.find(o => o.id === b.dataset.offer)));
  on(el, 'click', '[data-rail]', (e, b) => deals.scrollBy({ left: Number(b.dataset.rail) * deals.clientWidth * .8, behavior: 'smooth' }));
  on(el, 'click', '[data-copy-coupon]', async (e, b) => {
    const ok = await copyText(COUPON_CARD.code);
    toast(ok ? `Coupon ${COUPON_CARD.code} copied — apply it on the review page.` : 'Copy failed — please note the code.', { type: ok ? 'success' : 'error' });
  });

  // Popular routes tabs
  on(el, 'click', '[data-routes]', (e, b) => {
    $$('[data-routes]', el).forEach(t => t.setAttribute('aria-pressed', String(t === b)));
    $('[data-routes-list]', el).innerHTML = String(html`${routesHTML(b.dataset.routes)}`);
  });

  const cleanShowcase = bindShowcase($('.showcase', el), prices);
  bindReviews($('[data-reviews]', el));

  // Heavier content loads after first paint.
  const [{ PACKAGES, HANDPICKED }, { POSTS }] = await Promise.all([import('../data/packages.js'), import('../data/pages.js')]);
  const byId = Object.fromEntries(PACKAGES.map(p => [p.id, p]));
  const hpGrid = $('[data-hp-grid]', el);
  const renderHP = region => { hpGrid.innerHTML = String(html`${HANDPICKED[region].slice(0, 8).map(id => byId[id]).filter(Boolean).map(p => pkgCard(p))}`); };
  if (hpGrid) {
    renderHP('domestic');
    on(el, 'click', '[data-hp]', (e, b) => { $$('[data-hp]', el).forEach(t => t.setAttribute('aria-pressed', String(t === b))); renderHP(b.dataset.hp); });
  }
  const journal = $('[data-journal]', el);
  if (journal) journal.innerHTML = String(html`${POSTS.slice(0, 5).map((p, i) => postCard(p, { lead: i === 0 }))}`);
  reveal(el);

  return () => { heroCleanup(); cleanShowcase(); };
}
