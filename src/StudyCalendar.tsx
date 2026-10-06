import { useState } from 'react';
import { localDay } from './streak';

export function Flame() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 2c.6 4-3.8 5.2-3.1 8.8-1.8-.8-2.1-2.7-2-4.2C5.8 9 4 12 4 15a8 8 0 0 0 16 0c0-5.4-3.2-7.7-6.5-13ZM12 20a3.5 3.5 0 0 1-3.5-3.5c0-1.7 1-2.8 2-4 .1 1.5.7 2.1 1.5 2.5.7-1 1-2.1 1-3.4 1.7 1.8 2.5 3.2 2.5 4.9A3.5 3.5 0 0 1 12 20Z" /></svg>;
}

export default function StudyCalendar({ activeDays, now, count, onNavigate }: { activeDays: Set<string>; now: number; count: number; onNavigate: () => void }) {
  const [month, setMonth] = useState(() => new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1));
  const today = new Date(now);
  const currentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  const label = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const changeMonth = (offset: number) => {
    onNavigate();
    setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  };
  return <section className="study-calendar">
    <p><strong>{count} {count === 1 ? 'dia' : 'dias'} de sequência.</strong> Cada dia com uma sessão concluída, revisão registrada ou questão respondida conta. A chama acende quando você estuda hoje.</p>
    <div className="calendar-controls">
      <button className="icon-button" aria-label="Mês anterior" onClick={() => changeMonth(-1)}>‹</button>
      <h3 aria-live="polite">{label}</h3>
      <button className="icon-button" aria-label="Próximo mês" disabled={currentMonth} onClick={() => changeMonth(1)}>›</button>
    </div>
    <div className="calendar-grid" key={month.getTime()} role="group" aria-label={label}>
      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => <span className="calendar-weekday" key={day}>{day}</span>)}
      {Array.from({ length: month.getDay() }, (_, index) => <span key={`empty-${index}`} aria-hidden="true" />)}
      {Array.from({ length: days }, (_, index) => {
        const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
        const key = localDay(date.getTime());
        const isToday = key === localDay(now);
        const studied = date <= today && activeDays.has(key);
        return <div key={key} className={`calendar-day${studied ? ' studied' : ''}${isToday ? ' today' : ''}${date > today ? ' future' : ''}`} aria-current={isToday ? 'date' : undefined} aria-label={`${date.toLocaleDateString('pt-BR')}${isToday ? ', hoje' : ''}${studied ? ', dia estudado' : ', sem estudo registrado'}`}>
          <span>{index + 1}</span>{studied && <Flame />}
        </div>;
      })}
    </div>
    <div className="calendar-legend"><span><Flame /> Dia estudado</span><span>○ Hoje</span></div>
    {!currentMonth && <button className="button secondary" onClick={() => { onNavigate(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); }}>Voltar para hoje</button>}
    <p className="help">Dias sem estudo não apagam o que você já fez. Backups antigos podem trazer apenas a última revisão de cada tema.</p>
  </section>;
}
