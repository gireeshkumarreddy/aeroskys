// Log in / Sign up with an email or mobile number and a one-time password,
// as on the live site. In the prototype the OTP is displayed on screen.
import { html, icon, $, $$ } from '../core/dom.js';
import { store } from '../core/store.js';
import { openModal } from './overlay.js';
import { toast } from './toast.js';

// What a traveller gets by logging in (shown beside the login form).
const LOGIN_BENEFITS = [
  { icon: 'ticket', title: 'All your trips in one place', text: 'See, download and manage every booking from My Trips.' },
  { icon: 'zap', title: 'Faster checkout', text: 'Your contact details are filled in for you next time you book.' },
  { icon: 'tag', title: 'Deals and coupon codes', text: 'Apply offers on flights, hotels, buses and holidays at checkout.' }
];

const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const isMobile = v => /^[6-9]\d{9}$/.test(v.replace(/\D/g, '').slice(-10)) && v.replace(/\D/g, '').length >= 10;

export const currentUser = () => store.get('user');

export function logout() {
  store.set({ user: null });
  toast('You have been logged out.', { type: 'info' });
}

/** Resolves with the user when logged in (immediately if already signed in). */
export function requireLogin(reason) {
  const u = currentUser();
  if (u) return Promise.resolve(u);
  return openLogin({ reason });
}

export function openLogin({ reason = '' } = {}) {
  return new Promise(resolve => {
    let otp = '', id = '', timer = 0, left = 0, resolved = false;
    const benefits = LOGIN_BENEFITS;
    const m = openModal({
      title: false, label: 'Log in or sign up', size: 'wide', className: 'auth-modal',
      body: html`<div class="auth">
        <aside class="auth-side">
          <span class="eyebrow on-dark">Unlock these benefits</span>
          <ul>${benefits.map(b => html`<li><span>${icon(b.icon)}</span><div><b>${b.title}</b><p>${b.text}</p></div></li>`)}</ul>
          <p class="auth-side-foot">${icon('shield')} Secure one-time password sign in</p>
        </aside>
        <div class="auth-main">
          <button class="icon-btn auth-close" data-close aria-label="Close">${icon('x')}</button>
          <div class="auth-step" data-step="id">
            <h2 class="h3">Log in / Sign up</h2>
            ${reason ? html`<p class="muted small">${reason}</p>` : ''}
            <form class="stack gap-16" data-form="id" novalidate>
              <div class="field"><label for="auth-id">Email or mobile number</label>
                <input id="auth-id" class="input" name="id" autocomplete="username" inputmode="email" placeholder="e.g. name@email.com or 9876543210" data-autofocus>
                <span class="field-error" role="alert"></span></div>
              <button class="btn btn-primary btn-block btn-lg" type="submit">Get OTP</button>
              <p class="xs muted">By continuing you agree to our <a class="link" href="#/terms" data-close>Terms &amp; conditions</a> and <a class="link" href="#/privacy" data-close>Privacy Policy</a>.</p>
            </form>
          </div>
          <div class="auth-step" data-step="otp" hidden>
            <button class="text-btn back-link" data-back>${icon('arrow-left')} Change</button>
            <h2 class="h3">Enter the 6-digit OTP</h2>
            <p class="muted small">Sent to <b data-id-label></b></p>
            <form class="stack gap-16" data-form="otp" novalidate>
              <div class="otp-boxes" role="group" aria-label="One-time password">${Array.from({ length: 6 }, (_, i) => html`<input class="otp-box" inputmode="numeric" maxlength="1" aria-label="Digit ${i + 1}" autocomplete="${i ? 'off' : 'one-time-code'}">`)}</div>
              <span class="field-error" data-otp-error role="alert"></span>
              <button class="btn btn-primary btn-block btn-lg" type="submit">Verify &amp; Login</button>
              <div class="spread small"><span class="muted" data-timer></span><button type="button" class="text-btn" data-resend disabled>Resend OTP</button></div>
              <div class="note note-amber">${icon('info')}<span>Prototype mode: no SMS or email is sent. Your OTP is shown in the notification.</span></div>
            </form>
          </div>
          <div class="auth-step" data-step="profile" hidden>
            <h2 class="h3">Welcome to AeroSkys</h2>
            <p class="muted small">Tell us your name to finish creating your account.</p>
            <form class="stack gap-16" data-form="profile" novalidate>
              <div class="field"><label for="auth-name">Full name</label><input id="auth-name" class="input" name="name" autocomplete="name" placeholder="As on your ID"><span class="field-error" role="alert"></span></div>
              <div class="field" data-other></div>
              <button class="btn btn-primary btn-block btn-lg" type="submit">Create account</button>
            </form>
          </div>
        </div>
      </div>`,
      onClose: () => { clearInterval(timer); if (!resolved) resolve(null); }
    });
    const el = m.el;
    const show = step => $$('.auth-step', el).forEach(s => { s.hidden = s.dataset.step !== step; });
    const boxes = $$('.otp-box', el);

    function sendOtp() {
      otp = String(Math.floor(100000 + Math.random() * 900000));
      toast(`Your AeroSkys OTP is ${otp}`, { type: 'info', title: 'Prototype OTP', ms: 12000 });
      left = 30; clearInterval(timer);
      const btn = $('[data-resend]', el), t = $('[data-timer]', el);
      btn.disabled = true; t.textContent = `Resend in ${left}s`;
      timer = setInterval(() => { left--; t.textContent = left > 0 ? `Resend in ${left}s` : ''; if (left <= 0) { clearInterval(timer); btn.disabled = false; } }, 1000);
    }

    $('[data-form="id"]', el).addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#auth-id', el).value.trim();
      const f = $('#auth-id', el).closest('.field');
      if (!isEmail(v) && !isMobile(v)) { f.classList.add('has-error'); f.querySelector('.field-error').textContent = 'Enter a valid email address or 10-digit mobile number'; return; }
      f.classList.remove('has-error'); f.querySelector('.field-error').textContent = '';
      id = isEmail(v) ? v.toLowerCase() : v.replace(/\D/g, '').slice(-10);
      $('[data-id-label]', el).textContent = isEmail(id) ? id : '+91 ' + id;
      show('otp'); sendOtp();
      boxes.forEach(b => (b.value = ''));
      setTimeout(() => boxes[0].focus(), 50);
    });
    $('[data-back]', el).addEventListener('click', () => { show('id'); $('#auth-id', el).focus(); });
    $('[data-resend]', el).addEventListener('click', sendOtp);
    boxes.forEach((b, i) => {
      b.addEventListener('input', () => {
        const digits = b.value.replace(/\D/g, '');
        if (digits.length > 1) { digits.slice(0, 6).split('').forEach((d, k) => { if (boxes[i + k]) boxes[i + k].value = d; }); boxes[Math.min(5, i + digits.length - 1)].focus(); return; }
        b.value = digits;
        if (digits && boxes[i + 1]) boxes[i + 1].focus();
      });
      b.addEventListener('keydown', e => { if (e.key === 'Backspace' && !b.value && boxes[i - 1]) boxes[i - 1].focus(); });
      b.addEventListener('paste', e => {
        const t = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
        if (t.length >= 6) { e.preventDefault(); t.slice(0, 6).split('').forEach((d, k) => (boxes[k].value = d)); boxes[5].focus(); }
      });
    });

    const finish = user => {
      resolved = true;
      store.set({ user });
      toast(`Signed in as ${user.name}.`, { title: 'Welcome' });
      m.close();
      resolve(user);
    };

    $('[data-form="otp"]', el).addEventListener('submit', e => {
      e.preventDefault();
      const code = boxes.map(b => b.value).join('');
      const err = $('[data-otp-error]', el);
      if (code.length < 6) { err.textContent = 'Enter all 6 digits'; return; }
      if (code !== otp) { err.textContent = 'That OTP is incorrect. Please check and try again.'; boxes.forEach(b => b.classList.add('has-error')); return; }
      err.textContent = '';
      const known = (store.get('knownUsers') || {})[id];
      if (known) return finish(known);
      show('profile');
      const other = $('[data-other]', el);
      other.innerHTML = isEmail(id)
        ? `<label for="auth-other">Mobile number <span class="muted">(optional)</span></label><input id="auth-other" class="input" name="phone" inputmode="numeric" placeholder="10-digit mobile number"><span class="field-error" role="alert"></span>`
        : `<label for="auth-other">Email <span class="muted">(optional)</span></label><input id="auth-other" class="input" name="email" type="email" placeholder="name@email.com"><span class="field-error" role="alert"></span>`;
      setTimeout(() => $('#auth-name', el).focus(), 50);
    });

    $('[data-form="profile"]', el).addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#auth-name', el).value.trim();
      const f = $('#auth-name', el).closest('.field');
      if (!/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(name)) { f.classList.add('has-error'); f.querySelector('.field-error').textContent = 'Please enter your name (letters only)'; return; }
      const other = $('#auth-other', el)?.value.trim() || '';
      const user = { id: 'U' + Date.now().toString(36).toUpperCase(), name, email: isEmail(id) ? id : (isEmail(other) ? other.toLowerCase() : ''), phone: isEmail(id) ? other.replace(/\D/g, '').slice(-10) : id, since: Date.now() };
      store.update(s => { s.knownUsers = { ...(s.knownUsers || {}), [id]: user }; });
      finish(user);
    });
  });
}
