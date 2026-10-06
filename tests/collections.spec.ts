import { test, expect } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { parseData, STORAGE_KEY } from '../src/model';
import { subjectStudyIndex } from '../src/studyIndex';
import { performanceData } from './fixtures/studyData';

let server: ViteDevServer;
let origin: string;
test.beforeAll(async () => {
  server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Sem porta');
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => server.close());

test('coleções grandes mantêm todos os itens acessíveis com listas limitadas, pesquisa e seleção', async ({ page }, info) => {
  const data = performanceData(1000);
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key: STORAGE_KEY, data });
  await page.goto(origin);
  const nav = (name: string) => page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
  await nav('Matérias');
  await expect(page.locator('.subject-card')).toHaveCount(48);
  await expect(page.getByText('1–48 de 1000', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Próxima página', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Matéria 48', exact: true })).toBeVisible();
  await page.getByLabel('Buscar matéria', { exact: true }).fill('Matéria 999');
  await expect(page.locator('.subject-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Estudar esta matéria', exact: true }).click();
  await expect(page.getByLabel('Matéria', { exact: true })).toHaveValue('s999');
  expect(await page.getByLabel('Matéria', { exact: true }).locator('option').count()).toBeLessThanOrEqual(101);
  await page.getByLabel('Buscar matéria', { exact: true }).fill('Matéria 850');
  await page.getByLabel('Matéria', { exact: true }).selectOption('s850');
  await expect(page.getByLabel('Matéria', { exact: true })).toHaveValue('s850');
  await nav('Questões');
  await page.getByLabel('Buscar matéria para filtrar', { exact: true }).fill('Matéria 999');
  await page.getByLabel('Filtrar por matéria', { exact: true }).selectOption('s999');
  await expect(page.getByRole('heading', { name: 'Questão 999?', exact: true })).toBeVisible();
  await nav('Revisões');
  await expect(page.locator('.review-row')).toHaveCount(48);
  await page.getByLabel('Buscar revisão', { exact: true }).fill('Matéria 850');
  await expect(page.locator('.review-row')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Tema 850', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Já revisei', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Revisão registrada');
  const saved = parseData(await page.evaluate(key => localStorage.getItem(key)!, STORAGE_KEY));
  expect(saved.subjects).toHaveLength(1000);
  expect(saved.sessions).toHaveLength(1000);
  expect(saved.reviews).toHaveLength(1000);
  expect(saved.questions).toHaveLength(1000);
  expect(saved.reviews.find(review => review.id === 'r850')!.stage).toBe(1);
  await nav('Matérias');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: info.outputPath('large-collection-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: info.outputPath('large-collection-desktop.png') });
  await page.getByLabel('Buscar matéria', { exact: true }).fill('Matéria 999');
  await page.evaluate(({ key, raw }) => {
    localStorage.setItem(key, raw);
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: raw, storageArea: localStorage }));
  }, { key: STORAGE_KEY, raw: JSON.stringify(performanceData(40)) });
  await expect(page.getByLabel('Buscar matéria', { exact: true })).toBeVisible();
  await expect(page.locator('.subject-card')).toHaveCount(0);
  await page.getByLabel('Buscar matéria', { exact: true }).fill('');
  await expect(page.locator('.subject-card')).toHaveCount(40);
});

test('índice linear conserva totais, ordem do último tema e matérias vazias', () => {
  const data = performanceData(71);
  data.sessions.unshift({ ...data.sessions[0], id: 'new', seconds: 120, topic: 'Novo tema' });
  data.sessions = data.sessions.filter(session => session.subjectId !== 's70');
  const result = subjectStudyIndex(data.subjects, data.sessions);
  for (const subject of data.subjects) {
    const original = data.sessions.filter(session => session.subjectId === subject.id);
    expect(result.get(subject.id)).toEqual({ count: original.length, seconds: original.reduce((sum, session) => sum + session.seconds, 0), latest: original[0] });
  }
});

test('validação indexada conserva rejeição de questões, gabaritos e vínculos inconsistentes', () => {
  const data = performanceData(1000);
  expect(parseData(JSON.stringify(data)).answers).toHaveLength(1000);
  for (const mutate of [
    () => { data.answers[999].questionId = 'missing'; },
    () => { data.answers[999].questionId = 'q999'; data.answers[999].correct = true; },
    () => { data.answers[999].correct = false; data.answers[999].selected = 4; },
    () => { data.answers[999].selected = 1; data.questions[999].id = 'q998'; },
  ]) {
    mutate();
    expect(() => parseData(JSON.stringify(data))).toThrow(/inconsistentes/);
  }
});

test('seletores alcançam nomes após cem prefixos e o último duplicado sem perder a seleção', async ({ page }) => {
  const data = performanceData(306);
  data.subjects.forEach((subject, index) => { subject.name = index < 100 ? `Matemática ${index + 1}` : index === 100 ? 'Matemática' : 'Mesmo nome'; });
  await page.addInitScript(({ key, data }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data)); }, { key: STORAGE_KEY, data });
  await page.goto(origin);
  await page.getByRole('navigation').getByRole('button', { name: 'Temporizador', exact: true }).click();
  await page.getByLabel('Buscar matéria', { exact: true }).fill('Matemática');
  await page.getByRole('button', { name: 'Mais opções', exact: true }).click();
  await page.getByLabel('Matéria', { exact: true }).selectOption('s100');
  await page.getByRole('button', { name: 'Opções anteriores', exact: true }).click();
  await expect(page.getByLabel('Matéria', { exact: true })).toHaveValue('s100');
  await page.getByLabel('Buscar matéria', { exact: true }).fill('Mesmo nome');
  await page.getByRole('button', { name: 'Mais opções', exact: true }).click();
  await page.getByRole('button', { name: 'Mais opções', exact: true }).click();
  await page.getByLabel('Matéria', { exact: true }).selectOption('s305');
  await expect(page.getByRole('button', { name: 'Mais opções', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Opções anteriores', exact: true }).click();
  await expect(page.getByLabel('Matéria', { exact: true })).toHaveValue('s305');
  expect(await page.getByLabel('Matéria', { exact: true }).locator('option').count()).toBeLessThanOrEqual(101);
  await page.getByRole('navigation').getByRole('button', { name: 'Questões', exact: true }).click();
  await page.getByRole('button', { name: 'Nova questão', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Buscar matéria', { exact: true }).fill('Mesmo nome');
  await dialog.getByRole('button', { name: 'Mais opções', exact: true }).click();
  await dialog.getByRole('button', { name: 'Mais opções', exact: true }).click();
  await dialog.getByLabel('Matéria', { exact: true }).selectOption('s305');
  await dialog.getByRole('button', { name: 'Opções anteriores', exact: true }).click();
  await dialog.getByLabel('Enunciado', { exact: true }).fill('Última matéria duplicada');
  for (const letter of ['A', 'B', 'C', 'D']) await dialog.getByLabel(letter, { exact: true }).fill(letter);
  await dialog.getByRole('button', { name: 'Salvar questão', exact: true }).click();
  const saved = parseData(await page.evaluate(key => localStorage.getItem(key)!, STORAGE_KEY));
  expect(saved.timer.subjectId).toBe('s305');
  expect(saved.questions.at(-1)?.subjectId).toBe('s305');
});

for (const [collection, label] of [['subjects', 'matérias'], ['questions', 'questões'], ['answers', 'respostas'], ['sessions', 'sessões'], ['reviews', 'revisões']] as const) {
  test(`crescimento além de 20 mil ${label} mantém dados válidos, formulário e tempo`, async ({ page }) => {
    const data = performanceData(1);
    const template = data[collection][0];
    Object.assign(data, { [collection]: Array.from({ length: 20000 }, (_, index) => ({ ...template, id: index === 0 ? template.id : `limit-${index}` })) });
    data.timer.elapsed = 60;
    data.timer.topic = 'Um tema novo';
    const raw = JSON.stringify(data);
    expect(parseData(raw)[collection]).toHaveLength(20000);
    await page.addInitScript(({ key, raw }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, raw); }, { key: STORAGE_KEY, raw });
    await page.goto(origin);
    const nav = (name: string) => page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
    if (collection === 'subjects') {
      await page.getByRole('button', { name: 'Nova matéria', exact: true }).click();
      await page.getByLabel('Nome da matéria').fill('Além do limite');
    } else if (collection === 'questions' || collection === 'answers') {
      await nav('Questões');
      if (collection === 'questions') {
        await page.getByRole('button', { name: 'Nova questão', exact: true }).click();
        await page.getByLabel('Enunciado', { exact: true }).fill('Além do limite?');
        for (const letter of ['A', 'B', 'C', 'D']) await page.getByRole('dialog').getByLabel(letter, { exact: true }).fill(letter);
      }
    } else {
      await nav('Temporizador');
      await page.getByRole('button', { name: 'Concluir sessão', exact: true }).click();
      await page.getByLabel('Anotações (opcional)').fill('Anotações ainda disponíveis');
    }
    const before = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Object.assign(window, { storageWriteAttempts: 0 });
      Storage.prototype.setItem = function (key, value) {
        Object.assign(window, { storageWriteAttempts: (window as unknown as { storageWriteAttempts: number }).storageWriteAttempts + 1 });
        return original.call(this, key, value);
      };
    });
    if (collection === 'answers') await page.locator('.answer-option').first().click();
    else await page.getByRole('dialog').getByRole('button', { name: collection === 'subjects' ? 'Adicionar matéria' : collection === 'questions' ? 'Salvar questão' : 'Salvar sessão', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(`20.000 registros de ${label}`);
    expect(await page.evaluate(() => (window as unknown as { storageWriteAttempts: number }).storageWriteAttempts)).toBe(0);
    expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(before);
    await expect(page.locator('.toast')).toHaveCount(0);
    if (collection === 'answers') {
      await expect(page.locator('.answer-option').first()).toBeEnabled();
      await expect(page.getByText('Isso mesmo!', { exact: true })).toHaveCount(0);
    } else {
      await expect(page.getByRole('dialog')).toBeVisible();
      if (collection === 'subjects') await expect(page.getByLabel('Nome da matéria')).toHaveValue('Além do limite');
      else if (collection === 'questions') await expect(page.getByLabel('Enunciado', { exact: true })).toHaveValue('Além do limite?');
      else await expect(page.getByLabel('Anotações (opcional)')).toHaveValue('Anotações ainda disponíveis');
    }
    const saved = parseData(await page.evaluate(key => localStorage.getItem(key)!, STORAGE_KEY));
    expect(saved[collection]).toHaveLength(20000);
    expect(saved.timer.elapsed).toBe(60);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Um passo de cada vez.', exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}
