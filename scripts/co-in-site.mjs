// The Careers and Membership pages for the client's own domain, www.aeroskys.co.in (client, 22 Oct 2026).
// aeroskys.com stays the client's live (white-label) booking site and links to these two pages; the full website
// designed in public/ goes on aeroskys.co.in only at a later stage. So this site has just the two pages:
//   /             the Careers page (careers.html)        /careers?position=cfo  ->  /?position=cfo
//   /membership   the Membership page (membership.html)  /member-id             ->  /membership
// Links to the website (home, About, privacy, terms, contact) open the matching page of aeroskys.com.
// Builds dist/aeroskys-co-in/ with only the files the two pages use and its own vercel.json (the security headers
// and per-page Content-Security-Policy from security.mjs). Rebuild after any change to Careers or Membership.
//
//   node scripts/co-in-site.mjs                 build
//   node scripts/co-in-site.mjs --serve [port]  build, then serve it locally with the same headers and redirects
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECURITY_HEADERS, contentSecurityPolicy } from '../security.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const pub = join(root, 'public');
const out = join(root, 'dist', 'aeroskys-co-in');
const WEBSITE = 'https://aeroskys.com';   // the client's live booking site
// the full website's hash routes in public/, and the same page on aeroskys.com
const WEBSITE_PAGES = { '': '/', about: '/about', privacy: '/privacy-policy', terms: '/terms-and-conditions', support: '/support' };
const NOINDEX = false;   // the client's public domain: search engines may list the jobs and the membership plans
const IMMUTABLE = 'public, max-age=31536000, immutable';
const PAGES = { 'index.html': 'careers.html', 'membership.html': 'membership.html' };   // built page <- source page
const DIRS = ['careers', 'membership'];
const ASSETS = ['assets/fonts/inter-latin.woff2', 'assets/fonts/inter-latin-ext.woff2', 'assets/brand/aeroskys-logo-480.webp', 'assets/brand/icon.svg'];
const SCRIPTS = ['careers/js/app.js', 'careers/js/apply.js', 'careers/js/roles.js', 'careers/js/shell.js', 'careers/js/ui.js', 'membership/membership.js'];

/** Links to the full website open aeroskys.com; Membership links to Careers open this site's home page. */
function linked(text, file) {
  return text
    .replace(/href="\.\/#\/([a-z-]*)"/g, (m, route) => {
      if (!(route in WEBSITE_PAGES)) throw new Error(`${file}: no aeroskys.com page for the website link ${m}`);
      return `href="${WEBSITE}${WEBSITE_PAGES[route]}"`;
    })
    .replace(/href="careers"/g, 'href="./"');
}

/** Local files a page, stylesheet or script refers to, as site paths. */
function references(file, text) {
  const here = posix.dirname(file);
  const found = [];
  const add = (ref, base) => {
    if (!ref || /^(?:[a-z]+:|#|%23|\?|\/\/|\.\/$)/i.test(ref)) return;   // other sites, mail, phone, anchors, queries, home
    found.push(posix.normalize(posix.join(base, ref.split(/[?#]/)[0])));
  };
  if (file.endsWith('.html')) {
    for (const m of text.matchAll(/\s(?:href|src)="([^"]+)"/g)) add(m[1], here);
    for (const m of text.matchAll(/\s(?:srcset|imagesrcset)="([^"]+)"/g)) for (const part of m[1].split(',')) add(part.trim().split(/\s+/)[0], here);
  } else if (file.endsWith('.css')) {
    for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) if (!m[1].startsWith('data:')) add(m[1], here);
  } else {
    for (const m of text.matchAll(/\bfrom\s+['"](\.{1,2}\/[^'"]+)['"]/g)) add(m[1], here);
    for (const m of text.matchAll(/\bimport\s+['"](\.{1,2}\/[^'"]+)['"]/g)) add(m[1], here);
    for (const m of text.matchAll(/['"`(=\s]((?:careers|assets|membership)\/[\w./-]+\.(?:webp|png|jpe?g|svg|woff2|css|js))/g)) add(m[1], '.');
  }
  return found;
}

/** Every file the site refers to exists, every icon is in the sprite, and every link to the full website
 *  was turned into an aeroskys.com link (the site has no hash-routed app to open). */
async function verify() {
  const files = [...Object.keys(PAGES), 'careers/careers.css', 'membership/membership.css', ...SCRIPTS];
  const missing = new Set();
  const stray = [];
  const icons = new Set();
  for (const file of files) {
    const text = await readFile(join(out, file), 'utf8');
    for (const ref of references(file, text)) {
      const target = ref === 'membership' ? 'membership.html' : ref;
      if (!existsSync(join(out, target))) missing.add(`${ref} (from ${file})`);
    }
    for (const m of text.matchAll(/icons\.svg\?v=\d+#(i-[\w-]+)/g)) icons.add(m[1]);
    for (const m of text.matchAll(/href="(\.\/#[^"]*|careers|index\.html)"/g)) stray.push(`${file}: link to a page this site does not have, href="${m[1]}"`);
  }
  const sprite = await readFile(join(out, 'careers/icons.svg'), 'utf8');
  for (const id of icons) if (!sprite.includes(`id="${id}"`)) missing.add(`icon ${id}`);
  if (missing.size || stray.length) throw new Error(`aeroskys.co.in site is incomplete:\n  ${[...missing, ...stray].join('\n  ')}`);
  return { files: files.length, icons: icons.size };
}

function vercelConfig(csp) {
  const always = Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value }));
  if (NOINDEX) always.push({ key: 'X-Robots-Tag', value: 'noindex, nofollow' });
  return {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    framework: null,
    cleanUrls: true,
    trailingSlash: false,
    // Careers is the home page: its address on the review site (/careers) and any unknown page address lead there,
    // with the query kept, so /careers?position=cfo opens the CFO role. /api/* stays a real 404: the application
    // form then offers "Download my answers" and "Email us instead".
    redirects: [
      { source: '/member-id', destination: '/membership', permanent: true },
      { source: '/((?!api/|membership$)[^.]+)', destination: '/', permanent: false }
    ],
    headers: [
      { source: '/(.*)', headers: always },
      { source: '/', headers: [{ key: 'Content-Security-Policy', value: csp['/'] }] },
      { source: '/membership', headers: [{ key: 'Content-Security-Policy', value: csp['/membership'] }] },
      { source: '/assets/fonts/(.*)', headers: [{ key: 'Cache-Control', value: IMMUTABLE }] },
      { source: '/(.*)', has: [{ type: 'query', key: 'v' }], headers: [{ key: 'Cache-Control', value: IMMUTABLE }] }
    ]
  };
}

export async function build() {
  await mkdir(out, { recursive: true });
  for (const name of await readdir(out)) if (name !== '.vercel' && name !== '.git') await rm(join(out, name), { recursive: true, force: true });   // keep a project link or repository
  for (const dir of DIRS) await cp(join(pub, dir), join(out, dir), { recursive: true });
  for (const file of ASSETS) {
    await mkdir(dirname(join(out, file)), { recursive: true });
    await cp(join(pub, file), join(out, file));
  }
  const csp = {};
  for (const [page, source] of Object.entries(PAGES)) {
    const html = linked(await readFile(join(pub, source), 'utf8'), source);
    await writeFile(join(out, page), html);
    csp[page === 'index.html' ? '/' : '/membership'] = contentSecurityPolicy(html);
  }
  for (const file of SCRIPTS) await writeFile(join(out, file), linked(await readFile(join(out, file), 'utf8'), file));
  const { files, icons } = await verify();
  await writeFile(join(out, 'vercel.json'), `${JSON.stringify(vercelConfig(csp), null, 2)}\n`);
  // never publish the files `vercel link` adds here (.env.local holds a Vercel access token)
  await writeFile(join(out, '.vercelignore'), '.env*\n.gitignore\n.vercel\n.git\n');
  return { csp, files, icons };
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };

/** A local stand-in for the Vercel deployment: same headers, same redirects, no application endpoint. */
function serve(port, csp) {
  const always = { ...SECURITY_HEADERS, ...(NOINDEX ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}) };
  createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    if (path === '/member-id') { res.writeHead(308, { ...always, Location: `/membership${url.search}` }); return res.end(); }
    if (/^\/(?!api\/|membership$)[^.]+$/.test(path)) { res.writeHead(307, { ...always, Location: `/${url.search}` }); return res.end(); }
    const page = path === '/' ? 'index.html' : path === '/membership' ? 'membership.html' : null;
    const file = page ? join(out, page) : join(out, normalize(path).replace(/^([/\\])+/, ''));
    const ok = file.startsWith(out) && !/[\\/]\.(?:vercel|git)/.test(file) && ['GET', 'HEAD'].includes(req.method) && existsSync(file) && (await stat(file)).isFile();
    if (!ok) { res.writeHead(404, { ...always, 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
    const headers = { ...always, 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
    if (page) headers['Content-Security-Policy'] = csp[path];
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).pipe(res);
  }).listen(port, () => console.log(`aeroskys.co.in site: http://localhost:${port}/  ·  http://localhost:${port}/membership`));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { csp, files, icons } = await build();
  console.log(`dist/aeroskys-co-in built: Careers at /, Membership at /membership; ${files} pages, stylesheets and scripts checked, ${icons} icons; website links open ${WEBSITE}`);
  const i = process.argv.indexOf('--serve');
  if (i > 0) serve(Number(process.env.PORT || process.argv[i + 1] || 4330), csp);
}
