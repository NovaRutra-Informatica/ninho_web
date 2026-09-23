import { useEffect, useState } from "react";
const tours: Record<string, [string, string, string][]> = {
  today: [
    [
      "Um lugar para começar",
      "Use a navegação para abrir matérias, temporizador, revisões e questões. Meu perfil fica no topo da tela e guarda seus objetivos.",
      ".sidebar",
    ],
    [
      "Seu dia em poucos números",
      "Minutos, sessões e revisões mostram o que você registrou. O próximo estudo e as revisões ajudam a escolher uma atividade.",
      ".stats-strip",
    ],
  ],
  timer: [
    [
      "Um tempo só para estudar",
      "Escolha foco com duração ou cronômetro livre. Ajuste minutos, selecione a matéria e descreva o tema antes de começar.",
      ".timer-layout",
    ],
    [
      "Registre como foi",
      "Ao concluir a sessão, seu feedback define a revisão em 1, 3 ou 7 dias. Pausar mantém seu tempo, inclusive ao recarregar a página.",
      ".timer-panel",
    ],
  ],
  subjects: [
    [
      "Seu estudo organizado",
      "Adicione suas matérias e inicie sessões a partir de cada uma. O histórico guarda tempo, temas, feedbacks e anotações.",
      "main",
    ],
  ],
  reviews: [
    [
      "Reencontrar para lembrar",
      "Estudar abre uma sessão sobre o tema. Já revisei registra a revisão e aumenta o próximo intervalo. São regras locais, sem IA.",
      "main",
    ],
  ],
  questions: [
    [
      "Pratique com suas questões",
      "Cadastre alternativas, resposta correta e explicação. Cada tentativa fica no histórico; o feedback aparece depois da resposta.",
      "main",
    ],
  ],
  data: [
    [
      "Seus dados ficam com você",
      "Exporte backups regularmente. Restaurar ou carregar exemplos pede confirmação. Tema e animações são salvos automaticamente.",
      ".data-grid",
    ],
  ],
};
export function Tutorial({
  page,
  seen,
  mark,
}: {
  page: string;
  seen: string[];
  mark: (page: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [replay, setReplay] = useState(false);
  const tour = tours[page];
  const visible = Boolean(tour && (!seen.includes(page) || replay));
  useEffect(() => {
    if (!visible) return;
    const target = document.querySelector(tour[index][2]);
    target?.classList.add("tutorial-highlight");
    return () => target?.classList.remove("tutorial-highlight");
  }, [page, index, visible]);
  if (!tour) return null;
  const close = () => {
    mark(page);
    setReplay(false);
    setIndex(0);
  };
  return visible ? (
    <aside className="tutorial-coach" aria-label="Tutorial desta tela">
      <div className="dialog-head">
        <small>
          Conheça seu Ninho · {index + 1}/{tour.length}
        </small>
        <button
          aria-label="Fechar tutorial"
          className="icon-button"
          onClick={close}
        >
          ×
        </button>
      </div>
      <h2>{tour[index][0]}</h2>
      <p>{tour[index][1]}</p>
      <button
        className="button"
        onClick={() =>
          index + 1 < tour.length ? setIndex(index + 1) : close()
        }
      >
        {index + 1 < tour.length ? "Próximo" : "Entendi"}
      </button>
    </aside>
  ) : (
    <button className="tutorial-replay" onClick={() => setReplay(true)}>
      Como funciona
    </button>
  );
}
