// Security headers shared by the Node server (server.mjs) and the Vercel config (scripts/vercel-config.mjs),
// so both hosts always send the same policy.
import { createHash } from 'node:crypto';

// Sent with every response.
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin'
};

// Content-Security-Policy for pages. Inline <script> blocks are allowed by their hash, computed from the
// file itself, so editing them never needs a manual update here. Images may come from the live site's CDN.
export function contentSecurityPolicy(htmlText) {
  const hashes = [...htmlText.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self'",
    'frame-src https://www.openstreetmap.org',
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'"
  ].join('; ');
}
