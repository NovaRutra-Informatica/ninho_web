import type { StudentProfile } from "./profile";
import { profileDays, profileDaysLabel } from "./profile";

export const profileSteps = [
  {
    title: "Vamos nos conhecer?",
    speech:
      "Oi! Eu sou a coruja do Ninho. Antes de abrir os livros, quero saber como chamar você.",
    hint: "Seu nome ou apelido já é um ótimo começo.",
    mood: "hello",
  },
  {
    title: "Qual é o seu próximo capítulo?",
    speech:
      "Todo caminho começa com uma vontade. O que você quer aprender ou conquistar?",
    hint: "Pode ser uma prova, um projeto ou a curiosidade por algo novo.",
    mood: "curious",
  },
  {
    title: "O que faz esse sonho valer a pena?",
    speech:
      "Quero lembrar com você por que começou. E, se houver uma data importante, vamos guardar também.",
    hint: "Não ter um prazo também é uma resposta.",
    mood: "thoughtful",
  },
  {
    title: "O que vamos estudar juntos?",
    speech:
      "Vamos dar nome aos assuntos que vão ocupar seu Ninho. Qual deles merece mais atenção?",
    hint: "Você poderá organizar suas matérias dentro do aplicativo.",
    mood: "curious",
  },
  {
    title: "De onde você está partindo?",
    speech:
      "Primeiro contato, retomada ou aprofundamento? Cada começo pede um cuidado diferente.",
    hint: "Não é um teste. É só para respeitar o que você já sabe.",
    mood: "thoughtful",
  },
  {
    title: "Como é um dia na sua vida?",
    speech:
      "Os estudos precisam caber na vida real. Me conte sobre seus compromissos e os intervalos que sobram.",
    hint: "Trabalho, aulas, deslocamentos, descanso… tudo conta.",
    mood: "listening",
  },
  {
    title: "Quando podemos nos encontrar?",
    speech:
      "Quais dias e horários costumam ser mais tranquilos para você estudar?",
    hint: "Escolha os dias possíveis. A rotina pode mudar depois.",
    mood: "curious",
  },
  {
    title: "Vamos encontrar o seu ritmo?",
    speech:
      "Pequenos passos também levam longe. Quanto tempo cabe no seu dia, sem deixar as pausas de lado?",
    hint: "A sessão é um bloco de foco; a meta diária pode reunir vários blocos.",
    mood: "cheer",
  },
  {
    title: "O que ajuda — e o que atrapalha?",
    speech:
      "Me conte o que costuma funcionar e onde você trava. Aprender não precisa ser igual para todo mundo.",
    hint: "Vale falar de exercícios, leitura, distrações ou dificuldade para recomeçar.",
    mood: "listening",
  },
  {
    title: "Seu Ninho, do seu jeito.",
    speech:
      "Estamos quase lá! Falta algum cuidado para você se sentir bem por aqui? Confira seu ritmo antes de começar.",
    hint: "Você pode rever todas as respostas em Meu perfil, a qualquer momento.",
    mood: "cheer",
  },
] as const;

export type ChangeProfile = <K extends keyof StudentProfile>(
  key: K,
  value: StudentProfile[K],
) => void;
export function ProfileQuestions({
  draft,
  change,
  step,
}: {
  draft: StudentProfile;
  change: ChangeProfile;
  step: number;
}) {
  const field = (
    key:
      | "name"
      | "goal"
      | "motivation"
      | "targetDate"
      | "subjects"
      | "level"
      | "routine"
      | "preferredTime"
      | "challenges"
      | "preferences"
      | "accessibility",
    label: string,
    max: number,
    placeholder: string,
    multiline = true,
  ) => (
    <label className="field">
      {label}
      {multiline ? (
        <textarea
          rows={3}
          maxLength={max}
          value={draft[key]}
          placeholder={placeholder}
          onChange={(e) => change(key, e.target.value)}
        />
      ) : (
        <input
          maxLength={max}
          value={draft[key]}
          placeholder={placeholder}
          required={key === "name"}
          autoComplete={key === "name" ? "given-name" : "off"}
          onChange={(e) => change(key, e.target.value)}
        />
      )}
      <small>
        {draft[key].length}/{max}
      </small>
    </label>
  );
  switch (step) {
    case 0:
      return field(
        "name",
        "Como quer ser chamado?",
        100,
        "Seu nome ou apelido",
        false,
      );
    case 1:
      return field(
        "goal",
        "Qual é seu principal objetivo de estudo?",
        400,
        "Uma prova, concurso, faculdade, habilidade ou projeto…",
      );
    case 2:
      return (
        <>
          {field(
            "motivation",
            "Por que esse objetivo é importante para você?",
            300,
            "O que você quer conquistar ou mudar?",
          )}
          {field(
            "targetDate",
            "Tem uma data em mente?",
            40,
            "Ex.: prova em dezembro ou ainda sem prazo",
            false,
          )}
        </>
      );
    case 3:
      return field(
        "subjects",
        "Quais matérias ou assuntos pretende estudar?",
        300,
        "Liste suas prioridades.",
      );
    case 4:
      return field(
        "level",
        "Como você descreveria seu ponto de partida?",
        160,
        "Iniciando, retomando, já tenho uma base…",
      );
    case 5:
      return field(
        "routine",
        "Como os estudos cabem na sua rotina?",
        400,
        "Trabalho, aulas, deslocamentos e compromissos fixos…",
      );
    case 6:
      return (
        <>
          <fieldset className="profile-days">
            <legend>Em quais dias costuma ter tempo?</legend>
            {profileDays.map(([day, label]) => (
              <button
                key={day}
                type="button"
                className={`button ${draft.availableDays.includes(day) ? "primary" : "secondary"}`}
                aria-pressed={draft.availableDays.includes(day)}
                onClick={() =>
                  change(
                    "availableDays",
                    draft.availableDays.includes(day)
                      ? draft.availableDays.filter((d) => d !== day)
                      : [...draft.availableDays, day],
                  )
                }
              >
                {label}
              </button>
            ))}
          </fieldset>
          {field(
            "preferredTime",
            "Qual horário funciona melhor?",
            160,
            "Manhã, noite, intervalos…",
            false,
          )}
        </>
      );
    case 7:
      return (
        <div className="profile-time">
          <label className="field">
            Minutos disponíveis por dia
            <input
              type="number"
              min={1}
              max={1440}
              required
              value={draft.dailyMinutes || ""}
              onChange={(e) => change("dailyMinutes", Number(e.target.value))}
            />
          </label>
          <label className="field">
            Duração confortável de uma sessão
            <input
              type="number"
              min={1}
              max={240}
              required
              value={draft.sessionMinutes || ""}
              onChange={(e) => change("sessionMinutes", Number(e.target.value))}
            />
          </label>
        </div>
      );
    case 8:
      return (
        <>
          {field(
            "preferences",
            "O que ajuda você a aprender?",
            300,
            "Leitura, aulas, exercícios, resumos, explicações passo a passo…",
          )}
          {field(
            "challenges",
            "O que mais dificulta seus estudos hoje?",
            400,
            "Esquecimento, pouco tempo, exercícios difíceis, manter a rotina…",
          )}
        </>
      );
    default:
      return (
        <>
          {field(
            "accessibility",
            "Que adaptações deixariam o Ninho mais confortável?",
            240,
            "Menos animações, textos objetivos, pausas frequentes… (opcional)",
          )}
          <dl className="profile-summary">
            <dt>Seu objetivo</dt>
            <dd>{draft.goal || "Ainda vou definir"}</dd>
            <dt>Seu ritmo</dt>
            <dd>
              {draft.dailyMinutes} min por dia · sessões de{" "}
              {draft.sessionMinutes} min
            </dd>
            <dt>Seus dias</dt>
            <dd>
              {profileDaysLabel(draft.availableDays) || "Ainda vou definir"}
            </dd>
          </dl>
        </>
      );
  }
}

const cursorKey = "ninho-onboarding-step-v1";
export function resumedStep(profile?: StudentProfile | null) {
  try {
    const cursor = JSON.parse(localStorage.getItem(cursorKey) || "null");
    return profile &&
      !profile.completedAt &&
      cursor?.updatedAt === profile.updatedAt &&
      Number.isInteger(cursor.step) &&
      cursor.step >= 0 &&
      cursor.step < profileSteps.length
      ? cursor.step
      : 0;
  } catch {
    return 0;
  }
}
export function rememberStep(step: number, profile: StudentProfile) {
  try {
    if (profile.completedAt) localStorage.removeItem(cursorKey);
    else
      localStorage.setItem(
        cursorKey,
        JSON.stringify({ step, updatedAt: profile.updatedAt }),
      );
  } catch {
  }
}
export function validProfileTimes(profile: StudentProfile) {
  return (
    Number.isInteger(profile.dailyMinutes) &&
    profile.dailyMinutes >= 1 &&
    profile.dailyMinutes <= 1440 &&
    Number.isInteger(profile.sessionMinutes) &&
    profile.sessionMinutes >= 1 &&
    profile.sessionMinutes <= 240
  );
}
