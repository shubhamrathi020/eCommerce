import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
/**
 * Angular rejects requests whose Host header is not on this list (protection against SSRF and host-header attacks).
 * Add real domains through the ALLOWED_HOSTS environment variable (comma separated, wildcards like *.example.com allowed).
 */
const allowedHosts = ['localhost', '127.0.0.1', 'storefront', ...(process.env['ALLOWED_HOSTS'] ?? '').split(',').map((h) => h.trim()).filter(Boolean)];
const angularApp = new AngularNodeAppEngine({ allowedHosts });

app.disable('x-powered-by');
// Behind an ingress or load balancer, trust its forwarded headers (protocol, client address).
app.set('trust proxy', true);

let ready = false;

/** Health endpoints answer before anything else so probes never trigger a render. */
app.get('/healthz', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});
app.get('/readyz', (_req, res) => {
  res.status(ready ? 200 : 503).type('text/plain').send(ready ? 'ready' : 'starting');
});

/**
 * Content-Security-Policy. Scripts run only from our own files, from Angular's static inline bootstrap script
 * (allowed by hash, computed from the built HTML) or from inline scripts carrying this request's random nonce.
 * In development the built HTML does not exist, so the policy is skipped there.
 */
function staticScriptHashes(): string[] | undefined {
  try {
    const html = readFileSync(resolve(serverDistFolder, 'index.server.html'), 'utf8');
    return [...html.matchAll(/<script(?![^>]*\ssrc=)(?![^>]*type="application\/(?:json|ld\+json)")[^>]*>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
  } catch {
    return undefined;
  }
}
const scriptHashes = staticScriptHashes();

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${(scriptHashes ?? []).join(' ')}`.trim(),
    // Angular adds component styles at runtime; styles are lower risk than scripts.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const nonce = randomBytes(16).toString('base64');
  res.locals['nonce'] = nonce;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (scriptHashes) res.setHeader('Content-Security-Policy', buildCsp(nonce));
  next();
});

/** Content-hashed build files are cached for a year; everything else (favicon, mock images) for an hour. */
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    setHeaders: (res, path) => {
      const hashed = /-[A-Za-z0-9]{8}\.(?:js|css|woff2?)$/.test(path);
      res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
    },
  }),
);

/** Everything else is rendered by Angular. */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req, { nonce: res.locals['nonce'] })
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Starts the server when run directly (`node server.mjs`), on `PORT` or 4000.
 * On SIGTERM (Kubernetes rolling updates) it stops accepting new connections and exits once in-flight requests finish.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  const server = app.listen(port, () => {
    ready = true;
    console.log(`Storefront listening on http://localhost:${port}`);
  });
  const shutdown = () => {
    ready = false;
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

/** Request handler used by the Angular CLI (dev server and build-time rendering). */
export const reqHandler = createNodeRequestHandler(app);
