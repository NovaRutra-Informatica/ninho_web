import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const basePath = (process.env.PAGES_BASE_PATH ?? '').replace(/^\/+|\/+$/g, '');

export default defineConfig({
  base: basePath ? `/${basePath}/` : '/',
  plugins: [
    react(),
    {
      name: 'offline-shell',
      apply: 'build',
      async writeBundle(options) {
        const directory = resolve(options.dir ?? 'dist');
        const files = (await readdir(directory, { recursive: true })).filter(file => /\.(html|js|css|svg)$/.test(file) && file !== 'sw.js').map(file => file.replaceAll('\\', '/')).sort();
        const hash = createHash('sha256');
        for (const file of files) hash.update(await readFile(join(directory, file)));
        const base = basePath ? `/${basePath}/` : '/';
        const prefix = `ninho-shell:${base}:`;
        const cache = `${prefix}${hash.digest('hex').slice(0, 16)}`;
        await writeFile(join(directory, 'sw.js'), `
const CACHE = ${JSON.stringify(cache)};
const PREFIX = ${JSON.stringify(prefix)};
const BASE = ${JSON.stringify(base)};
const FILES = ${JSON.stringify(files.map(file => `${base}${file}`))};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (event.request.mode === 'navigate' && (url.pathname === BASE || url.pathname === BASE + 'index.html')) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(BASE + 'index.html')).then(cached => cached || fetch(event.request)));
  } else if (FILES.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname)).then(cached => cached || fetch(event.request)));
  }
});
`);
      },
    },
    {
      name: 'production-csp',
      apply: 'build',
      transformIndexHtml: () => [{
        tag: 'meta',
        attrs: {
          'http-equiv': 'Content-Security-Policy',
          content: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; worker-src 'self'",
        },
        injectTo: 'head-prepend',
      }],
    },
  ],
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
});
