// AeroSkys Membership: plan choice, live GST breakdown, the test-mode checkout and the Member ID register.
// A port of the client's design-handoff logic (logic.js) to plain DOM code; the page itself uses the Careers
// shell (header, phone menu, reveals). The register, the ID serials and the invoice numbers live in this
// browser's localStorage under the same keys as the earlier Member ID page, whose IDs are migrated to the
// current series on load. In production the counters, invoices and register must live server-side, and
// payment is handed to a licensed gateway.
import '../careers/js/shell.js';
import { scrollToEl } from '../careers/js/ui.js';

const KEY = 'aeroskys-member-register';
const INVOICE_KEY = 'aeroskys-invoice-seq';
const seqKey = plan => 'aeroskys-member-seq-' + plan;
const SALT = 'AEROSKYS-MEMBER-V1';
const ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ID_PREFIX = 'ASKG';
const TIER_OFFSET = { 1: 1047290173, 2: 5298704119, 3: 7613008937 };
const PLANS = {
  '1y': { name: '1 Year', years: 1, price: 499, perYear: '₹499 / year' },
  '2y': { name: '2 Years', years: 2, price: 699, perYear: '₹349.50 / year' },
  '3y': { name: '3 Years', years: 3, price: 999, perYear: '₹333 / year' }
};
const COUNTRIES = { IND: 'India', ARE: 'United Arab Emirates', GBR: 'United Kingdom', USA: 'United States', SGP: 'Singapore', SAU: 'Saudi Arabia', QAT: 'Qatar', OMN: 'Oman', KWT: 'Kuwait', BHR: 'Bahrain', NPL: 'Nepal', LKA: 'Sri Lanka', BGD: 'Bangladesh', MYS: 'Malaysia', THA: 'Thailand', AUS: 'Australia', CAN: 'Canada', DEU: 'Germany', FRA: 'France', OTH: 'Other' };
const EMPTY = Object.freeze({ name: '', country: 'IND', passport: '', expiry: '', plan: '3y', billState: '', gstin: '' });
const PAY0 = Object.freeze({ method: 'upi', upi: '', card: '', exp: '', cvv: '', bank: '', err: '', errField: null, busy: false });
const NOTICES = {
  duplicate: 'This passport already holds an active membership. No new ID was issued — the existing card is shown.',
  renewed: 'Membership renewed under the same Member ID, with a new validity period.',
  new: 'Payment received and GST tax invoice generated. Welcome to AeroSkys.'
};
const ERROR_ORDER = ['name', 'passport', 'expiry', 'billState', 'gstin'];
const PROCESSING_MS = 1500;

// GST settings (the handoff's component props) come from the #join section's data attributes.
const joinSection = document.getElementById('join');
const rateAttr = Number(joinSection?.dataset.gstRate);
const CONFIG = {
  gstRate: Number.isFinite(rateAttr) && joinSection?.dataset.gstRate !== '' ? rateAttr : 18,
  supplierState: joinSection?.dataset.supplierState || 'Delhi',
  gstInclusive: joinSection?.dataset.gstInclusive === 'true'
};

/* ------------------------------------------------------------------ storage */
const memory = {};   // fallback when localStorage is blocked, so serials never repeat within a visit
function bump(key) {
  let stored = 0;
  try { stored = Math.floor(Number(localStorage.getItem(key) || 0)); } catch { /* storage blocked */ }
  if (!Number.isFinite(stored) || stored < 0) stored = 0;
  const n = Math.max(memory[key] || 0, stored) + 1;
  memory[key] = n;
  try { localStorage.setItem(key, String(n)); } catch { /* storage blocked */ }
  return n;
}
function save(register) {
  try { localStorage.setItem(KEY, JSON.stringify(register)); } catch { /* storage full or blocked: the register lasts for this visit */ }
}
function loadRegister() {
  let reg = [];
  try { reg = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { reg = []; }
  return Array.isArray(reg) ? reg.filter(x => x && typeof x === 'object') : [];
}

/* ------------------------------------------------------------------ helpers (as in the handoff) */
const norm = p => String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const compact = id => String(id || '').replace(/-/g, '');
const addYears = (d, n) => { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; };
const termEnd = (d, n) => { const x = addYears(d, n); x.setDate(x.getDate() - 1); x.setHours(23, 59, 59, 999); return x; };
const isActive = rec => !rec.validUntil || new Date(rec.validUntil) > new Date();
const round2 = n => Math.round(n * 100) / 100;
const inr = n => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fy = d => { const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return y + '-' + String((y + 1) % 100).padStart(2, '0'); };
const planName = k => (PLANS[k] ? PLANS[k].name : 'Lifetime');
const shortDate = d => d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

function fmt(iso, withTime) {
  if (!iso) return 'Lifetime';
  try {
    return new Date(iso).toLocaleString('en-IN', withTime
      ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

// Member ID: ASK + G<tier> + 11 digits, shown as ASK-GY-XXX-XXXX-XXXX (Y = plan years). Each tier has its own
// sequential series; the serial is scrambled by a fixed bijection mod 10^10 so numbers look random but never
// collide, and the last digit is a Luhn check over tier + serial.
function fmtId(id) {
  const c = compact(id);
  if (!/^ASKG\d{12}$/.test(c)) return id;
  const d = c.slice(4);
  return 'ASK-G' + d[0] + '-' + d.slice(1, 4) + '-' + d.slice(4, 8) + '-' + d.slice(8);
}
function tierDigit(id) { const y = /^ASKG(\d)/.exec(compact(id)); return y ? y[1] : ''; }
function tierYears(id) { const t = tierDigit(id); return t ? t + (t === '1' ? ' Year' : ' Years') : ''; }
function toId(plan) {
  const T = PLANS[plan] ? String(PLANS[plan].years) : '1';
  const M = BigInt(10000000000), a = BigInt(387420489), b = BigInt(TIER_OFFSET[T] || 0);
  const x = String((a * BigInt(bump(seqKey(plan))) + b) % M).padStart(10, '0');
  const body = T + x;
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    let d = +body[body.length - 1 - i];
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return fmtId(ID_PREFIX + T + x + String((10 - sum % 10) % 10));
}
function nextInvoice(d) { return 'ASK/' + fy(d) + '/' + String(bump(INVOICE_KEY)).padStart(6, '0'); }
function luhn(num) {
  let s = 0, alt = false;
  for (let i = num.length - 1; i >= 0; i--) { let d = +num[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; }
  return s % 10 === 0;
}
async function fingerprint(country, passport) {
  const data = new TextEncoder().encode(SALT + '|' + country + '|' + passport);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
}

function tax(price, billState) {
  const rate = CONFIG.gstRate, inclusive = CONFIG.gstInclusive, supplier = CONFIG.supplierState;
  const base = inclusive ? round2(price / (1 + rate / 100)) : price;
  const gst = inclusive ? round2(price - base) : round2(price * rate / 100);
  const total = round2(base + gst);
  const intra = !!billState && billState === supplier;
  const half = round2(gst / 2);
  const split = intra ? { cgst: half, sgst: round2(gst - half), igst: 0 } : { cgst: 0, sgst: 0, igst: gst };
  return Object.assign({ rate, inclusive, supplier, base, gst, total, intra }, split);
}

function validate(f) {
  const e = {};
  const p = norm(f.passport);
  if (f.name.trim().length < 3) e.name = 'Enter the full name exactly as printed on the passport.';
  if (!p) e.passport = 'Enter the passport number.';
  else if (f.country === 'IND' && !/^[A-Z][0-9]{7}$/.test(p)) e.passport = 'Indian passports are one letter followed by seven digits, e.g. A1234567.';
  else if (!/^[A-Z0-9]{6,9}$/.test(p)) e.passport = 'Passport numbers are 6–9 letters and digits.';
  if (!f.expiry) e.expiry = 'Enter the expiry date.';
  else if (new Date(f.expiry + 'T23:59:59') < new Date()) e.expiry = 'This passport has expired. A valid passport is required.';
  if (!f.billState) e.billState = 'Select the billing state — it decides how GST is applied.';
  if (f.gstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(f.gstin.trim().toUpperCase())) e.gstin = 'GSTIN must be 15 characters, e.g. 32ABCDE1234F1Z5.';
  return e;
}

// IDs issued in earlier formats (e.g. ASK-XXXX-XXXX-C from the first Member ID page) move to the current
// ASK-GY-XXX-XXXX-XXXX series, oldest first so the sequence follows issue order; the old ID is kept as legacyId.
function migrate(reg) {
  let changed = false;
  reg.slice().sort((a, b) => String(a.issued || '').localeCompare(String(b.issued || ''))).forEach(x => {
    if (/^ASKG\d{12}$/.test(compact(x.id))) {
      if (x.id !== fmtId(x.id)) { x.id = fmtId(x.id); changed = true; }
      return;
    }
    x.legacyId = x.id;
    x.id = toId(PLANS[x.plan] ? x.plan : '1y');
    changed = true;
  });
  reg.forEach(x => {
    const t = tierDigit(x.id);
    if (!t || !x.issued) return;
    const plan = t + 'y';
    const issued = new Date(x.issued);
    if (!PLANS[plan] || Number.isNaN(issued.getTime())) return;
    if (x.plan !== plan && !x.renewals) { x.plan = plan; changed = true; }
    if (!x.renewals) {
      const v = termEnd(issued, PLANS[plan].years).toISOString();
      if (x.validUntil !== v) { x.validUntil = v; changed = true; }
    }
  });
  if (changed) save(reg);
  return reg;
}

/* ------------------------------------------------------------------ DOM helpers */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v; else node.setAttribute(k, v === true ? '' : String(v));
  }
  node.append(...children);   // strings become text nodes, never markup
  return node;
}
const setFlag = (node, attr, on) => (on ? node.setAttribute(attr, 'true') : node.removeAttribute(attr));

const form = $('[data-form]');
const generateBtn = $('[data-generate]');
const formError = $('[data-form-error]');
const inputs = { name: $('#m-name'), country: $('#m-country'), passport: $('#m-passport'), expiry: $('#m-expiry'), billState: $('#m-state'), gstin: $('#m-gstin') };
const errorEls = { name: $('#e-name'), passport: $('#e-passport'), expiry: $('#e-expiry'), billState: $('#e-billState'), gstin: $('#e-gstin') };
const planRadios = $$('input[name="plan"]', form);
const sumList = $('[data-sum-list]');
const sumNote = $('[data-sum-note]');
const cardTitle = $('#card-title');
const cardCol = $('[data-cardcol]');
const card = $('[data-card]');
const cardText = { plan: $('[data-card-plan]'), id: $('[data-card-id]'), name: $('[data-card-name]'), valid: $('[data-card-valid]') };
const sample = $('[data-sample]');
const sampleTag = $('[data-sample-tag]');
const resultBox = $('[data-result]');
const copyBtn = $('[data-copy]');
const search = $('[data-search]');
const rowsEl = $('[data-rows]');
const countEl = $('[data-count]');
const emptyEl = $('[data-empty]');
const tableWrap = $('[data-table-wrap]');
const status = $('[data-status]');
const dialog = $('[data-dialog]');
const payForm = $('[data-pay-form]');
const payAmount = $('[data-pay-amount]');
const paySum = $('[data-pay-sum]');
const payErr = $('[data-pay-err]');
const payStatus = $('[data-pay-status]');
const payCancel = $('[data-pay-cancel]');
const paySubmit = $('[data-pay-submit]');
const payInputs = { upi: $('#p-upi'), card: $('#p-card'), exp: $('#p-exp'), cvv: $('#p-cvv'), bank: $('#p-bank') };
const methodRadios = $$('input[name="pay-method"]', payForm);
const panels = $$('[data-panel]', payForm);

/* ------------------------------------------------------------------ state */
const S = { f: { ...EMPTY }, e: {}, result: null, register: [], query: '', busy: false, copied: false, pay: { ...PAY0 } };
let pending = null;     // { bytes, hash, existing, p } between "Proceed to pay" and a successful payment
let opener = null;      // element focused before the checkout opened

let announceTimer;
function announce(msg) {
  clearTimeout(announceTimer);
  status.textContent = '';
  announceTimer = setTimeout(() => { status.textContent = msg; }, 80);
}
function setFormError(msg) {
  if (msg) formError.replaceChildren(el('p', {}, msg)); else formError.replaceChildren();
}
const HEADER_CLEAR = 110;   // the floating header bar's bottom edge once it is stuck (as in ui.js scrollToEl)

/* ------------------------------------------------------------------ rendering */
function taxView() {
  const plan = PLANS[S.f.plan] || PLANS['3y'];
  const t = tax(plan.price, S.f.billState);
  const lines = !S.f.billState ? [['GST ' + t.rate + '%', inr(t.gst)]]
    : t.intra ? [['CGST ' + t.rate / 2 + '%', inr(t.cgst)], ['SGST ' + t.rate / 2 + '%', inr(t.sgst)]]
    : [['IGST ' + t.rate + '%', inr(t.igst)]];
  const note = !S.f.billState ? 'Select a billing state to see the CGST/SGST or IGST split.'
    : t.intra ? 'Billing state matches AeroSkys’ registered state (' + t.supplier + '): CGST + SGST.'
    : 'Billing state differs from AeroSkys’ registered state (' + t.supplier + '): IGST.';
  return { planName: plan.name, base: inr(t.base), total: inr(t.total), lines, note: (t.inclusive ? 'Prices include GST. ' : '') + note };
}

// rows: [label, amount, isTotal]; rebuilt only when the text changes, so the live region speaks only on real changes
function renderRows(dl, rows) {
  const want = rows.map(r => r[0] + '\u0000' + r[1]).join('\u0001');
  const have = $$(':scope > div', dl).map(d => $$('dt, dd', d).map(n => n.textContent).join('\u0000')).join('\u0001');
  if (want === have) return;
  dl.replaceChildren(...rows.map(([label, value, total]) =>
    el('div', { class: total ? 'ms-sum-row is-total' : 'ms-sum-row' }, el('dt', {}, label), el('dd', {}, value))));
}

function renderSummary() {
  const v = taxView();
  renderRows(sumList, [[v.planName + ' membership', v.base], ...v.lines, ['Total payable', v.total, true]]);
  if (sumNote.textContent !== v.note) sumNote.textContent = v.note;
  generateBtn.textContent = S.busy ? 'Checking…' : 'Proceed to pay ' + v.total;
  setFlag(generateBtn, 'aria-disabled', S.busy);
}

function renderError(k) {
  const msg = S.e[k] || '';
  errorEls[k].textContent = msg;
  errorEls[k].hidden = !msg;
  setFlag(inputs[k], 'aria-invalid', !!msg);
}
const renderErrors = () => ERROR_ORDER.forEach(renderError);

function syncForm() {
  for (const [k, input] of Object.entries(inputs)) if (input.value !== S.f[k]) input.value = S.f[k];
  for (const r of planRadios) r.checked = r.value === S.f.plan;
  inputs.passport.placeholder = S.f.country === 'IND' ? 'e.g. A1234567' : '6–9 letters and digits';
}

function resultView(r) {
  return {
    statusLabel: r.mode === 'duplicate' ? 'Already a member' : r.mode === 'renewed' ? 'Renewed' : 'Verified · ID issued',
    countryName: COUNTRIES[r.country] || r.country || '',
    planLine: PLANS[r.plan] ? planName(r.plan) + ' · ₹' + PLANS[r.plan].price : 'Lifetime (legacy)',
    totalLine: r.total != null ? inr(r.total) + ' incl. GST' : '—',
    taxLine: r.total == null ? '—' : (r.igst
      ? 'IGST ' + r.gstRate + '% · ' + inr(r.igst)
      : 'CGST ' + r.gstRate / 2 + '% · ' + inr(r.cgst) + '  +  SGST ' + r.gstRate / 2 + '% · ' + inr(r.sgst)),
    methodLine: r.method || '—',
    payRef: r.payRef || r.pay || '—',
    invoiceLine: r.invoice ? r.invoice + (r.gstin ? ' · GSTIN ' + r.gstin : '') : '—',
    validLabel: fmt(r.validUntil),
    masked: r.masked || '',
    issuedLabel: fmt(r.issued, true),
    notice: NOTICES[r.mode] || ''
  };
}

// The card shows a sample for the chosen plan until a Member ID is issued (or found), then the real one.
function renderCard() {
  const r = S.result;
  let tier, plan, id, name, valid;
  if (r) {
    tier = tierDigit(r.id) || '3';
    plan = planName(r.plan);
    id = fmtId(r.id);
    name = r.name || '';
    valid = r.validUntil ? shortDate(new Date(r.validUntil)) : 'LIFE';
  } else {
    const pl = PLANS[S.f.plan] || PLANS['3y'];
    tier = String(pl.years);
    plan = pl.name;
    id = 'ASK-G' + tier + '-143-4710-6626';
    name = 'Aarav Mehta';
    valid = shortDate(termEnd(new Date(), pl.years));
  }
  card.className = 'ms-card ms-card--' + (['1', '2', '3'].includes(tier) ? tier : '3');
  cardText.plan.textContent = plan;
  cardText.id.textContent = id;
  cardText.name.textContent = name;
  cardText.valid.textContent = valid;
  sampleTag.textContent = 'Sample card · ' + plan;
  sample.hidden = !!r;
  resultBox.hidden = !r;
  if (r) {
    const v = resultView(r);
    for (const node of $$('[data-r]', resultBox)) node.textContent = v[node.dataset.r] ?? '';
    $('[data-r="notice"]', resultBox).hidden = !v.notice;
  }
  copyBtn.textContent = S.copied ? 'Copied' : 'Copy ID';
}

function renderRegister() {
  const q = S.query.trim().toUpperCase();
  const qc = q.replace(/[-\s]/g, '');
  const rows = S.register.filter(x => !q
    || (qc && compact(x.id).toUpperCase().includes(qc))
    || String(x.name || '').toUpperCase().includes(q)
    || String(x.last4 || '').includes(q));
  rowsEl.replaceChildren(...rows.map(x => {
    const id = String(fmtId(x.id) || '');
    const nation = COUNTRIES[x.country] ? el('abbr', { title: COUNTRIES[x.country] }, x.country) : String(x.country || '');
    return el('tr', {},
      el('th', { scope: 'row' }, id),
      el('td', {}, String(x.name || '')),
      el('td', {}, tierYears(x.id) || planName(x.plan)),
      el('td', {}, x.issued ? fmt(x.issued) : '—'),
      el('td', {}, fmt(x.validUntil)),
      el('td', { class: 'is-pass' }, String(x.masked || '')),
      el('td', {}, nation),
      el('td', {}, isActive(x) ? 'Active' : 'Expired'),
      el('td', {}, el('button', { class: 'ms-revoke', type: 'button', 'data-revoke': S.register.indexOf(x), 'aria-label': 'Revoke Member ID ' + id }, 'Revoke')));
  }));
  countEl.textContent = S.register.length === 1 ? '1 Member ID issued' : S.register.length + ' Member IDs issued';
  emptyEl.hidden = rows.length > 0;
  emptyEl.textContent = S.register.length ? 'No Member IDs match that search.' : 'No Member IDs issued yet.';
  return rows.length;
}

/* ------------------------------------------------------------------ form */
function onField(k, value) {
  S.f[k] = value;
  if (S.e[k]) { S.e[k] = ''; renderError(k); }
  if (k === 'country') {
    inputs.passport.placeholder = value === 'IND' ? 'e.g. A1234567' : '6–9 letters and digits';
    if (S.e.passport) { S.e.passport = ''; renderError('passport'); }   // its message depended on the nationality
  }
  if (S.result || S.copied) { S.result = null; S.copied = false; renderCard(); }
  if (k === 'billState') renderSummary();
}

function pickPlan(k) {
  if (!PLANS[k]) return;
  S.f.plan = k;
  S.result = null;
  S.copied = false;
  for (const r of planRadios) r.checked = r.value === k;
  renderSummary();
  renderCard();
}

function reset() {
  S.f = { ...EMPTY };
  S.e = {};
  S.result = null;
  S.copied = false;
  setFormError('');
  syncForm();
  renderErrors();
  renderSummary();
  renderCard();
}

// After an ID is issued (or an existing one found): bring the card into view, move focus to it and say what happened.
function showResult() {
  const r = S.result;
  if (!r) return;
  const box = cardCol.getBoundingClientRect();
  if (box.top < HEADER_CLEAR || box.top > window.innerHeight * 0.5) scrollToEl(cardCol, 6);
  cardTitle.focus({ preventScroll: true });
  const id = fmtId(r.id);
  announce(r.mode === 'duplicate'
    ? NOTICES.duplicate + ' Member ID ' + id + '.'
    : NOTICES[r.mode] + ' Member ID ' + id + ', valid until ' + fmt(r.validUntil) + '.');
}

async function proceed() {
  if (S.busy) return;
  const e = validate(S.f);
  const bad = ERROR_ORDER.filter(k => e[k]);
  if (bad.length) {
    S.e = e;
    renderErrors();
    inputs[bad[0]].focus();
    announce(bad.length === 1 ? '1 field needs attention.' : bad.length + ' fields need attention.');
    return;
  }
  if (!window.isSecureContext || !window.crypto || !crypto.subtle) {
    setFormError('Member IDs can only be issued on a secure (https) page. Open this page over https and try again.');
    return;
  }
  setFormError('');
  S.busy = true;
  S.e = {};
  renderErrors();
  renderSummary();
  const p = norm(S.f.passport);
  let bytes;
  try { bytes = await fingerprint(S.f.country, p); }
  catch {
    S.busy = false;
    renderSummary();
    setFormError('The passport could not be checked. Please try again.');
    return;
  }
  S.busy = false;
  renderSummary();
  const hash = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  const existing = S.register.find(x => x.hash === hash);
  if (existing && isActive(existing)) {
    S.copied = false;
    S.result = Object.assign({}, existing, { mode: 'duplicate' });
    renderCard();
    showResult();
    return;
  }
  pending = { bytes, hash, existing, p };
  openPay();
}

/* ------------------------------------------------------------------ checkout (test mode) */
function renderPayError(force = false) {
  const msg = S.pay.err;
  if (!msg) payErr.replaceChildren();
  else if (force || payErr.textContent !== msg) payErr.replaceChildren(el('p', {}, msg));   // a new node is announced again
  for (const [k, input] of Object.entries(payInputs)) {
    const bad = !!msg && S.pay.errField === k;
    setFlag(input, 'aria-invalid', bad);
    if (bad) input.setAttribute('aria-describedby', 'pay-err'); else input.removeAttribute('aria-describedby');
  }
}

function renderPay(forceAlert = false) {
  const v = taxView();
  payAmount.textContent = v.total;
  renderRows(paySum, [['Member', S.f.name], [v.planName + ' membership', v.base], ...v.lines, ['Total', v.total, true]]);
  for (const r of methodRadios) r.checked = r.value === S.pay.method;
  for (const panel of panels) panel.hidden = panel.dataset.panel !== S.pay.method;
  paySubmit.textContent = S.pay.busy ? 'Processing…' : 'Pay ' + v.total;
  setFlag(paySubmit, 'aria-disabled', S.pay.busy);
  setFlag(payCancel, 'aria-disabled', S.pay.busy);
  renderPayError(forceAlert);
}

function methodField() {
  return S.pay.method === 'card' ? payInputs.card : S.pay.method === 'nb' ? payInputs.bank : payInputs.upi;
}

function openPay() {
  S.pay = { ...PAY0, method: S.pay.method };
  for (const input of Object.values(payInputs)) input.value = '';
  payStatus.textContent = '';
  renderPay();
  opener = document.activeElement;
  if (!dialog.open) dialog.showModal();
  methodField().focus();
}

function closePay() {
  if (S.pay.busy) return;
  pending = null;
  if (dialog.open) dialog.close();
}

function submitPay() {
  const pay = S.pay;
  if (pay.busy || !pending) return;
  let errMsg = '', errField = null, methodLine = '';
  if (pay.method === 'upi') {
    const v = pay.upi.trim();
    if (!/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(v)) { errMsg = 'Enter a valid UPI ID, e.g. name@okhdfcbank.'; errField = 'upi'; }
    methodLine = 'UPI · ' + v.replace(/^(.{2}).*(@.*)$/, '$1•••$2');
  } else if (pay.method === 'card') {
    const n = pay.card.replace(/\D/g, '');
    const m = pay.exp.match(/^(\d{2})\s*\/\s*(\d{2})$/);
    if (n.length < 13 || n.length > 19 || !luhn(n)) { errMsg = 'Enter a valid card number.'; errField = 'card'; }
    else if (!m || +m[1] < 1 || +m[1] > 12 || new Date(2000 + +m[2], +m[1], 0, 23, 59) < new Date()) { errMsg = 'Enter a valid, unexpired expiry date (MM/YY).'; errField = 'exp'; }
    else if (!/^\d{3,4}$/.test(pay.cvv.trim())) { errMsg = 'Enter the 3- or 4-digit CVV.'; errField = 'cvv'; }
    methodLine = 'Card · •••• ' + n.slice(-4);
  } else {
    if (!pay.bank) { errMsg = 'Select your bank.'; errField = 'bank'; }
    methodLine = 'Net banking · ' + pay.bank;
  }
  if (errMsg) {
    S.pay = { ...pay, err: errMsg, errField };
    renderPay(true);
    payInputs[errField].focus();
    return;
  }
  S.pay = { ...pay, err: '', errField: null, busy: true };
  renderPay();
  payStatus.textContent = 'Processing payment…';
  setTimeout(() => {
    payStatus.textContent = '';
    if (pay.method === 'upi' && pay.upi.trim().toLowerCase() === 'fail@test') {
      S.pay = { ...S.pay, busy: false, err: 'Payment declined by the bank. No amount was charged — please try again or use another method.', errField: null };
      if (!dialog.open && pending) dialog.showModal();   // closed mid-payment: bring the decline back into view
      renderPay(true);
      return;
    }
    const ref = 'pay_' + Array.from(crypto.getRandomValues(new Uint8Array(10))).map(b => ALPHA[b % 32]).join('');
    issue({ ref, methodLine });
  }, PROCESSING_MS);
}

function issue(payment) {
  if (!pending) return;
  const f = S.f;
  const plan = PLANS[f.plan];
  const { hash, existing, p } = pending;
  const now = new Date();
  const t = tax(plan.price, f.billState);
  const billing = { payRef: payment.ref, method: payment.methodLine, invoice: nextInvoice(now), paidAt: now.toISOString(), billState: f.billState, gstin: f.gstin.trim().toUpperCase(), base: t.base, cgst: t.cgst, sgst: t.sgst, igst: t.igst, gst: t.gst, total: t.total, gstRate: t.rate, pay: payment.ref };
  let rec, mode;
  if (existing) {
    rec = Object.assign({}, existing, billing, { plan: f.plan, price: plan.price, expiry: f.expiry, validUntil: termEnd(now, plan.years).toISOString(), renewedAt: now.toISOString(), renewals: (existing.renewals || 0) + 1 });
    mode = 'renewed';
  } else {
    rec = Object.assign({ id: toId(f.plan), hash, name: f.name.trim().replace(/\s+/g, ' '), country: f.country, masked: '•'.repeat(Math.max(p.length - 4, 2)) + p.slice(-4), last4: p.slice(-4), expiry: f.expiry, plan: f.plan, price: plan.price, issued: now.toISOString(), validUntil: termEnd(now, plan.years).toISOString(), renewals: 0 }, billing);
    mode = 'new';
  }
  S.register = [rec].concat(S.register.filter(x => x.hash !== hash));
  save(S.register);
  pending = null;
  S.copied = false;
  S.pay = { ...PAY0, method: S.pay.method };
  S.result = Object.assign({}, rec, { mode });
  opener = null;   // focus goes to the new card, not back to "Proceed to pay" (the close event fires later)
  if (dialog.open) dialog.close();
  renderCard();
  renderRegister();
  showResult();
}

/* ------------------------------------------------------------------ events: form and card */
form.addEventListener('input', e => {
  const k = e.target.dataset.key;
  if (k) onField(k, e.target.value);
});
form.addEventListener('change', e => {
  if (e.target.name === 'plan') pickPlan(e.target.value);
  else if (e.target.dataset.key && e.target.value !== S.f[e.target.dataset.key]) onField(e.target.dataset.key, e.target.value);
});
form.addEventListener('submit', e => { e.preventDefault(); proceed(); });
$('[data-reset]').addEventListener('click', reset);

for (const btn of $$('[data-choose]')) {
  btn.addEventListener('click', () => {
    const k = btn.dataset.choose;
    pickPlan(k);
    scrollToEl(form, 6);
    planRadios.find(r => r.value === k)?.focus({ preventScroll: true });
  });
}

copyBtn.addEventListener('click', async () => {
  if (!S.result) return;
  const id = fmtId(S.result.id);
  let ok = false;
  try { await navigator.clipboard.writeText(id); ok = true; } catch { ok = false; }
  if (ok) {
    S.copied = true;
    copyBtn.textContent = 'Copied';
    announce('Member ID ' + id + ' copied.');
  } else {
    const range = document.createRange();
    range.selectNodeContents(cardText.id);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    announce('Copying isn’t available here. The Member ID is selected on the card — press Ctrl+C to copy it.');
  }
});
$('[data-new]').addEventListener('click', () => { reset(); inputs.name.focus(); });

/* ------------------------------------------------------------------ events: checkout */
payForm.addEventListener('change', e => {
  if (e.target.name !== 'pay-method') return;
  S.pay = { ...S.pay, method: e.target.value, err: '', errField: null };
  renderPay();
});
payForm.addEventListener('input', e => {
  const k = e.target.dataset.payKey;
  if (!k) return;
  let v = e.target.value;
  if (k === 'card') v = v.replace(/[^\d ]/g, '').slice(0, 23);
  else if (k === 'exp') v = v.replace(/[^\d/ ]/g, '').slice(0, 7);
  else if (k === 'cvv') v = v.replace(/\D/g, '').slice(0, 4);
  if (v !== e.target.value) e.target.value = v;
  S.pay = { ...S.pay, [k]: v, err: '', errField: null };
  renderPayError();
});
payForm.addEventListener('submit', e => { e.preventDefault(); submitPay(); });
payCancel.addEventListener('click', closePay);
// Escape: closes like Cancel, but not while a payment is processing.
dialog.addEventListener('cancel', e => { e.preventDefault(); closePay(); });
dialog.addEventListener('close', () => {
  if (!S.pay.busy) pending = null;   // a forced close mid-payment lets the payment finish and the card appear
  const back = opener;
  opener = null;
  if (back && back.isConnected) back.focus();
});

/* ------------------------------------------------------------------ events: register */
let searchTimer;
search.addEventListener('input', () => {
  S.query = search.value;
  const n = renderRegister();
  clearTimeout(searchTimer);
  if (S.query.trim()) searchTimer = setTimeout(() => announce(n === 1 ? '1 Member ID matches.' : n + ' Member IDs match.'), 700);
});

rowsEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-revoke]');
  if (!btn) return;
  const x = S.register[Number(btn.dataset.revoke)];
  if (!x) return;
  const id = fmtId(x.id);
  if (!window.confirm('Revoke Member ID ' + id + '? The passport can then be registered again.')) return;
  S.register = S.register.filter(y => y !== x && !(x.hash && y.hash === x.hash));
  save(S.register);
  if (S.result && S.result.hash === x.hash) { S.result = null; S.copied = false; renderCard(); }
  renderRegister();
  tableWrap.focus({ preventScroll: true });
  announce('Member ID ' + id + ' revoked. The passport can be registered again.');
});

$('[data-export]').addEventListener('click', () => {
  const head = ['member_id', 'name', 'nationality', 'passport_last4', 'plan', 'taxable_value_inr', 'cgst_inr', 'sgst_inr', 'igst_inr', 'total_paid_inr', 'billing_state', 'gstin', 'tax_invoice', 'payment_reference', 'payment_method', 'paid_at', 'passport_expiry', 'first_issued', 'valid_until', 'renewals', 'status'];
  // Every value is quoted; a leading = + - @ is prefixed with ' so spreadsheets never run it as a formula.
  const esc = v => '"' + String(v == null ? '' : v).replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""') + '"';
  const lines = [head.join(',')].concat(S.register.map(x => [
    fmtId(x.id), x.name, x.country, x.last4, (tierYears(x.id) || planName(x.plan)),
    x.base ?? x.price ?? '', x.cgst ?? '', x.sgst ?? '', x.igst ?? '', x.total ?? '',
    x.billState || '', x.gstin || '', x.invoice || '', x.payRef || x.pay || '', x.method || '', x.paidAt || '',
    x.expiry, x.issued, x.validUntil || 'lifetime', x.renewals || 0, isActive(x) ? 'active' : 'expired'
  ].map(esc).join(',')));
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  const a = el('a', { href: url, download: 'aeroskys-member-ids.csv', hidden: true });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce((S.register.length === 1 ? '1 Member ID' : S.register.length + ' Member IDs') + ' exported to aeroskys-member-ids.csv.');
});

/* ------------------------------------------------------------------ header: highlight the section in view */
const spyLinks = $$('[data-nav]');
const spyIo = new IntersectionObserver(entries => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    const key = en.target.id === 'top' ? null : en.target.id;
    spyLinks.forEach(l => l.classList.toggle('is-active', l.dataset.nav === key));
  }
}, { rootMargin: '-45% 0px -50% 0px' });
['top', 'plans', 'benefits', 'status', 'join', 'register'].forEach(id => { const s = document.getElementById(id); if (s) spyIo.observe(s); });

/* ------------------------------------------------------------------ start */
S.register = migrate(loadRegister());
syncForm();
renderErrors();
renderSummary();
renderCard();
renderRegister();
