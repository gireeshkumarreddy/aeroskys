// Web check-in (#/web-checkin): the live directory of airline check-in pages with search,
// practical check-in guidance and a flight-tracking shortcut to flightradar24.
import { html, icon, mount, on, $, $$ } from '../core/dom.js';
import { plural } from '../core/format.js';
import { airlineMark } from '../ui/common.js';
import { pageBand } from '../ui/enquiry.js';
import { WEB_CHECKIN } from '../data/airlines.js';
import { COMPANY } from '../data/content.js';

const FR24 = 'https://www.flightradar24.com';
const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

export default async function webCheckin(el) {
  document.title = 'Web Check-in — Airline Check-in Links & Flight Tracking | AeroSkys';

  mount(el, html`<div class="pg-view pg-wc">
    ${pageBand({ eyebrow: 'Web Check-in', title: 'Airline <em>web check-in.</em>', text: `Find your airline and go straight to its web check-in page — ${WEB_CHECKIN.length} airlines in one place. You can also track any flight live.`, trail: [{ label: 'Web Check-in' }], art: 'ticket' })}
    <div class="wrap pg-layout pg-lift">
      <section class="card pg-wc-card" aria-labelledby="pg-wc-title">
        <div class="pg-wc-head">
          <div><h2 class="h3" id="pg-wc-title">Web Check-in</h2><p class="pg-wc-sub">Choose your airline to open its official check-in page in a new tab.</p></div>
          <label class="pg-search" for="pg-wc-q">${icon('search')}<input id="pg-wc-q" type="search" placeholder="Search airline or code" autocomplete="off" data-pg-wc-q aria-describedby="pg-wc-count"></label>
        </div>
        <p class="pg-wc-count" id="pg-wc-count" data-pg-wc-count aria-live="polite">${plural(WEB_CHECKIN.length, 'airline')}</p>
        <ul class="pg-wc-list" data-pg-wc-list>${WEB_CHECKIN.map(([code, name, url]) => html`<li class="pg-wc-item" data-pg-wc="${norm(`${name} ${code}`)}">
          ${airlineMark(code)}
          <span class="pg-wc-name"><b>${name}</b><small>${code}</small></span>
          <a class="btn btn-light btn-sm pg-wc-go" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="Web Checkin Now: ${name} (opens in a new tab)">Web Checkin Now ${icon('external')}</a>
        </li>`)}</ul>
        <div class="pg-wc-empty" data-pg-wc-empty hidden>${icon('search')}<p>No airline matches that search. Try the airline name or its two-letter code, or call us on <a class="link" href="tel:${COMPANY.phoneIntl}">${COMPANY.phone}</a> for help.</p></div>
      </section>

      <aside class="pg-aside">
        <section class="card pg-aside-card" aria-labelledby="pg-wc-tips">
          <h2 class="h4" id="pg-wc-tips">Before you check in</h2>
          <ul class="pg-tips">
            <li>${icon('clock')}<span><b>Check the window.</b> Web check-in typically opens 48 hours before departure and closes about 1 hour before. Exact times vary by airline and route.</span></li>
            <li>${icon('ticket')}<span><b>Keep your PNR handy.</b> You’ll need your booking reference and last name. <a class="link" href="#/find-booking">Find your booking</a></span></li>
            <li>${icon('passport')}<span><b>Carry valid ID.</b> Take a government photo ID to the airport — and your passport and visa for international flights.</span></li>
            <li>${icon('alert')}<span><b>Exclusive fares.</b> Web check-in is mandatory, and seats, meals and add-ons are bought at web check-in.</span></li>
          </ul>
        </section>

        <section class="card pg-aside-card pg-track" aria-labelledby="pg-track-title">
          <h2 class="h4" id="pg-track-title"><span class="pg-track-ic" aria-hidden="true">${icon('radar')}</span>Flight tracking</h2>
          <p class="pg-aside-text">Follow any flight live on flightradar24.</p>
          <form class="pg-track-form" data-pg-track novalidate>
            <div class="field">
              <label for="pg-fno">Flight number</label>
              <div class="pg-track-row"><input class="input" id="pg-fno" name="fno" placeholder="e.g. 6E 2134" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="10" aria-describedby="pg-fno-e"><button class="btn btn-dark" type="submit">Track</button></div>
              <span class="field-error" id="pg-fno-e" role="alert"></span>
            </div>
          </form>
          <a class="text-btn" href="${FR24}" target="_blank" rel="noopener noreferrer">Open flightradar24.com ${icon('external')}</a>
        </section>
      </aside>
    </div>
  </div>`);

  const root = el.firstElementChild;
  const input = $('[data-pg-wc-q]', root);
  const items = $$('[data-pg-wc]', root);
  input.addEventListener('input', () => {
    const q = norm(input.value);
    let n = 0;
    items.forEach(li => { const hit = !q || li.dataset.pgWc.includes(q); li.hidden = !hit; if (hit) n++; });
    $('[data-pg-wc-count]', root).textContent = q ? `${plural(n, 'airline')} found` : plural(items.length, 'airline');
    $('[data-pg-wc-empty]', root).hidden = n > 0;
  });

  on(root, 'submit', '[data-pg-track]', (e, form) => {
    e.preventDefault();
    const field = form.querySelector('.field'), err = field.querySelector('.field-error'), box = form.elements.fno;
    const v = box.value.toUpperCase().replace(/[\s-]/g, '');
    if (!/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(v)) {
      field.classList.add('has-error');
      box.setAttribute('aria-invalid', 'true');
      err.textContent = v ? 'Enter a flight number like 6E2134 or AI 101' : 'Enter a flight number to track';
      box.focus();
      return;
    }
    field.classList.remove('has-error');
    box.removeAttribute('aria-invalid');
    err.textContent = '';
    window.open(`${FR24}/data/flights/${v.toLowerCase()}`, '_blank', 'noopener,noreferrer');
  });
  on(root, 'input', '#pg-fno', (e, box) => {
    const field = box.closest('.field');
    if (field.classList.contains('has-error')) { field.classList.remove('has-error'); box.removeAttribute('aria-invalid'); field.querySelector('.field-error').textContent = ''; }
  });
}
