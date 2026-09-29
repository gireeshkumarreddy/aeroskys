// Roles and application questions for the Careers application.
// AeroForce TAG Manager: sections and questions 01–15 are taken verbatim from the client's
// reference screens (Application, Why Aeroskys, Career Growth, KPI Ownership, Final details).
// TASA and HR question sets follow the question counts on the reference role cards (7 and 9);
// their wording is written from the role descriptions and must be confirmed by the client.

export const ROLES = {
  tag: {
    id: 'tag',
    title: 'AeroForce TAG Manager',
    short: 'TAG Manager',
    summary: 'Build and lead a pod of TASA partners. Measured on the productivity of the pod you build.',
    sections: [
      {
        id: 'track', title: 'Commercial Track Record', nav: 'Commercial Track Record',
        intro: 'Tell us about your experience and achievements.',
        tip: 'Be specific and use real numbers. Clear examples help us understand your impact better.',
        questions: [
          { id: 'q01', required: true, type: 'text', max: 200,
            label: 'What commercial value have you personally generated or been accountable for in the last 12 months?',
            hint: 'Give a specific figure and name the employer, business or client. Use whichever measure fits: revenue, GMV, sales value, gross margin or commission generated.',
            placeholder: 'e.g. ₹4.2 Cr — Employer / client and measure used' },
          { id: 'q02', required: true, type: 'textarea', max: 800,
            label: 'Tell us about one initiative you personally led that improved sales, revenue, margin or profit.',
            hint: 'Include the baseline before you started, what you personally did, the timeframe, and the measurable result.',
            placeholder: 'Baseline → action → timeframe → result' },
          { id: 'q03', required: false, type: 'textarea', max: 800,
            label: 'What is the largest monthly or quarterly commercial target you have personally owned?',
            hint: 'State the figure and timeframe, and explain your specific contribution to achieving it.',
            placeholder: 'Your answer' },
          { id: 'q04', required: false, type: 'textarea', max: 800,
            label: 'Have you managed a sales team, pod, commission-based team, independent agents or a portfolio of accounts?',
            hint: 'Describe the structure, number of people or accounts, the targets, and the commercial value you were responsible for.',
            placeholder: 'Your answer' },
          { id: 'q05', required: true, type: 'textarea', max: 800,
            label: 'Tell us about a significant target you missed.',
            hint: 'What caused the shortfall, how did you identify the problem, what did you change, and what happened afterwards?',
            placeholder: 'Your answer' }
        ]
      },
      {
        id: 'why', title: 'Why <em>Aeroskys?</em>', nav: 'Why Aeroskys',
        intro: 'We’re not just looking for experience — we’re looking for people who believe in what we’re building. Tell us what excites you.',
        tip: 'Be honest and specific. Tell us what genuinely interests you about this role and our business.',
        questions: [
          { id: 'q06', required: true, type: 'textarea', max: 500,
            label: 'Why Aeroskys specifically?',
            hint: 'We are not looking for someone who simply wants a travel-sales or commission-based job. What about the business model, the growth opportunity or the TAG Manager role interests you?',
            placeholder: 'Share your thoughts here…' },
          { id: 'q07', required: true, type: 'textarea', max: 500,
            label: 'Why does a fixed salary plus significant performance upside appeal to you?',
            hint: 'More than a role offering a higher fixed salary with limited performance-based earning potential.',
            placeholder: 'Share your thoughts here…' }
        ]
      },
      {
        id: 'growth', title: 'Career Growth', nav: 'Career Growth',
        intro: 'A few questions to understand your long-term goals and ambitions.',
        tip: 'Share your aspirations with us — it helps us understand how we can grow together.',
        tipTitle: 'Your next step matters.',
        questions: [
          { id: 'q08', required: true, type: 'textarea', max: 500,
            label: 'If you perform strongly, where would you expect to be after 12 months? After 3 years?',
            hint: 'Describe the level of responsibility you would want to take on, rather than giving a job title.',
            placeholder: 'Your answer…' },
          { id: 'q09', required: true, type: 'textarea', max: 500,
            label: 'What capability do you most want to develop that you do not yet hold at a strong professional level?',
            hint: '',
            placeholder: 'Your answer…' }
        ]
      },
      {
        id: 'kpi', title: 'KPI Ownership <em>&amp; Target Achievement</em>', nav: 'KPI Ownership & Target Achievement',
        intro: 'This section carries the greatest weighting in the assessment. Take your time with it.',
        tip: 'Be specific and practical. Use examples, numbers and clear steps — it helps us understand how you think and operate.',
        questions: [
          { id: 'q10', required: true, type: 'textarea', max: 800,
            label: 'How would you design your own monthly KPI system for your pod?',
            hint: 'Cover the 5–8 KPIs you would track: Month 1, Month 3 and Month 6 targets; how you would measure individual and pod performance; weekly actions to stay on target; what you would do if performance fell behind; and how you would spot opportunities to exceed target.',
            placeholder: 'Share your answer here…' },
          { id: 'q11', required: true, type: 'textarea', max: 800,
            label: 'Walk us through your first 30 days as an AeroForce TAG Manager.',
            hint: 'Assume your pod starts with limited existing production. Set out Days 1–7, Days 8–15 and Days 16–30: recruiting and onboarding the right people, establishing activity, generating bookings and building an operating rhythm.',
            placeholder: 'Share your answer here…' },
          { id: 'q12', required: true, type: 'textarea', max: 800,
            label: 'What would you do differently from an average pod manager to consistently outperform target?',
            hint: 'Be specific: processes, systems, behaviours, experiments or management techniques you would introduce.',
            placeholder: 'Share your answer here…' }
        ]
      },
      {
        id: 'final', title: 'Final details.<br><em>Almost there.</em>', nav: 'Role-Specific Experience', final: true,
        intro: 'A few last questions to understand your experience, and key strengths. This helps us ensure the right fit — for you and for Aeroskys.',
        tip: 'Be clear, specific and use real examples. This is the final step before we review your application.',
        tipTitle: 'Make it count',
        questions: [
          { id: 'q13', required: true, type: 'textarea', max: 800,
            label: 'What experience do you have recruiting, onboarding or managing non-employee salespeople?',
            hint: 'Independent agents, freelancers, sales associates or channel partners. Describe the number of people, how you managed them, and the measurable commercial results.',
            placeholder: 'Share your experience…' },
          { id: 'q14', required: false, type: 'textarea', max: 800,
            label: 'Have you negotiated a commercial contract or partnership?',
            hint: 'Supplier, vendor, airline, GDS, technology provider or other business partner. Airline, GDS or travel-contract experience is an advantage, not a requirement.',
            placeholder: 'Share details (optional)…' },
          { id: 'q15', required: true, type: 'textarea', max: 800,
            label: 'How do you know your numbers are going off-target before the end of the month?',
            hint: 'The metrics, dashboards, thresholds, review cadence and corrective actions you would use to catch underperformance early.',
            placeholder: 'Share your approach…' }
        ]
      }
    ]
  },

  tasa: {
    id: 'tasa',
    title: 'TASA – Travel Sales Associate',
    short: 'TASA',
    summary: 'Sell flights, hotels, holidays and buses to your own customers, supported by a TAG Manager and pod.',
    sections: [
      {
        id: 'track', title: 'Sales Track Record', nav: 'Sales Track Record',
        intro: 'Tell us about your sales experience so far.',
        tip: 'Be specific and use real numbers. Clear examples help us understand your impact better.',
        questions: [
          { id: 't01', required: true, type: 'textarea', max: 800,
            label: 'Tell us about your sales experience so far.',
            hint: 'The roles you have held, what you sold, who you sold to and for how long. Travel, retail, telesales and field sales all count.',
            placeholder: 'Your answer' },
          { id: 't02', required: true, type: 'textarea', max: 800,
            label: 'What is the best result you have achieved against a sales target?',
            hint: 'Give the figure, the timeframe and what you personally did to get there.',
            placeholder: 'Target → result → timeframe → what you did' },
          { id: 't03', required: true, type: 'textarea', max: 800,
            label: 'How do you find new customers and keep them coming back?',
            hint: 'Walk us through your routine: calls, follow-ups, referrals, social media or walk-ins.',
            placeholder: 'Your answer' }
        ]
      },
      {
        id: 'why', title: 'Why <em>Aeroskys?</em>', nav: 'Why Aeroskys',
        intro: 'We’re looking for people who believe in what we’re building. Tell us what excites you.',
        tip: 'Be honest and specific. Tell us what genuinely interests you about travel sales.',
        questions: [
          { id: 't04', required: true, type: 'textarea', max: 500,
            label: 'Why do you want to sell travel with Aeroskys?',
            hint: 'What interests you about travel sales, and about working with our partner network?',
            placeholder: 'Share your thoughts here…' },
          { id: 't05', required: true, type: 'textarea', max: 500,
            label: 'How do you stay motivated in a role where your results are measured every month?',
            hint: 'Tell us how you plan your days and keep going when targets are demanding.',
            placeholder: 'Share your thoughts here…' }
        ]
      },
      {
        id: 'final', title: 'Final details.<br><em>Almost there.</em>', nav: 'Final Details', final: true,
        intro: 'A few last questions to understand your experience and key strengths.',
        tip: 'Be clear, specific and use real examples. This is the final step before we review your application.',
        tipTitle: 'Make it count',
        questions: [
          { id: 't06', required: false, type: 'textarea', max: 800,
            label: 'Do you have travel-trade, ticketing or GDS experience?',
            hint: 'For example airline ticketing, holiday packages, visa services or a GDS such as Amadeus, Galileo or Sabre. This is an advantage, not a requirement.',
            placeholder: 'Share details (optional)…' },
          { id: 't07', required: false, type: 'text', max: 200,
            label: 'Which languages can you comfortably sell in?',
            hint: 'List the languages you use with customers.',
            placeholder: 'e.g. Hindi, English, Punjabi' }
        ]
      }
    ]
  },

  hr: {
    id: 'hr',
    title: 'HR & Recruitment Specialist',
    short: 'HR & Recruitment',
    summary: 'Build and manage the sales-talent pipeline behind Aeroskys — TASA recruitment and TAG Manager hiring.',
    sections: [
      {
        id: 'track', title: 'Recruitment Track Record', nav: 'Recruitment Track Record',
        intro: 'Tell us about the hiring you have owned.',
        tip: 'Use real numbers where you can: hires, timelines, conversion and retention.',
        questions: [
          { id: 'h01', required: true, type: 'textarea', max: 800,
            label: 'How many hires have you personally closed in the last 12 months, and for which roles?',
            hint: 'Give numbers by role type if you can — for example sales, field or support roles.',
            placeholder: 'Your answer' },
          { id: 'h02', required: true, type: 'textarea', max: 800,
            label: 'Describe a high-volume hiring drive you ran from start to finish.',
            hint: 'Include the number of hires needed, the timeline, the sourcing channels you used and the joining numbers you achieved.',
            placeholder: 'Your answer' },
          { id: 'h03', required: true, type: 'textarea', max: 800,
            label: 'How do you track candidates from first contact to joining?',
            hint: 'The tracker, sheet or system you use, the stages you record, and how you report the pipeline each day or week.',
            placeholder: 'Your answer' },
          { id: 'h04', required: true, type: 'textarea', max: 800,
            label: 'Tell us about a time joining or 30-day retention numbers slipped. What did you change?',
            hint: 'What caused the drop, how you spotted it, what you changed and what happened afterwards.',
            placeholder: 'Your answer' }
        ]
      },
      {
        id: 'why', title: 'Why <em>Aeroskys?</em>', nav: 'Why Aeroskys',
        intro: 'Tell us what interests you about this role.',
        tip: 'Be honest and specific. Tell us what genuinely interests you about this role.',
        questions: [
          { id: 'h05', required: true, type: 'textarea', max: 500,
            label: 'Why does this role at Aeroskys interest you?',
            hint: 'What appeals to you about building the sales-talent pipeline for TASA recruitment and TAG Manager hiring?',
            placeholder: 'Share your thoughts here…' },
          { id: 'h06', required: true, type: 'textarea', max: 500,
            label: 'How would you explain a role with a fixed salary and a performance bonus to a candidate?',
            hint: 'Write it the way you would say it on a screening call.',
            placeholder: 'Share your thoughts here…' }
        ]
      },
      {
        id: 'final', title: 'Final details.<br><em>Almost there.</em>', nav: 'Final Details', final: true,
        intro: 'A few last questions to understand your experience and key strengths.',
        tip: 'Be clear, specific and use real examples. This is the final step before we review your application.',
        tipTitle: 'Make it count',
        questions: [
          { id: 'h07', required: true, type: 'choice', options: ['Basic', 'Intermediate', 'Advanced'],
            label: 'How comfortable are you with Excel or Google Sheets?',
            hint: 'Pick the level that best describes your day-to-day use: trackers, formulas, filters and reports.' },
          { id: 'h08', required: false, type: 'textarea', max: 800,
            label: 'Have you handled onboarding, induction or 30/60/90-day follow-ups before?',
            hint: 'Describe what you did and what you tracked.',
            placeholder: 'Share details (optional)…' },
          { id: 'h09', required: false, type: 'textarea', max: 800,
            label: 'Have you written job posts or recruitment marketing content?',
            hint: 'Where they were published and the response they generated.',
            placeholder: 'Share details (optional)…' }
        ]
      }
    ]
  }
};

export const ROLE_ORDER = ['tag', 'tasa', 'hr'];
export const questionCount = id => ROLES[id].sections.reduce((n, s) => n + s.questions.length, 0);
export const NOTICE_OPTIONS = ['Immediately', '15 days', '30 days', '45 days', '60 days', '90 days', 'Other'];
export const CV_TYPES = { 'application/pdf': 'PDF', 'application/msword': 'DOC', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX' };
export const CV_EXT = /\.(pdf|docx?)$/i;
export const CV_MAX = 10 * 1024 * 1024; // "PDF, DOC or DOCX (max 10 MB)" — reference screen 14

/** The number without its country code or trunk 0, however it was typed ("+971 50…", "0091 98…", "098…", "050…"). */
export function nationalDigits(cc, phone) {
  const raw = String(phone || '').trim();
  const code = String(cc || '').replace(/\D/g, '');
  let d = raw.replace(/\D/g, '');
  if (raw.startsWith('00')) d = d.slice(2);                                    // 00 = international prefix
  if ((raw.startsWith('+') || raw.startsWith('00')) && code && d.startsWith(code)) d = d.slice(code.length);
  else if (code === '91' && d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (code !== '1') d = d.replace(/^0(?=\d{6})/, '');                          // trunk prefix, e.g. 098… / 050…
  return d;
}
