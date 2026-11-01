import { glossary } from '../../config/game';
export function Info({ term }: {
    term: keyof typeof glossary;
}) { return <details className="tooltip"><summary aria-label={term + 'の説明'}>ⓘ {term}</summary><p role="note">{glossary[term]}</p></details>; }
export function Glossary() { return <div className="glossary">{(Object.keys(glossary) as (keyof typeof glossary)[]).map(term => <Info key={term} term={term}/>)}</div>; }
