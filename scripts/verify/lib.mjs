// Shared helpers for scripts/verify/*.mjs — a zero-dependency static file
// server (same as scripts/check-a11y-responsive.mjs) plus a tiny PASS/FAIL
// reporter so every verify script prints and exits consistently.
import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize, relative, resolve } from 'node:path';

const root = resolve(process.cwd());

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.geojson': 'application/geo+json; charset=utf-8'
};

export function startServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = normalize(join(root, pathname));
    if (!filePath.startsWith(root) || relative(root, filePath).startsWith('..')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (!existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[extname(filePath).toLowerCase()] || 'application/octet-stream' });
    createReadStream(filePath).pipe(res);
  });
  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolveServer({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

export function makeReporter(name) {
  const results = [];
  const check = (label, ok, detail = '') => {
    results.push({ label, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
  };
  const finish = () => {
    const failed = results.filter(r => !r.ok).length;
    console.log(`\n${name}: ${results.length - failed}/${results.length} checks passed`);
    process.exitCode = failed ? 1 : 0;
    return failed === 0;
  };
  return { check, finish };
}
