// Booking lifecycle shared by flights, hotels and buses:
// draft → payment → confirmed booking → find / manage / cancel.
// Everything is stored on this device (localStorage) in the prototype.
import { store, newId } from '../core/store.js';
import { code, rng } from '../core/rng.js';
import { today, diffDays, addDays, fmtDate } from '../core/format.js';
import { PLATFORM_FEE } from './flights.js';
import { PROMOS } from '../data/promos.js';

/**
 * draft = {
 *   type: 'flight' | 'hotel' | 'bus',
 *   title, subtitle,                 // shown on payment & confirmation
 *   item: {...},                     // service-specific snapshot (see README / views)
 *   pricing: { lines: [{ label, amount, neg }], total },   // INR
 *   travellers: [...], contact: { name, email, phone, countryCode },
 *   gst: {...} | null, promo: { code, amount } | null,
 *   returnTo: '#/...'                // where "Back" on the payment page goes
 * }
 */
export function createDraft(draft) {
  const id = newId('D');
  store.update(s => {
    // Keep only the 8 most recent drafts.
    const keys = Object.keys(s.drafts || {});
    if (keys.length > 8) keys.sort((a, b) => s.drafts[a].createdAt - s.drafts[b].createdAt).slice(0, keys.length - 8).forEach(k => delete s.drafts[k]);
    s.drafts[id] = { ...draft, id, createdAt: Date.now() };
  });
  return id;
}
export const getDraft = id => store.get('drafts')?.[id] || null;
export function updateDraft(id, patch) {
  store.update(s => { if (s.drafts[id]) s.drafts[id] = { ...s.drafts[id], ...patch }; });
  return getDraft(id);
}
export function deleteDraft(id) { store.update(s => { delete s.drafts[id]; }); }

function bookingRef(type) {
  const p = { flight: 'ASF', hotel: 'ASH', bus: 'ASB' }[type] || 'ASX';
  const d = new Date();
  return `${p}${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${code(5)}`;
}

export function confirmBooking(draftId, payment) {
  const d = getDraft(draftId);
  if (!d) return null;
  const ref = bookingRef(d.type);
  const r = rng(ref);
  const booking = {
    ...d, ref, draftId, createdAt: Date.now(), payment: { ...payment, paidAt: Date.now(), txn: 'TXN' + code(10, r) },
    status: d.item?.exclusive ? 'processing' : 'confirmed',
    userId: store.get('user')?.id || null
  };
  if (d.type === 'flight') {
    booking.pnrs = (d.item.journeys || []).map(() => code(6, r));
    booking.eticket = (d.travellers || []).map(() => '098' + String(Math.floor(r() * 1e10)).padStart(10, '0'));
  }
  if (d.type === 'hotel') booking.voucher = 'HV' + String(Math.floor(r() * 1e8)).padStart(8, '0');
  if (d.type === 'bus') booking.pnrs = [code(8, r)], booking.ticketNo = 'TK' + String(Math.floor(r() * 1e9)).padStart(9, '0');
  store.update(s => { s.bookings.unshift(booking); delete s.drafts[draftId]; });
  return booking;
}

/** Exclusive fares confirm "within 30–45 minutes"; the prototype accelerates that to 1 minute. */
function settle(b) {
  if (b.status === 'processing' && Date.now() - b.createdAt > 60 * 1000) {
    store.update(s => { const x = s.bookings.find(y => y.ref === b.ref); if (x) x.status = 'confirmed'; });
    return { ...b, status: 'confirmed' };
  }
  return b;
}

export const allBookings = () => (store.get('bookings') || []).map(settle);
export const getBooking = ref => { const b = (store.get('bookings') || []).find(x => x.ref === String(ref).toUpperCase().trim()); return b ? settle(b) : null; };

/** Find Booking: reference number + first name (as on the live site). */
export function findBooking(ref, firstName) {
  const b = getBooking(ref);
  if (!b) return null;
  const f = String(firstName || '').trim().toLowerCase();
  const names = [b.contact?.name, ...(b.travellers || []).map(t => t.first || t.name || '')].filter(Boolean).map(n => n.trim().split(/\s+/)[0].toLowerCase());
  return names.includes(f) ? b : null;
}

export function startDate(b) {
  if (b.type === 'flight') return b.item.journeys?.[0]?.date;
  if (b.type === 'hotel') return b.item.checkin;
  if (b.type === 'bus') return b.item.date;
  return null;
}
export const isUpcoming = b => b.status !== 'cancelled' && (startDate(b) || today()) >= today();

/** Refund estimate following the fare/room/bus rules captured at booking time. */
export function refundQuote(b) {
  const paid = b.pricing?.total || 0;
  const days = diffDays(today(), startDate(b) || today());
  if (b.status === 'cancelled') return { allowed: false, reason: 'This booking is already cancelled.' };
  if (days < 0) return { allowed: false, reason: 'Travel date has passed.' };
  if (b.type === 'flight') {
    const lines = []; let fee = 0; let refundable = true;
    const hoursToGo = days * 24;
    if (hoursToGo < 30) return { allowed: false, reason: 'Cancellation requests are accepted up to 30 hrs before departure. Please contact our Contact Centre.' };
    const paxN = (b.travellers || []).filter(t => t.type !== 'Infant').length || 1;
    for (const j of b.item.journeys) {
      const f = j.fare;
      if (f.exclusive) { refundable = false; break; }
      const perPax = f.zeroCancel && hoursToGo >= 26 ? 0 : (f.cancel ?? 3500);
      const sectorFee = (perPax + PLATFORM_FEE) * paxN;
      lines.push({ label: `${j.from} → ${j.to} cancellation (${paxN} pax)`, amount: sectorFee });
      fee += sectorFee;
    }
    if (!refundable) return { allowed: true, refund: 0, fee: paid, lines: [{ label: 'Exclusive fare — non-refundable', amount: paid }], note: 'This exclusive deal is 100% Non-Refundable, Non-Changeable & Non-Cancellable.' };
    const addons = b.pricing.addons || 0;
    const refund = Math.max(0, Math.round(paid - fee - addons - (b.pricing.convenience || 0)));
    return { allowed: true, refund, fee: paid - refund, lines: [...lines, addons ? { label: 'Seats, meals & baggage (non-refundable)', amount: addons } : null].filter(Boolean), note: 'GST + RAF charges applicable on cancellation penalty. Refunds reach the original payment method in 7–14 business days.' };
  }
  if (b.type === 'hotel') {
    const room = b.item.room || b.item;
    const free = room.refundable && room.freeCancelUntil && today() <= room.freeCancelUntil;
    if (free) return { allowed: true, refund: paid, fee: 0, lines: [], note: `Free cancellation until ${fmtDate(room.freeCancelUntil, 'd MMM yyyy')}. Refunds reach the original payment method in 7–14 business days.` };
    if (room.refundable && days >= 1) { const fee = Math.round(paid * 0.25); return { allowed: true, refund: paid - fee, fee, lines: [{ label: 'Hotel cancellation charge (first night / 25%)', amount: fee }], note: 'Cancellations made 24 to 72 hours before check-in may be eligible for a partial refund, depending on the hotel’s policy.' }; }
    return { allowed: true, refund: 0, fee: paid, lines: [{ label: 'Non-refundable rate', amount: paid }], note: 'Some bookings are marked as non-refundable and cannot be refunded once confirmed.' };
  }
  if (b.type === 'bus') {
    const depHours = days * 24 + (b.item.dep || 0) / 60 - new Date().getHours();
    if (depHours < 6) return { allowed: true, refund: 0, fee: paid, lines: [{ label: 'Within 6 hours of departure', amount: paid }], note: 'Cancellations made within 6 hours of departure are typically non-refundable.' };
    const pct = depHours >= 48 ? 0.1 : depHours >= 24 ? 0.25 : 0.5;
    const fee = Math.round(paid * pct);
    return { allowed: true, refund: paid - fee, fee, lines: [{ label: `Operator cancellation charge (${Math.round(pct * 100)}%)`, amount: fee }], note: 'Refunds, if applicable, are processed to the original payment method within 7–14 business days.' };
  }
  return { allowed: false, reason: 'Unsupported booking.' };
}

export function cancelBooking(ref) {
  const b = getBooking(ref);
  if (!b) return null;
  const q = refundQuote(b);
  if (!q.allowed) return { error: q.reason };
  store.update(s => {
    const x = s.bookings.find(y => y.ref === b.ref);
    if (x) { x.status = 'cancelled'; x.cancelledAt = Date.now(); x.refund = { amount: q.refund, fee: q.fee, eta: addDays(today(), 10) }; }
  });
  return getBooking(ref);
}

// ---------------------------------------------------------------- promo codes
export function applyPromo(codeStr, service, amount) {
  const c = String(codeStr || '').trim().toUpperCase();
  if (!c) return { error: 'Enter a promo code' };
  const p = PROMOS.find(x => x.code === c);
  if (!p) return { error: 'This promo code is not valid.' };
  if (!p.services.includes(service)) return { error: `This code is valid on ${p.services.join(', ')} bookings only.` };
  if (amount < (p.min || 0)) return { error: `Minimum booking amount for this code is ₹${p.min.toLocaleString('en-IN')}.` };
  const off = Math.min(p.max || Infinity, p.flat || Math.round(amount * (p.pct || 0) / 100));
  return { code: c, amount: off, label: p.label };
}

// ---------------------------------------------------------------- enquiries
export function saveEnquiry(kind, data) {
  const ref = 'ENQ' + code(6);
  const e = { ref, kind, data, createdAt: Date.now(), status: 'Received', userId: store.get('user')?.id || null };
  store.update(s => { s.enquiries.unshift(e); });
  return e;
}
export const allEnquiries = () => store.get('enquiries') || [];
