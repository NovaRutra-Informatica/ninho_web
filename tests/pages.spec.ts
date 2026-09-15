import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { build, createServer as createViteServer } from 'vite';

const cacheRoot = resolve('.cache');
const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};

async function serveFiles(directory: string, base: string) {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      if (!pathname.startsWith(base)) {
        response.writeHead(404).end();
        return;
      }
      const file = resolve(directory, pathname.slice(base.length) || 'index.html');
      if (!file.startsWith(`${directory}${sep}`)) {
        response.writeHead(403).end();
        return;
      }
      const content = await readFile(file);
      response.writeHead(200, { 'Content-Type': mimeTypes[extname(file)] ?? 'application/octet-stream' });
      response.end(content);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Servidor de teste sem porta TCP.');
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

const scenarios = [
  { name: 'raiz e domínio próprio', input: '', base: '/' },
  { name: 'repositório do Pages', input: '/Ninho-Web', base: '/Ninho-Web/' },
  { name: 'subdiretório com barra final', input: '/cursos/Ninho-Web/', base: '/cursos/Ninho-Web/' },
];

for (const scenario of scenarios) {
  test.describe(scenario.name, () => {
    let server: Server | undefined;
    let origin: string;
    let directory: string;

    test.beforeAll(async () => {
      await mkdir(cacheRoot, { recursive: true });
      directory = await mkdtemp(join(cacheRoot, 'pages-test-'));
      const previousBase = process.env.PAGES_BASE_PATH;
      try {
        process.env.PAGES_BASE_PATH = scenario.input;
        await build({ build: { outDir: directory, emptyOutDir: false }, logLevel: 'error' });
      } finally {
        if (previousBase === undefined) delete process.env.PAGES_BASE_PATH;
        else process.env.PAGES_BASE_PATH = previousBase;
      }
      ({ server, origin } = await serveFiles(directory, scenario.base));
    });

    test.afterAll(async () => {
      if (server) await new Promise<void>((resolveClose) => server!.close(() => resolveClose()));
      if (directory && resolve(directory).startsWith(`${cacheRoot}${sep}pages-test-`)) {
        await rm(directory, { recursive: true, force: true });
      }
    });

    test('carrega scripts, estilos, favicon e coruja no caminho publicado', async ({ page, request }) => {
      const failures: string[] = [];
      page.on('pageerror', (error) => failures.push(error.message));
      page.on('response', (response) => { if (response.status() >= 400) failures.push(response.url()); });
      await page.goto(`${origin}${scenario.base}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('body')).toHaveCSS('margin', '0px');
      const owl = page.getByRole('img', { name: 'Coruja do Ninho' });
      await expect(owl).toHaveAttribute('src', `${scenario.base}ninho.svg`);
      await expect.poll(() => owl.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      const assetUrls = await page.locator('script[src], link[href], img[src]').evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('src') ?? element.getAttribute('href') ?? ''),
      );
      expect(assetUrls.length).toBeGreaterThanOrEqual(4);
      for (const assetUrl of assetUrls) {
        expect(assetUrl.startsWith(scenario.base)).toBe(true);
        const asset = await request.get(`${origin}${assetUrl}`);
        expect(asset.status()).toBe(200);
        expect(asset.headers()['content-type']).not.toContain('text/html');
      }
      expect((await request.get(`${origin}${scenario.base}missing.js`)).status()).toBe(404);
      expect(failures).toEqual([]);
    });

    test('CSP bloqueia injeções e conexões; navegação não envia Referer', async ({ page }) => {
      let externalRequests = 0;
      await page.route('https://external.ninho.invalid/**', async (route) => {
        externalRequests += 1;
        await route.fulfill({ body: 'unexpected' });
      });
      await page.goto(`${origin}${scenario.base}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const result = await page.evaluate(async () => {
        const violations: string[] = [];
        document.addEventListener('securitypolicyviolation', (event) => violations.push(event.effectiveDirective));
        const initialBase = document.baseURI;
        const script = document.createElement('script');
        script.textContent = "document.documentElement.dataset.inlineExecuted = 'yes'";
        document.head.append(script);
        const base = document.createElement('base');
        base.href = 'https://external.ninho.invalid/';
        document.head.append(base);
        let connectionBlocked = false;
        try { await fetch('https://external.ninho.invalid/probe'); } catch { connectionBlocked = true; }
        await new Promise((resolveEvent) => setTimeout(resolveEvent, 50));
        return {
          inlineExecuted: document.documentElement.dataset.inlineExecuted === 'yes',
          connectionBlocked,
          baseUnchanged: document.baseURI === initialBase,
          violations,
        };
      });
      expect(result.inlineExecuted).toBe(false);
      expect(result.connectionBlocked).toBe(true);
      expect(result.baseUnchanged).toBe(true);
      expect(result.violations).toEqual(expect.arrayContaining(['script-src-elem', 'connect-src', 'base-uri']));
      expect(externalRequests).toBe(0);
      await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
      let navigationCount = 0;
      let referrer: string | undefined;
      const destination = `${origin}${scenario.base}referrer-probe`;
      await page.route(destination, async (route) => {
        navigationCount += 1;
        referrer = route.request().headers()['referer'];
        await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Probe</title>' });
      });
      await page.evaluate((url) => {
        const link = document.createElement('a');
        link.href = url;
        document.body.append(link);
        link.click();
      }, destination);
      await page.waitForURL(destination);
      expect(navigationCount).toBe(1);
      expect(referrer).toBeUndefined();
    });
  });
}

test('desenvolvimento mantém React e estilos funcionando sem a CSP de produção', async ({ page }) => {
  const server = await createViteServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  try {
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === 'string') throw new Error('Vite sem porta de teste.');
    await page.goto(`http://127.0.0.1:${address.port}/`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('margin', '0px');
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(0);
  } finally {
    await server.close();
  }
});
