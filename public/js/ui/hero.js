// Cinematic hero from the editorial build, reused by every service landing page.
// Only the Maldives photograph has a traced roofline, so only it gets the depth layer.
import { html, raw } from '../core/dom.js';
import { searchCard, bindSearchCard } from './search.js';

// Plain, benefit-first copy: say what the visitor can do here and why it is easy.
// Keep each headline line short (about 16 characters) so it stays on two lines on phones.
const HEROES = {
  flights: {
    img: 'hero', mobile: 'hero-mobile', depth: true, alt: 'Overwater villas beside a turquoise Maldivian lagoon',
    top: ['Flights · Hotels · Holidays · Bus', '24/7 customer support'], eyebrow: 'Easy and secure travel booking',
    lines: ['Book your trip', '<em>in a few clicks.</em>'], sub: 'Compare and book flights, hotels, holidays and buses in one place — with secure payment and 24/7 support.'
  },
  hotels: {
    img: 'maldives-villas', alt: 'Overwater villas on a calm lagoon', top: ['Hotels · Resorts · Homestays', 'Free cancellation on many rooms'], eyebrow: 'Hotels in India and abroad',
    lines: ['Find the right', '<em>hotel for you.</em>'], sub: 'Compare hotels, resorts and homestays — with taxes shown upfront, free-cancellation rooms and secure payment.'
  },
  holidays: {
    img: 'switzerland', alt: 'Alpine lake and mountains in Switzerland', top: ['Holiday packages', 'India · International'], eyebrow: 'For families, couples and friends',
    lines: ['Holidays planned', '<em>just for you.</em>'], sub: 'Packages with hotels, transfers and sightseeing — and holiday experts to help you plan every detail.'
  },
  bus: {
    img: 'himalayas', alt: 'A mountain road winding through the Himalayas', top: ['Bus tickets', '3.6+ lakh routes across India'], eyebrow: 'AC · Sleeper · Seater',
    lines: ['Book bus tickets', '<em>the easy way.</em>'], sub: 'Choose your seat, boarding point and drop point from trusted operators — and get your e-ticket instantly.'
  }
};

export function hero(service = 'flights') {
  const h = HEROES[service];
  const pic = cls => html`<picture>${h.mobile ? html`<source media="(max-width: 640px)" srcset="assets/img/${h.mobile}.webp">` : ''}<img class="${cls}" src="assets/img/${h.img}.webp" alt="${cls === 'hero-img' ? h.alt : ''}" fetchpriority="high" decoding="async"></picture>`;
  return html`<section class="hero hero--${service} ${h.depth ? 'has-depth' : ''}" aria-labelledby="hero-title">
    <div class="hero-photo">${pic('hero-img')}</div>
    <div class="hero-shade"></div>
    <div class="hero-wordmark" aria-hidden="true">${'AeroSkys'.split('').map((c, i) => html`<span style="--i:${i}">${c}</span>`)}</div>
    ${h.depth ? html`<div class="hero-front" aria-hidden="true">${pic('hero-front-img')}</div>` : ''}
    <div class="wrap-wide hero-inner">
      <div class="hero-topline"><span>${h.top[0]}</span><span><i></i>${h.top[1]}</span></div>
      <div class="hero-copy">
        <span class="eyebrow on-dark hero-eyebrow">${h.eyebrow}</span>
        <h1 id="hero-title"><span class="line"><span>${raw(h.lines[0])}</span></span><span class="line"><span>${raw(h.lines[1])}</span></span></h1>
        <p class="hero-sub">${h.sub}</p>
      </div>
    </div>
  </section>
  <section class="search-shell wrap-wide" aria-label="Search">
    ${searchCard({ service })}
  </section>`;
}

// Roofline of the villas, palms and planting, traced in image-space percentages (4:3 photo).
const ROOFLINE = 'polygon(28.5% 48.3%,28.9% 47.5%,32% 42.7%,35% 40.4%,41% 40.2%,44% 42.7%,46.8% 46%,49.5% 43.3%,53% 41.8%,57% 41.9%,60% 44.5%,62% 42.1%,65% 41.7%,67.5% 43.7%,70% 44%,71.5% 43.8%,75% 44.5%,75.5% 42.7%,77.8% 39%,80% 42.7%,82% 44.5%,85% 44%,88% 40.7%,92% 39%,95% 40.7%,97.5% 45.3%,100% 46%,100% 100%,28.5% 100%)';
const ROOF_TOP = .40; // fraction of image height where the tallest roofs sit

/** Cover-fits both photo layers explicitly so the traced roofline stays registered at every size. */
function layoutDepth(heroEl) {
  const box = heroEl.getBoundingClientRect();
  const w = box.width, h = box.height;
  if (!w || !h) return;
  const mobile = w < 700;
  const ratio = 4 / 3;
  const rw = Math.max(w, h * ratio), rh = rw / ratio;
  const left = (w - rw) * (mobile ? .62 : .5), top = (h - rh) * (mobile ? .5 : .46);
  heroEl.querySelectorAll('.hero-img, .hero-front-img').forEach(img => {
    Object.assign(img.style, { width: rw + 'px', height: rh + 'px', left: left + 'px', top: top + 'px' });
  });
  const front = heroEl.querySelector('.hero-front-img');
  if (front) front.style.clipPath = ROOFLINE;
  const mark = heroEl.querySelector('.hero-wordmark');
  if (mark) {
    const fs = parseFloat(getComputedStyle(mark).fontSize) || 200;
    const roofY = top + rh * ROOF_TOP;
    mark.style.top = Math.max(mobile ? 70 : 84, roofY - fs * (mobile ? .74 : .76)) + 'px';
  }
}

/** Search binding, depth layout and scroll parallax for the hero; returns { api, cleanup }. */
export function bindHero(root) {
  const form = root.querySelector('[data-search-card]');
  const api = form ? bindSearchCard(form) : null;
  const heroEl = root.querySelector('.hero');
  if (!heroEl) return { api, cleanup: () => {} };
  const depth = heroEl.classList.contains('has-depth');
  const relayout = () => depth && layoutDepth(heroEl);
  relayout();
  heroEl.querySelectorAll('img').forEach(img => { if (!img.complete) img.addEventListener('load', relayout, { once: true }); });
  document.fonts?.ready.then(relayout);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(relayout) : null;
  ro?.observe(heroEl);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  const update = () => {
    raf = 0;
    const y = Math.min(scrollY, innerHeight);
    heroEl.style.setProperty('--hero-y', (y * .16).toFixed(1) + 'px');
    heroEl.style.setProperty('--mark-y', (y * -.1).toFixed(1) + 'px');
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  if (!still) { addEventListener('scroll', onScroll, { passive: true }); update(); }
  return { api, cleanup: () => { removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); ro?.disconnect(); } };
}
