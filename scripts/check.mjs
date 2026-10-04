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
const careersSprite = await readFile(join(root, 'careers/icons.svg'), 'utf8');
const careersSymbols = new Set([...careersSprite.matchAll(/<symbol id="i-([\w-]+)"/g)].map(m => m[1]));
const careersUsed = new Set([...careersHtml.matchAll(/icons\.svg(?:\?v=\d+)?#i-([\w-]+)/g)].map(m => m[1]));
for (const f of await readdir(join(root, 'careers/js'))) {
  const src = await readFile(join(root, 'careers/js', f), 'utf8');
  for (const m of src.matchAll(/icon\('([\w-]+)'/g)) careersUsed.add(m[1]);
}
const careersMissing = [...careersUsed].filter(n => !careersSymbols.has(n));
careersMissing.length ? fail(`careers icons missing from careers/icons.svg: ${careersMissing.join(', ')}`) : ok(`${careersUsed.size} careers icons used, all defined`);
const careersImgs = new Set();
for (const src of [careersHtml, ...await Promise.all((await readdir(join(root, 'careers/js'))).map(f => readFile(join(root, 'careers/js', f), 'utf8')))]) {
  for (const m of src.matchAll(/careers\/img\/([\w-]+\.webp)/g)) careersImgs.add(m[1]);
}
const imgMissing = [];
for (const f of careersImgs) { try { await access(join(root, 'careers/img', f)); } catch { imgMissing.push(f); } }
imgMissing.length ? fail(`careers images missing: ${imgMissing.join(', ')}`) : ok(`${careersImgs.size} careers images referenced, all present`);
// The 15 designations: numbered in order, complete pay structures, one primary-evaluation question each,
// unique answer ids, and every designation reachable from the positions list, the header menu and the phone menu.
const { ROLES, ROLE_ORDER, GROUP_ORDER, questionsOf, answerFields, listPay, nationalDigits } = await import(pathToFileURL(join(root, 'careers/js/roles.js')).href);
ROLE_ORDER.length === 15 ? ok('15 designations') : fail(`${ROLE_ORDER.length} designations (the client lists 15)`);
ROLE_ORDER.forEach((id, i) => {
  const r = ROLES[id];
  const qs = questionsOf(id);
  const fields = qs.flatMap(answerFields).map(f => f.id);
  const dupes = fields.filter((f, j) => fields.indexOf(f) !== j);
  const bad = qs.filter(q => !q.text || !q.label || !answerFields(q).every(f => f.id && f.max > 0));
  const problems = [
    r.num !== String(i + 1).padStart(2, '0') && `numbered ${r.num}`,
    !GROUP_ORDER.includes(r.group) && `unknown group ${r.group}`,
    !(r.title && r.type && r.reportsTo && r.hire && r.summary && listPay(r) && r.pay?.length && r.payNote) && 'incomplete role summary or pay structure',
    qs.filter(q => q.core).length !== 1 && `${qs.filter(q => q.core).length} primary-evaluation questions`,
    !qs.some(q => q.required) && 'no required questions',
    dupes.length && `duplicate answer ids ${dupes.join(',')}`,
    bad.length && `incomplete questions ${bad.map(q => q.id).join(',')}`,
    !['tag', 'hr', 'tasa', 'growth', 'exec'].includes(r.details?.page) && 'no role page',
    ...[['positions list', /<section[^>]*id="positions"[\s\S]*?<\/section>/], ['header menu', /id="dd-positions"[\s\S]*?<\/div>\s*<\/div>/], ['phone menu', /id="cr-mnav"[\s\S]*?<\/nav>/]]
      .map(([where, rx]) => !(careersHtml.match(rx)?.[0] || '').includes(`href="?position=${id}" data-position="${id}"`) && `missing from the ${where}`)
  ].filter(Boolean);
  problems.length ? fail(`${r.num} ${r.title}: ${problems.join('; ')}`) : ok(`${r.num} ${r.title}: ${qs.length} questions, ${qs.filter(q => q.required).length} required`);
});
const phones = [['+91', '+91 98765 43210', '9876543210'], ['+91', '09876543210', '9876543210'], ['+971', '+971 50 123 4567', '501234567'], ['+44', '07700 900123', '7700900123'], ['+1', '(415) 555-0100', '4155550100']];
const wrong = phones.filter(([cc, p, want]) => nationalDigits(cc, p) !== want);
wrong.length ? fail(`phone normalising: ${wrong.map(w => w[1]).join(', ')}`) : ok(`phone numbers normalised (${phones.length} formats)`);

console.log('Membership');
// membership.html is its own page (served at /membership) built on the Careers stylesheet and shell: every local
// file it references and every icon it uses must exist.
const memberHtml = await readFile(join(root, 'membership.html'), 'utf8');
const memberAssets = new Set([...memberHtml.matchAll(/(?:href|src)="((?:membership|careers|assets)\/[^"?#]+)/g)].map(m => m[1]));
const memberIcons = new Set([...memberHtml.matchAll(/icons\.svg\?v=\d+#(i-[\w-]+)/g)].map(m => m[1]));
const iconsSvg = await readFile(join(root, 'careers/icons.svg'), 'utf8');
const memberMissing = [...memberIcons].filter(id => !iconsSvg.includes(`id="${id}"`)).map(id => `icon ${id}`);
for (const f of memberAssets) { try { await access(join(root, f)); } catch { memberMissing.push(f); } }
memberMissing.length ? fail(`membership files missing: ${memberMissing.join(', ')}`) : ok(`membership page: ${memberAssets.size} files and ${memberIcons.size} icons referenced, all present`);

console.log('Contact');
// The support number changed on 4 Oct 2026 (client change request): the old number must not appear anywhere.
const OLD_PHONE = /9526956609|95269\s?56609/;
const NEW_PHONE = '+91 79703 36785';
const oldHits = [];
async function scanPhone(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await scanPhone(p);
    else if (/\.(js|html|css|json|txt|webmanifest)$/.test(p) && OLD_PHONE.test(await readFile(p, 'utf8'))) oldHits.push(p.slice(root.length + 1));
  }
}
await scanPhone(root);
oldHits.length ? fail(`old phone number still in: ${oldHits.join(', ')}`) : ok('old phone number removed everywhere');
const { COMPANY } = await import(url('data/content.js'));
const shown = h => h.replace(/&nbsp;| /g, ' ');     // the number may be written with non-breaking spaces
const newIn = [['site data', COMPANY.phone === NEW_PHONE && COMPANY.phoneIntl === '+917970336785'], ['careers.html', shown(careersHtml).includes(NEW_PHONE) && careersHtml.includes('tel:+917970336785')], ['membership.html', shown(memberHtml).includes(NEW_PHONE) && memberHtml.includes('tel:+917970336785')]];
newIn.every(([, has]) => has) ? ok(`new number ${NEW_PHONE} on the site, Careers and Membership`) : fail(`new number missing from: ${newIn.filter(([, has]) => !has).map(([w]) => w).join(', ')}`);

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
