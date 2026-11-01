export function Germ({ res = false, sleep = false }: {
    res?: boolean;
    sleep?: boolean;
}) {
    return (<svg viewBox="0 0 50 50" aria-hidden="true" className={`germ ${sleep ? 'sleep' : ''}`}>
            <circle cx="25" cy="25" r="22" fill={res ? '#e6d6f8' : '#e3efbb'} stroke={res ? '#ad8aca' : '#b7d075'} strokeWidth={res ? 2 : 0}/>
            <circle cx="25" cy="25" r="16" fill={res ? '#b291cc' : '#acd266'}/>
            {sleep ? <text x="14" y="29" fontSize="12">zzz</text> : (<path d="M18 22v3m14-3v3M20 31q5 5 10 0" fill="none" stroke="#40534c" strokeWidth="2" strokeLinecap="round"/>)}
        </svg>);
}
export function Flask() {
    return (<svg className="flask" viewBox="0 0 200 200" aria-hidden="true">
            <ellipse cx="100" cy="177" rx="65" ry="9" fill="#dce7da"/>
            <path d="M77 20h46v12h-9v55l49 66q12 18-10 18H47q-22 0-10-18l49-66V32h-9z" fill="#e6f6f0" stroke="#4a7569" strokeWidth="5"/>
            <path d="M59 124h82l21 31q5 10-10 10H48q-15 0-10-10z" fill="#a7d8ba"/>
            <circle cx="88" cy="142" r="8" fill="#e9f6b8"/>
            <circle cx="115" cy="116" r="6" fill="#b5d7bd"/>
            <path d="M82 66h15" stroke="white" strokeWidth="7" strokeLinecap="round"/>
        </svg>);
}
