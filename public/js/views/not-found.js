import { html, mount } from '../core/dom.js';
import { emptyState } from '../ui/common.js';

export default function (el) {
  document.title = 'Page not found — AeroSkys';
  mount(el, html`<section class="page"><div class="wrap-narrow">${emptyState({ iconName: 'compass', title: 'We couldn’t find that page', text: 'The link may be out of date. Start a new search or head back home.', action: html`<a class="btn btn-primary" href="#/">Back to home</a>` })}</div></section>`);
}
