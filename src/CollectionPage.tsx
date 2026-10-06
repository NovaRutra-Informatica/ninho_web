import { useMemo, useState, type ReactNode } from 'react';

export const COLLECTION_PAGE_SIZE = 48;

export default function CollectionPage<T>({ items, searchText, searchLabel, onNavigate, children }: {
  items: T[];
  searchText: (item: T) => string;
  searchLabel: string;
  onNavigate?: () => void;
  children: (visible: T[]) => ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return term ? items.filter(item => searchText(item).toLocaleLowerCase().includes(term)) : items;
  }, [items, query, searchText]);
  const pages = Math.max(1, Math.ceil(matches.length / COLLECTION_PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const first = current * COLLECTION_PAGE_SIZE;
  return <>
    {(items.length > COLLECTION_PAGE_SIZE || query) && <div className="collection-tools">
      <label>{searchLabel}<input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} /></label>
      <div className="collection-pages" role="group" aria-label={`Resultados de ${searchLabel.toLocaleLowerCase()}`}>
        <span aria-live="polite">{matches.length ? `${first + 1}–${Math.min(first + COLLECTION_PAGE_SIZE, matches.length)} de ${matches.length}` : 'Nenhum resultado'}</span>
        <button className="button secondary" disabled={current === 0} onClick={() => { onNavigate?.(); setPage(current - 1); }}>Página anterior</button>
        <button className="button secondary" disabled={current + 1 >= pages} onClick={() => { onNavigate?.(); setPage(current + 1); }}>Próxima página</button>
      </div>
    </div>}
    {children(matches.slice(first, first + COLLECTION_PAGE_SIZE))}
  </>;
}
