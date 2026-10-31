import { cost, keys, type Design } from '../../model';
import { PerformanceSetting } from '../components/PerformanceSetting';

type Props = {
    design: Design;
    shake: boolean;
    busy: boolean;
    change: (key: typeof keys[number], level: number) => void;
    newName: () => void;
    setModal: (modal: string) => void;
};

export function Lab({ design, shake, busy, change, newName, setModal }: Props) {
    const remaining = 9 - cost(design);
    return (
        <>
            <div className="heading">
                <small>STEP 01 / けんきゅう</small>
                <h1>どんな薬をつくる？</h1>
                <p>9まいのコインで、工夫してみよう！</p>
            </div>
            <div className={`coins card ${shake ? 'shake' : ''}`}>
                <strong>けんきゅうコイン 🪙 のこり {remaining} / 9</strong>
                <div aria-hidden="true">
                    {Array.from({ length: 9 }, (_, i) => <span className={i < remaining ? '' : 'spent'} key={i}>●</span>)}
                </div>
            </div>
            <div className="design-grid">
                {keys.map((key, i) => (
                    <PerformanceSetting key={key} attribute={key} icon={['💪', '🔑', '⏰', '💚'][i]} design={design} change={change} setModal={setModal} />
                ))}
            </div>
            <button className="primary wide" disabled={busy} onClick={() => {
                newName();
                setModal('name');
            }}>薬を完成させる！ ✨</button>
        </>
    );
}
