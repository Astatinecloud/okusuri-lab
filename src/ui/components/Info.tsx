import { useId, useState } from 'react';
import { Germ } from './Visuals';
import { glossary } from '../../config/game';
export type Term = keyof typeof glossary;
export function Info({ term }: {
    term: Term;
}) {
    const [open, setOpen] = useState(false);
    const id = useId();
    return (<span className="tooltip">
            <button type="button" className="info" aria-label={term + 'の説明'} aria-expanded={open} aria-controls={id} aria-describedby={open ? id : undefined} onClick={() => setOpen(!open)} onBlur={() => setOpen(false)} onKeyDown={event => {
            if (event.key === 'Escape')
                setOpen(false);
        }}>
                ⓘ
            </button>
            {open && <span id={id} role="tooltip" className="tooltip-note">{glossary[term]}</span>}
        </span>);
}
export function Glossary() {
    const terms = Object.keys(glossary) as Term[];
    return (<details className="glossary">
            <summary>用語集</summary>
            <dl>
                {terms.map(term => (<div key={term}>
                        <dt>{term === '新薬が効く菌' && <Germ />}{term === '薬剤耐性' && <Germ res/>}{term === '一時的耐性状態' && <Germ sleep/>}{term}</dt>
                        <dd>{glossary[term]}</dd>
                    </div>))}
            </dl>
        </details>);
}
