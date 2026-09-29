// Lightweight toasts announced to assistive technology.
import { html, icon } from '../core/dom.js';

export function toast(message, { type = 'success', title = '', ms = 4200 } = {}) {
  const rootEl = document.getElementById('toast-root');
  if (!rootEl) return;
  const el = document.createElement('div');
  el.className = `toast is-${type}`;
  el.innerHTML = String(html`${icon(type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check-circle')}<div>${title ? html`<b>${title}</b><br>` : ''}${message}</div><button class="toast-close" aria-label="Dismiss">${icon('x')}</button>`);
  rootEl.appendChild(el);
  while (rootEl.children.length > 3) rootEl.firstElementChild.remove();
  const remove = () => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 250); };
  el.querySelector('.toast-close').addEventListener('click', remove);
  setTimeout(remove, ms);
}
