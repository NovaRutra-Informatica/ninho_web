export function App() {
  return (
    <main className="welcome">
      <article className="welcome-card" aria-labelledby="welcome-title">
        <img className="owl" src={`${import.meta.env.BASE_URL}ninho.svg`} alt="Coruja do Ninho" width="144" height="144" />
        <p className="eyebrow">Ninho Web</p>
        <h1 id="welcome-title">Um novo espaço para o Ninho.</h1>
        <p className="status"><span aria-hidden="true" />Ambiente preparado</p>
        <p className="description">
          A base da versão web está pronta para desenvolvimento.
          Os recursos de estudo serão adicionados nas próximas etapas.
        </p>
        <p className="footnote">Seu espaço para aprender, agora com um lugar na web.</p>
      </article>
    </main>
  );
}
