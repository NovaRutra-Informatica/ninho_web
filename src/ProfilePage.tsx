import { useRef, useState } from "react";
import { emptyProfile, type StudentProfile } from "./profile";
import {
  ProfileQuestions,
  profileSteps,
  resumedStep,
  rememberStep,
  validProfileTimes,
} from "./ProfileQuestions";
import { WelcomeGuide } from "./WelcomeGuide";
import { Owl } from "./Owl";
export default function Profile({
  profile,
  welcome = false,
  save,
  done,
  replay,
}: {
  profile?: StudentProfile | null;
  welcome?: boolean;
  save: (profile: StudentProfile) => boolean;
  done?: () => void;
  replay: () => void;
}) {
  const [draft, setDraft] = useState(() => profile ?? emptyProfile());
  const draftRef = useRef(draft);
  const [step, setStep] = useState(() => (welcome ? resumedStep(profile) : 0));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [replayed, setReplayed] = useState(false);
  function persist(next: StudentProfile, nextStep = step) {
    if (!validProfileTimes(next)) return false;
    const updated = {
      ...next,
      updatedAt: new Date().toISOString(),
      revision: next.revision + 1,
      planStatus: "none" as const,
    };
    if (!save(updated)) {
      setError(
        "Seu perfil ainda não foi salvo. Verifique o aviso de armazenamento e tente novamente.",
      );
      setDraftSaved(false);
      return false;
    }
    draftRef.current = updated;
    setDraft(updated);
    rememberStep(nextStep, updated);
    setDraftSaved(true);
    setError("");
    return true;
  }
  const update = <K extends keyof StudentProfile>(
    key: K,
    value: StudentProfile[K],
  ) => {
    const next = { ...draftRef.current, [key]: value };
    draftRef.current = next;
    setDraft(next);
    if (welcome) persist(next);
  };
  function moveStep(next: number) {
    if (!draftRef.current.name.trim() && next > 0) {
      setError("Conte como quer ser chamado para continuar.");
      return;
    }
    if (!validProfileTimes(draftRef.current)) {
      setError(
        "Confira os minutos: de 1 a 1440 por dia e de 1 a 240 por sessão.",
      );
      return;
    }
    if (persist(draftRef.current, next)) {
      setStep(next);
      requestAnimationFrame(() =>
        document
          .getElementById("welcome-question")
          ?.focus(),
      );
    }
  }
  function submit() {
    if (!draftRef.current.name.trim()) {
      setStep(0);
      setError("Conte como quer ser chamado para continuar.");
      return;
    }
    if (!validProfileTimes(draftRef.current)) {
      setError("Confira os minutos antes de continuar.");
      return;
    }
    if (
      persist({
        ...draftRef.current,
        name: draftRef.current.name.trim(),
        completedAt: draftRef.current.completedAt ?? new Date().toISOString(),
      })
    )
      setSaved(true);
  }
  return (
    <section className={`profile-page ${welcome ? "welcome-page" : ""}`}>
      {welcome ? (
        <WelcomeGuide
          step={step}
          name={draft.name}
          phase={saved ? "ready" : "editing"}
        />
      ) : (
        <div className="profile-intro">
          <Owl happy />
          <h1>Meu perfil</h1>
          <p>Seus objetivos mudam. Seu Ninho acompanha.</p>
        </div>
      )}
      {saved ? (
        <article className="data-panel profile-form">
          <h2>Seu Ninho está pronto.</h2>
          <p>
            Perfil salvo neste navegador. Comece pelas suas matérias e escolha
            uma pequena meta para a primeira sessão. Você pode voltar ao Meu
            perfil a qualquer momento.
          </p>
          <p className="help">
            A versão web não usa inteligência artificial. Suas respostas ficam
            guardadas para você consultar e editar.
          </p>
          <button
            className="button"
            onClick={() => (welcome ? done?.() : setSaved(false))}
          >
            {welcome ? "Conhecer meu Ninho" : "Voltar ao meu perfil"}
          </button>
        </article>
      ) : (
        <form
          className="data-panel profile-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (welcome && step < profileSteps.length - 1) moveStep(step + 1);
            else submit();
          }}
        >
          <div className="profile-fields" key={welcome ? step : "all"}>
            {welcome ? (
              <>
                <p className="welcome-hint">{profileSteps[step].hint}</p>
                <ProfileQuestions draft={draft} change={update} step={step} />
              </>
            ) : (
              profileSteps.map((item, index) => (
                <section key={item.title} className="profile-section">
                  <h2>{item.title}</h2>
                  <ProfileQuestions
                    draft={draft}
                    change={update}
                    step={index}
                  />
                </section>
              ))
            )}
          </div>
          {(!welcome || step === profileSteps.length - 1) && (
            <p className="welcome-privacy">
              Suas respostas ficam neste navegador e no seu backup. A versão web
              não usa inteligência artificial e não gera um plano
              automaticamente. Perguntas em branco ficam como informações ainda
              não definidas.
            </p>
          )}
          {error && (
            <p className="profile-error" role="alert">
              {error}
            </p>
          )}
          <div className="profile-actions">
            {welcome && step > 0 && (
              <button
                type="button"
                className="button secondary"
                onClick={() => moveStep(step - 1)}
              >
                Voltar
              </button>
            )}
            <button className="button">
              {welcome && step < profileSteps.length - 1
                ? "Continuar"
                : "Salvar meu perfil"}
            </button>
          </div>
          {welcome && (
            <p className="welcome-save-note" role="status">
              {!validProfileTimes(draft)
                ? "Confira os minutos para salvar esta alteração."
                : draftSaved
                  ? "Respostas salvas neste navegador."
                  : "Suas respostas são salvas enquanto você preenche."}
            </p>
          )}
          {!welcome && (
            <>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  replay();
                  setReplayed(true);
                }}
              >
                Rever tutoriais de todas as telas
              </button>
              {replayed && (
                <p role="status" className="help">
                  Os tutoriais aparecerão ao entrar em cada tela.
                </p>
              )}
            </>
          )}
        </form>
      )}
    </section>
  );
}
