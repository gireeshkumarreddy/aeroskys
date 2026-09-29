// Customer reviews: the live testimonials plus reviews added on this device.
import { html, icon, $, on } from '../core/dom.js';
import { store } from '../core/store.js';
import { TESTIMONIALS } from '../data/content.js';
import { openModal } from './overlay.js';
import { toast } from './toast.js';
import { initials, validateForm, V, field } from './common.js';

const all = () => [...(store.get('reviews') || []).map(r => ({ ...r, mine: true })), ...TESTIMONIALS];

export function reviewsHTML() {
  const list = all();
  const r = list[0];
  return html`<div class="reviews">
    <div class="reveal">
      <span class="eyebrow">Customer reviews</span>
      <h2 class="h2" style="margin-top:12px">What travellers<br><em>say about us.</em></h2>
      <div class="review-ctrl">
        <button type="button" class="icon-btn" style="border:1px solid var(--line)" data-rv="-1" aria-label="Previous review">${icon('arrow-left')}</button>
        <button type="button" class="icon-btn" style="border:1px solid var(--line)" data-rv="1" aria-label="Next review">${icon('arrow-right')}</button>
        <span class="pos" data-rv-pos>01 / ${String(list.length).padStart(2, '0')}</span>
      </div>
      <button type="button" class="btn btn-light" style="margin-top:20px" data-add-review>${icon('edit')} Add Review</button>
    </div>
    <figure class="review-quote reveal" style="--d:.1s" aria-live="polite">
      <span class="qmark" aria-hidden="true">“</span>
      <div><span class="stars" data-rv-stars role="img" aria-label="${r.rating} out of 5">${Array.from({ length: r.rating }, () => icon('star'))}</span></div>
      <blockquote data-rv-text>${r.text}</blockquote>
      <figcaption class="review-who"><span class="avatar" data-rv-av>${initials(r.name)}</span><span><b data-rv-name>${r.name}</b><small data-rv-role>${r.role}${r.mine ? ' · Your review' : ''}</small></span></figcaption>
    </figure>
  </div>`;
}

export function bindReviews(root) {
  let i = 0;
  const show = () => {
    const list = all();
    i = (i + list.length) % list.length;
    const r = list[i];
    $('[data-rv-text]', root).textContent = r.text;
    $('[data-rv-name]', root).textContent = r.name;
    $('[data-rv-role]', root).textContent = r.role + (r.mine ? ' · Your review' : '');
    $('[data-rv-av]', root).textContent = initials(r.name);
    $('[data-rv-stars]', root).innerHTML = String(html`${Array.from({ length: r.rating }, () => icon('star'))}`);
    $('[data-rv-stars]', root).setAttribute('aria-label', `${r.rating} out of 5`);
    $('[data-rv-pos]', root).textContent = `${String(i + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
  };
  on(root, 'click', '[data-rv]', (e, b) => { i += Number(b.dataset.rv); show(); });
  on(root, 'click', '[data-add-review]', () => openReviewForm(() => { i = 0; show(); }));
}

export function openReviewForm(done) {
  const user = store.get('user');
  let rating = 5;
  const m = openModal({
    title: 'Add a review',
    body: html`<form class="stack gap-16" novalidate data-review-form>
      <div class="field"><span class="field-label">Your rating</span><div class="chip-row" role="radiogroup" aria-label="Rating">${[5, 4, 3, 2, 1].map(n => html`<button type="button" class="chip" data-rate="${n}" aria-pressed="${n === 5}">${n} ${icon('star')}</button>`)}</div></div>
      <div class="form-grid">
        ${field({ name: 'name', label: 'Your name', value: user?.name || '', required: true, autocomplete: 'name' })}
        ${field({ name: 'role', label: 'You are a', options: [['Customer', 'Customer'], ['Agent', 'Travel agent']] })}
      </div>
      ${field({ name: 'text', label: 'Your review', type: 'textarea', required: true, placeholder: 'Tell other travellers about your booking experience' })}
      <p class="xs muted">Reviews are moderated before they appear publicly. In this prototype your review is shown on this device straight away.</p>
    </form>`,
    foot: html`<button type="button" class="btn btn-light" data-close>Cancel</button><button type="button" class="btn btn-primary" data-submit>Submit review</button>`
  });
  on(m.el, 'click', '[data-rate]', (e, b) => { rating = +b.dataset.rate; m.el.querySelectorAll('[data-rate]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
  m.el.querySelector('[data-submit]').addEventListener('click', () => {
    const form = m.el.querySelector('[data-review-form]');
    const { ok, values } = validateForm(form, { name: V.name, text: v => v.length < 15 ? 'Please write at least 15 characters' : '' });
    if (!ok) return;
    store.update(s => { s.reviews.unshift({ name: values.name, role: values.role, text: values.text, rating, at: Date.now() }); });
    toast('Thank you! Your review has been submitted for moderation.', { title: 'Review received' });
    m.close();
    done?.();
  });
}
