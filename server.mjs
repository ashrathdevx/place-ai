import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { catalogBySlug, fallbackCatalog } from './judge/public-catalog.mjs';
import { handleEvidence } from './evidence/connectors.mjs';

const pages = new Set(['/', '/learn', '/practice', '/placements', '/marketplace', '/proof', '/proof/demo', '/profile', '/profile/edit']);
const assets = new Map([
  ['/assets/app.js', 'text/javascript'],
  ['/assets/data.js', 'text/javascript'],
  ['/assets/site.css', 'text/css'],
  ['/assets/tokens.css', 'text/css'],
  ['/assets/theme.js', 'text/javascript'],
  ['/assets/profile.js', 'text/javascript'],
  ['/assets/live-progress.js', 'text/javascript'],
  ['/assets/profile-settings.js', 'text/javascript'],
  ['/assets/mark.svg', 'image/svg+xml'],
  ['/assets/qr.js', 'text/javascript'],
]);
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '127.0.0.1';
const api = process.env.DATABASE_URL ? await import('./judge/api.mjs') : null;
const arenaPage = /^\/arena(?:\/decode|\/problems\/[^/]+(?:\/editorial)?|\/contests\/[a-z0-9-]+)?$/;
const vendorPath = /^\/vendor\/[a-zA-Z0-9_@.-]+(?:\/[a-zA-Z0-9_@.-]+)*$/;
const types = { js:'text/javascript',css:'text/css',woff2:'font/woff2',ttf:'font/ttf',json:'application/json' };

createServer(async (req, res) => {
  const path = (req.url ?? '/').split('?')[0].replace(/\/$/, '') || '/';
  if (path.startsWith('/api/evidence/') && path !== '/api/evidence/arena') return handleEvidence(req,res,path);
  if (path.startsWith('/api/')) {
    if (api) return api.handle(req,res,path);
    const fallback = req.method === 'GET' ? fallbackCatalog(path,new URL(req.url,'http://localhost').searchParams) : undefined;
    if (fallback !== undefined) {
      res.writeHead(fallback ? 200 : 404, {'Content-Type':'application/json','Cache-Control':'no-store'});
      return res.end(JSON.stringify(fallback ?? {error:'Problem not found.'}));
    }
    res.writeHead(503, { 'Content-Type':'application/json' });
    return res.end(JSON.stringify({error:'Start Docker Compose to connect the coding arena and judge.'}));
  }
  const alias = path.match(/^\/decode(?:\/([a-z0-9-]+)(\/editorial)?)?$/);
  if (alias || path === '/skill-passport') {
    const to = !alias ? '/profile' : !alias[1] ? '/arena/decode'
      : '/arena/problems/'+(alias[1].startsWith('decode-') ? alias[1] : 'decode-'+alias[1])+(alias[2] ?? '');
    res.writeHead(308,{Location:to+new URL(req.url,'http://localhost').search});
    return res.end();
  }
  const arena = arenaPage.test(path);
  const challenge = path.match(/^\/arena\/problems\/([^/]+)/)?.[1];
  const missing = challenge && !catalogBySlug.has(challenge);
  const parts = path.split('/');
  const vendor = vendorPath.test(path) && !parts.some(part => part === '.' || part === '..');
  const file = arena ? 'arena/index.html' : pages.has(path) ? 'index.html' : assets.has(path) ? path.slice(1) : vendor ? 'generated' + path.slice(7) : null;
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Page not found');
    return;
  }
  try {
    const data = await readFile(new URL(file, import.meta.url));
    res.writeHead(missing ? 404 : 200, {
      'Content-Type': (assets.get(path) ?? (vendor ? types[path.split('.').pop()] ?? 'application/octet-stream' : 'text/html')) + '; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self' blob:; script-src 'self' 'unsafe-eval'; frame-ancestors 'none'; base-uri 'self'",

    });
    res.end(data);
  } catch {
    res.writeHead(vendor ? 404 : 500);
    res.end('Could not read the requested file');
  }
}).listen(port, host, () => console.log(`Place AI Vision → http://127.0.0.1:${port}`));
