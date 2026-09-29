// Hotels landing — hero search, hotel deals, popular destinations, stay styles,
// "why book with us" and the hotel FAQ, in the editorial design of the home page.
import { html, raw, icon, mount, on, $, $$, img, copyText } from '../core/dom.js';
import { money, today, addDays, fmtDate, plural, diffDays } from '../core/format.js';
import { href } from '../core/router.js';
import { store } from '../core/store.js';
import { hero, bindHero } from '../ui/hero.js';
import { sectionHead } from '../ui/common.js';
import { offerCard, openOffer } from '../ui/cards.js';
import { toast } from '../ui/toast.js';
import { roomsToParam } from '../ui/search.js';
import { OFFERS } from '../data/content.js';
import { HOTEL_CITIES } from '../data/cities.js';
import { PROMOS } from '../data/promos.js';
import { CITY_PHOTO, POPULAR_HOTEL_CITIES } from '../data/hotels.js';
import { cityStats, CANCELLATION_POLICY, REFUND_NOTE } from '../engines/hotels.js';

const HOTEL_PROMO = PROMOS.find(p => p.code === 'TEST00001KA') || PROMOS.find(p => p.services.includes('hotel'));

export const HOTEL_FAQ = [
  ['What are the check-in and check-out times?', 'Most hotels on AeroSkys offer check-in from 2:00 PM and check-out until 12:00 PM. Timings vary by property and are shown on the hotel page and on your voucher. Early check-in and late check-out are subject to availability and may be chargeable.'],
  ['Can I cancel my hotel booking?', `${CANCELLATION_POLICY} Rooms marked “Refundable” show their free-cancellation date before you book.`],
  ['When will I receive my refund?', `${REFUND_NOTE} You can track a cancellation from Find Booking or My Trips.`],
  ['Which ID do I need at check-in?', 'Every adult guest needs a valid government photo ID — Aadhaar, passport, driving licence or voter ID (PAN card is not accepted). International guests must carry their passport and visa. Some hotels do not accept local IDs.'],
  ['Are taxes included in the price?', 'Results show the room price for your whole stay before taxes. GST of 5% applies to rooms up to ₹7,500 per night and 18% above that; stays abroad show local taxes & fees. The full break-up appears on the Hotel Review page before you pay.'],
  ['Can I book several rooms or for someone else?', 'Yes. Add up to 6 rooms in Rooms & Guests and enter the lead guest for each room on the Hotel Review page. The lead guest must show ID at check-in.'],
  ['Can I get a GST invoice?', 'Yes. Tick “I have a GST number” on the Hotel Review page and add your company’s GSTIN, name, email, phone and address.'],
  ['How do I use a promo code?', HOTEL_PROMO ? `Enter it in the Promo Code box on the Hotel Review page. Current hotel code: ${HOTEL_PROMO.code} — ${HOTEL_PROMO.label}.` : 'Enter it in the Promo Code box on the Hotel Review page.']
];

const STYLES = [
  { type: 'Resort', city: 'Goa', title: 'Beach resorts', text: 'Stays near the beach with pools — great for families and couples.', icon: 'palm' },
  { type: 'Homestay', city: 'Munnar', title: 'Homestays', text: 'Stay with local hosts and enjoy home-cooked food.', icon: 'home' },
  { type: 'Villa', city: 'Bali', title: 'Private villas', text: 'Private space for families and groups, many with their own pool.', icon: 'sun' },
  { type: 'House', city: 'Udaipur', title: 'Havelis & homes', text: 'Heritage havelis and homes with local character.', icon: 'building' },
  { type: 'Aparthotel', city: 'Bengaluru', title: 'Aparthotels', text: 'Apartment-style rooms with a kitchenette — ideal for longer stays.', icon: 'grid' },
  { type: 'Hostel', city: 'Rishikesh', title: 'Backpacker hostels', text: 'Budget-friendly beds and private rooms for solo travellers.', icon: 'users' }
];

const WHY = [
  ['tag', 'Deals on every kind of stay', 'Seasonal offers, promo codes and last-minute prices on hotels, resorts and homestays in India and abroad.'],
  ['check-circle', 'Free cancellation on many rooms', 'Look for “Refundable” — the free-cancellation date is shown before you book.'],
  ['shield', 'Secure, simple payments', 'PCI-DSS compliant gateways, SSL encryption and an instant hotel voucher by email.'],
  ['headset', '24/7 support', 'Need help with your booking? Call or email us any time, day or night.']
];

export default async function hotelsHome(el) {
  document.title = 'Hotels — Book Hotels, Resorts & Homestays | AeroSkys';
  const tin = addDays(today(), 1), tout = addDays(today(), 2);
  // Live hotel offers; the CMS placeholder text "Add your content" is not shown.
  const hotelOffers = OFFERS.filter(o => (o.tabs || []).includes('hotels') || o.kind === 'hotels').map(o => (/^add your content$/i.test(o.description || '') ? { ...o, description: '' } : o));
  const searchLink = (city, extra = {}) => href('/hotels/search', { city, in: tin, out: tout, rooms: '2-0', ...extra });

  const recent = (store.get('recent')?.hotels || []).filter(r => HOTEL_CITIES.some(c => c.name === r.city)).slice(0, 4).map(r => {
    const st = r.state || {};
    const nights = Math.max(1, Math.min(30, diffDays(st.checkin || tin, st.checkout || tout) || 1));
    const ci = st.checkin && st.checkin >= today() ? st.checkin : tin;
    const rooms = Array.isArray(st.rooms) && st.rooms.length ? st.rooms : [{ adults: 2, children: 0, ages: [] }];
    const guests = rooms.reduce((n, x) => n + x.adults + x.children, 0);
    return { city: r.city, ci, co: addDays(ci, nights), rooms, guests, star: st.star, nat: st.nat };
  });

  // Tiles render immediately; live "from" prices are filled in small steps after first paint.
  const destTiles = region => html`${POPULAR_HOTEL_CITIES[region].map(c => {
    const city = HOTEL_CITIES.find(x => x.name === c);
    return html`<a class="ht-dest" href="${searchLink(c)}" data-dest-city="${c}" aria-label="Hotels in ${c}">
      <span class="ht-dest-img">${img(`assets/img/${CITY_PHOTO[c] || 'maldives-villas'}.webp`, { alt: '' })}</span>
      <span class="ht-dest-body"><small>${city ? (city.intl ? city.country : city.region) : ''}</small><b>${c}</b>
        <span class="ht-dest-price" data-dest-price aria-hidden="true">&nbsp;</span></span>
      <span class="ht-dest-go" aria-hidden="true">${icon('arrow-up-right')}</span>
    </a>`;
  })}`;
  const fillDest = c => {
    const a = el.querySelector(`[data-dest-city="${c}"]`);
    const stats = a && cityStats(c, tin, tout, '2-0');
    if (!stats) return;
    a.setAttribute('aria-label', `Hotels in ${c}, ${stats.count} stays from ${money(stats.from)} per night`);
    $('[data-dest-price]', a).innerHTML = String(html`${plural(stats.count, 'stay')} · from <strong class="tnum">${money(stats.from)}</strong>/night`);
  };

  const styleTiles = () => html`${STYLES.map((x, i) => html`<a class="ht-style reveal" style="--d:${i * .05}s" href="${searchLink(x.city, { ptype: x.type })}">
      <span class="ht-style-ic">${icon(x.icon)}</span>
      <span class="ht-style-body"><b>${x.title}</b><small>${x.text}</small></span>
      <span class="ht-style-foot"><span data-style-count="${i}">Stays in ${x.city}</span>${icon('arrow-right')}</span>
    </a>`)}`;
  const fillStyle = i => {
    const x = STYLES[i], n = cityStats(x.city, tin, tout, '2-0')?.types?.[x.type] || 0;
    const t = el.querySelector(`[data-style-count="${i}"]`);
    if (t && n) t.textContent = `${plural(n, x.type === 'House' ? 'home' : 'stay')} in ${x.city}`;
  };

  mount(el, html`
    ${hero('hotels')}
    ${recent.length ? html`<div class="wrap-wide"><div class="ht-recent" aria-label="Recent hotel searches">
      <span class="ht-recent-label">${icon('clock')} Pick up where you left off</span>
      <div class="chip-scroll">${recent.map(r => html`<a class="chip ht-recent-chip" href="${href('/hotels/search', { city: r.city, in: r.ci, out: r.co, rooms: roomsToParam(r.rooms), star: r.star && r.star !== 'all' ? r.star : undefined, nat: r.nat && r.nat !== 'IN' ? r.nat : undefined })}"><b>${r.city}</b><span>${fmtDate(r.ci, 'd MMM')} – ${fmtDate(r.co, 'd MMM')} · ${plural(r.guests, 'guest')}</span></a>`)}</div>
    </div></div>` : ''}

    <section class="section wrap" aria-labelledby="ht-deals-title">
      ${sectionHead({ eyebrow: 'Hotel offers', title: '<span id="ht-deals-title">Save on your <em>hotel stay.</em></span>', aside: 'Current hotel deals and coupon codes. Apply the code on the Hotel Review page.', action: html`<a class="underline-link" href="#/offers">All offers ${icon('arrow-up-right')}</a>` })}
      <div class="offers-top">
        ${HOTEL_PROMO ? html`<div class="coupon-card reveal">
          <span class="badge">${icon('ticket')} Hotel coupon</span>
          <div class="plane-art" aria-hidden="true">${icon('bed')}</div>
          <div><h3>${HOTEL_PROMO.pct ? `${HOTEL_PROMO.pct}% off hotel stays` : 'Save on your stay'}</h3><p>${HOTEL_PROMO.label}</p></div>
          <div class="spread" style="flex-wrap:wrap"><span class="copy-code">CODE: ${HOTEL_PROMO.code}<button type="button" data-copy-code="${HOTEL_PROMO.code}">${icon('copy')} Copy</button></span><a class="text-btn" style="color:#9fd3f3" href="#/offers">View all offers ${icon('arrow-right')}</a></div>
        </div>` : ''}
        <div class="deals reveal" style="--d:.08s">
          <div class="spread" style="margin-bottom:14px"><span class="eyebrow">${plural(hotelOffers.length, 'hotel offer')}</span>
            <div class="rail-nav hide-sm"><button type="button" data-rail="-1" aria-label="Scroll offers left">${icon('arrow-left')}</button><button type="button" data-rail="1" aria-label="Scroll offers right">${icon('arrow-right')}</button></div></div>
          <div class="rail" data-deals>${hotelOffers.map(offerCard)}</div>
        </div>
      </div>
    </section>

    <section class="section-sm bg-wash" aria-labelledby="ht-dest-title">
      <div class="wrap">
        ${sectionHead({ eyebrow: 'Popular destinations', title: '<span id="ht-dest-title">Popular hotel <em>destinations.</em></span>', aside: `Starting prices per night for 1 room and 2 adults, checking in tomorrow. Choose from ${HOTEL_CITIES.length} destinations.`, action: html`<div class="pills" role="group" aria-label="Destination region"><button type="button" class="pill" data-region="domestic" aria-pressed="true">India</button><button type="button" class="pill" data-region="international" aria-pressed="false">International</button></div>` })}
        <div class="ht-dest-grid reveal" data-dest>${destTiles('domestic')}</div>
      </div>
    </section>

    <section class="section wrap" aria-labelledby="ht-style-title">
      ${sectionHead({ eyebrow: 'Types of stay', title: '<span id="ht-style-title">Choose your <em>type of stay.</em></span>', aside: 'Resorts, homestays, villas, hostels and more — all with the same easy booking.' })}
      <div class="ht-styles" data-styles>${styleTiles()}</div>
    </section>

    <section class="section bg-ivory" aria-labelledby="ht-why-title">
      <div class="wrap">
        ${sectionHead({ eyebrow: 'Why book hotels with us', title: '<span id="ht-why-title">Book hotels <em>with confidence.</em></span>', aside: 'Clear prices, flexible options and help whenever you need it.' })}
        <div class="values">${WHY.map(([ic, t, d], i) => html`<article class="value reveal" style="--d:${i * .06}s"><span class="num">0${i + 1}</span><span class="ic">${icon(ic)}</span><h3>${t}</h3><p>${d}</p></article>`)}</div>
      </div>
    </section>

    <section class="section wrap" aria-labelledby="ht-faq-title">
      <div class="faq">
        <div class="reveal"><span class="eyebrow">Hotel FAQs</span><h2 class="h2" id="ht-faq-title" style="margin-top:12px">Questions about<br><em>your hotel stay?</em></h2>
          <figure class="faq-photo">${img('assets/img/goa.webp', { alt: 'A beach in Goa at golden hour' })}</figure></div>
        <div>${HOTEL_FAQ.map(([qq, a], i) => html`<details class="acc reveal" ${i === 0 ? raw('open') : ''}><summary>${qq}${icon('chevron-down')}</summary><div class="acc-body">${a}</div></details>`)}</div>
      </div>
    </section>
  `);

  const { cleanup: heroCleanup } = bindHero(el);
  const deals = $('[data-deals]', el);
  let region = 'domestic';
  const offs = [
    on(el, 'click', '[data-offer]', (e, b) => { const o = hotelOffers.find(x => x.id === b.dataset.offer); if (o) openOffer(o); }),
    on(el, 'click', '[data-rail]', (e, b) => deals.scrollBy({ left: Number(b.dataset.rail) * deals.clientWidth * .8, behavior: 'smooth' })),
    on(el, 'click', '[data-region]', (e, b) => {
      region = b.dataset.region;
      $$('[data-region]', el).forEach(p => p.setAttribute('aria-pressed', String(p === b)));
      $('[data-dest]', el).innerHTML = String(destTiles(region));
    }),
    on(el, 'click', '[data-copy-code]', async (e, b) => {
      const ok = await copyText(b.dataset.copyCode);
      toast(ok ? `Code ${b.dataset.copyCode} copied — apply it on the Hotel Review page.` : 'Copy failed — please note the code.', { type: ok ? 'success' : 'error' });
    })
  ];
  // One city per tick keeps the main thread free for the hero animation.
  let timer = 0;
  const queue = [];
  const run = () => { const job = queue.shift(); if (job) { job(); timer = setTimeout(run, 16); } else timer = 0; };
  const schedule = jobs => { queue.push(...jobs); if (!timer) timer = setTimeout(run, 16); };
  const fillRegion = () => schedule(POPULAR_HOTEL_CITIES[region].map(c => () => fillDest(c)));
  timer = setTimeout(() => { timer = 0; fillRegion(); schedule(STYLES.map((x, i) => () => fillStyle(i))); }, 120);
  offs.push(on(el, 'click', '[data-region]', () => fillRegion()));
  const unsub = store.subscribe((st, patch) => { if (patch && 'currency' in patch) POPULAR_HOTEL_CITIES[region].forEach(fillDest); });
  return () => { heroCleanup(); offs.forEach(f => f()); unsub(); clearTimeout(timer); queue.length = 0; };
}
