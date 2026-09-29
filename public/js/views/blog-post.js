// Blog article (#/blog/:slug): hero image, reading time, the live post blocks and related posts.
import { html, icon, mount, on, img, copyText } from '../core/dom.js';
import { crumbs, emptyState } from '../ui/common.js';
import { postCard } from '../ui/cards.js';
import { toast } from '../ui/toast.js';
import { POSTS } from '../data/pages.js';
import { proseHTML, readingTime, tidy } from './page.js';

// Local photograph shown if a post image can't load.
const FALLBACK = { 'best-deals-package-auckland': 'new-zealand', 'learn-how-to-pack-smart-and-light-with-these-amazing-travel-packing-tips-that-will-save-you-time-and-space': 'thailand' };

export default async function blogPost(el, ctx) {
  const post = POSTS.find(p => p.slug === ctx.params.slug);
  if (!post) {
    document.title = 'Article not found — AeroSkys';
    mount(el, html`<div class="pg-view"><section class="page"><div class="wrap-narrow">${emptyState({ iconName: 'file', title: 'We couldn’t find that article', text: 'It may have moved. Browse the latest travel stories instead.', action: html`<a class="btn btn-primary" href="#/blog">Go to the blog</a>` })}</div></section></div>`);
    return;
  }
  document.title = `${tidy(post.title)} — AeroSkys Blog`;
  const { body } = proseHTML(post.blocks, { idPrefix: 'pg-post', pseudo: true, lead: true });
  const mins = readingTime(post.blocks);
  const related = POSTS.filter(p => p.slug !== post.slug).slice(0, 3);

  mount(el, html`<div class="pg-view pg-post-view">
    <article class="pg-article" aria-labelledby="pg-post-title">
      <header class="wrap-narrow pg-article-head">
        ${crumbs([{ label: 'Home', href: '#/' }, { label: 'Blog', href: '#/blog' }, { label: tidy(post.title) }], true)}
        <span class="eyebrow">Travel blog</span>
        <h1 class="pg-article-title" id="pg-post-title">${tidy(post.title)}</h1>
        <div class="pg-article-meta"><span>${icon('clock')} ${mins} min read</span><button type="button" class="text-btn" data-pg-share>${icon('copy')} Copy link</button></div>
      </header>
      <figure class="wrap pg-article-hero">${img(post.image, { alt: '', fallback: FALLBACK[post.slug] || 'kerala', lazy: false })}</figure>
      <div class="wrap-narrow pg-prose pg-article-body">${body}</div>
      <footer class="wrap-narrow pg-article-foot">
        <a class="text-btn" href="#/blog">${icon('arrow-left')} All articles</a>
        <button type="button" class="text-btn" data-pg-share>${icon('copy')} Copy link</button>
      </footer>
    </article>
    ${related.length ? html`<section class="section-sm bg-wash" aria-labelledby="pg-related-title">
      <div class="wrap"><h2 class="h3 pg-related-title" id="pg-related-title">More articles</h2><div class="pg-related">${related.map(p => postCard(p))}</div></div>
    </section>` : ''}
  </div>`);

  const root = el.firstElementChild;
  on(root, 'click', '[data-pg-share]', async () => {
    const ok = await copyText(location.href);
    toast(ok ? 'Link to this article copied.' : 'Could not copy the link.', { type: ok ? 'success' : 'error' });
  });
}
