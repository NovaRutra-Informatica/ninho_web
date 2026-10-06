import { memo, useMemo, useState } from 'react';
import type { Subject } from './model';

const OPTION_LIMIT = 100;

export default memo(function SubjectSelect({ subjects, label = 'Matéria', searchLabel = 'Buscar matéria', value, onChange, disabled, name, emptyLabel }: {
  subjects: Subject[];
  label?: string;
  searchLabel?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [localValue, setLocalValue] = useState(() => emptyLabel ? '' : subjects[0]?.id ?? '');
  const selected = value ?? localValue;
  const large = subjects.length > OPTION_LIMIT;
  const matches = useMemo(() => {
    if (!large) return subjects;
    const term = query.trim().toLocaleLowerCase();
    return term ? subjects.filter(subject => subject.name.toLocaleLowerCase().includes(term)) : subjects;
  }, [subjects, query, large]);
  const pages = Math.max(1, Math.ceil(matches.length / OPTION_LIMIT));
  const currentPage = Math.min(page, pages - 1);
  const first = currentPage * OPTION_LIMIT;
  const options = useMemo(() => {
    const visible = matches.slice(first, first + OPTION_LIMIT);
    const current = subjects.find(subject => subject.id === selected);
    return current && !visible.some(subject => subject.id === selected) ? [current, ...visible] : visible;
  }, [subjects, matches, selected, first]);
  return <div className="subject-picker">
    {large && <label>{searchLabel}<input type="search" disabled={disabled} value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} /></label>}
    <label>{label}<select aria-label={label} name={name} value={selected} disabled={disabled} onChange={event => { setLocalValue(event.target.value); onChange?.(event.target.value); }}>
      {emptyLabel && <option value="">{emptyLabel}</option>}
      {options.map(subject => <option value={subject.id} key={subject.id}>{subject.name}</option>)}
    </select></label>
    {large && <>
      <div className="collection-pages" role="group" aria-label={`Páginas de ${label.toLocaleLowerCase()}`}>
        <span aria-live="polite">{matches.length ? `${first + 1}–${Math.min(first + OPTION_LIMIT, matches.length)} de ${matches.length}` : 'Nenhum resultado'}</span>
        <button type="button" className="button secondary" disabled={disabled || currentPage === 0} onClick={() => setPage(currentPage - 1)}>Opções anteriores</button>
        <button type="button" className="button secondary" disabled={disabled || currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Mais opções</button>
      </div>
      <p className="help">Todos os resultados estão disponíveis nas páginas de {OPTION_LIMIT} opções. A seleção atual permanece disponível ao mudar de página.</p>
    </>}
  </div>;
});
