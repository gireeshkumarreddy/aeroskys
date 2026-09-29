// Bus review (#/bus/review?bus=…&seats=…&bp=…&dp=…): trip summary, passenger details per seat,
// contact, login gate, promo code, fare summary and cancellation policy → draft → #/checkout.
// Everything is rebuilt from the deterministic engine, so a refresh shows the same trip.
import { html, raw, icon, mount, on, $, $$, debounce, isMobile } from '../core/dom.js';
import { money, fmtDate, plural } from '../core/format.js';
import { go, href } from '../core/router.js';
import { store } from '../core/store.js';
import { toast } from '../ui/toast.js';
import { steps, priceLines, emptyState, validateForm, V, protoNote } from '../ui/common.js';
import { requireLogin, currentUser } from '../ui/auth.js';
import { createDraft, applyPromo } from '../engines/bookings.js';
import { findBus, seatLayout, fareFor, isBookable, hrsLabel, MAX_SEATS } from '../engines/buses.js';
import { opMark, rateBadge, amenityList, policyHTML, repaintMoney } from './bus-results.js';

const STEPS = ['Seats', 'Passenger Details', 'Payment', 'Booking Confirmed'];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
/** Resolves after the next popstate (or a short timeout if none comes). */
const settleHistory = () => new Promise(resolve => {
  let done = false;
  const finish = () => { if (done) return; done = true; removeEventListener('popstate', finish); resolve(); };
  addEventListener('popstate', finish);
  setTimeout(finish, 600);
});
// Typed details and promo per selection, so "Back" from the payment page keeps them.
const formMemo = new Map();

export default async function busReview(el, ctx) {
  document.title = 'Review your bus booking — AeroSkys';
  const q = ctx.query;
  const bus = findBus(q.get('bus'));
  const nos = [...new Set((q.get('seats') || '').split(',').map(s => s.trim()).filter(Boolean))];

  const fail = (title, text, action) => mount(el, html`<section class="page bs-review"><div class="wrap-narrow">
    ${steps(STEPS, 0)}
    <div class="bs-rv-fail">${emptyState({ iconName: 'bus', title, text, action })}</div>
  </div></section>`);

  if (!bus) {
    fail('We couldn’t find this bus', 'The link may be incomplete or out of date. Search again to choose your seats.', html`<a class="btn btn-primary" href="#/bus">${icon('search')} Search buses</a>`);
    return;
  }
  const L = seatLayout(bus);
  const seats = nos.map(no => L.byNo[no]);
  const bp = bus.boarding.find(p => p.id === q.get('bp'));
  const dp = bus.dropping.find(p => p.id === q.get('dp'));
  const resultsHref = href('/bus/search', { from: bus.from, to: bus.to, date: bus.date });
  const changeHref = href('/bus/search', { from: bus.from, to: bus.to, date: bus.date, open: bus.id, seats: nos.join(','), bp: bp?.id, dp: dp?.id });
  const back = label => html`<a class="btn btn-primary" href="${changeHref}">${icon('arrow-left')} ${label}</a>`;

  if (!nos.length || nos.length > MAX_SEATS || seats.some(x => !x) || !bp || !dp) {
    fail('Your seat selection is incomplete', `Please choose up to ${MAX_SEATS} seats and a boarding and dropping point for this bus.`, back('Choose seats'));
    return;
  }
  if (seats.some(x => x.status === 'sold')) {
    fail('Some of these seats are no longer available', 'Another traveller has just booked one of your seats. Please pick again.', back('Pick other seats'));
    return;
  }
  if (!isBookable(bus)) {
    fail('Booking has closed for this bus', 'Online booking closes 30 minutes before departure. Please choose another bus on this route.', html`<a class="btn btn-primary" href="${resultsHref}">See other buses</a>`);
    return;
  }

  // ------------------------------------------------ state
  const memoKey = `${bus.id}|${nos.join(',')}|${bp.id}|${dp.id}`;
  const saved = formMemo.get(memoKey) || { values: {}, promo: null };
  const user = currentUser();
  const v0 = saved.values;
  const pick = (k, fallback = '') => v0[k] ?? fallback;
  const { base, gst } = fareFor(bus, nos);
  const pre = base + gst;
  let promo = saved.promo ? applyPromo(saved.promo.code, 'bus', pre) : null;
  if (promo?.error) promo = null;
  const total = () => pre - (promo ? promo.amount : 0);
  const lines = () => [
    { label: 'Base fare', sub: `(${plural(seats.length, 'seat')})`, amount: base },
    gst ? { label: 'Operator GST', sub: '(5%)', amount: gst } : null,
    promo ? { label: `Promo (${promo.code})`, amount: promo.amount, neg: true, cls: 'green' } : null
  ].filter(Boolean);
  const journey = dp.mins - bp.mins;

  // ------------------------------------------------ markup
  const tripHTML = () => html`<article class="card bs-trip">
    <header class="bs-trip-head">
      ${opMark(bus)}
      <div class="grow"><h2 class="h4">${bus.operator}</h2><p>${bus.busType}</p></div>
      <div class="bs-trip-rate">${rateBadge(bus.rating)}</div>
    </header>
    <div class="bs-trip-route">
      <div class="bs-tr-pt">
        <small>Boarding · ${fmtDate(bp.date, 'ddd, d MMM')}</small>
        <b>${bp.time}</b>
        <span class="bs-tr-city">${bus.from}</span>
        <p><strong>${bp.name}</strong>${bp.landmark}</p>
      </div>
      <div class="bs-tr-mid" aria-label="Journey time ${hrsLabel(journey)}"><span>${hrsLabel(journey)}</span><i aria-hidden="true"></i><small>${bus.km.toLocaleString('en-IN')} km</small></div>
      <div class="bs-tr-pt is-end">
        <small>Dropping · ${fmtDate(dp.date, 'ddd, d MMM')}</small>
        <b>${dp.time}</b>
        <span class="bs-tr-city">${bus.to}</span>
        <p><strong>${dp.name}</strong>${dp.landmark}</p>
      </div>
    </div>
    <div class="bs-trip-seats">
      <span class="bs-ts-label">${plural(seats.length, 'seat')}</span>
      <ul>${seats.map(x => html`<li class="bs-seatchip t-${x.type}"><b>${x.no}</b><small>${cap(x.deck)} · ${cap(x.type)}</small></li>`)}</ul>
      <a class="text-btn" href="${changeHref}">${icon('edit')} Change seats</a>
    </div>
    <div class="bs-trip-foot">
      ${amenityList(bus.amenities)}
      <p class="bs-trip-tip">${icon('clock')}<span>Reach ${bp.name} by ${bp.time} — 15 minutes early is best. Carry a valid photo ID.</span></p>
    </div>
  </article>`;

  const paxHTML = (x, i) => {
    const lock = x.status === 'ladies' ? 'Female' : x.status === 'men' ? 'Male' : '';
    const g = lock || pick('gender' + i);
    return html`<fieldset class="bs-pax">
      <legend class="bs-pax-head">
        <span class="bs-seatchip t-${x.type}"><b>${x.no}</b></span>
        <span class="bs-pax-t"><b>Passenger ${i + 1}</b><small>${cap(x.deck)} deck ${x.type} · <span data-inr="${x.price}">${money(x.price)}</span></small></span>
        ${lock ? html`<span class="badge ${lock === 'Female' ? 'bs-badge-lady' : 'badge-blue'}">${lock === 'Female' ? '♀ Ladies seat' : '♂ Male seat'}</span>` : ''}
      </legend>
      <div class="bs-pax-grid">
        <div class="field bs-f-name"><label for="bs-n${i}">Full name <span class="req" aria-hidden="true">*</span></label>
          <input class="input" id="bs-n${i}" name="name${i}" value="${pick('name' + i, i === 0 && user ? user.name : '')}" placeholder="As on your photo ID" autocomplete="${i === 0 ? 'name' : 'off'}" autocapitalize="words" maxlength="60"><span class="field-error" role="alert"></span></div>
        <div class="field bs-f-age"><label for="bs-a${i}">Age <span class="req" aria-hidden="true">*</span></label>
          <input class="input" id="bs-a${i}" name="age${i}" type="number" inputmode="numeric" min="1" max="100" step="1" value="${pick('age' + i)}" placeholder="Years"><span class="field-error" role="alert"></span></div>
        <div class="field bs-f-gender"><span class="field-label" id="bs-gl${i}">Gender <span class="req" aria-hidden="true">*</span></span>
          <div class="bs-gender" role="radiogroup" aria-labelledby="bs-gl${i}">${['Male', 'Female'].map(gv => html`<label class="bs-gopt${lock && lock !== gv ? ' is-locked' : ''}"><input type="radio" name="gender${i}" value="${gv}"${g === gv ? raw(' checked') : ''}${lock && lock !== gv ? raw(' disabled') : ''}><span><i aria-hidden="true">${gv === 'Male' ? '♂' : '♀'}</i>${gv}</span></label>`)}</div>
          ${lock ? html`<span class="field-hint">${lock === 'Female' ? 'This seat is reserved for a female passenger.' : 'This seat is available for a male passenger only.'}</span>` : ''}
          <span class="field-error" role="alert"></span></div>
      </div>
    </fieldset>`;
  };

  const loginHTML = () => {
    const u = currentUser();
    return u
      ? html`<div class="note note-green bs-login">${icon('check-circle')}<span>Logged in as <b>${u.name}</b>${u.email ? ` · ${u.email}` : u.phone ? ` · +91 ${u.phone}` : ''}. This ticket will be saved to My Trips.</span></div>`
      : html`<div class="note bs-login">${icon('user')}<span><b>Log in to continue with your bus booking.</b> Your ticket is saved to My Trips and details are pre-filled next time.</span><button type="button" class="btn btn-dark btn-sm" data-bs-login>Log in</button></div>`;
  };

  const promoHTML = () => promo
    ? html`<div class="bs-promo-ok">${icon('tag')}<span><b>${promo.code}</b> applied<small>${promo.label}</small></span><b class="tnum">−<span data-inr="${promo.amount}">${money(promo.amount)}</span></b><button type="button" class="icon-btn" data-bs-promo-rm aria-label="Remove promo code ${promo.code}">${icon('x')}</button></div>`
    : html`<div class="field bs-promo-field"><label for="bs-promo">Promo code</label>
        <div class="bs-promo-row"><input class="input" id="bs-promo" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Enter promo code" maxlength="20"><button type="button" class="btn btn-outline" data-bs-promo-apply>Apply</button></div>
        <span class="field-error" role="alert" data-bs-promo-err></span></div>
      <button type="button" class="bs-coupon" data-bs-promo-use="BUS10"><span class="copy-code">BUS10</span><span>Up to 10% instant discount on bus bookings</span>${icon('arrow-right')}</button>`;

  mount(el, html`<section class="page bs-review">
    <div class="wrap">
      <a class="text-btn bs-back" href="${changeHref}">${icon('arrow-left')} Back to seat selection</a>
      ${steps(STEPS, 1)}
      <div class="bs-rv">
        <div class="bs-rv-main">
          ${tripHTML()}
          <form class="card bs-rv-form" data-bs-form novalidate>
            <div class="bs-rv-head"><h2 class="h3">Passenger details</h2><p class="small muted">Enter names exactly as on a government photo ID.</p></div>
            <div data-bs-login-slot>${loginHTML()}</div>
            ${seats.map(paxHTML)}
            <div class="bs-rv-contact">
              <h3 class="h4">Contact details</h3>
              <p class="small muted">Your m-ticket and journey updates are sent here.</p>
              <div class="form-grid">
                <div class="field"><label for="bs-email">Email <span class="req" aria-hidden="true">*</span></label>
                  <input class="input" id="bs-email" name="email" type="email" inputmode="email" autocomplete="email" value="${pick('email', user?.email || '')}" placeholder="name@email.com"><span class="field-error" role="alert"></span></div>
                <div class="field"><label for="bs-mobile">Mobile number <span class="req" aria-hidden="true">*</span></label>
                  <div class="input-group"><span class="bs-cc" aria-hidden="true">+91</span><input class="input" id="bs-mobile" name="mobile" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" value="${pick('mobile', user?.phone || '')}" placeholder="10-digit mobile number" aria-describedby="bs-cc-note"></div>
                  <span class="sr-only" id="bs-cc-note">India, country code plus 91</span><span class="field-error" role="alert"></span></div>
              </div>
            </div>
            <button type="submit" hidden></button>
          </form>
          <section class="card card-pad bs-rv-policy" aria-labelledby="bs-policy-t"><h2 class="h4" id="bs-policy-t">${icon('shield')} Cancellation policy</h2><div data-bs-policy>${policyHTML(total())}</div></section>
        </div>
        <aside class="bs-rv-side" aria-label="Fare summary">
          <div class="card bs-fare">
            <h2 class="h4">Fare summary</h2>
            <div data-bs-lines>${priceLines(lines(), total())}</div>
            <div class="bs-promo" data-bs-promo>${promoHTML()}</div>
            <button type="button" class="btn btn-primary btn-block btn-lg" data-bs-pay>Continue to payment ${icon('arrow-right')}</button>
            <p class="bs-fare-note">${icon('lock')}<span>Secure payment on the next step. You won’t be charged yet.</span></p>
          </div>
          ${protoNote()}
        </aside>
      </div>
    </div>
  </section>
  <div class="mobile-cta bs-mcta">
    <div class="mc-price"><small>Total · ${plural(seats.length, 'seat')}</small><b data-bs-mtotal>${money(total())}</b></div>
    <button type="button" class="btn btn-primary" data-bs-pay>Continue ${icon('arrow-right')}</button>
  </div>`);
  document.body.classList.add('has-mobile-cta');

  // ------------------------------------------------ behaviour
  const form = $('[data-bs-form]', el);
  const saveMemo = () => {
    formMemo.set(memoKey, { values: Object.fromEntries(new FormData(form).entries()), promo: promo ? { code: promo.code } : null });
    if (formMemo.size > 12) formMemo.delete(formMemo.keys().next().value);
  };
  const saveSoon = debounce(saveMemo, 250);

  function renderFare() {
    $('[data-bs-lines]', el).innerHTML = String(priceLines(lines(), total()));
    $('[data-bs-promo]', el).innerHTML = String(promoHTML());
    $('[data-bs-policy]', el).innerHTML = String(policyHTML(total()));
    $('[data-bs-mtotal]', el).textContent = money(total());
  }

  function applyCode(code) {
    const input = $('#bs-promo', el);
    const err = $('[data-bs-promo-err]', el);
    const res = applyPromo(code, 'bus', pre);
    if (res.error) {
      if (err) err.textContent = res.error;
      input?.closest('.field')?.classList.add('has-error');
      input?.focus();
      return;
    }
    promo = res;
    saveMemo();
    renderFare();
    toast(`You save ${money(res.amount)} on this booking.`, { title: `${res.code} applied` });
  }

  function fillContact(u) {
    if (!u) return;
    const email = $('#bs-email', el), mobile = $('#bs-mobile', el), n0 = $('#bs-n0', el);
    if (email && !email.value && u.email) email.value = u.email;
    if (mobile && !mobile.value && u.phone) mobile.value = u.phone;
    if (n0 && !n0.value && u.name) n0.value = u.name;
  }

  const setBusy = on2 => $$('[data-bs-pay]', el).forEach(b => { b.classList.toggle('is-loading', on2); b.disabled = on2; });

  async function pay() {
    const rules = { email: V.email, mobile: V.mobile };
    seats.forEach((x, i) => {
      rules['name' + i] = V.name;
      rules['age' + i] = v => !v ? 'Age is required' : !/^\d{1,3}$/.test(v) || +v < 1 || +v > 100 ? 'Enter an age between 1 and 100' : '';
      rules['gender' + i] = v => !v ? 'Select a gender'
        : x.status === 'ladies' && v !== 'Female' ? 'This seat is reserved for female passengers'
          : x.status === 'men' && v !== 'Male' ? 'This seat is available for male passengers only' : '';
    });
    const { ok, values } = validateForm(form, rules);
    if (!ok) { toast('Please check the highlighted details.', { type: 'error' }); return; }
    saveMemo();
    if (!isBookable(bus)) { toast('Online booking for this bus has just closed. Please choose another bus.', { type: 'error' }); return; }

    setBusy(true);
    const hadUser = !!currentUser();
    const u = await requireLogin('Log in to continue with your bus booking');
    // On phones the login sheet owns a history entry and closes with history.back(); let that
    // settle first, otherwise the pending "back" would undo the navigation to checkout.
    if (u && !hadUser && isMobile()) await settleHistory();
    setBusy(false);
    if (!u) { toast('Log in to continue with your booking.', { type: 'info' }); return; }
    if (!document.contains(form)) return;

    const clean = s => String(s).trim().replace(/\s+/g, ' ');
    const passengers = seats.map((x, i) => ({ seat: x.no, name: clean(values['name' + i]), age: Number(values['age' + i]), gender: values['gender' + i] }));
    const point = p => ({ time: p.time, name: p.name, landmark: p.landmark, date: p.date });
    const item = {
      busId: bus.id, operator: bus.operator, busType: bus.busType, ac: bus.ac, sleeper: bus.sleeper,
      from: bus.from, to: bus.to, date: bus.date,
      dep: bus.dep, arr: bus.arr, dayOffset: bus.dayOffset, duration: bus.duration,
      boarding: point(bp), dropping: point(dp),
      seats: seats.map(x => ({ no: x.no, deck: cap(x.deck), type: cap(x.type), price: x.price })),
      passengers
    };
    const id = createDraft({
      type: 'bus',
      title: `${bus.from} → ${bus.to}`,
      subtitle: `${bus.operator} · ${fmtDate(bus.date, 'ddd, d MMM yyyy')} · ${plural(seats.length, 'seat')}`,
      returnTo: location.hash,
      item,
      travellers: passengers.map(p => {
        const [first, ...rest] = p.name.split(' ');
        return { title: p.gender === 'Female' ? 'Ms' : 'Mr', first, last: rest.join(' '), name: p.name, age: p.age, gender: p.gender, seat: p.seat, type: p.age < 12 ? 'Child' : 'Adult' };
      }),
      contact: { name: passengers[0].name, email: values.email.trim().toLowerCase(), phone: values.mobile.replace(/\D/g, '').slice(-10), countryCode: '+91' },
      gst: null,
      promo: promo ? { code: promo.code, amount: promo.amount } : null,
      pricing: { lines: lines(), total: total() }
    });
    go('/checkout', { query: { d: id } });
  }

  const offs = [
    on(el, 'click', '[data-bs-pay]', pay),
    on(el, 'submit', '[data-bs-form]', e => { e.preventDefault(); pay(); }),
    on(el, 'input', '[data-bs-form]', saveSoon),
    on(el, 'change', '[data-bs-form]', saveSoon),
    on(el, 'click', '[data-bs-promo-apply]', () => applyCode($('#bs-promo', el)?.value || '')),
    on(el, 'click', '[data-bs-promo-use]', (e, b) => applyCode(b.dataset.bsPromoUse)),
    on(el, 'click', '[data-bs-promo-rm]', () => { promo = null; saveMemo(); renderFare(); $('#bs-promo', el)?.focus(); }),
    on(el, 'keydown', '#bs-promo', e => { if (e.key === 'Enter') { e.preventDefault(); applyCode(e.target.value); } }),
    on(el, 'input', '#bs-promo', e => { const f = e.target.closest('.field'); f?.classList.remove('has-error'); const err = $('[data-bs-promo-err]', el); if (err) err.textContent = ''; }),
    on(el, 'input', '#bs-mobile', e => { const d = e.target.value.replace(/\D/g, '').slice(0, 10); if (d !== e.target.value) e.target.value = d; }),
    on(el, 'click', '[data-bs-login]', async () => { const u = await requireLogin('Log in to continue with your bus booking'); if (u) fillContact(u); })
  ];

  // Header login / currency switches update this page in place.
  let cur = store.get('currency'), who = store.get('user');
  const unsub = store.subscribe(s => {
    if (s.user !== who) {
      who = s.user;
      const slot = $('[data-bs-login-slot]', el);
      if (slot) slot.innerHTML = String(loginHTML());
      fillContact(s.user);
    }
    if (s.currency !== cur) { cur = s.currency; renderFare(); repaintMoney(el); }
  });

  return () => {
    offs.forEach(f => f());
    unsub();
    document.body.classList.remove('has-mobile-cta');
    if (document.contains(form)) saveMemo();
  };
}
