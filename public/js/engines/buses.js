// Bus inventory simulator. Deterministic for a given route, date and bus id, so the
// results list, seat maps, the review page (after a refresh) and saved bookings agree.
// Route level (stable every day): which operators run, coach types, departure times,
// boarding / dropping points. Date level: which services run, fares and seat status.
// No DOM access — safe to import in Node for testing.
import { rng } from '../core/rng.js';
import { parse, today, addDays, hm12 } from '../core/format.js';
import { busCity } from '../data/cities.js';
import { BUS_TYPES, OPERATORS, CITY_META, CITY_BY_CODE, BUS_POINTS, CORRIDORS, REGION_AFFINITY } from '../data/bus.js';

export const MAX_SEATS = 6;            // seats per booking
export const MAX_KM = 2200;            // longer pairs have no road services
export const GST_RATE = 0.05;          // operator GST on AC buses
export const BOOKING_CUTOFF = 30;      // online booking closes this many minutes before departure

/** Cancellation charges, matching refundQuote() in engines/bookings.js. */
export const CANCEL_TIERS = [
  { label: 'More than 48 hrs before departure', charge: 10 },
  { label: '24 – 48 hrs before departure', charge: 25 },
  { label: '6 – 24 hrs before departure', charge: 50 },
  { label: 'Within 6 hrs of departure or after departure', charge: 100 }
];

/** Departure / arrival time buckets used by the filters. */
export const TIME_BUCKETS = [
  { id: 'early', label: 'Before 6AM', icon: 'sunrise' },
  { id: 'morning', label: '6AM - 12PM', icon: 'sun' },
  { id: 'afternoon', label: '12PM - 6PM', icon: 'sunset' },
  { id: 'night', label: 'After 6PM', icon: 'moon' }
];
export function timeBucket(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  return m < 360 ? 'early' : m < 720 ? 'morning' : m < 1080 ? 'afternoon' : 'night';
}

// ---------------------------------------------------------------- helpers
const pad = n => String(n).padStart(2, '0');
const round5 = m => Math.round(m / 5) * 5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** Bus-style fares: rounded to end in 9 (239, 249, 399…), never below ₹199. */
const fare9 = v => Math.max(199, Math.round(v / 10) * 10 - 1);

/** Journey length as on the live cards: "05:05 hrs". */
export const hrsLabel = mins => `${pad(Math.floor(mins / 60))}:${pad(Math.round(mins % 60))} hrs`;

function haversine(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
/** Road distance ≈ great-circle distance × 1.25. */
export const roadKm = (a, b) => Math.round(haversine(a, b) * 1.25);

/** Typical door-to-door time: 52 km/h on the plains (42 km/h into the hills) plus a 20-minute halt every 220 km. */
function travelMinutes(km, hill) {
  return Math.max(45, round5(km / (hill ? 42 : 52) * 60 + Math.floor(km / 220) * 20));
}

// ---------------------------------------------------------------- caches
const routeCache = new Map();
const dayCache = new Map();
const layoutCache = new Map();
const remember = (map, key, value, max) => {
  map.set(key, value);
  if (map.size > max) map.delete(map.keys().next().value);
  return value;
};

// ---------------------------------------------------------------- route info
/**
 * @returns {{ ok: boolean, reason?: 'unknown'|'same'|'far', A, B, km, hill, duration, overnight }}
 * A and B are BUS_CITIES entries (canonical names), duration the typical journey in minutes.
 */
export function routeInfo(from, to) {
  const A = busCity(from), B = busCity(to);
  if (!A || !B || !CITY_META[A.name] || !CITY_META[B.name]) return { ok: false, reason: 'unknown', A, B };
  if (A.name === B.name) return { ok: false, reason: 'same', A, B };
  const km = roadKm(A, B);
  const hill = CITY_META[A.name].hill || CITY_META[B.name].hill;
  const duration = travelMinutes(km, hill);
  if (km > MAX_KM) return { ok: false, reason: 'far', A, B, km, hill, duration, overnight: true };
  return { ok: true, A, B, km, hill, duration, overnight: duration > 360 };
}

function serviceCount(A, B, km, r) {
  const ma = CITY_META[A.name], mb = CITY_META[B.name];
  const base = ma.tier * mb.tier * 3.2;
  const distF = km < 60 ? .5 : km < 120 ? .8 : km <= 700 ? 1 : km <= 1000 ? .6 : km <= 1400 ? .35 : km <= 1800 ? .18 : .1;
  const regF = REGION_AFFINITY[[ma.region, mb.region].sort().join('|')] ?? .4;
  const bonus = CORRIDORS[[A.name, B.name].sort().join('|')] || 0;
  const n = Math.round(base * distF * regF + bonus * (km > 1000 ? .5 : 1) + r.int(-2, 3));
  return clamp(n, km <= 1500 ? 2 : 1, 55);
}

function typesFor(op, km) {
  return op.types.filter(id => {
    const T = BUS_TYPES[id];
    return T && !(T.maxKm && km > T.maxKm) && !(T.minKm && km < T.minKm);
  });
}

function operatorsFor(A, B, km) {
  const ra = CITY_META[A.name].region, rb = CITY_META[B.name].region;
  const out = [];
  for (const op of OPERATORS) {
    if (op.maxKm && km > op.maxKm) continue;
    const sa = op.regions.includes(ra), sb = op.regions.includes(rb);
    if (!sa && !sb) continue;
    if (ra !== rb && !(sa && sb) && !op.national) continue;
    if (!typesFor(op, km).length) continue;
    let w = op.weight || 1;
    if (op.hubs?.length) {
      const h = (op.hubs.includes(A.name) ? 1 : 0) + (op.hubs.includes(B.name) ? 1 : 0);
      w *= h === 2 ? 5 : h === 1 ? 2.2 : .3;
    }
    out.push({ op, w });
  }
  return out;
}

function weighted(list, r) {
  const total = list.reduce((s, x) => s + x.w, 0);
  let t = r() * total;
  for (const x of list) { t -= x.w; if (t <= 0) return x; }
  return list[list.length - 1];
}

/** Picks k stops in a city and orders them along the direction of travel. */
function pickStops(city, k, dir, r, span) {
  const pts = BUS_POINTS[city] || [];
  const chosen = pts.map((p, i) => ({ i, p, key: r() ** (1 / p.w) }))
    .sort((a, b) => b.key - a.key).slice(0, clamp(k, 1, pts.length))
    .sort((a, b) => (a.p.x * dir[0] + a.p.y * dir[1]) - (b.p.x * dir[0] + b.p.y * dir[1]));
  // Minutes between consecutive stops (city traffic ~24 km/h), scaled into the time budget.
  const gaps = chosen.slice(1).map((c, j) => {
    const prev = chosen[j].p;
    return clamp(round5(Math.hypot(c.p.x - prev.x, c.p.y - prev.y) / 24 * 60), 10, 30);
  });
  const sum = gaps.reduce((s, g) => s + g, 0);
  const scale = sum > span ? span / sum : 1;
  return { idx: chosen.map(c => c.i), gaps: gaps.map(g => Math.max(5, round5(g * scale))) };
}

function amenitiesFor(T, op, r) {
  const a = [];
  const premium = T.premium || op.premium;
  if (T.electric) a.push('electric');
  if (r.chance(T.ac ? .92 : .45)) a.push('water');
  if (T.ac && (T.layout !== 'seater22' || T.semi) && r.chance(.88)) a.push('blanket');
  if (r.chance(T.ac ? .88 : .5)) a.push('charging');
  if (r.chance(T.layout === 'seater22' && !T.semi ? .35 : .8)) a.push('light');
  if (r.chance(premium || T.electric ? .95 : T.ac ? .72 : .5)) a.push('tracking');
  if (premium && r.chance(.6)) a.push('wifi');
  if (r.chance(premium || T.electric ? .85 : .3)) a.push('cctv');
  if (premium && r.chance(.5)) a.push('snacks');
  if (T.ac && T.layout === 'seater22' && r.chance(.25)) a.push('movie');
  if (r.chance(.5)) a.push('safety');
  return a;
}

/** Route-level timetable: the same services every day. */
function routeFor(info) {
  const { A, B, km, hill } = info;
  const key = `${A.name}>${B.name}`;
  if (routeCache.has(key)) return routeCache.get(key);
  const r = rng('busroute:' + key);
  const n = serviceCount(A, B, km, r);
  const ops = operatorsFor(A, B, km);
  const D = info.duration;
  // Unit vector from A to B in km space, to order boarding and dropping stops.
  const dx = (B.lon - A.lon) * 111.32 * Math.cos((A.lat + B.lat) / 2 * Math.PI / 180), dy = (B.lat - A.lat) * 110.57;
  const len = Math.hypot(dx, dy) || 1;
  const dir = [dx / len, dy / len];

  // Departure times: overnight for journeys over 6 hours, spread through the day for short ones.
  const deps = [];
  const spread = (count, lo, hi) => { for (let i = 0; i < count; i++) deps.push(round5(lo + (i + r()) * (hi - lo) / count)); };
  if (D > 360) spread(n, 18 * 60, 23 * 60 + 55);
  else if (D > 240) { const night = Math.round(n * .45); spread(night, 20 * 60, 23 * 60 + 55); spread(n - night, 5 * 60, 19 * 60 + 55); }
  else spread(n, 5 * 60, 23 * 60);
  const depOrder = r.shuffle(deps);

  // Busy corridors are cheaper per km (live Delhi → Jaipur: seats ₹239–249, upper berths ≈ ₹399);
  // the discount is damped on short hops where tolls and fixed costs dominate.
  let competition = (n >= 40 ? .66 : n >= 25 ? .76 : n >= 12 ? .88 : .98) * r.range(.97, 1.03);
  if (km < 250) competition = 1 - (1 - competition) * .45;
  const services = [];
  if (ops.length) {
    for (let i = 0; i < n; i++) {
      const s = rng(`${key}#${i}`);
      const { op } = weighted(ops, s);
      const types = typesFor(op, km);
      let typeId = s.pick(types);
      if (hill && BUS_TYPES[typeId].layout === 'sleeper21' && s.chance(.55)) typeId = types.find(t => t === 'volvo-semi-22') || typeId;
      const T = BUS_TYPES[typeId];
      const dep = Math.min(23 * 60 + 55, depOrder[i]);
      const dur = Math.max(40, round5(D * (T.speed || 1) * s.range(.95, 1.07)));
      const short = dur < 120;
      const board = pickStops(A.name, short ? s.int(1, 2) : s.int(2, 5), dir, s, Math.min(75, dur * .22));
      const drop = pickStops(B.name, short ? s.int(1, 2) : s.int(2, 4), dir, s, Math.min(45, dur * .15));
      services.push({
        op, typeId, dep, dur, board, drop,
        rows: T.rows ? s.int(T.rows[0], T.rows[1]) : 6,
        rateSeat: s.range(1.1, 1.5), rateBerth: s.range(1.7, 2.1), acMult: s.range(1.2, 1.3),
        rating: clamp(Math.round((op.rating + s.range(-.3, .25)) * 10) / 10, 3.1, 4.9),
        ratingCount: Math.round(s.range(90, 2600) * (op.weight || 1)),
        amenities: amenitiesFor(T, op, s)
      });
    }
  }
  services.sort((a, b) => a.dep - b.dep || a.op.name.localeCompare(b.op.name));
  services.forEach((s, i) => { s.idx = i; });
  return remember(routeCache, key, { key, A, B, km, hill, codeA: CITY_META[A.name].code, codeB: CITY_META[B.name].code, competition, services }, 300);
}

// Fri/Sat/Sun departures are dearer and fuller.
const DOW_FARE = [1.06, .97, .96, .97, 1, 1.08, 1.05];

function makeBus(route, s, date) {
  const id = `${route.codeA}${route.codeB}${date.replace(/-/g, '')}${pad(s.idx)}`;
  const r = rng('bus:' + id);
  const T = BUS_TYPES[s.typeId];
  const dow = parse(date).getDay();
  const weekend = dow === 0 || dow === 5 || dow === 6;
  const dayVar = rng(`busday:${route.key}:${date}`).range(.97, 1.05);
  const mult = (T.ac ? s.acMult : 1) * (T.premium || T.electric || s.op.premium ? 1.15 : 1) * route.competition * DOW_FARE[dow] * dayVar * r.range(.97, 1.04);
  // Per-km fare (seater ₹1.1–1.5, sleeper ₹1.7–2.1, AC +20–30%, premium/electric +15%) plus a fixed part.
  const seatBase = route.km * s.rateSeat * mult + (T.ac ? 70 : 45);
  const berthBase = route.km * s.rateBerth * mult + (T.ac ? 50 : 40);

  let load = r.range(.3, .7) + (weekend ? .08 : 0) + (s.dep >= 20 * 60 && s.dep <= 23 * 60 ? .05 : 0);
  if (r.chance(.1)) load = r.range(.86, .95);
  const soldOut = r.chance(weekend ? .05 : .03);

  const arr = s.dep + s.dur;
  const pointsOf = (city, pick, start, forward, prefix) => {
    const pts = BUS_POINTS[city];
    const times = [start];
    if (forward) pick.gaps.forEach(g => times.push(times[times.length - 1] + g));
    else { for (let j = pick.gaps.length - 1; j >= 0; j--) times.unshift(times[0] - pick.gaps[j]); }
    return pick.idx.map((pi, k) => {
      const mins = times[k];
      const off = Math.floor(mins / 1440);
      return { id: prefix + k, mins, dayOffset: off, date: off ? addDays(date, off) : date, time: hm12(mins), name: pts[pi].name, landmark: pts[pi].landmark };
    });
  };
  const boarding = pointsOf(route.A.name, s.board, s.dep, true, 'b');
  const dropping = pointsOf(route.B.name, s.drop, arr, false, 'd');

  return {
    id, idx: s.idx, from: route.A.name, to: route.B.name, date, km: route.km,
    operator: s.op.name, operatorId: s.op.id, opShort: s.op.short, opColor: s.op.color,
    typeId: s.typeId, busType: T.label, ac: !!T.ac, electric: !!T.electric, premium: !!(T.premium || s.op.premium),
    sleeper: T.layout !== 'seater22', seater: T.layout !== 'sleeper21',
    rating: s.rating, ratingCount: s.ratingCount,
    dep: s.dep, arr, dayOffset: Math.floor(arr / 1440), duration: s.dur,
    boarding, dropping, amenities: s.amenities,
    rows: s.rows, seatBase, berthBase, load: clamp(load, .15, .95), soldOut,
    seatsLeft: 0, totalSeats: 0, fareFrom: 0, fareTo: 0, fares: []
  };
}

// ---------------------------------------------------------------- seat layouts
function seaterDeck(deck, rows, twoPlusOne) {
  // 2 + 2: columns 0-1 | aisle 2 | 3-4, last row fills the aisle (5 across).
  // 2 + 1: column 0 single | aisle 1 | 2-3 double, last row fills the aisle (4 across).
  const seats = [];
  const cols = twoPlusOne ? 4 : 5;
  const aisle = twoPlusOne ? 1 : 2;
  let n = 0;
  for (let row = 0; row < rows; row++) {
    const last = row === rows - 1;
    for (let col = 0; col < cols; col++) {
      if (col === aisle && !last) continue;
      const pair = twoPlusOne ? (col >= 2 && !last ? `${deck}${row}R` : null) : (!last || col !== 2 ? `${deck}${row}${col < 2 ? 'L' : 'R'}` : null);
      seats.push({ no: String(++n), deck, type: 'seater', row, col, h: 1, window: col === 0 || col === cols - 1, pair });
    }
  }
  return { id: deck, label: deck === 'lower' ? 'Lower deck' : 'Upper deck', kind: 'seater', cols, rows, seats };
}

function sleeperDeck(deck) {
  // 2 + 1 berths: column 0 single | aisle 1 | 2-3 double; each berth spans two grid rows.
  const seats = [];
  const prefix = deck === 'lower' ? 'L' : 'U';
  let n = 0;
  for (let row = 0; row < 6; row++) {
    for (const col of [0, 2, 3]) seats.push({ no: prefix + (++n), deck, type: 'sleeper', row: row * 2, col, h: 2, window: col !== 2, pair: col === 0 ? null : `${deck}${row}R`, single: col === 0 });
  }
  return { id: deck, label: deck === 'lower' ? 'Lower deck' : 'Upper deck', kind: 'sleeper', cols: 4, rows: 12, seats };
}

/**
 * Seat map for a bus. Deterministic by bus id.
 * @returns {{ decks: [{ id:'lower'|'upper', label, kind, cols, rows, seats }], seats, byNo, seatsLeft, total }}
 * seat = { no, deck, type:'seater'|'sleeper', row, col, h, window, price, status:'available'|'ladies'|'men'|'sold' }
 */
export function seatLayout(bus) {
  if (layoutCache.has(bus.id)) return layoutCache.get(bus.id);
  const T = BUS_TYPES[bus.typeId];
  const r = rng('seats:' + bus.id);
  const decks = T.layout === 'sleeper21' ? [sleeperDeck('lower'), sleeperDeck('upper')]
    : T.layout === 'combo21' ? [seaterDeck('lower', bus.rows, true), sleeperDeck('upper')]
      : [seaterDeck('lower', bus.rows, false)];
  const seats = decks.flatMap(d => d.seats);
  const seatFare = fare9(bus.seatBase), berthFare = fare9(bus.berthBase);
  for (const x of seats) {
    if (x.type === 'seater') x.price = seatFare + (x.window && T.layout === 'seater22' ? 10 : 0);
    else x.price = x.deck === 'lower' ? fare9(bus.berthBase * 1.06) : berthFare;
  }
  // Who has booked what: windows and lower berths go first, the last row last.
  for (const x of seats) {
    const w = (x.window ? 1.15 : .95) * (x.type === 'sleeper' && x.deck === 'lower' ? 1.1 : 1) * (x.row >= (x.type === 'sleeper' ? 10 : bus.rows - 1) ? .8 : 1);
    const sold = bus.soldOut || r() < clamp(bus.load * w, 0, .97);
    x.status = sold ? 'sold' : 'available';
    if (sold) x.soldTo = r.chance(.3) ? 'F' : 'M';
  }
  // A seat next to a woman is offered to women only; next to a man, sometimes to men only.
  const pairs = new Map();
  seats.forEach(x => { if (x.pair) pairs.set(x.pair, [...(pairs.get(x.pair) || []), x]); });
  for (const group of pairs.values()) {
    if (group.length !== 2) continue;
    const [a, b] = group;
    const soldOne = a.status === 'sold' ? a : b.status === 'sold' ? b : null;
    const free = soldOne === a ? b : soldOne === b ? a : null;
    if (!soldOne || !free || free.status !== 'available') continue;
    if (soldOne.soldTo === 'F') free.status = 'ladies';
    else if (r.chance(.5)) free.status = 'men';
  }
  // Operator-reserved ladies seats near the front.
  if (r.chance(.65)) {
    const front = seats.filter(x => x.status === 'available' && x.row <= 2);
    r.shuffle(front).slice(0, r.int(1, 2)).forEach(x => { x.status = 'ladies'; });
  }
  const byNo = Object.fromEntries(seats.map(x => [x.no, x]));
  const open = seats.filter(x => x.status !== 'sold');
  return remember(layoutCache, bus.id, { busId: bus.id, decks, seats, byNo, seatsLeft: open.length, total: seats.length }, 800);
}

// ---------------------------------------------------------------- search
/**
 * All buses for a route and date, sorted by departure time.
 * Every bus: { id, operator, busType, ac, sleeper, seater, dep, arr, dayOffset, duration, boarding[], dropping[],
 *              amenities[], rating, seatsLeft, totalSeats, fareFrom, fareTo, fares[], soldOut, … }
 * Treat the returned objects as read-only (they are cached).
 */
export function searchBuses({ from, to, date }) {
  const info = routeInfo(from, to);
  if (!info.ok || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return [];
  const key = `${info.A.name}|${info.B.name}|${date}`;
  if (dayCache.has(key)) return dayCache.get(key);
  const route = routeFor(info);
  const buses = [];
  const rare = route.services.length < 3;
  for (const s of route.services) {
    if (!rare && rng(`busrun:${route.key}:${s.idx}:${date}`).chance(.05)) continue; // not operating that day
    const b = makeBus(route, s, date);
    const L = seatLayout(b);
    const open = L.seats.filter(x => x.status !== 'sold').map(x => x.price);
    const prices = open.length ? open : L.seats.map(x => x.price);
    b.seatsLeft = L.seatsLeft;
    b.totalSeats = L.total;
    b.soldOut = L.seatsLeft === 0;
    b.fareFrom = Math.min(...prices);
    b.fareTo = Math.max(...prices);
    b.fares = [...new Set(prices)].sort((x, y) => x - y);
    buses.push(b);
  }
  return remember(dayCache, key, buses, 240);
}

/** Rebuilds a bus from its id, e.g. DELJAI2026092807 → Delhi → Jaipur on 28 Sep 2026, service 07. */
export function findBus(id) {
  const m = String(id || '').match(/^([A-Z]{3})([A-Z]{3})(\d{4})(\d{2})(\d{2})(\d{2,3})$/);
  if (!m) return null;
  const from = CITY_BY_CODE[m[1]], to = CITY_BY_CODE[m[2]];
  if (!from || !to) return null;
  return searchBuses({ from, to, date: `${m[3]}-${m[4]}-${m[5]}` }).find(b => b.id === id) || null;
}

/** False once online booking has closed (30 minutes before departure) or the date has passed. */
export function isBookable(bus, now = new Date()) {
  const t = today();
  if (bus.date > t) return true;
  if (bus.date < t) return false;
  return bus.dep - (now.getHours() * 60 + now.getMinutes()) >= BOOKING_CUTOFF;
}

/** Lowest bookable fare for a route and date (INR), or null when nothing is available. */
export function lowestFare({ from, to, date }, now) {
  let best = null;
  for (const b of searchBuses({ from, to, date })) {
    if (b.soldOut || !isBookable(b, now)) continue;
    if (best == null || b.fareFrom < best) best = b.fareFrom;
  }
  return best;
}

/** Fare for chosen seats: base, operator GST (5% on AC buses) and total — all INR. */
export function fareFor(bus, seatNos) {
  const L = seatLayout(bus);
  const seats = seatNos.map(no => L.byNo[no]).filter(Boolean);
  const base = seats.reduce((s, x) => s + x.price, 0);
  const gst = bus.ac ? Math.round(base * GST_RATE) : 0;
  return { seats, base, gst, total: base + gst };
}

/** Days offered in the date strip (never before today, at most a year ahead). */
export function stripDates(center, span = 3) {
  const t = today(), max = addDays(t, 364);
  let start = addDays(center, -span);
  if (start < t) start = t;
  const out = [];
  for (let i = 0; i < span * 2 + 1; i++) { const d = addDays(start, i); if (d <= max) out.push(d); }
  return out;
}
