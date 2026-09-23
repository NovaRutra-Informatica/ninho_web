import { emptyProfile, type StudentProfile } from "./profile";
export const STORAGE_KEY = 'ninho-web:v1';
export const DAY = 86_400_000;
export type Subject = { id: string; name: string; color: number; createdAt: number };
export type Session = { id: string; subjectId: string; topic: string; seconds: number; completedAt: number; confidence: number; notes: string };
export type Review = { id: string; subjectId: string; topic: string; dueAt: number; stage: number; lastReviewedAt?: number };
export type Question = { id: string; subjectId: string; prompt: string; options: string[]; correct: number; explanation: string };
export type Answer = { id: string; questionId: string; selected: number; correct: boolean; answeredAt: number };
export type Timer = { mode: 'focus' | 'stopwatch'; duration: number; elapsed: number; startedAt: number | null; subjectId: string; topic: string };
export type StudyData = { version: 1; profile?: StudentProfile | null; preferences?: { theme: "light" | "dark" | "system"; reducedMotion: boolean }; subjects: Subject[]; sessions: Session[]; reviews: Review[]; questions: Question[]; answers: Answer[]; timer: Timer };
export const freshData = (): StudyData => ({ version: 1, profile: emptyProfile(), preferences: { theme: "system", reducedMotion: false }, subjects: [], sessions: [], reviews: [], questions: [], answers: [], timer: { mode: 'focus', duration: 25 * 60, elapsed: 0, startedAt: null, subjectId: '', topic: '' } });
export const uid = () => crypto.randomUUID();
export function elapsedSeconds(timer: Timer, now = Date.now()) {
  const elapsed = timer.elapsed + (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt) / 1000);
  return Math.floor(timer.mode === 'focus' ? Math.min(timer.duration, elapsed) : Math.min(604800, elapsed));
}
export const formatTime = (seconds: number) => {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  return `${hours ? `${hours.toString().padStart(2, '0')}:` : ''}${Math.floor(value % 3600 / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
};
export const minutesLabel = (seconds: number) => seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)} min`;
export const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
export const intervals = [1, 3, 7, 14, 30, 60];
export function saveSession(data: StudyData, confidence: number, notes: string, now = Date.now()): StudyData {
  const seconds = elapsedSeconds(data.timer, now);
  if (!data.subjects.some(s => s.id === data.timer.subjectId) || seconds < 1) return data;
  const topic = data.timer.topic.trim() || 'Estudo geral';
  const next = confidence === 1 ? 1 : confidence === 2 ? 3 : 7;
  const existing = data.reviews.find(r => r.subjectId === data.timer.subjectId && r.topic.toLocaleLowerCase() === topic.toLocaleLowerCase());
  const review: Review = { id: existing?.id ?? uid(), subjectId: data.timer.subjectId, topic, dueAt: now + next * DAY, stage: confidence - 1 };
  return { ...data, sessions: [{ id: uid(), subjectId: data.timer.subjectId, topic, seconds, completedAt: now, confidence, notes: notes.trim() }, ...data.sessions], reviews: [review, ...data.reviews.filter(r => r.id !== review.id)], timer: { ...data.timer, elapsed: 0, startedAt: null } };
}

function object(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function str(value: unknown, max = 2000): value is string { return typeof value === 'string' && value.length <= max; }
function num(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number { return num(value, min, max) && Number.isInteger(value); }
function entries(value: unknown): value is Record<string, unknown>[] { return Array.isArray(value) && value.length <= 20000 && value.every(object); }
function unique(items: Record<string, unknown>[]) { return items.every(item => str(item.id, 100) && item.id.length > 0) && new Set(items.map(item => item.id)).size === items.length; }
export function parseData(raw: string): StudyData {
  const d: unknown = JSON.parse(raw);
  if (!object(d) || d.version !== 1 || !entries(d.subjects) || !entries(d.sessions) || !entries(d.reviews) || !entries(d.questions) || !entries(d.answers) || !object(d.timer)) throw new Error('Formato de backup inválido. Selecione um backup do Ninho Web.');
  const { subjects, sessions, reviews, questions, answers, timer } = d;
  const ids = new Set(subjects.map(s => s.id));
  const questionIds = new Set(questions.map(q => q.id));
  const valid = [subjects, sessions, reviews, questions, answers].every(unique)
    && subjects.every(s => str(s.name, 100) && s.name.trim().length > 0 && integer(s.color, 0, 4) && num(s.createdAt))
    && sessions.every(s => ids.has(s.subjectId) && str(s.topic, 200) && num(s.seconds, 1, 604800) && num(s.completedAt) && integer(s.confidence, 1, 3) && str(s.notes))
    && reviews.every(r => ids.has(r.subjectId) && str(r.topic, 200) && num(r.dueAt) && integer(r.stage, 0, 5) && (r.lastReviewedAt === undefined || num(r.lastReviewedAt)))
    && questions.every(q => ids.has(q.subjectId) && str(q.prompt) && q.prompt.trim().length > 0 && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 5 && q.options.every(o => str(o, 500) && o.trim().length > 0) && integer(q.correct, 0, q.options.length - 1) && str(q.explanation))
    && answers.every(a => questionIds.has(a.questionId) && integer(a.selected, 0, 4) && typeof a.correct === 'boolean' && num(a.answeredAt) && questions.some(q => q.id === a.questionId && Array.isArray(q.options) && (a.selected as number) < q.options.length && a.correct === (a.selected === q.correct)))
    && (timer.mode === 'focus' || timer.mode === 'stopwatch') && integer(timer.duration, 60, 14400) && num(timer.elapsed, 0, 604800) && (timer.startedAt === null || num(timer.startedAt)) && str(timer.subjectId, 100) && (timer.subjectId === '' || ids.has(timer.subjectId)) && str(timer.topic, 200);
  if (!valid) throw new Error('O backup contém dados incompletos ou inconsistentes. Seus dados atuais foram mantidos.');
  if (timer.subjectId === '' && subjects.length > 0) timer.subjectId = subjects[0].id;
  if (d.profile !== undefined && d.profile !== null) validateProfile(d.profile);
  if (d.preferences !== undefined && (!object(d.preferences) || !["light", "dark", "system"].includes(String(d.preferences.theme)) || typeof d.preferences.reducedMotion !== "boolean")) throw new Error("Preferências inválidas no backup.");
  return d as unknown as StudyData;
}

export function demoData(): StudyData {
  const now = Date.now();
  const d = freshData();
  d.subjects = [{ id: uid(), name: 'Biologia', color: 0, createdAt: now }, { id: uid(), name: 'Matemática', color: 1, createdAt: now }, { id: uid(), name: 'História', color: 2, createdAt: now }];
  d.timer.subjectId = d.subjects[0].id;
  d.timer.topic = 'Membrana plasmática';
  d.sessions = [{ id: uid(), subjectId: d.subjects[0].id, topic: 'Membrana plasmática', seconds: 1500, completedAt: now - 2 * DAY, confidence: 2, notes: 'Revisar transporte passivo e ativo.' }];
  d.reviews = [{ id: uid(), subjectId: d.subjects[0].id, topic: 'Membrana plasmática', dueAt: now - DAY, stage: 0 }];
  d.questions = [{ id: uid(), subjectId: d.subjects[0].id, prompt: 'Qual processo transporta substâncias contra o gradiente de concentração?', options: ['Difusão simples', 'Transporte ativo', 'Osmose', 'Difusão facilitada'], correct: 1, explanation: 'O transporte ativo usa energia para mover substâncias contra o gradiente de concentração.' }];
  return d;
}

export function validateProfile(value: unknown): asserts value is StudentProfile {
  if (!object(value)) throw new Error("Perfil inválido no backup.");
  const fields: Record<string, number> = { name: 100, goal: 400, motivation: 300, targetDate: 40, subjects: 300, level: 160, routine: 400, preferredTime: 160, challenges: 400, preferences: 300, accessibility: 240, plan: 16000 };
  if (!Object.entries(fields).every(([key, max]) => str(value[key], max)) || !integer(value.dailyMinutes, 1, 1440) || !integer(value.sessionMinutes, 1, 240) || !integer(value.revision, 0, 1000000) || !integer(value.planProfileRevision, 0, 1000000) || !["none", "pending", "ready", "error"].includes(String(value.planStatus)) || !Array.isArray(value.availableDays) || value.availableDays.length > 7 || (!value.availableDays.every(day => ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(String(day))) || new Set(value.availableDays).size !== value.availableDays.length) || !Array.isArray(value.tutorialsSeen) || value.tutorialsSeen.length > 32 || !value.tutorialsSeen.every(page => str(page, 40)) || ![value.completedAt, value.updatedAt].every(date => date === null || typeof date === "string" && date.length <= 40 && Number.isFinite(Date.parse(date)))) throw new Error("O perfil do backup contém respostas inválidas. Seus dados foram preservados.");
}
