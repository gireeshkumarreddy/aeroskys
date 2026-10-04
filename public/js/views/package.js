// Holiday package details (#/holidays/package/:id): gallery with viewer, sticky section nav
// (Overview / Itinerary / Terms) with scrollspy, day-by-day itinerary, inclusions & exclusions,
// the package's own policies, a print-optimised itinerary and the live enquiry form
// (sticky on desktop; bottom bar + sheet on phones).
import { html, raw, icon, mount, on, $, $$, img, copyText, isMobile, isTouchNav, reducedMotion } from '../core/dom.js';
import { money, plural } from '../core/format.js';
import { href } from '../core/router.js';
import { store } from '../core/store.js';
import { crumbs, emptyState } from '../ui/common.js';
import { pkgCard } from '../ui/cards.js';
import { openModal } from '../ui/overlay.js';
import { toast } from '../ui/toast.js';
import { mountHolidayEnquiry, holidayDraft } from '../ui/enquiry.js';
import { PACKAGES, HOLIDAY_CATEGORIES, HOLIDAY_CITIES, HANDPICKED } from '../data/packages.js';
import { COMPANY } from '../data/content.js';

const BY_ID = Object.fromEntries(PACKAGES.map(p => [p.id, p]));
const FEATURE_ICON = { Hotel: 'bed', Flight: 'plane', Sightseeing: 'binoculars', Transfer: 'car', Activity: 'flag', Cruise: 'ship' };
const SECTIONS = [['overview', 'Overview'], ['itinerary', 'Itinerary'], ['terms', 'Terms']];
const OV_LIMIT = 500;
const SMALL = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'via', 'with']);

// ---------------------------------------------------------------- text helpers (live content is imported HTML text)
function decode(s) {
  if (!/&[#a-z0-9]+;/i.test(s) || typeof document === 'undefined') return s;
  const t = document.createElement('textarea');
  t.innerHTML = s;
  return t.value;
}
const clean = s => decode(String(s ?? '')).replace(/\r/g, '').replace(/[ \t ]+/g, ' ').trim();
const paras = s => clean(s).split(/\n+/).map(x => x.trim()).filter(Boolean);
/** "ARRIVAL SRINAGAR" → "Arrival Srinagar"; pipes between stops become middle dots. */
function tidyTitle(t) {
  let s = clean(t).replace(/\s*\|\s*/g, ' · ');
  if (s === s.toUpperCase() && /[A-Z]{3}/.test(s)) s = s.toLowerCase().replace(/[a-z][a-z']*/g, (w, i) => (i && SMALL.has(w) ? w : w[0].toUpperCase() + w.slice(1)));
  return s;
}
/** Policy blocks → paragraphs and lists; "When : Amount" lists become a two-column schedule. */
function blocksHTML(blocks) {
  const out = [];
  let list = [];
  const flush = () => {
    if (!list.length) return;
    const schedule = list.length > 1 && list.every(t => / : /.test(t));
    out.push(schedule
      ? html`<dl class="hd-sched">${list.map(t => { const [a, ...b] = t.split(' : '); return html`<div><dt>${a}</dt><dd>${b.join(' : ')}</dd></div>`; })}</dl>`
      : html`<ul class="hd-bullets">${list.map(t => html`<li>${t}</li>`)}</ul>`);
    list = [];
  };
  for (const b of blocks || []) {
    const t = clean(b.text);
    if (!t) continue;
    if (b.t === 'li') { list.push(t); continue; }
    flush();
    out.push(html`<p>${t}</p>`);
  }
  flush();
  return out;
}
function checkList(items, iconName, empty) {
  const rows = items.map(clean).filter(Boolean);
  if (!rows.length) return html`<p class="hd-inex-empty">${empty}</p>`;
  return html`<ul class="hd-checks">${rows.map(t => (/:$/.test(t) ? html`<li class="is-head">${t.replace(/:$/, '')}</li>` : html`<li>${icon(iconName)}<span>${t}</span></li>`))}</ul>`;
}

// ---------------------------------------------------------------- data helpers
const destinationOf = p => Object.keys(HOLIDAY_CITIES).find(k => HOLIDAY_CITIES[k].includes(p.id)) || p.cities[0] || '';
function photosOf(p) {
  const extra = p.gallery.length < 4 ? p.itinerary.map(d => d.image) : [];
  return [...new Set([p.banner, ...p.gallery, ...extra].filter(Boolean))];
}
function similarTo(p) {
  return PACKAGES.filter(x => x.id !== p.id && x.region === p.region)
    .map(x => ({ x, s: x.categories.filter(c => p.categories.includes(c)).length * 2 + (x.cities.some(c => p.cities.includes(c)) ? 2 : 0) + (x.tag === p.tag ? 1 : 0) }))
    .sort((a, b) => b.s - a.s || Math.abs(a.x.price - p.price) - Math.abs(b.x.price - p.price))
    .slice(0, 8)
    .map(o => o.x);
}

// ---------------------------------------------------------------- photo viewer
function openViewer(p, photos, start) {
  const n = photos.length;
  let i = start;
  return openModal({
    title: p.name, size: 'full', fullscreen: true, className: 'hd-viewer',
    body: html`<div class="hd-v">
      <div class="hd-v-stage">
        <figure class="hd-v-fig" data-hd-v-fig></figure>
        ${n > 1 ? html`<button type="button" class="hd-v-nav is-prev" data-hd-v="-1" aria-label="Previous photo">${icon('chevron-left')}</button><button type="button" class="hd-v-nav is-next" data-hd-v="1" aria-label="Next photo">${icon('chevron-right')}</button>` : ''}
      </div>
      <p class="hd-v-count" data-hd-v-count aria-live="polite"></p>
      ${n > 1 ? html`<div class="hd-v-thumbs" data-hd-v-thumbs>${photos.map((src, k) => html`<button type="button" class="hd-v-thumb" data-hd-v-go="${k}" aria-label="Show photo ${k + 1} of ${n}">${img(src, { alt: '', fallback: p.fallback })}</button>`)}</div>` : ''}
    </div>`,
    onOpen(dlg) {
      const fig = $('[data-hd-v-fig]', dlg), count = $('[data-hd-v-count]', dlg), strip = $('[data-hd-v-thumbs]', dlg);
      const show = k => {
        i = (k + n) % n;
        fig.innerHTML = String(img(photos[i], { alt: `${p.name} — photo ${i + 1} of ${n}`, fallback: p.fallback, lazy: false }));
        count.textContent = `${i + 1} / ${n}`;
        $$('[data-hd-v-go]', dlg).forEach((b, k2) => b.setAttribute('aria-current', String(k2 === i)));
        const t = strip?.children[i];
        if (t) strip.scrollTo({ left: t.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2, behavior: reducedMotion() ? 'auto' : 'smooth' });
      };
      on(dlg, 'click', '[data-hd-v]', (e, b) => show(i + Number(b.dataset.hdV)));
      on(dlg, 'click', '[data-hd-v-go]', (e, b) => show(Number(b.dataset.hdVGo)));
      dlg.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); }
      });
      let x0 = null;
      const stage = $('.hd-v-stage', dlg);
      stage.addEventListener('pointerdown', e => { x0 = e.clientX; });
      stage.addEventListener('pointerup', e => {
        if (x0 == null || n < 2) return;
        const dx = e.clientX - x0; x0 = null;
        if (Math.abs(dx) > 45) show(i + (dx < 0 ? 1 : -1));
      });
      show(i);
    }
  });
}

// ---------------------------------------------------------------- view
export default async function packageView(el, ctx) {
  const p = BY_ID[ctx.params.id];
  if (!p) {
    document.title = 'Package not found — AeroSkys';
    const picks = HANDPICKED.domestic.slice(0, 4).map(id => BY_ID[id]).filter(Boolean);
    mount(el, html`<div class="hd-view"><section class="page"><div class="wrap">
      ${emptyState({ iconName: 'compass', title: 'We couldn’t find that package', text: 'It may have been updated or is no longer listed. Browse the current holiday packages instead.', action: html`<a class="btn btn-primary" href="#/holidays">Browse holidays</a>` })}
      <div class="pkg-grid hd-nf-grid">${picks.map(x => pkgCard(x))}</div>
    </div></section></div>`);
    return;
  }

  document.title = `${p.name} — ${p.days} Days / ${p.nights} Nights Holiday Package | AeroSkys`;
  const photos = photosOf(p);
  const cats = HOLIDAY_CATEGORIES.filter(c => p.categories.includes(c.id));
  const dest = destinationOf(p);
  const similar = similarTo(p);
  const ov = paras(p.overview);
  const ovText = ov.join(' ');
  const ovLong = ovText.length > OV_LIMIT + 40;
  const ovShort = ovLong ? ovText.slice(0, OV_LIMIT).replace(/\s+\S*$/, '') + '…' : '';
  const shown = photos.slice(0, 5);
  const inr = (n, extra = '') => html`<b data-hd-inr="${n}"${extra ? raw(` class="${extra}"`) : ''}>${money(n)}</b>`;

  mount(el, html`<div class="hd-view hd-pkg">
    <div class="hd-print-head" aria-hidden="true"><img src="assets/brand/aeroskys-logo.png" alt="" width="150" height="30"><span>Holiday itinerary · ${COMPANY.phone} · ${COMPANY.email}</span></div>

    <header class="wrap hd-pkg-head">
      ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Holidays', href: '#/holidays' }, dest && { label: dest, href: href('/holidays/search', { city: dest }) }, { label: p.name }].filter(Boolean), true)}
      <div class="hd-pkg-top">
        <div class="hd-pkg-id">
          <div class="hd-pkg-tags"><span class="badge badge-blue">${p.tag}</span><span class="badge">${p.region === 'domestic' ? 'Domestic' : 'International'}</span>${cats.map(c => html`<span class="badge badge-outline">${c.name}</span>`)}</div>
          <h1 class="hd-pkg-h1">${p.name}</h1>
          <p class="hd-pkg-meta"><span>${icon('clock')}<b>${p.days} Days / ${p.nights} Nights</b></span><span>${icon('pin')}${p.place}</span></p>
        </div>
        <div class="hd-pkg-buy">
          <p class="hd-pkg-price"><small>Start from</small>${inr(p.price)}<small>Per Person</small></p>
          <div class="hd-pkg-actions">
            <button type="button" class="btn btn-light btn-sm" data-hd-print title="Opens a print-ready itinerary — choose “Save as PDF” to download it">${icon('download')} Download Itinerary</button>
            <button type="button" class="btn btn-light btn-sm" data-hd-share>${icon('arrow-up-right')} Share</button>
          </div>
        </div>
      </div>
    </header>

    ${shown.length ? html`<section class="wrap hd-gallery" data-count="${shown.length}" aria-label="Photos of ${p.name}">
      ${shown.map((src, i) => html`<button type="button" class="hd-g-item ${i === 0 ? 'is-main' : ''}" data-hd-photo="${i}" aria-label="Open photo ${i + 1} of ${photos.length}">${img(src, { alt: i === 0 ? p.name : '', fallback: p.fallback, lazy: i > 0 })}${i === 4 && photos.length > 5 ? html`<span class="hd-g-more">+${photos.length - 5}</span>` : ''}</button>`)}
      ${photos.length > 1 ? html`<button type="button" class="hd-g-all" data-hd-photo="0">${icon('grid')} View all ${photos.length} photos</button>` : ''}
    </section>` : ''}

    <nav class="hd-secnav" data-hd-secnav aria-label="Package sections">
      <div class="wrap"><div class="hd-secnav-in">
        <div class="hd-secnav-tabs">${SECTIONS.map(([id, label], i) => html`<button type="button" class="hd-secnav-tab" data-hd-jump="${id}" aria-current="${i === 0}">${label}</button>`)}</div>
        <div class="hd-secnav-end"><span class="hd-secnav-price"><small>Start from</small>${inr(p.price)}</span><button type="button" class="btn btn-primary btn-sm" data-hd-enquire>Enquire now</button></div>
      </div></div>
    </nav>

    <div class="wrap hd-pkg-layout">
      <div class="hd-pkg-main">
        <section class="hd-sec" id="hd-sec-overview" data-hd-sec="overview" aria-labelledby="hd-t-overview">
          <h2 class="h3 hd-sec-title" id="hd-t-overview">Overview</h2>
          <div class="hd-ov">
            ${ov.length
              ? (ovLong
                ? html`<p class="hd-ov-short" data-hd-ov-short>${ovShort}</p><div class="hd-ov-full" id="hd-ov-full" hidden>${ov.map(t => html`<p>${t}</p>`)}</div>
                  <button type="button" class="text-btn hd-ov-toggle" data-hd-ov aria-expanded="false" aria-controls="hd-ov-full"><span>Read More</span>${icon('chevron-down')}</button>`
                : ov.map(t => html`<p>${t}</p>`))
              : html`<p>${p.days} days and ${p.nights} nights in ${p.place}. The day-by-day plan is below.</p>`}
          </div>
          <dl class="hd-glance">
            <div><dt>${icon('clock')}Duration</dt><dd>${p.days} Days / ${p.nights} Nights</dd></div>
            <div><dt>${icon('pin')}Destination</dt><dd>${p.place}</dd></div>
            <div><dt>${icon('compass')}Holiday type</dt><dd>${cats.length ? cats.map(c => c.name).join(', ') : p.tag}</dd></div>
            <div><dt>${icon('wallet')}Starting price</dt><dd>${inr(p.price)} per person</dd></div>
          </dl>
          <div class="hd-feat-blocks">
            <div><h3 class="hd-sub">Package features</h3><ul class="hd-feats">${p.features.map(f => html`<li><span class="hd-feat-ic" aria-hidden="true">${icon(FEATURE_ICON[f] || 'check')}</span>${f}</li>`)}</ul></div>
            ${p.facilities.length ? html`<div><h3 class="hd-sub">Facilities</h3><ul class="hd-feats">${p.facilities.map(f => html`<li><span class="hd-feat-ic" aria-hidden="true">${icon(/airport/i.test(f) ? 'plane' : 'check')}</span>${f}</li>`)}</ul></div>` : ''}
          </div>
        </section>

        <section class="hd-sec" id="hd-sec-itinerary" data-hd-sec="itinerary" aria-labelledby="hd-t-itinerary">
          <div class="hd-sec-head"><h2 class="h3 hd-sec-title" id="hd-t-itinerary">Itinerary</h2><button type="button" class="text-btn" data-hd-expand aria-pressed="false">${icon('plus')}<span>Expand all</span></button></div>
          <ol class="hd-itin">${p.itinerary.map((d, i) => { const t = tidyTitle(d.title); const text = paras(d.text); return html`<li>
            <details class="hd-day"${i === 0 ? raw(' open') : ''}>
              <summary><span class="hd-day-n"><small>Day</small>${d.day}</span><span class="hd-day-t">${t}</span>${icon('chevron-down', 'hd-day-caret')}</summary>
              <div class="hd-day-body ${d.image ? '' : 'no-img'}">
                ${d.image ? html`<figure class="hd-day-img">${img(d.image, { alt: t, fallback: p.fallback })}</figure>` : ''}
                <div class="hd-day-text">${text.map(x => html`<p>${x}</p>`)}</div>
              </div>
            </details></li>`; })}</ol>

          <h2 class="h3 hd-sec-title hd-inex-title">Inclusions &amp; exclusions</h2>
          <div class="hd-inex">
            <div class="hd-inex-col is-in"><h3 class="hd-sub">${icon('check-circle')} Inclusions</h3>${checkList(p.inclusions, 'check', 'Ask our holiday desk for the full list of inclusions when you enquire.')}</div>
            <div class="hd-inex-col is-ex"><h3 class="hd-sub">${icon('x')} Exclusions</h3>${checkList(p.exclusions, 'x', 'No exclusions are listed for this package.')}</div>
          </div>
        </section>

        <section class="hd-sec" id="hd-sec-terms" data-hd-sec="terms" aria-labelledby="hd-t-terms">
          <h2 class="h3 hd-sec-title" id="hd-t-terms">Terms</h2>
          ${[['Payment Policy', 'wallet', p.paymentPolicy], ['Cancellation Policy', 'refresh', p.cancellationPolicy], ['Terms & Conditions', 'file', p.terms]]
            .filter(([, , b]) => b && b.length)
            .map(([title, ic, b]) => html`<div class="hd-policy"><h3 class="hd-sub">${icon(ic)} ${title}</h3><div class="hd-policy-body">${blocksHTML(b)}</div></div>`)}
          <p class="hd-terms-foot">See also our <a class="link" href="#/cancellation-policy">Cancellation Policy</a> and <a class="link" href="#/refund-policy">Refund Policy</a>.</p>
          <button type="button" class="btn btn-light hd-print-btn" data-hd-print title="Opens a print-ready itinerary — choose “Save as PDF” to download it">${icon('printer')} Download Itinerary</button>
        </section>
      </div>

      <aside class="hd-pkg-aside" aria-label="Enquire about ${p.name}">
        <div class="card hd-enq" id="hd-enquiry" data-hd-enq></div>
        <p class="hd-enq-help">${icon('headset')}<span>Questions about this trip? Call <a class="link" href="tel:${COMPANY.phoneIntl}">${COMPANY.phone}</a> — 24/7 support.</span></p>
      </aside>
    </div>

    ${similar.length ? html`<section class="section-sm bg-wash hd-similar" aria-labelledby="hd-sim-title">
      <div class="wrap">
        <div class="hd-rail-head">
          <div><h2 class="h3" id="hd-sim-title">Similar packages</h2><p>More ${p.region === 'domestic' ? 'holidays in India' : 'international holidays'} you may like.</p></div>
          <div class="hd-rail-actions"><div class="rail-nav hide-sm"><button type="button" data-hd-sim="-1" aria-label="Scroll similar packages back">${icon('arrow-left')}</button><button type="button" data-hd-sim="1" aria-label="Scroll similar packages forward">${icon('arrow-right')}</button></div></div>
        </div>
        <div class="rail hd-rail" data-hd-sim-rail role="group" aria-label="Similar packages">${similar.map(x => pkgCard(x))}</div>
      </div>
    </section>` : ''}

    <div class="mobile-cta hd-mcta">
      <div class="mc-price"><small>Start from</small>${inr(p.price)}<small>per person</small></div>
      <button type="button" class="btn btn-primary" data-hd-sheet>Enquire now</button>
    </div>
  </div>`);

  const root = el.firstElementChild;
  document.body.classList.add('has-mobile-cta');
  const behavior = () => (reducedMotion() ? 'auto' : 'smooth');
  const enqCtx = { destination: p.name, packageId: p.id, packageName: p.name, price: p.price, heading: 'full' };
  const asideEnquiry = mountHolidayEnquiry($('[data-hd-enq]', root), enqCtx);

  // ---- gallery, share, read more
  on(root, 'click', '[data-hd-photo]', (e, b) => openViewer(p, photos, Number(b.dataset.hdPhoto)));
  on(root, 'click', '[data-hd-share]', async () => {
    const url = location.href;
    if (isMobile() && navigator.share) {
      try { await navigator.share({ title: p.name, text: `${p.name} — ${p.days} Days / ${p.nights} Nights`, url }); return; }
      catch (err) { if (err?.name === 'AbortError') return; /* share unavailable: fall back to copying */ }
    }
    const ok = await copyText(url);
    toast(ok ? 'Link to this package copied.' : 'Could not copy the link.', { type: ok ? 'success' : 'error' });
  });
  const setOverview = open => {
    const btn = $('[data-hd-ov]', root);
    if (!btn) return;
    $('[data-hd-ov-short]', root).hidden = open;
    $('#hd-ov-full', root).hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    $('span', btn).textContent = open ? 'Read Less' : 'Read More';
  };
  on(root, 'click', '[data-hd-ov]', (e, b) => {
    const open = b.getAttribute('aria-expanded') !== 'true';
    setOverview(open);
    if (!open) $('#hd-sec-overview', root).scrollIntoView({ block: 'start', behavior: behavior() });
  });

  // ---- itinerary: expand / collapse all
  const days = $$('details.hd-day', root);
  const syncExpand = () => {
    const all = days.every(d => d.open);
    const b = $('[data-hd-expand]', root);
    b.setAttribute('aria-pressed', String(all));
    $('span', b).textContent = all ? 'Collapse all' : 'Expand all';
    b.querySelector('use')?.setAttribute('href', all ? '#i-minus' : '#i-plus');
  };
  on(root, 'click', '[data-hd-expand]', () => { const open = !days.every(d => d.open); days.forEach(d => { d.open = open; }); syncExpand(); });
  const onToggle = e => { if (e.target.matches?.('details.hd-day')) syncExpand(); };
  root.addEventListener('toggle', onToggle, true);

  // ---- section nav: jump + scrollspy
  const nav = $('[data-hd-secnav]', root);
  const secs = SECTIONS.map(([id]) => ({ id, el: $(`[data-hd-sec="${id}"]`, root) }));
  const stuckBottom = () => (parseFloat(getComputedStyle(nav).top) || 0) + nav.offsetHeight + 12;
  const setCurrent = id => $$('[data-hd-jump]', nav).forEach(b => b.setAttribute('aria-current', String(b.dataset.hdJump === id)));
  let raf = 0, jumpUntil = 0;
  const spy = () => {
    raf = 0;
    if (Date.now() < jumpUntil) return;
    const line = stuckBottom() + 24;
    let cur = secs[0].id;
    for (const s of secs) if (s.el.getBoundingClientRect().top <= line) cur = s.id;
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4 && secs.at(-1).el.getBoundingClientRect().top < innerHeight) cur = secs.at(-1).id;
    setCurrent(cur);
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(spy); };
  addEventListener('scroll', onScroll, { passive: true });
  on(root, 'click', '[data-hd-jump]', (e, b) => {
    const s = secs.find(x => x.id === b.dataset.hdJump);
    if (!s) return;
    setCurrent(s.id);
    jumpUntil = Date.now() + (reducedMotion() ? 0 : 900);
    scrollTo({ top: s.el.getBoundingClientRect().top + scrollY - stuckBottom(), behavior: behavior() });
    s.el.querySelector('.hd-sec-title')?.setAttribute('tabindex', '-1');
    s.el.querySelector('.hd-sec-title')?.focus({ preventScroll: true });
  });

  // ---- enquiry: desktop form in the sticky aside; phones & tablets get a bottom sheet.
  // Unsent details survive closing the sheet, so reopening it restores what was entered.
  let sheetEnquiry = null, sheetDraft = null;
  const openSheet = () => openModal({
    title: 'Enquire now', className: 'hd-enq-sheet',
    body: html`<div class="hd-sheet-pkg"><b>${p.name}</b><span>${p.days} Days / ${p.nights} Nights · from ${money(p.price)} per person</span></div><div data-hd-sheet-host></div>`,
    onOpen(dlg) { sheetEnquiry = mountHolidayEnquiry($('[data-hd-sheet-host]', dlg), { ...enqCtx, prefill: sheetDraft || {} }); },
    onClose() { sheetDraft = holidayDraft(sheetEnquiry); sheetEnquiry?.destroy(); sheetEnquiry = null; }
  });
  on(root, 'click', '[data-hd-sheet]', openSheet);
  on(root, 'click', '[data-hd-enquire]', () => {
    if (isTouchNav()) { openSheet(); return; }
    const card = $('[data-hd-enq]', root);
    scrollTo({ top: Math.max(0, card.getBoundingClientRect().top + scrollY - stuckBottom()), behavior: behavior() });
    const form = $('form', card);
    const target = form ? ([...form.querySelectorAll('input:not([type=hidden]), button.pg-pick')].find(x => !x.value && !x.classList.contains('pg-pick')) || form.querySelector('button.pg-pick.is-empty') || form.querySelector('input:not([type=hidden])')) : $('[data-pg-success]', card);
    target?.focus({ preventScroll: true });
  });

  // ---- similar packages rail
  on(root, 'click', '[data-hd-sim]', (e, b) => {
    const rail = $('[data-hd-sim-rail]', root);
    rail?.scrollBy({ left: Number(b.dataset.hdSim) * rail.clientWidth * 0.85, behavior: behavior() });
  });

  // ---- printable itinerary: open every day and the full overview while printing
  let printState = null;
  const beforePrint = () => {
    if (printState) return;
    printState = { days: days.map(d => d.open), ov: $('[data-hd-ov]', root)?.getAttribute('aria-expanded') === 'true' };
    days.forEach(d => { d.open = true; });
    setOverview(true);
  };
  const afterPrint = () => {
    if (!printState) return;
    days.forEach((d, k) => { d.open = printState.days[k]; });
    setOverview(printState.ov);
    printState = null;
    syncExpand();
  };
  addEventListener('beforeprint', beforePrint);
  addEventListener('afterprint', afterPrint);
  on(root, 'click', '[data-hd-print]', () => { beforePrint(); window.print(); });

  // ---- prices follow the header currency switch
  let currency = store.get('currency');
  const offCurrency = store.subscribe(s => {
    if (s.currency === currency) return;
    currency = s.currency;
    $$('[data-hd-inr]', root).forEach(b => { b.textContent = money(Number(b.dataset.hdInr)); });
    const rail = $('[data-hd-sim-rail]', root);
    if (rail) rail.innerHTML = String(html`${similar.map(x => pkgCard(x))}`);
  });

  return () => {
    removeEventListener('scroll', onScroll);
    cancelAnimationFrame(raf);
    removeEventListener('beforeprint', beforePrint);
    removeEventListener('afterprint', afterPrint);
    root.removeEventListener('toggle', onToggle, true);
    document.body.classList.remove('has-mobile-cta');
    offCurrency();
    asideEnquiry.destroy();
    sheetEnquiry?.destroy();
  };
}
