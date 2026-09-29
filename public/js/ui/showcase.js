// Four-photograph destination theatre (from the editorial build), now driven by the
// live site's Popular Destinations and linked to real holiday searches.
import { html, icon, $, $$ } from '../core/dom.js';
import { money } from '../core/format.js';
import { href } from '../core/router.js';

export const SHOWCASE = [
  { city: 'Manali', img: 'himalayas', country: 'Himachal Pradesh, India', feeling: 'Snow, mountains and adventure.', text: 'Great for honeymoons and family trips, with Solang Valley, Rohtang Pass and paragliding close by.' },
  { city: 'Jaipur', img: 'jaipur', country: 'Rajasthan, India', feeling: 'Forts, palaces and markets.', text: 'See Amber Fort, Hawa Mahal and City Palace, then shop for handicrafts in the old city bazaars.' },
  { city: 'Dubai', img: 'dubai', country: 'United Arab Emirates', feeling: 'Shopping, safaris and skyscrapers.', text: 'Visit the Burj Khalifa and Dubai Mall, ride the dunes on a desert safari and take an evening dhow cruise.' },
  { city: 'Singapore', img: 'singapore', country: 'Singapore', feeling: 'Family fun and city sights.', text: 'Explore Gardens by the Bay, Sentosa Island and Universal Studios — easy to get around and great for kids.' }
];

export function showcaseHTML(prices) {
  const p0 = SHOWCASE[0];
  return html`<div class="showcase" role="region" aria-roledescription="carousel" aria-label="Popular destinations, four places to discover">
    <div class="showcase-stage">
      <div class="showcase-panel">
        <div class="showcase-panel-top"><span>POPULAR DESTINATIONS</span><span><b data-count>01</b> / 04</span></div>
        <div class="showcase-copy">
          <p class="showcase-country" data-country>${p0.country}</p>
          <h3 data-title>${p0.city}</h3>
          <p class="showcase-feeling" data-feeling>${p0.feeling}</p>
          <p class="showcase-description" data-text>${p0.text}</p>
          <p class="showcase-price">Holiday packages from <b data-price>${money(prices[p0.city] || 0)}</b></p>
        </div>
        <a class="showcase-cta" data-cta href="${href('/holidays/search', { city: p0.city })}"><span>Explore ${p0.city} packages</span>${icon('arrow-up-right')}</a>
        <div class="showcase-panel-bottom"><span>Tap a photo to see another destination</span><span aria-hidden="true">↗</span></div>
      </div>
      ${SHOWCASE.map((p, i) => html`<button type="button" class="showcase-photo" data-photo="${i}" data-slot="${i}" aria-label="Show ${p.city}" aria-pressed="${i === 0}">
        <img src="assets/img/${p.img}.webp" alt="${p.city}" loading="lazy" decoding="async"><span class="showcase-photo-label"><span>0${i + 1}</span><strong>${p.city}</strong>${icon('arrow-up-right')}</span></button>`)}
    </div>
    <div class="showcase-controls" role="group" aria-label="Destination controls">
      <button type="button" class="showcase-arrow" data-prev aria-label="Previous destination">${icon('arrow-left')}</button>
      <div class="showcase-dots">${SHOWCASE.map((p, i) => html`<button type="button" data-go="${i}" aria-label="Show ${p.city}" aria-pressed="${i === 0}">0${i + 1}</button>`)}</div>
      <button type="button" class="showcase-arrow" data-next aria-label="Next destination">${icon('arrow-right')}</button>
    </div>
    <p class="sr-only" data-status role="status" aria-live="polite"></p>
  </div>`;
}

export function bindShowcase(region, prices) {
  if (!region) return () => {};
  const photos = $$('[data-photo]', region), dots = $$('[data-go]', region);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 959px)');
  const total = SHOWCASE.length;
  let current = 0, requested = 0, busy = false, playing = !reduce, inView = false, hovered = false;
  let timers = [], auto = 0, gesture = null, suppress = 0;
  const wrap = n => (n % total + total) % total;
  const clearAuto = () => { clearTimeout(auto); auto = 0; };
  const schedule = () => { clearAuto(); if (playing && inView && !hovered && !document.hidden && !busy) auto = setTimeout(() => request(current + 1, false), 5800); };
  const copy = () => {
    const p = SHOWCASE[current];
    $('[data-title]', region).textContent = p.city;
    $('[data-country]', region).textContent = p.country;
    $('[data-feeling]', region).textContent = p.feeling;
    $('[data-text]', region).textContent = p.text;
    $('[data-price]', region).textContent = money(prices[p.city] || 0);
    $('[data-count]', region).textContent = '0' + (current + 1);
    const cta = $('[data-cta]', region);
    cta.href = href('/holidays/search', { city: p.city });
    cta.querySelector('span').textContent = `Explore ${p.city} packages`;
    region.classList.remove('is-copy-leaving');
  };
  const slots = () => {
    photos.forEach((ph, i) => { ph.dataset.slot = String(wrap(i - current)); ph.setAttribute('aria-pressed', String(i === current)); });
    dots.forEach((d, i) => d.setAttribute('aria-pressed', String(i === current)));
    region.classList.remove('is-photos-leaving');
  };
  const finish = () => { timers.forEach(clearTimeout); timers = []; slots(); copy(); busy = false; if (requested !== current) go(requested); else schedule(); };
  function go(i) {
    if (i === current) { schedule(); return; }
    clearAuto(); busy = true; current = i;
    if (!reduce) region.classList.add('is-copy-leaving');
    if (mobile.matches && !reduce) { region.classList.add('is-photos-leaving'); timers.push(setTimeout(slots, 190)); } else slots();
    if (!playing) $('[data-status]', region).textContent = `${SHOWCASE[current].city}. ${current + 1} of ${total}.`;
    if (reduce) { finish(); return; }
    timers.push(setTimeout(copy, 180));
    timers.push(setTimeout(finish, mobile.matches ? 720 : 880));
  }
  function request(i, manual = true) { if (manual) { playing = false; clearAuto(); } requested = wrap(i); if (!busy) go(requested); }
  $('[data-prev]', region).addEventListener('click', () => request(requested - 1));
  $('[data-next]', region).addEventListener('click', () => request(requested + 1));
  dots.forEach((d, i) => d.addEventListener('click', () => request(i)));
  photos.forEach((ph, i) => ph.addEventListener('click', () => { if (performance.now() < suppress) return; request(i); }));
  region.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hovered = true; clearAuto(); } });
  region.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hovered = false; schedule(); } });
  region.addEventListener('focusin', () => { playing = false; clearAuto(); });
  const stage = $('.showcase-stage', region);
  stage.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || e.target.closest('.showcase-panel')) return; gesture = { x: e.clientX, y: e.clientY, id: e.pointerId }; }, { passive: true });
  stage.addEventListener('pointerup', e => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y; gesture = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) { suppress = performance.now() + 450; request(requested + (dx < 0 ? 1 : -1)); }
  }, { passive: true });
  let io = null;
  if ('IntersectionObserver' in window) { io = new IntersectionObserver(es => { inView = es[0].isIntersecting; schedule(); }, { threshold: .2 }); io.observe(region); }
  const onVis = () => schedule();
  document.addEventListener('visibilitychange', onVis);
  return () => { clearAuto(); timers.forEach(clearTimeout); io?.disconnect(); document.removeEventListener('visibilitychange', onVis); };
}
