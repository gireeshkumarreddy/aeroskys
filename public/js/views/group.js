// Flight group booking (#/group-booking): the live "Flight Group Booking" enquiry for 10+ travellers.
// Flight search can link here with ?from=DEL&to=BOM&depart=YYYY-MM-DD&return=YYYY-MM-DD&trip=round
// and the traveller count as ?adt=&chd=&inf= (or ?pax=) — all prefilled; minimum 10 travellers.
import { html, raw, icon, mount, on, $ } from '../core/dom.js';
import { today, isValidISO } from '../core/format.js';
import { AIRPORT } from '../data/airports.js';
import { AIRLINES } from '../data/airlines.js';
import {
  pageBand, formHead, mountEnquiry, segField, airportField, pairFields, dateField, choiceField, stepperField,
  selectField, textareaField, contactFields, CONTACT_RULES, submitRow, stepsCard, contactCard, contactOf, longDate, setDateValue
} from '../ui/enquiry.js';

const TIMES = [
  { value: 'Any time', label: 'Any time', icon: 'clock' },
  { value: 'Before 6 AM', label: 'Before 6 AM', icon: 'moon' },
  { value: '6 AM to 12 PM', label: '6 AM to 12 PM', icon: 'sunrise' },
  { value: '12 PM to 6 PM', label: '12 PM to 6 PM', icon: 'sun' },
  { value: 'After 6 PM', label: 'After 6 PM', icon: 'sunset' }
];
const AIRLINE_NAMES = [...new Set(Object.values(AIRLINES).map(a => a.name))].sort((a, b) => a.localeCompare(b));

function prefillFromQuery(q) {
  const code = s => { const c = String(s || '').toUpperCase(); return AIRPORT[c] ? c : ''; };
  const day = s => (isValidISO(s) && s >= today() ? s : '');
  const counted = ['adt', 'chd', 'inf'].reduce((n, k) => n + (Number(q.get(k)) || 0), 0);
  const pax = Number(q.get('pax') || q.get('travellers')) || counted;
  const pre = {
    trip: q.get('trip') === 'round' || q.get('return') ? 'round' : 'oneway',
    from: code(q.get('from')), to: code(q.get('to')),
    depart: day(q.get('depart')), ret: day(q.get('return')),
    travellers: Math.max(10, Math.min(99, pax || 10))
  };
  if (pre.from && pre.from === pre.to) pre.to = '';
  if (pre.ret && pre.depart && pre.ret < pre.depart) pre.ret = '';
  return pre;
}

const formHTML = p => html`${formHead({ iconName: 'users', title: 'Flight Group Booking', text: 'For 10 or more travellers flying together. Share your plan and we’ll get back to you with group fares.' })}
  <form class="pg-form" novalidate>
    <div class="form-grid">
      ${segField({ name: 'trip', label: 'Trip type', options: [['oneway', 'One Way'], ['round', 'Round Trip']], value: p.trip || 'oneway', hideLabel: true })}
      ${pairFields(
        airportField({ name: 'from', label: 'From', value: p.from || '', required: true, other: 'to', iconName: 'takeoff' }),
        airportField({ name: 'to', label: 'To', value: p.to || '', required: true, other: 'from', iconName: 'landing', popular: 'to' }),
        'from,to', 'Swap From and To')}
      ${dateField({ name: 'depart', label: 'Depart On', value: p.depart || '', required: true })}
      <div class="pg-ret" data-pg-ret${(p.trip || 'oneway') === 'round' ? '' : raw(' hidden')}>${dateField({ name: 'ret', label: 'Return', value: p.ret || '', required: true, after: 'depart' })}</div>
      ${choiceField({ name: 'time', label: 'Select Departure Time', options: TIMES, value: p.time || 'Any time', cols: 5, variant: 'chips' })}
      ${stepperField({ name: 'travellers', label: 'Travellers', value: p.travellers || 10, min: 10, max: 99, hint: 'Group bookings start at 10 travellers' })}
      ${selectField({ name: 'airline', label: 'Airline preference', options: ['Any airline', ...AIRLINE_NAMES], value: p.airline || 'Any airline' })}
      ${contactFields({ name: 'Full Name', email: 'Email ID', mobile: 'Mobile No', prefill: p.contact })}
      ${textareaField({ name: 'remarks', label: 'Remarks', value: p.remarks || '', placeholder: 'Anything else we should know — flexible dates, baggage, special assistance…', rows: 3 })}
    </div>
    ${submitRow('Request group fares')}
  </form>`;

export default async function groupBooking(el, ctx) {
  document.title = 'Flight Group Booking — Exclusive Group Fares | AeroSkys';

  mount(el, html`<div class="pg-view pg-group">
    ${pageBand({ eyebrow: 'Group Booking', title: 'Flight group <em>booking.</em>', text: 'More than 9 travellers? Get exclusive group fares — share your route, dates and group size, and our team will get back to you.', trail: [{ label: 'Group Booking' }], art: 'users' })}
    <div class="wrap pg-layout pg-lift">
      <div class="card pg-form-card" data-pg-host></div>
      <aside class="pg-aside">
        ${stepsCard('How group booking works', [
          ['Share your trip', 'Route, dates, number of travellers and your preferred airline and time.'],
          ['Get group fares', 'Our team checks exclusive group fares and sends you a quote.'],
          ['Confirm', 'Nothing is booked until you accept the quote.']
        ])}
        <section class="card pg-aside-card pg-aside-cta">
          <h2 class="h4">Fewer than 10 travellers?</h2>
          <p class="pg-aside-text">Book up to 9 travellers online — it only takes a few minutes.</p>
          <a class="btn btn-light btn-block" href="#/">${icon('plane')} Search flights</a>
        </section>
        ${contactCard()}
      </aside>
    </div>
  </div>`);

  const root = el.firstElementChild;
  const enquiry = mountEnquiry($('[data-pg-host]', root), {
    kind: 'group',
    prefill: prefillFromQuery(ctx.query),
    form: formHTML,
    onRender(form) {
      form.addEventListener('change', e => {
        if (e.target.name !== 'trip') return;
        const round = e.target.value === 'round';
        $('[data-pg-ret]', form).hidden = !round;
        if (!round) setDateValue(form, 'ret', '');
      });
    },
    rules: {
      from: v => (v ? '' : 'Choose where you are flying from'),
      to: (v, a) => (!v ? 'Choose where you are flying to' : v === a.from ? 'From and To must be different' : ''),
      depart: v => (v ? '' : 'Choose your departure date'),
      ret: (v, a) => (a.trip !== 'round' ? '' : !v ? 'Choose a return date, or switch to One Way' : v < a.depart ? 'Return must be on or after the departure date' : ''),
      travellers: v => { const n = Number(v); return !Number.isInteger(n) || n < 10 ? 'Group bookings are for 10 or more travellers' : n > 99 ? 'For more than 99 travellers, please call us' : ''; },
      ...CONTACT_RULES
    },
    build: v => {
      const A = AIRPORT[v.from], B = AIRPORT[v.to], round = v.trip === 'round';
      return {
        title: `Group booking · ${A.city} to ${B.city}`,
        trip: v.trip, from: v.from, to: v.to, depart: v.depart, return: round ? v.ret : null,
        time: v.time || 'Any time', travellers: Number(v.travellers), airline: v.airline || 'Any airline', remarks: v.remarks || '',
        contact: contactOf(v),
        summary: [
          ['Trip', round ? 'Round Trip' : 'One Way'],
          ['From', `${A.city} (${A.code})`], ['To', `${B.city} (${B.code})`],
          ['Depart on', longDate(v.depart)], round && ['Return', longDate(v.ret)],
          ['Departure time', v.time || 'Any time'], ['Travellers', v.travellers], ['Airline preference', v.airline || 'Any airline'],
          ['Name', v.name], ['Mobile', v.mobile], ['Email', v.email], v.remarks && ['Remarks', v.remarks]
        ].filter(Boolean)
      };
    },
    next: d => [
      ['We check group fares', `Our team looks for fares for ${d.travellers} travellers from ${AIRPORT[d.from]?.city || d.from} to ${AIRPORT[d.to]?.city || d.to}.`],
      ['We send you a quote', 'A consultant calls or emails you with the options and fare rules.'],
      ['You confirm', 'Nothing is booked until you accept the quote.']
    ],
    again: d => ({ contact: d.contact }),
    againLabel: 'Send another group request'
  });

  return () => enquiry.destroy();
}
