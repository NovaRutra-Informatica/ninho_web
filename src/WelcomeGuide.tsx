import { Owl } from "./Owl";
import { profileSteps } from "./ProfileQuestions";
export function WelcomeGuide({
  step,
  name,
  phase,
}: {
  step: number;
  name: string;
  phase: "editing" | "saving" | "generating" | "ready";
}) {
  const current = profileSteps[step];
  return (
    <>
      <header className="welcome-header">
        <span className="welcome-wordmark">
          ninho<span>.</span>
        </span>
        <span>Um espaço para crescer.</span>
      </header>
      <div className="welcome-progress">
        <div
          className="profile-steps"
          role="progressbar"
          aria-label="Seu perfil"
          aria-valuemin={0}
          aria-valuemax={10}
          aria-valuenow={phase === "ready" ? 10 : step + 1}
        >
          {profileSteps.map((item, index) => (
            <span key={item.title} className={index <= step ? "filled" : ""} />
          ))}
        </div>
        <span>
          {phase === "ready" ? "Tudo pronto" : `Etapa ${step + 1} de 10`}
        </span>
      </div>
      <div
        className={`welcome-conversation mood-${phase === "ready" ? "cheer" : current.mood}`}
        key={phase === "editing" ? step : phase}
      >
        <div className="welcome-mascot">
          <Owl
            happy={
              current.mood === "hello" ||
              current.mood === "cheer" ||
              phase === "ready"
            }
          />
        </div>
        <div className="welcome-speech" aria-live="polite">
          <h1 tabIndex={-1} id="welcome-question">
            {phase === "ready"
              ? `Bem-vindo ao seu Ninho${name ? `, ${name}` : ""}!`
              : phase === "generating"
                ? "Um instante para cuidar do seu plano…"
                : phase === "saving"
                  ? "Estou guardando suas respostas…"
                  : current.title}
          </h1>
          <p>
            {phase === "ready"
              ? "Seu primeiro passo já aconteceu. Agora vamos conhecer seu espaço de estudos."
              : phase === "generating"
                ? "A IA está preparando sugestões neste dispositivo. Suas respostas continuam guardadas, mesmo se você cancelar."
                : phase === "saving"
                  ? "Tudo fica neste dispositivo, pronto para você continuar."
                  : current.speech}
          </p>
        </div>
      </div>
    </>
  );
}
