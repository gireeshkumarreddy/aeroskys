// Promo codes accepted at checkout.
// TRAVO200 and TEST00001KA are the codes published on aeroskys.com; their discount rules
// are prototype values to confirm. BUS10 is a prototype-only code modelled on the live
// 'Sandhu Travels — up to 10% instant discount on bus, cabs & trains' offer.
export const PROMOS = [
  { code: 'TRAVO200', services: ['flight'], flat: 200, min: 1000, label: 'Flat ₹200 off on flights — Christmas and New Year Special Offer' },
  { code: 'TEST00001KA', services: ['hotel'], pct: 10, max: 1000, min: 1500, label: '10% off hotel stays (up to ₹1,000) — Radisson hotels collection' },
  { code: 'BUS10', services: ['bus'], pct: 10, max: 150, min: 300, label: 'Up to 10% instant discount on bus, cabs & trains' }
];
