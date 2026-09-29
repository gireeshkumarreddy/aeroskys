// Hotel details — gallery, stay summary, rooms & rate options with meal-plan filters,
// location map, policies and a sticky "Total Price" booking card.
import { html, icon, mount, on, $, $$, img } from '../core/dom.js';
import { money, fmtDate, plural } from '../core/format.js';
import { href, go, setQuery } from '../core/router.js';
import { store } from '../core/store.js';
import { openModal } from '../ui/overlay.js';
import { searchCard, bindSearchCard, parseHotelQuery, roomsToParam } from '../ui/search.js';
import { stars, ratingBadge, emptyState, crumbs } from '../ui/common.js';
import { getHotel, findRate, MEALS, MEAL_ORDER, MEAL_DESC, photoUrl, PHOTO_FALLBACK, PHOTO_LABEL, cancellationText } from '../engines/hotels.js';
import { NATIONALITIES } from '../data/cities.js';
import { LAST_RESULTS_KEY, FROM_RESULTS_KEY } from './hotels-results.js';

const MEAL_ICON = { RO: 'bed', BB: 'coffee', HB: 'meal', FB: 'meal' };
const osmLink = (lat, lon) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;

export default async function hotelDetails(el, ctx) {
  const id = ctx.params.id;
  const s = parseHotelQuery(ctx.query);
  const h = getHotel(id, s);
  if (!h) {
    document.title = 'Property not found — AeroSkys';
    mount(el, html`<section class="page"><div class="wrap-narrow">${emptyState({ iconName: 'building', title: 'We couldn’t find that property', text: 'The link may be out of date. Search again to see available stays.', action: html`<a class="btn btn-primary" href="#/hotels">Search hotels</a>` })}</div></section>`);
    return;
  }
  document.title = `${h.name}, ${h.city} — AeroSkys`;
  const st = h.stay;
  const stayQ = { in: st.checkin, out: st.checkout, rooms: roomsToParam(st.rooms), nat: st.nat !== 'IN' ? st.nat : undefined };
  const natLabel = (NATIONALITIES.find(n => n[0] === st.nat) || NATIONALITIES[0])[1];
  const resultsHref = (() => {
    try {
      const saved = sessionStorage.getItem(LAST_RESULTS_KEY) || '';
      if (saved && new URLSearchParams(saved.split('?')[1] || '').get('city') === h.city) return saved;
    } catch { /* storage unavailable */ }
    return href('/hotels/search', { city: h.city, ...stayQ });
  })();
  const P = h.photos;
  let selected = findRate(h, ctx.query.get('rate')) || h.cheapest;
  let mealFilter = 'all';

  const photoAlt = p => `${h.name} — ${PHOTO_LABEL[p.cat]}`;
  const amenPreview = 10;

  mount(el, html`
    <section class="page ht-detail">
      <div class="wrap">
        <div class="ht-dtop">
          ${crumbs([{ label: 'Hotels', href: '#/hotels' }, { label: h.city, href: resultsHref }, { label: h.name }], true)}
          <button type="button" class="btn btn-light btn-sm ht-back" data-back>${icon('arrow-left')} GO BACK</button>
        </div>
        <header class="ht-dhead">
          <div class="ht-dhead-main">
            <div class="ht-card-top"><span class="ht-type">${h.type}</span>${stars(h.stars)}</div>
            <h1 class="ht-dname">${h.name}</h1>
            <p class="ht-daddr">${icon('pin')}<span>${h.address}</span><button type="button" class="text-btn" data-jump="ht-map">View on map</button></p>
          </div>
          <div class="ht-dscore">${ratingBadge(h.rating)}<span><b>${h.ratingLabel}</b><small>${h.reviews.toLocaleString('en-IN')} verified reviews</small></span></div>
        </header>

        <div class="ht-gallery" data-n="${Math.min(P.length, 5)}">
          ${P.slice(0, 5).map((p, i) => html`<button type="button" class="ht-g-item" data-photo="${i}" aria-label="Open photo ${i + 1} of ${P.length}: ${PHOTO_LABEL[p.cat]}">
            ${img(photoUrl(p.id, i === 0 ? 1200 : 640), { alt: photoAlt(p), fallback: PHOTO_FALLBACK, lazy: i > 0 })}
            ${i === 4 && P.length > 5 ? html`<span class="ht-g-more">${icon('grid')} +${P.length - 5} Images</span>` : ''}</button>`)}
        </div>
        <div class="ht-strip-wrap">
          <div class="ht-strip" data-strip>${P.map((p, i) => html`<button type="button" class="ht-strip-item" data-photo="${i}" aria-label="Open photo ${i + 1} of ${P.length}">${img(photoUrl(p.id, 800), { alt: photoAlt(p), fallback: PHOTO_FALLBACK, lazy: i > 0 })}</button>`)}</div>
          <span class="ht-strip-count" data-strip-count aria-hidden="true">1 / ${P.length}</span>
        </div>

        <div class="ht-dgrid">
          <div class="ht-dmain">
            <section class="ht-stay card" aria-label="Your stay">
              <div class="ht-stay-cell"><span>Check In</span><b>${fmtDate(st.checkin, 'ddd, d MMM yyyy')}</b><small>From ${h.checkinTime}</small></div>
              <div class="ht-stay-nights" aria-label="${plural(st.nights, 'night')}"><span>${plural(st.nights, 'Night')}</span></div>
              <div class="ht-stay-cell"><span>Check Out</span><b>${fmtDate(st.checkout, 'ddd, d MMM yyyy')}</b><small>Until ${h.checkoutTime}</small></div>
              <div class="ht-stay-cell ht-stay-guests"><span>Rooms &amp; guests</span><b>${plural(st.roomCount, 'Room')} · ${plural(st.guests, 'Guest')}</b><small>${plural(st.adults, 'Adult')}${st.children ? `, ${plural(st.children, 'Child', 'Children')}` : ''} · ${natLabel}</small></div>
              <button type="button" class="btn btn-outline btn-sm ht-stay-change" data-change>${icon('edit')} Change</button>
            </section>
            <ul class="ht-highlights">${h.highlights.map(x => html`<li>${icon(x.icon)}<span>${x.text}</span></li>`)}</ul>

            <section class="ht-section card" aria-labelledby="ht-about-t">
              <h2 class="h3" id="ht-about-t">About this <em>property</em></h2>
              <div class="ht-about">
                <p>${h.about[0]}</p>
                <div id="ht-about-more" hidden>${h.about.slice(1).map(t => html`<p>${t}</p>`)}</div>
              </div>
              <button type="button" class="text-btn" data-toggle="ht-about-more" aria-expanded="false" aria-controls="ht-about-more"><span>Read more</span>${icon('chevron-down')}</button>
            </section>

            <section class="ht-section card" aria-labelledby="ht-amen-t">
              <h2 class="h3" id="ht-amen-t">Amenities</h2>
              <ul class="ht-amen-grid">${h.amenityList.slice(0, amenPreview).map(a => html`<li>${icon(a.icon)}<span>${a.label}</span></li>`)}</ul>
              ${h.amenityList.length > amenPreview ? html`<ul class="ht-amen-grid" id="ht-amen-more" hidden>${h.amenityList.slice(amenPreview).map(a => html`<li>${icon(a.icon)}<span>${a.label}</span></li>`)}</ul>
                <button type="button" class="text-btn" data-toggle="ht-amen-more" aria-expanded="false" aria-controls="ht-amen-more" data-more-label="View more (${h.amenityList.length - amenPreview})"><span>View more (${h.amenityList.length - amenPreview})</span>${icon('chevron-down')}</button>` : ''}
            </section>

            <section class="ht-section card" id="ht-rooms" aria-labelledby="ht-rooms-t">
              <div class="ht-rooms-head">
                <h2 class="h3" id="ht-rooms-t">Room <em>types</em></h2>
                <p class="small muted" data-rooms-count aria-live="polite"></p>
              </div>
              <div class="chip-row ht-meal-chips" data-meal-chips role="group" aria-label="Filter room options"></div>
              <div data-rooms></div>
            </section>

            <section class="ht-section card" id="ht-map" aria-labelledby="ht-map-t">
              <h2 class="h3" id="ht-map-t">Location</h2>
              <p class="ht-map-addr">${icon('pin')}<span>${h.address}</span></p>
              <div class="ht-map">
                <div class="ht-map-fallback">${icon('map')}<b>${h.area}, ${h.city}</b><span>The map preview could not be loaded.</span><a class="link" href="${osmLink(h.lat, h.lon)}" target="_blank" rel="noopener">Open in OpenStreetMap</a></div>
                ${navigator.onLine === false ? '' : html`<iframe title="Map showing the location of ${h.name}" src="https://www.openstreetmap.org/export/embed.html?bbox=${h.map.bbox}&layer=mapnik&marker=${h.lat},${h.lon}" loading="lazy" referrerpolicy="no-referrer"></iframe>`}
              </div>
              <div class="ht-map-foot"><span class="xs muted">Map data © OpenStreetMap contributors</span><a class="text-btn" href="${osmLink(h.lat, h.lon)}" target="_blank" rel="noopener">View larger map ${icon('external')}</a></div>
              <h3 class="ht-sub">What’s nearby</h3>
              <ul class="ht-nearby">${h.landmarks.map(l => html`<li>${icon(l.airport ? 'plane' : 'pin')}<span>${l.name}</span><b class="tnum">${l.km} km</b></li>`)}</ul>
            </section>

            <section class="ht-section card" aria-labelledby="ht-pol-t">
              <h2 class="h3" id="ht-pol-t">Property <em>policies</em></h2>
              <ul class="ht-policies">${h.policies.map(p => html`<li>${icon(p.icon)}<div><b>${p.title}</b><p>${p.text}</p></div></li>`)}</ul>
            </section>
          </div>
          <aside class="ht-daside"><div class="ht-selbox card" data-selbox aria-live="polite"></div></aside>
        </div>
      </div>
    </section>
    <div class="mobile-cta ht-mcta" data-mcta></div>`);

  // ---------------------------------------------------------------- rooms & rates
  const allRates = h.rates;
  const countFor = f => allRates.filter(r => f === 'all' || (f === 'free' ? r.refundable : r.meal === f)).length;
  const perNightStrike = r => (r.strike ? Math.round(r.strike / (r.rooms * r.nights)) : 0);

  function renderChips() {
    const opts = [['all', 'All'], ...MEAL_ORDER.filter(m => countFor(m)).map(m => [m, MEALS[m]]), ...(countFor('free') ? [['free', 'Free cancellation']] : [])];
    $('[data-meal-chips]', el).innerHTML = String(html`${opts.map(([k, l]) => html`<button type="button" class="chip" data-meal="${k}" aria-pressed="${mealFilter === k}">${k !== 'all' && k !== 'free' ? icon(MEAL_ICON[k]) : k === 'free' ? icon('check-circle') : ''}${l} <small>${countFor(k)}</small></button>`)}`);
  }

  const rateRow = r => {
    const sel = selected && selected.id === r.id;
    return html`<div class="ht-rate ${sel ? 'is-selected' : ''}" data-rate-row="${r.id}">
      <div class="ht-rate-main">
        <b class="ht-rate-meal">${icon(MEAL_ICON[r.meal])}${r.mealLabel}</b>
        <span class="ht-rate-cancel ${r.refundable ? 'is-free' : ''}">${r.refundable ? html`${icon('check-circle')}Refundable · Free cancellation until ${fmtDate(r.freeCancelUntil, 'd MMM')}` : html`${icon('info')}Non-refundable`}</span>
        <ul class="ht-rate-inc">${r.inclusions.slice(1, 3).map(x => html`<li>${icon('check')}${x}</li>`)}</ul>
        <button type="button" class="text-btn ht-rate-more" data-rate-more="${r.id}">View more</button>
      </div>
      <div class="ht-rate-price">
        ${r.strike ? html`<span class="strike tnum">${money(perNightStrike(r))}</span>` : ''}
        <b class="tnum">${money(r.perNight)}</b><small>per room / night</small>
        <small class="ht-rate-total tnum">${money(r.net)} for ${plural(r.rooms, 'room')} × ${plural(r.nights, 'night')} <span>+ ${money(r.tax)} taxes</span></small>
        ${r.left <= 3 ? html`<small class="is-red">Only ${r.left} left</small>` : ''}
      </div>
      <button type="button" class="btn ${sel ? 'btn-dark' : 'btn-outline'} btn-sm ht-rate-cta" data-select="${r.id}" aria-pressed="${!!sel}" aria-label="${sel ? 'Selected' : 'Select'}: ${r.roomName}, ${r.mealLabel}, ${r.refundable ? 'refundable' : 'non-refundable'}">${sel ? html`${icon('check')}Selected` : 'Select Room'}</button>
    </div>`;
  };

  function renderRooms() {
    const box = $('[data-rooms]', el);
    if (h.soldOut) {
      $('[data-rooms-count]', el).textContent = '';
      $('[data-meal-chips]', el).innerHTML = '';
      box.innerHTML = String(emptyState({ iconName: 'calendar', title: 'Sold out for your dates', text: 'This property has no rooms left for your stay. Try different dates or fewer rooms.', action: html`<button type="button" class="btn btn-primary" data-change>${icon('calendar')} Change dates</button>` }));
      return;
    }
    renderChips();
    const match = r => mealFilter === 'all' || (mealFilter === 'free' ? r.refundable : r.meal === mealFilter);
    const shownN = allRates.filter(match).length;
    $('[data-rooms-count]', el).textContent = `Showing results of ${shownN} of ${allRates.length} room options`;
    const types = h.roomTypes.filter(rt => rt.available ? rt.rates.some(match) : mealFilter === 'all').sort((x, y) => Number(y.available) - Number(x.available));
    box.innerHTML = String(html`${types.map(rt => html`<article class="ht-room ${rt.available ? '' : 'is-off'}" data-room="${rt.id}">
      <div class="ht-room-head">
        <button type="button" class="ht-room-media" data-room-more="${rt.id}" aria-label="Photos and details of ${rt.name}">${img(photoUrl(rt.photos[0], 480), { alt: '', fallback: PHOTO_FALLBACK })}<span>${icon('grid')}${rt.photos.length}</span></button>
        <div class="ht-room-info">
          <h3>${rt.name}</h3>
          <p class="ht-room-spec"><span>${icon('bed')}${rt.beds}</span><span>${icon('home')}${rt.size} sq ft</span><span>${icon('users')}Sleeps ${rt.maxGuests}</span></p>
          <ul class="ht-room-feats">${rt.features.slice(0, 4).map(f => html`<li>${f}</li>`)}</ul>
          <button type="button" class="text-btn" data-room-more="${rt.id}">View more ${icon('arrow-right')}</button>
        </div>
      </div>
      ${rt.available ? html`<div class="ht-rates">${rt.rates.filter(match).map(rateRow)}</div>` : html`<p class="ht-room-off">${icon('alert')}${rt.reason}</p>`}
    </article>`)}`);
  }

  // ---------------------------------------------------------------- selection card & mobile CTA
  function renderAside() {
    const box = $('[data-selbox]', el), cta = $('[data-mcta]', el);
    if (h.soldOut || !selected) {
      box.innerHTML = String(html`<span class="eyebrow">Availability</span><h3 class="h4" style="margin-top:6px">Sold out for your dates</h3><p class="small muted" style="margin:8px 0 16px">Rooms may open up on other dates.</p><button type="button" class="btn btn-primary btn-block" data-change>${icon('calendar')} Change dates</button>`);
      cta.hidden = true;
      document.body.classList.remove('has-mobile-cta');
      return;
    }
    const r = selected;
    box.innerHTML = String(html`
      <span class="eyebrow">Selected room</span>
      <h3 class="ht-sel-name">${r.roomName}</h3>
      <p class="ht-sel-meta">${icon(MEAL_ICON[r.meal])}${r.mealLabel} · ${r.beds}</p>
      <p class="ht-rate-cancel ${r.refundable ? 'is-free' : ''}">${r.refundable ? html`${icon('check-circle')}Free cancellation until ${fmtDate(r.freeCancelUntil, 'd MMM yyyy')}` : html`${icon('info')}Non-refundable`}</p>
      <dl class="kv ht-sel-kv"><dt>Check-in</dt><dd>${fmtDate(st.checkin, 'ddd, d MMM')}</dd><dt>Check-out</dt><dd>${fmtDate(st.checkout, 'ddd, d MMM')}</dd><dt>Stay</dt><dd>${plural(st.nights, 'Night')} · ${plural(st.roomCount, 'Room')} · ${plural(st.guests, 'Guest')}</dd></dl>
      <div class="ht-sel-price">
        <span class="ht-sel-label">Total Price for ${plural(st.roomCount, 'room')}</span>
        ${r.strike ? html`<span class="strike tnum">${money(r.strike + r.tax)}</span>` : ''}
        <b class="tnum">${money(r.gross)}</b>
        <small>${money(r.net)} + ${money(r.tax)} ${r.taxLabel.toLowerCase().startsWith('gst') ? r.taxLabel : 'taxes & fees'}</small>
      </div>
      <button type="button" class="btn btn-primary btn-lg btn-block" data-book>BOOK NOW ${icon('arrow-right')}</button>
      <p class="ht-sel-note">${icon('shield')}Secure booking · Instant confirmation</p>`);
    cta.hidden = false;
    cta.innerHTML = String(html`<div class="mc-price"><b class="tnum">${money(r.gross)}</b><small>Total for ${plural(st.roomCount, 'room')} · ${plural(st.nights, 'night')} · incl. taxes</small></div><button type="button" class="btn btn-primary" data-book>BOOK NOW</button>`);
    document.body.classList.add('has-mobile-cta');
  }

  function select(rateId) {
    const r = findRate(h, rateId);
    if (!r) return;
    selected = r;
    $$('[data-rate-row]', el).forEach(row => {
      const on2 = row.dataset.rateRow === r.id;
      row.classList.toggle('is-selected', on2);
      const b = $('[data-select]', row);
      b.className = `btn ${on2 ? 'btn-dark' : 'btn-outline'} btn-sm ht-rate-cta`;
      b.setAttribute('aria-pressed', String(on2));
      b.innerHTML = on2 ? String(html`${icon('check')}Selected`) : 'Select Room';
    });
    renderAside();
    setQuery({ rate: r.id });
  }

  // ---------------------------------------------------------------- overlays
  function openGallery(start = 0, list = P, title = `${h.name} · Photos`) {
    let i = start;
    openModal({
      title, size: 'full', className: 'ht-lightbox-modal',
      body: html`<div class="ht-lightbox">
        <div class="ht-lb-stage" data-stage><div class="ht-lb-img" data-lb-img></div>
          <button type="button" class="ht-lb-nav is-prev" data-lb="-1" aria-label="Previous photo">${icon('chevron-left')}</button>
          <button type="button" class="ht-lb-nav is-next" data-lb="1" aria-label="Next photo">${icon('chevron-right')}</button>
          <span class="ht-lb-cap" data-lb-cap aria-live="polite"></span></div>
        <div class="ht-lb-thumbs">${list.map((p, k) => html`<button type="button" data-lb-go="${k}" aria-label="Show photo ${k + 1}: ${PHOTO_LABEL[p.cat]}">${img(photoUrl(p.id, 240), { alt: '', fallback: PHOTO_FALLBACK })}</button>`)}</div>
      </div>`,
      onOpen(dlg) {
        const show = k => {
          i = (k + list.length) % list.length;
          const p = list[i];
          $('[data-lb-img]', dlg).innerHTML = String(img(photoUrl(p.id, 1600), { alt: photoAlt(p), fallback: PHOTO_FALLBACK, lazy: false }));
          $('[data-lb-cap]', dlg).textContent = `${i + 1} / ${list.length} · ${PHOTO_LABEL[p.cat]}`;
          $$('[data-lb-go]', dlg).forEach((b, k2) => b.setAttribute('aria-current', String(k2 === i)));
          $(`[data-lb-go="${i}"]`, dlg)?.scrollIntoView({ block: 'nearest', inline: 'center' });
        };
        on(dlg, 'click', '[data-lb]', (e, b) => show(i + Number(b.dataset.lb)));
        on(dlg, 'click', '[data-lb-go]', (e, b) => show(Number(b.dataset.lbGo)));
        dlg.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(i - 1); else if (e.key === 'ArrowRight') show(i + 1); });
        const stage = $('[data-stage]', dlg);
        let x0 = null;
        stage.addEventListener('pointerdown', e => { x0 = e.clientX; });
        stage.addEventListener('pointerup', e => { if (x0 != null && Math.abs(e.clientX - x0) > 40) show(i + (e.clientX < x0 ? 1 : -1)); x0 = null; });
        show(start);
      }
    });
  }

  function openRoom(rt) {
    const photos = rt.photos.map((pid, k) => ({ id: pid, cat: k === rt.photos.length - 1 ? 'bath' : 'room' }));
    const m = openModal({
      title: rt.name, size: 'wide',
      body: html`<div class="ht-room-modal">
        <div class="ht-room-photos">${photos.map((p, k) => html`<button type="button" data-rp="${k}" aria-label="Open photo ${k + 1}">${img(photoUrl(p.id, 640), { alt: `${rt.name} — ${PHOTO_LABEL[p.cat]}`, fallback: PHOTO_FALLBACK })}</button>`)}</div>
        <p class="ht-room-spec"><span>${icon('bed')}${rt.beds}</span><span>${icon('home')}${rt.size} sq ft</span><span>${icon('users')}Up to ${plural(rt.maxAdults, 'adult')} · ${plural(rt.maxGuests, 'guest')}</span>${rt.view ? html`<span>${icon('mountain')}${rt.view}</span>` : ''}</p>
        <h3 class="ht-sub">In the room</h3>
        <ul class="ht-feat-list">${rt.features.map(f => html`<li>${icon('check')}${f}</li>`)}</ul>
        ${rt.available ? html`<h3 class="ht-sub">Rate options</h3><ul class="ht-feat-list">${rt.rates.map(r => html`<li>${icon(MEAL_ICON[r.meal])}${r.mealLabel} · ${r.refundable ? 'Refundable' : 'Non-refundable'} — <b class="tnum">${money(r.perNight)}</b>/night</li>`)}</ul>` : html`<p class="ht-room-off">${icon('alert')}${rt.reason}</p>`}
      </div>`,
      foot: html`<button type="button" class="btn btn-light" data-close>Close</button>`,
      onOpen(dlg) { on(dlg, 'click', '[data-rp]', (e, b) => { m.close(); setTimeout(() => openGallery(Number(b.dataset.rp), photos, rt.name), 60); }); }
    });
  }

  function openRate(r) {
    const m = openModal({
      title: `${r.roomName} · ${r.mealLabel}`,
      body: html`<div class="ht-rate-modal">
        <p class="ht-rate-cancel ${r.refundable ? 'is-free' : ''}">${icon(r.refundable ? 'check-circle' : 'info')}${r.refundable ? 'Refundable' : 'Non-refundable'}</p>
        <p class="small">${cancellationText(r)}</p>
        <h3 class="ht-sub">Inclusions</h3>
        <ul class="ht-feat-list">${r.inclusions.map(x => html`<li>${icon('check')}${x}</li>`)}</ul>
        <h3 class="ht-sub">Price per room, per night</h3>
        <dl class="kv ht-nightly">${r.dates.map((d, k) => html`<dt>${fmtDate(d, 'ddd, d MMM')}</dt><dd class="tnum">${money(r.nightly[k])}</dd>`)}</dl>
        <div class="ht-rate-sum">
          <div class="pl"><span>Room charges (${plural(r.rooms, 'room')} × ${plural(r.nights, 'night')})</span><b class="tnum">${money(r.net)}</b></div>
          <div class="pl"><span>${r.taxLabel}</span><b class="tnum">${money(r.tax)}</b></div>
          <div class="pl total"><span>Total</span><b class="tnum">${money(r.gross)}</b></div>
        </div>
        <p class="xs muted">${MEAL_DESC[r.meal]}. Rates are for ${natLabel} nationals.</p>
      </div>`,
      foot: html`<button type="button" class="btn btn-light" data-close>Close</button><button type="button" class="btn btn-primary" data-pick>${selected?.id === r.id ? 'Selected' : 'Select this room'}</button>`,
      onOpen(dlg) { $('[data-pick]', dlg).addEventListener('click', () => { select(r.id); m.close(); }); }
    });
  }

  function openChange() {
    const m = openModal({
      title: 'Change dates & guests', size: 'wide', className: 'ht-modify',
      body: searchCard({ service: 'hotels', tabs: false, id: 'ht-change-form' }),
      onOpen(dlg) {
        bindSearchCard(dlg.querySelector('[data-search-card]'), {
          state: { hotels: { city: h.city, checkin: st.checkin, checkout: st.checkout, rooms: st.rooms, star: 'all', nat: st.nat } },
          onSearch: (svc, query) => {
            if (query.city !== h.city) return go('/hotels/search', { query });
            const next = { in: query.in, out: query.out, rooms: query.rooms, nat: query.nat, rate: selected?.id };
            const same = query.in === st.checkin && query.out === st.checkout && query.rooms === stayQ.rooms && (query.nat || 'IN') === st.nat;
            if (same) m.close(); else go('/hotels/stay/' + h.id, { query: next });
          }
        });
      }
    });
  }

  // ---------------------------------------------------------------- events
  const book = () => { if (selected) go('/hotels/review', { query: { id: h.id, ...stayQ, rate: selected.id } }); };
  const offs = [
    on(el, 'click', '[data-photo]', (e, b) => openGallery(Number(b.dataset.photo))),
    on(el, 'click', '[data-select]', (e, b) => select(b.dataset.select)),
    on(el, 'click', '[data-rate-more]', (e, b) => openRate(findRate(h, b.dataset.rateMore))),
    on(el, 'click', '[data-room-more]', (e, b) => openRoom(h.roomTypes.find(rt => rt.id === b.dataset.roomMore))),
    on(el, 'click', '[data-meal]', (e, b) => { mealFilter = b.dataset.meal; renderRooms(); }),
    on(el, 'click', '[data-change]', () => openChange()),
    on(el, 'click', '[data-book]', book),
    on(el, 'click', '[data-jump]', (e, b) => $('#' + b.dataset.jump, el)?.scrollIntoView({ behavior: 'smooth', block: 'start' })),
    on(el, 'click', '[data-back]', () => {
      // Step back through history only when this exact stay was opened from the results list.
      let fromResults = false;
      try {
        const [p, qs] = (sessionStorage.getItem(FROM_RESULTS_KEY) || '').replace(/^#/, '').split('?');
        const fq = new URLSearchParams(qs || '');
        fromResults = p === '/hotels/stay/' + h.id && fq.get('in') === st.checkin && fq.get('out') === st.checkout && fq.get('rooms') === stayQ.rooms;
        sessionStorage.removeItem(FROM_RESULTS_KEY);
      } catch { /* storage unavailable */ }
      if (fromResults && history.length > 1) history.back(); else location.hash = resultsHref;
    }),
    on(el, 'click', '[data-toggle]', (e, b) => {
      const target = $('#' + b.dataset.toggle, el);
      const open = target.hidden;
      target.hidden = !open;
      b.setAttribute('aria-expanded', String(open));
      $('span', b).textContent = open ? (b.dataset.moreLabel ? 'View less' : 'Read less') : (b.dataset.moreLabel || 'Read more');
    })
  ];
  const strip = $('[data-strip]', el);
  strip.addEventListener('scroll', () => {
    const k = Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth));
    $('[data-strip-count]', el).textContent = `${Math.min(P.length, k + 1)} / ${P.length}`;
  }, { passive: true });

  const unsub = store.subscribe((state, patch) => { if (patch && 'currency' in patch) { renderRooms(); renderAside(); } });

  renderRooms();
  renderAside();

  return () => { offs.forEach(f => f()); unsub(); document.body.classList.remove('has-mobile-cta'); };
}
