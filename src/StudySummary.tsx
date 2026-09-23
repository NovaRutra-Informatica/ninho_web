import { useMemo } from "react";
import type { StudyData } from "./model";
export function descriptiveSummary(data: StudyData, now = Date.now()) {
  const since = new Date(now);
  since.setDate(since.getDate() - 27);
  since.setHours(0, 0, 0, 0);
  const sessions = data.sessions.filter(
      (s) => s.completedAt >= since.getTime() && s.completedAt <= now,
    ),
    answers = data.answers.filter(
      (a) => a.answeredAt >= since.getTime() && a.answeredAt <= now,
    );
  return {
    sessions: sessions.length,
    minutes: Math.round(sessions.reduce((sum, s) => sum + s.seconds, 0) / 60),
    days: new Set(sessions.map((s) => new Date(s.completedAt).toDateString()))
      .size,
    answers: answers.length,
    correct: answers.filter((a) => a.correct).length,
    questions: new Set(answers.map((a) => a.questionId)).size,
    due: data.reviews.filter((r) => r.dueAt <= now).length,
  };
}
export default function StudySummary({
  data,
  now,
  open,
}: {
  data: StudyData;
  now: number;
  open: (view: "subjects" | "questions" | "reviews") => void;
}) {
  const summary = useMemo(
    () => descriptiveSummary(data, now),
    [data.sessions, data.answers, data.reviews, now],
  );
  return (
    <section className="web-summary" aria-label="Resumo dos registros">
      <div className="section-heading">
        <h2>O que ficou registrado.</h2>
        <span>Últimos 28 dias</span>
      </div>
      <div className="web-summary-grid">
        <button className="data-panel" onClick={() => open("subjects")}>
          <strong>{summary.minutes} min</strong>
          <span>
            {summary.sessions} sessões em {summary.days} dias
          </span>
        </button>
        <button className="data-panel" onClick={() => open("questions")}>
          <strong>
            {summary.correct} de {summary.answers}
          </strong>
          <span>
            respostas corretas em {summary.questions} questões distintas
          </span>
        </button>
        <button className="data-panel" onClick={() => open("reviews")}>
          <strong>{summary.due} revisões</strong>
          <span>com data prevista até agora</span>
        </button>
      </div>
      <p className="help">
        Este é um resumo descritivo, sem IA. Respostas repetidas contam como
        novas tentativas; acertos e minutos não medem domínio da matéria. O
        tempo de navegação não é somado ao estudo.
      </p>
    </section>
  );
}
