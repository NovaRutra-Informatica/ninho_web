import { test, expect, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { completeReview, demoData, freshData, parseData, STORAGE_KEY, type StudyData } from '../src/model';
import { localDay, studyStreak } from '../src/streak';

let server: ViteDevServer;
let origin: string;
const pages = ['today', 'timer', 'subjects', 'reviews', 'questions', 'data'];
test.beforeAll(async () => {
  server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Sem porta');
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => server.close());

function profileData(seen = pages) {
  const data = freshData();
  data.profile = { ...data.profile!, name: 'Ana', completedAt: new Date().toISOString(), tutorialsSeen: [...seen] };
  return data;
}
async function seed(page: Page, data = profileData()) {
  await page.addInitScript(({ key, data }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data));
  }, { key: STORAGE_KEY, data });
  await page.goto(origin);
}
const readData = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!) as StudyData, STORAGE_KEY);
const nav = (page: Page, name: string) => page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
async function blockWrites(page: Page) {
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.defineProperty(window, 'restoreWrites', { configurable: true, value: () => { Storage.prototype.setItem = original; } });
    Storage.prototype.setItem = () => { throw new DOMException('Quota', 'QuotaExceededError'); };
  });
}

test('sequência considera estudo real, revisões e respostas, ignora futuro e atravessa dias locais', () => {
  const now = new Date(2026, 10, 2, 10).getTime();
  const data = profileData();
  expect(studyStreak(data, now)).toMatchObject({ count: 0, studiedToday: false });
  data.sessions = [
    { id: 'yesterday', subjectId: 's', topic: '', notes: '', confidence: 2, seconds: 60, completedAt: new Date(2026, 10, 1, 12).getTime() },
    { id: 'before', subjectId: 's', topic: '', notes: '', confidence: 2, seconds: 30, completedAt: new Date(2026, 9, 31, 12).getTime() },
    { id: 'zero', subjectId: 's', topic: '', notes: '', confidence: 2, seconds: 0, completedAt: now },
    { id: 'future', subjectId: 's', topic: '', notes: '', confidence: 2, seconds: 60, completedAt: now + 1000 },
  ];
  expect(studyStreak(data, now)).toMatchObject({ count: 2, studiedToday: false });
  data.reviewHistory = [{ id: 'review', reviewedAt: now }];
  expect(studyStreak(data, now)).toMatchObject({ count: 3, studiedToday: true });
  data.reviewHistory = [];
  data.answers = [{ id: 'answer', questionId: 'q', selected: 1, correct: false, answeredAt: now }];
  expect(studyStreak(data, now)).toMatchObject({ count: 3, studiedToday: true });
  data.answers[0].answeredAt = now + 1;
  expect(studyStreak(data, now)).toMatchObject({ count: 2, studiedToday: false });
  expect(studyStreak(data, new Date(2026, 10, 5, 12).getTime()).count).toBe(0);
  expect(localDay(new Date(2026, 0, 1).getTime())).toBe('2026-01-01');
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`tutorial central bloqueia navegação, teclado e fundo em ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await seed(page, profileData([]));
    const dialog = page.getByRole('dialog', { name: 'Tutorial desta tela' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button')).toHaveCount(2);
    await expect(dialog.getByRole('button', { name: 'Próximo', exact: true })).toBeFocused();
    await expect.poll(async () => { const box = (await dialog.boundingBox())!; return Math.abs(box.x + box.width / 2 - viewport.width / 2); }).toBeLessThan(2);
    await expect.poll(async () => { const box = (await dialog.boundingBox())!; return Math.abs(box.y + box.height / 2 - viewport.height / 2); }).toBeLessThan(2);
    await page.screenshot({ path: info.outputPath(`tutorial-${viewport.width}.png`) });
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5);
    const profile = (await page.locator('.profile-link').boundingBox())!;
    await page.mouse.click(profile.x + profile.width / 2, profile.y + profile.height / 2);
    await expect(dialog).toBeVisible();
    for (let index = 0; index < 5; index++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBeTruthy();
    }
    await dialog.getByRole('button', { name: 'Próximo', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'Seu dia em poucos números' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Entendi', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const flame = page.getByRole('button', { name: 'Sua sequência: 0 dias', exact: true });
    await expect(flame).toBeVisible();
    await expect(flame).not.toHaveClass(/active/);
    await page.screenshot({ path: info.outputPath(`inactive-zero-${viewport.width}.png`) });
    await expect(page.getByRole('navigation')).toHaveCount(1);
    await page.getByRole('button', { name: 'Meu perfil', exact: true }).click();
    await expect(page.getByLabel('Como quer ser chamado?')).toHaveValue('Ana');
    await nav(page, 'Matérias');
    await page.getByRole('button', { name: 'Ver depois', exact: true }).click();
    await page.getByRole('button', { name: 'Nova matéria', exact: true }).click();
    await page.getByLabel('Nome da matéria').fill('Biologia');
    await page.getByRole('dialog').getByRole('button', { name: 'Adicionar matéria', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Biologia', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Como funciona', exact: true }).click();
    await expect(dialog).toBeVisible();
    await page.getByRole('button', { name: 'Ver depois', exact: true }).click();
    expect((await readData(page)).profile?.tutorialsSeen).toEqual(['today', 'subjects']);
  });
}

test('tutorial curto permite rolar sem esconder ações e respeita ambas as reduções de movimento', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 300 });
  const data = profileData([]);
  data.preferences!.reducedMotion = true;
  await seed(page, data);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Ver depois' })).toBeInViewport();
  await expect(dialog.getByRole('button', { name: 'Próximo' })).toBeInViewport();
  expect(await page.locator('.tutorial-content').evaluate(element => element.scrollHeight > element.clientHeight)).toBeTruthy();
  expect(await dialog.evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.locator('.tutorial-intro>.owl').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => { document.documentElement.dataset.reducedMotion = 'false'; });
  expect(await dialog.evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await page.getByRole('button', { name: 'Ver depois' }).click();
});

test('falha ao concluir tutorial mantém bloqueio e não persiste uma conclusão falsa', async ({ page }) => {
  await seed(page, profileData([]));
  await blockWrites(page);
  await page.getByRole('button', { name: 'Próximo', exact: true }).click();
  await page.getByRole('button', { name: 'Entendi', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Não foi possível salvar o tutorial');
  expect((await readData(page)).profile?.tutorialsSeen).toEqual([]);
  await page.evaluate(() => (window as unknown as { restoreWrites: () => void }).restoreWrites());
  await page.getByRole('button', { name: 'Entendi', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await readData(page)).profile?.tutorialsSeen).toEqual(['today']);
});

test('restauração só informa sucesso após gravar e preserva dados na falha', async ({ page }) => {
  const data = { ...demoData(), profile: profileData().profile };
  await seed(page, data);
  await page.getByRole('button', { name: 'Seus dados', exact: true }).click();
  const replacement = profileData();
  replacement.subjects = [{ id: 'new', name: 'Química', color: 0, createdAt: Date.now() }];
  replacement.timer.subjectId = 'new';
  replacement.timer.elapsed = 20;
  replacement.timer.startedAt = Date.now();
  await page.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(replacement)) });
  await blockWrites(page);
  await page.getByRole('button', { name: 'Restaurar dados', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Seus dados atuais foram mantidos');
  expect(await readData(page)).toEqual(data);
  await expect(page.getByText('Pronto. Seu ninho foi atualizado.')).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { restoreWrites: () => void }).restoreWrites());
  await page.getByRole('button', { name: 'Restaurar dados', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Pronto. Seu ninho foi atualizado.')).toBeVisible();
  const restored = parseData(JSON.stringify(await readData(page)));
  expect(restored.subjects[0].name).toBe('Química');
  expect(restored.timer.startedAt).toBeNull();
  expect(restored.timer.elapsed).toBeGreaterThanOrEqual(20);
});

test('calendário abre sem recarga, mostra dias e desativa chama depois da meia-noite', async ({ page }) => {
  const now = new Date(2026, 8, 23, 23, 59, 50);
  await page.clock.install({ time: now });
  const data = { ...demoData(), profile: profileData().profile };
  data.sessions[0].completedAt = new Date(2026, 8, 23, 12).getTime();
  await seed(page, data);
  let reloads = 0;
  page.on('framenavigated', () => { reloads += 1; });
  const flame = page.getByRole('button', { name: 'Sua sequência: 1 dia', exact: true });
  await expect(flame).toHaveClass(/active/);
  await flame.click();
  await expect(page.getByLabel('23/09/2026, hoje, dia estudado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mês anterior', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'agosto de 2026' })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar para hoje', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'setembro de 2026' })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.clock.fastForward(61_000);
  await expect(flame).not.toHaveClass(/active/);
  await expect(flame).toHaveAttribute('aria-description', /Ainda sem estudo hoje/);
  expect(reloads).toBe(0);
});

test('resposta incorreta conta como estudo e revisões conservam dias anteriores', async ({ page }) => {
  const now = new Date(2026, 8, 23, 12);
  await page.clock.install({ time: now });
  const data = { ...demoData(), profile: profileData().profile };
  data.sessions = [];
  data.reviews[0].lastReviewedAt = new Date(2026, 8, 22, 12).getTime();
  await seed(page, data);
  await nav(page, 'Questões');
  await page.locator('.answer-option').first().click();
  const flame = page.getByRole('button', { name: 'Sua sequência: 2 dias', exact: true });
  await expect(flame).toHaveClass(/active/);
  await nav(page, 'Revisões');
  await page.getByRole('button', { name: 'Já revisei', exact: true }).click();
  const saved = await readData(page);
  expect(saved.reviewHistory).toHaveLength(2);
  await flame.click();
  await expect(page.getByLabel('22/09/2026, dia estudado', { exact: true })).toBeVisible();
  await expect(page.getByLabel('23/09/2026, hoje, dia estudado', { exact: true })).toBeVisible();
});

test('histórico importado com 20 mil revisões compacta repetições sem perder dias ou impedir a revisão', async ({ page }) => {
  const now = new Date(2026, 8, 23, 12);
  await page.clock.install({ time: now });
  const data = { ...demoData(), profile: profileData().profile };
  data.sessions = [];
  data.reviews[0].lastReviewedAt = new Date(2026, 8, 21, 12).getTime();
  const yesterday = new Date(2026, 8, 22, 12).getTime();
  data.reviewHistory = Array.from({ length: 20000 }, (_, index) => ({ id: `review-${index}`, reviewedAt: yesterday + index }));
  const imported = parseData(JSON.stringify(data));
  const daysBefore = studyStreak(imported, now.getTime()).activeDays;
  await seed(page, imported);
  await nav(page, 'Revisões');
  await page.getByRole('button', { name: 'Já revisei', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Revisão registrada.');
  const saved = parseData(JSON.stringify(await readData(page)));
  expect(saved.reviewHistory).toHaveLength(3);
  expect(saved.reviews[0].stage).toBe(data.reviews[0].stage + 1);
  expect(saved.reviews[0].lastReviewedAt).toBeGreaterThanOrEqual(now.getTime());
  const daysAfter = studyStreak(saved, now.getTime() + 60000).activeDays;
  expect([...daysBefore].every(day => daysAfter.has(day))).toBeTruthy();
  expect(daysAfter.has(localDay(now.getTime()))).toBeTruthy();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sua sequência: 3 dias', exact: true })).toHaveClass(/active/);
  await expect(page.getByText('Vamos proteger seus estudos.', { exact: true })).toHaveCount(0);
});

test('20 mil dias distintos impedem substituição destrutiva e nunca geram falso sucesso', async ({ page }) => {
  const now = new Date(2026, 8, 23, 12);
  await page.clock.install({ time: now });
  const data = { ...demoData(), profile: profileData().profile };
  data.reviewHistory = Array.from({ length: 20000 }, (_, index) => ({ id: `review-${index}`, reviewedAt: new Date(1970, 0, 1 + index, 12).getTime() }));
  const imported = parseData(JSON.stringify(data));
  expect(() => completeReview(imported, imported.reviews[0].id, now.getTime())).toThrow(/limite de dias distintos/);
  expect(imported).toEqual(data);
  await seed(page, imported);
  await nav(page, 'Revisões');
  await page.getByRole('button', { name: 'Já revisei', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('limite de dias distintos. Seus dados foram mantidos');
  await page.clock.fastForward(10000);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Revisão registrada. O próximo intervalo já foi agendado.', { exact: true })).toHaveCount(0);
  expect(parseData(JSON.stringify(await readData(page)))).toEqual(imported);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Um passo de cada vez.', exact: true })).toBeVisible();
});

test('som é opcional, curto, sem sobreposição; ajustes não tocam e áudio libera após ociosidade', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    const events: { event: string; value: number; time: number }[] = [];
    Object.defineProperty(window, 'audioEvents', { value: events });
    const record = (event: string, value = 0, time = performance.now() / 1000) => events.push({ event, value, time });
    class Context {
      state = 'running';
      destination = {};
      get currentTime() { return performance.now() / 1000; }
      resume() { this.state = 'running'; return Promise.resolve(); }
      close() { this.state = 'closed'; record('close'); return Promise.resolve(); }
      createGain() { return { connect() {}, disconnect() {}, gain: { setValueAtTime(value: number, time: number) { record('gain', value, time); }, linearRampToValueAtTime(value: number, time: number) { record('gain', value, time); } } }; }
      createOscillator() {
        const oscillator = { type: '', onended: null as null | (() => void), connect() {}, disconnect() {}, frequency: { setValueAtTime(value: number) { record('frequency', value); } }, start(time: number) { record('start', 0, time); }, stop(time = performance.now() / 1000) { record('stop', 0, time); setTimeout(() => oscillator.onended?.(), Math.max(0, time * 1000 - performance.now())); } };
        return oscillator;
      }
    }
    Object.defineProperty(window, 'AudioContext', { value: Context });
  });
  const audioEvents = () => page.evaluate(() => (window as unknown as { audioEvents: { event: string; value: number; time: number }[] }).audioEvents);
  await seed(page);
  await nav(page, 'Matérias');
  expect(await audioEvents()).toHaveLength(0);
  await page.getByRole('button', { name: 'Seus dados', exact: true }).click();
  await page.getByLabel('Sons de navegação', { exact: true }).check();
  await page.getByLabel('Aparência').selectOption('dark');
  await page.getByLabel('Reduzir animações').check();
  expect(await audioEvents()).toHaveLength(0);
  await page.evaluate(() => {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.sidebar nav button');
    buttons[2].click(); buttons[3].click(); buttons[4].click();
  });
  let events = await audioEvents();
  expect(events.filter(event => event.event === 'start')).toHaveLength(1);
  expect(events.find(event => event.event === 'frequency')?.value).toBe(720);
  expect(events.find(event => event.event === 'stop')!.time - events.find(event => event.event === 'start')!.time).toBeCloseTo(0.07, 4);
  expect(Math.max(...events.filter(event => event.event === 'gain').map(event => event.value))).toBeLessThanOrEqual(0.024);
  await page.clock.runFor(80);
  await page.evaluate(() => document.querySelectorAll<HTMLButtonElement>('.sidebar nav button')[1].click());
  expect((await audioEvents()).filter(event => event.event === 'start')).toHaveLength(1);
  await page.clock.runFor(70);
  await page.evaluate(() => document.querySelectorAll<HTMLButtonElement>('.sidebar nav button')[2].click());
  expect((await audioEvents()).filter(event => event.event === 'start')).toHaveLength(2);
  await page.clock.runFor(500);
  expect((await audioEvents()).filter(event => event.event === 'close')).toHaveLength(1);
  await page.getByRole('button', { name: 'Como funciona', exact: true }).click();
  await page.clock.runFor(150);
  await page.getByRole('button', { name: 'Ver depois', exact: true }).click();
  await page.clock.runFor(150);
  await page.getByRole('button', { name: 'Sua sequência: 0 dias', exact: true }).click();
  await page.clock.runFor(150);
  await page.getByRole('button', { name: 'Mês anterior', exact: true }).click();
  events = await audioEvents();
  expect(events.filter(event => event.event === 'start')).toHaveLength(6);
  const starts = events.filter(event => event.event === 'start');
  expect(starts.slice(1).every((event, index) => event.time - starts[index].time >= 0.14)).toBeTruthy();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('button', { name: 'Seus dados', exact: true }).click();
  await page.getByLabel('Sons de navegação', { exact: true }).uncheck();
  expect((await audioEvents()).filter(event => event.event === 'close')).toHaveLength(2);
  const countAfterMute = (await audioEvents()).filter(event => event.event === 'start').length;
  await page.clock.runFor(500);
  await nav(page, 'Meu ninho');
  expect((await audioEvents()).filter(event => event.event === 'start')).toHaveLength(countAfterMute);
});
