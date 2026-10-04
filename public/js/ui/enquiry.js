// Enquiry pages share one pattern: a navy page band, a form card lifted over it,
// accessible fields (text, select, date & airport pickers, steppers, segmented radios,
// choice cards) and validation → saveEnquiry(kind, data) → a success panel.
//
// Every enquiry's `data` carries display-ready `title` and `summary` ([label, value] pairs)
// plus raw fields: `destination` (holiday, visa) or `from` / `to` (group, cab, train),
// and `contact: { name, email, phone }` — so account views can list any kind generically.
import { html, raw, icon, esc, $, $$, on, copyText, reducedMotion } from '../core/dom.js';
import { fmtDate, today, addDays, inr } from '../core/format.js';
import { store } from '../core/store.js';
import { saveEnquiry } from '../engines/bookings.js';
import { validateForm, V, crumbs } from './common.js';
import { pickDate, pickAirport } from './pickers.js';
import { openModal } from './overlay.js';
import { toast } from './toast.js';
import { COMPANY } from '../data/content.js';
import { AIRPORT, POPULAR_TO } from '../data/airports.js';
import { BUS_CITIES, HOTEL_CITIES } from '../data/cities.js';

let seq = 0;
const uid = name => `pg-${String(name).replace(/[^a-z0-9]/gi, '').toLowerCase()}-${(++seq).toString(36)}`;
const reqMark = required => (required ? html` <span class="req" aria-hidden="true">*</span>` : '');
const attr = (name, v) => (v || v === 0 ? raw(` ${name}="${esc(v)}"`) : '');
const pair = o => (Array.isArray(o) ? o : [o, o]);
const cx = (...c) => c.filter(Boolean).join(' ');

export const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
export const longDate = iso => (iso ? fmtDate(iso, 'ddd, d MMM yyyy') : '');
const dateLabel = iso => html`${fmtDate(iso, 'ddd, d MMM')}<span class="pg-y"> ${fmtDate(iso, 'yyyy')}</span>`;
export const cityNames = () => [...new Set([...BUS_CITIES, ...HOTEL_CITIES].map(c => c.name))].sort((a, b) => a.localeCompare(b));
export const contactOf = v => ({ name: v.name, email: String(v.email || '').toLowerCase(), phone: String(v.mobile || '').replace(/[^\d+]/g, '') });

/** Scrolls an element into view inside its modal body if it has one (never the page behind a sheet). */
export function bringIntoView(el, block = 'start') {
  if (!el) return;
  const behavior = reducedMotion() ? 'auto' : 'smooth';
  const box = el.closest('.modal-body');
  if (!box) { el.scrollIntoView({ block, behavior }); return; }
  const offset = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
  const top = block === 'center' ? offset - (box.clientHeight - el.offsetHeight) / 2 : offset - 8;
  box.scrollTo({ top: Math.max(0, top), behavior });
}

// ---------------------------------------------------------------- page frame
/** Navy band with crumbs, eyebrow and an editorial title (title may contain <em>; pass trusted text only). */
export function pageBand({ eyebrow = '', title, text = '', trail = [], art = '', contact = true, id = 'page-title' }) {
  return html`<section class="band page-hero pg-band" aria-labelledby="${id}">
    ${art ? html`<span class="pg-band-art" aria-hidden="true">${icon(art)}</span>` : ''}
    <div class="wrap pg-band-inner">
      <div class="pg-band-copy">
        ${crumbs([{ label: 'Home', href: '#/' }, ...trail])}
        ${eyebrow ? html`<span class="eyebrow on-dark">${eyebrow}</span>` : ''}
        <h1 class="display" id="${id}">${raw(title)}</h1>
        ${text ? html`<p class="pg-band-text">${text}</p>` : ''}
      </div>
      ${contact ? html`<div class="pg-band-contact">
        <a href="tel:${COMPANY.phoneIntl}">${icon('headset')}<span><small>24/7 support</small><b>${COMPANY.phone}</b></span></a>
        <a href="mailto:${COMPANY.email}">${icon('mail')}<span><small>Email us</small><b>${COMPANY.email}</b></span></a>
      </div>` : ''}
    </div>
  </section>`;
}

export function formHead({ iconName, title, text }) {
  return html`<div class="pg-form-head">
    ${iconName ? html`<span class="pg-form-ic" aria-hidden="true">${icon(iconName)}</span>` : ''}
    <div><h2 class="h3">${title}</h2>${text ? html`<p>${text}</p>` : ''}</div>
  </div>`;
}

// ---------------------------------------------------------------- field builders
// All builders wrap controls in `.field` so validateForm() can flag errors.
export function textField({ name, label, value = '', type = 'text', placeholder = '', required = false, autocomplete = '', inputmode = '', hint = '', list = '', maxlength = 0, span = false, extra = '' }) {
  const id = uid(name);
  return html`<div class="${cx('field', span && 'span-2', extra)}">
    <label for="${id}">${label}${reqMark(required)}</label>
    <input class="input" id="${id}" name="${name}" type="${type}" value="${value}"${attr('placeholder', placeholder)}${attr('autocomplete', autocomplete)}${attr('inputmode', inputmode)}${attr('list', list)}${attr('maxlength', maxlength || '')}${required ? raw(' aria-required="true"') : ''} aria-describedby="${id}-e${hint ? ` ${id}-h` : ''}">
    ${hint ? html`<span class="field-hint" id="${id}-h">${hint}</span>` : ''}
    <span class="field-error" id="${id}-e" role="alert"></span>
  </div>`;
}

export function textareaField({ name, label, value = '', placeholder = '', required = false, hint = '', span = true, rows = 4 }) {
  const id = uid(name);
  return html`<div class="${cx('field', span && 'span-2')}">
    <label for="${id}">${label}${reqMark(required)}</label>
    <textarea class="textarea" id="${id}" name="${name}" rows="${rows}"${attr('placeholder', placeholder)}${required ? raw(' aria-required="true"') : ''} aria-describedby="${id}-e${hint ? ` ${id}-h` : ''}">${value}</textarea>
    ${hint ? html`<span class="field-hint" id="${id}-h">${hint}</span>` : ''}
    <span class="field-error" id="${id}-e" role="alert"></span>
  </div>`;
}

/** options: [value, label] | string | { group, options: [...] } */
export function selectField({ name, label, options, value = '', placeholder = '', required = false, hint = '', span = false }) {
  const id = uid(name);
  const opt = o => { const [v, l] = pair(o); return html`<option value="${v}"${String(v) === String(value) ? raw(' selected') : ''}>${l}</option>`; };
  return html`<div class="${cx('field', span && 'span-2')}">
    <label for="${id}">${label}${reqMark(required)}</label>
    <select class="select" id="${id}" name="${name}"${required ? raw(' aria-required="true"') : ''} aria-describedby="${id}-e${hint ? ` ${id}-h` : ''}">
      ${placeholder ? html`<option value=""${value ? '' : raw(' selected')} disabled hidden>${placeholder}</option>` : ''}
      ${options.map(o => (o && o.group ? html`<optgroup label="${o.group}">${o.options.map(opt)}</optgroup>` : opt(o)))}
    </select>
    ${hint ? html`<span class="field-hint" id="${id}-h">${hint}</span>` : ''}
    <span class="field-error" id="${id}-e" role="alert"></span>
  </div>`;
}

/** A button that opens the shared calendar; the ISO date lives in a hidden input. `after` names a date field this one must not precede. */
export function dateField({ name, label, value = '', required = false, placeholder = 'Select date', hint = '', span = false, min = '', after = '' }) {
  const id = uid(name);
  return html`<div class="${cx('field', span && 'span-2')}" data-pg-fld="${name}">
    <label for="${id}" id="${id}-l">${label}${reqMark(required)}</label>
    <button type="button" class="${cx('input pg-pick', !value && 'is-empty')}" id="${id}" data-pg-date="${name}" data-label="${label}" data-placeholder="${placeholder}"${attr('data-min', min)}${attr('data-after', after)} aria-haspopup="dialog" aria-labelledby="${id}-l ${id}-v" aria-describedby="${id}-e">
      ${icon('calendar')}<span class="pg-pick-v" id="${id}-v">${value ? dateLabel(value) : placeholder}</span>${icon('chevron-down', 'pg-pick-caret')}
    </button>
    <input type="hidden" name="${name}" value="${value}">
    ${hint ? html`<span class="field-hint">${hint}</span>` : ''}
    <span class="field-error" id="${id}-e" role="alert"></span>
  </div>`;
}

const airportLabel = (a, placeholder) => (a ? html`<b>${a.city}</b> <small>${a.code} · ${a.name}</small>` : placeholder);

/** Airport picker (shared with flight search); the IATA code lives in a hidden input. */
export function airportField({ name, label, value = '', required = false, placeholder = 'Select city or airport', other = '', iconName = 'takeoff', popular = '' }) {
  const id = uid(name);
  const a = AIRPORT[value];
  return html`<div class="field" data-pg-fld="${name}">
    <label for="${id}" id="${id}-l">${label}${reqMark(required)}</label>
    <button type="button" class="${cx('input pg-pick pg-pick-ap', !a && 'is-empty')}" id="${id}" data-pg-airport="${name}" data-label="${label}" data-placeholder="${placeholder}"${attr('data-other', other)}${attr('data-popular', popular)} aria-haspopup="dialog" aria-labelledby="${id}-l ${id}-v" aria-describedby="${id}-e">
      ${icon(iconName)}<span class="pg-pick-v" id="${id}-v">${airportLabel(a, placeholder)}</span>
    </button>
    <input type="hidden" name="${name}" value="${a ? a.code : ''}">
    <span class="field-error" id="${id}-e" role="alert"></span>
  </div>`;
}

/** Number input with − / + buttons (editable, so large groups don't need 30 taps). */
export function stepperField({ name, label, value = 1, min = 1, max = 99, hint = '', required = true, span = false }) {
  const id = uid(name);
  const v = Math.max(min, Math.min(max, Number(value) || min));
  return html`<div class="${cx('field', span && 'span-2')}">
    <label for="${id}">${label}${reqMark(required)}</label>
    <div class="pg-stepper">
      <button type="button" data-pg-step="-1" aria-label="Decrease ${label}" aria-controls="${id}"${v <= min ? raw(' disabled') : ''}>${icon('minus')}</button>
      <input class="input" id="${id}" name="${name}" type="number" inputmode="numeric" min="${min}" max="${max}" step="1" value="${v}" aria-describedby="${id}-e${hint ? ` ${id}-h` : ''}">
      <button type="button" data-pg-step="1" aria-label="Increase ${label}" aria-controls="${id}"${v >= max ? raw(' disabled') : ''}>${icon('plus')}</button>
    </div>
    ${hint ? html`<span class="field-hint" id="${id}-h">${hint}</span>` : ''}
    <span class="field-error" id="${id}-e" role="alert"></span>
  </div>`;
}

/** Segmented radio group (One Way / Round Trip, titles…). */
export function segField({ name, label, options, value = '', required = false, span = true, hideLabel = false }) {
  return html`<fieldset class="${cx('field pg-fs', span && 'span-2')}">
    <legend class="${cx('field-label', hideLabel && 'sr-only')}">${label}${reqMark(required)}</legend>
    <div class="pg-seg">${options.map(o => { const [v, l] = pair(o); return html`<label><input type="radio" name="${name}" value="${v}"${String(v) === String(value) ? raw(' checked') : ''}><span>${l}</span></label>`; })}</div>
    <span class="field-error" role="alert"></span>
  </fieldset>`;
}

/** Radio cards. options: [{ value, label, sub, meta, icon }]; variant 'chips' is a compact single-row style. */
export function choiceField({ name, label, options, value = '', required = false, cols = 3, hint = '', variant = '' }) {
  return html`<fieldset class="field pg-fs span-2">
    <legend class="field-label">${label}${reqMark(required)}</legend>
    ${hint ? html`<span class="field-hint">${hint}</span>` : ''}
    <div class="${cx('pg-choices', variant && `is-${variant}`)}" style="--cols:${cols}">${options.map(o => html`<label class="pg-choice">
      <input type="radio" name="${name}" value="${o.value}"${String(o.value) === String(value) ? raw(' checked') : ''}>
      <span class="pg-choice-box">
        ${o.icon ? html`<span class="pg-choice-ic" aria-hidden="true">${icon(o.icon)}</span>` : ''}
        <span class="pg-choice-txt"><b>${o.label}</b>${o.sub ? html`<small>${o.sub}</small>` : ''}</span>
        ${o.meta ? html`<span class="pg-choice-meta">${o.meta}</span>` : ''}
        <span class="pg-choice-tick" aria-hidden="true">${icon('check')}</span>
      </span></label>`)}</div>
    <span class="field-error" role="alert"></span>
  </fieldset>`;
}

/** Two fields side by side with a swap button between them (From / To). */
export function pairFields(a, b, names, label = 'Swap') {
  return html`<div class="pg-pair span-2">${a}<button type="button" class="pg-swap" data-pg-swap="${names}" aria-label="${label}">${icon('swap')}</button>${b}</div>`;
}

export function datalist(id, names) {
  return html`<datalist id="${id}">${names.map(n => html`<option value="${n}"></option>`)}</datalist>`;
}
export const newListId = name => uid(name);

export function contactFields({ name = 'Full name', email = 'Email', mobile = 'Mobile', prefill, stack = false } = {}) {
  const u = prefill || store.get('user') || {};
  return html`
    ${textField({ name: 'name', label: name, value: u.name || '', required: true, autocomplete: 'name', span: true, placeholder: 'Your full name' })}
    ${textField({ name: 'email', label: email, type: 'email', value: u.email || '', required: true, autocomplete: 'email', inputmode: 'email', placeholder: 'name@email.com', span: stack })}
    ${textField({ name: 'mobile', label: mobile, type: 'tel', value: u.phone || '', required: true, autocomplete: 'tel', inputmode: 'tel', maxlength: 16, placeholder: '10-digit mobile number', span: stack })}`;
}
export const CONTACT_RULES = { name: V.name, email: V.email, mobile: V.mobile };

export function submitRow(label, note = true) {
  return html`<div class="pg-submit">
    <button type="submit" class="btn btn-primary btn-lg">${label}</button>
    ${note ? html`<p class="pg-consent">By sending this you agree to our <a class="link" href="#/terms">Terms &amp; conditions</a> and <a class="link" href="#/privacy">Privacy Policy</a>.</p>` : ''}
  </div>`;
}

// ---------------------------------------------------------------- field behaviour
function clearError(control) {
  const f = control?.closest?.('.field');
  if (!f || !f.classList.contains('has-error')) return;
  f.classList.remove('has-error');
  const e = f.querySelector('.field-error');
  if (e) e.textContent = '';
  f.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
}

export function setDateValue(form, name, iso) {
  const input = form.elements[name];
  const btn = form.querySelector(`[data-pg-date="${name}"]`);
  if (!input || !btn) return;
  input.value = iso || '';
  btn.classList.toggle('is-empty', !iso);
  $('.pg-pick-v', btn).innerHTML = String(iso ? dateLabel(iso) : html`${btn.dataset.placeholder || 'Select date'}`);
  clearError(btn);
  // A later date that now precedes this one is cleared (e.g. Return before Depart).
  $$(`[data-after="${name}"]`, form).forEach(b => {
    const other = form.elements[b.dataset.pgDate];
    if (iso && other?.value && other.value < iso) setDateValue(form, b.dataset.pgDate, '');
  });
  form.dispatchEvent(new CustomEvent('pg:set', { bubbles: true, detail: { name, value: iso } }));
}

export function setAirportValue(form, name, code) {
  const input = form.elements[name];
  const btn = form.querySelector(`[data-pg-airport="${name}"]`);
  if (!input || !btn) return;
  const a = AIRPORT[code];
  input.value = a ? a.code : '';
  btn.classList.toggle('is-empty', !a);
  $('.pg-pick-v', btn).innerHTML = String(html`${airportLabel(a, btn.dataset.placeholder || 'Select')}`);
  clearError(btn);
  form.dispatchEvent(new CustomEvent('pg:set', { bubbles: true, detail: { name, value: input.value } }));
}

function syncStepper(input) {
  const w = input.closest('.pg-stepper');
  if (!w) return;
  const v = parseInt(input.value, 10);
  w.querySelector('[data-pg-step="-1"]').disabled = !(v > Number(input.min));
  w.querySelector('[data-pg-step="1"]').disabled = !(v < Number(input.max)) && !Number.isNaN(v);
}

function swapValues(form, a, b) {
  const A = form.elements[a], B = form.elements[b];
  if (!A || !B) return;
  const va = A.value, vb = B.value;
  if (form.querySelector(`[data-pg-airport="${a}"]`)) { setAirportValue(form, a, vb); setAirportValue(form, b, va); return; }
  A.value = vb; B.value = va;
  clearError(A); clearError(B);
}

/** Wires pickers, steppers, swaps and live error clearing inside a form. Returns an unbind function. */
export function bindFields(form) {
  const offs = [
    on(form, 'click', '[data-pg-date]', (e, b) => {
      const name = b.dataset.pgDate, input = form.elements[name];
      let min = b.dataset.min || today();
      const after = b.dataset.after && form.elements[b.dataset.after]?.value;
      if (after && after > min) min = after;
      pickDate(b, {
        mode: 'single', start: input.value && input.value >= min ? input.value : '', min,
        title: b.dataset.label, labels: [b.dataset.label],
        onSelect: ({ start }) => { if (start) setDateValue(form, name, start); }
      });
    }),
    on(form, 'click', '[data-pg-airport]', (e, b) => {
      const name = b.dataset.pgAirport;
      const other = b.dataset.other ? form.elements[b.dataset.other]?.value : '';
      pickAirport(b, { title: b.dataset.label, exclude: other || undefined, popular: b.dataset.popular === 'to' ? POPULAR_TO : undefined, onSelect: a => setAirportValue(form, name, a.code) });
    }),
    on(form, 'click', '[data-pg-step]', (e, b) => {
      const input = b.closest('.pg-stepper').querySelector('input');
      const min = Number(input.min) || 0, max = Number(input.max) || 999;
      const cur = parseInt(input.value, 10);
      input.value = Math.max(min, Math.min(max, (Number.isNaN(cur) ? min : cur) + Number(b.dataset.pgStep)));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }),
    on(form, 'click', '[data-pg-swap]', (e, b) => swapValues(form, ...b.dataset.pgSwap.split(','))),
    on(form, 'input', 'input, select, textarea', (e, t) => { clearError(t); if (t.type === 'number') syncStepper(t); }),
    on(form, 'change', 'input, select, textarea', (e, t) => clearError(t))
  ];
  $$('.pg-stepper input', form).forEach(syncStepper);
  return () => offs.forEach(off => off());
}

/** validateForm + aria-invalid + focus the first invalid control (including picker buttons). */
export function checkForm(form, rules) {
  const res = validateForm(form, rules);
  $$('.field', form).forEach(f => {
    const bad = f.classList.contains('has-error');
    f.querySelectorAll('input:not([type=hidden]), select, textarea, button.pg-pick').forEach(c => (bad ? c.setAttribute('aria-invalid', 'true') : c.removeAttribute('aria-invalid')));
  });
  if (!res.ok) {
    const first = $('.field.has-error', form);
    if (first && !first.contains(document.activeElement)) {
      const ctl = first.querySelector('button.pg-pick, input:not([type=hidden]), select, textarea');
      ctl?.focus({ preventScroll: true });
    }
    bringIntoView(first, 'center');
  }
  return res;
}

const trimAll = values => Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));

// ---------------------------------------------------------------- submit & success
const DEFAULT_NEXT = [
  ['We review your request', 'The AeroSkys desk checks the details you shared.'],
  ['We call or email you', 'A consultant gets in touch with options and prices.'],
  ['You decide', 'Nothing is booked or charged until you confirm.']
];

export function successPanel(entry, { heading = 'Enquiry received', lead = '', next = DEFAULT_NEXT, again = 'Send another enquiry' } = {}) {
  const d = entry.data || {};
  const name = firstName(d.contact?.name);
  return html`<div class="pg-success" tabindex="-1" data-pg-success>
    <div class="pg-success-top">
      <span class="pg-success-ic" aria-hidden="true">${icon('check')}</span>
      <div><h2 class="h3">${heading}</h2><p>${lead || `Thank you${name ? `, ${name}` : ''}. We’ve noted your enquiry — keep the reference below handy.`}</p></div>
    </div>
    <div class="pg-ref"><span><small>Enquiry reference</small><b>${entry.ref}</b></span><button type="button" class="btn btn-light btn-sm" data-pg-copy>${icon('copy')} Copy</button></div>
    ${d.summary?.length ? html`<dl class="pg-sum">${d.summary.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>` : ''}
    <h3 class="pg-next-h">What happens next</h3>
    <ol class="pg-next">${next.map(([t, s]) => html`<li><b>${t}</b><span>${s}</span></li>`)}</ol>
    <p class="pg-sooner">Need it sooner? Call <a class="link" href="tel:${COMPANY.phoneIntl}">${COMPANY.phone}</a> — support is available 24/7.</p>
    <div class="note note-amber">${icon('info')}<span>Prototype: this enquiry is saved on this device only. Nothing has been sent to AeroSkys yet.</span></div>
    <div class="pg-success-actions">
      <a class="btn btn-dark" href="#/account?tab=enquiries">${icon('chat')} View my enquiries</a>
      <button type="button" class="btn btn-light" data-pg-again>${again}</button>
    </div>
  </div>`;
}

/**
 * Renders an enquiry form into `host` and handles submit → saveEnquiry → success panel.
 * opts: { kind, form(prefill) → html (the whole card content), rules | rules(form),
 *         build(values, form) → data, next(data) → [[title, text]], heading, againLabel,
 *         again(data) → prefill for "send another", onRender(form), onSaved(entry) }
 */
export function mountEnquiry(host, opts) {
  let unbind = () => {};
  let timer = 0;
  const render = (prefill = {}) => {
    unbind();
    clearTimeout(timer);
    host.innerHTML = String(opts.form(prefill));
    const form = $('form', host);
    const offFields = bindFields(form);
    const onSubmit = e => {
      e.preventDefault();
      const rules = typeof opts.rules === 'function' ? opts.rules(form) : opts.rules;
      const { ok, values } = checkForm(form, rules);
      if (!ok) return;
      const btn = form.querySelector('[type="submit"]');
      if (btn) { btn.classList.add('is-loading'); btn.disabled = true; }
      timer = setTimeout(() => {
        if (!host.isConnected) return;
        const entry = saveEnquiry(opts.kind, opts.build(trimAll(values), form));
        showSuccess(entry);
        opts.onSaved?.(entry);
      }, 320);
    };
    form.addEventListener('submit', onSubmit);
    unbind = () => { offFields(); form.removeEventListener('submit', onSubmit); };
    opts.onRender?.(form);
    return form;
  };
  const showSuccess = entry => {
    unbind(); unbind = () => {};
    host.innerHTML = String(successPanel(entry, { heading: opts.heading, next: opts.next?.(entry.data) || DEFAULT_NEXT, again: opts.againLabel }));
    const panel = $('[data-pg-success]', host);
    panel.querySelector('[data-pg-copy]').addEventListener('click', async () => {
      const ok = await copyText(entry.ref);
      toast(ok ? `Reference ${entry.ref} copied.` : 'Could not copy — please note the reference.', { type: ok ? 'success' : 'error' });
    });
    panel.querySelector('[data-pg-again]').addEventListener('click', () => {
      const f = render(opts.again?.(entry.data) || {});
      f.querySelector('input:not([type=hidden]), button.pg-pick, select')?.focus({ preventScroll: true });
      bringIntoView(host);
    });
    toast(`We’ve noted your enquiry. Reference ${entry.ref}.`, { title: 'Enquiry received' });
    panel.focus({ preventScroll: true });
    bringIntoView(panel);
  };
  render(opts.prefill || {});
  return {
    render,
    get form() { return $('form', host); },
    destroy() { unbind(); clearTimeout(timer); }
  };
}

// ---------------------------------------------------------------- aside cards
export function stepsCard(title, list) {
  return html`<section class="card pg-aside-card"><h2 class="h4">${title}</h2>
    <ol class="pg-steps">${list.map(([t, s]) => html`<li><b>${t}</b><span>${s}</span></li>`)}</ol></section>`;
}

export function contactCard(title = 'Prefer to talk?') {
  return html`<section class="card pg-aside-card"><h2 class="h4">${title}</h2>
    <p class="pg-aside-text">Get assistance 24/7 on any kind of travel related query.</p>
    <a class="pg-contact-row" href="tel:${COMPANY.phoneIntl}">${icon('phone')}<span><small>Call us</small><b>${COMPANY.phone}</b></span></a>
    <a class="pg-contact-row" href="mailto:${COMPANY.email}">${icon('mail')}<span><small>Email</small><b>${COMPANY.email}</b></span></a></section>`;
}

export function noteCard(text, iconName = 'info') {
  return html`<div class="pg-note-card">${icon(iconName)}<p>${text}</p></div>`;
}

// ---------------------------------------------------------------- holiday enquiry (live form)
export function holidayEnquiryHTML({ destination = '', departureCity = '', departureDate = '', heading = 'full', prefill } = {}) {
  const listId = uid('departure');
  const minDate = addDays(today(), 1);
  return html`${heading === 'full' ? html`<div class="pg-form-head hd-enq-head"><div><h2 class="h4">Want to Go For A Memorable Holiday?</h2><p>Provide Your Details to Know Best Holiday Deals</p></div></div>`
      : heading === 'sub' ? html`<p class="hd-enq-sub">Provide Your Details to Know Best Holiday Deals</p>` : ''}
    <form class="pg-form hd-enq-form" novalidate>
      <div class="form-grid">
        ${textField({ name: 'destination', label: 'Destination', value: destination, required: true, span: true, placeholder: 'Where do you want to go?', autocomplete: 'off' })}
        ${textField({ name: 'departureCity', label: 'City of Departure', value: departureCity, required: true, list: listId, placeholder: 'e.g. Delhi', autocomplete: 'off' })}
        ${dateField({ name: 'departureDate', label: 'Date of Departure', value: departureDate && departureDate >= minDate ? departureDate : '', required: true, min: minDate })}
        ${contactFields({ name: 'Full name', email: 'Email', mobile: 'Mobile', prefill, stack: true })}
      </div>
      ${datalist(listId, cityNames())}
      <button type="submit" class="btn btn-primary btn-block btn-lg">Send enquiry</button>
      <p class="pg-consent">By sending this you agree to our <a class="link" href="#/terms">Terms &amp; conditions</a> and <a class="link" href="#/privacy">Privacy Policy</a>.</p>
    </form>`;
}

/** Unsent values of a holiday form, used to restore a sheet that was closed before sending. */
export function holidayDraft(ctl) {
  const f = ctl?.form;
  if (!f) return null;
  const el = f.elements;
  return { destination: el.destination.value, departureCity: el.departureCity.value, departureDate: el.departureDate.value, contact: { name: el.name.value, email: el.email.value, phone: el.mobile.value } };
}

/** ctx: { destination, packageId, packageName, price, heading: 'full'|'sub'|false, prefill } */
export function mountHolidayEnquiry(host, ctx = {}) {
  return mountEnquiry(host, {
    kind: 'holiday',
    prefill: ctx.prefill || {},
    form: pre => holidayEnquiryHTML({ destination: pre.destination ?? ctx.destination ?? '', departureCity: pre.departureCity || '', departureDate: pre.departureDate || '', heading: ctx.heading ?? 'full', prefill: pre.contact }),
    rules: {
      destination: v => (v ? '' : 'Tell us where you want to go'),
      departureCity: v => (v ? '' : 'Enter your city of departure'),
      departureDate: v => (v ? '' : 'Choose your date of departure'),
      ...CONTACT_RULES
    },
    build: v => ({
      title: `Holiday · ${v.destination}`,
      destination: v.destination,
      departureCity: v.departureCity,
      departureDate: v.departureDate,
      packageId: ctx.packageId || null,
      packageName: ctx.packageName || null,
      price: ctx.price || null,
      contact: contactOf(v),
      summary: [
        ctx.packageId && ['Package', `${ctx.packageName} · from ${inr(ctx.price)} per person`],
        ['Destination', v.destination],
        ['City of departure', v.departureCity],
        ['Date of departure', longDate(v.departureDate)],
        ['Name', v.name], ['Mobile', v.mobile], ['Email', v.email]
      ].filter(Boolean)
    }),
    next: d => [
      ['We check your dates', `Our holiday desk looks at availability for ${d.destination} around ${longDate(d.departureDate)}.`],
      ['We call or email you', 'A travel consultant shares the best deal and answers your questions.'],
      ['You decide', d.packageId ? 'Nothing is booked or charged until you confirm. Payment then follows the package’s payment policy.' : 'Nothing is booked or charged until you confirm the plan.']
    ],
    again: d => ({ destination: d.destination, contact: d.contact }),
    againLabel: 'Send another enquiry'
  });
}

/** Holiday enquiry in a modal (bottom sheet on phones). Unsent details are kept if it is closed and reopened. */
let modalDraft = null;
export function openHolidayEnquiry({ destination = '', title = 'Want to Go For A Memorable Holiday?', packageId, packageName, price } = {}) {
  let ctl = null;
  const draft = modalDraft && (!destination || modalDraft.destination === destination) ? modalDraft : null;
  return openModal({
    title,
    className: 'pg-enq-modal',
    body: html`<div data-pg-host></div>`,
    onOpen(dlg) { ctl = mountHolidayEnquiry($('[data-pg-host]', dlg), { destination, packageId, packageName, price, heading: 'sub', prefill: draft || {} }); },
    onClose() { modalDraft = holidayDraft(ctl); ctl?.destroy(); }
  });
}
