import { useEffect, useRef, useState } from "react";
import { Owl } from './Owl';
const tours: Record<string, [string, string][]> = {
  today: [
    [
      "Um lugar para começar",
      "Use a navegação para abrir matérias, temporizador, revisões e questões. Meu perfil fica no topo da tela e guarda seus objetivos.",
    ],
    [
      "Seu dia em poucos números",
      "Minutos, sessões e revisões mostram o que você registrou. O foguinho ao lado do perfil abre seu calendário. Ele acende depois de estudar hoje; a contagem pode continuar a de ontem até lá.",
    ],
  ],
  timer: [
    [
      "Um tempo só para estudar",
      "Escolha foco com duração ou cronômetro livre. Ajuste minutos, selecione a matéria e descreva o tema antes de começar.",
    ],
    [
      "Registre como foi",
      "Ao concluir a sessão, seu feedback define a revisão em 1, 3 ou 7 dias. Pausar mantém seu tempo, inclusive ao recarregar a página.",
    ],
  ],
  subjects: [
    [
      "Seu estudo organizado",
      "Adicione suas matérias e inicie sessões a partir de cada uma. O histórico guarda tempo, temas, feedbacks e anotações.",
    ],
  ],
  reviews: [
    [
      "Reencontrar para lembrar",
      "Estudar abre uma sessão sobre o tema. Já revisei registra a revisão e aumenta o próximo intervalo. São regras locais, sem IA.",
    ],
  ],
  questions: [
    [
      "Pratique com suas questões",
      "Cadastre alternativas, resposta correta e explicação. Cada tentativa fica no histórico; o feedback aparece depois da resposta.",
    ],
  ],
  data: [
    [
      "Seus dados ficam com você",
      "Exporte backups regularmente. Restaurar ou carregar exemplos pede confirmação. Tema e animações são salvos automaticamente.",
    ],
  ],
};
export function Tutorial({
  page,
  seen,
  mark,
  onNavigate,
}: {
  page: string;
  seen: string[];
  mark: (page: string) => boolean;
  onNavigate: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [replay, setReplay] = useState(false);
  const [failure, setFailure] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const tour = tours[page];
  const visible = Boolean(tour && (!seen.includes(page) || replay));
  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLButtonElement>('[data-tutorial-continue]')?.focus({ preventScroll: true });
    return () => { element?.close(); document.body.style.overflow = previousOverflow; };
  }, [visible]);
  if (!tour) return null;
  const close = () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    if (mark(page)) {
      setReplay(false);
      setIndex(0);
      setFailure('');
    } else setFailure('Não foi possível salvar o tutorial. Seus dados foram mantidos. Tente novamente.');
    savingRef.current = false;
    setSaving(false);
  };
  return visible ? (
    <dialog ref={dialog} className="tutorial-dialog" aria-label="Tutorial desta tela" aria-modal="true" onCancel={event => event.preventDefault()} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]'));
      if (!controls.length) return;
      event.preventDefault();
      const current = controls.indexOf(document.activeElement as HTMLElement);
      controls[(current + (event.shiftKey ? controls.length - 1 : 1)) % controls.length].focus();
    }}>
      <div className="tutorial-content" tabIndex={0} aria-label="Conteúdo do tutorial">
        <div className="tutorial-intro">
          <Owl small happy={index > 0} />
          <div><small>No seu ritmo</small><strong>Conheça seu Ninho</strong><div className="profile-steps" aria-hidden="true">{tour.map((_, step) => <span key={step} className={step <= index ? 'filled' : ''} />)}</div></div>
          <span className="tutorial-count" aria-label={`Etapa ${index + 1} de ${tour.length}`}>{index + 1}/{tour.length}</span>
        </div>
        <div className="tutorial-step" key={index} aria-live="polite">
          <h2>{tour[index][0]}</h2>
          <p>{tour[index][1]}</p>
        </div>
        {failure && <p className="tutorial-error" role="alert">{failure}</p>}
      </div>
      <div className="tutorial-actions">
        <button className="button secondary" disabled={saving} onClick={() => { onNavigate(); close(); }}>Ver depois</button>
        <button className="button" data-tutorial-continue disabled={saving} onClick={() => { onNavigate(); if (index + 1 < tour.length) setIndex(index + 1); else close(); }}>{index + 1 < tour.length ? "Próximo" : "Entendi"}</button>
      </div>
    </dialog>
  ) : (
    <button className="tutorial-replay" onClick={() => { onNavigate(); setReplay(true); }}>
      Como funciona
    </button>
  );
}
