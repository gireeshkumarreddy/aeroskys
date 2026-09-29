// Flight inventory simulator. Deterministic for a given route/date so results,
// date-strip fares and saved bookings always agree. Mirrors the live site's
// fare families, fare rules, baggage and instant-discount behaviour.
import { AIRPORT, REGION, distanceKm } from '../data/airports.js';
import { AIRLINES, airline } from '../data/airlines.js';
import { rng, hash } from '../core/rng.js';
import { diffDays, parse, today, addDays } from '../core/format.js';

export const CABINS = { E: 'Economy', W: 'Premium Economy', B: 'Business', F: 'First' };
export const INDIAN = ['6E', 'AI', 'IX', 'QP', 'SG', '9I'];
const METRO = ['DEL', 'BOM', 'BLR', 'HYD', 'MAA', 'CCU'];
const GATEWAY = ['DEL', 'BOM', 'BLR', 'HYD', 'MAA', 'CCU', 'COK', 'AMD', 'TRV', 'CCJ', 'GOI', 'GOX', 'LKO', 'ATQ', 'JAI', 'PNQ', 'IXE', 'TRZ', 'CJB', 'VNS', 'GAU', 'BBI', 'IXZ', 'SXR'];
const DOM_HUBS = ['DEL', 'BOM', 'BLR', 'HYD', 'CCU', 'MAA'];

export const FARE_NOTES = [
  'Although we will try to keep this section updated regularly.',
  'Feel free to call our Contact Centre for exact cancellation/change fee.',
  'Cancellation/Date change request will be accepted 30 hrs prior to departure.',
  'GST + RAF charges applicable on cancellation/Reissue penalty.'
];
export const EXCLUSIVE_NOTES = [
  'A booking confirmation will take a minimum of 30 to 45 Minutes.',
  'Seats are subject to availability, In case of non-availability of the seats, We will refund the full amount.',
  'This exclusive deal is 100% Non-Refundable, Non-Changeable & Non-Cancellable.',
  'You will be able check the status of your PNR on airline website or call center but names will be update 12 to 24 hrs prior to the flight departure.',
  'Web check-in is mandatory to board flights.',
  'You cannot avail a GST Input Credit on this Fare',
  'Seat, meals and other add-ons can only be pre-purchased at the time of Web Check-in and not while booking',
  'You Must verify the terminal information and flight timing with the boarding pass'
];
export const PLATFORM_FEE = 300; // per passenger per sector, charged on cancellation / reissue (prototype value)

const regionOf = ap => REGION[ap.cc] || 'other';
export const isDomestic = (a, b) => AIRPORT[a]?.cc === 'IN' && AIRPORT[b]?.cc === 'IN';
const blockTime = (km, r) => Math.max(45, Math.round((km / 780 * 60 + 40) / 5) * 5 + r.int(-1, 2) * 5);

function terminal(code, al, intl, r) {
  const t = n => 'Terminal ' + n;
  switch (code) {
    case 'DEL': return intl || al === 'AI' || al === 'IX' ? t(3) : al === '6E' ? t(r.pick(['1', '2', '3'])) : t(1);
    case 'BOM': return intl || al === 'AI' ? t(2) : t(1);
    case 'BLR': return intl || al === 'AI' || al === 'IX' ? t(2) : t(1);
    case 'MAA': return intl ? t(2) : t(1);
    case 'CCU': return intl ? t(2) : t(1);
    case 'DXB': return al === 'EK' ? t(3) : al === 'FZ' ? t(2) : t(1);
    case 'LHR': return al === 'BA' ? t(5) : al === 'VS' || al === 'EK' ? t(3) : al === 'QR' || al === 'EY' ? t(4) : t(2);
    case 'SIN': return al === 'SQ' ? t(r.pick(['2', '3'])) : t(r.pick(['1', '4']));
    case 'DOH': case 'AUH': case 'HYD': case 'COK': case 'AMD': case 'GOX': return t(1);
    case 'JFK': return t(r.pick(['1', '4', '8']));
    case 'CDG': return t('2' + r.pick(['E', 'F']));
    case 'FRA': return t(1);
    case 'BKK': case 'KUL': case 'IST': case 'MLE': case 'CMB': case 'KTM': return '';
    default: return AIRPORT[code]?.cc === 'IN' ? t(1) : '';
  }
}

function aircraftFor(code, km, r) {
  const al = airline(code);
  if (code === '9I' || (km < 650 && code === '6E' && r.chance(.45))) return 'ATR 72-600';
  if (km > 4600 && al.wb?.length) return r.pick(al.wb);
  return r.pick(al.nb || al.wb || ['A320']);
}

function flightNumber(code, r) {
  const [a, b] = airline(code).range || [100, 999];
  return `${code}-${r.int(a, b)}`;
}

/** Which carriers can plausibly fly A→B, and how (direct or via a hub). */
function carriersFor(A, B, km) {
  const dom = A.cc === 'IN' && B.cc === 'IN';
  const ra = regionOf(A), rb = regionOf(B);
  const out = [];
  if (dom) {
    for (const code of INDIAN) {
      if (code === '9I' && km > 1500) continue;
      out.push({ code, via: null });
      for (const h of DOM_HUBS) {
        if (h === A.code || h === B.code) continue;
        const detour = (distanceKm(A, AIRPORT[h]) + distanceKm(AIRPORT[h], B)) / km;
        if (detour < 1.9 && code !== '9I') out.push({ code, via: h });
      }
    }
    return out;
  }
  const indianEnd = A.cc === 'IN' ? A : B.cc === 'IN' ? B : null;
  for (const [code, al] of Object.entries(AIRLINES)) {
    const homeA = al.home === A.cc, homeB = al.home === B.cc;
    if (homeA || homeB) {
      const other = homeA ? rb : ra;
      if (!(al.net.includes(other) || regionOf(homeA ? B : A) === regionOf(homeA ? A : B))) continue;
      if (INDIAN.includes(code)) {
        if (['IX', 'QP', 'SG'].includes(code) && km > 4700) continue;
        if (code === '6E' && km > 7600) continue;
        if (!al.net.includes(other)) continue;
      }
      const smallIndian = indianEnd && !GATEWAY.includes(indianEnd.code);
      if (smallIndian) {
        if (!INDIAN.includes(code)) continue;
        const hub = al.hubs.find(h => h !== indianEnd.code);
        if (hub) out.push({ code, via: hub });
        continue;
      }
      out.push({ code, via: null });
      if (km > 5200 && al.hubs.length > 1) {
        const alt = al.hubs.find(h => h !== A.code && h !== B.code);
        if (alt) out.push({ code, via: alt });
      }
    } else {
      if (indianEnd && !GATEWAY.includes(indianEnd.code)) continue;
      if (!(al.net.includes(ra) && al.net.includes(rb))) continue;
      let best = null;
      for (const h of al.hubs) {
        if (h === A.code || h === B.code) continue;
        const H = AIRPORT[h]; if (!H) continue;
        const detour = (distanceKm(A, H) + distanceKm(H, B)) / km;
        if (!best || detour < best.detour) best = { h, detour };
      }
      const limit = km > 6500 ? 1.45 : km > 2500 ? 1.6 : 1.35;
      if (best && best.detour < limit) out.push({ code, via: best.h });
    }
  }
  return out;
}

function frequency(code, via, A, B, dom, r) {
  if (via) return dom ? r.int(0, 2) : r.int(1, 2);
  if (dom) {
    const MAJOR = [...METRO, 'GOI', 'GOX', 'COK', 'AMD', 'PNQ', 'JAI', 'LKO', 'TRV', 'SXR', 'PAT', 'GAU', 'IXB', 'IXZ'];
    const metro = METRO.includes(A.code) && METRO.includes(B.code);
    const busy = !metro && ((METRO.includes(A.code) && MAJOR.includes(B.code)) || (METRO.includes(B.code) && MAJOR.includes(A.code)));
    const oneMetro = METRO.includes(A.code) || METRO.includes(B.code);
    const t = metro ? 0 : busy ? 1 : oneMetro ? 2 : 3;
    const table = { '6E': [[8, 13], [4, 8], [2, 5], [1, 2]], AI: [[5, 8], [2, 4], [1, 3], [0, 1]], QP: [[3, 5], [1, 3], [0, 2], [0, 1]], SG: [[2, 4], [1, 2], [0, 2], [0, 1]], IX: [[3, 5], [1, 3], [1, 2], [0, 1]], '9I': [[0, 1], [0, 1], [0, 1], [0, 1]] };
    const base = (table[code] || table['9I'])[t];
    return r.int(base[0], base[1]);
  }
  const al = airline(code);
  return al.home === 'IN' ? r.int(1, 3) : r.int(1, 2);
}

const SLOTS = [5 * 60, 6 * 60 + 10, 7 * 60 + 5, 8 * 60 + 40, 10 * 60 + 15, 11 * 60 + 55, 13 * 60 + 40, 15 * 60 + 20, 16 * 60 + 45, 18 * 60 + 5, 19 * 60 + 55, 21 * 60 + 25, 22 * 60 + 45];

// ---------- Pricing ----------
function adultBase(km, dom, cabin, days, dow, depH, type, stops, r) {
  let p = dom ? 2600 + km * 3.2 : 5000 + km * 4.6;
  p *= days <= 1 ? 1.95 : days <= 3 ? 1.6 : days <= 7 ? 1.32 : days <= 14 ? 1.14 : days <= 30 ? 1.02 : days <= 60 ? .94 : .9;
  p *= [1.08, .98, .96, .97, 1.02, 1.1, 1.0][dow];
  p *= depH < 5 ? .92 : depH < 9 ? 1.08 : depH < 17 ? .98 : depH < 21 ? 1.06 : .95;
  p *= type === 'lcc' ? .93 : type === 'regional' ? 1.04 : 1.12;
  if (stops) p *= .92 + r() * .1;
  p *= .94 + r() * .2;
  p *= { E: 1, W: 1.85, B: dom ? 3.5 : 4.3, F: 7.2 }[cabin] || 1;
  return p;
}
const taxOf = (base, dom) => Math.round(dom ? 650 + base * .1 : 1800 + base * .21);

function families(code, dom, cabin, km) {
  const al = airline(code), lcc = al.type === 'lcc';
  const ck = dom ? 15 : lcc ? 20 : 25;
  if (cabin === 'B' || cabin === 'F') {
    return [
      { id: 'BSV', name: `${CABINS[cabin]} Saver`, mult: 1, refundable: true, bag: [dom ? 35 : 40, 14], change: 3000, cancel: dom ? 4500 : 9000, meal: true, seat: true, note: `IN ${CABINS[cabin].toUpperCase()} SAVER, COMPLIMENTARY MEALS, LOUNGE ACCESS AND PREFERRED SEATS ARE INCLUDED.` },
      { id: 'BFX', name: `${CABINS[cabin]} Flex`, mult: 1.22, refundable: true, bag: [dom ? 40 : 50, 14], change: 0, cancel: dom ? 1500 : 3000, meal: true, seat: true, note: `IN ${CABINS[cabin].toUpperCase()} FLEX, DATE CHANGES ARE FREE (FARE DIFFERENCE APPLIES) AND CANCELLATION CHARGES ARE REDUCED.` }
    ];
  }
  const out = [];
  const exclusiveNote = 'IN EXCLUSIVE FARE, EXCESS BAGGAGE, MEALS, AND STANDARD SEAT SELECTION ARE CHARGEABLE AS PER AIRLINE POLICY.';
  const exclusiveSpecial = 'SPECIAL FARE. PASSENGER NAME WILL BE UPDATED 12 TO 24 HOURS PRIOR TO DEPARTURE ON THE AIRLINE WEBSITE | NON-REFUNDABLE/NON-CHANGEABLE/NO SHOW NO REFUND / INSTANT PURCHASE FARE';
  out.push({ id: 'EXC', name: 'Exclusive Fare', mult: .9, exclusive: true, refundable: false, bag: [ck, 7], change: null, cancel: null, meal: false, seat: false, note: exclusiveNote, special: exclusiveSpecial, optional: true });
  if (lcc || al.type === 'regional') {
    out.push({ id: 'ONL', name: 'Online Fare', mult: 1, refundable: true, bag: [ck, 7], change: dom ? 2999 : 3999, cancel: dom ? 3500 : 4500, meal: false, seat: false, note: 'IN ONLINE FARES, SERVICES SUCH AS EXCESS BAGGAGE, MEALS, AND STANDARD SEAT SELECTION ARE CHARGEABLE IN ACCORDANCE WITH THE AIRLINE’S POLICY.' });
    out.push({ id: 'FLX', name: 'Flexi Fare', mult: 1.03, refundable: true, bag: [ck, 7], change: 0, cancel: dom ? 2500 : 3500, meal: true, seat: true, note: 'IN FLEXI FARE, EXCESS BAGGAGE IS CHARGEABLE AS PER AIRLINE POLICY. COMPLIMENTARY MEALS AND STANDARD SEAT SELECTION ARE INCLUDED.' });
    if (dom) out.push({ id: 'ZCF', name: 'Zero Cancellation Fare*', mult: 1.09, refundable: true, zeroCancel: true, bag: [ck, 7], change: 2999, cancel: 0, meal: false, seat: false, note: '*YOU CAN CANCEL THE TICKET UP TO 26 HOURS BEFORE FLIGHT DEPARTURE TIME AND GET A FULL REFUND ON CANCELLATION.' });
    out.push({ id: 'UPF', name: 'Upfront Fare', mult: 1.42, refundable: true, bag: [dom ? 20 : 30, 7], change: 0, cancel: 1500, meal: true, seat: true, note: 'IN UPFRONT FARE, EXCESS BAGGAGE IS CHARGEABLE AS PER AIRLINE POLICY. COMPLIMENTARY MEALS AND STANDARD SEAT SELECTION ARE INCLUDED.' });
    if (code === '6E' && km < 3500) {
      out.push({ id: 'STR', name: 'Stretch Business Class', mult: 3.7, refundable: true, bag: [30, 12], pieces: 2, change: 0, cancel: 1500, meal: true, seat: true, upgrade: true, note: 'In STRETCH BUSINESS CLASS, excess baggage is chargeable as per airline policy. Complimentary meals, a premium seat with charging outlet, and Fast Forward are included.' });
    }
  } else {
    out.push({ id: 'SAV', name: 'Economy Saver', mult: 1, refundable: true, bag: [ck, 7], change: 3000, cancel: dom ? 4000 : 6500, meal: !dom || code !== 'AI' ? true : true, seat: false, note: 'IN ECONOMY SAVER, COMPLIMENTARY MEALS ARE INCLUDED. PREFERRED SEATS AND EXCESS BAGGAGE ARE CHARGEABLE AS PER AIRLINE POLICY.' });
    out.push({ id: 'VAL', name: 'Economy Value', mult: 1.13, refundable: true, bag: [ck + 5, 7], change: 2000, cancel: dom ? 3000 : 4500, meal: true, seat: true, note: 'IN ECONOMY VALUE, COMPLIMENTARY MEALS AND STANDARD SEAT SELECTION ARE INCLUDED. REDUCED CHANGE AND CANCELLATION CHARGES APPLY.' });
    out.push({ id: 'FLE', name: 'Economy Flex', mult: 1.34, refundable: true, bag: [ck + 10, 7], change: 0, cancel: dom ? 1000 : 2000, meal: true, seat: true, note: 'IN ECONOMY FLEX, DATE CHANGES ARE FREE (FARE DIFFERENCE APPLIES). COMPLIMENTARY MEALS AND ANY STANDARD SEAT ARE INCLUDED.' });
    out.push({ id: 'BUS', name: 'Business Class', mult: dom ? 3.4 : 4.1, refundable: true, bag: [dom ? 35 : 40, 14], pieces: 2, change: 0, cancel: dom ? 3000 : 6000, meal: true, seat: true, upgrade: true, note: 'IN BUSINESS CLASS, CHEF-CURATED MEALS, LOUNGE ACCESS, PRIORITY CHECK-IN AND FLAT OR RECLINER SEATS ARE INCLUDED.' });
  }
  return out;
}

function priceFare(fam, base, dom, special, r, i) {
  let b = base * fam.mult * (fam.optional ? .98 : 1);
  if (special === 'senior' && !fam.exclusive) b *= .92;
  b = Math.round(b / 5) * 5 + (i ? 0 : r.int(0, 4));
  const tax = fam.exclusive ? Math.round(dom ? 100 + b * .02 : 400 + b * .08) : taxOf(b, dom);
  const total = b + tax;
  const discPct = (fam.exclusive ? .005 : .008) + r() * .012;
  const discount = Math.round(total * discPct * 100) / 100;
  return { base: b, tax, total, discount, payable: Math.round((total - discount) * 100) / 100 };
}

const cache = new Map();

/**
 * @param q { from, to, date (ISO), cabin: E|W|B|F, fare: regular|student|senior }
 */
export function searchFlights(q) {
  const cabin = q.cabin || 'E', special = q.fare || 'regular';
  const key = `${q.from}-${q.to}-${q.date}-${cabin}-${special}`;
  if (cache.has(key)) return cache.get(key);
  const A = AIRPORT[q.from], B = AIRPORT[q.to];
  if (!A || !B || A.code === B.code) return { results: [], error: 'route' };
  const km = distanceKm(A, B), dom = A.cc === 'IN' && B.cc === 'IN';
  const days = Math.max(0, diffDays(today(), q.date));
  const dow = parse(q.date).getDay();
  const r = rng(`${q.from}${q.to}${q.date}${cabin}`);
  const routeR = rng(`${q.from}${q.to}`);
  const cand = carriersFor(A, B, km);
  const results = [];
  for (const c of cand) {
    const n = frequency(c.code, c.via, A, B, dom, routeR);
    const slotPool = routeR.shuffle(SLOTS);
    for (let k = 0; k < n; k++) {
      const fr = rng(`${q.from}${q.to}${c.code}${c.via || ''}${k}`);
      let dep = (slotPool[k % slotPool.length] + fr.int(-3, 3) * 5 + (k >= slotPool.length ? 25 : 0));
      if (!dom && fr.chance(.3)) dep = fr.pick([60, 90, 125, 160, 200, 250, 1410]);
      dep = ((dep % 1440) + 1440) % 1440;
      const segs = [];
      let utc = dep - A.tz * 60;
      const legs = c.via ? [[A, AIRPORT[c.via]], [AIRPORT[c.via], B]] : [[A, B]];
      const layovers = [];
      legs.forEach(([x, y], li) => {
        const lkm = distanceKm(x, y);
        const block = blockTime(lkm, fr);
        if (li > 0) {
          const lay = fr.chance(dom ? .25 : .1) ? fr.int(8, 14) * 60 + fr.int(0, 11) * 5 : fr.int(14, 58) * 5 + 55;
          layovers.push({ at: x.code, city: x.city, min: lay });
          utc += lay;
        }
        const segCode = c.code;
        const intl = x.cc !== y.cc;
        segs.push({
          airline: segCode, flightNo: flightNumber(segCode, fr), aircraft: aircraftFor(segCode, lkm, fr),
          from: x.code, to: y.code, depUTC: utc, arrUTC: utc + block, block, km: Math.round(lkm),
          depTerminal: terminal(x.code, segCode, intl, fr), arrTerminal: terminal(y.code, segCode, intl, fr), fareClass: fr.pick(['R', 'T', 'Q', 'V', 'S', 'U', 'L', 'M'])
        });
        utc += block;
      });
      const arrLocal = utc + B.tz * 60;
      const depLocal = dep;
      const duration = utc - (dep - A.tz * 60);
      const type = airline(c.code).type;
      const base = adultBase(km, dom, cabin, days, dow, depLocal / 60, type, legs.length - 1, fr);
      const fams = families(c.code, dom, cabin, km).filter(f => !f.optional || fr.chance(.5));
      const fares = fams.map((f, i) => {
        const p = priceFare(f, base, dom, special, fr, i);
        const bag = { checkin: f.bag[0] + (special === 'student' && !f.upgrade ? 10 : 0), cabin: f.bag[1], pieces: f.pieces || 1 };
        return { ...f, ...p, bag, seats: f.exclusive ? fr.int(1, 9) : fr.int(3, 9) };
      }).sort((x, y) => x.payable - y.payable);
      const id = `${q.from}${q.to}${q.date.replace(/-/g, '')}${cabin}${special[0]}-${segs.map(s => s.flightNo.replace('-', '')).join('')}-${depLocal}`;
      results.push({
        id, from: q.from, to: q.to, date: q.date, cabin, special, dom, km: Math.round(km),
        airline: c.code, segments: segs, stops: segs.length - 1, via: c.via ? [c.via] : [], layovers,
        depMin: depLocal, arrMin: arrLocal - (0) , dayOffset: Math.floor(arrLocal / 1440), duration,
        fares, cheapest: fares[0]
      });
    }
  }
  // Remove exact duplicates (same airline and departure time)
  const seen = new Set();
  const uniq = results.filter(x => { const k = x.airline + x.depMin + x.stops; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.cheapest.payable - b.cheapest.payable);
  const out = { q: { ...q, cabin, fare: special }, results: uniq, km: Math.round(km), dom };
  cache.set(key, out);
  if (cache.size > 400) cache.delete(cache.keys().next().value);
  return out;
}

export function lowestFare(q) {
  const res = searchFlights(q).results;
  return res.length ? Math.min(...res.map(r => r.cheapest.payable)) : null;
}

export function fareStrip(q, center, span = 15) {
  const out = [];
  const t = today();
  for (let i = -span; i <= span; i++) {
    const d = addDays(center, i);
    if (d < t) continue;
    out.push({ date: d, price: lowestFare({ ...q, date: d }) });
  }
  return out;
}

export function findItinerary(id) {
  const m = id.match(/^([A-Z]{3})([A-Z]{3})(\d{4})(\d{2})(\d{2})([EWBF])([rsg])-/);
  if (!m) return null;
  const q = { from: m[1], to: m[2], date: `${m[3]}-${m[4]}-${m[5]}`, cabin: m[6], fare: { r: 'regular', s: 'student', g: 'senior' }[m[7]] };
  return searchFlights(q).results.find(r => r.id === id) || null;
}

/** Passenger-level price for a chosen fare. Children pay adult fare domestically,
 *  75% of the base internationally; infants pay a flat domestic fee or 10% abroad. */
export function paxPricing(it, fare, pax) {
  const lines = [];
  const add = (type, n, base, tax) => { if (n > 0) lines.push({ type, n, base, tax }); };
  add('Adult', pax.adt, fare.base, fare.tax);
  if (pax.chd) add('Child', pax.chd, it.dom ? fare.base : Math.round(fare.base * .75), it.dom ? fare.tax : Math.round(fare.tax * .85));
  if (pax.inf) add('Infant', pax.inf, it.dom ? 1500 : Math.round(fare.base * .1), it.dom ? 250 : Math.round(fare.tax * .2));
  const base = lines.reduce((s, l) => s + l.base * l.n, 0);
  const tax = lines.reduce((s, l) => s + l.tax * l.n, 0);
  const discount = Math.round(fare.discount * (pax.adt + pax.chd) * 100) / 100;
  return { lines, base, tax, discount, total: Math.round((base + tax - discount) * 100) / 100 };
}

export function timeBucket(min) {
  const h = (min % 1440) / 60;
  return h < 6 ? 'early' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

/** Human summary of the fare rules for display and for cancellation maths. */
export function fareRules(fare, dom) {
  if (fare.exclusive) return { change: 'Non Refundable + Platform Fee', cancel: 'Non Refundable + Platform Fee', refundable: false };
  const money = n => n === 0 ? 'Free (fare difference applies)' : `INR ${n.toLocaleString('en-IN')} + Platform Fee`;
  return {
    change: fare.change == null ? 'Not permitted' : money(fare.change),
    cancel: fare.zeroCancel ? 'Full refund up to 26 hrs before departure; thereafter INR 3,500 + Platform Fee' : fare.cancel == null ? 'Non Refundable' : fare.cancel === 0 ? 'Free' : `INR ${fare.cancel.toLocaleString('en-IN')} + Platform Fee`,
    refundable: fare.refundable
  };
}

export const airportLabel = code => { const a = AIRPORT[code]; return a ? `${a.city} (${a.code})` : code; };
export { hash };
