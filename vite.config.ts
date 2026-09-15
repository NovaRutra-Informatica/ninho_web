import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const basePath = (process.env.PAGES_BASE_PATH ?? '').replace(/^\/+|\/+$/g, '');

export default defineConfig({
  base: basePath ? `/${basePath}/` : '/',
  plugins: [
    react(),
    {
      name: 'production-csp',
      apply: 'build',
      transformIndexHtml: () => [{
        tag: 'meta',
        attrs: {
          'http-equiv': 'Content-Security-Policy',
          content: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'",
        },
        injectTo: 'head-prepend',
      }],
    },
  ],
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
});
