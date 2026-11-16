import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, List, Search } from 'lucide-react';
import type { NavItem } from 'epubjs/types/navigation';

export function ChapterPicker({ items, currentHref, onSelect }: { items: NavItem[]; currentHref: string; onSelect: (href: string) => void }) {
  const root = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState('');
  const flatten = (entries: NavItem[], depth = 0): { item: NavItem; depth: number }[] => entries.flatMap(item => [{ item, depth }, ...flatten(item.subitems || [], depth + 1)]);
  const chapters = flatten(items);
  const current = chapters.find(({ item }) => item.href === currentHref) || chapters.find(({ item }) => item.href.split('#')[0] === currentHref.split('#')[0]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node) && root.current) root.current.open = false; };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  return <details className="chapter-picker" ref={root} onToggle={() => { if (!root.current?.open) setQuery(''); }} onKeyDown={event => {
    if (event.key === 'Escape' && root.current) { root.current.open = false; root.current.querySelector('summary')?.focus(); }
  }}>
    <summary aria-label={`Open book contents. Current chapter: ${current?.item.label || 'not selected'}`}><span className="chapter-picker-icon"><List size={19}/></span><span className="chapter-picker-copy"><small>BOOK CONTENTS <i>·</i> {chapters.length} {chapters.length===1?'chapter':'chapters'}</small><strong>{current?.item.label || 'Choose a chapter'}</strong></span><span className="chapter-picker-open"><span>Contents</span><ChevronDown size={16}/></span></summary>
    <div className="chapter-menu">
      <div className="chapter-menu-heading"><div><span className="reader-overline">FIND YOUR PLACE</span><h2>Contents</h2></div><span className="chapter-count">{chapters.length} {chapters.length===1?'chapter':'chapters'}</span></div>
      <label className="chapter-search"><Search size={17}/><input aria-label="Find a chapter" placeholder="Find a chapter…" value={query} onChange={event => setQuery(event.target.value)}/></label>
      <nav aria-label="Book chapters" className="chapter-list">
        {chapters.filter(({ item }) => item.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(({ item, depth }, index) => <button key={`${item.id}-${item.href}-${index}`} type="button" aria-current={item === current?.item ? 'location' : undefined} style={{ paddingInlineStart: 12 + Math.min(depth, 4) * 16 }} onClick={() => {
          onSelect(item.href); if (root.current) { root.current.open = false; root.current.querySelector('summary')?.focus(); }
        }}><span className="chapter-index">{String(index+1).padStart(2,'0')}</span><span className="chapter-title">{item.label}</span>{item === current?.item && <Check size={16}/>}</button>)}
        {!chapters.length && <p>This book has no table of contents. Use Previous and Next to turn the pages.</p>}
        {!!chapters.length && !chapters.some(({ item }) => item.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())) && <p>No chapters match “{query}”.</p>}
      </nav>
    </div>
  </details>;
}
