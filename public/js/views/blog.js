// Blog (#/blog): the AeroSkys journal — the live posts in an editorial grid.
import { html, icon, mount } from '../core/dom.js';
import { postCard } from '../ui/cards.js';
import { pageBand } from '../ui/enquiry.js';
import { POSTS } from '../data/pages.js';

export default async function blog(el) {
  document.title = 'Travel Blog — Tips, Deals & Itineraries | AeroSkys';
  mount(el, html`<div class="pg-view pg-blog">
    ${pageBand({ eyebrow: 'Travel blog', title: 'Travel tips <em>&amp; guides.</em>', text: 'Destination guides, packing tips and simple ways to save on your next trip.', trail: [{ label: 'Blog' }], art: 'file', contact: false })}
    <section class="wrap pg-lift pg-blog-body" aria-label="Articles">
      ${POSTS.length
        ? html`<div class="journal pg-journal">${POSTS.map((p, i) => postCard(p, { lead: i === 0 }))}</div>`
        : html`<div class="empty">${icon('file')}<h3>No articles yet</h3><p>New travel stories are on the way.</p></div>`}
    </section>
    <section class="section-sm wrap">
      <div class="pg-blog-cta">
        <div><h2 class="h3">Ready when you are.</h2><p>Turn the inspiration into a trip — flights, stays and holiday packages in one place.</p></div>
        <div class="pg-blog-cta-actions"><a class="btn btn-primary" href="#/holidays">${icon('palm')} Explore holidays</a><a class="btn btn-light" href="#/">${icon('plane')} Search flights</a></div>
      </div>
    </section>
  </div>`);
}
