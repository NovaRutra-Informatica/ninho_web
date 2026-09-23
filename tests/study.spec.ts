import { test, expect, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { demoData, freshData, parseData, STORAGE_KEY, DAY } from '../src/model';

let server: ViteDevServer;
let origin: string;
test.beforeAll(async () => {
  server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Servidor de teste indisponível.');
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => server.close());
test.beforeEach(async ({ page }) => {
  const data = freshData(); delete data.profile;
  await page.addInitScript(({ key, data }) => { if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(data)); }, { key: STORAGE_KEY, data });
});
const nav = (page: Page, name: string) => page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
const stored = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
async function subject(page: Page, name = 'Biologia') {
  await page.getByRole('button', { name: 'Nova matéria' }).click();
  await page.getByLabel('Nome da matéria').fill(name);
  await page.getByRole('dialog').getByRole('button', { name: 'Adicionar matéria', exact: true }).click();
}
async function seed(page: Page) {
  await page.goto(origin);
  await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: STORAGE_KEY, data: { ...demoData(), profile: undefined } });
  await page.reload();
}

test('sessão mantém relógio na recarga, pausa, salva feedback e agenda revisão', async ({ page }) => {
  await page.clock.install();
  await page.goto(origin);
  await subject(page);
  await nav(page, 'Temporizador');
  await page.getByLabel('Tema da sessão').fill('Fotossíntese');
  await page.getByLabel('Duração em minutos').fill('1');
  await page.getByRole('button', { name: 'Começar foco' }).click();
  await page.clock.fastForward(20000);
  await expect(page.locator('.timer-number')).toHaveText('00:40');
  await page.reload();
  await nav(page, 'Temporizador');
  await expect(page.locator('.timer-number')).toHaveText('00:40');
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.clock.fastForward(120000);
  await expect(page.locator('.timer-number')).toHaveText('00:40');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.clock.fastForward(50000);
  await expect(page.locator('.timer-number')).toHaveText('00:00');
  await page.getByRole('button', { name: 'Concluir sessão' }).click();
  await page.getByLabel('Preciso reforçar').check();
  await page.getByLabel('Anotações (opcional)').fill('Revisar fase clara.');
  await page.getByRole('button', { name: 'Salvar sessão' }).click();
  const data = await stored(page);
  expect(data.sessions).toHaveLength(1);
  expect(data.sessions[0]).toMatchObject({ seconds: 60, topic: 'Fotossíntese', notes: 'Revisar fase clara.', confidence: 1 });
  expect(data.reviews[0].dueAt - data.sessions[0].completedAt).toBe(DAY);
  expect(data.timer.startedAt).toBeNull();
  await page.reload();
  await nav(page, 'Matérias');
  await page.getByText('Fotossíntese', { exact: true }).click();
  await expect(page.getByText('Revisar fase clara.', { exact: true })).toBeVisible();
});

test('cronômetro pausa, bloqueia troca de matéria e exige confirmação para descarte', async ({ page }) => {
  await page.clock.install();
  await seed(page);
  await nav(page, 'Temporizador');
  await page.getByRole('button', { name: 'Cronômetro', exact: true }).click();
  await page.getByRole('button', { name: 'Começar foco' }).click();
  await page.clock.fastForward(65000);
  await expect(page.locator('.timer-number')).toHaveText('01:05');
  await expect(page.getByLabel('Matéria', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar sessão' }).click();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.locator('.timer-number')).toHaveText('01:05');
  await page.getByRole('button', { name: 'Concluir sessão' }).click();
  await page.getByRole('button', { name: 'Salvar sessão' }).click();
  expect((await stored(page)).sessions[0].seconds).toBe(65);
});

test('questão criada, erro e acerto persistem com gabarito e revisão avançada', async ({ page }) => {
  await page.goto(origin);
  await subject(page, 'Matemática');
  await nav(page, 'Questões');
  await page.getByRole('button', { name: 'Nova questão' }).click();
  await page.getByLabel('Enunciado').fill('Quanto é 2 + 2?');
  for (const [letter, value] of [['A', '3'], ['B', '4'], ['C', '5'], ['D', '6']]) await page.getByLabel(letter, { exact: true }).fill(value);
  await page.getByLabel('Resposta correta').selectOption('1');
  await page.getByLabel('Explicação (opcional)').fill('Duas unidades mais duas unidades são quatro.');
  await page.getByRole('button', { name: 'Salvar questão' }).click();
  await page.locator('.answer-option').nth(0).click();
  await expect(page.getByText('Mais uma chance de aprender.')).toBeVisible();
  await expect(page.locator('.answer-option').nth(1)).toHaveClass(/correct/);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await page.locator('.answer-option').nth(1).click();
  await expect(page.getByText('Isso mesmo!')).toBeVisible();
  const data = await stored(page);
  expect(data.answers.map((a: { correct: boolean }) => a.correct)).toEqual([false, true]);
  await page.reload();
  await nav(page, 'Questões');
  await expect(page.getByText('acertos em 2 respostas', { exact: false })).toBeVisible();
});

test('revisão registra próximo intervalo e mantém histórico de estudo', async ({ page }) => {
  await seed(page);
  const before = await stored(page);
  await page.getByRole('button', { name: 'Ver revisões' }).click();
  await page.getByRole('button', { name: 'Já revisei' }).click();
  const after = await stored(page);
  expect(after.reviews[0].stage).toBe(1);
  expect(after.reviews[0].dueAt - after.reviews[0].lastReviewedAt).toBe(3 * DAY);
  expect(after.sessions).toEqual(before.sessions);
  await expect(page.getByText('0 para agora')).toBeVisible();
});

test('backup exporta e restaura; arquivo inválido nunca sobrescreve os dados', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Seus dados', exact: true }).click();
  const before = await stored(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^ninho-backup-.*\.json$/);
  await page.getByLabel('Restaurar backup', { exact: true }).setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1}') });
  await expect(page.getByRole('status')).toContainText('Formato de backup inválido');
  expect(await stored(page)).toEqual(before);
  const changed = structuredClone(before); changed.subjects[0].name = 'Restaurada';
  await page.getByLabel('Restaurar backup', { exact: true }).setInputFiles({ name: 'good.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(changed)) });
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await stored(page)).toEqual(before);
  await page.getByRole('button', { name: 'Restaurar dados', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restaurada 25 min de estudo' })).toBeVisible();
});

test('armazenamento corrompido é preservado para recuperação', async ({ page }) => {
  await page.goto(origin);
  await page.evaluate(key => localStorage.setItem(key, '{corrupted'), STORAGE_KEY);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Vamos proteger seus estudos.' })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe('{corrupted');
  await page.getByRole('button', { name: 'Recomeçar' }).click();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe('{corrupted');
});

test('falha de quota preserva mudanças em memória para backup', async ({ page }) => {
  await seed(page);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  await subject(page, 'Química');
  await subject(page, 'Física');
  await expect(page.getByRole('alert')).toContainText('Não foi possível salvar');
  await nav(page, 'Matérias');
  await expect(page.getByRole('heading', { name: 'Química', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Física', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Seus dados', exact: true }).click();
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar backup' }).click();
  const stream = await (await promise).createReadStream();
  const chunks: Buffer[] = []; if (stream) for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(parseData(Buffer.concat(chunks).toString()).subjects).toHaveLength(5);
});

test('navegação responsiva sem overflow e capturas de revisão', async ({ page }, testInfo) => {
  await seed(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: testInfo.outputPath('ninho-web-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('ninho-web-mobile.png'), fullPage: true });
  for (const label of ['Meu ninho', 'Temporizador', 'Matérias', 'Revisões', 'Questões']) {
    await page.getByRole('navigation').getByRole('button', { name: label, exact: label !== 'Revisões' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await nav(page, 'Temporizador');
  await page.screenshot({ path: testInfo.outputPath('ninho-web-timer-mobile.png'), fullPage: true });
});

test('duas abas mantêm matérias e sessão em sincronia', async ({ page, context }) => {
  await page.goto(origin);
  await subject(page, 'Primeira matéria');
  const second = await context.newPage();
  await second.goto(origin);
  await subject(second, 'Segunda matéria');
  await nav(page, 'Matérias');
  await expect(page.getByRole('heading', { name: 'Segunda matéria', exact: true })).toBeVisible();
  await nav(page, 'Temporizador');
  await page.getByRole('button', { name: 'Começar foco' }).click();
  await nav(second, 'Temporizador');
  await expect(second.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await second.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toHaveCount(0);
  expect((await stored(page)).subjects).toHaveLength(2);
  await second.close();
});
