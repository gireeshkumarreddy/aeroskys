// Aeroskys Member ID generator. One Member ID per passport: the ID is derived from a one-way SHA-256
// fingerprint of the nationality and passport number, so the same passport always returns the same ID
// and a traveller cannot be registered twice. The register keeps only that fingerprint, the last four
// characters and the details shown, in this browser's storage; full passport numbers are never stored.
import { $, $$, esc, icon, toast } from './ui.js';
import './shell.js';

const KEY = 'aeroskys-member-register';
const SALT = 'AEROSKYS-MEMBER-V1';
const ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const COUNTRIES = { IND: 'India', ARE: 'United Arab Emirates', GBR: 'United Kingdom', USA: 'United States', SGP: 'Singapore', SAU: 'Saudi Arabia', QAT: 'Qatar', OMN: 'Oman', KWT: 'Kuwait', BHR: 'Bahrain', NPL: 'Nepal', LKA: 'Sri Lanka', BGD: 'Bangladesh', MYS: 'Malaysia', THA: 'Thailand', AUS: 'Australia', CAN: 'Canada', DEU: 'Germany', FRA: 'France', OTH: 'Other' };
const PLAN = 'Lifetime · one tier · up to 9 passengers per booking';

const form = $('[data-mid-form]');
const field = key => $(`#m-${key}`);
const resultBox = $('[data-mid-result]');
const resultTitle = $('#res-title');
const live = $('[data-mid-live]');
const genBtn = $('[data-mid-generate]');
const search = $('[data-mid-search]');
const rowsEl = $('[data-mid-rows]');
const emptyEl = $('[data-mid-empty]');
const countEl = $('[data-mid-count]');
const exportBtn = $('[data-mid-export]');
const dlg = $('#dialog-revoke');
const EMPTY = resultBox.innerHTML;

let register = load();
let result = null;
let busy = false;

function load() {
  try { const r = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(r) ? r : []; } catch { return []; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(register)); } catch { /* storage unavailable: the register lasts for this visit */ }
}
const norm = p => String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const fmt = iso => { try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };
const read = () => ({ name: field('name').value, country: field('country').value, passport: field('passport').value, expiry: field('expiry').value, pay: field('pay').value });

function validate(f) {
  const e = {};
  const p = norm(f.passport);
  if (f.name.trim().length < 3) e.name = 'Enter the full name exactly as printed on the passport.';
  if (!p) e.passport = 'Enter the passport number.';
  else if (f.country === 'IND' && !/^[A-Z][0-9]{7}$/.test(p)) e.passport = 'Indian passports are one letter followed by seven digits, e.g. A1234567.';
  else if (!/^[A-Z0-9]{6,9}$/.test(p)) e.passport = 'Passport numbers are 6–9 letters and digits.';
  if (!f.expiry) e.expiry = 'Enter the expiry date.';
  else if (new Date(f.expiry + 'T23:59:59') < new Date()) e.expiry = 'This passport has expired. A valid passport is required.';
  if (f.pay.trim().length < 4) e.pay = 'Enter the ₹499 membership fee payment reference.';
  return e;
}

async function fingerprint(country, passport) {
  const data = new TextEncoder().encode(`${SALT}|${country}|${passport}`);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))];
}

/** Eight base-32 characters from the fingerprint plus a weighted check character: ASK-XXXX-XXXX-C. */
function toId(bytes) {
  let bits = 0, val = 0, out = '';
  for (let i = 0; i < bytes.length && out.length < 8; i++) {
    val = (val << 8) | bytes[i]; bits += 8;
    while (bits >= 5 && out.length < 8) { bits -= 5; out += ALPHA[(val >> bits) & 31]; }
  }
  let sum = 0;
  for (let i = 0; i < out.length; i++) sum += (ALPHA.indexOf(out[i]) + 1) * (i + 1);
  return `ASK-${out.slice(0, 4)}-${out.slice(4, 8)}-${ALPHA[sum % 32]}`;
}

/* ---------------------------------------------------------------- form */
function setError(key, message) {
  const wrap = $(`[data-field="${key}"]`, form);
  const out = $(`#e-${key}`);
  if (!wrap || !out) return;
  wrap.classList.toggle('has-error', !!message);
  if (message) field(key).setAttribute('aria-invalid', 'true'); else field(key).removeAttribute('aria-invalid');
  out.hidden = !message;
  out.innerHTML = message ? `${icon('alert')}<span>${esc(message)}</span>` : '';
}

function showResult({ focus = false } = {}) {
  if (!result) { resultBox.innerHTML = EMPTY; return; }
  const r = result;
  resultBox.innerHTML = `
    <div class="cr-mid-tags">
      <span class="cr-mid-tag ${r.duplicate ? 'is-existing' : 'is-ok'}">${icon(r.duplicate ? 'info' : 'check-circle')}${r.duplicate ? 'Already a member' : 'Verified · ID issued'}</span>
      <span class="cr-mid-tag is-outline">${icon('globe')}${esc(COUNTRIES[r.country] || r.country)}</span>
    </div>
    <div class="cr-mid-idcard">
      <p class="cr-mid-idlabel">Aeroskys Member ID</p>
      <p class="cr-mid-id">${esc(r.id)}</p>
    </div>
    <dl class="cr-mid-dl">
      <div><dt>Member</dt><dd><b>${esc(r.name)}</b></dd></div>
      <div><dt>Passport</dt><dd class="cr-mid-mono">${esc(r.masked)}</dd></div>
      <div><dt>Issued</dt><dd>${esc(fmt(r.issued))}</dd></div>
      <div><dt>Fee reference</dt><dd>${esc(r.pay)}</dd></div>
      <div><dt>Plan</dt><dd>${PLAN}</dd></div>
    </dl>
    ${r.duplicate ? `<p class="cr-mid-note">${icon('info')}<span>This passport already holds a Member ID. No new ID was issued — the existing one is shown.</span></p>` : ''}
    <div class="cr-cta-row">
      <button class="cr-btn cr-btn-outline" type="button" data-mid-copy>${icon('copy')} Copy ID</button>
      <button class="cr-btn cr-btn-ghost" type="button" data-mid-new>New traveller</button>
    </div>`;
  if (focus) {
    const top = resultTitle.getBoundingClientRect().top;
    if (top < 90 || top > innerHeight - 160) resultTitle.closest('.cr-mid-result').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    resultTitle.focus({ preventScroll: true });
  }
}

function setBusy(on) {
  busy = on;
  genBtn.disabled = on;
  genBtn.textContent = on ? 'Generating…' : 'Generate Member ID';
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (busy) return;
  const f = read();
  const errors = validate(f);
  for (const key of ['name', 'passport', 'expiry', 'pay']) setError(key, errors[key]);
  const first = ['name', 'passport', 'expiry', 'pay'].find(k => errors[k]);
  if (first) { field(first).focus(); live.textContent = 'Please check the highlighted fields.'; return; }
  if (!window.isSecureContext || !crypto?.subtle) {
    resultBox.innerHTML = `<p class="cr-mid-note is-alert">${icon('alert')}<span>Member IDs can only be generated on a secure (https) page. Open this page over https and try again.</span></p>`;
    return;
  }
  setBusy(true);
  try {
    const p = norm(f.passport);
    const bytes = await fingerprint(f.country, p);
    const hash = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
    const existing = register.find(x => x.hash === hash);
    if (existing) {
      result = { ...existing, duplicate: true };
    } else {
      const rec = { id: toId(bytes), hash, name: f.name.trim().replace(/\s+/g, ' '), country: f.country, masked: '•'.repeat(Math.max(p.length - 4, 2)) + p.slice(-4), last4: p.slice(-4), pay: f.pay.trim(), expiry: f.expiry, issued: new Date().toISOString() };
      register = [rec, ...register];
      save();
      result = { ...rec, duplicate: false };
    }
  } finally { setBusy(false); }
  showResult({ focus: true });
  renderRegister();
  live.textContent = result.duplicate
    ? `This passport already holds Member ID ${result.id}. No new ID was issued.`
    : `Member ID ${result.id} issued for ${result.name}.`;
});

// Editing any detail clears that field's message and the shown ID, so the ID always matches the form.
form.addEventListener('input', e => {
  const key = e.target.name;
  if (key === 'country') {
    field('passport').placeholder = e.target.value === 'IND' ? 'e.g. A1234567' : '6–9 letters and digits';
    setError('passport', '');
  } else setError(key, '');
  if (result) { result = null; showResult(); }
});
form.addEventListener('reset', () => {
  for (const key of ['name', 'passport', 'expiry', 'pay']) setError(key, '');
  field('passport').placeholder = 'e.g. A1234567';
  result = null;
  showResult();
});

resultBox.addEventListener('click', async e => {
  if (e.target.closest('[data-mid-new]')) { form.reset(); field('name').focus(); return; }
  const copy = e.target.closest('[data-mid-copy]');
  if (!copy || !result) return;
  try {
    await navigator.clipboard.writeText(result.id);
    copy.innerHTML = `${icon('check')} Copied`;
    toast(`Member ID ${result.id} copied`);
  } catch {
    toast('Copying isn’t available here. Select the ID to copy it.', { iconName: 'info' });
  }
});

/* ---------------------------------------------------------------- register */
function renderRegister() {
  const q = search.value.trim().toUpperCase();
  const rows = register.filter(x => !q || x.id.includes(q) || x.name.toUpperCase().includes(q) || (x.last4 || '').includes(q));
  rowsEl.innerHTML = rows.map(x => `<tr>
      <th scope="row" data-label="Member ID" class="cr-mid-mono">${esc(x.id)}</th>
      <td data-label="Name">${esc(x.name)}</td>
      <td data-label="Nation"><abbr title="${esc(COUNTRIES[x.country] || x.country)}">${esc(x.country)}</abbr></td>
      <td data-label="Passport" class="cr-mid-mono">${esc(x.masked)}</td>
      <td data-label="Fee ref."><span class="cr-mid-clip">${esc(x.pay)}</span></td>
      <td data-label="Issued">${esc(fmt(x.issued))}</td>
      <td class="cr-mid-actions"><button class="cr-btn cr-btn-ghost cr-mid-revoke" type="button" data-revoke="${esc(x.hash)}" aria-label="Revoke Member ID ${esc(x.id)}">Revoke</button></td>
    </tr>`).join('');
  countEl.textContent = register.length === 1 ? '1 Member ID issued' : `${register.length} Member IDs issued`;
  emptyEl.hidden = rows.length > 0;
  emptyEl.textContent = register.length ? 'No Member IDs match that search.' : 'No Member IDs issued yet.';
  rowsEl.closest('table').classList.toggle('is-empty', rows.length === 0);
  exportBtn.disabled = register.length === 0;
  syncScroller();
}
search.addEventListener('input', renderRegister);

// On narrow screens the table scrolls sideways: the scroll box then takes keyboard focus so it can be scrolled
// without a mouse (and leaves the tab order when everything fits).
const scroller = $('[data-mid-scroll]');
const syncScroller = () => {
  if (scroller.scrollWidth > scroller.clientWidth + 1) scroller.setAttribute('tabindex', '0');
  else scroller.removeAttribute('tabindex');
};
new ResizeObserver(syncScroller).observe(scroller);

rowsEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-revoke]');
  if (!btn) return;
  const rec = register.find(x => x.hash === btn.dataset.revoke);
  if (!rec) return;
  const revoke = () => {
    register = register.filter(y => y.hash !== rec.hash);
    save();
    if (result && result.hash === rec.hash) { result = null; showResult(); }
    renderRegister();
    $('#reg-title').focus({ preventScroll: true });
    toast(`Member ID ${rec.id} revoked. The passport can be registered again.`);
  };
  if (typeof dlg.showModal !== 'function') {
    if (confirm(`Revoke Member ID ${rec.id}? The passport can then be registered again.`)) revoke();
    return;
  }
  $('[data-revoke-id]', dlg).textContent = rec.id;
  dlg.returnValue = '';
  dlg.addEventListener('close', () => { if (dlg.returnValue === 'revoke') revoke(); else btn.focus(); }, { once: true });
  dlg.showModal();
});
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close('cancel'); });

exportBtn.addEventListener('click', () => {
  const head = ['member_id', 'name', 'nationality', 'passport_last4', 'fee_reference', 'passport_expiry', 'issued_at'];
  // Quote every value; a leading = + - @ is prefixed so spreadsheets never run it as a formula.
  const cell = v => `"${String(v ?? '').replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;
  const lines = [head.join(','), ...register.map(x => [x.id, x.name, x.country, x.last4, x.pay, x.expiry, x.issued].map(cell).join(','))];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'aeroskys-member-ids.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`${register.length === 1 ? '1 Member ID' : `${register.length} Member IDs`} exported`, { iconName: 'download' });
});

/* ---------------------------------------------------------------- header: the link for the section in view */
const spyLinks = $$('[data-nav]');
const spy = new IntersectionObserver(entries => {
  for (const en of entries) if (en.isIntersecting) spyLinks.forEach(l => l.classList.toggle('is-active', l.dataset.nav === en.target.id));
}, { rootMargin: '-45% 0px -50% 0px' });
['generate', 'register'].forEach(id => spy.observe(document.getElementById(id)));

renderRegister();
