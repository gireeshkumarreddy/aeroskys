// Holidays landing (#/holidays) — the live holidays page in the editorial design:
// hero search, what's new, why book with us, holiday offers, trending destinations,
// handpicked packages (Domestic / International), themed collections and an FAQ.
import { html, raw, icon, mount, on, $, $$, img, reducedMotion } from '../core/dom.js';
import { money, plural } from '../core/format.js';
import { href } from '../core/router.js';
import { store } from '../core/store.js';
import { hero, bindHero } from '../ui/hero.js';
import { sectionHead } from '../ui/common.js';
import { pkgCard, openOffer, kindLabel } from '../ui/cards.js';
import { openHolidayEnquiry } from '../ui/enquiry.js';
import { OFFERS, WHY_CHOOSE, COMPANY } from '../data/content.js';

const TRENDING_TILES = [
  { city: 'Jaipur', img: 'jaipur', region: 'Rajasthan, India' },
  { city: 'Manali', img: 'himalayas', region: 'Himachal Pradesh, India' },
  { city: 'Singapore', img: 'singapore', region: 'Singapore' },
  { city: 'Dubai', img: 'dubai', region: 'United Arab Emirates' },
  { city: 'Delhi', img: 'delhi', region: 'Delhi, India' }
];
// Plain-language highlights for the holidays page ticker.
const HOLIDAY_TICKER = [
  'Holiday packages across India and abroad',
  'Hotels, transfers and sightseeing in one package',
  'Custom trips planned by our holiday experts',
  'Need a visa? Our visa team can help',
  'Questions? Call us 24/7 on ' + COMPANY.phone
];
const WHY_ICON = { personal: 'sparkles', deals: 'tag', support: 'headset', sustainable: 'leaf' };
const SIDE_OFFERS = ['offer-1', 'offer-8', 'offer-11'];
const HP_PAGE = 8;

// The live FAQ is empty; these answers are drawn only from the packages' own
// payment policies, cancellation policies, inclusions, exclusions and terms.
export const HOLIDAY_FAQ = [
  ['How much do I pay to confirm a package?', 'Most packages ask for an advance booking fee based on how far away your departure is: 25% of the total cost if you book 30 days or more before departure, 50% between 29 and 20 days, and 100% at 19 days or less. A few packages use their own schedule — a fixed initial advance or a per-person deposit — so check the Payment Policy on the package page.'],
  ['How do I cancel a holiday booking?', 'You or any member of your party can cancel at any time. The person who made the booking must send written notice or an email, and it has to be received at our office. Cancellation charges follow the Cancellation Policy shown on that package; where it lists charges by days before departure, those apply.'],
  ['Are package prices per person?', 'Yes. The price shown is a starting price per adult. Where the inclusions mention double sharing, it assumes two adults sharing a room, and a package may require a minimum of two travellers. Our holiday desk confirms the exact price for your dates.'],
  ['Is GST included in the price?', 'It depends on the package. Some include 5% GST in the price, while others list GST under exclusions. Check Inclusions and Exclusions on the package page before you book.'],
  ['What is usually not included?', 'Exclusions vary, but commonly include personal expenses such as tips, laundry and phone calls, travel and medical insurance, camera fees, drinks, monument entrance fees, and flights or visas unless they are listed under inclusions.'],
  ['Do packages include flights?', html`Only some do, so check Inclusions on the package page: a few international packages list airfare there, while many list flights under exclusions. If yours doesn’t include flights, you can <a class="link" href="#/">book them on AeroSkys</a> separately.`],
  ['Do I need a visa for international packages?', html`A visa is included only where a package lists it under inclusions. For everything else, send a <a class="link" href="#/visa">Visa Enquiry</a> and our visa desk will help with the application.`],
  ['What if the itinerary or hotel changes?', 'Arrangements are planned in advance and changes are unlikely. If a change is needed, we tell you at the earliest possible date. Some packages also state that if a listed hotel is not available, a hotel of a similar category is provided.'],
  ['How do I book a package?', 'Open a package and send the enquiry form with your city and date of departure. Our holiday desk contacts you with the best deal for your dates, and payment then follows the package’s Payment Policy.']
];

const skeletons = n => Array.from({ length: n }, () => html`<div class="pkg-card" aria-hidden="true"><div class="pkg-img skeleton"></div><div class="pkg-body"><div class="skeleton" style="height:16px;width:70%"></div><div class="skeleton" style="height:12px;width:45%;margin-top:8px"></div></div></div>`);
const behavior = () => (reducedMotion() ? 'auto' : 'smooth');

export default async function holidaysHome(el) {
  document.title = 'Holiday Packages — India & International Tours | AeroSkys';
  const holidayOffer = OFFERS.find(o => o.kind === 'holidays');
  const sideOffers = SIDE_OFFERS.map(id => OFFERS.find(o => o.id === id)).filter(Boolean);
  const ticker = HOLIDAY_TICKER;

  mount(el, html`<div class="hd-view hd-home">
    ${hero('holidays')}
    <div class="wrap-wide">
      <div class="ticker hd-ticker" role="marquee" aria-label="What’s new"><span class="ticker-label">What’s new</span><div class="ticker-viewport"><div class="ticker-track">${[...ticker, ...ticker].map((t, i) => html`<span${i >= ticker.length ? raw(' aria-hidden="true"') : ''}>${t}</span>`)}</div></div></div>
    </div>

    <section class="section wrap" aria-labelledby="hd-why-title">
      ${sectionHead({ title: '<span id="hd-why-title">Why book holidays <em>with us?</em></span>', aside: 'Holiday packages for families, couples, friends and solo travellers.' })}
      <div class="values hd-values">${WHY_CHOOSE.map((w, i) => html`<article class="value reveal" style="--d:${i * 0.06}s"><span class="ic">${icon(WHY_ICON[w.id] || 'sparkles')}</span><h3>${w.title}</h3><p>${w.text}</p></article>`)}</div>
    </section>

    <section class="section-sm bg-wash" aria-labelledby="hd-deals-title">
      <div class="wrap">
        ${sectionHead({ eyebrow: 'Deals & offers', title: '<span id="hd-deals-title">Save on your <em>next holiday.</em></span>', action: html`<a class="underline-link" href="#/offers?tab=holidays">All offers ${icon('arrow-up-right')}</a>` })}
        <div class="hd-deals">
          ${holidayOffer ? html`<button type="button" class="hd-deal reveal" data-hd-offer="${holidayOffer.id}">
            <span class="hd-deal-img">${img(holidayOffer.image, { alt: '', fallback: 'maldives-villas' })}</span>
            <span class="hd-deal-body">
              <span class="badge badge-amber">${icon('percent')} Holiday offer</span>
              <span class="hd-deal-title">${holidayOffer.title}</span>
              <span class="hd-deal-text">Offer terms, validity and eligible bookings are set by AeroSkys and its partners.</span>
              <span class="text-btn">View offer details ${icon('arrow-right')}</span>
            </span>
          </button>` : ''}
          <div class="hd-deal-side reveal" style="--d:.08s">
            <h3 class="hd-side-title">More ways to save</h3>
            <ul class="hd-deal-list">${sideOffers.map(o => html`<li><button type="button" class="hd-deal-row" data-hd-offer="${o.id}">
              <span class="hd-deal-thumb">${img(o.image, { alt: '' })}</span>
              <span class="grow"><small>${kindLabel(o.kind)}</small><b>${o.title}</b></span>${icon('chevron-right')}</button></li>`)}</ul>
          </div>
        </div>
      </div>
    </section>

    <section class="section wrap" aria-labelledby="hd-trend-title">
      ${sectionHead({ title: '<span id="hd-trend-title">Top trending <em>destinations.</em></span>', aside: 'The places travellers are booking right now.' })}
      <div class="hd-trend">${TRENDING_TILES.map((t, i) => html`<a class="hd-tile ${i === 0 ? 'is-lead' : ''} reveal" style="--d:${i * 0.05}s" href="${href('/holidays/search', { city: t.city })}">
        ${img(`assets/img/${t.img}.webp`, { alt: '', fallback: t.img, lazy: i > 0 })}
        <span class="hd-tile-body"><span class="hd-tile-region">${t.region}</span><strong>${t.city}</strong><span class="hd-tile-meta" data-hd-tile="${t.city}">Holiday packages</span></span>
        <span class="hd-tile-go" aria-hidden="true">${icon('arrow-up-right')}</span>
      </a>`)}</div>
    </section>

    <section class="section bg-ivory" aria-labelledby="hd-hp-title">
      <div class="wrap">
        ${sectionHead({ title: '<span id="hd-hp-title">Handpicked holiday <em>packages.</em></span>', aside: 'Our most popular trips. Open a package to see the full itinerary and send an enquiry.', action: html`<div class="pills" role="group" aria-label="Package region"><button type="button" class="pill" data-hd-region="domestic" aria-pressed="true">Domestic</button><button type="button" class="pill" data-hd-region="international" aria-pressed="false">International</button></div>` })}
        <div class="pkg-grid" data-hd-hp>${skeletons(8)}</div>
        <div class="hd-more" data-hd-hp-more></div>
      </div>
    </section>

    <section class="section wrap hd-cats" aria-labelledby="hd-cats-title">
      ${sectionHead({ eyebrow: 'Holidays by theme', title: '<span id="hd-cats-title">Find a holiday <em>by theme.</em></span>', aside: 'Budget trips, family holidays, group tours, adventures and more.' })}
      <nav class="hd-cat-jump chip-scroll" aria-label="Holiday themes" data-hd-jump></nav>
      <div data-hd-cats>${Array.from({ length: 2 }, () => html`<div class="hd-rail-block" aria-hidden="true"><div class="skeleton" style="height:22px;width:220px;margin-bottom:18px"></div><div class="pkg-grid">${skeletons(4)}</div></div>`)}</div>
    </section>

    <section class="section bg-wash" aria-labelledby="hd-faq-title">
      <div class="wrap faq">
        <div class="reveal">
          <span class="eyebrow">Holiday FAQs</span>
          <h2 class="h2" id="hd-faq-title" style="margin-top:12px">Questions about<br><em>holiday packages?</em></h2>
          <p class="hd-faq-note">Every package lists its own payment policy, cancellation policy and terms. These answers sum up what they have in common.</p>
          <figure class="faq-photo">${img('assets/img/maldives-villas.webp', { alt: 'Overwater villas on a calm lagoon', fallback: 'maldives-villas' })}</figure>
        </div>
        <div>${HOLIDAY_FAQ.map(([q, a], i) => html`<details class="acc reveal"${i === 0 ? raw(' open') : ''}><summary>${q}${icon('chevron-down')}</summary><div class="acc-body">${a}</div></details>`)}</div>
      </div>
    </section>

    <section class="section-sm wrap">
      <div class="hd-custom reveal">
        <div class="hd-custom-copy">
          <span class="eyebrow on-dark">Custom holidays</span>
          <h2 class="h2">Can’t find the <em>right trip?</em></h2>
          <p>Tell us where and when you want to go. Our holiday desk will plan the trip around you.</p>
        </div>
        <div class="hd-custom-actions">
          <button type="button" class="btn btn-white btn-lg" data-hd-custom>${icon('sparkles')} Plan a custom holiday</button>
          <a class="hd-custom-call" href="tel:${COMPANY.phone}">${icon('phone')} Or call ${COMPANY.phone}, 24/7</a>
        </div>
      </div>
    </section>
  </div>`);

  const root = el.firstElementChild;
  const { cleanup: heroCleanup } = bindHero(root);

  // Offer cards also carry data-offer for other views; handle here and stop the click at this root.
  on(root, 'click', '[data-hd-offer]', (e, b) => {
    e.stopPropagation();
    const o = OFFERS.find(x => x.id === b.dataset.hdOffer);
    if (o) openOffer(o);
  });
  on(root, 'click', '[data-hd-custom]', () => openHolidayEnquiry({ title: 'Plan a custom holiday' }));

  // Package data loads after first paint (it is the largest data module).
  const [{ PACKAGES, HANDPICKED, HOLIDAY_CATEGORIES }, { findPackages }] = await Promise.all([import('../data/packages.js'), import('./holiday-search.js')]);
  if (!root.isConnected) return () => heroCleanup();
  const byId = Object.fromEntries(PACKAGES.map(p => [p.id, p]));

  const renderTiles = () => TRENDING_TILES.forEach(t => {
    const { list, mode } = findPackages(t.city);
    const meta = $(`[data-hd-tile="${t.city}"]`, root);
    if (meta && list.length && mode === 'match') meta.textContent = `${plural(list.length, 'package')} · from ${money(Math.min(...list.map(p => p.price)))}`;
  });

  let region = 'domestic', expanded = false;
  const renderHP = () => {
    const list = (HANDPICKED[region] || []).map(id => byId[id]).filter(Boolean);
    $('[data-hd-hp]', root).innerHTML = String(html`${(expanded ? list : list.slice(0, HP_PAGE)).map(p => pkgCard(p))}`);
    $('[data-hd-hp-more]', root).innerHTML = list.length > HP_PAGE ? String(html`<button type="button" class="btn btn-light" data-hd-hp-toggle aria-expanded="${expanded}">${expanded ? 'Show fewer packages' : `Show all ${list.length} ${region} packages`} ${icon(expanded ? 'chevron-up' : 'chevron-down')}</button>`) : '';
  };

  const cats = HOLIDAY_CATEGORIES.map(c => ({ ...c, list: c.ids.map(id => byId[id]).filter(Boolean) })).filter(c => c.list.length);
  const renderCats = () => {
    $('[data-hd-jump]', root).innerHTML = String(html`${cats.map(c => html`<button type="button" class="chip" data-hd-jump-to="${c.id}">${c.name}<span class="hd-chip-n">${c.list.length}</span></button>`)}`);
    $('[data-hd-cats]', root).innerHTML = String(html`${cats.map(c => html`<div class="hd-rail-block" id="hd-cat-${c.id}">
      <div class="hd-rail-head">
        <div><h3 class="h3">${c.name}</h3><p>${plural(c.list.length, 'package')} · from ${money(Math.min(...c.list.map(p => p.price)))}</p></div>
        <div class="hd-rail-actions">
          <a class="underline-link" href="${href('/holidays/search', { cat: c.id })}">View all ${icon('arrow-up-right')}</a>
          <div class="rail-nav hide-sm"><button type="button" data-hd-rail-go="${c.id}" data-dir="-1" aria-label="Scroll ${c.name} back">${icon('arrow-left')}</button><button type="button" data-hd-rail-go="${c.id}" data-dir="1" aria-label="Scroll ${c.name} forward">${icon('arrow-right')}</button></div>
        </div>
      </div>
      <div class="rail hd-rail" data-hd-rail="${c.id}" role="group" aria-label="${c.name} packages">${c.list.map(p => pkgCard(p))}</div>
    </div>`)}`);
  };

  renderTiles();
  renderHP();
  renderCats();

  on(root, 'click', '[data-hd-region]', (e, b) => {
    region = b.dataset.hdRegion; expanded = false;
    $$('[data-hd-region]', root).forEach(t => t.setAttribute('aria-pressed', String(t === b)));
    renderHP();
  });
  on(root, 'click', '[data-hd-hp-toggle]', () => {
    expanded = !expanded;
    renderHP();
    if (!expanded) $('#hd-hp-title', root)?.scrollIntoView({ block: 'start', behavior: behavior() });
    else $('[data-hd-hp] .pkg-card:nth-child(' + (HP_PAGE + 1) + ')', root)?.focus({ preventScroll: true });
  });
  on(root, 'click', '[data-hd-rail-go]', (e, b) => {
    const rail = $(`[data-hd-rail="${b.dataset.hdRailGo}"]`, root);
    rail?.scrollBy({ left: Number(b.dataset.dir) * rail.clientWidth * 0.85, behavior: behavior() });
  });
  on(root, 'click', '[data-hd-jump-to]', (e, b) => {
    const block = $(`#hd-cat-${b.dataset.hdJumpTo}`, root);
    if (block) scrollTo({ top: block.getBoundingClientRect().top + scrollY - 104, behavior: behavior() });
  });

  // Prices follow the currency switch in the header.
  let currency = store.get('currency');
  const offCurrency = store.subscribe(s => {
    if (s.currency === currency) return;
    currency = s.currency;
    renderTiles(); renderHP(); renderCats();
  });

  return () => { heroCleanup(); offCurrency(); };
}
