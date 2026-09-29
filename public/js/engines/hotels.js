// Hotel inventory simulator. Properties, rooms and photos are deterministic per city;
// nightly rates are deterministic per property and date, so results, details, review
// and saved bookings always agree. No DOM access (safe to import in Node).
import { rng } from '../core/rng.js';
import { addDays, diffDays, parse, today, isValidISO, fmtDate } from '../core/format.js';
import { HOTEL_CITIES } from '../data/cities.js';
import {
  HOTEL_META, HOTEL_META_BY_CODE, PHOTOS, PHOTO_LABEL, AMENITIES, AMENITY_PRIORITY, PROPERTY_TYPES, TYPE_NOUN, TYPE_MIX,
  TAG_TYPE_BOOST, STAR_MIX, STAR_BANDS, TYPE_PRICE, MEAL_PP, ROOM_SETS, MEALS, MEAL_DESC, NAME_TEMPLATES, KIND_TEMPLATES,
  LANG_TEMPLATES, WORDS, FAMILY, INDIA_STREETS, TAG_STREETS, ROOM_FEATURES, RATE_PERKS, photoUrl, PHOTO_FALLBACK
} from '../data/hotels.js';

export { MEALS, MEAL_DESC, PROPERTY_TYPES, AMENITIES, photoUrl, PHOTO_FALLBACK, PHOTO_LABEL };
export const MEAL_ORDER = ['RO', 'BB', 'HB', 'FB'];
export const SORTS = [['rec', 'Recommended'], ['price-asc', 'Price Low to High'], ['price-desc', 'Price High to Low'], ['rating-desc', 'Rating High to Low'], ['rating-asc', 'Rating Low to High']];
export const CANCELLATION_POLICY = 'Cancellations made 24 to 72 hours before check-in may be eligible for a full or partial refund, depending on the hotel’s policy. No-shows or last-minute cancellations may incur a full booking charge. Some bookings are marked as non-refundable and cannot be refunded once confirmed.';
export const REFUND_NOTE = 'Refunds, where applicable, are processed to the original payment method within 7–14 business days.';

// ---------------------------------------------------------------- helpers
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round1 = v => Math.round(v * 10) / 10;
/** ₹2,349-style nightly rates. */
const nice = v => Math.max(99, Math.round(v / 10) * 10 - 1);
const inrText = n => '₹' + Math.round(n).toLocaleString('en-IN');
export const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function weighted(r, entries) {
  const list = entries.filter(([, w]) => w > 0);
  const total = list.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of list) { x -= w; if (x < 0) return v; }
  return list[list.length - 1][0];
}

export function distanceKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const ratingLabel = r => r >= 4.5 ? 'Exceptional' : r >= 4.2 ? 'Excellent' : r >= 3.9 ? 'Very Good' : r >= 3.6 ? 'Good' : 'Pleasant';
export const taxLabel = (intl, pct) => intl ? 'Taxes & fees' : `GST${pct ? ` (${Math.round(pct * 100)}%)` : ''}`;
const fold = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z]+/g, ' ').trim();
// Other spellings (including airport city names) that should open a hotel destination.
const CITY_ALIASES = { 'new delhi': 'Delhi', 'bangalore': 'Bengaluru', 'bombay': 'Mumbai', 'calcutta': 'Kolkata', 'madras': 'Chennai', 'cochin': 'Kochi', 'ernakulam': 'Kochi', 'kullu manali': 'Manali', 'kullu': 'Manali', 'denpasar': 'Bali', 'alappuzha': 'Alleppey', 'udhagamandalam': 'Ooty', 'banaras': 'Varanasi', 'benares': 'Varanasi', 'nyc': 'New York', 'panaji': 'Goa', 'panjim': 'Goa' };
export function cityMeta(name) {
  if (HOTEL_META[name]) return HOTEL_META[name];
  const f = fold(name);
  if (!f) return null;
  const hit = Object.values(HOTEL_META).find(m => fold(m.name) === f);
  return hit || HOTEL_META[CITY_ALIASES[f]] || null;
}
export const metaForHotel = id => HOTEL_META_BY_CODE[String(id || '').split('-')[0]] || null;

/** Same codec as ui/search.js paramToRooms (kept local so this module stays DOM-free). */
export function parseRooms(v) {
  const list = Array.isArray(v) ? v : String(v || '').split('|').filter(Boolean).map(part => {
    const [ac, ...ages] = part.split('_');
    const [a, c] = ac.split('-').map(Number);
    return { adults: a, children: c, ages: ages.map(Number) };
  });
  const out = list.map(r0 => {
    const children = clamp(Number(r0.children) || 0, 0, 3);
    const ages = (r0.ages || []).map(Number).filter(n => n >= 0 && n <= 11).slice(0, children);
    while (ages.length < children) ages.push(5);
    return { adults: clamp(Number(r0.adults) || 2, 1, 4), children, ages };
  }).slice(0, 6);
  return out.length ? out : [{ adults: 2, children: 0, ages: [] }];
}

export function occupancy(rooms) {
  const adults = rooms.reduce((n, r0) => n + r0.adults, 0), children = rooms.reduce((n, r0) => n + r0.children, 0);
  return { rooms: rooms.length, adults, children, guests: adults + children };
}

/** Normalises a hotel query ({ city, checkin|in, checkout|out, rooms, star, nat }). */
export function normalizeQuery(q = {}) {
  const meta = cityMeta(q.city);
  const t = today();
  let checkin = q.checkin || q.in, checkout = q.checkout || q.out;
  checkin = isValidISO(checkin) && checkin >= t ? checkin : t;
  checkout = isValidISO(checkout) && checkout > checkin ? checkout : addDays(checkin, 1);
  if (diffDays(checkin, checkout) > 30) checkout = addDays(checkin, 30);
  const rooms = parseRooms(q.rooms);
  const star = q.star && q.star !== 'all' && +q.star >= 1 && +q.star <= 5 ? String(+q.star) : 'all';
  const { adults, children, guests } = occupancy(rooms);
  return { city: meta ? meta.name : String(q.city || ''), meta, checkin, checkout, nights: diffDays(checkin, checkout), rooms, star, nat: q.nat || 'IN', adults, children, guests, roomCount: rooms.length };
}

// ---------------------------------------------------------------- static inventory
const OPENERS = {
  metro: 'Polished service, well-kept rooms and an easy address make it a dependable base for work trips and city breaks alike.',
  heritage: 'Arched corridors, courtyard seating and warm hospitality nod to the city’s storied past.',
  hill: 'Rooms look out over forested slopes, and evenings are made for hot chai on the terrace.',
  beach: 'It is a short hop from the sand, with breezy interiors made for easy beach days.',
  'intl-city': 'Contemporary rooms, an efficient front desk and good transport links make exploring the city simple.',
  'intl-beach': 'Sea breezes, shaded loungers and relaxed service set the pace for slow island days.',
  Resort: 'Landscaped grounds, a generous pool and unhurried service make it ideal for slow, restorative stays.',
  Hostel: 'A sociable base with bright common areas, clean dorms and staff who know the city’s best-kept secrets.',
  Homestay: 'Hosted by a local family, it offers home-cooked meals, insider tips and a genuinely warm welcome.',
  Apartment: 'Spacious units with kitchenettes suit longer stays and families who like their own space.',
  Aparthotel: 'It pairs apartment-style space and kitchenettes with the everyday services of a hotel.',
  Villa: 'Each villa has its own living space and outdoor areas — ideal for families and groups.',
  'Bed & breakfast': 'Expect cosy rooms, a hearty breakfast and hosts who are happy to help plan your days.',
  GuestHouse: 'Simple, spotless rooms and a practical location keep things easy and affordable.',
  Inn: 'Comfortable rooms and friendly, attentive service make it a relaxed, good-value choice.',
  House: 'The whole-home feel — with shared living spaces and a quiet garden — suits small groups and families.'
};

function pickType(meta, area, r) {
  const mix = { ...TYPE_MIX[meta.kind] };
  for (const t of area.tags) {
    const boost = TAG_TYPE_BOOST[t];
    if (boost) for (const [k, f] of Object.entries(boost)) if (mix[k]) mix[k] *= f;
  }
  return weighted(r, Object.entries(mix));
}

function pickStars(type, area, r) {
  const mix = STAR_MIX[type];
  const allowed = mix.map((w, i) => (w > 0 ? i + 1 : 0)).filter(Boolean);
  const lo = allowed[0], hi = allowed[allowed.length - 1];
  let s = weighted(r, mix.map((w, i) => [i + 1, w]));
  if (area.tags.includes('l') && r.chance(.5)) s = Math.min(hi, s + 1);
  if (area.tags.includes('u') && r.chance(.5)) s = Math.max(lo, s - 1);
  if (area.tags.includes('a') && s < 3 && r.chance(.6)) s = Math.min(hi, s + 1);
  return s;
}

function makeName(meta, type, area, r, used, intl) {
  const words = WORDS[meta.words] || WORDS.in;
  const areaOk = !area.tags.includes('n') && area.name.length <= 16;
  for (let attempt = 0; attempt < 14; attempt++) {
    let pool = NAME_TEMPLATES[type];
    const kt = KIND_TEMPLATES[meta.kind]?.[type];
    if (kt && r.chance(.4)) pool = kt;
    const lt = LANG_TEMPLATES[meta.words]?.[type];
    if (lt && r.chance(.6)) pool = lt;
    if (!areaOk || attempt > 8) pool = pool.filter(t => !t.includes('{A}'));
    if (intl) pool = pool.filter(t => !t.includes('{F}'));
    if (!pool.length) pool = ['{W} ' + (type === 'GuestHouse' ? 'Guest House' : type)];
    const tpl = r.pick(pool);
    const bank = intl ? (r.chance(.4) ? WORDS.global : words) : meta.words !== 'in' && r.chance(.25) ? WORDS.in : words;
    const fresh = bank.filter(x => !used.has('w:' + x));
    const w = r.pick(fresh.length && attempt < 10 ? fresh : bank);
    const name = tpl.replace('{W}', w).replace('{A}', area.name).replace('{F}', r.pick(FAMILY[meta.fam] || FAMILY.def)).replace(/^The The /, 'The ');
    if (!used.has(name.toLowerCase())) { used.add(name.toLowerCase()); if (tpl.includes('{W}')) used.add('w:' + w); return name; }
  }
  const fallback = `${r.pick(words)} ${type === 'GuestHouse' ? 'Guest House' : type} ${area.name}`;
  used.add(fallback.toLowerCase());
  return fallback;
}

const GB_LETTERS = 'ABDEFGHJLNPQRSTUWXYZ';
function makeAddress(meta, area, r, intl) {
  if (!intl) {
    const tagStreets = [...area.tags].flatMap(t => TAG_STREETS[t] || []);
    const street = tagStreets.length && r.chance(.6) ? r.pick(tagStreets) : r.pick(INDIA_STREETS);
    const no = r.pick([String(r.int(1, 120)), `Plot ${r.int(2, 90)}`, `${r.int(1, 40)}/${r.int(1, 12)}`, `${r.int(1, 60)}A`]);
    const pin = area.pin || (meta.pin + String(r.int(1, 30)).padStart(6 - meta.pin.length, '0'));
    return `${no}, ${street}, ${area.name}, ${meta.name === 'Delhi' ? 'New Delhi' : meta.name} - ${pin}`;
  }
  const street = r.pick(meta.streets || ['Main Street']);
  const n = r.int(2, 180), pin = area.pin;
  switch (meta.words) {
    case 'ae': return `Plot ${n}, ${street}, ${area.name}, ${meta.name}, United Arab Emirates`;
    case 'sg': return `${n} ${street}, Singapore ${pin}`;
    case 'th': return `${n}/${r.int(1, 30)} ${street}, ${area.name}, ${meta.name} ${pin}`;
    case 'id': return `Jl. ${street} No. ${n}, ${area.name}, Bali ${pin}`;
    case 'my': return `${n}, Jalan ${street}, ${area.name}, ${pin} Kuala Lumpur`;
    case 'np': return `${street}, ${area.name}, Kathmandu ${pin}`;
    case 'lk': return `${n} ${street}, ${area.name}, ${pin.startsWith('00') ? 'Colombo ' + pin : pin}`;
    case 'mv': return /Atoll/.test(area.name) ? `Private island, ${area.name}, Maldives` : `${street}, ${area.name}${pin ? ' ' + pin : ''}, Maldives`;
    case 'gb': return `${n} ${street}, ${area.name}, London ${pin} ${r.int(1, 9)}${GB_LETTERS[r.int(0, 19)]}${GB_LETTERS[r.int(0, 19)]}`;
    case 'fr': return `${n} ${street}, ${pin} ${pin === '92400' ? 'Courbevoie' : 'Paris'}`;
    case 'ch': return `${street} ${n}, ${pin} ${pin === '8302' ? 'Kloten' : 'Zürich'}`;
    case 'tr': return `${street} No:${n}, ${area.name}, ${pin} İstanbul`;
    case 'vn': return `${n} ${street}, ${area.name}, Hanoi`;
    case 'us': return `${n} ${street}, ${area.name}, ${pin.startsWith('112') ? 'Brooklyn' : /^11[14]/.test(pin) ? 'Queens' : 'New York'}, NY ${pin}`;
    case 'au': return `${n} ${street}, ${area.name} NSW ${pin}`;
    default: return `${n} ${street}, ${area.name}, ${meta.name}`;
  }
}

function makeAmenities(type, stars, area, meta, r, intl) {
  const a = new Set(['wifi']);
  const add = (id, p) => { if (r.chance(p)) a.add(id); };
  const hill = meta.kind === 'hill', t = area.tags;
  const hotelish = ['Hotel', 'Resort', 'Aparthotel'].includes(type);
  if (hill) { add('heater', .9); add('ac', stars >= 4 ? .6 : .2); } else add('ac', .97);
  add('tv', stars >= 2 ? .95 : .6);
  add('frontdesk', hotelish ? .95 : stars >= 3 ? .6 : .3);
  add('restaurant', type === 'Resort' || stars >= 4 ? .95 : stars === 3 ? .7 : .25);
  add('roomservice', stars >= 4 ? .95 : stars === 3 ? .6 : .15);
  add('parking', t.includes('c') || intl ? .45 : .8);
  add('pool', type === 'Resort' ? .92 : type === 'Villa' ? .85 : stars === 5 ? .9 : stars === 4 ? .55 : .06);
  add('gym', stars >= 4 ? .85 : stars === 3 ? .3 : .04);
  add('spa', type === 'Resort' ? .7 : stars === 5 ? .85 : stars === 4 ? .4 : .03);
  add('shuttle', t.includes('a') ? .85 : stars >= 4 ? .35 : .08);
  if (!intl) add('power', .9);
  add('laundry', stars >= 3 ? .8 : .45);
  add('lift', stars >= 3 && hotelish ? .92 : .12);
  add('security', .85);
  add('luggage', .6);
  add('bar', stars >= 4 ? .75 : type === 'Hostel' ? .35 : stars === 3 ? .2 : 0);
  add('business', stars >= 4 && hotelish ? .55 : .03);
  add('meeting', stars >= 4 && hotelish ? .55 : stars === 3 ? .15 : 0);
  add('kids', type === 'Resort' ? .65 : stars >= 4 ? .2 : .03);
  add('garden', hill || ['Homestay', 'Villa', 'Resort', 'House'].includes(type) ? .7 : .12);
  add('terrace', meta.kind === 'heritage' || type === 'Hostel' ? .55 : .15);
  if (t.includes('b')) add('beach', .75);
  if (hill) { add('bonfire', .5); add('views', .7); }
  if (t.includes('w') || t.includes('m')) add('views', .55);
  if (['Apartment', 'Aparthotel', 'Villa', 'House'].includes(type)) add('kitchen', .9);
  if (meta.name === 'Rishikesh' || (type === 'Resort' && (hill || t.includes('b')))) add('yoga', .45);
  add('tour', meta.kind === 'metro' || meta.kind === 'intl-city' ? .2 : .5);
  if (intl) add('exchange', .4);
  add('pets', .08);
  add('access', stars >= 4 ? .45 : .06);
  add('cafe', type === 'Hostel' ? .6 : .08);
  add('ev', stars >= 4 ? .15 : 0);
  return a;
}

function roomSetKey(type, stars, meta, area, r) {
  switch (type) {
    case 'Hotel':
      if (meta.words === 'raj' && area.tags.includes('h') && r.chance(.5)) return 'heritage';
      return stars <= 2 ? 'budget' : stars === 3 ? 'mid' : stars === 4 ? 'upper' : 'lux';
    case 'Resort': return 'resort';
    case 'Hostel': return 'hostel';
    case 'Homestay': return 'homestay';
    case 'Bed & breakfast': return 'bnb';
    case 'Inn': return stars <= 2 ? 'budget' : 'mid';
    case 'Apartment': return 'apartment';
    case 'Aparthotel': return 'aparthotel';
    case 'GuestHouse': return 'budget';
    case 'House': return meta.words === 'raj' ? 'heritage' : 'house';
    case 'Villa': return 'villa';
    default: return 'mid';
  }
}

function viewFor(meta, area, r) {
  const t = area.tags;
  if (t.includes('b')) return /Sea|Ocean/.test(meta.view) ? meta.view : 'Sea View';
  if (t.includes('w') || t.includes('m') || meta.kind === 'hill') return meta.view;
  if (t.includes('l') && r.chance(.4)) return 'City View';
  return null;
}

function makeRooms(key, stars, meta, area, r) {
  const set = ROOM_SETS[key];
  const picked = set.filter((x, i) => i === 0 || i === set.length - 1 || r.chance(.72)).slice(-5);
  const view = viewFor(meta, area, r);
  const tier = stars <= 2 ? 0 : stars === 3 ? 1 : stars === 4 ? 2 : 3;
  const hillCold = meta.kind === 'hill';
  const roomPhotos = r.shuffle(PHOTOS.room);
  return picked.map((d, i) => {
    let [name, beds, s0, s1, maxAdults, maxGuests, mult] = d;
    let hasView = false;
    if (view && i > 0 && / Room$/.test(name) && !/View|Dormitory/.test(name) && r.chance(.65)) { name = name.replace(/ Room$/, ` ${view} Room`); mult *= 1.08; hasView = true; }
    let features;
    if (/Dormitory/.test(name)) features = [hillCold ? 'Room heating' : 'Air conditioning', ...ROOM_FEATURES.dorm, 'Free Wi-Fi'];
    else {
      features = [hillCold && stars <= 3 ? 'Room heater' : 'Air conditioning', ...ROOM_FEATURES.base];
      if (tier >= 1) features.push(...ROOM_FEATURES.mid);
      if (tier >= 2) features.push(...ROOM_FEATURES.upper);
      if (tier >= 3) features.push(...ROOM_FEATURES.lux);
      if (/Suite|Bedroom|Entire/.test(name)) features.push(...ROOM_FEATURES.suite);
      if (/Club/.test(name)) features.push(...ROOM_FEATURES.club);
      if (key === 'apartment' || key === 'aparthotel' || /Entire Home/.test(name)) features.push(...ROOM_FEATURES.kitchen);
      if (/Pool Villa|Private Pool/.test(name)) features.push(...ROOM_FEATURES.pool);
      if (hasView) features.push(view);
      if (r.chance(.35)) features.push('Balcony');
    }
    const size = Math.round(r.int(s0, s1) / 5) * 5;
    return {
      id: 'r' + (i + 1), name, beds, size, maxAdults, maxGuests, view: hasView ? view : null,
      mult: Math.round(mult * r.range(.97, 1.04) * 1000) / 1000,
      photos: [roomPhotos[(i * 2) % roomPhotos.length], roomPhotos[(i * 2 + 1) % roomPhotos.length], r.pick(PHOTOS.bath)],
      features: [...new Set(features)]
    };
  });
}

function mealPlans(type, stars, r) {
  switch (type) {
    case 'Hostel': return r.chance(.5) ? ['RO', 'BB'] : ['RO'];
    case 'Bed & breakfast': return r.chance(.3) ? ['RO', 'BB'] : ['BB'];
    case 'Homestay': return ['RO', 'BB', r.chance(.6) && 'HB', r.chance(.2) && 'FB'].filter(Boolean);
    case 'GuestHouse': case 'Inn': return r.chance(.4) ? ['RO', 'BB', 'HB'] : ['RO', 'BB'];
    case 'Apartment': case 'Aparthotel': case 'House': return r.chance(.6) ? ['RO', 'BB'] : ['RO'];
    case 'Resort': return [r.chance(.5) && 'RO', 'BB', 'HB', r.chance(.8) && 'FB'].filter(Boolean);
    case 'Villa': return ['RO', 'BB', r.chance(.5) && 'HB', r.chance(.4) && 'FB'].filter(Boolean);
    default:
      if (stars <= 2) return ['RO', 'BB'];
      if (stars === 3) return r.chance(.5) ? ['RO', 'BB', 'HB'] : ['RO', 'BB'];
      return ['RO', 'BB', r.chance(.7) && 'HB', r.chance(.15) && 'FB'].filter(Boolean);
  }
}

function makePhotos(type, stars, amen, rooms, cover, r) {
  const ext = [cover, ...r.shuffle(PHOTOS.exterior.filter(x => x !== cover)).slice(0, r.int(1, 2))];
  const list = [{ id: ext[0], cat: 'exterior' }];
  if ((['Hotel', 'Resort', 'Aparthotel'].includes(type) && stars >= 3) || r.chance(.25)) list.push({ id: r.pick(PHOTOS.lobby), cat: 'lobby' });
  const roomIds = [...new Set(rooms.flatMap(rm => rm.photos.slice(0, 2)))].slice(0, 4);
  roomIds.forEach(id => list.push({ id, cat: 'room' }));
  list.push({ id: rooms[0].photos[2], cat: 'bath' });
  if (amen.has('restaurant') || amen.has('cafe') || r.chance(.4)) r.shuffle(PHOTOS.dining).slice(0, amen.has('restaurant') ? 2 : 1).forEach(id => list.push({ id, cat: 'dining' }));
  ext.slice(1).forEach(id => list.push({ id, cat: 'exterior' }));
  return list;
}

const inventoryCache = new Map();

/** Every property in a city (static: no dates). */
export function inventory(meta) {
  if (!meta) return [];
  if (inventoryCache.has(meta.code)) return inventoryCache.get(meta.code);
  const city = HOTEL_CITIES.find(c => c.name === meta.name);
  const intl = !!city?.intl;
  const r = rng('hotels:' + meta.code);
  const count = meta.kind === 'metro' || meta.kind === 'intl-city' ? r.int(46, 60) : r.int(32, 50);
  const covers = r.shuffle(PHOTOS.exterior);
  const areaW = meta.areas.map(a => [a, 1 + (a.tags.includes('c') ? .6 : 0) + (a.tags.includes('l') ? .3 : 0) + r() * .7]);
  const used = new Set();
  const list = [];
  for (let i = 1; i <= count; i++) {
    const hr = rng(`${meta.code}:${i}`);
    const area = weighted(hr, areaW);
    const type = pickType(meta, area, hr);
    const stars = pickStars(type, area, hr);
    const name = makeName(meta, type, area, hr, used, intl);
    const address = makeAddress(meta, area, hr, intl);
    const lat = Math.round((area.lat + hr.range(-.006, .006)) * 1e5) / 1e5;
    const lon = Math.round((area.lon + hr.range(-.006, .006) / Math.max(.3, Math.cos(area.lat * Math.PI / 180))) * 1e5) / 1e5;
    const amen = makeAmenities(type, stars, area, meta, hr, intl);
    const key = roomSetKey(type, stars, meta, area, hr);
    const rooms = makeRooms(key, stars, meta, area, hr);
    const plans = mealPlans(type, stars, hr);
    if (plans.some(p => p !== 'RO')) amen.add('breakfast');
    const [lo, hi] = STAR_BANDS[stars];
    let base = (lo + (hi - lo) * Math.pow(hr(), 1.35)) * meta.mult * TYPE_PRICE[type];
    for (const [tag, f] of [['l', 1.12], ['u', .9], ['a', 1.04], ['b', 1.06], ['w', 1.05], ['x', 1.03]]) if (area.tags.includes(tag)) base *= f;
    const rating = round1(clamp(3.25 + stars * .22 + hr.range(-.35, .4) + (type === 'Hostel' ? .15 : 0), 3.2, 4.8));
    const hotelish = ['Hotel', 'Resort', 'Aparthotel'].includes(type);
    const reviews = type === 'Hostel' ? hr.int(300, 3500) : type === 'Homestay' || type === 'Villa' || type === 'House' ? hr.int(14, 420) : hotelish && stars >= 3 ? hr.int(180, 4800) : hr.int(40, 1400);
    const disc = hr.chance(.82) ? hr.range(.12, .38) : 0;
    const early = type === 'Hostel' || type === 'Homestay';
    const photos = makePhotos(type, stars, amen, rooms, covers[(i - 1) % covers.length], hr);
    const landmarks = [...meta.sights, { ...meta.airport, airport: true }].map(l => ({ name: l.name, km: round1(distanceKm({ lat, lon }, l)), airport: !!l.airport })).sort((a, b) => a.km - b.km);
    list.push({
      id: `${meta.code}-${slug(area.name)}-${i}`, idx: i, name, type, stars,
      city: meta.name, country: city?.country || '', intl, area: area.name, areaTags: area.tags, address, lat, lon,
      rating, reviews, ratingLabel: ratingLabel(rating),
      amenities: AMENITY_PRIORITY.filter(id => amen.has(id)),
      photos, cover: photos[0].id, rooms, plans,
      base: Math.round(base), refPremium: Math.round(hr.range(.1, .18) * 1000) / 1000, cancelDays: hr.int(1, 3),
      disc: Math.round(disc * 100) / 100, refundChance: type === 'Hostel' ? .5 : stars === 5 ? .8 : .65,
      mealPP: Math.round(MEAL_PP[stars] * hr.range(.85, 1.2) * Math.pow(meta.mult, .8)),
      checkinTime: early ? '12:00 PM' : intl && hr.chance(.6) ? '3:00 PM' : '2:00 PM',
      checkoutTime: early ? '11:00 AM' : '12:00 PM',
      couples: !intl && hr.chance(.7), localIds: intl || hr.chance(.6), pets: amen.has('pets'),
      landmarks, nearest: landmarks[0],
      rec: round1(rating * 10 + hr.range(0, 14) + (stars >= 3 ? 3 : 0) + (type === 'Hotel' ? 2 : 0) + (disc > .25 ? 2 : 0))
    });
  }
  inventoryCache.set(meta.code, list);
  return list;
}

// ---------------------------------------------------------------- nightly rates
const SEASON = {
  metro: [1.02, 1, 1, .97, .95, .95, .96, .97, 1, 1.02, 1.03, 1.06],
  heritage: [1.12, 1.1, 1.02, .9, .82, .8, .85, .85, .92, 1.08, 1.15, 1.18],
  hill: [1.1, 1, .95, 1.05, 1.22, 1.25, .85, .82, .9, 1.05, 1, 1.15],
  beach: [1.3, 1.12, 1, .92, .88, .78, .75, .78, .82, .95, 1.12, 1.38],
  'intl-city': [1.02, .98, 1, 1.02, 1, 1.05, 1.08, 1.08, 1, 1.02, 1.03, 1.12],
  'intl-beach': [1.25, 1.2, 1.1, 1, .88, .82, .85, .88, .85, .92, 1.05, 1.3]
};
const LEH_SEASON = [.8, .8, .85, .9, 1.1, 1.28, 1.3, 1.28, 1.15, .95, .8, .8];
const leadFactor = days => days <= 1 ? 1.08 : days <= 6 ? 1.04 : days <= 29 ? 1 : days <= 59 ? .97 : .95;

/** Nightly rate of the entry room (per room, before meals / refund premium) for one date. */
function nightRate(h, meta, date, lead) {
  const d = parse(date), dow = d.getDay();
  const leisure = !['metro', 'intl-city'].includes(meta.kind);
  let f = (meta.name === 'Leh' ? LEH_SEASON : SEASON[meta.kind])[d.getMonth()];
  if (dow === 5 || dow === 6) f *= leisure ? (meta.kind === 'hill' || meta.name === 'Goa' ? 1.2 : 1.12) : (h.areaTags.includes('x') ? .93 : 1.04);
  return h.base * f * lead * (.96 + rng(`${h.id}|${date}`)() * .08);
}

/** India: GST 5% up to ₹7,500 per room-night, 18% above. Abroad: 10% taxes & fees. */
export const taxPct = (rate, intl) => intl ? .1 : rate <= 7500 ? .05 : .18;
const mealCost = (h, plan, persons) => plan === 'RO' ? 0 : Math.round(h.mealPP * persons * (plan === 'BB' ? 1 : plan === 'HB' ? 2.7 : 4.2));

function freeCancelDate(h, checkin) {
  const x = addDays(checkin, -h.cancelDays), t = today();
  return x < t ? t : x;
}

function rateInclusions(h, rt, plan) {
  const pr = rng(`${h.id}|${rt.id}|${plan}|perks`);
  const inc = [MEAL_DESC[plan]];
  if (h.amenities.includes('wifi')) inc.push('Free Wi-Fi');
  if (h.stars >= 3 && pr.chance(.5)) inc.push(pr.pick(RATE_PERKS));
  if ((plan === 'HB' || plan === 'FB') && h.stars >= 4 && pr.chance(.4)) inc.push('Complimentary airport pickup');
  if (h.amenities.includes('spa') && pr.chance(.3)) inc.push('15% off on spa treatments');
  if (h.amenities.includes('parking')) inc.push('Free parking');
  return inc;
}

/** Room types with their rate options for a normalised stay. Prices are INR, all rooms × all nights. */
function priceStay(h, meta, s) {
  const dates = Array.from({ length: s.nights }, (_, k) => addDays(s.checkin, k));
  const lead = leadFactor(Math.max(0, diffDays(today(), s.checkin)));
  const nightBase = dates.map(d => nightRate(h, meta, d, lead));
  const soldOut = rng(`${h.id}|${s.checkin}|${s.checkout}|sold`).chance(.04);
  const n = s.roomCount;
  const fcu = freeCancelDate(h, s.checkin);
  const roomTypes = h.rooms.map(rt => {
    const rr = rng(`${h.id}|${rt.id}|${s.checkin}|left`);
    const left = rr.chance(.12) ? 1 : rr.int(2, 9);
    const fits = s.rooms.every(q => q.adults <= rt.maxAdults && q.adults + q.children <= rt.maxGuests);
    const reason = soldOut ? 'Sold out for your dates'
      : !fits ? (rt.maxGuests === 1 ? 'Dorm beds sleep one guest — search 1 adult per room to book a bed' : `Sleeps up to ${rt.maxAdults} adult${rt.maxAdults > 1 ? 's' : ''} (${rt.maxGuests} guests) per room`)
        : left < n ? `Only ${left} left — you need ${n}` : '';
    const persons = Math.min(rt.maxAdults, 2);
    const rates = [];
    for (const plan of h.plans) {
      const meal = mealCost(h, plan, persons);
      const refOK = rng(`${h.id}|${rt.id}|${plan}|ref`).chance(h.refundChance);
      for (const refundable of refOK ? [false, true] : [false]) {
        const nightly = nightBase.map(b => nice((b * rt.mult + meal) * (refundable ? 1 + h.refPremium : 1)));
        const perRoom = nightly.reduce((a, b) => a + b, 0);
        const taxRoom = nightly.reduce((a, b) => a + Math.round(b * taxPct(b, h.intl)), 0);
        const pcts = [...new Set(nightly.map(b => taxPct(b, h.intl)))];
        const net = perRoom * n, tax = taxRoom * n;
        rates.push({
          id: `${rt.id}-${plan}-${refundable ? 'r' : 'n'}`, roomId: rt.id, roomName: rt.name, beds: rt.beds,
          meal: plan, mealLabel: MEALS[plan], refundable, freeCancelUntil: refundable ? fcu : null,
          nightly, dates, perNight: Math.round(perRoom / s.nights), net, tax, gross: net + tax,
          taxPct: pcts.length === 1 ? pcts[0] : null, taxLabel: taxLabel(h.intl, pcts.length === 1 ? pcts[0] : null),
          strike: h.disc ? nice(net * (1 + h.disc)) : null, discPct: Math.round(h.disc * 100),
          inclusions: rateInclusions(h, rt, plan), left, nights: s.nights, rooms: n
        });
      }
    }
    rates.sort((a, b) => a.net - b.net);
    return { ...rt, left, available: !reason, reason, rates };
  });
  return { roomTypes, soldOut };
}

export function cancellationText(rate) {
  if (!rate?.refundable) return 'Non-refundable — cancellations, changes and no-shows are charged the full booking amount.';
  return `Free cancellation until ${fmtDate(rate.freeCancelUntil, 'ddd, d MMM yyyy')}. After that, cancellations up to 24 hours before check-in incur a 25% charge; later cancellations and no-shows are charged in full.`;
}

// ---------------------------------------------------------------- search
function quote(h, meta, s) {
  const { roomTypes, soldOut } = priceStay(h, meta, s);
  if (soldOut) return null;
  const avail = roomTypes.filter(rt => rt.available);
  const rates = avail.flatMap(rt => rt.rates);
  if (!rates.length) return null;
  const best = rates.reduce((a, b) => (b.net < a.net ? b : a));
  const rt = avail.find(x => x.id === best.roomId);
  return {
    id: h.id, name: h.name, type: h.type, stars: h.stars, city: h.city, area: h.area, address: h.address, lat: h.lat, lon: h.lon, intl: h.intl,
    rating: h.rating, reviews: h.reviews, ratingLabel: h.ratingLabel, cover: h.cover, photos: h.photos.slice(0, 5).map(p => p.id),
    amenities: h.amenities, nearest: h.nearest, rec: h.rec,
    price: { net: best.net, perNight: best.perNight, tax: best.tax, gross: best.gross, strike: best.strike, discPct: best.discPct, taxLabel: best.taxLabel, rateId: best.id, meal: best.meal, refundable: best.refundable, roomName: rt.name, left: rt.left },
    freeCancel: rates.some(x => x.refundable), breakfast: rates.some(x => x.meal !== 'RO'),
    meals: MEAL_ORDER.filter(m => rates.some(x => x.meal === m)), options: rates.length
  };
}

const searchCache = new Map();

/**
 * searchHotels({ city, checkin, checkout, rooms, star, nat }) → the hotel list (an Array, star
 * category applied) that also carries the search context as properties:
 * { hotels (= the list), all (every available property), q, nights, roomCount, adults, children,
 *   guests, city, meta, total, soldOut, error? ('city' for an unknown destination) }.
 */
export function searchHotels(query = {}) {
  const s = normalizeQuery(query);
  const meta = s.meta;
  const base = { q: { city: s.city, checkin: s.checkin, checkout: s.checkout, rooms: s.rooms, star: s.star, nat: s.nat }, nights: s.nights, roomCount: s.roomCount, adults: s.adults, children: s.children, guests: s.guests };
  if (!meta) return withContext([], { ...base, error: 'city', city: null, meta: null, all: [], total: 0, soldOut: 0 });
  const key = [meta.code, s.checkin, s.checkout, s.rooms.map(r0 => `${r0.adults}-${r0.children}`).join('|'), today()].join('~');
  let all = searchCache.get(key);
  if (!all) {
    all = inventory(meta).map(h => quote(h, meta, s)).filter(Boolean);
    searchCache.set(key, all);
    if (searchCache.size > 60) searchCache.delete(searchCache.keys().next().value);
  }
  const star = s.star !== 'all' ? +s.star : 0;
  const total = inventory(meta).length;
  return withContext(star ? all.filter(h => h.stars === star) : all.slice(), {
    ...base, city: HOTEL_CITIES.find(c => c.name === meta.name) || null,
    meta: { name: meta.name, code: meta.code, kind: meta.kind, areas: meta.areas.map(a => a.name), airport: meta.airport.name, note: meta.note },
    all, total, soldOut: total - all.length
  });
}
function withContext(list, ctx) { Object.assign(list, ctx); list.hotels = list; return list; }

/** Lowest nightly price and property count for a city (landing-page tiles). */
export function cityStats(city, checkin, checkout, rooms = '2-0') {
  const res = searchHotels({ city, checkin, checkout, rooms });
  if (res.error || !res.all.length) return null;
  const types = {};
  res.all.forEach(h => { types[h.type] = (types[h.type] || 0) + 1; });
  return { count: res.all.length, from: Math.min(...res.all.map(h => h.price.perNight)), types };
}

// ---------------------------------------------------------------- details
const lcFirst = s => s.replace(/^[A-Z](?=[a-z])/, c => c.toLowerCase());
const listJoin = a => a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];

function about(h, meta) {
  const opener = h.type !== 'Hotel' && OPENERS[h.type] ? OPENERS[h.type] : OPENERS[meta.kind];
  const near = h.landmarks.find(l => !l.airport) || h.landmarks[0];
  const airport = h.landmarks.find(l => l.airport);
  const am = h.amenities.filter(a => !['wifi', 'tv', 'security', 'luggage', 'power', 'lift', 'frontdesk', 'ac', 'heater'].includes(a)).slice(0, 5).map(a => lcFirst(AMENITIES[a][0]));
  const feats = h.rooms[0].features.slice(0, 4).map(lcFirst);
  return [
    `${h.name} is a ${h.stars}-star ${TYPE_NOUN[h.type]} in ${h.area}, ${h.city}, about ${near.km} km from ${near.name}. ${opener}`,
    `Choose from ${h.rooms.length} room types — from the ${h.rooms[0].name} to the ${h.rooms[h.rooms.length - 1].name} — with ${listJoin(feats)} as standard.${am.length ? ` Guests can also enjoy ${listJoin(am)}.` : ''}`,
    `The property is ${airport.km} km from ${airport.name}. Check-in is from ${h.checkinTime} and check-out is until ${h.checkoutTime}.${meta.note ? ' ' + meta.note : ''}`
  ];
}

function highlights(h, rates) {
  const out = [];
  if (rates.some(r0 => r0.refundable)) out.push({ icon: 'check-circle', text: 'Free cancellation on selected rooms' });
  if (rates.some(r0 => r0.meal !== 'RO')) out.push({ icon: 'coffee', text: 'Breakfast options available' });
  out.push({ icon: 'pin', text: `${h.nearest.km} km from ${h.nearest.name}` });
  if (h.amenities.includes('pool')) out.push({ icon: 'pool', text: 'Swimming pool' });
  else if (h.amenities.includes('beach')) out.push({ icon: 'palm', text: 'Beach access' });
  else if (h.rating >= 4.2) out.push({ icon: 'thumb', text: `Rated ${h.ratingLabel.toLowerCase()} by guests` });
  return out.slice(0, 4);
}

function policies(h, meta) {
  const extraBed = nice(Math.max(600, h.base * .22));
  const list = [
    { icon: 'clock', title: 'Check-in & check-out', text: `Check-in from ${h.checkinTime} · Check-out until ${h.checkoutTime}. Early check-in and late check-out are subject to availability and may be chargeable.` },
    { icon: 'passport', title: 'ID proof', text: h.intl ? 'Every guest must show a valid passport (and visa, where applicable) at check-in.' : `Every adult guest must show a valid government photo ID — Aadhaar, passport, driving licence or voter ID. PAN card is not accepted.${h.localIds ? '' : ' Local IDs are not accepted.'}` },
    { icon: 'users', title: 'Guests', text: h.intl ? 'Only registered guests are allowed in the rooms.' : `${h.couples ? 'Unmarried couples are welcome with valid ID.' : 'Unmarried couples may not be allowed — please check with the property before booking.'} Visitors are not allowed in rooms after 10 PM.` },
    { icon: 'baby', title: 'Children & extra beds', text: `Children up to 5 years stay free using existing bedding. An extra bed costs about ${inrText(extraBed)} per night, payable at the property and subject to availability.` },
    { icon: 'heart', title: 'Pets', text: h.pets ? 'Pets are allowed on request; charges may apply.' : 'Pets are not allowed.' },
    { icon: 'alert', title: 'Smoking', text: 'Smoking is not permitted inside rooms; a cleaning fee may apply.' },
    { icon: 'receipt', title: 'Cancellation', text: `${CANCELLATION_POLICY} ${REFUND_NOTE}` }
  ];
  if (meta.note) list.push({ icon: 'info', title: 'Local fees', text: meta.note });
  return list;
}

/**
 * getHotel(id, { checkin|in, checkout|out, rooms, nat }) → full property with room types and
 * rate options for the stay, or null for an unknown id.
 */
export function getHotel(id, query = {}) {
  const meta = metaForHotel(id);
  const h = meta && inventory(meta).find(x => x.id === id);
  if (!h) return null;
  const s = normalizeQuery({ ...query, city: meta.name });
  const { roomTypes, soldOut } = priceStay(h, meta, s);
  const rates = roomTypes.filter(rt => rt.available).flatMap(rt => rt.rates);
  const cheapest = rates.length ? rates.reduce((a, b) => (b.net < a.net ? b : a)) : null;
  const dy = .006, dx = .011;
  return {
    ...h,
    stay: { checkin: s.checkin, checkout: s.checkout, nights: s.nights, rooms: s.rooms, roomCount: s.roomCount, adults: s.adults, children: s.children, guests: s.guests, nat: s.nat },
    roomTypes, rates, cheapest, soldOut: soldOut || !rates.length,
    about: about(h, meta), highlights: highlights(h, rates), policies: policies(h, meta),
    amenityList: h.amenities.map(a => ({ id: a, label: AMENITIES[a][0], icon: AMENITIES[a][1] })),
    map: { lat: h.lat, lon: h.lon, bbox: [h.lon - dx, h.lat - dy, h.lon + dx, h.lat + dy].map(v => v.toFixed(5)).join(',') },
    note: meta.note, airport: meta.airport, region: HOTEL_CITIES.find(c => c.name === meta.name)?.region || ''
  };
}

export const findRate = (hotel, rateId) => hotel?.rates?.find(r0 => r0.id === rateId) || null;
