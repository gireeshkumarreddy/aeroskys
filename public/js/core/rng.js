// Deterministic pseudo-random helpers so mock inventory is stable across reloads.

export function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function rng(seed) {
  let a = (typeof seed === 'string' ? hash(seed) : seed) >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (min, max) => Math.floor(next() * (max - min + 1)) + min;
  next.pick = arr => arr[Math.floor(next() * arr.length)];
  next.chance = p => next() < p;
  next.range = (min, max) => min + next() * (max - min);
  next.shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  return next;
}

const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function code(len = 6, r = Math.random) {
  let s = '';
  for (let i = 0; i < len; i++) s += ALNUM[Math.floor(r() * ALNUM.length)];
  return s;
}
