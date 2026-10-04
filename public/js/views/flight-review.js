// Flight review — step 2 "Traveller Information" (Flights ✓ → Traveller Information → Seat & Meal → Payment Method → Booking Confirmed).
import { html, raw, icon, mount, on, $, $$ } from '../core/dom.js';
import { money, fmtDate, diffDays, today, plural } from '../core/format.js';
import { go, href } from '../core/router.js';
import { store } from '../core/store.js';
import { AIRPORT } from '../data/airports.js';
import { findItinerary, paxPricing, CABINS } from '../engines/flights.js';
import { parseFlightQuery, flightQuery } from '../ui/search.js';
import { steps, emptyState, priceLines } from '../ui/common.js';
import { journeyCard, fareSummaryHTML } from '../ui/flight-ui.js';
import { openModal } from '../ui/overlay.js';
import { requireLogin } from '../ui/auth.js';
import { toast } from '../ui/toast.js';
import { createDraft, applyPromo } from '../engines/bookings.js';
import { PROMOS } from '../data/promos.js';
import { COMPANY } from '../data/content.js';

export const FLIGHT_STEPS = ['Flights', 'Traveller Information', 'Seat & Meal', 'Payment Method', 'Booking Confirmed'];
const CODES = [['+91', 'India'], ['+971', 'UAE'], ['+1', 'USA / Canada'], ['+44', 'United Kingdom'], ['+65', 'Singapore'], ['+61', 'Australia'], ['+977', 'Nepal'], ['+94', 'Sri Lanka'], ['+880', 'Bangladesh'], ['+960', 'Maldives'], ['+966', 'Saudi Arabia'], ['+974', 'Qatar'], ['+968', 'Oman'], ['+965', 'Kuwait'], ['+973', 'Bahrain'], ['+60', 'Malaysia'], ['+66', 'Thailand'], ['+49', 'Germany'], ['+33', 'France']];
const ageOn = (dob, on) => { if (!dob) return null; const a = new Date(dob), b = new Date(on); let y = b.getFullYear() - a.getFullYear(); if (b.getMonth() < a.getMonth() || (b.getMonth() === a.getMonth() && b.getDate() < a.getDate())) y--; return y; };

export default async function review(el, ctx) {
  const s = parseFlightQuery(ctx.query);
  const out = findItinerary(ctx.query.get('ob') || '');
  const ret = ctx.query.get('ib') ? findItinerary(ctx.query.get('ib')) : null;
  const outFare = out?.fares.find(f => f.id === ctx.query.get('obf')) || out?.cheapest;
  const retFare = ret ? (ret.fares.find(f => f.id === ctx.query.get('ibf')) || ret.cheapest) : null;
  const backHref = href('/flights/search', { ...flightQuery(s), ob: ctx.query.get('ob'), obf: ctx.query.get('obf'), ib: ctx.query.get('ib') || undefined, ibf: ctx.query.get('ibf') || undefined });
  if (!out || (ctx.query.get('ib') && !ret)) {
    mount(el, html`<section class="page"><div class="wrap-narrow">${emptyState({ iconName: 'refresh', title: 'This fare is no longer available', text: 'Fares change often. Please search again to see the latest prices.', action: html`<a class="btn btn-primary" href="${href('/flights/search', flightQuery(s))}">Search again</a>` })}</div></section>`);
    return;
  }
  document.title = 'Review your flight — AeroSkys';
  const pax = { adt: s.adt, chd: s.chd, inf: s.inf };
  const journeys = [{ from: out.from, to: out.to, date: out.date, itinerary: out, fare: outFare }, ...(ret ? [{ from: ret.from, to: ret.to, date: ret.date, itinerary: ret, fare: retFare }] : [])];
  const intl = !out.dom;
  const exclusive = journeys.some(j => j.fare.exclusive);
  const lastDate = journeys[journeys.length - 1].date;
  const user = store.get('user');
  const saved = store.get('travellers') || [];
  const st = { promo: null };

  const travellers = [];
  for (let i = 0; i < pax.adt; i++) travellers.push({ type: 'Adult', n: i + 1 });
  for (let i = 0; i < pax.chd; i++) travellers.push({ type: 'Child', n: i + 1 });
  for (let i = 0; i < pax.inf; i++) travellers.push({ type: 'Infant', n: i + 1 });
  const needDob = t => t.type !== 'Adult' || intl || s.fare === 'senior';

  const priced = () => {
    const parts = journeys.map(j => paxPricing(j.itinerary, j.fare, pax));
    const base = parts.reduce((a, p) => a + p.base, 0), tax = parts.reduce((a, p) => a + p.tax, 0), discount = parts.reduce((a, p) => a + p.discount, 0);
    const promo = st.promo?.amount || 0;
    return { base, tax, discount, promo, total: Math.round((base + tax - discount - promo) * 100) / 100 };
  };

  const travellerForm = (t, i) => {
    const titles = t.type === 'Adult' ? ['Mr', 'Mrs', 'Ms'] : ['Master', 'Miss'];
    const p = `t${i}`;
    const sub = t.type === 'Adult' ? (s.fare === 'senior' ? '60 years & above' : '12 years & above') : t.type === 'Child' ? '2 – 12 years' : 'Under 2 years';
    return html`<details class="co-trav" ${i === 0 ? raw('open') : ''} data-trav="${i}">
      <summary><span class="co-trav-n">${icon(t.type === 'Infant' ? 'baby' : 'user')}</span><span class="grow"><b>${t.type} ${t.n}</b><small data-trav-label="${i}">${sub}</small></span><span class="co-trav-state" data-trav-state="${i}"></span>${icon('chevron-down')}</summary>
      <div class="co-trav-body">
        ${saved.length && t.type === 'Adult' ? html`<div class="chip-scroll" style="margin-bottom:12px">${saved.map((sv, k) => html`<button type="button" class="chip" data-use-saved="${i}:${k}">${icon('user')} ${sv.first} ${sv.last}</button>`)}</div>` : ''}
        <div class="field"><span class="field-label">Title <span class="req">*</span></span><div class="pills" role="radiogroup" aria-label="Title">${titles.map((ti, k) => html`<button type="button" class="pill" data-title="${i}" data-v="${ti}" aria-pressed="${k === 0}">${ti}</button>`)}</div><input type="hidden" name="${p}_title" value="${titles[0]}"></div>
        <div class="form-grid" style="margin-top:14px">
          <div class="field"><label for="${p}_first">First Name / Given Name <span class="req">*</span></label><input class="input" id="${p}_first" name="${p}_first" autocomplete="${i === 0 ? 'given-name' : 'off'}" placeholder="First Name/Given Name"><span class="field-error" role="alert"></span></div>
          <div class="field"><label for="${p}_last">Last Name / Surname <span class="req">*</span></label><input class="input" id="${p}_last" name="${p}_last" autocomplete="${i === 0 ? 'family-name' : 'off'}" placeholder="Last Name/Surname"><span class="field-error" role="alert"></span></div>
          ${needDob(t) ? html`<div class="field"><label for="${p}_dob">Date of Birth <span class="req">*</span></label><input class="input" type="date" id="${p}_dob" name="${p}_dob" max="${today()}"><span class="field-error" role="alert"></span></div>` : ''}
          ${intl ? html`
            <div class="field"><label for="${p}_nat">Nationality <span class="req">*</span></label><select class="select" id="${p}_nat" name="${p}_nat">${['Indian', 'Nepali', 'Sri Lankan', 'Bangladeshi', 'British', 'American', 'Canadian', 'Australian', 'Emirati', 'Singaporean', 'Other'].map(n => html`<option>${n}</option>`)}</select></div>
            <div class="field"><label for="${p}_pp">Passport Number <span class="req">*</span></label><input class="input" id="${p}_pp" name="${p}_pp" placeholder="e.g. Z1234567" autocapitalize="characters"><span class="field-error" role="alert"></span></div>
            <div class="field"><label for="${p}_ppx">Passport Expiry <span class="req">*</span></label><input class="input" type="date" id="${p}_ppx" name="${p}_ppx" min="${today()}"><span class="field-error" role="alert"></span></div>` : ''}
        </div>
        ${i === 0 ? html`<p class="field-hint" style="margin-top:10px">${icon('info')} Enter names exactly as on the government ID ${intl ? 'or passport ' : ''}you will carry.${s.fare === 'student' ? ' Student fare: carry a valid student ID at check-in.' : ''}${s.fare === 'senior' ? ' Senior citizen fare: carry valid age proof.' : ''}</p>` : ''}
        ${user && t.type === 'Adult' ? html`<label class="check small" style="margin-top:12px"><input type="checkbox" name="${p}_save"> Save this traveller to my profile</label>` : ''}
      </div>
    </details>`;
  };

  const summaryHTML = () => {
    const p = priced();
    return html`<div class="co-card co-fare">
      <div class="spread"><h2 class="h4">Fare Summary</h2><button type="button" class="text-btn small" data-fare-rules>View Fare Rules</button></div>
      <div style="margin-top:14px">${priceLines([
        { label: 'Base Fare', sub: plural(s.adt + s.chd + s.inf, 'traveller'), amount: p.base },
        { label: 'Tax & Charges', amount: p.tax },
        { label: 'Instant Discount', amount: p.discount, neg: true, cls: 'green', decimals: true },
        p.promo ? { label: `Promo (${st.promo.code})`, amount: p.promo, neg: true, cls: 'green' } : null
      ], p.total)}</div>
      <div class="co-promo">
        <h3 class="h4" style="font-size:.9rem">Promo Code</h3>
        ${st.promo ? html`<div class="note note-green">${icon('check-circle')}<span><b>${st.promo.code}</b> applied — ${money(st.promo.amount)} off. <button type="button" class="link" data-remove-promo>Remove</button></span></div>`
          : html`<form class="input-group" data-promo-form novalidate><input class="input" name="code" placeholder="Enter promo code" autocapitalize="characters" aria-label="Promo code"><button class="btn btn-dark" type="submit" style="border-radius:0 12px 12px 0">Apply</button></form>
          <p class="field-error" data-promo-error role="alert"></p>
          <div class="co-codes">${PROMOS.filter(x => x.services.includes('flight')).map(x => html`<button type="button" class="co-code" data-quick-promo="${x.code}"><b>${x.code}</b><small>${x.label}</small></button>`)}</div>`}
      </div>
    </div>
    <div class="co-card co-help">
      <div class="spread"><h3 class="h4" style="font-size:.95rem">Need Assistance? Talk to Our Experts</h3><span class="badge badge-green"><i class="co-live"></i>Available Now</span></div>
      <p class="small muted" style="margin:6px 0 12px">Get help with your booking before you pay.</p>
      <div class="row gap-8"><a class="btn btn-light btn-sm" href="tel:${COMPANY.phoneIntl}">${icon('phone')} Call</a><a class="btn btn-light btn-sm" href="https://wa.me/${COMPANY.phoneIntl.slice(1)}" target="_blank" rel="noopener">${icon('chat')} WhatsApp</a></div>
    </div>`;
  };

  mount(el, html`<section class="page co-page">
    <div class="wrap-wide">
      <div class="co-top">
        <div><h1 class="h3">Review your flight details</h1><p class="muted small">Please review your itinerary and traveller details before continuing</p></div>
        <a class="text-btn" href="${backHref}">${icon('chevron-left')} Back to Search</a>
      </div>
      ${steps(FLIGHT_STEPS, 1)}
      <div class="co-layout">
        <form class="co-main" data-review novalidate autocomplete="on">
          <div class="co-card co-journeys">${journeys.map((j, i) => journeyCard(j, { label: i ? 'Return' : 'Depart', pax, open: true }))}
            ${exclusive ? html`<div class="note note-amber" style="margin-top:12px">${icon('thumb')}<span><b>Exclusive fare:</b> confirmation takes 30–45 minutes; non-refundable and non-changeable. Seats, meals and other add-ons can be bought at web check-in.</span></div>` : ''}
          </div>

          <div class="co-card">
            <div class="co-sec-head"><h2 class="h4">Travellers Details</h2><span class="muted small">${[pax.adt && `Adult × ${pax.adt}`, pax.chd && `Child × ${pax.chd}`, pax.inf && `Infant × ${pax.inf}`].filter(Boolean).join(' · ')}</span></div>
            <div class="co-travs">${travellers.map(travellerForm)}</div>
          </div>

          <div class="co-card">
            <div class="co-sec-head"><h2 class="h4">Contact Details</h2></div>
            <p class="small"><b>Stay informed about your trip</b></p>
            <p class="small muted" style="margin:4px 0 14px">Enter a valid email address and mobile number. Booking confirmations, schedule changes, and support updates will be sent to these details — please verify they are correct before you continue.</p>
            <div class="form-grid">
              <div class="field"><label for="c_phone">Contact Number <span class="req">*</span></label><div class="input-group"><select class="select" name="c_cc" aria-label="Country code">${CODES.map(([c, n]) => html`<option value="${c}">${c} | ${n}</option>`)}</select><input class="input" id="c_phone" name="c_phone" inputmode="tel" autocomplete="tel-national" placeholder="Contact Number" value="${user?.phone || ''}"></div><span class="field-error" role="alert"></span></div>
              <div class="field"><label for="c_email">Contact Email <span class="req">*</span></label><input class="input" id="c_email" name="c_email" type="email" autocomplete="email" placeholder="Contact Email" value="${user?.email || ''}"><span class="field-error" role="alert"></span></div>
            </div>
          </div>

          <div class="co-card">
            <label class="check co-gst-toggle"><input type="checkbox" data-gst ${exclusive ? raw('disabled') : ''}><span><b>Use GSTIN for this booking (Optional)</b><br><small class="muted">To claim credit of GST charged by airlines, please enter your company's GST number${exclusive ? '. Not available on Exclusive fares.' : ''}</small></span></label>
            <div class="form-grid" data-gst-fields hidden style="margin-top:16px">
              <div class="field"><label for="g_no">GST Number</label><input class="input" id="g_no" name="g_no" placeholder="e.g. 07AAACJ1234K1Z5" autocapitalize="characters"><span class="field-error" role="alert"></span></div>
              <div class="field"><label for="g_co">Registered Company Name</label><input class="input" id="g_co" name="g_co"><span class="field-error" role="alert"></span></div>
              <div class="field"><label for="g_em">Registered Email</label><input class="input" id="g_em" name="g_em" type="email"><span class="field-error" role="alert"></span></div>
              <div class="field"><label for="g_ph">Registered Phone</label><input class="input" id="g_ph" name="g_ph" inputmode="tel"><span class="field-error" role="alert"></span></div>
              <div class="field span-2"><label for="g_ad">Registered Address</label><input class="input" id="g_ad" name="g_ad"><span class="field-error" role="alert"></span></div>
            </div>
          </div>

          <div class="co-fineprint">
            <p>Additional convenience fees may be charged by the payment gateway at actuals on Credit/Debit Card, Netbanking, UPI, or any other selected online payment mode.</p>
            <p>If the transaction fails but funds are deducted from your account or card, the booking amount will be credited back to the source account within 7 working days. Convenience fees charged by the payment gateway are non-refundable.</p>
          </div>
          <button class="btn btn-primary btn-lg co-continue" type="submit">CONTINUE BOOKING ${icon('arrow-right')}</button>
        </form>
        <aside class="co-side" data-side>${summaryHTML()}</aside>
      </div>
    </div>
  </section>
  <div class="mobile-cta" data-mcta><div class="mc-price"><small>Total Amount</small><b class="tnum" data-mtotal>${money(priced().total, { decimals: true })}</b><button type="button" class="text-btn small" data-fare-sheet>Fare details ${icon('chevron-up')}</button></div><button class="btn btn-primary" data-submit-m>Continue ${icon('arrow-right')}</button></div>`);
  document.body.classList.add('has-mobile-cta');

  const form = $('[data-review]', el);
  const side = $('[data-side]', el);
  const refreshSide = () => { side.innerHTML = String(summaryHTML()); $('[data-mtotal]', el).textContent = money(priced().total, { decimals: true }); };

  const unbind = [];
  // Title pills
  unbind.push(on(el, 'click', '[data-title]', (e, b) => {
    const i = b.dataset.title;
    $$(`[data-title="${i}"]`, el).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    form.elements[`t${i}_title`].value = b.dataset.v;
  }));
  unbind.push(on(el, 'click', '[data-use-saved]', (e, b) => {
    const [i, k] = b.dataset.useSaved.split(':').map(Number);
    const sv = saved[k];
    form.elements[`t${i}_first`].value = sv.first; form.elements[`t${i}_last`].value = sv.last;
    if (sv.dob && form.elements[`t${i}_dob`]) form.elements[`t${i}_dob`].value = sv.dob;
    const tb = $$(`[data-title="${i}"]`, el).find(x => x.dataset.v === sv.title); tb?.click();
    updateTravState();
  }));
  const updateTravState = () => travellers.forEach((t, i) => {
    const f = form.elements[`t${i}_first`]?.value.trim(), l = form.elements[`t${i}_last`]?.value.trim();
    const box = $(`[data-trav-state="${i}"]`, el);
    if (box) box.innerHTML = f && l ? String(html`<span class="badge badge-green">${icon('check')} ${f} ${l}</span>`) : '';
  });
  unbind.push(on(el, 'input', 'input[name$="_first"],input[name$="_last"]', updateTravState));
  unbind.push(on(el, 'change', '[data-gst]', (e, c) => { $('[data-gst-fields]', el).hidden = !c.checked; }));

  // Promo codes
  const tryPromo = code => {
    const p = priced();
    const r = applyPromo(code, 'flight', p.base + p.tax - p.discount);
    if (r.error) { const er = $('[data-promo-error]', el); if (er) er.textContent = r.error; return; }
    st.promo = { code: r.code, amount: r.amount };
    toast(`${r.code} applied — you save ${money(r.amount)}.`, { title: 'Promo applied' });
    refreshSide();
  };
  unbind.push(on(el, 'submit', '[data-promo-form]', (e, f) => { e.preventDefault(); tryPromo(f.elements.code.value); }));
  unbind.push(on(el, 'click', '[data-quick-promo]', (e, b) => tryPromo(b.dataset.quickPromo)));
  unbind.push(on(el, 'click', '[data-remove-promo]', () => { st.promo = null; refreshSide(); }));
  unbind.push(on(el, 'click', '[data-fare-rules]', () => openModal({ title: 'Fare Rules', size: 'wide', body: html`${journeys.map((j, i) => html`<h3 class="h4" style="margin:${i ? '20px' : '0'} 0 10px">${i ? 'Return' : 'Depart'} · ${AIRPORT[j.from].city} → ${AIRPORT[j.to].city}</h3>${fareSummaryHTML(j.itinerary, j.fare, pax)}`)}` })));
  unbind.push(on(el, 'click', '[data-fare-sheet]', () => openModal({ title: 'Fare Summary', body: summaryHTML(), onOpen: m => {
    on(m, 'click', '[data-quick-promo]', (e, b) => { tryPromo(b.dataset.quickPromo); m.closest('.ovl')?.querySelector('[data-close]')?.click(); });
    on(m, 'submit', '[data-promo-form]', (e, f) => { e.preventDefault(); tryPromo(f.elements.code.value); m.closest('.ovl')?.querySelector('[data-close]')?.click(); });
  } })));

  // Validation & continue
  function validate() {
    let ok = true, first = null;
    const setErr = (name, msg) => {
      const input = form.elements[name]; if (!input) return;
      const f = input.closest('.field'); f.classList.toggle('has-error', !!msg);
      const er = f.querySelector('.field-error'); if (er) er.textContent = msg || '';
      if (msg) { ok = false; if (!first) first = input; const d = input.closest('details'); if (d) d.open = true; }
    };
    travellers.forEach((t, i) => {
      const p = `t${i}`, v = n => (form.elements[`${p}_${n}`]?.value || '').trim();
      setErr(`${p}_first`, !v('first') ? 'First name is required' : !/^[A-Za-z][A-Za-z .'-]{0,49}$/.test(v('first')) ? 'Use letters only' : '');
      setErr(`${p}_last`, !v('last') ? 'Last name is required' : !/^[A-Za-z][A-Za-z .'-]{0,49}$/.test(v('last')) ? 'Use letters only' : '');
      if (form.elements[`${p}_dob`]) {
        const age = ageOn(v('dob'), lastDate);
        let msg = !v('dob') ? 'Date of birth is required' : '';
        if (!msg && t.type === 'Child' && (age < 2 || age >= 12)) msg = 'A child must be 2–11 years old on the travel date';
        if (!msg && t.type === 'Infant' && (age < 0 || age >= 2 || diffDays(v('dob'), today()) < 8)) msg = 'An infant must be under 2 years (and at least 8 days) on the travel date';
        if (!msg && t.type === 'Adult' && age < 12) msg = 'An adult must be 12 years or older';
        if (!msg && t.type === 'Adult' && s.fare === 'senior' && age < 60) msg = 'Senior citizen fares need travellers aged 60 or above';
        setErr(`${p}_dob`, msg);
      }
      if (intl) {
        setErr(`${p}_pp`, !/^[A-Za-z0-9]{6,12}$/.test(v('pp')) ? 'Enter a valid passport number' : '');
        setErr(`${p}_ppx`, !v('ppx') ? 'Passport expiry is required' : diffDays(lastDate, v('ppx')) < 180 ? 'Passport must be valid for 6 months after travel' : '');
      }
    });
    const phone = form.elements.c_phone.value.replace(/\D/g, ''), cc = form.elements.c_cc.value;
    setErr('c_phone', cc === '+91' ? (/^[6-9]\d{9}$/.test(phone) ? '' : 'Enter a valid 10-digit mobile number') : (/^\d{6,14}$/.test(phone) ? '' : 'Enter a valid phone number'));
    setErr('c_email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.elements.c_email.value.trim()) ? '' : 'Enter a valid email address');
    if ($('[data-gst]', el).checked) {
      setErr('g_no', /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(form.elements.g_no.value.trim().toUpperCase()) ? '' : 'Enter a valid 15-character GSTIN');
      setErr('g_co', form.elements.g_co.value.trim() ? '' : 'Company name is required');
      setErr('g_em', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.elements.g_em.value.trim()) ? '' : 'Enter a valid email');
      setErr('g_ph', /^\d{10}$/.test(form.elements.g_ph.value.replace(/\D/g, '')) ? '' : 'Enter a valid phone number');
      setErr('g_ad', form.elements.g_ad.value.trim() ? '' : 'Address is required');
    }
    if (first) { first.focus({ preventScroll: true }); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    return ok;
  }

  async function submit(e) {
    e?.preventDefault();
    if (!validate()) { toast('Please check the highlighted details.', { type: 'error' }); return; }
    const u = await requireLogin('Log in or sign up to complete your booking. We’ll send your e-ticket to your account.');
    if (!u) return;
    const val = n => (form.elements[n]?.value || '').trim();
    const trav = travellers.map((t, i) => ({ type: t.type, title: val(`t${i}_title`), first: val(`t${i}_first`), last: val(`t${i}_last`), dob: val(`t${i}_dob`) || null, nationality: val(`t${i}_nat`) || null, passport: val(`t${i}_pp`) || null, passportExpiry: val(`t${i}_ppx`) || null }));
    const toSave = travellers.map((t, i) => form.elements[`t${i}_save`]?.checked ? trav[i] : null).filter(Boolean);
    if (toSave.length) store.update(st2 => { toSave.forEach(tv => { if (!st2.travellers.some(x => x.first === tv.first && x.last === tv.last)) st2.travellers.push({ title: tv.title, first: tv.first, last: tv.last, dob: tv.dob }); }); });
    const p = priced();
    const A = AIRPORT[s.from], B = AIRPORT[s.to];
    const id = createDraft({
      type: 'flight',
      title: `${A.city} ${ret ? '⇄' : '→'} ${B.city}`,
      subtitle: `${fmtDate(out.date, 'ddd, d MMM')}${ret ? ' – ' + fmtDate(ret.date, 'ddd, d MMM') : ''} · ${plural(travellers.length, 'Traveller')} · ${CABINS[s.cabin]}`,
      returnTo: location.hash,
      item: { trip: ret ? 'round' : 'oneway', journeys, pax, cabin: s.cabin, special: s.fare, exclusive, addons: null, query: flightQuery(s) },
      travellers: trav,
      contact: { name: `${trav[0].first} ${trav[0].last}`, email: val('c_email').toLowerCase(), phone: val('c_phone').replace(/\D/g, ''), countryCode: val('c_cc') },
      gst: $('[data-gst]', el).checked ? { number: val('g_no').toUpperCase(), company: val('g_co'), email: val('g_em'), phone: val('g_ph'), address: val('g_ad') } : null,
      promo: st.promo,
      pricing: {
        lines: [{ label: 'Base Fare', amount: p.base }, { label: 'Tax & Charges', amount: p.tax }, { label: 'Instant Discount', amount: p.discount, neg: true }, ...(p.promo ? [{ label: `Promo (${st.promo.code})`, amount: p.promo, neg: true }] : [])],
        base: p.base, tax: p.tax, discount: p.discount, promo: p.promo, addons: 0, total: p.total
      }
    });
    if (exclusive) { toast('Exclusive fares don’t allow seat or meal selection while booking — you can add them at web check-in.', { type: 'info' }); go('/checkout', { query: { d: id } }); }
    else go('/flights/addons', { query: { d: id } });
  }
  form.addEventListener('submit', submit);
  unbind.push(on(el, 'click', '[data-submit-m]', submit));

  // Prefill from the logged-in user
  if (user) {
    const [fn, ...ln] = user.name.split(' ');
    if (form.elements.t0_first && !form.elements.t0_first.value) { form.elements.t0_first.value = fn; form.elements.t0_last.value = ln.join(' '); updateTravState(); }
  }
  const unsub = store.subscribe((stt, patch) => { if ('currency' in patch) refreshSide(); });
  return () => { unbind.forEach(f => f()); unsub(); document.body.classList.remove('has-mobile-cta'); };
}
