/**
 * Command palette (Ctrl/Cmd+K): search the apps, files and actions of the whole desktop.
 * Keyboard first: type, arrows, Enter; Esc or a click outside closes it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLang, useT } from '../../os/i18n/full';
import { useLaunch } from '../../os/hooks/useLaunch';
import { buildItems, search, type PaletteItem } from './commands';
import './CommandPalette.css';

interface Props {
  onClose(): void;
}

export default function CommandPalette({ onClose }: Props) {
  const t = useT();
  const lang = useLang();
  const launch = useLaunch();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnFocus = useRef<Element | null>(document.activeElement);

  // The item list is built once per opening (it reads the file system and the settings as they are now)
  const items = useMemo(() => buildItems({ lang, t, launch }), [lang, t, launch]);
  const results = useMemo(() => search(items, query), [items, query]);

  useEffect(() => {
    inputRef.current?.focus();
    const back = returnFocus.current;
    return () => {
      if (back instanceof HTMLElement && document.contains(back)) back.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => setIndex(0), [query]);

  // keep the highlighted row in view
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [index, results]);

  const run = (item: PaletteItem | undefined) => {
    if (!item) return;
    onClose();
    window.setTimeout(item.run, 30); // after the palette has given the focus back
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(results[index]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === 'Tab') {
      e.preventDefault(); // the palette is one control; focus stays in the input
    }
  };

  const heading = query.trim() ? null : t('palSuggested');

  return (
    <div className="palette" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette__panel" role="dialog" aria-modal="true" aria-label={t('trayPalette')} onKeyDown={onKeyDown}>
        <input
          ref={inputRef}
          className="palette__input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-autocomplete="list"
          aria-activedescendant={results[index] ? `palette-opt-${results[index].id}` : undefined}
          placeholder={t('palPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        <ul id="palette-list" ref={listRef} className="palette__list" role="listbox">
          {heading && (
            <li className="palette__heading" role="presentation">
              {heading}
            </li>
          )}
          {results.map((item, i) => (
            <li
              key={item.id}
              id={`palette-opt-${item.id}`}
              role="option"
              aria-selected={i === index}
              className={`palette__row${i === index ? ' palette__row--on' : ''}`}
              onMouseMove={() => i !== index && setIndex(i)}
              onClick={() => run(item)}
            >
              <span className="palette__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="palette__label">{item.label}</span>
              {item.hint && <span className="palette__hint">{item.hint}</span>}
              {item.group === 'actions' && !item.hint && <span className="palette__tag">{t('palActions')}</span>}
            </li>
          ))}
          {!results.length && (
            <li className="palette__empty" role="presentation">
              {t('palEmpty')}
            </li>
          )}
        </ul>
        <div className="palette__foot">{t('palHint')}</div>
      </div>
    </div>
  );
}
