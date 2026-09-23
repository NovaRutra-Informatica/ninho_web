import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Profile from './ProfilePage';
import StudySummary from './StudySummary';
import { Tutorial } from './Tutorial';
import { emptyProfile } from './profile';
import { DAY, STORAGE_KEY, demoData, elapsedSeconds, formatTime, freshData, intervals, minutesLabel, parseData, sameDay, saveSession, uid, type Question, type StudyData } from './model';

type View = 'today' | 'timer' | 'subjects' | 'reviews' | 'questions' | 'data' | 'profile';
const navigation: { id: View; label: string; icon: string }[] = [{ id: 'today', label: 'Meu ninho', icon: 'home' }, { id: 'timer', label: 'Temporizador', icon: 'timer' }, { id: 'subjects', label: 'Matérias', icon: 'book' }, { id: 'reviews', label: 'Revisões', icon: 'repeat' }, { id: 'questions', label: 'Questões', icon: 'check' }];
const dateLabel = (date: number) => new Date(date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></>,
    timer: <><circle cx="12" cy="14" r="8" /><path d="M9 2h6M12 6V2m6 5 2-2m-8 5v5l3 2" /></>,
    book: <><path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-6-2-10 1Z" /><path d="M12 5v15" /></>,
    repeat: <><path d="M20 10a8 8 0 0 0-14-5L3 8m0-5v5h5M4 14a8 8 0 0 0 14 5l3-3m0 5v-5h-5" /></>,
    check: <><rect x="3" y="3" width="18" height="18" rx="5" /><path d="m7 12 3 3 7-7" /></>,
    leaf: <><path d="M20 3C6 1 2 9 5 15s14 6 15-12Z" /><path d="m4 21 10-12" /></>,
    data: <><path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6" /></>, plus: <path d="M12 5v14M5 12h14" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.leaf}</svg>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} onCancel={onClose} aria-labelledby="dialog-title"><div className="dialog-head"><h2 id="dialog-title">{title}</h2><button className="icon-button" aria-label="Fechar" onClick={onClose}>×</button></div>{children}</dialog>;
}
function download(value: string, filename: string) {
  const url = URL.createObjectURL(new Blob([value], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function initialState() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return { data: raw ? parseData(raw) : freshData(), error: '', recovery: '' }; }
  catch { let raw = ''; try { raw = localStorage.getItem(STORAGE_KEY) ?? ''; } catch {  } return { data: freshData(), error: raw ? 'Não foi possível ler seus dados. Baixe uma cópia para recuperação antes de recomeçar.' : 'O navegador bloqueou o armazenamento. Exporte um backup antes de fechar esta página.', recovery: raw }; }
}

export function App() {
  const [initial] = useState(initialState);
  const [data, setData] = useState(initial.data);
  const [storageError, setStorageError] = useState(initial.error);
  const [recovery, setRecovery] = useState(initial.recovery);
  const [view, setView] = useState<View>('today');
  const [welcome, setWelcome] = useState(Boolean(!initial.recovery && !initial.error && initial.data.profile && !initial.data.profile.completedAt));
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const [subjectModal, setSubjectModal] = useState(false);
  const [questionModal, setQuestionModal] = useState(false);
  const [finishModal, setFinishModal] = useState(false);
  const [confirm, setConfirm] = useState<'reset' | 'demo' | 'import' | 'timer' | null>(null);
  const [imported, setImported] = useState<StudyData | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [questionId, setQuestionId] = useState('');
  const [questionFilter, setQuestionFilter] = useState('');
  const [offline, setOffline] = useState(!navigator.onLine);
  const fileInput = useRef<HTMLInputElement>(null);
  const memoryOnly = useRef(false);

  function commit(update: (current: StudyData) => StudyData, replace = false) {
    let current = data;
    if (!replace && !recovery && !memoryOnly.current) {
      let saved: string | null = null;
      try { saved = localStorage.getItem(STORAGE_KEY); } catch {  }
      if (saved) {
        try { current = parseData(saved); }
        catch { setRecovery(saved); setStorageError('Os dados salvos não puderam ser lidos. Baixe uma cópia antes de recomeçar.'); return false; }
      }
    }
    const next = update(current);
    let persisted = true;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setStorageError(''); memoryOnly.current = false; }
    catch { persisted = false; memoryOnly.current = true; setStorageError('Não foi possível salvar no navegador. Exporte um backup antes de fechar esta página.'); }
    setData(next);
    return persisted;
  }
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = data.preferences?.theme === 'dark' || (data.preferences?.theme ?? 'system') === 'system' && media.matches ? 'dark' : 'light'; document.documentElement.dataset.reducedMotion = String(data.preferences?.reducedMotion ?? false); };
    apply(); media.addEventListener('change', apply); return () => media.removeEventListener('change', apply);
  }, [data.preferences]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (memoryOnly.current) { setStorageError('Outra aba alterou os dados, mas há mudanças não salvas aqui. Exporte seu backup antes de continuar.'); return; }
      try { setData(event.newValue ? parseData(event.newValue) : freshData()); setNotice('Dados atualizados em outra aba.'); setRecovery(''); setAnswer(null); setQuestionId(''); }
      catch { setRecovery(event.newValue ?? ''); setStorageError('Os dados de outra aba não puderam ser lidos. Baixe uma cópia antes de recomeçar.'); }
    };
    const network = () => setOffline(!navigator.onLine);
    const tick = () => setNow(Date.now());
    window.addEventListener('storage', sync); window.addEventListener('online', network); window.addEventListener('offline', network); document.addEventListener('visibilitychange', tick);
    const minute = window.setInterval(tick, 60000);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('online', network); window.removeEventListener('offline', network); document.removeEventListener('visibilitychange', tick); window.clearInterval(minute); };
  }, []);
  useEffect(() => {
    if (data.timer.startedAt === null) return;
    const isComplete = () => elapsedSeconds(data.timer) >= (data.timer.mode === 'focus' ? data.timer.duration : 604800);
    setNow(Date.now());
    if (isComplete()) return;
    const tick = () => { setNow(Date.now()); if (isComplete()) window.clearInterval(handle); };
    const handle = window.setInterval(tick, 1000);
    return () => window.clearInterval(handle);
  }, [data.timer]);
  useEffect(() => { if (notice) { const handle = window.setTimeout(() => setNotice(''), 6000); return () => window.clearTimeout(handle); } }, [notice]);

  const elapsed = elapsedSeconds(data.timer, now);
  const completed = data.timer.mode === 'focus' && elapsed >= data.timer.duration;
  const running = data.timer.startedAt !== null && !completed;
  const remaining = data.timer.mode === 'focus' ? data.timer.duration - elapsed : elapsed;
  const due = data.reviews.filter(r => r.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt);
  const todaySessions = data.sessions.filter(s => sameDay(s.completedAt, now));
  const todaySeconds = todaySessions.reduce((sum, s) => sum + s.seconds, 0);
  const subjectName = (id: string) => data.subjects.find(s => s.id === id)?.name ?? 'Matéria';
  const questions = data.questions.filter(q => !questionFilter || q.subjectId === questionFilter);
  const question = questions.find(q => q.id === questionId) ?? questions[0];
  const totalSeconds = data.sessions.reduce((sum, s) => sum + s.seconds, 0);
  const hasProgress = elapsed > 0 || data.timer.startedAt !== null;
  const hasData = data.subjects.length > 0 || data.sessions.length > 0;
  const navigate = (next: View) => { setView(next); setNow(Date.now()); window.scrollTo({ top: 0 }); };
  function startFor(subjectId: string, topic = '') {
    if (hasProgress && (subjectId !== data.timer.subjectId || topic !== data.timer.topic)) { setNotice('Conclua ou descarte a sessão atual antes de trocar de matéria.'); navigate('timer'); return; }
    commit(d => ({ ...d, timer: { ...d.timer, subjectId, topic } })); navigate('timer');
  }
  function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const name = String(form.get('name')).trim();
    if (!name) return;
    if (data.subjects.some(s => s.name.toLocaleLowerCase() === name.toLocaleLowerCase())) { setNotice('Essa matéria já está no seu ninho.'); return; }
    const id = uid(); commit(d => ({ ...d, subjects: [...d.subjects, { id, name, color: d.subjects.length % 5, createdAt: Date.now() }], timer: { ...d.timer, subjectId: d.timer.subjectId || id } })); setSubjectModal(false); setNotice('Matéria adicionada. Vamos começar?');
  }
  function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const options = [0, 1, 2, 3].map(i => String(form.get(`option${i}`)).trim());
    const q: Question = { id: uid(), subjectId: String(form.get('subject')), prompt: String(form.get('prompt')).trim(), options, correct: Number(form.get('correct')), explanation: String(form.get('explanation')).trim() };
    if (!q.prompt || options.some(o => !o)) return;
    commit(d => ({ ...d, questions: [...d.questions, q] })); setQuestionModal(false); setQuestionFilter(''); setQuestionId(q.id); setAnswer(null); setNotice('Questão adicionada ao seu banco.');
  }
  function recordAnswer(selected: number) {
    if (!question || answer !== null) return;
    setAnswer(selected); commit(d => ({ ...d, answers: [...d.answers, { id: uid(), questionId: question.id, selected, correct: selected === question.correct, answeredAt: Date.now() }] }));
  }
  async function importBackup(file?: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setNotice('O backup deve ter no máximo 10 MB.'); return; }
    try { setImported(parseData(await file.text())); setConfirm('import'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível ler o arquivo.'); }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  }
  const heading = (kicker: string, title: string, description: string, action?: ReactNode) => <div className="page-heading"><div><p className="section-kicker">{kicker}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>;
  const newSubject = <button className="button secondary" onClick={() => setSubjectModal(true)}><Icon name="plus" />Nova matéria</button>;
  const profileView = (isWelcome = false) => <Profile profile={data.profile} welcome={isWelcome} done={() => setWelcome(false)} save={profile => commit(d => ({ ...d, profile: { ...profile, revision: (d.profile?.revision ?? 0) + 1, tutorialsSeen: d.profile?.tutorialsSeen ?? [] }, timer: d.timer.startedAt === null && d.timer.elapsed === 0 ? { ...d.timer, duration: Math.max(1, Math.min(240, profile.sessionMinutes)) * 60 } : d.timer }))} replay={() => commit(d => ({ ...d, profile: { ...(d.profile ?? emptyProfile()), tutorialsSeen: [] } }))} />;
  if (welcome) return <>{storageError && <div className="storage-warning" role="alert">{storageError} <button onClick={() => download(recovery || JSON.stringify(data, null, 2), `ninho-recuperacao-${Date.now()}.json`)}>Baixar cópia</button></div>}{profileView(true)}</>;
  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('today')} aria-label="Ninho, início"><img src={`${import.meta.env.BASE_URL}ninho.svg`} width="58" height="58" alt="Coruja do Ninho" /><span>Ninho<small>Seu espaço de estudo</small></span></button>
      <nav aria-label="Navegação principal">{navigation.map(item => <button key={item.id} aria-label={item.label} className={view === item.id ? 'nav-item active' : 'nav-item'} aria-current={view === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.id === 'reviews' && due.length > 0 && <span className="nav-count">{due.length}</span>}</button>)}</nav>
      <div className="sidebar-note"><Icon name="leaf" /><p>Aprender também é<br />respeitar seu ritmo.</p></div>
      <button className={`nav-item data-nav ${view === 'data' ? 'active' : ''}`} onClick={() => navigate('data')}><Icon name="data" /><span>Seus dados</span></button>
      <span className="local-label"><span />{offline ? 'Você está offline' : 'Salvo neste navegador'}</span>
    </aside>
    <div className="workspace">
      <header className="topbar"><button className="text-button profile-link" onClick={() => navigate("profile")} aria-label="Meu perfil">{data.profile?.name || "Meu perfil"}</button><span>{new Date(now).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span><button onClick={() => navigate('data')} className="local-pill"><Icon name="leaf" />{offline ? 'Modo offline' : 'Seu ninho é privado'}</button></header>
      {notice && <div className="toast" role="status">{notice}</div>}
      {storageError && <div className="storage-warning" role="alert">{storageError} <button onClick={() => download(recovery || JSON.stringify(data, null, 2), `ninho-recuperacao-${Date.now()}.json`)}>Baixar cópia</button>{recovery && <button onClick={() => setConfirm('reset')}>Recomeçar</button>}</div>}
      <main id="main-content">
        {recovery ? <div className="empty"><Icon name="data" /><h1>Vamos proteger seus estudos.</h1><p>Use “Baixar cópia” acima para guardar o conteúdo original; você também pode restaurar um backup válido.</p><label className="button">Restaurar backup<input type="file" accept="application/json,.json" onChange={e => void importBackup(e.target.files?.[0])} /></label></div> : <>
        {view === 'profile' && profileView()}
        {view === 'today' && <>
          {heading('Um pouco todos os dias', 'Um passo de cada vez.', 'Seu próximo momento de foco começa aqui.', newSubject)}
          <section className="focus-banner"><div><span className="quiet-label">Espaço para se concentrar</span><h2>{running ? 'Seu momento está acontecendo.' : <>Acomode as ideias.<br />E comece.</>}</h2><p>{running ? `${subjectName(data.timer.subjectId)} · ${formatTime(remaining)} no temporizador` : 'Escolha uma matéria, reserve um tempo e cuide do que você quer aprender.'}</p><button className="button light" onClick={() => { if (!data.subjects.length) setSubjectModal(true); else navigate('timer'); }}>{running ? 'Voltar ao temporizador' : data.subjects.length ? 'Começar a estudar' : 'Adicionar minha primeira matéria'}<Icon name="timer" /></button></div><div className="nest-art" aria-hidden="true"><img src={`${import.meta.env.BASE_URL}ninho.svg`} width="236" height="236" alt="" /><span>Seu ritmo. Seu caminho.</span></div></section>
          <div className="stats-strip"><div><span>Foco hoje</span><strong>{minutesLabel(todaySeconds)}</strong></div><div><span>Sessões concluídas</span><strong>{todaySessions.length}<small> hoje</small></strong></div><div><span>Para revisitar</span><strong>{due.length}<small> {due.length === 1 ? 'tema' : 'temas'}</small></strong></div></div>
          <StudySummary data={data} now={now} open={navigate}/>
          <div className="dashboard-grid"><section><div className="section-heading"><h2>Volte a uma boa ideia</h2><button className="text-button" onClick={() => navigate('reviews')}>Ver revisões</button></div>{due.length ? due.slice(0, 3).map(r => <button key={r.id} className="study-row" onClick={() => startFor(r.subjectId, r.topic)}><span className={`subject-dot color-${data.subjects.find(s => s.id === r.subjectId)?.color ?? 0}`} /><span><strong>{r.topic}</strong><small>{subjectName(r.subjectId)} · revisão disponível</small></span><Icon name="repeat" /></button>) : <div className="gentle-empty"><Icon name="leaf" /><h3>{data.sessions.length ? 'Tudo em dia por aqui.' : 'As revisões começam com você.'}</h3><p>{data.sessions.length ? 'Seus próximos temas aparecerão aqui na hora de revisar.' : 'Ao concluir uma sessão, diga como foi. O Ninho agenda o próximo encontro com esse tema.'}</p></div>}</section><section><div className="section-heading"><h2>Suas matérias</h2><button className="text-button" onClick={() => navigate('subjects')}>Ver todas</button></div>{data.subjects.length ? data.subjects.slice(0, 4).map(s => <button key={s.id} className="study-row" onClick={() => startFor(s.id)}><span className={`subject-icon color-${s.color}`}><Icon name="book" /></span><span><strong>{s.name}</strong><small>{minutesLabel(data.sessions.filter(session => session.subjectId === s.id).reduce((sum, session) => sum + session.seconds, 0))} de estudo</small></span><span className="row-action">Estudar</span></button>) : <div className="gentle-empty"><h3>O que você quer aprender?</h3><p>Organize seus estudos em matérias, do seu jeito.</p><button className="text-button" onClick={() => setSubjectModal(true)}>Adicionar matéria</button></div>}</section></div>
          {!hasData && <div className="try-demo"><p><strong>Conheça o Ninho na prática.</strong> Explore uma matéria, uma revisão e uma questão de exemplo.</p><button className="text-button" onClick={() => setConfirm('demo')}>Experimentar com exemplos</button></div>}
        </>}
        {view === 'timer' && <>
          {heading('Um tempo só para aprender', 'Seu momento de foco.', 'O tempo continua certo mesmo quando você troca de aba.')}
          {!data.subjects.length ? <Empty title="Escolha o que vai estudar." description="Adicione uma matéria para associar seu tempo e suas revisões." action="Adicionar matéria" onAction={() => setSubjectModal(true)} /> : <div className="timer-layout"><section className="timer-panel"><div className="segmented" aria-label="Modo de tempo">{(['focus', 'stopwatch'] as const).map(mode => <button key={mode} disabled={hasProgress} aria-pressed={data.timer.mode === mode} onClick={() => commit(d => ({ ...d, timer: { ...d.timer, mode } }))}>{mode === 'focus' ? 'Temporizador' : 'Cronômetro'}</button>)}</div><p className="timer-state" role="status">{completed ? 'Tempo concluído. Como foi?' : running ? 'Uma coisa de cada vez.' : hasProgress ? 'Pode respirar. Seu tempo está salvo.' : 'Pronto quando você estiver.'}</p><div className={`clock-face ${running ? 'running' : ''}`}><span className="timer-number" aria-label={`${data.timer.mode === 'focus' ? 'Tempo restante' : 'Tempo decorrido'}: ${formatTime(remaining)}`}>{formatTime(remaining)}</span><span>{data.timer.mode === 'focus' ? 'tempo restante' : 'tempo de estudo'}</span></div>{data.timer.mode === 'focus' && <div className="duration-controls"><div className="presets">{[15, 25, 45, 60].map(m => <button key={m} disabled={hasProgress} aria-pressed={data.timer.duration === m * 60} onClick={() => commit(d => ({ ...d, timer: { ...d.timer, duration: m * 60 } }))}>{m} min</button>)}</div><label className="custom-duration">Ou escolha <input aria-label="Duração em minutos" type="number" min="1" max="240" value={data.timer.duration / 60} disabled={hasProgress} onChange={e => { const minutes = Number(e.target.value); if (Number.isInteger(minutes) && minutes >= 1 && minutes <= 240) commit(d => ({ ...d, timer: { ...d.timer, duration: minutes * 60 } })); }} /> minutos</label><input aria-label="Ajustar duração" type="range" min="1" max="240" value={data.timer.duration / 60} disabled={hasProgress} onChange={e => commit(d => ({ ...d, timer: { ...d.timer, duration: Number(e.target.value) * 60 } }))} /></div>}<div className="timer-actions">{!completed && <button className="button" onClick={() => { setNow(Date.now()); commit(d => ({ ...d, timer: { ...d.timer, elapsed: elapsedSeconds(d.timer), startedAt: d.timer.startedAt === null ? Date.now() : null } })); }}>{running ? 'Pausar' : hasProgress ? 'Continuar' : 'Começar foco'}</button>}{elapsed > 0 && <button className={`button ${completed ? '' : 'secondary'}`} onClick={() => { commit(d => ({ ...d, timer: { ...d.timer, elapsed: elapsedSeconds(d.timer), startedAt: null } })); setFinishModal(true); }}>Concluir sessão</button>}</div>{hasProgress && <button className="text-button muted" onClick={() => setConfirm('timer')}>Descartar sessão</button>}</section><aside className="session-details"><h2>O que vamos estudar?</h2><label>Matéria<select aria-label="Matéria" value={data.timer.subjectId} disabled={hasProgress} onChange={e => commit(d => ({ ...d, timer: { ...d.timer, subjectId: e.target.value } }))}>{data.subjects.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label>Tema da sessão<input maxLength={200} value={data.timer.topic} placeholder="Ex.: Membrana plasmática" disabled={hasProgress} onChange={e => commit(d => ({ ...d, timer: { ...d.timer, topic: e.target.value } }))} /></label><p className="help">Um tema específico ajuda a encontrar seus registros e organizar revisões.</p><div className="tip-note"><Icon name="leaf" /><p>Feche as distrações, deixe água por perto e escolha uma pequena meta para esta sessão.</p></div><h3>Seu dia até aqui</h3><p><strong>{minutesLabel(todaySeconds)}</strong> em {todaySessions.length} {todaySessions.length === 1 ? 'sessão' : 'sessões'}.</p></aside></div>}
        </>}
        {view === 'subjects' && <>
          {heading('Um lugar para cada descoberta', 'Suas matérias.', 'Tempo, temas e anotações reunidos.', newSubject)}
          {data.subjects.length ? <div className="subjects-grid">{data.subjects.map(s => { const sessions = data.sessions.filter(session => session.subjectId === s.id); return <article key={s.id} className={`subject-card color-${s.color}`}><Icon name="book" /><h2>{s.name}</h2><p>{minutesLabel(sessions.reduce((sum, session) => sum + session.seconds, 0))} de estudo <span>•</span> {sessions.length} sessões</p><button className="button secondary" onClick={() => startFor(s.id)}>Estudar esta matéria</button>{sessions[0] && <small>Último tema: {sessions[0].topic}</small>}</article>; })}</div> : <Empty title="Seu caderno começa aqui." description="Adicione as matérias que fazem parte da sua rotina." action="Adicionar matéria" onAction={() => setSubjectModal(true)} />}
          <section className="history"><div className="section-heading"><h2>Seu caminho até aqui</h2><span>{data.sessions.length} sessões</span></div>{data.sessions.length ? data.sessions.slice(0, 50).map(s => <details className="session-row" key={s.id}><summary><span><strong>{s.topic}</strong><small>{subjectName(s.subjectId)} · {dateLabel(s.completedAt)}</small></span><span>{minutesLabel(s.seconds)}</span><span className="confidence">{['', 'Reforçar', 'Praticar', 'Entendi'][s.confidence]}</span></summary><p>{s.notes || 'Nenhuma anotação nesta sessão.'}</p></details>) : <p className="help">As sessões concluídas aparecerão aqui, junto com suas anotações.</p>}{data.sessions.length > 50 && <p className="help">Exibindo as últimas 50 sessões. O backup contém todo o histórico.</p>}</section>
        </>}
        {view === 'reviews' && <>
          {heading('Reencontrar para lembrar', 'Ideias que merecem voltar.', 'Revisões simples, guiadas pelo que você já estudou.', <span className="count-pill">{due.length} para agora</span>)}<div className="info-note"><Icon name="repeat" /><p>Depois de estudar, o seu feedback agenda a primeira revisão em 1, 3 ou 7 dias. A cada revisão marcada, o intervalo cresce até 60 dias. São intervalos fixos; esta versão web não usa IA.</p></div>
          {data.reviews.length ? <div className="reviews-list">{[...data.reviews].sort((a, b) => a.dueAt - b.dueAt).map(r => <article className="review-row" key={r.id}><span className={`subject-icon color-${data.subjects.find(s => s.id === r.subjectId)?.color ?? 0}`}><Icon name="book" /></span><div><span className={r.dueAt <= now ? 'due-label' : 'help'}>{r.dueAt <= now ? 'Hora de revisar' : `Próxima revisão: ${dateLabel(r.dueAt)}`}</span><h2>{r.topic}</h2><p>{subjectName(r.subjectId)}</p></div><div className="review-actions"><button className="button secondary" onClick={() => startFor(r.subjectId, r.topic)}>Estudar</button><button className="text-button" onClick={() => { commit(d => ({ ...d, reviews: d.reviews.map(review => review.id === r.id ? { ...review, stage: Math.min(5, review.stage + 1), dueAt: Date.now() + intervals[Math.min(5, review.stage + 1)] * DAY, lastReviewedAt: Date.now() } : review) })); setNotice('Revisão registrada. O próximo intervalo já foi agendado.'); }}>Já revisei</button></div></article>)}</div> : <Empty title="Cada sessão planta uma revisão." description="Conclua um estudo no temporizador para criar sua primeira revisão." action="Ir ao temporizador" onAction={() => navigate('timer')} />}
        </>}
        {view === 'questions' && <>
          {heading('Lembrar é colocar em prática', 'Teste suas descobertas.', 'Monte seu banco e aprenda também com os erros.', <button className="button" onClick={() => data.subjects.length ? setQuestionModal(true) : setSubjectModal(true)}><Icon name="plus" />Nova questão</button>)}
          {data.questions.length > 0 && <div className="question-toolbar"><label>Filtrar por matéria<select value={questionFilter} onChange={e => { setQuestionFilter(e.target.value); setAnswer(null); setQuestionId(''); }}><option value="">Todas as matérias</option>{data.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><p><strong>{data.answers.filter(a => a.correct).length}</strong> acertos em {data.answers.length} respostas</p></div>}
          {question ? <article className="question-card"><span className="quiet-label">{subjectName(question.subjectId)} · Questão {questions.indexOf(question) + 1} de {questions.length}</span><h2>{question.prompt}</h2><div className="answer-options">{question.options.map((option, index) => <button className={`answer-option ${answer !== null && index === question.correct ? 'correct' : answer === index ? 'incorrect' : ''}`} key={index} disabled={answer !== null} onClick={() => recordAnswer(index)}><span>{String.fromCharCode(65 + index)}</span>{option}{answer !== null && index === question.correct && <Icon name="check" />}</button>)}</div>{answer !== null && <div className={`answer-feedback ${answer === question.correct ? 'correct' : ''}`} role="status"><h3>{answer === question.correct ? 'Isso mesmo!' : 'Mais uma chance de aprender.'}</h3><p>{question.explanation || `A resposta correta é ${String.fromCharCode(65 + question.correct)}: ${question.options[question.correct]}.`}</p><button className="button secondary" onClick={() => { setQuestionId(questions[(questions.indexOf(question) + 1) % questions.length].id); setAnswer(null); }}>{questions.length > 1 ? 'Próxima questão' : 'Tentar novamente'}</button></div>}</article> : <Empty title="Uma pergunta abre caminhos." description={data.subjects.length ? 'Adicione suas próprias questões com alternativas, gabarito e explicação.' : 'Comece adicionando uma matéria para organizar suas questões.'} action={data.subjects.length ? 'Criar minha primeira questão' : 'Adicionar matéria'} onAction={() => data.subjects.length ? setQuestionModal(true) : setSubjectModal(true)} />}
        </>}
        {view === 'data' && <>
          <section className="data-panel web-preferences"><h2>Do seu jeito</h2><p className="help">As alterações são salvas automaticamente.</p><label>Aparência<select value={data.preferences?.theme ?? 'system'} onChange={e => commit(d => ({ ...d, preferences: { reducedMotion: d.preferences?.reducedMotion ?? false, theme: e.target.value as 'light' | 'dark' | 'system' } }))}><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Escuro</option></select></label><label className="web-motion"><input type="checkbox" checked={data.preferences?.reducedMotion ?? false} onChange={e => commit(d => ({ ...d, preferences: { theme: d.preferences?.theme ?? 'system', reducedMotion: e.target.checked } }))} /> Reduzir animações</label></section>
          {heading('Seu estudo fica com você', 'Um ninho só seu.', 'Sem conta, sem rastreamento, sem IA na nuvem.')}<div className="data-grid"><section className="data-panel"><Icon name="data" /><h2>Leve seu progresso junto.</h2><p>Matérias, sessões, revisões e questões ficam neste navegador. Limpar os dados do site ou usar uma janela privada pode apagar esse histórico.</p><div className="backup-summary"><strong>{data.subjects.length}</strong> matérias <strong>{data.sessions.length}</strong> sessões <strong>{minutesLabel(totalSeconds)}</strong> de foco</div><button className="button" onClick={() => { download(JSON.stringify(data, null, 2), `ninho-backup-${new Date().toISOString().slice(0, 10)}.json`); setNotice('Backup preparado para download.'); }}>Exportar backup</button><label className="button secondary file-button">Restaurar backup<input ref={fileInput} type="file" accept="application/json,.json" onChange={e => void importBackup(e.target.files?.[0])} /></label><p className="help">A restauração substitui os dados deste navegador, após confirmação.</p></section><section className="data-panel soft"><h2>Uma versão leve do Ninho.</h2><p>Este espaço reúne o essencial para experimentar sua rotina de estudos. As sugestões de revisão seguem intervalos fixos; a personalização por IA pertence aos aplicativos.</p><p>Depois do primeiro carregamento completo, esta versão pode abrir offline neste mesmo navegador. Seus estudos nunca são enviados a um servidor.</p><button className="text-button" onClick={() => setConfirm('demo')}>Carregar exemplos de estudo</button><hr /><h3>Recomeçar</h3><p className="help">Apaga o histórico, as matérias e a sessão em andamento deste navegador.</p><button className="text-button danger" onClick={() => setConfirm('reset')}>Apagar meus dados</button></section></div>
        </>}
        </>}
      </main>
      <footer className="page-footer"><span>Ninho Web</span><span>Pequenos passos também levam longe.</span></footer>
    </div>
    {data.profile?.completedAt && !subjectModal && !questionModal && !finishModal && !confirm && <Tutorial key={view} page={view} seen={data.profile.tutorialsSeen} mark={page => commit(d => ({ ...d, profile: { ...d.profile!, tutorialsSeen: [...new Set([...(d.profile?.tutorialsSeen ?? []), page])] } }))} />}
    {subjectModal && <Modal title="Uma nova matéria" onClose={() => setSubjectModal(false)}><form onSubmit={addSubject}><label>Nome da matéria<input name="name" autoFocus required maxLength={100} placeholder="Ex.: Biologia" /></label><p className="help">Depois, cada sessão pode ter seu próprio tema.</p><button className="button" type="submit">Adicionar matéria</button></form></Modal>}
    {questionModal && <Modal title="Criar questão" onClose={() => setQuestionModal(false)}><form onSubmit={addQuestion}><label>Matéria<select name="subject">{data.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Enunciado<textarea name="prompt" required maxLength={2000} rows={3} /></label><fieldset><legend>Alternativas</legend>{[0, 1, 2, 3].map(i => <label key={i}>{String.fromCharCode(65 + i)}<input name={`option${i}`} required maxLength={500} /></label>)}</fieldset><label>Resposta correta<select name="correct">{[0, 1, 2, 3].map(i => <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>)}</select></label><label>Explicação (opcional)<textarea name="explanation" maxLength={2000} rows={2} /></label><button className="button" type="submit">Salvar questão</button></form></Modal>}
    {finishModal && <Modal title="Como foi esse momento?" onClose={() => setFinishModal(false)}><p>Você dedicou <strong>{minutesLabel(elapsedSeconds(data.timer))}</strong> a {subjectName(data.timer.subjectId)}.</p><form onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); commit(d => saveSession(d, Number(form.get('confidence')), String(form.get('notes')))); setFinishModal(false); setNotice('Sessão salva. Seu próximo encontro com esse tema já está agendado.'); }}><fieldset className="feedback-choices"><legend>Como você se sente sobre o tema?</legend><label><input type="radio" name="confidence" value="1" required />Preciso reforçar <small>Revisar em 1 dia</small></label><label><input type="radio" name="confidence" value="2" defaultChecked />Quero praticar <small>Revisar em 3 dias</small></label><label><input type="radio" name="confidence" value="3" />Entendi bem <small>Revisar em 7 dias</small></label></fieldset><label>Anotações (opcional)<textarea name="notes" maxLength={2000} rows={3} placeholder="O que vale lembrar na próxima vez?" /></label><button type="submit" className="button">Salvar sessão</button></form></Modal>}
    {confirm && <Modal title={confirm === 'timer' ? 'Descartar esta sessão?' : confirm === 'reset' ? 'Apagar seus dados?' : confirm === 'demo' ? 'Experimentar os exemplos?' : 'Restaurar este backup?'} onClose={() => { setConfirm(null); setImported(null); }}><p>{confirm === 'timer' ? 'O tempo desta sessão não será registrado. Seu histórico anterior continua salvo.' : confirm === 'reset' ? 'Isso apaga os dados de estudo deste navegador. Exporte um backup antes de continuar se quiser guardá-los.' : confirm === 'demo' ? 'Os exemplos substituem os dados atuais. Exporte um backup antes se já tiver começado seus estudos.' : `O backup contém ${imported?.subjects.length ?? 0} matérias e ${imported?.sessions.length ?? 0} sessões. Ele substituirá os dados atuais. A sessão importada ficará pausada.`}</p><div className="dialog-actions"><button className="button secondary" onClick={() => setConfirm(null)}>Cancelar</button><button className="button" onClick={() => {
      if (confirm === 'timer') commit(d => ({ ...d, timer: { ...d.timer, elapsed: 0, startedAt: null } }));
      else if (confirm === 'import' && imported) { commit(() => ({ ...imported, timer: { ...imported.timer, elapsed: elapsedSeconds(imported.timer), startedAt: null } }), true); setRecovery(''); setView('today'); }
      else { commit(() => confirm === 'demo' ? demoData() : freshData(), true); setRecovery(''); setView('today'); }
      setQuestionId(''); setAnswer(null); setQuestionFilter(''); setNow(Date.now()); setConfirm(null); setImported(null); setNotice('Pronto. Seu ninho foi atualizado.');
    }}>{confirm === 'timer' ? 'Descartar sessão' : confirm === 'reset' ? 'Apagar dados' : confirm === 'demo' ? 'Carregar exemplos' : 'Restaurar dados'}</button></div></Modal>}
  </div>;
}
function Empty({ title, description, action, onAction }: { title: string; description: string; action: string; onAction: () => void }) { return <section className="empty"><Icon name="leaf" /><h2>{title}</h2><p>{description}</p><button className="button" onClick={onAction}>{action}</button></section>; }
