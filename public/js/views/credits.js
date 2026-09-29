// Photography credits (#/credits) from assets/credits.json, plus where the other imagery comes from.
import { html, icon, mount, $, img } from '../core/dom.js';
import { pageBand } from '../ui/enquiry.js';

const slug = label => String(label || '').toLowerCase().trim().replace(/\s+/g, '-');
const isUnsplashLicense = url => /unsplash\.com\/license/i.test(url || '');

function creditHTML(c) {
  return html`<li class="pg-credit">
    <span class="pg-credit-img">${img(`assets/img/${slug(c.label)}.webp`, { alt: '' })}</span>
    <span class="pg-credit-body">
      <b>${c.label}</b>
      <span>${c.author ? `Photo by ${c.author}` : 'Photographer not recorded'}</span>
      <span class="pg-credit-links">
        ${c.source ? html`<a class="link" href="${c.source}" target="_blank" rel="noopener noreferrer">Source</a>` : ''}
        ${c.license ? html`<a class="link" href="${c.license}" target="_blank" rel="noopener noreferrer">${isUnsplashLicense(c.license) ? 'Unsplash License' : 'Licence'}</a>` : ''}
      </span>
    </span>
  </li>`;
}

export default async function credits(el) {
  document.title = 'Photography Credits — AeroSkys';
  mount(el, html`<div class="pg-view pg-credits-view">
    ${pageBand({ eyebrow: 'Credits', title: 'Photography <em>credits.</em>', text: 'The photographers behind the destination images used across this prototype.', trail: [{ label: 'Photography credits' }], art: 'eye', contact: false })}
    <section class="wrap pg-lift" aria-labelledby="pg-credits-title">
      <div class="card pg-credits-card">
        <div class="spread pg-credits-head"><h2 class="h3" id="pg-credits-title">Destination photographs</h2><span class="pg-credits-count" data-pg-count></span></div>
        <div data-pg-credits><ul class="pg-credits">${Array.from({ length: 8 }, () => html`<li class="pg-credit" aria-hidden="true"><span class="pg-credit-img skeleton"></span><span class="pg-credit-body"><span class="skeleton" style="height:14px;width:60%"></span><span class="skeleton" style="height:12px;width:80%;margin-top:8px"></span></span></li>`)}</ul></div>
      </div>
      <div class="pg-credit-notes">
        <div>${icon('palm')}<p><b>Holiday packages.</b> Package, gallery and itinerary photographs come from aeroskys.com and are served from the AeroSkys content CDN. If one can’t load, a local photograph from the list above is shown instead.</p></div>
        <div>${icon('bed')}<p><b>Hotels.</b> Hotel photographs come from Unsplash and are used under the Unsplash License.</p></div>
        <div>${icon('tag')}<p><b>Offers and airline logos.</b> Offer artwork and airline logos are served from the AeroSkys content CDN.</p></div>
        <div>${icon('sparkles')}<p><b>Icons.</b> Interface icons are from Lucide, used under the ISC License.</p></div>
      </div>
    </section>
  </div>`);

  const root = el.firstElementChild;
  let list = null;
  try {
    const res = await fetch('assets/credits.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    list = await res.json();
  } catch { list = null; }
  if (!root.isConnected) return;

  const box = $('[data-pg-credits]', root);
  if (!Array.isArray(list) || !list.length) {
    box.innerHTML = String(html`<div class="pg-credits-error">${icon('alert')}<p>The credits list couldn’t be loaded. Please refresh the page to try again.</p></div>`);
    return;
  }
  $('[data-pg-count]', root).textContent = `${list.length} photographs`;
  box.innerHTML = String(html`<ul class="pg-credits">${list.map(creditHTML)}</ul>`);
}
