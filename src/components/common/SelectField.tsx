import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type Choice = { value: string; label: string };

/** A styled select with the same keyboard contract as a single-select listbox. */
export function SelectField({ label, value, options, onChange, disabled = false }: {
  label: string; value: string; options: Choice[]; onChange: (value: string) => void; disabled?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [above, setAbove] = useState(false);
  const selected = options.findIndex(option => option.value === value);
  const show = () => {
    setActive(Math.max(0, selected));
    const rect = trigger.current?.getBoundingClientRect();
    setAbove(!!rect && window.innerHeight - rect.bottom < 260 && rect.top > 260);
    setOpen(true);
  };
  const choose = (index: number) => {
    if (options[index]) onChange(options[index].value);
    setOpen(false); trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  useEffect(() => {
    if (open) root.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);
  return <div className="select-field" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <span className="field-label" id={`${id}-label`}>{label}</span>
    <button ref={trigger} type="button" className="select-trigger" role="combobox" aria-labelledby={`${id}-label ${id}-value`} aria-controls={`${id}-options`} aria-expanded={open} aria-haspopup="listbox" aria-activedescendant={open ? `${id}-${active}` : undefined} disabled={disabled} onClick={() => open ? setOpen(false) : show()} onKeyDown={event => {
      if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(event.key)) event.preventDefault();
      if (event.key === 'Escape') setOpen(false);
      else if (event.key === 'Enter' || event.key === ' ') { if (open) choose(active); else show(); }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!open) show();
        else setActive(index => Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
      } else if (event.key === 'Home') setActive(0);
      else if (event.key === 'End') setActive(options.length - 1);
      else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        const index = options.findIndex(option => option.label.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()));
        if (index >= 0) { if (!open) show(); setActive(index); }
      }
    }}><span id={`${id}-value`}>{options[selected]?.label || 'Choose an option'}</span><ChevronDown size={17} aria-hidden="true"/></button>
    {open && <div id={`${id}-options`} role="listbox" aria-labelledby={`${id}-label`} className={`select-options ${above ? 'opens-above' : ''}`}>
      {options.map((option, index) => <div key={option.value} id={`${id}-${index}`} role="option" aria-selected={option.value === value} data-index={index} className={active === index ? 'is-focused' : ''} onPointerMove={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}><span>{option.label}</span>{option.value === value && <Check size={17} aria-hidden="true"/>}</div>)}
    </div>}
  </div>;
}
