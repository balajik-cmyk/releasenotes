// Local dev/test server that mimics Vercel: serves the built site from dist and
// routes /api/* to the same serverless handler modules used in production.
// Usage: npm run build && node scripts/local-server.js  (http://localhost:3000)
// This is a convenience for local testing without the Vercel CLI.

import 'dotenv/config';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = normalize(join(fileURLToPath(import.meta.url), '..', '..'));
const distDir = join(root, 'dist');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

// Map an /api path to the handler module file.
function apiModulePath(pathname) {
  const rel = pathname.replace(/^\/api\//, '').replace(/\/$/, '');
  return join(root, 'api', `${rel}.js`);
}

async function serveStatic(req, res) {
  let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/admin') pathname = '/admin.html';
  let filePath = join(distDir, pathname);
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    // Fall back to public assets not copied into dist during partial builds.
  }
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (pathname.startsWith('/api/')) {
    try {
      const mod = await import(`${apiModulePath(pathname)}?t=${Date.now()}`);
      await mod.default(req, res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Handler error', detail: String(err.message || err) }));
    }
    return;
  }
  await serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Local server on http://localhost:${PORT}`);
  console.log(`  Public page: http://localhost:${PORT}/`);
  console.log(`  Admin:       http://localhost:${PORT}/admin`);
});
