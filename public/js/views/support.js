// Contact us (#/support): office address, 24/7 phone and email, the live "Make Appointment with
// Our Consultants" form, an OpenStreetMap of Asif Ali Road (with a fallback) and quick links.
import { html, icon, mount, $ } from '../core/dom.js';
import { pageBand, formHead, mountEnquiry, segField, contactFields, textareaField, CONTACT_RULES, submitRow, contactOf } from '../ui/enquiry.js';
import { COMPANY } from '../data/content.js';

const LAT = 28.6389, LON = 77.2362;
const BBOX = [LON - 0.006, LAT - 0.004, LON + 0.006, LAT + 0.004].map(n => n.toFixed(4)).join('%2C');
const MAP_EMBED = `https://www.openstreetmap.org/export/embed.html?bbox=${BBOX}&layer=mapnik&marker=${LAT}%2C${LON}`;
const MAP_LINK = `https://www.openstreetmap.org/?mlat=${LAT}&mlon=${LON}#map=17/${LAT}/${LON}`;
const QUICK = [
  ['#/find-booking', 'search', 'Find Booking', 'View, print or cancel a booking'],
  ['#/cancellation-policy', 'refresh', 'Cancellation Policy', 'How cancellations work'],
  ['#/refund-policy', 'wallet', 'Refund Policy', 'When and how refunds are paid'],
  ['#/web-checkin', 'ticket', 'Web Check-in', 'Airline check-in links in one place']
];

const formHTML = pre => html`${formHead({ iconName: 'calendar', title: 'Make Appointment with Our Consultants', text: 'Leave your details and a consultant will contact you to fix a convenient time.' })}
  <form class="pg-form" novalidate>
    <div class="form-grid">
      ${segField({ name: 'title', label: 'Title', options: ['Mr.', 'Mrs.', 'Miss.'], value: pre.title || '', required: true })}
      ${contactFields({ name: 'Full Name', email: 'Email', mobile: 'Mobile No.', prefill: pre.contact })}
      ${textareaField({ name: 'message', label: 'Message', required: true, placeholder: 'How can we help? Share your travel plans or your booking reference.', rows: 4 })}
    </div>
    ${submitRow('Request appointment')}
  </form>`;

export default async function support(el) {
  document.title = 'Contact Us — 24/7 Support | AeroSkys';
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;

  mount(el, html`<div class="pg-view pg-support-view">
    ${pageBand({ eyebrow: 'Contact Us', title: 'We’re here to help, <em>24/7.</em>', text: 'Call, email or send us a message about any booking or travel question. We’re available 24/7.', trail: [{ label: 'Contact Us' }], art: 'headset', contact: false })}
    <div class="wrap pg-lift pg-cc-grid">
      <a class="pg-cc" href="tel:${COMPANY.phone}"><span class="pg-cc-ic" aria-hidden="true">${icon('phone')}</span><span><small>Call us</small><b>${COMPANY.phone}</b><span>24/7 support</span></span></a>
      <a class="pg-cc" href="mailto:${COMPANY.email}"><span class="pg-cc-ic" aria-hidden="true">${icon('mail')}</span><span><small>Email</small><b>${COMPANY.email}</b><span>Bookings, changes and refunds</span></span></a>
      <div class="pg-cc"><span class="pg-cc-ic" aria-hidden="true">${icon('pin')}</span><span><small>Office Address</small><b>${COMPANY.address}</b><span>${COMPANY.legal}</span></span></div>
    </div>

    <section class="section-sm wrap pg-support" aria-label="Appointment and location">
      <div class="card pg-form-card" data-pg-host></div>
      <div class="pg-map-card">
        <div class="pg-map">
          <div class="pg-map-fallback" aria-hidden="true">${icon('map')}<b>22A, Asif Ali Road</b><span>New Delhi - 110002</span></div>
          ${online ? html`<iframe title="Map showing the AeroSkys office on Asif Ali Road, New Delhi" src="${MAP_EMBED}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>` : ''}
        </div>
        <div class="pg-map-foot">
          <p>${icon('pin')}<span>${COMPANY.address}</span></p>
          <a class="text-btn" href="${MAP_LINK}" target="_blank" rel="noopener noreferrer">Open in OpenStreetMap ${icon('external')}</a>
        </div>
      </div>
    </section>

    <section class="section-sm bg-wash" aria-labelledby="pg-quick-title">
      <div class="wrap">
        <h2 class="h3" id="pg-quick-title">Quick help</h2>
        <div class="pg-quick">${QUICK.map(([to, ic, t, s]) => html`<a class="pg-quick-card" href="${to}"><span class="pg-quick-ic" aria-hidden="true">${icon(ic)}</span><span><b>${t}</b><small>${s}</small></span>${icon('arrow-up-right')}</a>`)}</div>
      </div>
    </section>
  </div>`);

  const root = el.firstElementChild;
  const enquiry = mountEnquiry($('[data-pg-host]', root), {
    kind: 'contact',
    form: formHTML,
    rules: {
      title: v => (v ? '' : 'Select a title'),
      ...CONTACT_RULES,
      message: v => (!v ? 'Tell us how we can help' : v.length < 10 ? 'Please add a little more detail (10+ characters)' : '')
    },
    build: v => ({
      title: `Appointment · ${v.title} ${v.name}`,
      salutation: v.title,
      message: v.message,
      contact: contactOf(v),
      summary: [['Name', `${v.title} ${v.name}`], ['Mobile', v.mobile], ['Email', v.email], ['Message', v.message]]
    }),
    heading: 'Appointment request received',
    next: () => [
      ['We receive your request', 'Your message reaches our consultants.'],
      ['We contact you', 'A consultant calls or emails you to fix a convenient time.'],
      ['Meet or talk', `Visit us at ${COMPANY.address}, or talk it through over the phone.`]
    ],
    again: d => ({ title: d.salutation, contact: d.contact }),
    againLabel: 'Send another request'
  });

  return () => enquiry.destroy();
}
