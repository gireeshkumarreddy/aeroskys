// Careers application: the same four steps for every designation, on one scrollable panel —
// 01 designation & pay structure, 02 about you, 03 the role's questions, 04 submit. Answers save on this
// device as you type (per designation; About you is shared between designations), a progress card
// follows the step in view, and the application is sent to the careers endpoint with an optional CV.
//
// Integration point: POST api/careers/applications (served by server.mjs, which stores applications
// under data/careers/). Replace that endpoint with the HR system / ATS when one is connected. The UI only
// reports success when the endpoint confirms it with a reference.
import { ROLES, isRole, questionsOf, requiredCount, answerFields, isAnswered, NOTICE_OPTIONS, CV_TYPES, CV_EXT, CV_MAX, nationalDigits } from './roles.js';
import { $, $$, esc, icon, debounce, scrollToEl, toast, reducedMotion, scrollRegions } from './ui.js';

const KEY = 'aeroskys:careers:application:v2';
const OLD_KEY = 'aeroskys:careers:application:v1';          // the three-role form (TAG Manager answers carry over)
const SUBMITTED_KEY = 'aeroskys:careers:submitted:v1';
const ENDPOINT = 'api/careers/applications';
const EMAIL = 'customercare@aeroskys.com';
const PHONE = '+91 79703 36785';
const PHONE_TEL = '+917970336785';
const COUNTRY_CODES = [['+91', 'India'], ['+971', 'UAE'], ['+44', 'UK'], ['+1', 'US / Canada'], ['+65', 'Singapore'], ['+61', 'Australia']];
const STEPS = ['Designation', 'About you', 'Application questions', 'Submit'];
const ABOUT_KEYS = ['name', 'email', 'cc', 'phone', 'location', 'cvLink', 'notice'];
const KPI_COLS = [['kpi', 'KPI'], ['lean', 'Lean'], ['over', 'Over-target'], ['tlean', 'Time to lean'], ['tover', 'Time to over-target']];

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const pad = n => String(n).padStart(2, '0');
const fresh = () => ({
  v: 2, about: { name: '', email: '', cc: '+91', phone: '', location: '', cvLink: '', notice: '' },
  answers: {}, clientIds: {}, updatedAt: 0
});

// ---------------------------------------------------------------- storage
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.v === 2) return { ...fresh(), ...s, about: { ...fresh().about, ...s.about }, answers: { ...s.answers }, clientIds: { ...s.clientIds } };
    return migrate();
  } catch { return null; }
}
/** A draft from the earlier three-role form: About you, plus the AeroForce TAG Manager answers (q01–q15 → q1–q15). */
function migrate() {
  const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
  if (!old || old.v !== 1) return null;
  const st = fresh();
  st.about = { ...st.about, ...old.about };
  const tag = {};
  for (let i = 1; i <= 15; i++) { const v = old.answers?.tag?.['q' + pad(i)]; if (v) tag['q' + i] = v; }
  if (Object.keys(tag).length) st.answers.tag = tag;
  st.updatedAt = old.updatedAt || 0;
  try { localStorage.setItem(KEY, JSON.stringify(st)); localStorage.removeItem(OLD_KEY); } catch { /* storage unavailable */ }
  return st;
}
function persist(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); return true; } catch { return false; } }
const readSubmitted = () => { try { return JSON.parse(localStorage.getItem(SUBMITTED_KEY) || 'null'); } catch { return null; } };

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
function validateQuestion(q, a) {
  const v = id => String(a[id] ?? '').trim();
  for (const f of answerFields(q)) if (v(f.id).length > f.max) return `Keep each answer under ${f.max} characters`;
  if (q.kind === 'pair') {
    if (!v(q.id) && !v(q.id2)) return q.required ? 'This question is required' : '';
    return q.required && !(v(q.id) && v(q.id2)) ? 'Please answer both parts' : '';
  }
  if (q.kind === 'table') return q.required && !isAnswered(q, a) ? 'Add at least one KPI with its Lean and Over-target figures' : '';
  if (!v(q.id)) return q.required ? 'This question is required' : '';
  if (q.required && v(q.id).length < 20) return 'Please add a little more detail (at least 20 characters)';
  return '';
}

// ---------------------------------------------------------------- component
export function initApply(host) {
  let st = load() || fresh();
  let role = null;
  let file = null;              // the chosen CV (kept in memory only, used for any designation)
  let confirm = false;          // the final declaration is ticked again for every submission
  let submitting = false;
  let result = null;            // { reference, role, name } after a confirmed submission
  let failure = null;           // last recoverable submission error
  let confirmReset = false;
  let current = 0;              // the step in view
  let spy = null;
  let savedAt = 0;              // last save in this visit
  const submittedBefore = readSubmitted();

  // Only real changes are saved, so a visitor who just reads the form never gets a "saved" draft.
  let dirty = false;
  const saveLater = debounce(() => {
    if (!dirty) return;
    dirty = false; st.updatedAt = savedAt = Date.now();
    const ok = persist(st);
    const out = $('[data-save-status]', host);
    if (out) out.innerHTML = ok ? saveStatus() : `${icon('alert')}<span>Your browser blocked saving. Keep this page open until you submit.</span>`;
  }, 600);
  const save = () => { dirty = true; saveLater(); };
  addEventListener('pagehide', () => saveLater.flush());

  const answers = () => (st.answers[role] ||= {});
  const clientId = () => (st.clientIds[role] ||= uid());
  const fieldIds = () => new Set(questionsOf(role).flatMap(q => answerFields(q).map(f => f.id)));
  // The question each answer field belongs to (a pair's second part, a KPI table cell, the table note).
  const ownerOf = id => questionsOf(role).find(q => answerFields(q).some(f => f.id === id));

  // -------------------------------------------------------------- progress
  const reqDone = () => questionsOf(role).filter(q => q.required && !validateQuestion(q, answers())).length;
  const aboutDone = () => !Object.keys(validateAbout(st.about)).length;
  const aboutCount = () => ['name', 'email', 'phone', 'location', 'notice'].filter(k => !validateAbout(st.about)[k]).length;
  const cvDone = () => !!(file || st.about.cvLink.trim());
  function stepStatus(i) {
    if (i === 0) return { done: true, text: 'Confirmed' };
    if (i === 1) return aboutDone() ? { done: true, text: 'Complete' } : { done: false, text: `${aboutCount()} of 5 details` };
    if (i === 2) { const d = reqDone(), t = requiredCount(role); return { done: d >= t, text: `${d} of ${t} required` }; }
    return confirm && cvDone() && aboutDone() && reqDone() >= requiredCount(role) ? { done: true, text: 'Ready to send' } : { done: false, text: cvDone() ? 'Confirm and send' : 'Add your CV' };
  }
  function percent() {
    const t = requiredCount(role);
    const parts = [aboutCount() / 5, t ? reqDone() / t : 1, cvDone() ? 1 : 0, confirm ? 1 : 0];
    return Math.round(((1 + parts[0] * 2 + parts[1] * 5 + parts[2] + parts[3]) / 10) * 100);
  }
  const progressLabel = () => { const d = reqDone(), t = requiredCount(role); return d >= t ? 'All required questions answered' : `${d} of ${t} required questions answered`; };
  const saveStatus = () => {
    const at = savedAt || st.updatedAt;
    if (!at) return `${icon('bookmark')}<span>Your answers save on this device as you type.</span>`;
    const when = new Date(at).toLocaleString('en-IN', savedAt ? { hour: 'numeric', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    return `${icon('check-circle')}<span>Saved on this device${savedAt ? ' at' : ','} ${esc(when)}.</span>`;
  };

  function refreshProgress() {
    const pct = percent();
    for (const card of $$('[data-prog]', host)) {
      $('[data-prog-pct]', card).textContent = pct + '%';
      $('[data-prog-bar]', card).style.width = pct + '%';
      $$('[data-prog-step]', card).forEach((li, i) => {
        const s = stepStatus(i);
        li.classList.toggle('is-done', s.done && i !== current);
        li.classList.toggle('is-current', i === current);
        $('small', li).textContent = i === current && !s.done ? 'In progress' : s.text;
        $('.cr-step-dot', li).innerHTML = s.done && i !== current ? icon('check') : String(i + 1);
        const btn = $('button', li);
        if (i === current) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current');
      });
    }
    const bar = $('[data-apbar]', host);
    if (bar) {
      $('[data-apbar-label]', bar).textContent = `Step ${current + 1} of 4 · ${STEPS[current]}`;
      $('[data-apbar-pct]', bar).textContent = pct + '%';
      $('[data-apbar-fill]', bar).style.width = pct + '%';
    }
    const lab = $('[data-progress-label]', host);
    if (lab) lab.textContent = progressLabel();
    const tip = $('[data-tip]', host);
    if (tip) tip.textContent = tipText(current);
  }

  // -------------------------------------------------------------- markup
  const stepHead = (n, title, sub = '', extra = '') => `<header class="cr-astep-head">
      <span class="cr-astep-n" aria-hidden="true">${pad(n)}</span>
      <div class="cr-astep-hgroup"><h3 class="cr-astep-title" id="as-${n}" tabindex="-1"><span class="sr-only">Step ${n} of 4: </span>${title}</h3>${sub ? `<p class="cr-astep-sub">${sub}</p>` : ''}</div>
      ${extra}
    </header>`;

  function render() {
    if (result) { renderResult(); return; }
    spy?.disconnect();
    const r = ROLES[role];
    host.innerHTML = `
      ${bannerHTML()}
      <div class="cr-apbar" data-apbar aria-hidden="true"><span data-apbar-label></span><b data-apbar-pct></b><i><b data-apbar-fill></b></i></div>
      <div class="cr-apply-grid">
        <div class="cr-apply-main">
          ${designationHTML(r)}
          <form class="cr-aform" novalidate data-form aria-label="Application for ${esc(r.title)}">
            ${aboutHTML()}
            ${questionsHTML(r)}
            ${submitHTML(r)}
          </form>
        </div>
        <aside class="cr-side" aria-label="Application progress">${sideHTML(r)}</aside>
      </div>`;
    bind();
    refreshProgress();
    watchSteps();
    requestAnimationFrame(() => scrollRegions(host));
  }

  function bannerHTML() {
    if (confirmReset) return `<div class="cr-banner" role="alert">${icon('alert')}<span>Clear your answers for <b>${esc(ROLES[role].title)}</b> and your About you details on this device?</span>
      <span class="cr-cta-row"><button type="button" class="cr-btn cr-btn-dark" data-reset-yes>Yes, clear them</button><button type="button" class="cr-btn cr-btn-outline" data-reset-no>Keep my answers</button></span></div>`;
    if (submittedBefore && isRole(submittedBefore.role)) return `<div class="cr-banner is-success">${icon('check-circle')}<span>You applied for <b>${esc(ROLES[submittedBefore.role].title)}</b> on ${esc(new Date(submittedBefore.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }))} (reference ${esc(submittedBefore.reference)}).</span></div>`;
    return '';
  }

  // Step 01 confirms the designation; its pay structure is on the role page above, so it is not repeated here.
  function designationHTML(r) {
    return `<section class="cr-astep" id="apply-step-1" aria-labelledby="as-1" data-astep="0">
      ${stepHead(1, 'Designation', 'Your answers are saved for this designation only.',
        `<a class="cr-btn cr-btn-outline cr-astep-switch" href="#positions">${icon('arrow-left')} Choose a different position</a>`)}
      <div class="cr-desig-strip">
        <span class="cr-desig-n" aria-hidden="true">${r.num}</span>
        <div class="cr-desig-who"><p class="cr-kicker">Position ${r.num} · ${esc(r.group)} designation</p><p class="cr-desig-title">${esc(r.title)}</p></div>
        <p class="cr-desig-q">${questionsOf(role).length} questions · ${requiredCount(role)} required</p>
      </div>
    </section>`;
  }

  function field({ key, label, type = 'text', ic, placeholder = '', required = true, cls = '', auto = '', hint = '', options }) {
    const v = st.about[key] ?? '';
    const described = `${hint ? `h-${key} ` : ''}e-${key}`;
    const control = options
      ? `<select class="cr-select" id="f-${key}" name="${key}" ${required ? 'required' : ''} aria-describedby="${described}">
          <option value="">${esc(placeholder || 'Select')}</option>${options.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
      : `<input class="cr-input" id="f-${key}" name="${key}" type="${type}" value="${esc(v)}" placeholder="${esc(placeholder)}" ${auto ? `autocomplete="${auto}"` : ''} ${required ? 'required' : ''} aria-describedby="${described}" ${type === 'tel' ? 'inputmode="tel"' : ''}>`;
    return `<div class="cr-field ${cls}" data-field="${key}">
      <label for="f-${key}">${esc(label)}${required ? '<span class="cr-req" aria-hidden="true">*</span>' : ' <span class="cr-hint">(optional)</span>'}</label>
      <div class="cr-control">${icon(ic)}${control}</div>
      ${hint ? `<p class="cr-hint" id="h-${key}">${esc(hint)}</p>` : ''}
      <p class="cr-error" id="e-${key}" hidden></p>
    </div>`;
  }

  function aboutHTML() {
    const a = st.about;
    return `<section class="cr-astep" id="apply-step-2" aria-labelledby="as-2" data-astep="1">
      ${stepHead(2, 'About you', 'Shared by every designation you apply for. Fields marked <span class="cr-req">*</span> are required.')}
      <div class="cr-fields">
        ${field({ key: 'name', label: 'Full name', ic: 'user', placeholder: 'As it appears on your CV', auto: 'name' })}
        ${field({ key: 'email', label: 'Email', type: 'email', ic: 'mail', placeholder: 'you@example.com', auto: 'email' })}
        <div class="cr-field" data-field="phone">
          <label for="f-phone">Phone<span class="cr-req" aria-hidden="true">*</span></label>
          <div class="cr-phone">
            <div class="cr-control">${icon('phone')}<select class="cr-select" id="f-cc" name="cc" aria-label="Country code">${COUNTRY_CODES.map(([c]) => `<option value="${c}" ${a.cc === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            <input class="cr-input" id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" value="${esc(a.phone)}" placeholder="Mobile number" required aria-describedby="e-phone">
          </div>
          <p class="cr-error" id="e-phone" hidden></p>
        </div>
        ${field({ key: 'location', label: 'Current location', ic: 'pin', placeholder: 'City', auto: 'address-level2' })}
        ${field({ key: 'cvLink', label: 'Link to CV / resume', type: 'url', ic: 'file', placeholder: 'Drive, Dropbox or LinkedIn URL', required: false, hint: 'Or upload your CV in step 04.' })}
        ${field({ key: 'notice', label: 'Notice period', ic: 'calendar', placeholder: 'Select your notice period', options: NOTICE_OPTIONS })}
      </div>
    </section>`;
  }

  function questionHTML(q, n) {
    const a = answers();
    const val = id => esc(a[id] ?? '');
    const described = `${q.help ? `h-${q.id} ` : ''}e-${q.id}`;
    const pills = `<span class="cr-q-pills"><span class="cr-q-pill ${q.required ? '' : 'is-optional'}">${q.required ? 'Required' : 'Optional'}</span>${q.core ? `<span class="cr-q-pill is-core">${icon('star')}Primary evaluation</span>` : ''}</span>`;
    let label, control;
    if (q.kind === 'pair') {
      label = `<p class="cr-q-label" id="l-${q.id}"><span class="sr-only">Question ${n}: </span>${esc(q.text)}</p>`;
      control = `<div class="cr-pair" role="group" aria-labelledby="l-${q.id}">
        <div class="cr-pair-f"><label class="cr-pair-label" for="f-${q.id}">${esc(q.ph1)}</label><input class="cr-input" id="f-${q.id}" name="${q.id}" type="text" maxlength="${q.max}" value="${val(q.id)}" aria-describedby="${described}" ${q.required ? 'required' : ''}></div>
        <div class="cr-pair-f"><label class="cr-pair-label" for="f-${q.id2}">${esc(q.ph2)}</label><input class="cr-input" id="f-${q.id2}" name="${q.id2}" type="text" maxlength="${q.max}" value="${val(q.id2)}" aria-describedby="${described}" ${q.required ? 'required' : ''}></div>
      </div>`;
    } else if (q.kind === 'table') {
      label = `<p class="cr-q-label" id="l-${q.id}"><span class="sr-only">Question ${n}: </span>${esc(q.text)}</p>`;
      control = `<div class="cr-kpi-wrap" role="group" aria-labelledby="l-${q.id}" aria-describedby="${described}">
        <table class="cr-kpi">
          <thead><tr>${KPI_COLS.map(([, h]) => `<th scope="col">${h}</th>`).join('')}</tr></thead>
          <tbody>${q.tableRows.map((row, i) => `<tr>${KPI_COLS.map(([c, h]) => `<td data-label="${h}"><input class="cr-input" id="f-${row[c]}" name="${row[c]}" type="text" maxlength="${q.max}" value="${val(row[c])}" aria-label="KPI ${i + 1}: ${h}"${i === 0 && c === 'kpi' ? ` aria-describedby="e-${q.id}"` : ''}></td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="cr-kpi-note">
        <label class="cr-pair-label" for="f-${q.noteId}">${esc(q.noteLabel)} <span class="cr-hint">(optional)</span></label>
        <div class="cr-textarea-wrap">${icon('edit')}<textarea class="cr-textarea" id="f-${q.noteId}" name="${q.noteId}" maxlength="${q.noteMax}" rows="3" aria-describedby="c-${q.noteId}">${val(q.noteId)}</textarea><span class="cr-count" id="c-${q.noteId}" aria-live="off">${String(a[q.noteId] ?? '').length} / ${q.noteMax}</span></div>
      </div>`;
    } else {
      label = `<label class="cr-q-label" id="l-${q.id}" for="f-${q.id}"><span class="sr-only">Question ${n}: </span>${esc(q.text)}</label>`;
      const rows = Math.max(3, Math.min(q.rows || 5, 8));
      control = `<div class="cr-textarea-wrap">${icon('edit')}<textarea class="cr-textarea" id="f-${q.id}" name="${q.id}" maxlength="${q.max}" rows="${rows}" aria-describedby="${described} c-${q.id}" ${q.required ? 'required' : ''}>${val(q.id)}</textarea>
        <span class="cr-count" id="c-${q.id}" aria-live="off">${String(a[q.id] ?? '').length} / ${q.max}</span></div>`;
    }
    return `<div class="cr-q ${q.core ? 'is-core' : ''}" data-q="${q.id}">
      <span class="cr-q-n" aria-hidden="true">${pad(n)}</span>
      <div class="cr-q-body">
        ${label}
        ${pills}
        ${q.help ? `<p class="cr-q-hint" id="h-${q.id}">${esc(q.help)}</p>` : ''}
        ${control}
        <p class="cr-error" id="e-${q.id}" hidden></p>
      </div>
    </div>`;
  }

  function questionsHTML(r) {
    let n = 0;
    const core = questionsOf(role).find(q => q.core);
    const one = r.groups.length === 1;
    return `<section class="cr-astep" id="apply-step-3" aria-labelledby="as-3" data-astep="2">
      ${stepHead(3, `Application questions <span class="cr-astep-role">— ${esc(r.title)}</span>`,
        `${questionsOf(role).length} questions, ${requiredCount(role)} required.${core ? ` ${esc(core.label.replace('Q', 'Question '))} is the primary evaluation.` : ''}`)}
      ${r.groups.map(g => `<div class="cr-qgroup">
        ${one ? '' : `<div class="cr-qgroup-head"><h4 class="cr-qgroup-title">${esc(g.title)}</h4><span class="cr-qgroup-range">${esc(g.range)}</span></div>`}
        ${g.note ? `<p class="cr-qgroup-note">${icon('info')}<span>${esc(g.note)}</span></p>` : ''}
        <div class="cr-qlist">${g.questions.map(q => questionHTML(q, ++n)).join('')}</div>
      </div>`).join('')}
    </section>`;
  }

  function reviewHTML(r) {
    const a = st.about, ans = answers();
    const row = (label, value, missing) => `<dt>${esc(label)}</dt><dd class="${missing ? 'is-missing' : ''}">${value ? esc(value) : missing ? 'Missing — required' : '—'}</dd>`;
    const shown = q => {
      if (q.kind === 'pair') return [ans[q.id], ans[q.id2]].filter(v => String(v ?? '').trim()).join(' — ');
      if (q.kind === 'table') return [...q.tableRows.filter(t => String(ans[t.kpi] ?? '').trim()).map(t => `${ans[t.kpi]}: lean ${ans[t.lean] || '—'}, over-target ${ans[t.over] || '—'}, time to lean ${ans[t.tlean] || '—'}, time to over-target ${ans[t.tover] || '—'}`), String(ans[q.noteId] ?? '').trim()].filter(Boolean).join('\n');
      return ans[q.id] || '';
    };
    let n = 0;
    return `<details class="cr-review">
      <summary>${icon('clipboard')} Review your answers before submitting ${icon('chevron-down')}</summary>
      <div class="cr-review-body">
        <div class="cr-review-sec"><div class="cr-review-sec-h"><span>About you</span><button type="button" data-goto="1">Edit</button></div>
          <dl>${row('Full name', a.name, !a.name.trim())}${row('Email', a.email, !a.email.trim())}${row('Phone', a.phone ? `${a.cc} ${a.phone}` : '', !a.phone.trim())}${row('Current location', a.location, !a.location.trim())}${row('CV', a.cvLink || (file ? file.name : ''), false)}${row('Notice period', a.notice, !a.notice)}${row('Designation', r.title, false)}</dl></div>
        <div class="cr-review-sec"><div class="cr-review-sec-h"><span>Application questions</span><button type="button" data-goto="2">Edit</button></div>
          <dl>${questionsOf(role).map(q => row(`${pad(++n)}. ${q.text}`, shown(q), q.required && !isAnswered(q, ans))).join('')}</dl></div>
      </div>
    </details>`;
  }

  const fileHTML = () => file ? `<div class="cr-file">${icon('file')}<span><b>${esc(file.name)}</b> · ${(file.size / 1048576).toFixed(file.size < 1048576 ? 2 : 1)} MB · ready to send</span><button type="button" class="cr-icon-btn" data-cv-remove aria-label="Remove ${esc(file.name)}">${icon('x')}</button></div>` : '';
  const subject = r => `AeroSkys Career Application – ${r.title} – ${st.about.name.trim() || 'Your Name'}`;

  function submitHTML(r) {
    const link = st.about.cvLink.trim();
    return `<section class="cr-astep" id="apply-step-4" aria-labelledby="as-4" data-astep="3">
      ${stepHead(4, 'Submit', 'Add your CV, check your answers and send your application.')}
      <div class="cr-submit-box">
        <span class="cr-mail-ic">${icon('upload')}</span>
        <div>
          <p class="cr-submit-title">Your CV / résumé</p>
          <p class="cr-submit-alt">You can also email your answers and CV to <a class="cr-link" href="mailto:${EMAIL}?subject=${encodeURIComponent(subject(r))}">${EMAIL}</a> with the subject “AeroSkys Career Application – ${esc(r.title)} – Your Name”.</p>
        </div>
        <div class="cr-drop" data-drop>
          <input type="file" id="f-cv" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-label="Upload your CV or résumé" aria-describedby="cv-help e-cv">
          <span class="cr-drop-ic">${icon('upload')}</span>
          <span><b>Upload your CV / résumé ${link ? '(optional)' : ''}</b><small id="cv-help">PDF, DOC or DOCX (max 10 MB). ${link ? 'You added a CV link in About you.' : 'Or add a CV link in About you.'}</small></span>
        </div>
        ${fileHTML()}
        <p class="cr-error" id="e-cv" hidden></p>
      </div>
      <div class="cr-submit-checks">
        ${reviewHTML(r)}
        <label class="cr-confirm" data-field="confirm"><input type="checkbox" id="f-confirm" name="confirm" ${confirm ? 'checked' : ''} aria-describedby="e-confirm"> <span>I confirm that the information provided is true and accurate to the best of my knowledge.</span></label>
        <p class="cr-error" id="e-confirm" hidden></p>
        <p class="cr-privacy">We use your details only to assess your application and to contact you about it. Read our <a href="./#/privacy" target="_blank" rel="noopener">privacy policy<span class="sr-only"> (opens in a new tab)</span></a>.</p>
      </div>
      ${failure ? failureHTML(r) : ''}
      <div class="cr-form-alert" data-form-alert hidden role="alert"></div>
      <div class="cr-submit-row">
        <p class="cr-progress-label" data-progress-label aria-live="polite"></p>
        <button type="submit" class="cr-btn cr-btn-primary cr-btn-lg" data-submit ${submitting ? 'disabled aria-busy="true"' : ''}>${submitting ? `${icon('loader', 'cr-spin')} Submitting…` : `Submit application ${icon('arrow-right')}`}</button>
      </div>
      <p class="cr-save-status" data-save-status aria-live="polite">${saveStatus()}</p>
    </section>`;
  }

  function failureHTML(r) {
    return `<div class="cr-form-alert" role="alert">${icon('alert')}<div>
      <b>${esc(failure.title)}</b><br>${esc(failure.detail)} Your answers are saved on this device, so nothing is lost.
      <div class="cr-cta-row" style="margin-top:10px">
        <button type="button" class="cr-btn cr-btn-dark" data-retry style="min-height:40px">Try again</button>
        <button type="button" class="cr-btn cr-btn-outline" data-download style="min-height:40px">${icon('download')} Download my answers</button>
        <a class="cr-btn cr-btn-outline" style="min-height:40px" href="mailto:${EMAIL}?subject=${encodeURIComponent(subject(r))}">${icon('mail')} Email us instead</a>
      </div></div></div>`;
  }

  function tipText(i) {
    const core = questionsOf(role).find(q => q.core);
    return [
      'Check this is the designation you want. Its full pay structure is on the role page above — your KPI answers should fit it.',
      'Use the name on your CV and an email and number you check often — that is how we will contact you.',
      `Be specific and use real numbers.${core ? ` Question ${core.label.slice(1)} is the primary evaluation and carries the greatest weighting.` : ''} Effort without metrics counts against you.`,
      'Attach your CV (PDF, DOC or DOCX, up to 10 MB) or add a link in About you, review your answers, then confirm and submit.'
    ][i];
  }

  function sideHTML(r) {
    return `<div class="cr-side-card" data-prog>
        <p class="cr-side-k">Your application</p>
        <h3>${esc(r.title)}</h3>
        <p>Position ${r.num} · ${esc(r.group)}</p>
        <div class="cr-prog"><i><b data-prog-bar></b></i><span data-prog-pct></span></div>
        <ol class="cr-prog-list">${STEPS.map((s, i) => `<li data-prog-step><button type="button" data-goto="${i}"><span class="cr-step-dot">${i + 1}</span><span>${esc(s)}</span><small></small></button></li>`).join('')}</ol>
        <button type="button" class="cr-side-reset" data-reset>Clear my answers</button>
      </div>
      <div class="cr-side-card cr-tip"><div class="cr-tip-head"><span class="cr-tip-ic">${icon('bulb')}</span><h3>Quick tip</h3></div><p data-tip></p></div>
      <div class="cr-side-card cr-help"><span class="cr-help-ic">${icon('headset')}</span><div><h3>Need help?</h3><p>Call <a class="cr-link" href="tel:${PHONE_TEL}">${PHONE}</a> or email <a class="cr-link" href="mailto:${EMAIL}">${EMAIL}</a>.</p></div></div>`;
  }

  // -------------------------------------------------------------- behaviour
  const form = () => $('[data-form]', host);
  function stepEl(i) { return $(`[data-astep="${i}"]`, host); }
  function goStep(i) {
    const el = stepEl(i);
    if (!el) return;
    scrollToEl(el, 10);
    setTimeout(() => $('.cr-astep-title', el)?.focus({ preventScroll: true }), reducedMotion() ? 0 : 450);
  }

  // The step in view drives the progress card, the phone progress bar and the tip.
  function watchSteps() {
    const seen = new Map();
    spy = new IntersectionObserver(entries => {
      for (const en of entries) seen.set(en.target, en.isIntersecting ? en.intersectionRect.height : 0);
      let best = -1, bestH = 0;
      for (const [el, h] of seen) if (h > bestH) { bestH = h; best = Number(el.dataset.astep); }
      if (best >= 0 && best !== current) { current = best; refreshProgress(); }
    }, { rootMargin: '-25% 0px -35% 0px', threshold: [0, .1, .25, .5, .75, 1] });
    $$('[data-astep]', host).forEach(el => spy.observe(el));
  }

  function clearErrors(scope) {
    $$('.has-error', scope).forEach(el => el.classList.remove('has-error'));
    $$('.cr-error', scope).forEach(el => { el.hidden = true; el.textContent = ''; });
    $$('[aria-invalid]', scope).forEach(el => el.removeAttribute('aria-invalid'));
  }
  const inputsFor = key => {
    const q = role && questionsOf(role).find(x => x.id === key);
    if (q?.kind === 'pair') return [$(`#f-${q.id}`, host), $(`#f-${q.id2}`, host)];
    if (q?.kind === 'table') return q.tableRows.slice(0, 1).flatMap(r => [r.kpi, r.lean, r.over].map(id => $(`#f-${id}`, host)));
    return [$(`#f-${key}`, host)];
  };
  function markError(key, msg) {
    const out = $(`#e-${key}`, host);
    if (out) { out.hidden = false; out.innerHTML = `${icon('alert')}<span>${esc(msg)}</span>`; }
    $(`[data-field="${key}"], [data-q="${key}"]`, host)?.classList.add('has-error');
    inputsFor(key).forEach(el => el?.setAttribute('aria-invalid', 'true'));
  }
  function showErrors(errs, { focusFirst = true } = {}) {
    clearErrors(host);
    const keys = Object.keys(errs);
    keys.forEach(k => markError(k, errs[k]));
    const alert = $('[data-form-alert]', host);
    if (!keys.length) { alert.hidden = true; return; }
    alert.hidden = false;
    alert.innerHTML = `${icon('alert')}<span>${keys.length === 1 ? 'Please check the highlighted field.' : `Please check the ${keys.length} highlighted fields.`} <button type="button" class="cr-link" data-first-error>Go to the first one</button></span>`;
    $('[data-first-error]', alert).addEventListener('click', () => focusError(keys[0]));
    if (focusFirst) focusError(keys[0]);
  }
  function focusError(k) {
    const target = inputsFor(k)[0] || $(`#f-${k}`, host);
    if (!target) return;
    scrollToEl(target.closest('.cr-q, .cr-field, .cr-submit-box, .cr-confirm') || target, 20);
    setTimeout(() => target.focus({ preventScroll: true }), reducedMotion() ? 0 : 400);
  }

  function errorFor(key) {
    if (ABOUT_KEYS.includes(key)) return validateAbout(st.about)[key] || '';
    if (key === 'cv') return cvDone() ? '' : 'Add your CV: upload it here, or add a link in About you';
    if (key === 'confirm') return confirm ? '' : 'Please confirm that your information is accurate';
    const q = questionsOf(role).find(x => x.id === key);
    return q ? validateQuestion(q, answers()) : '';
  }
  function clearFieldError(key) {
    const wrap = $(`[data-field="${key}"], [data-q="${key}"]`, host);
    const shown = !$(`#e-${key}`, host)?.hidden;
    if (!shown || errorFor(key)) return;
    wrap?.classList.remove('has-error');
    const out = $(`#e-${key}`, host); if (out) { out.hidden = true; out.textContent = ''; }
    inputsFor(key).forEach(el => el?.removeAttribute('aria-invalid'));
    if (!$$('.cr-error:not([hidden])', host).length) { const a = $('[data-form-alert]', host); if (a) a.hidden = true; }
  }

  function bind() {
    const f = form();
    const ids = fieldIds();
    f.addEventListener('input', e => {
      const t = e.target;
      if (!t.name || t.type === 'file' || t.type === 'checkbox') return;
      if (ABOUT_KEYS.includes(t.name)) st.about[t.name] = t.value;
      else if (ids.has(t.name)) answers()[t.name] = t.value;
      else return;
      const c = $(`#c-${t.name}`, f);
      if (c) { c.textContent = `${t.value.length} / ${t.maxLength}`; c.classList.toggle('is-near', t.value.length > t.maxLength * 0.9); }
      save();
      clearFieldError(ABOUT_KEYS.includes(t.name) ? t.name : ownerOf(t.name)?.id || t.name);
      if (t.name === 'cvLink') clearFieldError('cv');
      refreshProgress();
    });
    f.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'f-confirm') { confirm = t.checked; clearFieldError('confirm'); refreshProgress(); }
      if (t.id === 'f-cv') pickFile(t.files?.[0]);
      if (t.name === 'cc' || t.name === 'notice') { st.about[t.name] = t.value; save(); clearFieldError(t.name === 'cc' ? 'phone' : 'notice'); refreshProgress(); }
    });
    f.addEventListener('focusout', e => {
      // Check a field when the visitor leaves it (only once it has content, to avoid nagging).
      const t = e.target;
      if (!t.name || !String(t.value || '').trim() || t.type === 'checkbox' || t.type === 'file') return;
      const key = ABOUT_KEYS.includes(t.name) ? (t.name === 'cc' ? 'phone' : t.name) : ownerOf(t.name)?.id;
      if (!key) return;
      const q = questionsOf(role).find(x => x.id === key);
      if (q && q.kind !== 'text') return;            // pairs and KPI tables are checked on submit
      const msg = errorFor(key);
      if (msg && !/required/i.test(msg)) markError(key, msg);
    });
    f.addEventListener('submit', e => { e.preventDefault(); submit(); });
    host.addEventListener('click', onClick);
    const drop = $('[data-drop]', host);
    if (drop) {
      ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('is-over')));
      drop.addEventListener('drop', e => { e.preventDefault(); pickFile(e.dataTransfer?.files?.[0]); });
    }
  }

  function onClick(e) {
    const b = e.target.closest('button');
    if (!b || !host.contains(b)) return;
    if (b.dataset.goto) { goStep(Number(b.dataset.goto)); return; }
    if (b.hasAttribute('data-cv-remove')) { file = null; rerenderSubmit(); return; }
    if (b.hasAttribute('data-retry')) { submit(); return; }
    if (b.hasAttribute('data-download')) { downloadCopy(); return; }
    if (b.hasAttribute('data-reset')) { confirmReset = true; rerenderBanner(); return; }
    if (b.hasAttribute('data-reset-no')) { confirmReset = false; rerenderBanner(); return; }
    if (b.hasAttribute('data-reset-yes')) {
      confirmReset = false; failure = null; file = null; confirm = false;
      st.about = fresh().about; delete st.answers[role]; delete st.clientIds[role]; savedAt = 0; st.updatedAt = 0;
      persist(st);
      host.removeEventListener('click', onClick);
      render();
      goStep(1);
      toast('Your answers were cleared from this device.', { iconName: 'info' });
    }
  }
  // Keep the visitor's place: only the parts that change are redrawn.
  function rerenderBanner() {
    const old = $('.cr-banner', host);
    const html = bannerHTML();
    if (old) old.outerHTML = html || '';
    else if (html) host.insertAdjacentHTML('afterbegin', html);
    $('.cr-banner [data-reset-no], .cr-banner [data-reset-yes]', host)?.focus();
    if (confirmReset) $('.cr-banner', host)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
  }
  function rerenderSubmit() {
    const box = $('.cr-submit-box', host);
    $('.cr-file', box)?.remove();
    if (file) $('#e-cv', box).insertAdjacentHTML('beforebegin', fileHTML());
    const r = ROLES[role];
    $('.cr-review', host).outerHTML = reviewHTML(r);
    clearFieldError('cv');
    refreshProgress();
  }

  function pickFile(f) {
    if (!f) return;
    const okType = CV_TYPES[f.type] || CV_EXT.test(f.name);
    let err = '';
    if (!okType) err = 'Upload a PDF, DOC or DOCX file';
    else if (f.size > CV_MAX) err = 'That file is larger than 10 MB. Please upload a smaller PDF, DOC or DOCX';
    else if (f.size === 0) err = 'That file is empty';
    const input = $('#f-cv', host);
    if (err) { markError('cv', err); if (input) input.value = ''; return; }
    file = f;
    rerenderSubmit();
    toast(`${f.name} attached. It is sent only when you submit.`, { iconName: 'file' });
  }

  // -------------------------------------------------------------- submission
  const toBase64 = f => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1] || '');
    r.onerror = () => rej(new Error('Could not read the CV file'));
    r.readAsDataURL(f);
  });

  function validateAll() {
    const e = { ...validateAbout(st.about) };
    for (const q of questionsOf(role)) { const m = validateQuestion(q, answers()); if (m) e[q.id] = m; }
    if (!cvDone()) e.cv = 'Add your CV: upload it here, or add a link in About you';
    if (!confirm) e.confirm = 'Please confirm that your information is accurate';
    return e;
  }

  function setBusy(busy) {
    const btn = $('[data-submit]', host);
    submitting = busy;
    if (!btn) return;
    btn.disabled = busy;
    btn.toggleAttribute('aria-busy', busy);
    btn.innerHTML = busy ? `${icon('loader', 'cr-spin')} Submitting…` : `Submit application ${icon('arrow-right')}`;
    $$('input, textarea, select, button:not([data-submit])', form()).forEach(el => { el.disabled = busy; });
  }

  async function submit() {
    if (submitting) return;
    const errs = validateAll();
    if (Object.keys(errs).length) { showErrors(errs); return; }
    failure = null;
    $('.cr-form-alert[role="alert"]:not([data-form-alert])', host)?.remove();
    showErrors({}, { focusFirst: false });
    setBusy(true);
    const r = ROLES[role];
    try {
      const ans = answers();
      const payload = {
        clientId: clientId(), role, roleTitle: r.title,
        about: { ...st.about, name: st.about.name.trim(), email: st.about.email.trim().toLowerCase(), phone: nationalDigits(st.about.cc, st.about.phone) },
        answers: Object.fromEntries([...fieldIds()].map(id => [id, String(ans[id] ?? '').trim()])),
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
        result = { reference: data.reference, role, name: st.about.name.trim() };
        delete st.answers[role]; delete st.clientIds[role];
        persist(st);
        try { localStorage.setItem(SUBMITTED_KEY, JSON.stringify({ reference: data.reference, role, at: Date.now() })); } catch { /* ignore */ }
        submitting = false; confirm = false;
        renderResult(true);
        return;
      }
      if (res.status === 400 && data?.fields) { setBusy(false); showErrors(data.fields); return; }
      throw Object.assign(new Error(data?.error || `The server responded with ${res.status}`), { status: res.status });
    } catch (err) {
      setBusy(false);
      const unavailable = err.status === 404 || err.status === 405 || err.status === 501;
      failure = err.name === 'AbortError'
        ? { title: 'The submission timed out.', detail: 'Please check your connection and try again.' }
        : unavailable
          ? { title: 'Online submission isn’t available on this version of the site yet.', detail: 'Download your answers and email them with your CV, or try again later.' }
          : err instanceof TypeError
            ? { title: 'We couldn’t reach the application service.', detail: 'Please check your connection and try again.' }
            : { title: 'We couldn’t submit your application.', detail: `${err.message}.` };
      persist(st);
      $('[data-form-alert]', host).insertAdjacentHTML('beforebegin', failureHTML(r));
      const box = $('.cr-form-alert[role="alert"]:not([data-form-alert])', host);
      box?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
      $('[data-retry]', box)?.focus({ preventScroll: true });
    }
  }

  function renderResult(scroll = false) {
    spy?.disconnect();
    const r = result;
    host.innerHTML = `<div class="cr-result" tabindex="-1" data-result>
      <span class="cr-result-ic">${icon('check')}</span>
      <h3>Application received</h3>
      <p>Thank you, ${esc(r.name.split(/\s+/)[0])}. Your application for <b>${esc(ROLES[r.role].title)}</b> has been received.</p>
      <p class="cr-ref">${icon('ticket')} Reference ${esc(r.reference)}</p>
      <p>Keep this reference for any questions. You can reach us at <a class="cr-link" href="mailto:${EMAIL}">${EMAIL}</a> or <a class="cr-link" href="tel:${PHONE_TEL}">${PHONE}</a>.</p>
      <p class="cr-result-next">What happens next</p>
      <ol>
        <li>We read your written answers first — the primary-evaluation question carries the most weight.</li>
        <li>If you are shortlisted, we contact you by phone or email to arrange a 30-minute Commercial Review call.</li>
        <li>Next comes your Role Plan, then an offer with the confirmed pay structure, KPI benchmark and joining date in writing.</li>
      </ol>
      <div class="cr-cta-row"><a class="cr-btn cr-btn-primary" href="#positions">See other open positions ${icon('arrow-right')}</a><a class="cr-btn cr-btn-outline" href="./#/">Back to Aeroskys.com</a></div>
    </div>`;
    if (scroll) { const el = $('[data-result]', host); scrollToEl(el); el.focus({ preventScroll: true }); }
  }

  function downloadCopy() {
    const r = ROLES[role];
    const a = st.about, ans = answers();
    const lines = [`AeroSkys Career Application – ${r.title} (Position ${r.num})`, '', `Full name: ${a.name}`, `Email: ${a.email}`, `Phone: ${a.cc} ${a.phone}`, `Current location: ${a.location}`, `CV link: ${a.cvLink || '—'}`, `Notice period: ${a.notice}`, ''];
    let n = 0;
    for (const g of r.groups) {
      lines.push(`== ${g.title} ==`, '');
      for (const q of g.questions) {
        lines.push(`${pad(++n)}. ${q.text}`);
        if (q.kind === 'pair') lines.push(`${q.ph1}: ${ans[q.id] || '—'}`, `${q.ph2}: ${ans[q.id2] || '—'}`);
        else if (q.kind === 'table') {
          q.tableRows.forEach((t, i) => { if (String(ans[t.kpi] ?? '').trim()) lines.push(`KPI ${i + 1}: ${ans[t.kpi]} | Lean: ${ans[t.lean] || '—'} | Over-target: ${ans[t.over] || '—'} | Time to lean: ${ans[t.tlean] || '—'} | Time to over-target: ${ans[t.tover] || '—'}`); });
          lines.push(`${q.noteLabel}: ${ans[q.noteId] || '—'}`);
        } else lines.push(String(ans[q.id] || '—'));
        lines.push('');
      }
    }
    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: `AeroSkys-application-${r.key}.txt` });
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    /** Show the application for a designation (keeps the visitor's answers for each one). */
    setRole(key) {
      if (!isRole(key)) return;
      if (key === role && !result) return;
      saveLater.flush();
      host.removeEventListener('click', onClick);
      role = key; result = null; failure = null; confirm = false; confirmReset = false; current = 0;
      render();
    }
  };
}
