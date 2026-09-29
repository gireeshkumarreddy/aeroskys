// Careers application: role choice, multi-step form, validation, save-and-continue on this device,
// history-aware Back, CV upload and submission to the careers endpoint.
//
// Integration point: POST api/careers/applications (served by server.mjs, which stores applications
// under data/careers/). Replace that endpoint with the HR system / ATS when one is connected. The UI only
// reports success when the endpoint confirms it with a reference.
import { ROLES, ROLE_ORDER, questionCount, NOTICE_OPTIONS, CV_TYPES, CV_EXT, CV_MAX, nationalDigits } from './roles.js';
import { $, $$, esc, icon, debounce, scrollToEl, toast, reducedMotion } from './ui.js';

const KEY = 'aeroskys:careers:application:v1';
const SUBMITTED_KEY = 'aeroskys:careers:submitted:v1';
const ENDPOINT = 'api/careers/applications';
const EMAIL = 'customercare@aeroskys.com';
const COUNTRY_CODES = [['+91', 'India'], ['+971', 'UAE'], ['+44', 'UK'], ['+1', 'US / Canada'], ['+65', 'Singapore'], ['+61', 'Australia']];

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const pad = n => String(n).padStart(2, '0');
const fresh = () => ({
  v: 1, clientId: uid(), role: 'tag', step: 0, reached: { tag: 0, tasa: 0, hr: 0 },
  about: { name: '', email: '', cc: '+91', phone: '', location: '', cvLink: '', notice: '' },
  answers: { tag: {}, tasa: {}, hr: {} }, confirm: false, cvName: '', updatedAt: 0
});

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!s || s.v !== 1 || !ROLES[s.role]) return null;
    return { ...fresh(), ...s, about: { ...fresh().about, ...s.about }, answers: { tag: {}, tasa: {}, hr: {}, ...s.answers }, reached: { tag: 0, tasa: 0, hr: 0, ...s.reached } };
  } catch { return null; }
}
function persist(st) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...st, confirm: false })); return true; } catch { return false; }
}
const readSubmitted = () => { try { return JSON.parse(localStorage.getItem(SUBMITTED_KEY) || 'null'); } catch { return null; } };

const steps = role => [{ id: 'about', nav: 'About You', title: 'About You' }, ...ROLES[role].sections];

// ---------------------------------------------------------------- validation
const RX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RX_NAME = /^[\p{L}][\p{L} .'-]{1,79}$/u;
function validateAbout(a) {
  const e = {};
  const name = a.name.trim();
  if (!name) e.name = 'Enter your full name';
  else if (!RX_NAME.test(name)) e.name = 'Use letters only (spaces, dots, hyphens and apostrophes are fine)';
  if (!a.email.trim()) e.email = 'Enter your email address';
  else if (!RX_EMAIL.test(a.email.trim())) e.email = 'Enter a valid email address, like name@example.com';
  const digits = nationalDigits(a.cc, a.phone);
  if (!digits) e.phone = 'Enter your phone number';
  else if (a.cc === '+91' && !/^[6-9]\d{9}$/.test(digits)) e.phone = 'Enter a 10-digit Indian mobile number';
  else if (a.cc !== '+91' && (digits.length < 6 || digits.length > 15)) e.phone = 'Enter a valid phone number';
  if (a.location.trim().length < 2) e.location = 'Enter the city you live in';
  if (a.cvLink.trim()) {
    try { const u = new URL(a.cvLink.trim()); if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) throw 0; }
    catch { e.cvLink = 'Enter a full link starting with https://'; }
  }
  if (!a.notice) e.notice = 'Choose your notice period';
  return e;
}
function validateQuestion(q, v) {
  const val = typeof v === 'string' ? v.trim() : v;
  if (q.type === 'choice') return q.required && !val ? 'Choose an option' : '';
  if (!val) return q.required ? 'This question is required' : '';
  if (q.type === 'textarea' && q.required && val.length < 20) return 'Please add a little more detail (at least 20 characters)';
  if (val.length > q.max) return `Keep your answer under ${q.max} characters`;
  return '';
}
function validateStep(st, i, file) {
  const s = steps(st.role)[i];
  if (s.id === 'about') return validateAbout(st.about);
  const e = {};
  for (const q of s.questions) { const m = validateQuestion(q, st.answers[st.role][q.id]); if (m) e[q.id] = m; }
  if (s.final) {
    if (!st.about.cvLink.trim() && !file) e.cv = 'Add your CV: upload it here, or add a link in About You';
    if (!st.confirm) e.confirm = 'Please confirm that your information is accurate';
  }
  return e;
}
const touched = (st, i) => {
  const s = steps(st.role)[i];
  if (s.id === 'about') return Object.entries(st.about).some(([k, v]) => k !== 'cc' && String(v).trim());
  return s.questions.some(q => String(st.answers[st.role][q.id] ?? '').trim());
};

// ---------------------------------------------------------------- component
export function initApply(host, rolepick) {
  let st = load() || fresh();
  let file = null;              // the chosen CV (kept in memory only)
  let submitting = false;
  let result = null;            // { ok, reference } after a confirmed submission
  let failure = null;           // last recoverable submission error
  let confirmReset = false;
  const submittedBefore = readSubmitted();
  const hadDraft = st.updatedAt > 0;
  st.step = Math.min(st.step, steps(st.role).length - 1);

  // Only real changes are saved, so a visitor who just reads the form never gets a "saved" draft.
  let dirty = false;
  const saveLater = debounce(() => { if (!dirty) return; dirty = false; st.updatedAt = Date.now(); persist(st); }, 700);
  const save = () => { dirty = true; saveLater(); };
  // History entries describe this application only (role + step), never state left over from an earlier one.
  const entry = (step = st.step, from = null) => ({ crApply: true, role: st.role, step, from });
  save.flush = () => saveLater.flush();

  // -------------------------------------------------------------- role picker
  function renderRolePick() {
    rolepick.innerHTML = `<legend class="sr-only">Role you are applying for</legend>` + ROLE_ORDER.map(id => `
      <label class="cr-role-card">
        <input type="radio" name="cr-role" value="${id}" ${st.role === id ? 'checked' : ''}>
        <span><b>${esc(ROLES[id].title)}</b><small>${questionCount(id)} questions</small></span>
        <span class="cr-radio" aria-hidden="true"></span>
      </label>`).join('');
  }
  rolepick.addEventListener('change', e => { if (e.target.name === 'cr-role') setRole(e.target.value); });

  function setRole(role, { fromLink = false } = {}) {
    if (!ROLES[role] || result || role === st.role) return;
    st.role = role;
    const aboutDone = !Object.keys(validateAbout(st.about)).length;
    st.step = aboutDone && touched(st, 0) ? Math.min(1, st.reached[role] || 1) : 0;
    st.reached[role] = Math.max(st.reached[role] || 0, st.step);
    failure = null;
    save();
    // A link brings its own history entry (#apply): once the browser has added it, note the role on it. A switch
    // made inside the form gets its own entry. Either way the browser's Back undoes the switch.
    if (fromLink) setTimeout(() => { if (st.role === role && !result) history.replaceState(entry(), '', location.href); });
    else history.pushState(entry(), '', '#apply');
    renderRolePick();
    render({ enter: true });
    if (!fromLink) toast(`Switched to ${ROLES[role].title}. Answers for each role are kept separately.`, { iconName: 'info' });
  }

  // -------------------------------------------------------------- shell
  function render({ enter = false, back = false, focus = false } = {}) {
    if (result) { renderResult(); return; }
    const list = steps(st.role);
    const cur = st.step;
    host.innerHTML = `
      ${bannerHTML()}
      <ol class="cr-stepper" aria-label="Application steps">${list.map((s, i) => stepperItem(s, i, cur)).join('')}</ol>
      <div class="cr-apply-grid">
        <form class="cr-step ${enter ? 'is-entering' : ''} ${back ? 'from-back' : ''}" novalidate data-form tabindex="-1" aria-labelledby="step-title">
          ${list[cur].id === 'about' ? aboutHTML() : sectionHTML(list[cur], cur)}
          ${footHTML(cur, list.length)}
        </form>
        <aside class="cr-side" aria-label="Application help">${sideHTML(list[cur], cur)}</aside>
      </div>`;
    bindStep();
    if (focus) {
      const f = $('[data-form]', host);
      f.focus({ preventScroll: true });
      scrollToEl($('.cr-stepper', host), 10);
    }
  }

  function bannerHTML() {
    if (confirmReset) return `<div class="cr-banner" role="alert">${icon('alert')}<span>Clear all your saved answers and start again?</span>
      <span class="cr-cta-row"><button type="button" class="cr-btn cr-btn-dark" data-reset-yes>Yes, start again</button><button type="button" class="cr-btn cr-btn-outline" data-reset-no>Keep my answers</button></span></div>`;
    if (hadDraft && st.updatedAt) {
      const when = new Date(st.updatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
      return `<div class="cr-banner">${icon('bookmark')}<span>Your application for <b>${esc(ROLES[st.role].title)}</b> is saved on this device (last saved ${esc(when)}).</span>
        <span class="cr-cta-row"><button type="button" class="cr-btn cr-btn-outline" data-reset>Start again</button></span></div>`;
    }
    if (submittedBefore) return `<div class="cr-banner is-success">${icon('check-circle')}<span>You applied for <b>${esc(ROLES[submittedBefore.role]?.title || 'a role')}</b> on ${esc(new Date(submittedBefore.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }))} (reference ${esc(submittedBefore.reference)}).</span></div>`;
    return '';
  }

  function stepperItem(s, i, cur) {
    const done = i !== cur && touched(st, i) && !Object.keys(validateStep(st, i, file)).length;
    const cls = i === cur ? 'is-current' : done ? 'is-done' : '';
    const can = i <= Math.max(st.reached[st.role], cur);
    return `<li class="${cls}"><button type="button" class="cr-step-btn" data-goto="${i}" ${can ? '' : 'disabled'} ${i === cur ? 'aria-current="step"' : ''}>
      <span class="cr-step-dot">${done ? icon('check') : i + 1}</span><span>${esc(s.nav)}</span>
      ${done ? '<span class="sr-only">(completed)</span>' : ''}</button></li>`;
  }

  // -------------------------------------------------------------- step bodies
  function field({ key, label, type = 'text', ic, placeholder = '', required = true, cls = '', auto = '', hint = '', options }) {
    const v = st.about[key] ?? '';
    const control = options
      ? `<select class="cr-select" id="f-${key}" name="${key}" ${required ? 'required' : ''} aria-describedby="${hint ? `h-${key} ` : ''}e-${key}">
          <option value="">${esc(placeholder || 'Select')}</option>${options.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
      : `<input class="cr-input" id="f-${key}" name="${key}" type="${type}" value="${esc(v)}" placeholder="${esc(placeholder)}" ${auto ? `autocomplete="${auto}"` : ''} ${required ? 'required' : ''} aria-describedby="${hint ? `h-${key} ` : ''}e-${key}" ${type === 'tel' ? 'inputmode="tel"' : ''}>`;
    return `<div class="cr-field ${cls}" data-field="${key}">
      <label for="f-${key}">${esc(label)}${required ? '<span class="cr-req" aria-hidden="true">*</span>' : ' <span class="cr-hint">(optional)</span>'}</label>
      <div class="cr-control">${icon(ic)}${control}</div>
      ${hint ? `<p class="cr-hint" id="h-${key}">${esc(hint)}</p>` : ''}
      <p class="cr-error" id="e-${key}" hidden></p>
    </div>`;
  }

  function aboutHTML() {
    const a = st.about;
    return `<div class="cr-panel">
      <h3 class="cr-panel-title" id="step-title">About You</h3>
      <p class="cr-panel-sub">Let’s start with a few basic details. Fields marked <span class="cr-req">*</span> are required.</p>
      <div class="cr-fields">
        ${field({ key: 'name', label: 'Full name', ic: 'user', placeholder: 'As it appears on your CV', auto: 'name' })}
        ${field({ key: 'email', label: 'Email', type: 'email', ic: 'mail', placeholder: 'you@example.com', auto: 'email' })}
        <div class="cr-field" data-field="phone">
          <label for="f-phone">Phone<span class="cr-req" aria-hidden="true">*</span></label>
          <div class="cr-phone">
            <div class="cr-control">${icon('phone')}<select class="cr-select" id="f-cc" name="cc" aria-label="Country code">${COUNTRY_CODES.map(([c, n]) => `<option value="${c}" ${a.cc === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            <input class="cr-input" id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(a.phone)}" placeholder="Mobile" required aria-describedby="e-phone">
          </div>
          <p class="cr-error" id="e-phone" hidden></p>
        </div>
        ${field({ key: 'location', label: 'Current location', ic: 'pin', placeholder: 'City', auto: 'address-level2', cls: 'is-half' })}
        ${field({ key: 'cvLink', label: 'Link to CV / resume', type: 'url', ic: 'file', placeholder: 'Drive, Dropbox or LinkedIn URL', required: false, cls: 'is-half', hint: 'Or upload your CV in the final step.' })}
        ${field({ key: 'notice', label: 'Notice period', ic: 'calendar', placeholder: 'Select your notice period', options: NOTICE_OPTIONS, cls: 'is-half' })}
        <div class="cr-field is-half" data-field="role">
          <label for="f-role">Role you are applying for<span class="cr-req" aria-hidden="true">*</span></label>
          <div class="cr-control">${icon('briefcase')}<select class="cr-select" id="f-role" name="role">${ROLE_ORDER.map(id => `<option value="${id}" ${st.role === id ? 'selected' : ''}>${esc(ROLES[id].title)}</option>`).join('')}</select></div>
        </div>
      </div>
    </div>`;
  }

  function numberOf(q) {
    let n = 0;
    for (const s of ROLES[st.role].sections) for (const x of s.questions) { n++; if (x === q) return n; }
    return n;
  }

  function questionHTML(q) {
    const v = st.answers[st.role][q.id] ?? '';
    const n = numberOf(q);
    const described = `${q.hint ? `h-${q.id} ` : ''}e-${q.id}`;
    let control;
    if (q.type === 'choice') {
      control = `<div class="cr-choice" role="radiogroup" aria-labelledby="l-${q.id}" aria-describedby="${described}">${q.options.map(o => `<label><input type="radio" name="${q.id}" value="${esc(o)}" ${v === o ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`;
    } else if (q.type === 'text') {
      control = `<div class="cr-control">${icon('edit')}<input class="cr-input" id="f-${q.id}" name="${q.id}" type="text" maxlength="${q.max}" value="${esc(v)}" placeholder="${esc(q.placeholder || '')}" aria-describedby="${described}" ${q.required ? 'required' : ''}></div>`;
    } else {
      control = `<div class="cr-textarea-wrap">${icon('edit')}<textarea class="cr-textarea" id="f-${q.id}" name="${q.id}" maxlength="${q.max}" rows="4" placeholder="${esc(q.placeholder || '')}" aria-describedby="${described} c-${q.id}" ${q.required ? 'required' : ''}>${esc(v)}</textarea>
        <span class="cr-count" id="c-${q.id}" aria-live="off">${v.length} / ${q.max}</span></div>`;
    }
    return `<div class="cr-q" data-q="${q.id}">
      <span class="cr-q-n" aria-hidden="true">${pad(n)}</span>
      <div class="cr-q-body">
        ${q.type === 'choice' ? `<p class="cr-q-label" id="l-${q.id}">` : `<label class="cr-q-label" id="l-${q.id}" for="f-${q.id}">`}<span class="sr-only">Question ${n}: </span>${esc(q.label)}<span class="cr-q-pill ${q.required ? '' : 'is-optional'}">${q.required ? 'Required' : 'Optional'}</span>${q.type === 'choice' ? '</p>' : '</label>'}
        ${q.hint ? `<p class="cr-q-hint" id="h-${q.id}">${esc(q.hint)}</p>` : ''}
        ${control}
        <p class="cr-error" id="e-${q.id}" hidden></p>
      </div>
    </div>`;
  }

  function sectionHTML(s, i) {
    const total = ROLES[st.role].sections.length;
    const idx = ROLES[st.role].sections.indexOf(s) + 1;
    const art = s.final
      ? `<div class="cr-step-art" aria-hidden="true"><img class="cr-script" src="careers/img/script-different-people.webp?v=4" width="134" height="140" alt=""><img class="cr-window" src="careers/img/app-window.webp?v=4" width="190" height="260" alt=""></div>`
      : s.id === 'why' ? `<p class="cr-ppp-rail" aria-hidden="true">People<br>Planes<br>Possibilities</p>` : '';
    return `<div class="cr-step-head">
        <div>
          <p class="cr-step-kicker">Section ${idx} of ${total}</p>
          <h3 class="cr-step-title" id="step-title">${s.title}</h3>
          <p class="cr-step-intro">${esc(s.intro)}</p>
        </div>${art}
      </div>
      <div class="cr-qlist">${s.questions.map(questionHTML).join('')}</div>
      ${s.final ? submitHTML() : ''}`;
  }

  function reviewHTML() {
    const list = steps(st.role);
    const a = st.about;
    const row = (label, value, missing) => `<dt>${esc(label)}</dt><dd class="${missing ? 'is-missing' : ''}">${value ? esc(value) : missing ? 'Missing — required' : '—'}</dd>`;
    return `<details class="cr-review">
      <summary>${icon('clipboard')} Review your answers before submitting ${icon('chevron-down')}</summary>
      <div class="cr-review-body">
        <div class="cr-review-sec"><div class="cr-review-sec-h"><span>About You</span><button type="button" data-goto="0">Edit</button></div>
          <dl>${row('Full name', a.name, !a.name.trim())}${row('Email', a.email, !a.email.trim())}${row('Phone', a.phone ? `${a.cc} ${a.phone}` : '', !a.phone.trim())}${row('Current location', a.location, !a.location.trim())}${row('CV', a.cvLink || (file ? file.name : ''), false)}${row('Notice period', a.notice, !a.notice)}${row('Role', ROLES[st.role].title, false)}</dl></div>
        ${list.slice(1).map((s, k) => `<div class="cr-review-sec"><div class="cr-review-sec-h"><span>${esc(s.nav)}</span><button type="button" data-goto="${k + 1}">Edit</button></div>
          <dl>${s.questions.map(q => row(q.label, st.answers[st.role][q.id] || '', q.required && !String(st.answers[st.role][q.id] || '').trim())).join('')}</dl></div>`).join('')}
      </div>
    </details>`;
  }

  function submitHTML() {
    const subject = `AeroSkys Career Application – ${ROLES[st.role].short} – ${st.about.name.trim() || 'Your Name'}`;
    const earlier = !file && st.cvName ? `<p class="cr-hint">You attached <b>${esc(st.cvName)}</b> earlier. Files aren’t kept after you leave the page, so please attach it again.</p>` : '';
    return `<div class="cr-panel" style="margin-top:16px">
      <div class="cr-submit-box">
        <span class="cr-mail-ic">${icon('mail')}</span>
        <div>
          <h3>Submit your application</h3>
          <p>You can also email your answers and CV to <a class="cr-link" href="mailto:${EMAIL}?subject=${encodeURIComponent(subject)}">${EMAIL}</a> with the subject “${esc(subject)}”.</p>
        </div>
        <div class="cr-drop" data-drop>
          <input type="file" id="f-cv" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-label="Upload your CV or résumé" aria-describedby="cv-help e-cv">
          <span class="cr-drop-ic">${icon('upload')}</span>
          <span><b>Upload your CV / Resume ${st.about.cvLink.trim() ? '(optional)' : ''}</b><small id="cv-help">PDF, DOC or DOCX (max 10 MB). ${st.about.cvLink.trim() ? 'You added a CV link in About You.' : 'Or add a CV link in About You.'}</small></span>
        </div>
        ${file ? `<div class="cr-file">${icon('file')}<span><b>${esc(file.name)}</b> · ${(file.size / 1048576).toFixed(file.size < 1048576 ? 2 : 1)} MB · ready to send</span><button type="button" class="cr-icon-btn" data-cv-remove aria-label="Remove ${esc(file.name)}">${icon('x')}</button></div>` : ''}
        ${earlier}
        <p class="cr-error" id="e-cv" hidden style="grid-column:1/-1"></p>
      </div>
      <div style="display:grid;gap:14px;margin-top:18px">
        ${reviewHTML()}
        <label class="cr-confirm"><input type="checkbox" id="f-confirm" ${st.confirm ? 'checked' : ''} aria-describedby="e-confirm"> <span>I confirm that the information provided is true and accurate to the best of my knowledge.</span></label>
        <p class="cr-error" id="e-confirm" hidden></p>
        <p class="cr-privacy">We use your details only to assess your application and to contact you about it. Read our <a href="./#/privacy" target="_blank" rel="noopener">privacy policy</a>.</p>
      </div>
    </div>`;
  }

  function footHTML(cur, total) {
    const last = cur === total - 1;
    const alert = failure ? failureHTML() : '';
    return `${alert}<div class="cr-form-alert" data-form-alert hidden role="alert"></div>
      <div class="cr-step-foot">
        ${cur > 0 ? `<button type="button" class="cr-btn cr-btn-outline cr-back-btn" data-back>${icon('arrow-left')} Back</button>` : ''}
        <button type="button" class="cr-save-btn" data-save>${last ? 'Save and finish later' : 'Save and Continue Later'} ${icon('bookmark')}</button>
        ${last
          ? `<button type="submit" class="cr-btn cr-btn-primary cr-btn-next" data-submit ${submitting ? 'disabled aria-busy="true"' : ''}>${submitting ? `${icon('loader', 'cr-spin')} Submitting…` : `Submit application ${icon('arrow-right')}`}</button>`
          : `<button type="submit" class="cr-btn cr-btn-primary cr-btn-next">${cur === 0 ? 'Next Step' : 'Save &amp; Continue'} ${icon('arrow-right')}</button>`}
        <div class="cr-step-progress" aria-hidden="true"><span>${pad(cur + 1)} <small>/ ${pad(total)}</small></span><i><b style="width:${((cur + 1) / total) * 100}%"></b></i></div>
      </div>`;
  }

  function failureHTML() {
    return `<div class="cr-form-alert" role="alert">${icon('alert')}<div>
      <b>${esc(failure.title)}</b><br>${esc(failure.detail)} Your answers are saved on this device, so nothing is lost.
      <div class="cr-cta-row" style="margin-top:10px">
        <button type="button" class="cr-btn cr-btn-dark" data-retry style="min-height:40px">Try again</button>
        <button type="button" class="cr-btn cr-btn-outline" data-download style="min-height:40px">${icon('download')} Download my answers</button>
        <a class="cr-btn cr-btn-outline" style="min-height:40px" href="mailto:${EMAIL}?subject=${encodeURIComponent(`AeroSkys Career Application – ${ROLES[st.role].short} – ${st.about.name.trim()}`)}">${icon('mail')} Email us instead</a>
      </div></div></div>`;
  }

  function sideHTML(s, cur) {
    const list = steps(st.role);
    const doneCount = list.filter((x, i) => touched(st, i) && !Object.keys(validateStep(st, i, file)).length).length;
    const pct = Math.round((doneCount / list.length) * 100);
    const progress = `<div class="cr-side-card">
      <h3>Application Progress</h3><p>${doneCount} of ${list.length} completed</p>
      <div class="cr-prog"><i><b style="width:${pct}%"></b></i><span>${pct}%</span></div>
      <ol class="cr-prog-list">${list.map((x, i) => {
        const done = touched(st, i) && !Object.keys(validateStep(st, i, file)).length;
        const status = i === cur ? 'In progress' : done ? 'Completed' : touched(st, i) ? 'Started' : 'Not started';
        return `<li class="${i === cur ? 'is-current' : done ? 'is-done' : ''}"><span class="cr-step-dot">${done && i !== cur ? icon('check') : i + 1}</span><span>${esc(x.nav)}</span><small>${status}</small></li>`;
      }).join('')}</ol></div>`;
    const tipText = s.id === 'about' ? 'Use the name on your CV and an email and number you check often — that is how we will contact you.' : s.tip;
    const tip = `<div class="cr-side-card cr-tip"><div class="cr-tip-head"><span class="cr-tip-ic">${icon('bulb')}</span><h3>${esc(s.tipTitle || 'Quick Tip')}</h3></div><p>${esc(tipText)}</p></div>`;
    const help = `<div class="cr-side-card cr-help"><span class="cr-help-ic">${icon('headset')}</span><div><h3>Need Help?</h3><p>If you have any questions, feel free to reach out to our team.</p><a class="cr-link" href="./#/support" target="_blank" rel="noopener">Contact Us ${icon('arrow-right')}</a></div></div>`;
    if (s.final) {
      return `${progress}${tip}
        <figure class="cr-side-card cr-quote"><span class="cr-quote-mark" aria-hidden="true">“</span><blockquote>“Great people build great journeys.”</blockquote><figcaption>AeroSkys<small>Team</small></figcaption></figure>
        <div class="cr-side-img"><img src="careers/img/app-final-wing.webp?v=4" width="218" height="154" alt="" loading="lazy"></div>
        <ul class="cr-values">
          <li><span class="cr-help-ic">${icon('users')}</span><span><b>People</b><small>We back ambitious talent</small></span></li>
          <li><span class="cr-help-ic">${icon('bars')}</span><span><b>Opportunities</b><small>Real impact, real growth</small></span></li>
          <li><span class="cr-help-ic">${icon('globe')}</span><span><b>Global Reach</b><small>Be part of what’s next</small></span></li>
        </ul>`;
    }
    if (s.id === 'growth') return `${progress}${tip}<div class="cr-side-img"><img src="careers/img/app-growth-wing.webp?v=4" width="224" height="220" alt="" loading="lazy"></div>`;
    return `${progress}${tip}${help}`;
  }

  // -------------------------------------------------------------- behaviour
  function showErrors(errs, { focusFirst = true } = {}) {
    const form = $('[data-form]', host);
    $$('.has-error', form).forEach(el => el.classList.remove('has-error'));
    $$('.cr-error', form).forEach(el => { el.hidden = true; el.textContent = ''; });
    $$('[aria-invalid]', form).forEach(el => el.removeAttribute('aria-invalid'));
    const keys = Object.keys(errs);
    for (const k of keys) {
      const msg = $(`#e-${k}`, form);
      if (msg) { msg.hidden = false; msg.innerHTML = `${icon('alert')}<span>${esc(errs[k])}</span>`; }
      const wrap = $(`[data-field="${k}"], [data-q="${k}"]`, form);
      wrap?.classList.add('has-error');
      const input = $(`#f-${k}`, form) || $(`[name="${k}"]`, form);
      input?.setAttribute('aria-invalid', 'true');
    }
    const alert = $('[data-form-alert]', form);
    if (keys.length) {
      alert.hidden = false;
      alert.innerHTML = `${icon('alert')}<span>${keys.length === 1 ? 'Please check the highlighted field.' : `Please check the ${keys.length} highlighted fields.`}</span>`;
      if (focusFirst) {
        const k = keys[0];
        const target = $(`#f-${k}`, form) || $(`[name="${k}"]`, form);
        if (target) { scrollToEl(target.closest('.cr-q, .cr-field, .cr-submit-box, .cr-confirm') || target, 20); setTimeout(() => target.focus({ preventScroll: true }), reducedMotion() ? 0 : 350); }
      }
    } else alert.hidden = true;
  }

  function clearFieldError(key) {
    const form = $('[data-form]', host);
    const wrap = $(`[data-field="${key}"], [data-q="${key}"]`, form);
    if (!wrap?.classList.contains('has-error') && key !== 'confirm' && key !== 'cv') return;
    const errs = validateStep(st, st.step, file);
    if (errs[key]) return;
    wrap?.classList.remove('has-error');
    const msg = $(`#e-${key}`, form); if (msg) { msg.hidden = true; msg.textContent = ''; }
    ($(`#f-${key}`, form) || $(`[name="${key}"]`, form))?.removeAttribute('aria-invalid');
    if (!Object.keys(errs).length) $('[data-form-alert]', form).hidden = true;
  }

  function go(i, { push = true, back = false } = {}) {
    const list = steps(st.role);
    i = Math.max(0, Math.min(i, list.length - 1));
    const from = st.step;
    st.step = i;
    st.reached[st.role] = Math.max(st.reached[st.role], i);
    failure = null;
    save(); save.flush();
    if (push) {
      // Stamp the entry being left (e.g. one added by an #apply link) so Back can return to this step.
      if (!history.state?.crApply || history.state.done) history.replaceState(entry(from), '', location.href);
      history.pushState(entry(i, from), '', '#apply');
    }
    render({ enter: true, back: back || i < from, focus: true });
  }

  function bindStep() {
    const form = $('[data-form]', host);
    form.addEventListener('input', e => {
      const t = e.target;
      if (!t.name) return;
      if (t.name in st.about && t.name !== 'role') st.about[t.name] = t.value;
      else if (t.name === 'role') return;
      else if (t.type !== 'radio' && t.type !== 'file' && t.id !== 'f-confirm') {
        st.answers[st.role][t.name] = t.value;
        const c = $(`#c-${t.name}`, form);
        if (c) { c.textContent = `${t.value.length} / ${t.maxLength}`; c.classList.toggle('is-near', t.value.length > t.maxLength * 0.9); }
      }
      save();
      clearFieldError(t.name);
    });
    form.addEventListener('change', e => {
      const t = e.target;
      if (t.name === 'role') { setRole(t.value); return; }
      if (t.type === 'radio' && t.name !== 'cr-role') { st.answers[st.role][t.name] = t.value; save(); clearFieldError(t.name); }
      if (t.id === 'f-confirm') { st.confirm = t.checked; clearFieldError('confirm'); }
      if (t.id === 'f-cv') pickFile(t.files?.[0]);
      if (t.name === 'cc') { st.about.cc = t.value; save(); }
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      // Re-render after the submit event has finished (replacing the form inside it makes the browser log a
      // warning). A second click on the same step is ignored; submit() has its own guard.
      const at = st.step;
      setTimeout(() => {
        if (st.step !== at || !form.isConnected) return;
        const list = steps(st.role);
        if (st.step < list.length - 1) {
          const errs = validateStep(st, st.step, file);
          if (Object.keys(errs).length) { showErrors(errs); return; }
          go(st.step + 1);
        } else submit();
      });
    });
    form.addEventListener('focusout', e => {
      // Validate a field when the user leaves it (only once it has content, to avoid nagging).
      const t = e.target;
      if (!t.name || !String(t.value || '').trim() || t.type === 'radio') return;
      const errs = validateStep(st, st.step, file);
      if (errs[t.name]) {
        const msg = $(`#e-${t.name}`, form);
        const wrap = $(`[data-field="${t.name}"], [data-q="${t.name}"]`, form);
        if (msg && wrap && !/required/i.test(errs[t.name])) { msg.hidden = false; msg.innerHTML = `${icon('alert')}<span>${esc(errs[t.name])}</span>`; wrap.classList.add('has-error'); t.setAttribute('aria-invalid', 'true'); }
      }
    });
    host.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => go(Number(b.dataset.goto))));
    $('[data-back]', host)?.addEventListener('click', () => {
      // Step back through history when the previous entry is the previous step; otherwise move directly.
      if (history.state?.crApply && history.state.from === st.step - 1 && history.state.step === st.step) history.back();
      else go(st.step - 1, { back: true });
    });
    $('[data-save]', host)?.addEventListener('click', () => {
      st.updatedAt = Date.now();
      const ok = persist(st);
      const time = new Date(st.updatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
      toast(ok ? `Saved on this device at ${time}. Come back to this page in this browser to continue.` : 'Your browser blocked saving. Please keep this page open until you submit.', { iconName: ok ? 'bookmark' : 'alert', timeout: 5200 });
    });
    $('[data-cv-remove]', host)?.addEventListener('click', () => { file = null; st.cvName = ''; save(); render(); });
    const drop = $('[data-drop]', host);
    if (drop) {
      ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('is-over')));
      drop.addEventListener('drop', e => { e.preventDefault(); pickFile(e.dataTransfer?.files?.[0]); });
    }
    $('[data-retry]', host)?.addEventListener('click', submit);
    $('[data-download]', host)?.addEventListener('click', downloadCopy);
    $('[data-reset]', host)?.addEventListener('click', () => { confirmReset = true; render(); });
    $('[data-reset-no]', host)?.addEventListener('click', () => { confirmReset = false; render(); });
    $('[data-reset-yes]', host)?.addEventListener('click', () => {
      try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
      st = fresh(); file = null; confirmReset = false; failure = null;
      history.replaceState(entry(), '', location.href);
      renderRolePick(); render({ enter: true, focus: true });
      toast('Your saved answers were cleared.', { iconName: 'info' });
    });
  }

  function pickFile(f) {
    if (!f) return;
    const okType = CV_TYPES[f.type] || CV_EXT.test(f.name);
    let err = '';
    if (!okType) err = 'Upload a PDF, DOC or DOCX file';
    else if (f.size > CV_MAX) err = 'That file is larger than 10 MB. Please upload a smaller PDF, DOC or DOCX';
    else if (f.size === 0) err = 'That file is empty';
    if (err) {
      showErrors({ cv: err }, { focusFirst: false });
      const input = $('#f-cv', host); if (input) input.value = '';
      return;
    }
    file = f; st.cvName = f.name; save();
    render();
    toast(`${f.name} attached. It is sent only when you submit.`, { iconName: 'file' });
  }

  // -------------------------------------------------------------- submission
  const toBase64 = f => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1] || '');
    r.onerror = () => rej(new Error('Could not read the CV file'));
    r.readAsDataURL(f);
  });

  async function submit() {
    if (submitting) return;
    const list = steps(st.role);
    for (let i = 0; i < list.length; i++) {
      const errs = validateStep(st, i, file);
      if (Object.keys(errs).length) {
        if (i !== st.step) { go(i); setTimeout(() => showErrors(errs), reducedMotion() ? 0 : 60); }
        else showErrors(errs);
        return;
      }
    }
    submitting = true; failure = null; render();
    const form = $('[data-form]', host);
    $$('input, textarea, select, button:not([data-submit])', form).forEach(el => { el.disabled = true; });
    try {
      const payload = {
        clientId: st.clientId, role: st.role, roleTitle: ROLES[st.role].title,
        about: { ...st.about, name: st.about.name.trim(), email: st.about.email.trim().toLowerCase(), phone: nationalDigits(st.about.cc, st.about.phone) },
        answers: Object.fromEntries(ROLES[st.role].sections.flatMap(s => s.questions.map(q => [q.id, String(st.answers[st.role][q.id] ?? '').trim()]))),
        confirm: true, submittedAt: new Date().toISOString(),
        cv: file ? { name: file.name, type: file.type || 'application/octet-stream', size: file.size, data: await toBase64(file) } : null
      };
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 45000);
      let res;
      try { res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal }); }
      finally { clearTimeout(timer); }
      let data = null;
      try { data = await res.json(); } catch { data = null; }
      if (res.ok && data?.ok && data.reference) {
        result = { reference: data.reference, role: st.role, name: st.about.name.trim(), email: st.about.email.trim(), phone: `${st.about.cc} ${st.about.phone}` };
        try { localStorage.setItem(SUBMITTED_KEY, JSON.stringify({ reference: data.reference, role: st.role, at: Date.now() })); localStorage.removeItem(KEY); } catch { /* ignore */ }
        submitting = false;
        history.replaceState({ ...entry(), done: true }, '', '#apply');
        renderResult(true);
        return;
      }
      if (res.status === 400 && data?.fields) {
        submitting = false;
        render();
        showErrors(data.fields);
        return;
      }
      throw Object.assign(new Error(data?.error || `The server responded with ${res.status}`), { status: res.status });
    } catch (err) {
      submitting = false;
      const unavailable = err.status === 404 || err.status === 405 || err.status === 501;
      failure = err.name === 'AbortError'
        ? { title: 'The submission timed out.', detail: 'Please check your connection and try again.' }
        : unavailable
          ? { title: 'Online submission isn’t available on this version of the site.', detail: 'Download your answers and email them with your CV, or try again later.' }
          : err instanceof TypeError
            ? { title: 'We couldn’t reach the application service.', detail: 'Please check your connection and try again.' }
            : { title: 'We couldn’t submit your application.', detail: `${err.message}.` };
      persist(st);
      render();
      $('[data-form] .cr-form-alert[role="alert"]', host)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
    }
  }

  function renderResult(scroll = false) {
    const r = result;
    const tag = r.role === 'tag';
    host.innerHTML = `<div class="cr-result" tabindex="-1" data-result>
      <span class="cr-result-ic">${icon('check')}</span>
      <h3>Application received</h3>
      <p>Thank you, ${esc(r.name.split(/\s+/)[0])}. Your application for <b>${esc(ROLES[r.role].title)}</b> has been received.</p>
      <p class="cr-ref">${icon('ticket')} Reference ${esc(r.reference)}</p>
      <p>Keep this reference for any questions. You can reach us at <a class="cr-link" href="mailto:${EMAIL}">${EMAIL}</a>.</p>
      <p style="margin-top:22px;font-weight:600;color:var(--ink)">What happens next</p>
      <ol>${tag
        ? `<li>We read your written answers first — the KPI and execution questions carry the most weight.</li>
           <li>If you are shortlisted, we contact you by phone or email to arrange a 30-minute Commercial Review call.</li>
           <li>Next comes your POD Plan, then an offer with your assigned pod benchmark and onboarding date, confirmed in writing.</li>`
        : `<li>Our team reviews every application.</li><li>If you are shortlisted, we contact you by phone or email to arrange the next steps.</li>`}</ol>
      <div class="cr-cta-row"><a class="cr-btn cr-btn-primary" href="./#/">Back to Aeroskys.com ${icon('arrow-right')}</a><button type="button" class="cr-btn cr-btn-outline" data-new>Start a new application</button></div>
    </div>`;
    rolepick.querySelectorAll('input').forEach(i => { i.disabled = true; });
    $('[data-new]', host).addEventListener('click', () => {
      result = null; st = fresh(); file = null;
      history.replaceState(entry(), '', location.href);
      renderRolePick(); render({ enter: true, focus: true });
    });
    if (scroll) { const el = $('[data-result]', host); scrollToEl(el); el.focus({ preventScroll: true }); }
  }

  function downloadCopy() {
    const r = ROLES[st.role];
    const a = st.about;
    const lines = [`AeroSkys Career Application – ${r.title}`, '', `Full name: ${a.name}`, `Email: ${a.email}`, `Phone: ${a.cc} ${a.phone}`, `Current location: ${a.location}`, `CV link: ${a.cvLink || '—'}`, `Notice period: ${a.notice}`, ''];
    let n = 0;
    for (const s of r.sections) {
      lines.push(`== ${s.nav} ==`, '');
      for (const q of s.questions) { n++; lines.push(`${pad(n)}. ${q.label}`, String(st.answers[st.role][q.id] || '—'), ''); }
    }
    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: `AeroSkys-application-${r.short.replace(/\W+/g, '-')}.txt` });
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // -------------------------------------------------------------- history
  addEventListener('popstate', e => {
    const s = e.state;
    if (!s?.crApply || result || s.done) return;
    const role = ROLES[s.role] ? s.role : st.role;
    // Never step into a part of the form this application has not reached (e.g. after "Start again").
    const step = Math.min(typeof s.step === 'number' ? s.step : st.step, steps(role).length - 1, st.reached[role] || 0);
    if (role === st.role && step === st.step) return;
    const back = role === st.role && step < st.step;
    if (role !== st.role) { st.role = role; renderRolePick(); }
    st.step = step;
    failure = null;
    save();
    render({ enter: true, back, focus: true });
  });
  addEventListener('pagehide', () => save.flush());

  history.replaceState(entry(), '', location.href);
  renderRolePick();
  render();

  return { setRole };
}
