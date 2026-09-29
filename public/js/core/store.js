// Persistent app state (this device only). Every access to storage is guarded.

const KEY = 'aeroskys:proto:v2';
const listeners = new Set();

const initial = () => ({
  user: null,            // { name, email, phone, id, since }
  currency: 'INR',
  recent: { flights: [], hotels: [], bus: [], holidays: [] },
  last: {},              // last search per service, used to prefill forms
  drafts: {},            // bookings in progress keyed by draft id
  bookings: [],          // confirmed bookings
  enquiries: [],         // holiday, visa, group, cab, train, contact enquiries
  reviews: [],           // reviews added on this device
  travellers: [],        // saved travellers
  seenNotice: false
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial();
    return { ...initial(), ...JSON.parse(raw) };
  } catch { return initial(); }
}

let state = load();
let saveTimer = 0;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable: keep in memory */ }
  }, 60);
}

export const store = {
  get state() { return state; },
  get(key) { return state[key]; },
  set(patch) {
    state = { ...state, ...patch };
    persist();
    listeners.forEach(fn => fn(state, patch));
  },
  update(fn) {
    const draft = structuredClone(state);
    fn(draft);
    state = draft;
    persist();
    listeners.forEach(f => f(state, {}));
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  reset() { state = initial(); persist(); listeners.forEach(fn => fn(state, {})); }
};

// Keep tabs in sync when bookings are made in another tab.
if (typeof addEventListener === 'function') {
  addEventListener('storage', e => {
    if (e.key !== KEY) return;
    state = load();
    listeners.forEach(fn => fn(state, {}));
  });
}

export function pushRecent(service, entry, max = 5) {
  store.update(s => {
    const list = (s.recent[service] || []).filter(r => r.key !== entry.key);
    list.unshift({ ...entry, at: Date.now() });
    s.recent[service] = list.slice(0, max);
    s.last[service] = entry;
  });
}

export function newId(prefix = '') {
  return prefix + Date.now().toString(36).slice(-5).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}
