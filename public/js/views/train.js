// Railway ticket enquiry (#/train): the live "Railway Ticket Enquiry" — journey, date,
// class and quota. Accepts ?from=&to= to prefill.
import { html, mount, $ } from '../core/dom.js';
import {
  pageBand, formHead, mountEnquiry, textField, pairFields, dateField, selectField, choiceField,
  contactFields, CONTACT_RULES, submitRow, stepsCard, contactCard, contactOf, longDate, datalist, newListId
} from '../ui/enquiry.js';
import { BUS_CITIES } from '../data/cities.js';

const CLASSES = ['All Class', 'AC First Class', 'AC 2-Tier', 'AC 3-Tier', 'AC Chair Car', 'Sleeper', 'Second Sitting'];
const QUOTAS = [
  ['GN (General Quota)', 'GN', 'General Quota'],
  ['CK (Tatkal Quota)', 'CK', 'Tatkal Quota'],
  ['PT (Premium Tatkal Quota)', 'PT', 'Premium Tatkal Quota'],
  ['SS (Senior Citizen / Lower Berth)', 'SS', 'Senior Citizen / Lower Berth'],
  ['LD (Ladies Quota)', 'LD', 'Ladies Quota']
];
const STATIONS = [...new Set(BUS_CITIES.map(c => c.name))].sort((a, b) => a.localeCompare(b));
const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

const formHTML = p => {
  const listId = newListId('train-cities');
  return html`${formHead({ iconName: 'train', title: 'Railway Ticket Enquiry', text: 'Share your journey, class and quota. Our desk checks availability and gets back to you.' })}
  <form class="pg-form" novalidate>
    <div class="form-grid">
      ${pairFields(
        textField({ name: 'from', label: 'Journey From', value: p.from || '', required: true, list: listId, placeholder: 'City or station', autocomplete: 'off' }),
        textField({ name: 'to', label: 'Journey To', value: p.to || '', required: true, list: listId, placeholder: 'City or station', autocomplete: 'off' }),
        'from,to', 'Swap Journey From and Journey To')}
      ${dateField({ name: 'date', label: 'Depart On', value: p.date || '', required: true })}
      ${selectField({ name: 'travelClass', label: 'Select Class', options: CLASSES, value: p.travelClass || 'All Class', required: true })}
      ${choiceField({ name: 'quota', label: 'Select Quota', value: p.quota || QUOTAS[0][0], cols: 5, variant: 'chips', options: QUOTAS.map(([value, code, name]) => ({ value, label: code, sub: name })) })}
      ${contactFields({ name: 'Your Name', email: 'Email ID', mobile: 'Mobile No.', prefill: p.contact })}
    </div>
    ${datalist(listId, STATIONS)}
    ${submitRow('Send train enquiry')}
  </form>`;
};

export default async function train(el, ctx) {
  document.title = 'Railway Ticket Enquiry — Train Tickets | AeroSkys';
  const pre = { from: (ctx.query.get('from') || '').slice(0, 60), to: (ctx.query.get('to') || '').slice(0, 60) };

  mount(el, html`<div class="pg-view pg-train">
    ${pageBand({ eyebrow: 'Train Enquiry', title: 'Railway ticket <em>enquiry.</em>', text: 'Tell us where and when you’re travelling, the class you want and your quota — we’ll check availability for you.', trail: [{ label: 'Train Enquiry' }], art: 'train' })}
    <div class="wrap pg-layout pg-lift">
      <div class="card pg-form-card" data-pg-host></div>
      <aside class="pg-aside">
        ${stepsCard('How it works', [
          ['Send your journey', 'From, to, date, class and quota.'],
          ['We check availability', 'The AeroSkys desk looks for trains and seats that match.'],
          ['You confirm', 'A consultant calls or emails you; nothing is booked until you confirm.']
        ])}
        ${contactCard()}
      </aside>
    </div>
  </div>`);

  const root = el.firstElementChild;
  const enquiry = mountEnquiry($('[data-pg-host]', root), {
    kind: 'train',
    prefill: pre,
    form: formHTML,
    rules: {
      from: v => (v ? '' : 'Enter where your journey starts'),
      to: (v, a) => (!v ? 'Enter where your journey ends' : norm(v) === norm(a.from) ? 'Journey From and Journey To must be different' : ''),
      date: v => (v ? '' : 'Choose your date of travel'),
      travelClass: v => (v ? '' : 'Select a class'),
      quota: v => (v ? '' : 'Select a quota'),
      ...CONTACT_RULES
    },
    build: v => ({
      title: `Train · ${v.from} to ${v.to}`,
      from: v.from, to: v.to, date: v.date, travelClass: v.travelClass, quota: v.quota,
      contact: contactOf(v),
      summary: [['Journey', `${v.from} to ${v.to}`], ['Depart on', longDate(v.date)], ['Class', v.travelClass], ['Quota', v.quota], ['Name', v.name], ['Mobile', v.mobile], ['Email', v.email]]
    }),
    next: d => [
      ['We check availability', `Our desk checks ${d.travelClass === 'All Class' ? 'all classes' : d.travelClass} under ${d.quota} for ${longDate(d.date)}.`],
      ['We call or email you', 'A consultant shares the trains, seats and fares available.'],
      ['You confirm', 'Nothing is booked until you confirm.']
    ],
    again: d => ({ contact: d.contact }),
    againLabel: 'Send another train enquiry'
  });

  return () => enquiry.destroy();
}
