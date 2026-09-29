// Shared render helpers used across views.
import { html, raw, icon, esc } from '../core/dom.js';
import { airline, logoUrl } from '../data/airlines.js';
import { money } from '../core/format.js';

export const SERVICES = [
  { id: 'flights', label: 'Flights', icon: 'plane', href: '#/' },
  { id: 'hotels', label: 'Hotels', icon: 'bed', href: '#/hotels' },
  { id: 'holidays', label: 'Holidays', icon: 'palm', href: '#/holidays' },
  { id: 'bus', label: 'Bus', icon: 'bus', href: '#/bus' },
  { id: 'visa', label: 'Visa Enquiry', short: 'Visa', icon: 'passport', href: '#/visa', more: true },
  { id: 'group', label: 'Group Booking', short: 'Group', icon: 'users', href: '#/group-booking', more: true },
  { id: 'cab', label: 'Cab Enquiry', short: 'Cab', icon: 'car', href: '#/cab', more: true },
  { id: 'train', label: 'Train Enquiry', short: 'Train', icon: 'train', href: '#/train', more: true },
  { id: 'checkin', label: 'Web Check-in', short: 'Check-in', icon: 'ticket', href: '#/web-checkin', more: true },
  { id: 'tracking', label: 'Flight Tracking', short: 'Tracking', icon: 'radar', href: 'https://www.flightradar24.com', external: true, more: true }
];

export function airlineMark(code, size = '') {
  const al = airline(code);
  return html`<span class="al-mark ${size}" style="--al:${al.color};${al.fg ? `color:${al.fg}` : ''}" title="${al.name}"><span>${code}</span><img src="${logoUrl(code)}" alt="" loading="lazy" data-remove-on-error></span>`;
}

export function stars(n, max = 5) {
  const s = Math.round(n || 0);
  if (!s) return '';
  return html`<span class="stars" role="img" aria-label="${s} star">${Array.from({ length: Math.min(s, max) }, () => icon('star'))}</span>`;
}

export function ratingBadge(r) {
  const cls = r >= 4.2 ? '' : r >= 3.6 ? 'mid' : 'low';
  return html`<span class="rating ${cls}">${r.toFixed(1)}</span>`;
}

export function sectionHead({ eyebrow, title, aside, action, id }) {
  return html`<div class="sec-head reveal"${id ? raw(` id="${esc(id)}"`) : ''}>
    <div>${eyebrow ? html`<span class="eyebrow">${eyebrow}</span>` : ''}<h2 class="h2">${raw(title)}</h2></div>
    ${aside || action ? html`<div class="sec-aside">${aside ? html`<p>${raw(aside)}</p>` : ''}${action || ''}</div>` : ''}
  </div>`;
}

export function steps(list, current) {
  return html`<nav class="steps" aria-label="Booking progress">${list.map((s, i) => html`
    ${i ? html`<span class="step-line" aria-hidden="true"></span>` : ''}
    <span class="step ${i < current ? 'is-done' : i === current ? 'is-current' : ''}" ${i === current ? raw('aria-current="step"') : ''}>
      <i>${i < current ? icon('check') : i + 1}</i><span>${s}</span>
    </span>`)}</nav>`;
}

export function priceLines(lines, total, { totalLabel = 'Total Amount' } = {}) {
  return html`<div class="price-lines">
    ${lines.filter(Boolean).map(l => html`<div class="pl ${l.cls || ''}"><span>${l.label}${l.sub ? html` <small class="muted">${l.sub}</small>` : ''}</span><span class="tnum">${l.neg ? '(−) ' : ''}${money(l.amount, { decimals: !!l.decimals })}</span></div>`)}
    <div class="pl total"><span>${totalLabel}</span><span class="tnum">${money(total, { decimals: !Number.isInteger(Math.round(total * 100) / 100) })}</span></div>
  </div>`;
}

export function emptyState({ iconName = 'search', title, text, action }) {
  return html`<div class="empty">${icon(iconName)}<h3>${title}</h3>${text ? html`<p>${text}</p>` : ''}${action || ''}</div>`;
}

export function crumbs(items, light = false) {
  return html`<nav class="crumbs ${light ? 'on-light' : ''}" aria-label="Breadcrumb">${items.map((it, i) => html`${i ? icon('chevron-right') : ''}${it.href ? html`<a href="${it.href}">${it.label}</a>` : html`<span aria-current="page">${it.label}</span>`}`)}</nav>`;
}

export function protoNote(text = 'This is a working prototype: availability, prices and payments are simulated and nothing is charged.') {
  return html`<div class="note">${icon('info')}<span>${text}</span></div>`;
}

/** Validates simple forms: returns {ok, values}. Marks .has-error on invalid .field wrappers. */
export function validateForm(form, rules = {}) {
  const values = Object.fromEntries(new FormData(form).entries());
  let ok = true; let firstBad = null;
  form.querySelectorAll('.field').forEach(f => { f.classList.remove('has-error'); const e = f.querySelector('.field-error'); if (e) e.textContent = ''; });
  for (const [name, check] of Object.entries(rules)) {
    const msg = check(String(values[name] ?? '').trim(), values);
    if (msg) {
      ok = false;
      const input = form.elements[name];
      const field = (input?.closest?.('.field')) || (input?.[0]?.closest?.('.field'));
      if (field) { field.classList.add('has-error'); const e = field.querySelector('.field-error'); if (e) e.textContent = msg; }
      if (!firstBad) firstBad = input?.focus ? input : input?.[0];
    }
  }
  if (firstBad) { firstBad.focus({ preventScroll: true }); firstBad.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); }
  return { ok, values };
}

export const V = {
  required: (label = 'This field') => v => v ? '' : `${label} is required`,
  name: v => !v ? 'Please enter a name' : !/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(v) ? 'Use letters only (2–60 characters)' : '',
  email: v => !v ? 'Email is required' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Enter a valid email address' : '',
  mobile: v => !v ? 'Mobile number is required' : !/^[6-9]\d{9}$/.test(v.replace(/\D/g, '').slice(-10)) || v.replace(/\D/g, '').length < 10 ? 'Enter a valid 10-digit mobile number' : '',
  phoneIntl: v => !v ? 'Mobile number is required' : !/^\d{6,14}$/.test(v.replace(/\D/g, '')) ? 'Enter a valid phone number' : '',
  date: (label = 'Date') => v => !v ? `${label} is required` : '',
  positive: (label = 'Value') => v => !v ? `${label} is required` : Number(v) < 1 ? `${label} must be at least 1` : ''
};

export function field({ name, label, type = 'text', value = '', placeholder = '', required = false, hint = '', attrs = '', options = null, cls = '', autocomplete = '' }) {
  const id = 'f-' + name + '-' + Math.random().toString(36).slice(2, 6);
  const control = options
    ? html`<select class="select" id="${id}" name="${name}" ${raw(attrs)}>${options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return html`<option value="${v}" ${String(v) === String(value) ? raw('selected') : ''}>${l}</option>`; })}</select>`
    : type === 'textarea'
      ? html`<textarea class="textarea" id="${id}" name="${name}" placeholder="${placeholder}" ${raw(attrs)}>${value}</textarea>`
      : html`<input class="input" id="${id}" name="${name}" type="${type}" value="${value}" placeholder="${placeholder}" ${autocomplete ? raw(`autocomplete="${esc(autocomplete)}"`) : ''} ${raw(attrs)}>`;
  return html`<div class="field ${cls}"><label for="${id}">${label}${required ? html` <span class="req" aria-hidden="true">*</span>` : ''}</label>${control}${hint ? html`<span class="field-hint">${hint}</span>` : ''}<span class="field-error" role="alert"></span></div>`;
}

export const initials = name => String(name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
