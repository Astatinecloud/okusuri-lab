import { useLayoutEffect, useRef } from 'react';
import { cost, keys, type Design } from '../../model';
import { Glossary } from '../components/Info';
import { PerformanceSetting } from '../components/PerformanceSetting';

type Props = {
    design: Design;
    shake: boolean;
    busy: boolean;
    change: (key: typeof keys[number], level: number) => void;
    newName: () => void;
    setModal: (modal: string) => void;
};

export function Lab({ design, busy, change, newName, setModal }: Props) {
    const layout = useRef<HTMLDivElement>(null);
    const budget = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const element = budget.current;
        if (!element) return;
        function updateOffset() {
            const height = element!.getBoundingClientRect().height;
            layout.current?.style.setProperty('--budget-height', height + 'px');
        }
        updateOffset();
        const observer = new ResizeObserver(updateOffset);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    function completeDesign() {
        newName();
        setModal('name');
    }

    return (
        <div className="lab-layout" ref={layout}>
            <div className="heading lab-intro">
                <small>STEP 01 / 設計</small>
                <h1>新薬の性能を設計する</h1>
                <p>4つの性能と副作用のバランスを考えます。</p>
            </div>
            <div className="coins card" ref={budget}>
                <strong>研究開発費：使用 {cost(design) * 10} / 90 pt</strong>
                <p className="tiny">1段階10 pt。ゲーム上の単位で、実際の費用ではありません。</p>
                <div aria-hidden="true">
                    {Array.from({ length: 9 }, (_, index) => (
                        <span key={index} className={index < cost(design) ? 'spent' : ''} />
                    ))}
                </div>
            </div>
            <div className="design-grid">
                {keys.map(key => <PerformanceSetting key={key} attribute={key} design={design} change={change} />)}
            </div>
            <Glossary />
            <button className="primary wide" disabled={busy} onClick={completeDesign}>新薬を完成させる</button>
        </div>
    );
}
