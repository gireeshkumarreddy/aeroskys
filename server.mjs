// Zero-dependency static server. Serves /public; extension-less paths fall back to index.html (the app
// uses hash routes). Also serves the Careers page at /careers and the Membership page at /membership (the
// earlier /member-id address redirects there), and accepts applications at POST /api/careers/applications.
// Text files are compressed, and every response carries security headers.
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { brotliCompressSync, gzipSync, constants as zlib } from 'node:zlib';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROLES, isRole, questionsOf, answerFields, isAnswered, nationalDigits } from './public/careers/js/roles.js';
import { SECURITY_HEADERS, contentSecurityPolicy } from './security.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, 'public');
const careersData = join(here, 'data', 'careers');   // outside /public: never served
const port = Number(process.env.PORT || 3000);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.webmanifest', '.svg', '.txt', '.xml']);
// Standalone pages served at clean URLs (the rest of the site is the hash-routed app).
const CLEAN_PAGES = { '/careers': 'careers.html', '/membership': 'membership.html' };
// Addresses that moved: the Member ID generator is now part of the Membership page.
const MOVED = { '/member-id': '/membership', '/member-id.html': '/membership' };

// Text files are kept in memory with compressed copies, rebuilt when the file changes. Images, fonts and
// other binaries stream from disk.
const packed = new Map();
async function loadFile(file, info, ext) {
  if (!COMPRESSIBLE.has(ext)) return null;
  const hit = packed.get(file);
  if (hit && hit.mtimeMs === info.mtimeMs && hit.size === info.size) return hit;
  const raw = await readFile(file);
  const entry = { mtimeMs: info.mtimeMs, size: info.size, raw };
  if (COMPRESSIBLE.has(ext) && raw.length > 1024) {
    entry.br = brotliCompressSync(raw, { params: { [zlib.BROTLI_PARAM_QUALITY]: 9, [zlib.BROTLI_PARAM_SIZE_HINT]: raw.length } });
    entry.gz = gzipSync(raw, { level: 9 });
  }
  if (ext === '.html') entry.csp = contentSecurityPolicy(raw.toString('utf8'));
  packed.set(file, entry);
  return entry;
}

// ---------------------------------------------------------------- careers applications
const MAX_BODY = 16 * 1024 * 1024;          // JSON incl. a base64 CV of up to 10 MB
const MAX_CV = 10 * 1024 * 1024;
const RX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const pad = n => String(n).padStart(2, '0');

function sendJson(res, status, body) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('invalid json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

// PDF starts with %PDF, DOCX is a ZIP (PK), legacy DOC is an OLE file (D0 CF 11 E0).
const looksLike = (ext, b) => ext === 'pdf' ? b.subarray(0, 4).toString() === '%PDF'
  : ext === 'docx' ? b[0] === 0x50 && b[1] === 0x4b
  : b.readUInt32BE(0) === 0xd0cf11e0;

async function handleApplication(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return sendJson(res, 405, { ok: false, error: 'Method not allowed' }); }
  if (!/application\/json/i.test(req.headers['content-type'] || '')) return sendJson(res, 415, { ok: false, error: 'Send the application as JSON' });
  let body;
  try { body = await readJson(req); }
  catch (e) { return sendJson(res, e.status || 400, { ok: false, error: e.status === 413 ? 'The upload is too large' : 'The request could not be read' }); }

  const role = isRole(body?.role) ? ROLES[body.role] : null;
  if (!role) return sendJson(res, 400, { ok: false, error: 'Choose a role', fields: {} });
  const s = v => (typeof v === 'string' ? v.trim() : '');
  const a = body.about || {};
  const fields = {};
  const digits = nationalDigits(s(a.cc) || '+91', s(a.phone));
  if (s(a.name).length < 2 || s(a.name).length > 80) fields.name = 'Enter your full name';
  if (!RX_EMAIL.test(s(a.email)) || s(a.email).length > 160) fields.email = 'Enter a valid email address';
  if (digits.length < 6 || digits.length > 15 || (s(a.cc) === '+91' && !/^[6-9]\d{9}$/.test(digits))) fields.phone = 'Enter a valid phone number';
  if (s(a.location).length < 2 || s(a.location).length > 80) fields.location = 'Enter the city you live in';
  if (!s(a.notice)) fields.notice = 'Choose your notice period';
  if (s(a.cvLink) && !/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(s(a.cvLink))) fields.cvLink = 'Enter a full link starting with https://';

  const answers = {};
  for (const q of questionsOf(body.role)) {
    for (const f of answerFields(q)) {
      const v = s(body.answers?.[f.id]);
      if (v.length > f.max) fields[q.id] = `Keep each answer under ${f.max} characters`;
      answers[f.id] = v;
    }
    if (!fields[q.id] && q.required && !isAnswered(q, answers)) fields[q.id] = 'This question is required';
  }

  let cv = null;
  if (body.cv) {
    const ext = (String(body.cv.name || '').match(/\.(pdf|docx?)$/i) || [])[1]?.toLowerCase();
    const buf = Buffer.from(String(body.cv.data || ''), 'base64');
    if (!ext) fields.cv = 'Upload a PDF, DOC or DOCX file';
    else if (!buf.length || buf.length > MAX_CV) fields.cv = 'The CV must be under 10 MB';
    else if (buf.length < 4 || !looksLike(ext, buf)) fields.cv = 'That file does not look like a PDF or Word document';
    else cv = { ext, buf, name: String(body.cv.name).replace(/[^\w .()-]/g, '_').slice(0, 120) };
  }
  if (!cv && !s(a.cvLink) && !fields.cv) fields.cv = 'Add your CV: upload it, or add a link in About You';
  if (body.confirm !== true) fields.confirm = 'Please confirm that your information is accurate';
  if (Object.keys(fields).length) return sendJson(res, 400, { ok: false, error: 'Please check the highlighted fields', fields });

  await mkdir(join(careersData, 'applications'), { recursive: true });
  await mkdir(join(careersData, 'cv'), { recursive: true });
  // A retried submission (same clientId) returns the original reference instead of a duplicate.
  const clientId = String(body.clientId || '').replace(/[^\w-]/g, '').slice(0, 64);
  const indexPath = join(careersData, 'index.json');
  let index = {};
  try { index = JSON.parse(await readFile(indexPath, 'utf8')); } catch { index = {}; }
  if (clientId && index[clientId]) return sendJson(res, 200, { ok: true, reference: index[clientId], duplicate: true });

  const now = new Date();
  const reference = `ASC-${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${randomBytes(3).toString('hex').toUpperCase()}`;
  let cvFile = null;
  if (cv) { cvFile = `${reference}.${cv.ext}`; await writeFile(join(careersData, 'cv', cvFile), cv.buf); }
  const record = {
    reference, receivedAt: now.toISOString(), clientId, role: body.role, roleTitle: role.title,
    about: { name: s(a.name), email: s(a.email).toLowerCase(), phone: `${s(a.cc) || '+91'} ${digits}`, location: s(a.location), cvLink: s(a.cvLink), notice: s(a.notice) },
    answers, cv: cv ? { file: cvFile, originalName: cv.name, bytes: cv.buf.length } : null,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 200)
  };
  await writeFile(join(careersData, 'applications', `${reference}.json`), JSON.stringify(record, null, 2));
  if (clientId) { index[clientId] = reference; await writeFile(indexPath, JSON.stringify(index, null, 2)); }
  console.log(`[careers] application ${reference} received for ${role.title}`);
  return sendJson(res, 201, { ok: true, reference, receivedAt: record.receivedAt });
}

// ---------------------------------------------------------------- server
const plain = (res, status, text) => { res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(text); };

createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); url.pathname = decodeURIComponent(url.pathname); }
  catch { return plain(res, 400, 'Bad request'); }
  const pathname = url.pathname;

  if (pathname === '/api/careers/applications') {
    try { return await handleApplication(req, res); }
    catch (e) { console.error(e); return sendJson(res, 500, { ok: false, error: 'The application could not be saved. Please try again' }); }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); return plain(res, 405, 'Method not allowed'); }
  // Clean URLs for the standalone pages (careers.html and membership.html also work on any static host).
  const bare = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (MOVED[bare]) { res.writeHead(301, { ...SECURITY_HEADERS, Location: MOVED[bare] + url.search }); return res.end(); }
  if (bare !== pathname && CLEAN_PAGES[bare]) {
    res.writeHead(301, { ...SECURITY_HEADERS, Location: bare + url.search }); return res.end();
  }

  let file = CLEAN_PAGES[pathname] ? join(root, CLEAN_PAGES[pathname]) : join(root, normalize(pathname).replace(/^([/\\])+/, ''));
  if (file !== root && !file.startsWith(root + sep)) return plain(res, 403, 'Forbidden');
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    // The app's pages are hash routes, so only extension-less paths fall back to it; a missing file is a 404.
    if (extname(pathname)) return plain(res, 404, 'Not found');
    file = join(root, 'index.html');
  }
  try {
    const info = await stat(file);
    const ext = extname(file);
    const entry = await loadFile(file, info, ext) || {};
    // Fonts and versioned assets (?v=…) never change under the same URL; everything else is revalidated.
    const cache = ext === '.woff2' || ext === '.ttf' || url.searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'no-cache';
    const accept = String(req.headers['accept-encoding'] || '');
    const encoding = entry.br && /\bbr\b/.test(accept) ? 'br' : entry.gz && /\bgzip\b/.test(accept) ? 'gzip' : '';
    const body = encoding === 'br' ? entry.br : encoding === 'gzip' ? entry.gz : entry.raw;   // undefined: stream the file
    const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}${encoding ? '-' + encoding : ''}"`;
    const headers = { ...SECURITY_HEADERS, 'Cache-Control': cache, ETag: etag };
    if (entry.br) headers.Vary = 'Accept-Encoding';
    if (entry.csp) headers['Content-Security-Policy'] = entry.csp;
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
    res.writeHead(200, {
      ...headers,
      'Content-Type': types[ext] || 'application/octet-stream',
      'Content-Length': body ? body.length : info.size,
      ...(encoding ? { 'Content-Encoding': encoding } : {})
    });
    if (req.method === 'HEAD') return res.end();
    if (body) return res.end(body);
    createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch {
    plain(res, 404, 'Not found');
  }
}).listen(port, '0.0.0.0', () => console.log(`AeroSkys prototype running at http://localhost:${port}  ·  Careers: http://localhost:${port}/careers`));
