import { test, expect } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";
import { freshData, parseData, STORAGE_KEY } from "../src/model";
import { descriptiveSummary } from "../src/StudySummary";
let server: ViteDevServer;
let origin: string;
test.beforeAll(async () => {
  server = await createServer({
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") throw new Error("Sem porta");
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => server.close());
test("perfil na primeira abertura, tutorial por tela, edição, tema e backup persistem", async ({
  page,
}) => {
  await page.goto(origin);
  await expect(
    page.getByRole("heading", { name: "Vamos nos conhecer?" }),
  ).toBeVisible();
  await page.getByLabel("Como quer ser chamado?").fill("Ana");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByLabel("Qual é seu principal objetivo de estudo?")
    .fill("Aprender estatística");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByLabel("Quais matérias ou assuntos pretende estudar?")
    .fill("Matemática");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  for (let step = 0; step < 2; step++)
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Seg", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Minutos disponíveis por dia").fill("45");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByLabel("O que mais dificulta seus estudos hoje?")
    .fill("Retomar depois de muito tempo");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Salvar meu perfil", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seu Ninho está pronto." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Conhecer meu Ninho" }).click();
  await expect(page.getByLabel("Tutorial desta tela")).toBeVisible();
  await page.getByRole("button", { name: "Fechar tutorial" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Um passo de cada vez." }),
  ).toBeVisible();
  await expect(page.getByLabel("Tutorial desta tela")).toHaveCount(0);
  await page.getByRole("button", { name: "Meu perfil", exact: true }).click();
  await expect(
    page.getByLabel("Qual é seu principal objetivo de estudo?"),
  ).toHaveValue("Aprender estatística");
  await page
    .getByLabel("Qual é seu principal objetivo de estudo?")
    .fill("Passar na prova");
  await page
    .getByRole("button", { name: "Salvar meu perfil", exact: true })
    .click();
  await page.getByRole("button", { name: "Seus dados", exact: true }).click();
  await page.getByRole("button", { name: "Fechar tutorial" }).click();
  await page.getByLabel("Aparência").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const raw = await page.evaluate(
    (key) => localStorage.getItem(key)!,
    STORAGE_KEY,
  );
  const saved = parseData(raw);
  expect(saved.profile).toMatchObject({
    name: "Ana",
    goal: "Passar na prova",
    availableDays: ["mon"],
    dailyMinutes: 45,
    planStatus: "none",
  });
  expect(saved.profile?.tutorialsSeen).toEqual(["today", "data"]);
  expect(saved.preferences?.theme).toBe("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Revisões", exact: true })
    .click();
  await expect(page.getByLabel("Tutorial desta tela")).toBeVisible();
});
test("perfil inválido não entra no backup e versões anteriores continuam válidas", () => {
  const data = freshData();
  delete data.profile;
  expect(parseData(JSON.stringify(data)).profile).toBeUndefined();
  const broken = freshData();
  broken.profile!.goal = "x".repeat(401);
  expect(() => parseData(JSON.stringify(broken))).toThrow(/perfil/);
});
test("onboarding móvel respeita limites da tela e salva sem IA", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin);
  await expect(
    page.getByRole("heading", { name: "Vamos nos conhecer?" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByLabel("Como quer ser chamado?").fill("Lu");
  for (let step = 0; step < 9; step++)
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Salvar meu perfil", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seu Ninho está pronto." }),
  ).toBeVisible();
});

test("rascunho retoma a etapa sem liberar a navegação antes de concluir", async ({
  page,
}) => {
  await page.goto(origin);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await page.getByLabel("Como quer ser chamado?").fill("Bia");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByLabel("Qual é seu principal objetivo de estudo?")
    .fill("Retomar meus estudos");
  const unfinished = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).profile,
    STORAGE_KEY,
  );
  expect(unfinished.completedAt).toBeNull();
  expect(unfinished.goal).toBe("Retomar meus estudos");
  await page.reload();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "2",
  );
  await expect(
    page.getByLabel("Qual é seu principal objetivo de estudo?"),
  ).toHaveValue("Retomar meus estudos");
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(page.getByLabel("Como quer ser chamado?")).toHaveValue("Bia");
});

test("falha de armazenamento no cadastro permite guardar uma cópia sem concluir o perfil", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Quota", "QuotaExceededError");
      return original.call(this, name, value);
    };
  }, STORAGE_KEY);
  await page.goto(origin);
  await page.getByLabel("Como quer ser chamado?").fill("Ana");
  await expect(
    page.getByText("Seu perfil ainda não foi salvo.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  await expect(page.getByRole("navigation")).toHaveCount(0);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar cópia", exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = parseData(Buffer.concat(chunks).toString("utf8"));
  expect(backup.profile).toMatchObject({ name: "Ana", completedAt: null });
});

test("resumo web conta tentativas sem confundir acerto com domínio ou incluir o futuro", () => {
  const data = freshData(),
    now = new Date("2026-09-23T12:00:00Z").getTime();
  data.sessions = [
    {
      id: "s",
      subjectId: "x",
      topic: "Tema",
      seconds: 600,
      completedAt: now,
      confidence: 2,
      notes: "",
    },
    {
      id: "future",
      subjectId: "x",
      topic: "Tema",
      seconds: 900,
      completedAt: now + 86400000,
      confidence: 2,
      notes: "",
    },
  ];
  data.answers = [
    { id: "a", questionId: "q", selected: 0, correct: true, answeredAt: now },
    { id: "b", questionId: "q", selected: 1, correct: false, answeredAt: now },
  ];
  expect(descriptiveSummary(data, now)).toMatchObject({
    sessions: 1,
    minutes: 10,
    days: 1,
    answers: 2,
    correct: 1,
    questions: 1,
  });
});
