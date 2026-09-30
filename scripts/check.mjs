// Project health check: route modules exist, icons exist in the sprite, engines return data.
// Run with `npm run check` (Node 18+). No dependencies.
import { readFile, readdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const errors = [];
const ok = msg => console.log('  ✓ ' + msg);
const fail = msg => { errors.push(msg); console.log('  ✗ ' + msg); };

console.log('Routes');
const main = await readFile(join(root, 'js/main.js'), 'utf8');
const views = [...new Set([...main.matchAll(/v\('([\w-]+)'\)/g)].map(m => m[1]))];
for (const v of views) {
  try { await access(join(root, 'js/views', v + '.js')); } catch { fail(`missing view js/views/${v}.js`); }
}
ok(`${views.length} route modules referenced`);

console.log('Icons');
const index = await readFile(join(root, 'index.html'), 'utf8');
const symbols = new Set([...index.matchAll(/<symbol id="i-([\w-]+)"/g)].map(m => m[1]));
const used = new Set();
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (p.endsWith('.js')) {
      const src = await readFile(p, 'utf8');
      for (const m of src.matchAll(/icon\('([\w-]+)'/g)) used.add(m[1]);
    }
  }
}
await walk(join(root, 'js'));
const missing = [...used].filter(n => !symbols.has(n));
missing.length ? fail(`icons used but not in sprite: ${missing.join(', ')}`) : ok(`${used.size} icons used, all defined`);

console.log('Engines');
const url = p => pathToFileURL(join(root, 'js', p)).href;
const { searchFlights } = await import(url('engines/flights.js'));
const { today, addDays } = await import(url('core/format.js'));
const d = addDays(today(), 14);
for (const [f, t] of [['DEL', 'BOM'], ['BLR', 'DXB'], ['BOM', 'LHR']]) {
  const r = searchFlights({ from: f, to: t, date: d, cabin: 'E', fare: 'regular' });
  r.results.length ? ok(`${f}→${t}: ${r.results.length} flights from ₹${Math.round(r.results[0].cheapest.payable)}`) : fail(`${f}→${t}: no flights`);
}
for (const [mod, fn, args, label] of [['engines/hotels.js', 'searchHotels', { city: 'Goa', checkin: d, checkout: addDays(d, 2), rooms: [{ adults: 2, children: 0, ages: [] }], star: 'all', nat: 'IN' }, 'Goa hotels'], ['engines/buses.js', 'searchBuses', { from: 'Delhi', to: 'Jaipur', date: d }, 'Delhi→Jaipur buses']]) {
  try {
    const m = await import(url(mod));
    const res = m[fn](args);
    const list = Array.isArray(res) ? res : res?.results || res?.hotels || res?.buses || [];
    list.length ? ok(`${label}: ${list.length}`) : fail(`${label}: empty`);
  } catch (e) { fail(`${label}: ${e.message}`); }
}
const { PACKAGES, HOLIDAY_CITIES } = await import(url('data/packages.js'));
const ids = new Set(PACKAGES.map(p => p.id));
const broken = Object.entries(HOLIDAY_CITIES).flatMap(([c, l]) => l.filter(id => !ids.has(id)).map(id => `${c}:${id}`));
broken.length ? fail(`holiday city links broken: ${broken.join(', ')}`) : ok(`${PACKAGES.length} holiday packages, ${Object.keys(HOLIDAY_CITIES).length} destinations linked`);

console.log('Careers');
const careersHtml = await readFile(join(root, 'careers.html'), 'utf8');
// The Member ID generator (member-id.html) is built from the Careers components and shares their icons and images.
const memberHtml = await readFile(join(root, 'member-id.html'), 'utf8');
const careersSprite = await readFile(join(root, 'careers/icons.svg'), 'utf8');
const careersSymbols = new Set([...careersSprite.matchAll(/<symbol id="i-([\w-]+)"/g)].map(m => m[1]));
const careersUsed = new Set([...(careersHtml + memberHtml).matchAll(/icons\.svg(?:\?v=\d+)?#i-([\w-]+)/g)].map(m => m[1]));
for (const f of await readdir(join(root, 'careers/js'))) {
  const src = await readFile(join(root, 'careers/js', f), 'utf8');
  for (const m of src.matchAll(/icon\('([\w-]+)'/g)) careersUsed.add(m[1]);
}
const careersMissing = [...careersUsed].filter(n => !careersSymbols.has(n));
careersMissing.length ? fail(`careers icons missing from careers/icons.svg: ${careersMissing.join(', ')}`) : ok(`${careersUsed.size} careers icons used, all defined`);
const careersImgs = new Set();
for (const src of [careersHtml, memberHtml, ...await Promise.all((await readdir(join(root, 'careers/js'))).map(f => readFile(join(root, 'careers/js', f), 'utf8')))]) {
  for (const m of src.matchAll(/careers\/img\/([\w-]+\.webp)/g)) careersImgs.add(m[1]);
}
const imgMissing = [];
for (const f of careersImgs) { try { await access(join(root, 'careers/img', f)); } catch { imgMissing.push(f); } }
imgMissing.length ? fail(`careers images missing: ${imgMissing.join(', ')}`) : ok(`${careersImgs.size} careers images referenced, all present`);
const { ROLES, ROLE_ORDER, nationalDigits } = await import(pathToFileURL(join(root, 'careers/js/roles.js')).href);
for (const id of ROLE_ORDER) {
  const qs = ROLES[id].sections.flatMap(s => s.questions);
  const dupes = qs.map(q => q.id).filter((q, i, a) => a.indexOf(q) !== i);
  const bad = qs.filter(q => !q.label || (q.type !== 'choice' && !q.max) || (q.type === 'choice' && !q.options?.length));
  const finals = ROLES[id].sections.filter(s => s.final).length;
  dupes.length || bad.length || finals !== 1
    ? fail(`${id}: ${dupes.length ? 'duplicate ids ' + dupes.join(',') + ' ' : ''}${bad.length ? 'incomplete questions ' + bad.map(q => q.id).join(',') + ' ' : ''}${finals !== 1 ? finals + ' final sections' : ''}`)
    : ok(`${ROLES[id].title}: ${qs.length} questions in ${ROLES[id].sections.length} sections`);
}
const phones = [['+91', '+91 98765 43210', '9876543210'], ['+91', '09876543210', '9876543210'], ['+971', '+971 50 123 4567', '501234567'], ['+44', '07700 900123', '7700900123'], ['+1', '(415) 555-0100', '4155550100']];
const wrong = phones.filter(([cc, p, want]) => nationalDigits(cc, p) !== want);
wrong.length ? fail(`phone normalising: ${wrong.map(w => w[1]).join(', ')}`) : ok(`phone numbers normalised (${phones.length} formats)`);

console.log('Security');
// The server's Content-Security-Policy blocks inline event handlers (onclick="…"); use listeners instead.
const inline = [];
async function scanInline(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await scanInline(p);
    else if (/\.(js|html)$/.test(p)) {
      const src = await readFile(p, 'utf8');
      for (const m of src.matchAll(/<[a-z][^>]*\son[a-z]+=["']/gi)) inline.push(`${p.slice(root.length + 1)}: ${m[0].slice(0, 60)}`);
    }
  }
}
await scanInline(root);
inline.length ? fail(`inline event handlers (blocked by the CSP): ${inline.join(' | ')}`) : ok('no inline event handlers');

console.log('Deploy config');
// vercel.json carries the pages' security policy (inline-script hashes); it must match the pages as they are now.
const { vercelJson } = await import(pathToFileURL(join(root, '..', 'scripts', 'vercel-config.mjs')).href);
try {
  const have = (await readFile(join(root, '..', 'vercel.json'), 'utf8')).replace(/\r\n/g, '\n');
  have === await vercelJson() ? ok('vercel.json matches the pages') : fail('vercel.json is out of date: run npm run vercel:config');
} catch (e) { fail(`vercel.json: ${e.message}`); }

console.log(errors.length ? `\n${errors.length} problem(s) found.` : '\nAll checks passed.');
process.exit(errors.length ? 1 : 0);
