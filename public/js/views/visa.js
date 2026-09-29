// Visa enquiry (#/visa): the live "Visa Query Form", visa types, destination search with
// popular visa destinations (they prefill the form — no fees or processing times are quoted)
// and visa offers. Accepts ?country=UAE and ?type=tourist to prefill.
import { html, icon, mount, on, $, $$ } from '../core/dom.js';
import { plural } from '../core/format.js';
import { href } from '../core/router.js';
import { sectionHead } from '../ui/common.js';
import { offerCard, openOffer } from '../ui/cards.js';
import {
  pageBand, formHead, mountEnquiry, selectField, dateField, stepperField, contactFields, CONTACT_RULES,
  submitRow, stepsCard, contactCard, noteCard, contactOf, longDate, bringIntoView
} from '../ui/enquiry.js';
import { OFFERS, HOLIDAY_DESTINATIONS, COMPANY } from '../data/content.js';
import { NATIONALITIES } from '../data/cities.js';

const VISA_TYPES = [
  ['Business Visa', 'bag', 'Meetings, conferences and business trips'],
  ['Tourist Visa', 'palm', 'Holidays, sightseeing and family visits'],
  ['Work Visa', 'building', 'Employment and work assignments'],
  ['Student Visa', 'grad', 'Study programmes and courses'],
  ['Medical Visa', 'heart', 'Treatment and medical consultations']
];

// [name on the card, name in the form, ISO code, region, holiday destination on AeroSkys]
const POPULAR = [
  ['UAE', 'United Arab Emirates', 'AE', 'Middle East', 'Dubai'],
  ['Singapore', 'Singapore', 'SG', 'South-East Asia', 'Singapore'],
  ['Thailand', 'Thailand', 'TH', 'South-East Asia', 'Thailand'],
  ['Malaysia', 'Malaysia', 'MY', 'South-East Asia', ''],
  ['UK', 'United Kingdom', 'GB', 'Europe', ''],
  ['USA', 'United States', 'US', 'North America', ''],
  ['Schengen', 'Schengen (Europe)', 'EU', 'Europe', 'Europe'],
  ['Australia', 'Australia', 'AU', 'Oceania', 'Australia'],
  ['Canada', 'Canada', 'CA', 'North America', ''],
  ['Vietnam', 'Vietnam', 'VN', 'South-East Asia', 'Vietnam'],
  ['Sri Lanka', 'Sri Lanka', 'LK', 'South Asia', 'Sri Lanka'],
  ['Turkey', 'Turkey', 'TR', 'Europe & West Asia', 'Turkey'],
  ['Indonesia', 'Indonesia', 'ID', 'South-East Asia', 'Bali'],
  ['Japan', 'Japan', 'JP', 'East Asia', ''],
  ['New Zealand', 'New Zealand', 'NZ', 'Oceania', 'Auckland'],
  ['Saudi Arabia', 'Saudi Arabia', 'SA', 'Middle East', '']
].map(([name, full, code, region, holiday]) => ({ name, full, code, region, holiday }));
const MORE = [
  ['Azerbaijan', 'AZ', 'Central Asia'], ['Bahrain', 'BH', 'Middle East'], ['Cambodia', 'KH', 'South-East Asia', 'Cambodia'],
  ['China', 'CN', 'East Asia'], ['Egypt', 'EG', 'Africa'], ['Finland', 'FI', 'Europe', 'Helsinki'], ['France', 'FR', 'Europe'],
  ['Georgia', 'GE', 'Central Asia'], ['Germany', 'DE', 'Europe'], ['Greece', 'GR', 'Europe'], ['Hong Kong', 'HK', 'East Asia'],
  ['Ireland', 'IE', 'Europe'], ['Italy', 'IT', 'Europe'], ['Kazakhstan', 'KZ', 'Central Asia'], ['Kenya', 'KE', 'Africa'],
  ['Kuwait', 'KW', 'Middle East'], ['Maldives', 'MV', 'South Asia', 'Maldives'], ['Mauritius', 'MU', 'Africa'], ['Nepal', 'NP', 'South Asia'],
  ['Netherlands', 'NL', 'Europe'], ['Oman', 'OM', 'Middle East'], ['Philippines', 'PH', 'South-East Asia'], ['Qatar', 'QA', 'Middle East'],
  ['Russia', 'RU', 'Europe & Asia'], ['South Africa', 'ZA', 'Africa'], ['South Korea', 'KR', 'East Asia'], ['Spain', 'ES', 'Europe'],
  ['Switzerland', 'CH', 'Europe', 'Zurich'], ['Uzbekistan', 'UZ', 'Central Asia']
].map(([name, code, region, holiday = '']) => ({ name, full: name, code, region, holiday }));
const ALL = [...POPULAR, ...MORE];
const DEST_OPTIONS = [{ group: 'Popular destinations', options: POPULAR.map(c => c.full) }, { group: 'More destinations', options: MORE.map(c => c.full) }];

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const findCountry = q => { const n = norm(q); return n ? ALL.find(c => norm(c.name) === n || norm(c.full) === n || norm(c.code) === n) : null; };
const findType = q => { const n = norm(q); return n ? VISA_TYPES.find(([t]) => norm(t) === n || norm(t).startsWith(n))?.[0] : ''; };

function destCard(c) {
  const holiday = c.holiday && HOLIDAY_DESTINATIONS.includes(c.holiday) ? c.holiday : '';
  return html`<article class="pg-dest">
    <span class="pg-dest-code" aria-hidden="true">${c.code}</span>
    <h3>${c.name}</h3>
    <p class="pg-dest-sub">${c.full !== c.name ? html`${c.full}<br>` : ''}<span>${c.region}</span></p>
    <div class="pg-dest-foot">
      <button type="button" class="btn btn-dark btn-sm" data-pg-assist="${c.full}" aria-label="Get visa assistance for ${c.full}">Get assistance</button>
      ${holiday ? html`<a class="pg-dest-link" href="${href('/holidays/search', { city: holiday })}">${icon('palm')} Holidays</a>` : ''}
    </div>
  </article>`;
}

const formHTML = pre => html`${formHead({ iconName: 'passport', title: 'Visa Query Form', text: 'Fill in your details and our visa team will get back to you as soon as possible.' })}
  <form class="pg-form" novalidate>
    <div class="form-grid">
      ${contactFields({ name: 'Your Name', email: 'Email', mobile: 'Mobile No.', prefill: pre.contact })}
      ${selectField({ name: 'visaType', label: 'Visa Type', options: VISA_TYPES.map(v => v[0]), value: pre.visaType || '', placeholder: 'Select visa type', required: true })}
      ${dateField({ name: 'travelDate', label: 'Travel date', required: true })}
      ${selectField({ name: 'nationality', label: 'Nationality', options: [...NATIONALITIES.map(n => n[1]), 'Other'], value: pre.nationality || 'India', required: true })}
      ${stepperField({ name: 'applicants', label: 'No. Of Applicant', value: pre.applicants || 1, min: 1, max: 50 })}
      ${selectField({ name: 'destination', label: 'Destination', options: DEST_OPTIONS, value: pre.destination || '', placeholder: 'Select destination', required: true, span: true })}
    </div>
    ${submitRow('Send visa query')}
  </form>`;

export default async function visa(el, ctx) {
  document.title = 'Visa Enquiry — Business, Tourist, Work, Student & Medical Visas | AeroSkys';
  const visaOffers = OFFERS.filter(o => o.kind === 'visa');
  const pre = { destination: findCountry(ctx.query.get('country') || ctx.query.get('destination'))?.full || '', visaType: findType(ctx.query.get('type')) };

  mount(el, html`<div class="pg-view pg-visa">
    ${pageBand({ eyebrow: 'Visa Enquiry', title: 'Get help with <em>your visa.</em>', text: 'Business, tourist, work, student or medical visa — tell us where you’re going and our visa team will guide you through the process.', trail: [{ label: 'Visa' }], art: 'passport' })}
    <div class="wrap pg-layout pg-lift">
      <div class="card pg-form-card" data-pg-host id="visa-form"></div>
      <aside class="pg-aside">
        ${stepsCard('How it works', [
          ['Send your query', 'Tell us the visa type, destination and when you travel.'],
          ['Talk to our visa desk', 'A consultant contacts you with the documents you need.'],
          ['Apply with support', 'We help with the application; the embassy makes the decision.']
        ])}
        ${noteCard('Visa approval is at the sole discretion of the respective embassy or high commission. Fees and processing times depend on the destination and are confirmed by your consultant.', 'shield')}
        ${contactCard()}
      </aside>
    </div>

    <section class="section wrap" aria-labelledby="pg-visa-dest-title">
      ${sectionHead({ eyebrow: 'Visa by destination', title: '<span id="pg-visa-dest-title">Choose your <em>destination.</em></span>', aside: 'Pick a destination or a visa type and we’ll fill in the query form for you.' })}
      <div class="pg-vtypes-wrap reveal">
        <h3 class="pg-mini-h">Visa types</h3>
        <ul class="pg-vtypes">${VISA_TYPES.map(([t, ic, d]) => html`<li><button type="button" class="pg-vtype" data-pg-vtype="${t}"><span class="pg-vtype-ic" aria-hidden="true">${icon(ic)}</span><b>${t}</b><small>${d}</small></button></li>`)}</ul>
      </div>
      <div class="pg-dest-bar">
        <label class="pg-search" for="pg-visa-q">${icon('search')}<input id="pg-visa-q" type="search" placeholder="Search a country — e.g. Japan, Schengen, UAE" autocomplete="off" data-pg-dest-q aria-describedby="pg-visa-count"></label>
        <p class="pg-dest-count" id="pg-visa-count" data-pg-dest-count aria-live="polite"></p>
      </div>
      <h3 class="pg-mini-h" data-pg-dest-h>Popular Visa Destinations</h3>
      <div class="pg-dest-grid" data-pg-dest-grid></div>
    </section>

    ${visaOffers.length ? html`<section class="section-sm bg-wash" aria-labelledby="pg-visa-offers-title">
      <div class="wrap">
        ${sectionHead({ eyebrow: 'Visa offers', title: '<span id="pg-visa-offers-title">Deals on <em>visa services.</em></span>', action: html`<a class="underline-link" href="#/offers?tab=visa">All offers ${icon('arrow-up-right')}</a>` })}
        <div class="rail pg-offer-rail" role="group" aria-label="Visa offers">${visaOffers.map(offerCard)}</div>
      </div>
    </section>` : ''}
  </div>`);

  const root = el.firstElementChild;
  const host = $('[data-pg-host]', root);
  const enquiry = mountEnquiry(host, {
    kind: 'visa',
    prefill: pre,
    form: formHTML,
    rules: {
      ...CONTACT_RULES,
      visaType: v => (v ? '' : 'Select a visa type'),
      travelDate: v => (v ? '' : 'Choose your travel date'),
      nationality: v => (v ? '' : 'Select your nationality'),
      applicants: v => { const n = Number(v); return !Number.isInteger(n) || n < 1 ? 'Enter at least 1 applicant' : n > 50 ? 'For more than 50 applicants, please call us' : ''; },
      destination: v => (v ? '' : 'Select your destination')
    },
    build: v => ({
      title: `Visa · ${v.visaType} · ${v.destination}`,
      destination: v.destination,
      visaType: v.visaType,
      travelDate: v.travelDate,
      nationality: v.nationality,
      applicants: Number(v.applicants),
      contact: contactOf(v),
      summary: [['Destination', v.destination], ['Visa type', v.visaType], ['Travel date', longDate(v.travelDate)], ['No. of applicants', v.applicants], ['Nationality', v.nationality], ['Name', v.name], ['Mobile', v.mobile], ['Email', v.email]]
    }),
    next: d => [
      ['We review your details', `Our visa desk looks at your ${d.visaType.toLowerCase()} query for ${d.destination}.`],
      ['We call or email you', 'A consultant shares the document checklist and the next steps.'],
      ['The embassy decides', 'Visa approval is at the sole discretion of the embassy or high commission.']
    ],
    again: d => ({ contact: d.contact, nationality: d.nationality }),
    againLabel: 'Send another visa query'
  });

  /** Prefills destination and/or visa type, then moves focus to the next field to complete. */
  const prefill = patch => {
    let form = enquiry.form;
    if (!form) form = enquiry.render(patch);
    for (const [k, v] of Object.entries(patch)) {
      const sel = form.elements[k];
      if (sel && v) { sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    bringIntoView(host);
    host.classList.remove('is-flash'); void host.offsetWidth; host.classList.add('is-flash');
    const next = !form.elements.visaType.value ? form.elements.visaType
      : !form.elements.travelDate.value ? form.querySelector('[data-pg-date="travelDate"]')
        : !form.elements.destination.value ? form.elements.destination : form.elements.name;
    next?.focus({ preventScroll: true });
  };
  on(root, 'click', '[data-pg-assist]', (e, b) => prefill({ destination: b.dataset.pgAssist }));
  on(root, 'click', '[data-pg-vtype]', (e, b) => prefill({ visaType: b.dataset.pgVtype }));

  // Destination search
  const q = $('[data-pg-dest-q]', root), grid = $('[data-pg-dest-grid]', root);
  const renderDest = () => {
    const term = norm(q.value);
    const list = term ? ALL.filter(c => norm(`${c.name} ${c.full} ${c.region} ${c.code}`).includes(term)) : POPULAR;
    $('[data-pg-dest-h]', root).textContent = term ? 'Matching destinations' : 'Popular Visa Destinations';
    $('[data-pg-dest-count]', root).textContent = term ? (list.length ? `${plural(list.length, 'destination')} found` : 'No destinations found') : `${POPULAR.length} popular destinations · ${ALL.length} in the form`;
    grid.innerHTML = String(list.length
      ? html`${list.map(destCard)}`
      : html`<div class="pg-dest-empty">${icon('globe')}<p>We couldn’t find “${q.value.trim()}”. Send a visa query with the closest destination, or call us on <a class="link" href="tel:${COMPANY.phone}">${COMPANY.phone}</a>.</p><button type="button" class="btn btn-primary btn-sm" data-pg-assist="">Go to the visa query form</button></div>`);
  };
  q.addEventListener('input', renderDest);
  renderDest();

  // Offer cards carry data-offer (shared markup); handle here and stop the click at this root.
  on(root, 'click', '[data-offer]', (e, b) => { e.stopPropagation(); const o = OFFERS.find(x => x.id === b.dataset.offer); if (o) openOffer(o); });

  return () => enquiry.destroy();
}
