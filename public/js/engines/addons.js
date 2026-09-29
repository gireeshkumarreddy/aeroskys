// Seat maps, meals and prepaid excess baggage for the "Seat & Meal" step.
import { rng } from '../core/rng.js';
import { airline } from '../data/airlines.js';

const LAYOUTS = {
  atr: { cols: ['A', 'C', '|', 'D', 'F'], rows: 18, exits: [], front: 3 },
  a320: { cols: ['A', 'B', 'C', '|', 'D', 'E', 'F'], rows: 31, exits: [12, 13], front: 5 },
  a321: { cols: ['A', 'B', 'C', '|', 'D', 'E', 'F'], rows: 37, exits: [10, 11, 25, 26], front: 5 },
  b737: { cols: ['A', 'B', 'C', '|', 'D', 'E', 'F'], rows: 31, exits: [14, 15], front: 4 },
  wide9: { cols: ['A', 'B', 'C', '|', 'D', 'E', 'F', '|', 'G', 'H', 'K'], rows: 30, exits: [31], start: 18, front: 3 },
  wide10: { cols: ['A', 'B', 'C', '|', 'D', 'E', 'F', 'G', '|', 'H', 'J', 'K'], rows: 30, exits: [34], start: 20, front: 3 }
};

export function layoutFor(aircraft = '') {
  const a = aircraft.toUpperCase();
  if (a.includes('ATR') || a.includes('Q400')) return LAYOUTS.atr;
  if (a.includes('A321')) return LAYOUTS.a321;
  if (a.includes('737') || a.includes('A220')) return LAYOUTS.b737;
  if (a.includes('777') || a.includes('A380') || a.includes('747')) return LAYOUTS.wide10;
  if (a.includes('787') || a.includes('A350') || a.includes('A330') || a.includes('767') || a.includes('A340')) return LAYOUTS.wide9;
  return LAYOUTS.a320;
}

/** Deterministic seat map for one flight segment. fareIncludesSeat makes standard seats free. */
export function seatMap(seg, date, fareIncludesSeat, dom) {
  const L = layoutFor(seg.aircraft);
  const r = rng(`${seg.flightNo}${date}seats`);
  const start = L.start || 1;
  const rows = [];
  const lcc = airline(seg.airline).type !== 'fsc';
  for (let i = 0; i < L.rows; i++) {
    const row = start + i;
    if (row === 13 && !L.exits.includes(13)) continue; // many carriers skip row 13
    const exit = L.exits.includes(row);
    const seats = L.cols.map(c => {
      if (c === '|') return null;
      const window = c === L.cols[0] || c === L.cols[L.cols.length - 1];
      const aisle = L.cols[L.cols.indexOf(c) - 1] === '|' || L.cols[L.cols.indexOf(c) + 1] === '|';
      let tier = exit ? 'xl' : row - start < L.front ? 'front' : window || aisle ? 'std' : 'mid';
      let price = { xl: dom ? 1200 : 2200, front: dom ? 650 : 1100, std: dom ? 300 : 600, mid: dom ? 150 : 350 }[tier];
      if (!lcc) price = Math.round(price * (tier === 'xl' || tier === 'front' ? 1.2 : .6) / 50) * 50;
      if (fareIncludesSeat && (tier === 'std' || tier === 'mid')) price = 0;
      if (tier === 'mid' && row - start > L.rows * .6 && lcc) price = 0;
      const taken = r() < (tier === 'xl' ? .5 : tier === 'front' ? .62 : .52);
      return { id: `${row}${c}`, row, col: c, tier, price, taken, window, aisle, exit };
    });
    rows.push({ row, exit, seats });
  }
  return { cols: L.cols, rows };
}

export function mealsFor(seg, fare, dom) {
  const fsc = airline(seg.airline).type === 'fsc';
  if (fsc || fare.meal) {
    return { complimentary: true, options: [
      { id: 'VGML', name: 'Vegetarian meal', desc: 'Complimentary · Indian vegetarian', price: 0 },
      { id: 'NVML', name: 'Non-vegetarian meal', desc: 'Complimentary · Chicken or fish', price: 0 },
      { id: 'JNML', name: 'Jain meal', desc: 'Complimentary · Pre-order required', price: 0 },
      { id: 'DBML', name: 'Diabetic meal', desc: 'Complimentary · Low sugar', price: 0 }
    ] };
  }
  const mult = dom ? 1 : 1.6;
  return { complimentary: false, options: [
    { id: 'VSW', name: 'Veg Sandwich + Beverage', desc: 'Grilled vegetable sandwich with tea, coffee or soft drink', price: Math.round(350 * mult) },
    { id: 'PTW', name: 'Paneer Tikka Wrap + Beverage', desc: 'Smoky paneer wrap with a beverage', price: Math.round(450 * mult) },
    { id: 'CJS', name: 'Chicken Junglee Sandwich + Beverage', desc: 'Classic chicken sandwich with a beverage', price: Math.round(450 * mult) },
    { id: 'UPM', name: 'Upma + Coffee', desc: 'South Indian breakfast classic', price: Math.round(300 * mult) },
    { id: 'POH', name: 'Poha + Tea', desc: 'Light breakfast with masala chai', price: Math.round(280 * mult) },
    { id: 'FRT', name: 'Fresh Fruit Platter', desc: 'Seasonal cut fruit', price: Math.round(250 * mult) },
    { id: 'JAIN', name: 'Jain Meal + Beverage', desc: 'Prepared without onion and garlic', price: Math.round(400 * mult) }
  ] };
}

export function baggageOptions(dom) {
  const perKg = dom ? 550 : 900;
  return [3, 5, 10, 15, 20].filter(k => dom || k >= 5).map(k => ({ id: `XB${k}`, kg: k, price: Math.round(k * perKg * (k >= 10 ? .95 : 1) / 10) * 10 }));
}
