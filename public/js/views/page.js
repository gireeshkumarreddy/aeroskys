// Company & policy pages — #/about, #/terms, #/payment-security, #/privacy, #/cancellation-policy,
// #/refund-policy — rendered from the live PAGES text, with a sticky index of all policy pages.
// Also exports the prose helpers used by blog posts.
import { html, raw, icon, mount, on, $, reducedMotion } from '../core/dom.js';
import { crumbs } from '../ui/common.js';
import { COMPANY } from '../data/content.js';
import { PAGES } from '../data/pages.js';

/** [route, PAGES key, icon] */
export const DOCS = [
  ['/about', 'about', 'info'],
  ['/terms', 'terms', 'file'],
  ['/payment-security', 'paymentSecurity', 'lock'],
  ['/privacy', 'privacy', 'shield'],
  ['/cancellation-policy', 'cancellation', 'refresh'],
  ['/refund-policy', 'refund', 'wallet']
];

// ---------------------------------------------------------------- prose helpers
export const tidy = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const EMAIL = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/;
/** Text with email addresses turned into mailto links (everything else stays escaped). */
export const linkify = t => String(t).split(EMAIL).map((part, i) => (i % 2 ? html`<a class="link" href="mailto:${part}">${part}</a>` : part));
/** "Label: detail" and "Label - detail" list items get a bold lead-in. */
export function richText(t) {
  const m = t.match(/^([^:]{2,48}?)\s*:\s+(\S.*)$/);
  if (m && !/^(https?|also read)/i.test(m[1])) return html`<b>${m[1]}:</b> ${linkify(m[2])}`;
  const d = t.match(/^(.{3,48}?)\s+-\s+(\S.*)$/);
  if (d) return html`<b>${d[1]}</b> — ${linkify(d[2])}`;
  return linkify(t);
}
export const readingTime = blocks => Math.max(1, Math.round(blocks.reduce((n, b) => n + tidy(b.text).split(' ').filter(Boolean).length, 0) / 200));
/** Short label-like paragraphs in blog posts ("Morning:", "7 Tips to Find Cheap Flights…") read as sub-headings. */
const pseudoHeading = (t, next) => !!next && next.t !== 'h' && t.length <= 70 && !/^also read/i.test(t)
  && (/:$/.test(t) ? t.length <= 30 : !/[.!?,;:]$/.test(t) && /^[A-Z0-9]/.test(t) && t.split(' ').length <= 12);

/** Blocks [{ t: 'h'|'p'|'li', text }] → h2 / (h3) / p / ul. Headings get ids for an index. */
export function proseHTML(blocks, { idPrefix = 'sec', pseudo = false, lead = false } = {}) {
  const out = [], toc = [];
  let list = [];
  const flush = () => { if (list.length) { out.push(html`<ul>${list.map(t => html`<li>${richText(t)}</li>`)}</ul>`); list = []; } };
  (blocks || []).forEach((b, i) => {
    const t = tidy(b.text);
    if (!t) return;
    if (b.t === 'li') { list.push(t); return; }
    flush();
    if (b.t === 'h') {
      const id = `${idPrefix}-${toc.length + 1}`;
      toc.push({ id, text: t });
      out.push(html`<h2 id="${id}" tabindex="-1">${t}</h2>`);
    } else if (pseudo && pseudoHeading(t, blocks[i + 1])) {
      out.push(html`<h3>${t.replace(/:$/, '')}</h3>`);
    } else {
      out.push(html`<p${lead && !out.length ? raw(' class="pg-lead"') : ''}>${linkify(t)}</p>`);
    }
  });
  flush();
  return { body: out, toc };
}

/** Scrolls to a heading below the floating masthead and moves focus to it. */
export function jumpTo(target) {
  if (!target) return;
  scrollTo({ top: target.getBoundingClientRect().top + scrollY - 104, behavior: reducedMotion() ? 'auto' : 'smooth' });
  target.focus({ preventScroll: true });
}

const companyCard = () => html`<aside class="pg-company" aria-label="Company details">
  <div class="pg-company-top"><span class="pg-company-ic" aria-hidden="true">${icon('building')}</span><div><h2>${COMPANY.legal}</h2><p>AeroSkys is developed and maintained by ${COMPANY.legal}.</p></div></div>
  <dl>
    <div><dt>${icon('pin')}Office</dt><dd>${COMPANY.address}</dd></div>
    <div><dt>${icon('mail')}Email</dt><dd><a class="link" href="mailto:${COMPANY.email}">${COMPANY.email}</a></dd></div>
    <div><dt>${icon('phone')}Phone</dt><dd><a class="link" href="tel:${COMPANY.phone}">${COMPANY.phone}</a> · 24/7 support</dd></div>
  </dl>
</aside>`;

export default async function page(el, ctx) {
  const doc = DOCS.find(d => d[0] === ctx.path) || DOCS[0];
  const [path, key, ic] = doc;
  const pg = PAGES[key];
  document.title = `${pg.title} — AeroSkys`;
  const { body, toc } = proseHTML(pg.blocks, { idPrefix: `pg-${key}`, lead: key === 'about' });

  mount(el, html`<div class="pg-view pg-doc-view">
    <section class="band page-hero pg-band pg-band-doc" aria-labelledby="pg-doc-title">
      <span class="pg-band-art" aria-hidden="true">${icon(ic)}</span>
      <div class="wrap">
        ${crumbs([{ label: 'Home', href: '#/' }, { label: pg.title }])}
        <span class="eyebrow on-dark">${key === 'about' ? 'Company' : 'Policies'}</span>
        <h1 class="display" id="pg-doc-title">${pg.title}</h1>
      </div>
    </section>
    <div class="wrap pg-doc">
      <aside class="pg-doc-side">
        <nav class="pg-doc-nav" aria-label="Company and policies">
          <p class="pg-doc-nav-h">Company &amp; policies</p>
          <ul>${DOCS.map(([p, k, i2]) => html`<li><a href="#${p}"${p === path ? raw(' aria-current="page"') : ''}>${icon(i2)}<span>${PAGES[k].title}</span></a></li>`)}</ul>
        </nav>
        ${toc.length >= 3 ? html`<nav class="pg-toc" aria-label="On this page"><p class="pg-doc-nav-h">On this page</p><ol>${toc.map(t => html`<li><button type="button" data-pg-toc="${t.id}">${t.text}</button></li>`)}</ol></nav>` : ''}
        <div class="pg-doc-help">
          <p><b>Questions?</b> Our team is available 24/7.</p>
          <a href="tel:${COMPANY.phone}">${icon('phone')} ${COMPANY.phone}</a>
          <a href="mailto:${COMPANY.email}">${icon('mail')} ${COMPANY.email}</a>
        </div>
      </aside>
      <article class="pg-prose pg-doc-body" aria-labelledby="pg-doc-title">
        ${key === 'about' ? companyCard() : ''}
        ${body}
      </article>
    </div>
  </div>`);

  const root = el.firstElementChild;
  on(root, 'click', '[data-pg-toc]', (e, b) => jumpTo(document.getElementById(b.dataset.pgToc)));
  // On phones the policy links are one scrolling row; bring the current page's pill into view.
  const row = root.querySelector('.pg-doc-nav ul'), cur = row?.querySelector('[aria-current="page"]');
  if (row && cur && row.scrollWidth > row.clientWidth) {
    const x = cur.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft;
    row.scrollLeft = x - (row.clientWidth - cur.offsetWidth) / 2;
  }
}
