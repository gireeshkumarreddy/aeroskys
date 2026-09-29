// Money, date and duration formatting.
import { store } from './store.js';
import { CURRENCIES } from '../data/content.js';

const nf = {};
const fmtNum = (locale, opts) => (nf[locale + JSON.stringify(opts)] ||= new Intl.NumberFormat(locale, opts));

export function inr(n, { decimals = false } = {}) {
  const v = Number(n) || 0;
  return '₹' + fmtNum('en-IN', { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 }).format(v);
}

/** Formats an INR amount in the visitor's selected display currency. */
export function money(n, { decimals = false, currency } = {}) {
  const code = currency || store.get('currency') || 'INR';
  if (code === 'INR') return inr(n, { decimals });
  const c = CURRENCIES.find(x => x.code === code) || CURRENCIES[0];
  const v = (Number(n) || 0) / c.rate;
  const sym = code === 'CAD' ? 'C$' : c.symbol;
  return sym + fmtNum('en-GB', { minimumFractionDigits: decimals || v < 100 ? 2 : 0, maximumFractionDigits: decimals || v < 100 ? 2 : 0 }).format(v);
}
export const currencyNote = () => store.get('currency') === 'INR' ? '' : 'Prices converted at indicative rates. You pay in INR.';

// ---------- Dates (ISO yyyy-mm-dd, local time) ----------
const pad = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = s => { if (s instanceof Date) return new Date(s); const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
export const today = () => iso(new Date());
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
export const isValidISO = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(parse(s).getTime());

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Tokens: dddd ddd d dd MMMM MMM MM yyyy yy */
export function fmtDate(s, pattern = 'ddd, d MMM') {
  if (!s) return '';
  const d = parse(s);
  return pattern.replace(/dddd|ddd|dd|d|MMMM|MMM|MM|yyyy|yy/g, t => ({
    dddd: DOWL[d.getDay()], ddd: DOW[d.getDay()], dd: pad(d.getDate()), d: d.getDate(),
    MMMM: MONL[d.getMonth()], MMM: MON[d.getMonth()], MM: pad(d.getMonth() + 1),
    yyyy: d.getFullYear(), yy: String(d.getFullYear()).slice(2)
  })[t]);
}
export const monthName = (m, long = true) => (long ? MONL : MON)[m];
export const dowNames = DOW;

export function relDay(s) {
  const n = diffDays(today(), s);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return fmtDate(s, 'dddd');
}

// ---------- Times & durations ----------
export function hm(mins) {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
}
export function hm12(mins) {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60), ap = h < 12 ? 'AM' : 'PM';
  return `${pad(((h + 11) % 12) + 1)}:${pad(m % 60)} ${ap}`;
}
export function dur(mins) {
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return h ? `${h}h ${pad(m)}m` : `${m}m`;
}
export const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
export function ago(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  return Math.round(s / 86400) + ' d ago';
}
export const titleCase = s => String(s || '').toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
