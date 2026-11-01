import { cost, keys, type Design } from '../../model';
import { Glossary } from '../components/Info';
import { PerformanceSetting } from '../components/PerformanceSetting';
export function Lab({ design, busy, change, newName, setModal }: {
    design: Design;
    shake: boolean;
    busy: boolean;
    change: (k: typeof keys[number], l: number) => void;
    newName: () => void;
    setModal: (s: string) => void;
}) { return <>
        <div className="heading">
        <small>STEP 01 / 設計</small>
        <h1>新薬の性能を設計する</h1>
        <p>4つの性能と副作用のバランスを考えます。</p></div>
        <div className="coins card">
        <strong>研究開発費：使用 {cost(design) * 10} / 90 pt</strong>
        <p className="tiny">1段階10 pt。ゲーム上の単位で、実際の費用ではありません。</p>
        <div aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => <span key={i} className={i < cost(design) ? 'spent' : ''}/>)}</div></div>
        <div className="design-grid">
        {keys.map(k => <PerformanceSetting key={k} attribute={k} design={design} change={change}/>)}</div>
        <Glossary/><button className="primary wide" disabled={busy} onClick={() => { newName(); setModal('name'); }}>新薬を完成させる</button></>; }
