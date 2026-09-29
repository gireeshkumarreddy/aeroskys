// Hotel Review — hotel information, login gate, lead guest per room, contact, special
// requests, optional GST, promo code and PRICE BREAK-UP → checkout draft.
import { html, raw, icon, mount, on, $, img } from '../core/dom.js';
import { money, fmtDate, plural } from '../core/format.js';
import { href, go } from '../core/router.js';
import { store } from '../core/store.js';
import { parseHotelQuery, roomsToParam } from '../ui/search.js';
import { steps, emptyState, protoNote, validateForm, V, field, stars, ratingBadge, initials } from '../ui/common.js';
import { requireLogin, currentUser } from '../ui/auth.js';
import { toast } from '../ui/toast.js';
import { createDraft, applyPromo } from '../engines/bookings.js';
import { getHotel, findRate, photoUrl, PHOTO_FALLBACK, cancellationText, CANCELLATION_POLICY, REFUND_NOTE } from '../engines/hotels.js';
import { PROMOS } from '../data/promos.js';

const MEAL_ICON = { RO: 'bed', BB: 'coffee', HB: 'meal', FB: 'meal' };
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const REQUESTS = ['Early check-in', 'Late check-out', 'High floor', 'Twin beds', 'Non-smoking room', 'Airport transfer'];
const cap = v => v.replace(/\s+/g, ' ').replace(/(^|[\s'-])([a-z])/g, (m, a, b) => a + b.toUpperCase());

export default async function hotelReview(el, ctx) {
  const q = ctx.query;
  const s = parseHotelQuery(q);
  const h = q.get('id') ? getHotel(q.get('id'), s) : null;
  const rate = h && !h.soldOut ? (findRate(h, q.get('rate')) || h.cheapest) : null;
  document.title = 'Hotel Review — AeroSkys';
  if (!h || !rate) {
    mount(el, html`<section class="page"><div class="wrap-narrow">${steps(['Hotel', 'Guest Details', 'Payment', 'Booking Confirmed'], 1)}<div style="margin-top:24px">${emptyState({
      iconName: 'bed', title: h ? 'This room is no longer available' : 'We couldn’t find this stay',
      text: h ? 'Rooms for these dates have just sold out. Please choose different dates or another room.' : 'The link may be out of date. Start a new hotel search.',
      action: h ? html`<a class="btn btn-primary" href="${href('/hotels/stay/' + h.id, { in: h.stay.checkin, out: h.stay.checkout, rooms: roomsToParam(h.stay.rooms) })}">Back to ${h.name}</a>` : html`<a class="btn btn-primary" href="#/hotels">Search hotels</a>`
    })}</div></div></section>`);
    return;
  }
  const st = h.stay;
  const stayQ = { in: st.checkin, out: st.checkout, rooms: roomsToParam(st.rooms), nat: st.nat !== 'IN' ? st.nat : undefined };
  const detailsHref = href('/hotels/stay/' + h.id, { ...stayQ, rate: rate.id });
  const prev = Object.values(store.get('drafts') || {}).filter(d => d.type === 'hotel' && d.item?.hotelId === h.id).sort((a, b) => b.createdAt - a.createdAt)[0] || null;
  let promo = null;
  if (prev?.promo?.code) { const p = applyPromo(prev.promo.code, 'hotel', rate.gross); if (!p.error) promo = p; }
  let gstOpen = !!prev?.gst;
  let lastUser = currentUser();
  const payable = () => Math.max(0, rate.gross - (promo?.amount || 0));
  const kids = st.children ? ` | ${plural(st.children, 'Child', 'Children')}` : '';

  mount(el, html`
    <section class="page ht-review">
      <div class="wrap">
        ${steps(['Hotel', 'Guest Details', 'Payment', 'Booking Confirmed'], 1)}
        <div class="ht-rv-head">
          <div><span class="eyebrow">Almost there</span><h1 class="h2">Hotel <em>Review</em></h1></div>
          <a class="btn btn-light btn-sm" href="${detailsHref}">${icon('arrow-left')} Change room</a>
        </div>
        <div class="ht-rv-grid">
          <div class="ht-rv-main">
            <article class="card ht-hinfo" aria-labelledby="ht-hinfo-t">
              <h2 class="ht-rv-title" id="ht-hinfo-t">${icon('building')} Hotel Information</h2>
              <div class="ht-hinfo-top">
                <div class="ht-hinfo-img">${img(photoUrl(h.cover, 480), { alt: h.name, fallback: PHOTO_FALLBACK })}</div>
                <div class="ht-hinfo-body">
                  <div class="ht-card-top"><span class="ht-type">${h.type}</span>${stars(h.stars)}</div>
                  <h3 class="ht-hinfo-name">${h.name}</h3>
                  <p class="ht-card-loc">${icon('pin')}<span>${h.address}</span></p>
                  <div class="ht-card-rating">${ratingBadge(h.rating)}<b>${h.ratingLabel}</b><span>${h.reviews.toLocaleString('en-IN')} reviews</span></div>
                </div>
              </div>
              <div class="ht-hinfo-dates">
                <div><span>Check-In</span><b>${fmtDate(st.checkin, 'ddd, d MMM yyyy')}</b><small>From ${h.checkinTime}</small></div>
                <div class="ht-hinfo-n">${plural(st.nights, 'Night')}</div>
                <div><span>Check-Out</span><b>${fmtDate(st.checkout, 'ddd, d MMM yyyy')}</b><small>Until ${h.checkoutTime}</small></div>
              </div>
              <p class="ht-hinfo-meta">${plural(st.nights, 'Night')} | ${plural(st.adults, 'Adult')}${kids} | ${plural(st.roomCount, 'Room')}</p>
              <div class="ht-hinfo-room">
                <div><b>${rate.roomName}</b><span>${rate.beds}</span></div>
                <div class="ht-hinfo-tags"><span>${icon(MEAL_ICON[rate.meal])}${rate.mealLabel}</span><span class="ht-rate-cancel ${rate.refundable ? 'is-free' : ''}">${rate.refundable ? html`${icon('check-circle')}Free cancellation until ${fmtDate(rate.freeCancelUntil, 'd MMM yyyy')}` : html`${icon('info')}Non-refundable`}</span></div>
                <details class="ht-policy"><summary>Cancellation policy ${icon('chevron-down')}</summary><p>${cancellationText(rate)}</p><p>${CANCELLATION_POLICY}</p><p>${REFUND_NOTE}</p></details>
              </div>
            </article>
            <article class="card ht-gate" data-gate aria-live="polite"></article>
            <div data-form-host></div>
          </div>
          <aside class="ht-rv-aside">
            <div class="card ht-summary" data-summary></div>
            <div class="card ht-promo-card" data-promo></div>
            ${protoNote('Prototype: availability and prices are simulated and nothing is charged. Payment happens on the next step.')}
          </aside>
        </div>
      </div>
    </section>
    <div class="mobile-cta" data-mcta></div>`);

  // ---------------------------------------------------------------- login gate & form
  function renderGate() {
    const u = currentUser();
    $('[data-gate]', el).innerHTML = String(u
      ? html`<div class="ht-gate-in is-ok"><span class="avatar">${initials(u.name)}</span><div class="grow"><b>Logged in as ${u.name}</b><small>${u.email || '+91 ' + u.phone} · This booking will appear in My Trips</small></div><span class="badge badge-green">${icon('check')} Verified</span></div>`
      : html`<div class="ht-gate-in"><span class="ht-gate-ic">${icon('lock')}</span><div class="grow"><h2 class="h4">Log-in to your Website Account</h2><p class="small muted">Log in or sign up with a one-time password to add guest details, apply offers and keep this booking in My Trips.</p></div><button type="button" class="btn btn-dark" data-login>${icon('login')} Log in to continue</button></div>`);
  }

  function formHTML(u) {
    const pg = prev?.item?.guests || [];
    const [uf, ...ul] = String(u.name || '').trim().split(/\s+/);
    const guestVal = (i, k) => pg[i]?.[k] || (i === 0 ? { first: uf || '', last: ul.join(' ') }[k] || '' : '');
    const c = prev?.contact || {}, g = prev?.gst || {};
    const special = prev?.item?.specialRequest || '';
    return html`<form class="ht-rv-form" data-form novalidate>
      <article class="card ht-sec" aria-labelledby="ht-guests-t">
        <h2 class="ht-rv-title" id="ht-guests-t">${icon('users')} Guest Details</h2>
        <p class="small muted ht-sec-lead">Enter the lead guest for each room exactly as on their photo ID.</p>
        ${st.rooms.map((r0, i) => html`<fieldset class="ht-guest">
          <legend>Room ${i + 1} <small>${plural(r0.adults, 'Adult')}${r0.children ? `, ${plural(r0.children, 'Child', 'Children')} (age ${r0.ages.map(a => (a === 0 ? '<1' : a)).join(', ')})` : ''} · Lead guest</small></legend>
          <div class="ht-guest-grid">
            ${field({ name: `title_${i}`, label: 'Title', options: [['', 'Select'], 'Mr', 'Mrs', 'Ms'], value: guestVal(i, 'title'), required: true, cls: 'ht-f-title' })}
            ${field({ name: `first_${i}`, label: 'First name', value: guestVal(i, 'first'), required: true, placeholder: 'As on ID', autocomplete: i === 0 ? 'given-name' : 'off' })}
            ${field({ name: `last_${i}`, label: 'Last name', value: guestVal(i, 'last'), required: true, placeholder: 'As on ID', autocomplete: i === 0 ? 'family-name' : 'off' })}
          </div>
        </fieldset>`)}
      </article>
      <article class="card ht-sec" aria-labelledby="ht-contact-t">
        <h2 class="ht-rv-title" id="ht-contact-t">${icon('mail')} Contact Details</h2>
        <div class="form-grid">
          ${field({ name: 'email', label: 'Email address', type: 'email', value: c.email || u.email || '', required: true, autocomplete: 'email', placeholder: 'name@email.com', hint: 'Your hotel voucher will be sent here' })}
          <div class="field"><label for="ht-phone">Mobile number <span class="req" aria-hidden="true">*</span></label>
            <div class="input-group ht-phone"><span class="ht-cc" aria-hidden="true">+91</span><input id="ht-phone" class="input" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="14" value="${c.phone || u.phone || ''}" placeholder="10-digit mobile number" aria-describedby="ht-phone-h"></div>
            <span class="field-hint" id="ht-phone-h">Booking updates are sent by SMS to this number (+91)</span><span class="field-error" role="alert"></span></div>
        </div>
      </article>
      <article class="card ht-sec" aria-labelledby="ht-req-t">
        <h2 class="ht-rv-title" id="ht-req-t">${icon('chat')} Special Requests <small>(optional)</small></h2>
        <div class="chip-row ht-req-chips" role="group" aria-label="Common requests">${REQUESTS.map(x => html`<button type="button" class="chip" data-req="${x}" aria-pressed="${special.includes(x)}">${x}</button>`)}</div>
        ${field({ name: 'special', label: 'Anything the hotel should know?', type: 'textarea', value: special, placeholder: 'e.g. arriving late at night, celebrating an anniversary…', hint: 'Requests are shared with the property and are subject to availability.', attrs: 'maxlength="300"' })}
      </article>
      <article class="card ht-sec" aria-labelledby="ht-gst-t">
        <h2 class="ht-rv-title" id="ht-gst-t">${icon('receipt')} GST Details <small>(optional)</small></h2>
        <label class="check"><input type="checkbox" data-gst-toggle ${gstOpen ? raw('checked') : ''} aria-controls="ht-gst-fields"><span>I have a GST number and want a GST invoice for this booking</span></label>
        <div class="form-grid ht-gst" id="ht-gst-fields" ${gstOpen ? '' : raw('hidden')}>
          ${field({ name: 'gst_number', label: 'GST number', value: g.number || '', required: true, placeholder: '22AAAAA0000A1Z5', attrs: 'maxlength="15" autocapitalize="characters" spellcheck="false"' })}
          ${field({ name: 'gst_company', label: 'Company name', value: g.company || '', required: true, autocomplete: 'organization' })}
          ${field({ name: 'gst_email', label: 'Company email', type: 'email', value: g.email || '', required: true })}
          ${field({ name: 'gst_phone', label: 'Company phone', type: 'tel', value: g.phone || '', required: true, attrs: 'inputmode="numeric" maxlength="14"' })}
          ${field({ name: 'gst_address', label: 'Company address', value: g.address || '', required: true, cls: 'span-2', autocomplete: 'street-address' })}
        </div>
      </article>
      <div class="field ht-terms"><label class="check"><input type="checkbox" name="terms" value="yes"><span>I have read and accept the <a class="link" href="#/cancellation-policy" target="_blank" rel="noopener">Cancellation Policy</a>, <a class="link" href="#/terms" target="_blank" rel="noopener">Terms &amp; Conditions</a> and the hotel’s policies.</span></label><span class="field-error" role="alert"></span></div>
      <button type="submit" class="btn btn-primary btn-lg ht-rv-submit">Continue to Payment ${icon('arrow-right')}</button>
    </form>`;
  }

  function renderForm() {
    const u = currentUser();
    const host = $('[data-form-host]', el);
    host.innerHTML = u ? String(formHTML(u)) : String(html`<div class="card ht-locked" aria-hidden="true">
      ${[['users', 'Guest Details', 'Lead guest name for each room'], ['mail', 'Contact Details', 'Email and +91 mobile number'], ['chat', 'Special Requests', 'Early check-in, high floor and more'], ['receipt', 'GST Details', 'Optional GST invoice']].map(([ic, t, d]) => html`<div class="ht-locked-row">${icon(ic)}<div><b>${t}</b><small>${d}</small></div>${icon('lock')}</div>`)}
    </div>`);
  }

  // ---------------------------------------------------------------- summary, promo & CTA
  function renderSummary() {
    $('[data-summary]', el).innerHTML = String(html`<h2 class="ht-rv-title">${icon('receipt')} Price Break-up</h2>
      <div class="price-lines">
        <div class="pl"><span>Net Fare <small class="muted">${plural(st.roomCount, 'Room')} × ${plural(st.nights, 'Night')}</small></span><span class="tnum">${money(rate.net)}</span></div>
        <div class="pl"><span>Tax Fare (+) <small class="muted">${rate.taxLabel}</small></span><span class="tnum">${money(rate.tax)}</span></div>
        ${promo ? html`<div class="pl green"><span>Promo (−) <small>${promo.code}</small></span><span class="tnum">− ${money(promo.amount)}</span></div>` : ''}
        <div class="pl total"><span>Payable Amount</span><span class="tnum">${money(payable())}</span></div>
      </div>
      ${rate.strike ? html`<p class="ht-save">${icon('tag')} You save ${money(rate.strike - rate.net + (promo?.amount || 0))} on this stay</p>` : ''}
      <button type="button" class="btn btn-primary btn-lg btn-block ht-summary-cta" data-continue>${currentUser() ? 'Continue to Payment' : 'Log in to continue'} ${icon('arrow-right')}</button>`);
    $('[data-mcta]', el).innerHTML = String(html`<div class="mc-price"><b class="tnum">${money(payable())}</b><small>Payable amount · ${plural(st.nights, 'night')}</small></div><button type="button" class="btn btn-primary" data-continue>${currentUser() ? 'Continue' : 'Log in'}</button>`);
  }

  function renderPromo(error = '', typed = '') {
    const offers = PROMOS.filter(p => p.services.includes('hotel'));
    $('[data-promo]', el).innerHTML = String(html`<h2 class="ht-rv-title">${icon('tag')} Promo Code</h2>
      ${promo ? html`<div class="ht-promo-ok">${icon('check-circle')}<div class="grow"><b>${promo.code} applied</b><small>${promo.label} · You save ${money(promo.amount)}</small></div><button type="button" class="text-btn" data-promo-remove>Remove</button></div>`
        : html`<form class="ht-promo-form" data-promo-form novalidate>
          <div class="field ${error ? 'has-error' : ''}"><label for="ht-promo" class="sr-only">Promo code</label>
            <div class="ht-promo-row"><input id="ht-promo" class="input" name="code" value="${typed}" placeholder="Enter promo code" autocomplete="off" autocapitalize="characters" spellcheck="false" ${error ? raw('aria-invalid="true"') : ''}><button class="btn btn-dark" type="submit">Apply</button></div>
            <span class="field-error" role="alert">${error}</span></div></form>`}
      ${offers.length && !promo ? html`<ul class="ht-offers">${offers.map(p => html`<li><button type="button" class="ht-offer" data-use-promo="${p.code}"><span class="copy-code">${p.code}</span><small>${p.label}</small></button></li>`)}</ul>` : ''}`);
  }

  function applyCode(code) {
    const p = applyPromo(code, 'hotel', rate.gross);
    if (p.error) { renderPromo(p.error, String(code || '').trim().toUpperCase()); $('#ht-promo', el)?.focus(); return; }
    promo = p;
    renderPromo(); renderSummary();
    toast(`${p.code} applied — you save ${money(p.amount)}.`, { title: 'Promo applied' });
  }

  async function login() {
    const u = await requireLogin('Log in to continue with your hotel booking');
    if (u) refreshUser();
    return u;
  }

  function refreshUser() {
    lastUser = currentUser();
    renderGate(); renderForm(); renderSummary();
    if (lastUser) setTimeout(() => $('[data-form] input:not([type=hidden]), [data-form] select', el)?.focus({ preventScroll: true }), 80);
  }

  async function submit() {
    // Logging in reveals the form; the guest fills it before we validate.
    if (!currentUser()) { await login(); return; }
    const form = $('[data-form]', el);
    if (!form) return;
    const rules = {};
    st.rooms.forEach((r0, i) => { rules[`title_${i}`] = V.required('Title'); rules[`first_${i}`] = V.name; rules[`last_${i}`] = V.name; });
    rules.email = V.email;
    rules.phone = V.mobile;
    if (gstOpen) {
      rules.gst_number = v => !v ? 'GST number is required' : !GSTIN.test(v.toUpperCase()) ? 'Enter a valid 15-character GSTIN' : '';
      rules.gst_company = V.required('Company name');
      rules.gst_email = V.email;
      rules.gst_phone = V.mobile;
      rules.gst_address = V.required('Company address');
    }
    rules.terms = v => (v ? '' : 'Please accept the policies to continue');
    const { ok, values } = validateForm(form, rules);
    if (!ok) { toast('Please check the highlighted details.', { type: 'error' }); return; }
    const guests = st.rooms.map((r0, i) => ({ room: i + 1, title: values[`title_${i}`], first: cap(values[`first_${i}`].trim()), last: cap(values[`last_${i}`].trim()) }));
    const lead = guests[0];
    const total = payable();
    const lines = [
      { label: 'Net Fare', sub: `${plural(st.roomCount, 'room')} × ${plural(st.nights, 'night')}`, amount: rate.net },
      { label: 'Tax Fare', sub: rate.taxLabel, amount: rate.tax },
      promo ? { label: `Promo (${promo.code})`, amount: promo.amount, neg: true, cls: 'green' } : null
    ].filter(Boolean);
    const id = createDraft({
      type: 'hotel',
      title: h.name,
      subtitle: `${h.city} · ${fmtDate(st.checkin, 'ddd, d MMM')} – ${fmtDate(st.checkout, 'ddd, d MMM')} · ${plural(st.roomCount, 'room')}, ${plural(st.guests, 'guest')}`,
      returnTo: location.hash,
      item: {
        hotelId: h.id, name: h.name, city: h.city, area: h.area, address: h.address, stars: h.stars, type: h.type, rating: h.rating,
        image: photoUrl(h.cover, 900),
        checkin: st.checkin, checkout: st.checkout, nights: st.nights,
        rooms: st.rooms.map(r0 => ({ adults: r0.adults, children: r0.children, ages: [...r0.ages] })),
        room: { name: rate.roomName, meal: rate.mealLabel, refundable: rate.refundable, freeCancelUntil: rate.freeCancelUntil || null, beds: rate.beds },
        checkinTime: h.checkinTime, checkoutTime: h.checkoutTime,
        guests, specialRequest: String(values.special || '').trim(),
        // Extra context (optional for consumers)
        rateId: rate.id, mealCode: rate.meal, roomCount: st.roomCount, adults: st.adults, children: st.children, nat: st.nat,
        country: h.country, lat: h.lat, lon: h.lon, cancellation: cancellationText(rate), taxLabel: rate.taxLabel
      },
      travellers: guests.map(g => ({ title: g.title, first: g.first, last: g.last, type: 'Adult' })),
      contact: { name: `${lead.first} ${lead.last}`, email: values.email.trim().toLowerCase(), phone: values.phone.replace(/\D/g, '').slice(-10), countryCode: '+91' },
      gst: gstOpen ? { number: values.gst_number.trim().toUpperCase(), company: values.gst_company.trim(), email: values.gst_email.trim().toLowerCase(), phone: values.gst_phone.replace(/\D/g, '').slice(-10), address: values.gst_address.trim() } : null,
      promo: promo ? { code: promo.code, amount: promo.amount } : null,
      pricing: { lines, total, addons: 0 }
    });
    go('/checkout', { query: { d: id } });
  }

  // ---------------------------------------------------------------- events
  const offs = [
    on(el, 'click', '[data-login]', () => login()),
    on(el, 'click', '[data-continue]', () => submit()),
    on(el, 'submit', '[data-form]', e => { e.preventDefault(); submit(); }),
    on(el, 'submit', '[data-promo-form]', (e, f) => { e.preventDefault(); applyCode(f.elements.code.value); }),
    on(el, 'click', '[data-use-promo]', (e, b) => applyCode(b.dataset.usePromo)),
    on(el, 'click', '[data-promo-remove]', () => { promo = null; renderPromo(); renderSummary(); }),
    on(el, 'change', '[data-gst-toggle]', (e, cb) => { gstOpen = cb.checked; $('#ht-gst-fields', el).hidden = !gstOpen; if (gstOpen) $('#ht-gst-fields input', el)?.focus(); }),
    on(el, 'input', '[name^="gst_number"]', (e, inp) => { const p = inp.selectionStart; inp.value = inp.value.toUpperCase(); inp.setSelectionRange?.(p, p); }),
    // Clear a field's error as soon as the guest starts fixing it (form fields and promo code).
    on(el, 'input', '[data-form] input, [data-form] select, [data-form] textarea, #ht-promo', (e, inp) => {
      const f = inp.closest('.field');
      if (!f || !f.classList.contains('has-error')) return;
      f.classList.remove('has-error'); inp.removeAttribute('aria-invalid');
      const m = f.querySelector('.field-error'); if (m) m.textContent = '';
    }),
    on(el, 'click', '[data-req]', (e, b) => {
      const ta = $('[name="special"]', el);
      const items = ta.value.split(/\s*,\s*/).filter(Boolean);
      const x = b.dataset.req, i = items.indexOf(x);
      if (i >= 0) items.splice(i, 1); else items.push(x);
      ta.value = items.join(', ');
      b.setAttribute('aria-pressed', String(i < 0));
    })
  ];
  const unsub = store.subscribe((state, patch) => {
    if (state.user !== lastUser) refreshUser();
    else if (patch && 'currency' in patch) { renderSummary(); renderPromo(); }
  });

  renderGate(); renderForm(); renderSummary(); renderPromo();
  document.body.classList.add('has-mobile-cta');
  return () => { offs.forEach(f => f()); unsub(); document.body.classList.remove('has-mobile-cta'); };
}
