// Checkout — "Payment Method" step shared by flights, hotels and buses.
// Payments are simulated: nothing is charged and no card data leaves the page.
import { html, raw, icon, mount, on, $, $$ } from '../core/dom.js';
import { money, inr, fmtDate } from '../core/format.js';
import { go } from '../core/router.js';
import { store } from '../core/store.js';
import { getDraft, confirmBooking } from '../engines/bookings.js';
import { steps, emptyState, priceLines } from '../ui/common.js';
import { FLIGHT_STEPS } from './flight-review.js';
import { toast } from '../ui/toast.js';

const STEPS = { flight: [FLIGHT_STEPS, 3], hotel: [['Hotel', 'Guest Details', 'Payment', 'Booking Confirmed'], 2], bus: [['Seats', 'Passenger Details', 'Payment', 'Booking Confirmed'], 2] };
const TYPE_ICON = { flight: 'plane', hotel: 'bed', bus: 'bus' };
const BANKS = [['SBI', 'State Bank of India'], ['HDFC', 'HDFC Bank'], ['ICICI', 'ICICI Bank'], ['AXIS', 'Axis Bank'], ['KOTAK', 'Kotak Mahindra Bank'], ['YES', 'Yes Bank']];
const MORE_BANKS = ['Bank of Baroda', 'Punjab National Bank', 'Canara Bank', 'Union Bank of India', 'IndusInd Bank', 'IDFC FIRST Bank', 'Federal Bank', 'Bank of India', 'Indian Bank', 'Central Bank of India'];
const WALLETS = [['PAYTM', 'Paytm'], ['PHONEPE', 'PhonePe'], ['AMAZON', 'Amazon Pay'], ['MOBIKWIK', 'MobiKwik']];
const SESSION_MIN = 15;

const luhn = n => { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; };
const brandOf = n => /^4/.test(n) ? 'Visa' : /^(5[1-5]|2[2-7])/.test(n) ? 'Mastercard' : /^3[47]/.test(n) ? 'Amex' : /^(60|65|81|82|508|353|356)/.test(n) ? 'RuPay' : '';

function qrSVG(seed) {
  // Decorative QR-style pattern for the prototype (not a scannable payment code).
  let x = 0; for (const c of seed) x = (x * 31 + c.charCodeAt(0)) >>> 0;
  const cells = []; const n = 25;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const finder = (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    x = (x * 1103515245 + 12345) >>> 0;
    if (!finder && (x >> 16) % 2) cells.push(`<rect x="${c}" y="${r}" width="1" height="1"/>`);
  }
  const finder = (fx, fy) => `<rect x="${fx}" y="${fy}" width="7" height="7" fill="#071c31"/><rect x="${fx + 1}" y="${fy + 1}" width="5" height="5" fill="#fff"/><rect x="${fx + 2}" y="${fy + 2}" width="3" height="3" fill="#071c31"/>`;
  return raw(`<svg viewBox="-1 -1 ${n + 2} ${n + 2}" class="co-qr" role="img" aria-label="Sample UPI QR code"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/><g fill="#071c31">${cells.join('')}</g>${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</svg>`);
}

export default async function payment(el, ctx) {
  const d = getDraft(ctx.query.get('d') || '');
  if (!d) {
    mount(el, html`<section class="page"><div class="wrap-narrow">${emptyState({ iconName: 'clock', title: 'This payment session has ended', text: 'Your booking was either completed or has expired. Check My Trips, or start a new search.', action: html`<div class="row gap-8" style="justify-content:center"><a class="btn btn-light" href="#/trips">My Trips</a><a class="btn btn-primary" href="#/">New search</a></div>` })}</div></section>`);
    return;
  }
  document.title = 'Payment — AeroSkys';
  const [stepList, stepIdx] = STEPS[d.type] || STEPS.flight;
  const st = { method: 'upi', upiMode: 'id', bank: '', wallet: '', simulateFail: false, busy: false };
  const deadline = (d.payStartedAt || Date.now()) + SESSION_MIN * 60 * 1000;
  if (!d.payStartedAt) store.update(s => { if (s.drafts[d.id]) s.drafts[d.id].payStartedAt = Date.now(); });

  const methods = [['upi', 'UPI', 'qr', 'Google Pay, PhonePe, Paytm & more'], ['card', 'Credit / Debit Card', 'card', 'Visa, Mastercard, RuPay, Amex'], ['nb', 'Net Banking', 'bank', 'All major Indian banks'], ['wallet', 'Wallets', 'wallet', 'Paytm, PhonePe, Amazon Pay']];

  const panes = {
    upi: () => html`<div class="co-pay-pane">
      <div class="seg" role="group" aria-label="UPI option"><button type="button" data-upi-mode="id" aria-pressed="${st.upiMode === 'id'}">Enter UPI ID</button><button type="button" data-upi-mode="qr" aria-pressed="${st.upiMode === 'qr'}">Scan QR</button></div>
      ${st.upiMode === 'id' ? html`<div class="field" style="margin-top:16px;max-width:420px"><label for="upi">UPI ID</label><input class="input" id="upi" name="upi" placeholder="yourname@okbank" autocomplete="off" autocapitalize="none" spellcheck="false"><span class="field-hint">A payment request will be sent to your UPI app. Approve it within 5 minutes.</span><span class="field-error" role="alert"></span></div>`
        : html`<div class="co-qr-box">${qrSVG(d.id)}<div><b>Scan with any UPI app</b><p class="small muted">Open Google Pay, PhonePe, Paytm or your bank app and scan to pay ${inr(d.pricing.total, { decimals: true })}.</p><p class="xs muted">Sample code for the prototype — not a real payment request.</p></div></div>`}
    </div>`,
    card: () => html`<div class="co-pay-pane"><div class="form-grid co-card-form">
      <div class="field span-2"><label for="cc_no">Card Number</label><div class="co-cc"><input class="input" id="cc_no" name="cc_no" inputmode="numeric" autocomplete="off" placeholder="1234 5678 9012 3456" maxlength="23"><span class="co-brand" data-brand></span></div><span class="field-error" role="alert"></span></div>
      <div class="field span-2"><label for="cc_name">Name on Card</label><input class="input" id="cc_name" name="cc_name" autocomplete="off" placeholder="As printed on the card"><span class="field-error" role="alert"></span></div>
      <div class="field"><label for="cc_exp">Expiry (MM/YY)</label><input class="input" id="cc_exp" name="cc_exp" inputmode="numeric" autocomplete="off" placeholder="MM/YY" maxlength="5"><span class="field-error" role="alert"></span></div>
      <div class="field"><label for="cc_cvv">CVV</label><input class="input" id="cc_cvv" name="cc_cvv" inputmode="numeric" autocomplete="off" placeholder="•••" maxlength="4" type="password"><span class="field-error" role="alert"></span></div>
    </div>
    <div class="note note-amber" style="margin-top:14px">${icon('alert')}<span><b>Prototype:</b> do not enter real card details. Use the test card <b>4111 1111 1111 1111</b>, any future expiry and any 3-digit CVV.</span></div></div>`,
    nb: () => html`<div class="co-pay-pane"><div class="co-banks">${BANKS.map(([k, n]) => html`<button type="button" class="co-bank" data-bank="${n}" aria-pressed="${st.bank === n}"><span class="co-bank-ic">${k}</span><span>${n}</span></button>`)}</div>
      <div class="field" style="margin-top:14px;max-width:420px"><label for="nb_more">Other banks</label><select class="select" id="nb_more" data-bank-select><option value="">Select your bank</option>${MORE_BANKS.map(b => html`<option ${st.bank === b ? raw('selected') : ''}>${b}</option>`)}</select></div></div>`,
    wallet: () => html`<div class="co-pay-pane"><div class="co-banks">${WALLETS.map(([k, n]) => html`<button type="button" class="co-bank" data-wallet="${n}" aria-pressed="${st.wallet === n}"><span class="co-bank-ic">${icon('wallet')}</span><span>${n}</span></button>`)}</div></div>`
  };

  const summary = () => {
    const it = d.item;
    let rows = [];
    if (d.type === 'flight') rows = it.journeys.map((j, i) => [i ? 'Return' : 'Depart', `${j.itinerary.segments.map(s => s.flightNo).join(', ')} · ${fmtDate(j.date, 'ddd, d MMM')}`]);
    if (d.type === 'hotel') rows = [['Stay', `${fmtDate(it.checkin, 'd MMM')} – ${fmtDate(it.checkout, 'd MMM')} · ${it.nights} night${it.nights > 1 ? 's' : ''}`], ['Room', `${it.room?.name || ''} · ${it.room?.meal || ''}`]];
    if (d.type === 'bus') rows = [['Bus', `${it.operator}`], ['Seats', it.seats.map(x => x.no).join(', ')], ['Boarding', `${it.boarding?.name || ''}`]];
    return html`<div class="co-card co-paysum">
      <div class="co-paysum-head"><span class="co-type">${icon(TYPE_ICON[d.type])}</span><div><b>${d.title}</b><small>${d.subtitle}</small></div></div>
      <dl class="kv" style="margin:14px 0">${rows.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}<dt>Lead traveller</dt><dd>${d.contact?.name || ''}</dd></dl>
      ${priceLines(d.pricing.lines.map(l => ({ ...l, decimals: l.neg })), d.pricing.total)}
      ${store.get('currency') !== 'INR' ? html`<p class="xs muted" style="margin-top:8px">You will be charged ${inr(d.pricing.total, { decimals: true })} (INR).</p>` : ''}
    </div>`;
  };

  mount(el, html`<section class="page co-page">
    <div class="wrap-wide">
      <div class="co-top"><div><h1 class="h3">Payment Method</h1><p class="muted small">Choose how you’d like to pay. Your booking is held for ${SESSION_MIN} minutes.</p></div>
        <span class="co-timer" data-timer aria-live="off">${icon('clock')} <b>--:--</b></span></div>
      ${steps(stepList, stepIdx)}
      <div class="co-layout">
        <div class="co-main">
          <div class="co-card co-pay">
            <div class="co-methods" role="tablist" aria-label="Payment methods">${methods.map(([k, l, ic, sub]) => html`<button type="button" class="co-method" role="tab" data-method="${k}" aria-selected="${st.method === k}">${icon(ic)}<span><b>${l}</b><small>${sub}</small></span></button>`)}</div>
            <form class="co-pay-body" data-pay-form novalidate autocomplete="off"></form>
          </div>
          <div class="co-card co-trust">
            <span>${icon('shield')} PCI-DSS compliant payment gateway</span><span>${icon('lock')} 256-bit SSL/TLS encryption</span><span>${icon('check-circle')} Instant confirmation</span>
          </div>
          <label class="check co-sim small"><input type="checkbox" data-sim> Prototype control: simulate a failed payment</label>
          <div class="co-fineprint"><p>Additional convenience fees may be charged by the payment gateway at actuals on Credit/Debit Card, Netbanking, UPI, or any other selected online payment mode.</p><p>If the transaction fails but funds are deducted from your account or card, the booking amount will be credited back to the source account within 7 working days. Convenience fees charged by the payment gateway are non-refundable.</p></div>
        </div>
        <aside class="co-side">${summary()}
          <button class="btn btn-primary btn-lg btn-block co-paybtn" data-pay>${icon('lock')} Pay ${inr(d.pricing.total, { decimals: true })}</button>
          <a class="btn btn-ghost btn-block" href="${d.returnTo || '#/'}">${icon('chevron-left')} Back</a>
        </aside>
      </div>
    </div>
  </section>
  <div class="mobile-cta"><div class="mc-price"><small>Amount payable</small><b class="tnum">${inr(d.pricing.total, { decimals: true })}</b></div><button class="btn btn-primary" data-pay>${icon('lock')} Pay now</button></div>
  <div class="co-processing" data-processing hidden><div class="co-proc-card"><span class="co-spinner"></span><h2 class="h4">Processing your payment…</h2><p class="small muted">Please don’t refresh or press back.</p></div></div>`);
  document.body.classList.add('has-mobile-cta');

  const form = $('[data-pay-form]', el);
  const renderPane = () => { form.innerHTML = String(panes[st.method]()); };
  renderPane();

  // Session countdown
  const timerEl = $('[data-timer] b', el);
  const tick = () => {
    const left = Math.max(0, deadline - Date.now());
    const m = Math.floor(left / 60000), s2 = Math.floor(left % 60000 / 1000);
    timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s2).padStart(2, '0')}`;
    $('[data-timer]', el).classList.toggle('is-low', left < 120000);
    if (!left) {
      clearInterval(timer);
      mount(el, html`<section class="page"><div class="wrap-narrow">${emptyState({ iconName: 'clock', title: 'Payment session timed out', text: 'For your security the session ended. Prices and availability may have changed — please review and try again.', action: html`<a class="btn btn-primary" href="${d.returnTo || '#/'}">Review booking again</a>` })}</div></section>`);
    }
  };
  const timer = setInterval(tick, 1000); tick();

  const unbind = [];
  unbind.push(on(el, 'click', '[data-method]', (e, b) => { st.method = b.dataset.method; $$('[data-method]', el).forEach(x => x.setAttribute('aria-selected', String(x === b))); renderPane(); }));
  unbind.push(on(el, 'click', '[data-upi-mode]', (e, b) => { st.upiMode = b.dataset.upiMode; renderPane(); }));
  unbind.push(on(el, 'click', '[data-bank]', (e, b) => { st.bank = b.dataset.bank; renderPane(); }));
  unbind.push(on(el, 'change', '[data-bank-select]', (e, s2) => { st.bank = s2.value; renderPane(); }));
  unbind.push(on(el, 'click', '[data-wallet]', (e, b) => { st.wallet = b.dataset.wallet; renderPane(); }));
  unbind.push(on(el, 'change', '[data-sim]', (e, c) => { st.simulateFail = c.checked; }));
  unbind.push(on(el, 'input', '#cc_no', (e, i) => {
    const digits = i.value.replace(/\D/g, '').slice(0, 19);
    i.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    $('[data-brand]', el).textContent = brandOf(digits);
  }));
  unbind.push(on(el, 'input', '#cc_exp', (e, i) => { const v = i.value.replace(/\D/g, '').slice(0, 4); i.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v; }));

  const setErr = (id, msg) => { const i = $('#' + id, el); if (!i) return !msg; const f = i.closest('.field'); f.classList.toggle('has-error', !!msg); f.querySelector('.field-error').textContent = msg || ''; if (msg) i.focus(); return !msg; };

  function validate() {
    if (st.method === 'upi') {
      if (st.upiMode === 'qr') return { method: 'UPI', detail: 'UPI QR' };
      const v = ($('#upi', el)?.value || '').trim();
      if (!setErr('upi', /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(v) ? '' : 'Enter a valid UPI ID, e.g. name@okhdfcbank')) return null;
      return { method: 'UPI', detail: v.replace(/^(.).*(@.*)$/, '$1•••$2') };
    }
    if (st.method === 'card') {
      const no = $('#cc_no', el).value.replace(/\D/g, ''), name = $('#cc_name', el).value.trim(), exp = $('#cc_exp', el).value, cvv = $('#cc_cvv', el).value;
      const [mm, yy] = exp.split('/').map(Number);
      const now = new Date(), expOk = mm >= 1 && mm <= 12 && yy >= 0 && new Date(2000 + yy, mm, 0) >= new Date(now.getFullYear(), now.getMonth(), 1);
      const ok = [setErr('cc_no', no.length >= 13 && luhn(no) ? '' : 'Enter a valid card number'), setErr('cc_name', /^[A-Za-z][A-Za-z .'-]{1,}$/.test(name) ? '' : 'Enter the name on the card'), setErr('cc_exp', expOk ? '' : 'Enter a valid future expiry (MM/YY)'), setErr('cc_cvv', /^\d{3,4}$/.test(cvv) ? '' : 'Enter the CVV')].every(Boolean);
      return ok ? { method: 'Card', detail: `${brandOf(no) || 'Card'} •••• ${no.slice(-4)}` } : null;
    }
    if (st.method === 'nb') { if (!st.bank) { toast('Please choose your bank.', { type: 'error' }); return null; } return { method: 'Net Banking', detail: st.bank }; }
    if (st.method === 'wallet') { if (!st.wallet) { toast('Please choose a wallet.', { type: 'error' }); return null; } return { method: 'Wallet', detail: st.wallet }; }
    return null;
  }

  async function pay() {
    if (st.busy) return;
    const p = validate();
    if (!p) return;
    st.busy = true;
    const proc = $('[data-processing]', el);
    proc.hidden = false;
    document.body.classList.add('no-scroll');
    await new Promise(r => setTimeout(r, 1900));
    proc.hidden = true;
    document.body.classList.remove('no-scroll');
    st.busy = false;
    if (st.simulateFail) {
      toast('Your payment could not be completed. If money was deducted it will be credited back to the source account within 7 working days.', { type: 'error', title: 'Payment failed', ms: 7000 });
      return;
    }
    const booking = confirmBooking(d.id, { ...p, amount: d.pricing.total, currency: 'INR' });
    clearInterval(timer);
    go('/booking/' + booking.ref, { query: { new: 1 }, replace: true });
  }
  unbind.push(on(el, 'click', '[data-pay]', pay));
  form.addEventListener('submit', e => { e.preventDefault(); pay(); });
  return () => { unbind.forEach(f => f()); clearInterval(timer); document.body.classList.remove('has-mobile-cta', 'no-scroll'); };
}
