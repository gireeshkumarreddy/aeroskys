// Car rental enquiry (#/cab): the live "Car Rental Enquiry" — trip type, route, dates and times,
// passengers, vehicle choice with seating capacity — plus cab offers. Accepts ?from=&to= to prefill.
import { html, raw, icon, mount, on, $ } from '../core/dom.js';
import { today, hm12 } from '../core/format.js';
import { sectionHead } from '../ui/common.js';
import { offerCard, openOffer } from '../ui/cards.js';
import {
  pageBand, formHead, mountEnquiry, segField, textField, pairFields, dateField, stepperField, choiceField,
  contactFields, CONTACT_RULES, submitRow, stepsCard, contactCard, contactOf, longDate, setDateValue, datalist, newListId
} from '../ui/enquiry.js';
import { OFFERS } from '../data/content.js';
import { BUS_CITIES, HOTEL_CITIES } from '../data/cities.js';

// Seating is the usual capacity for each category; the desk confirms the exact vehicle.
const VEHICLES = [
  { value: 'Mini', label: 'Mini', seats: 4, sub: 'Compact hatchback for city rides' },
  { value: 'Prime Sedan', label: 'Prime Sedan', seats: 4, sub: 'Sedan with more room for bags' },
  { value: 'Prime SUV', label: 'Prime SUV', seats: 6, sub: 'Space for families and luggage' }
];
const MAX_PAX = Math.max(...VEHICLES.map(v => v.seats));
const CITIES = [...new Set([...BUS_CITIES.map(c => c.name), ...HOTEL_CITIES.filter(c => !c.intl).map(c => c.name)])].sort((a, b) => a.localeCompare(b));
const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const time12 = v => { const [h, m] = String(v || '').split(':').map(Number); return Number.isFinite(h) && Number.isFinite(m) ? hm12(h * 60 + m) : ''; };
const nowHM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

const formHTML = p => {
  const listId = newListId('cab-cities');
  return html`${formHead({ iconName: 'car', title: 'Car Rental Enquiry', text: 'City rides, airport transfers and outstation trips. Tell us your plan and we’ll arrange the right car.' })}
  <form class="pg-form" novalidate>
    <div class="form-grid">
      ${segField({ name: 'trip', label: 'Trip type', options: [['oneway', 'One Way'], ['round', 'Round Trip']], value: p.trip || 'oneway', hideLabel: true })}
      ${pairFields(
        textField({ name: 'from', label: 'From', value: p.from || '', required: true, list: listId, placeholder: 'Pick-up city, area or airport', autocomplete: 'off' }),
        textField({ name: 'to', label: 'To', value: p.to || '', required: true, list: listId, placeholder: 'Drop city, area or airport', autocomplete: 'off' }),
        'from,to', 'Swap From and To')}
      ${dateField({ name: 'start', label: 'Trip Start Date', value: p.start || '', required: true })}
      <div class="pg-ret" data-pg-ret${p.trip === 'round' ? '' : raw(' hidden')}>${dateField({ name: 'end', label: 'Trip End Date', value: p.end || '', required: true, after: 'start' })}</div>
      <div class="pg-row3 span-2">
        ${stepperField({ name: 'passengers', label: 'Passengers', value: p.passengers || 1, min: 1, max: MAX_PAX })}
        ${textField({ name: 'pickupTime', label: 'Pick Up Time', type: 'time', value: p.pickupTime || '', required: true })}
        ${textField({ name: 'dropTime', label: 'Drop Time', type: 'time', value: p.dropTime || '', hint: 'Optional' })}
      </div>
      ${choiceField({ name: 'vehicle', label: 'Select Vehicle', value: p.vehicle || '', required: true, cols: 3,
        options: VEHICLES.map(v => ({ value: v.value, label: v.label, sub: v.sub, icon: 'car', meta: html`${icon('users')} Up to ${v.seats} passengers` })) })}
      ${contactFields({ name: 'Full Name', email: 'Email ID', mobile: 'Mobile Number', prefill: p.contact })}
    </div>
    ${datalist(listId, CITIES)}
    ${submitRow('Send cab enquiry')}
  </form>`;
};

export default async function cab(el, ctx) {
  document.title = 'Car Rental Enquiry — Cabs for City, Airport & Outstation Trips | AeroSkys';
  const cabOffers = OFFERS.filter(o => o.kind === 'cab');
  const pre = { from: (ctx.query.get('from') || '').slice(0, 60), to: (ctx.query.get('to') || '').slice(0, 60), trip: ctx.query.get('trip') === 'round' ? 'round' : 'oneway' };

  mount(el, html`<div class="pg-view pg-cab">
    ${pageBand({ eyebrow: 'Cab Enquiry', title: 'Book a cab <em>for any trip.</em>', text: 'City rides, airport transfers and outstation trips. Tell us your plan and we’ll arrange the right car at a good price.', trail: [{ label: 'Cab Enquiry' }], art: 'car' })}
    <div class="wrap pg-layout pg-lift">
      <div class="card pg-form-card" data-pg-host></div>
      <aside class="pg-aside">
        ${stepsCard('How it works', [
          ['Tell us your trip', 'Route, dates, pick-up time, passengers and the car you prefer.'],
          ['We confirm the fare', 'The AeroSkys desk checks availability and shares the fare.'],
          ['You confirm', 'Nothing is booked until you accept the fare.']
        ])}
        ${contactCard()}
      </aside>
    </div>
    ${cabOffers.length ? html`<section class="section-sm bg-wash" aria-labelledby="pg-cab-offers-title">
      <div class="wrap">
        ${sectionHead({ eyebrow: 'Cab offers', title: '<span id="pg-cab-offers-title">Offers on <em>cab rides.</em></span>', action: html`<a class="underline-link" href="#/offers?tab=cab">All offers ${icon('arrow-up-right')}</a>` })}
        <div class="rail pg-offer-rail" role="group" aria-label="Cab offers">${cabOffers.map(offerCard)}</div>
      </div>
    </section>` : ''}
  </div>`);

  const root = el.firstElementChild;
  const enquiry = mountEnquiry($('[data-pg-host]', root), {
    kind: 'cab',
    prefill: pre,
    form: formHTML,
    onRender(form) {
      form.addEventListener('change', e => {
        if (e.target.name !== 'trip') return;
        const round = e.target.value === 'round';
        $('[data-pg-ret]', form).hidden = !round;
        if (!round) setDateValue(form, 'end', '');
      });
    },
    rules: {
      from: v => (v ? '' : 'Enter where the trip starts'),
      to: (v, a) => (!v ? 'Enter where the trip ends' : a.trip === 'oneway' && norm(v) === norm(a.from) ? 'From and To cannot be the same on a one-way trip' : ''),
      start: v => (v ? '' : 'Choose the trip start date'),
      end: (v, a) => (a.trip !== 'round' ? '' : !v ? 'Choose the trip end date, or switch to One Way' : v < a.start ? 'Trip end date cannot be before the start date' : ''),
      passengers: (v, a) => {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1) return 'Enter at least 1 passenger';
        if (n > MAX_PAX) return `For more than ${MAX_PAX} passengers, please call us`;
        const car = VEHICLES.find(x => x.value === a.vehicle);
        return car && n > car.seats ? `${car.label} seats up to ${car.seats} — choose Prime SUV for ${n} passengers` : '';
      },
      pickupTime: (v, a) => (!v ? 'Choose a pick-up time' : a.start === today() && v < nowHM() ? 'That time has already passed today' : ''),
      vehicle: v => (v ? '' : 'Select a vehicle'),
      ...CONTACT_RULES
    },
    build: v => {
      const round = v.trip === 'round';
      return {
        title: `Cab · ${v.from} to ${v.to}`,
        trip: v.trip, from: v.from, to: v.to, start: v.start, end: round ? v.end : null,
        pickupTime: v.pickupTime, dropTime: v.dropTime || '', passengers: Number(v.passengers), vehicle: v.vehicle,
        contact: contactOf(v),
        summary: [
          ['Trip', round ? 'Round Trip' : 'One Way'], ['From', v.from], ['To', v.to],
          ['Trip start', longDate(v.start)], round && ['Trip end', longDate(v.end)],
          ['Pick up time', time12(v.pickupTime)], v.dropTime && ['Drop time', time12(v.dropTime)],
          ['Passengers', v.passengers], ['Vehicle', v.vehicle],
          ['Name', v.name], ['Mobile', v.mobile], ['Email', v.email]
        ].filter(Boolean)
      };
    },
    next: d => [
      ['We check availability', `We look for a ${d.vehicle} for ${longDate(d.start)} at ${time12(d.pickupTime)}.`],
      ['We confirm the fare', 'A consultant calls or emails you with the fare and pick-up details.'],
      ['You confirm', 'Nothing is booked until you accept.']
    ],
    again: d => ({ contact: d.contact }),
    againLabel: 'Send another cab enquiry'
  });

  on(root, 'click', '[data-offer]', (e, b) => { e.stopPropagation(); const o = OFFERS.find(x => x.id === b.dataset.offer); if (o) openOffer(o); });
  return () => enquiry.destroy();
}
