// Navy editorial footer with the live site's links, routes, airlines and company details.
import { html, icon } from '../core/dom.js';
import { COMPANY, TOP_ROUTES, FOOTER_AIRLINES } from '../data/content.js';
import { AIRPORT } from '../data/airports.js';
import { airline } from '../data/airlines.js';
import { href } from '../core/router.js';
import { addDays, today } from '../core/format.js';

const routeLink = (r) => {
  const a = AIRPORT[r.from], b = AIRPORT[r.to];
  if (!a || !b) return '';
  return html`<a href="${href('/flights/search', { from: r.from, to: r.to, depart: addDays(today(), 15), adt: 1 })}">${a.city} to ${b.city}</a>`;
};

export function renderFooter() {
  const dom = TOP_ROUTES.filter(r => AIRPORT[r.from]?.cc === 'IN' && AIRPORT[r.to]?.cc === 'IN');
  const intl = TOP_ROUTES.filter(r => !(AIRPORT[r.from]?.cc === 'IN' && AIRPORT[r.to]?.cc === 'IN'));
  document.getElementById('site-footer').innerHTML = String(html`<div class="footer">
    <div class="wrap footer-top">
      <div><span class="eyebrow on-dark">Ready for your next trip?</span><h2>Where would you<br><em>like to go?</em></h2></div>
      <a class="btn btn-primary btn-lg" href="#/">Start searching ${icon('arrow-up-right')}</a>
    </div>
    <div class="wrap footer-grid">
      <div class="footer-col">
        <h3>Connect with us</h3>
        <div class="footer-contact">
          <div>${icon('pin')}<span>${COMPANY.legal}<br>${COMPANY.address}</span></div>
          <a href="mailto:${COMPANY.email}">${icon('mail')}<span>${COMPANY.email}</span></a>
          <a href="tel:${COMPANY.phoneIntl}">${icon('phone')}<span>${COMPANY.phone} · 24/7 support</span></a>
        </div>
      </div>
      <div class="footer-col"><h3>Bookings</h3><a href="#/">Flights</a><a href="#/hotels">Hotels</a><a href="#/holidays">Holiday</a><a href="#/bus">Bus</a><a href="#/find-booking">Find Booking</a><a href="#/offers">Offers</a></div>
      <div class="footer-col"><h3>Services</h3><a href="#/visa">Visa</a><a href="#/group-booking">Group Booking</a><a href="#/cab">Cab Enquiry</a><a href="#/train">Train Enquiry</a><a href="#/web-checkin">Web Check-in</a><a href="https://www.flightradar24.com" target="_blank" rel="noopener">Flight Tracking</a></div>
      <div class="footer-col"><h3>Support</h3><a href="careers.html">Careers</a><a href="#/blog">Blog</a><a href="#/support">Contact Us</a><a href="#/about">About Us</a><a href="#/terms">Terms &amp; conditions</a><a href="#/payment-security">Payment Security</a><a href="#/privacy">Privacy Policy</a><a href="#/cancellation-policy">Cancellation Policy</a><a href="#/refund-policy">Refund Policy</a></div>
    </div>
    <div class="wrap footer-routes">
      <div><b>Top Domestic Routes:</b>${dom.map(routeLink)}</div>
      <div><b>Top International Routes:</b>${intl.map(routeLink)}</div>
      <div><b>Airlines:</b>${FOOTER_AIRLINES.map(c => html`<a href="#/web-checkin">${airline(c).name}</a>`)}</div>
    </div>
    <div class="footer-wordmark-mask" aria-hidden="true"><div class="footer-wordmark">AeroSkys</div></div>
    <div class="wrap footer-bottom">
      <span>© ${new Date().getFullYear()} All Rights Reserved. Developed &amp; Maintained by ${COMPANY.legal}.</span>
      <span class="proto-pill">Working prototype · bookings are simulated</span>
      <a href="#/credits">Photography credits</a>
      <button type="button" data-back-to-top>Back to top ↑</button>
    </div>
  </div>`);
  document.querySelector('[data-back-to-top]')?.addEventListener('click', () => {
    scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  const wm = document.querySelector('.footer-wordmark');
  if (wm && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { wm.classList.add('is-in'); io.disconnect(); } }), { threshold: .2 });
    io.observe(wm);
  } else wm?.classList.add('is-in');
}
