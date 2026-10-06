import { test, expect, type Page } from '@playwright/test';
import { build, createServer, preview, type ViteDevServer, type PreviewServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { STORAGE_KEY, type StudyData } from '../src/model';
import { performanceData } from './fixtures/studyData';

// Opt-in measurements, never millisecond pass/fail gates. Run on the same host,
// browser and workload before/after; synthetic data never leaves localhost.
const enabled = process.env.NINHO_PERFORMANCE === '1';
const label = (process.env.NINHO_PERFORMANCE_LABEL ?? 'current').replace(/[^a-z0-9_-]/gi, '-');
const resultsDirectory = resolve('.cache', 'performance');
const rounds = Math.max(1, Math.min(50, Number(process.env.NINHO_PERFORMANCE_ROUNDS) || 3));
const sizes = [71, 1000, 5000].filter(size => !process.env.NINHO_PERFORMANCE_SIZES || process.env.NINHO_PERFORMANCE_SIZES.split(',').includes(String(size)));
let production: PreviewServer;
let development: ViteDevServer;
let productionOrigin: string;
let developmentOrigin: string;


async function frames(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function navigate(page: Page, destination: string) {
  return page.evaluate(async destination => {
    const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar nav button')).find(button => button.getAttribute('aria-label') === destination);
    if (!button) throw new Error(`Navegação ausente: ${destination}`);
    const start = performance.now();
    button.click();
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return { milliseconds: performance.now() - start, domElements: document.querySelectorAll('*').length, subjectCards: document.querySelectorAll('.subject-card').length, reviewRows: document.querySelectorAll('.review-row').length };
  }, destination);
}

test.describe('carga sintética e perfil de desempenho', () => {
  test.skip(!enabled, 'Ative NINHO_PERFORMANCE=1 para medir; não é um limite temporal de CI.');
  test.beforeAll(async () => {
    await mkdir(resultsDirectory, { recursive: true });
    const previousNodeEnv = process.env.NODE_ENV;
    const previousBase = process.env.PAGES_BASE_PATH;
    const outDir = resolve(resultsDirectory, 'site');
    try {
      process.env.NODE_ENV = 'production';
      process.env.PAGES_BASE_PATH = '';
      await build({ build: { outDir, emptyOutDir: true }, logLevel: 'error' });
      production = await preview({ build: { outDir }, preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;
      if (previousBase === undefined) delete process.env.PAGES_BASE_PATH; else process.env.PAGES_BASE_PATH = previousBase;
    }
    const address = production.httpServer.address();
    if (!address || typeof address === 'string') throw new Error('Preview indisponível');
    productionOrigin = `http://127.0.0.1:${address.port}`;
    development = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
    await development.listen();
    const devAddress = development.httpServer?.address();
    if (!devAddress || typeof devAddress === 'string') throw new Error('Módulos indisponíveis');
    developmentOrigin = `http://127.0.0.1:${devAddress.port}`;
  });
  test.afterAll(async () => {
    await development?.close();
    if (production) await new Promise<void>((resolve, reject) => production.httpServer.close(error => error ? reject(error) : resolve()));
  });

  for (const size of sizes) test(`${size} itens em cada coleção`, async ({ page, browserName }, info) => {
    test.setTimeout(180000);
    const data = performanceData(size);
    const raw = JSON.stringify(data);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addInitScript(({ key, raw }) => {
      localStorage.setItem(key, raw);
      const tasks: number[] = [];
      Object.defineProperty(window, 'performanceTasks', { value: tasks });
      new PerformanceObserver(list => tasks.push(...list.getEntries().map(entry => entry.duration))).observe({ type: 'longtask', buffered: true });
    }, { key: STORAGE_KEY, raw });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const loadedAt = performance.now();
    await page.goto(productionOrigin);
    await expect(page.getByRole('heading', { name: 'Um passo de cada vez.', exact: true })).toBeVisible();
    await frames(page);
    const loadMs = performance.now() - loadedAt;
    const before = await cdp.send('Performance.getMetrics');
    const navigation: Record<string, Awaited<ReturnType<typeof navigate>>[]> = {};
    for (let round = 0; round < rounds; round++) {
      for (const destination of ['Matérias', 'Revisões', 'Questões', 'Temporizador', 'Meu ninho']) {
        (navigation[destination] ??= []).push(await navigate(page, destination));
      }
    }
    await navigate(page, 'Matérias');
    const repeatedRenderMs = await page.evaluate(async () => {
      const samples: number[] = [];
      for (let index = 0; index < 5; index++) {
        const start = performance.now();
        document.dispatchEvent(new Event('visibilitychange'));
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        samples.push(performance.now() - start);
      }
      return samples;
    });
    await navigate(page, 'Temporizador');
    const savePresetMs = await page.evaluate(async () => {
      const start = performance.now();
      document.querySelectorAll<HTMLButtonElement>('.presets button')[0].click();
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      return performance.now() - start;
    });
    const after = await cdp.send('Performance.getMetrics');
    const dom = await cdp.send('Memory.getDOMCounters');
    await cdp.send('HeapProfiler.collectGarbage');
    const retained = await cdp.send('Performance.getMetrics');
    const longTasks = await page.evaluate(() => (window as unknown as { performanceTasks: number[] }).performanceTasks);
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!) as StudyData, STORAGE_KEY);
    expect(stored.subjects).toHaveLength(size);
    expect(stored.sessions).toHaveLength(size);
    expect(stored.reviews).toHaveLength(size);
    expect(stored.questions).toHaveLength(size);
    expect(stored.timer.duration).toBe(900);
    await page.goto(developmentOrigin);
    const algorithms = await page.evaluate(async raw => {
      const modelPath = '/src/model.ts', streakPath = '/src/streak.ts', summaryPath = '/src/StudySummary.tsx', indexPath = '/src/studyIndex.ts';
      const [{ parseData }, { studyStreak }, { descriptiveSummary }, { subjectStudyIndex }] = await Promise.all([import(modelPath), import(streakPath), import(summaryPath), import(indexPath)]);
      const data = parseData(raw);
      function measure(action: () => unknown) {
        action();
        return Array.from({ length: 7 }, () => { const start = performance.now(); action(); return performance.now() - start; });
      }
      return { parseMs: measure(() => parseData(raw)), streakMs: measure(() => studyStreak(data)), summaryMs: measure(() => descriptiveSummary(data)), subjectIndexMs: measure(() => subjectStudyIndex(data.subjects, data.sessions)) };
    }, raw);
    const machine = await page.evaluate(() => ({ userAgent: navigator.userAgent, logicalProcessors: navigator.hardwareConcurrency, devicePixelRatio }));
    const metrics = { label, browser: browserName, browserVersion: page.context().browser()?.version(), machine, rounds, viewport: { width: 1280, height: 900 }, sizePerCollection: size, utf8Bytes: Buffer.byteLength(raw), loadMs, navigation, repeatedRenderMs, savePresetMs, algorithms, longTasks, browserMetrics: { before: before.metrics, after: after.metrics, retainedAfterForcedGC: retained.metrics }, domCountersBeforeGC: dom, measuredAt: new Date().toISOString() };
    const output = resolve(resultsDirectory, `${label}-${size}.json`);
    await writeFile(output, JSON.stringify(metrics, null, 2));
    await info.attach(`${label}-${size}`, { path: output, contentType: 'application/json' });
    console.log(JSON.stringify({ label, size, loadMs, subjectMs: navigation['Matérias'].map(sample => sample.milliseconds), reviewMs: navigation['Revisões'].map(sample => sample.milliseconds), subjectDOM: navigation['Matérias'][0].domElements, repeatedRenderMs, parseMs: algorithms.parseMs, output }));
  });
});
