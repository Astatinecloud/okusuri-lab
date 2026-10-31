import { canAfford, keys, type Design } from '../../model';
import { descriptions, labels } from '../../config/game';

type Props = {
    attribute: typeof keys[number];
    icon: string;
    design: Design;
    change: (key: typeof keys[number], level: number) => void;
    setModal: (modal: string) => void;
};

export function PerformanceSetting({ attribute, icon, design, change, setModal }: Props) {
    const level = design[attribute];
    return (
        <section className={`card setting setting-${attribute}`}>
            <h2>
                <span>{icon}</span> {labels[attribute]}
                {attribute === 'mech' && <button className="info" aria-label="新しいしくみのおはなし" onClick={() => setModal('mechanism')}>ⓘ</button>}
            </h2>
            <p>{descriptions[attribute]}</p>
            <div className="levels">
                <button aria-label={`${labels[attribute]}を下げる`} disabled={level === 1} onClick={() => change(attribute, level - 1)}>−</button>
                {[1, 2, 3, 4, 5].map(value => {
                    const locked = !canAfford({ ...design, [attribute]: value });
                    return (
                        <button
                            key={value}
                            aria-label={`${labels[attribute]} レベル${value}${locked ? ' コインがたりない' : ''}`}
                            aria-pressed={level === value}
                            className={`${value <= level ? 'selected' : ''} ${locked ? 'locked' : ''}`}
                            onClick={() => change(attribute, value)}
                        >
                            {locked ? <><span>{value}</span><small>🔒</small></> : value}
                        </button>
                    );
                })}
                <button aria-label={`${labels[attribute]}を上げる`} disabled={level === 5} onClick={() => change(attribute, level + 1)}>＋</button>
            </div>
        </section>
    );
}
