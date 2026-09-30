// Builds vercel.json: a static deployment of public/ on Vercel with the same routes, security headers and
// caching as server.mjs. Run `npm run vercel:config` after editing an inline <script> in index.html or
// careers.html (its hash is part of the security policy); `npm run check` fails while vercel.json is stale.
// The Careers application endpoint needs a server, so on Vercel the form offers "Download my answers" and
// "Email us instead" (see README: Deploying to Vercel).
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { SECURITY_HEADERS, contentSecurityPolicy } from '../security.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const IMMUTABLE = 'public, max-age=31536000, immutable';
// A review copy: keep it out of search results. Set to false when this deployment becomes the live site.
const NOINDEX = true;

export async function buildVercelConfig() {
  const csp = async file => contentSecurityPolicy(await readFile(join(root, 'public', file), 'utf8'));
  const always = Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value }));
  if (NOINDEX) always.push({ key: 'X-Robots-Tag', value: 'noindex, nofollow' });
  return {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    framework: null,
    outputDirectory: 'public',
    cleanUrls: true,                         // /careers and /member-id serve their pages, as on the Node server
    trailingSlash: false,                    // /careers/ redirects to /careers
    // extension-less paths fall back to the app, which uses hash routes; /api/* stays a real 404.
    // With cleanUrls the app is addressed as "/" (a destination of /index.html would not resolve).
    rewrites: [{ source: '/((?!api/)[^.]*)', destination: '/' }],
    headers: [
      { source: '/(.*)', headers: always },
      { source: '/((?!careers$|member-id$)[^.]*)', headers: [{ key: 'Content-Security-Policy', value: await csp('index.html') }] },
      { source: '/careers', headers: [{ key: 'Content-Security-Policy', value: await csp('careers.html') }] },
      { source: '/member-id', headers: [{ key: 'Content-Security-Policy', value: await csp('member-id.html') }] },
      { source: '/assets/fonts/(.*)', headers: [{ key: 'Cache-Control', value: IMMUTABLE }] },
      { source: '/(.*)', has: [{ type: 'query', key: 'v' }], headers: [{ key: 'Cache-Control', value: IMMUTABLE }] }
    ]
  };
}

export const vercelJson = async () => `${JSON.stringify(await buildVercelConfig(), null, 2)}\n`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writeFile(join(root, 'vercel.json'), await vercelJson());
  console.log('vercel.json written');
}
