import { useEffect, useRef } from 'react';
import { adult, science } from '../../config/game';
import { Glossary } from './Info';
import { trimName } from '../../share';

type Props = {
    modal: string;
    setModal: (modal: string) => void;
    name: string;
    setName: (name: string) => void;
    newName: () => void;
    finish: () => void;
};

export function GameDialog({ modal, setModal, name, setName, newName, finish }: Props) {
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        if (modal) dialog.current?.showModal();
        else dialog.current?.close();
    }, [modal]);

    return (
        <dialog ref={dialog} onCancel={() => setModal('')} onClick={event => {
            if (event.target === event.currentTarget) setModal('');
        }}>
            <div className="dialog-content">
                <button className="close" aria-label="とじる" onClick={() => setModal('')}>×</button>
                {modal === 'name' ? (
                    <>
                        <h2>新薬に名前を付ける</h2>
                        <label>新薬の名前<input autoFocus value={name} onChange={event => setName(trimName(event.target.value))} /></label>
                        <small>16文字まで。個人名は入力しないでください。</small>
                        <button onClick={newName}>別の名前</button>
                        <button className="primary" onClick={finish}>シミュレーションを開始</button>
                    </>
                ) : modal === 'how' ? (
                    <>
                        <h2>遊び方</h2>
                        <p>① 90 pt以内で4つの性能を設計します。</p>
                        <p>② 新薬の名前を付けて、72時間のシミュレーションを実行します。</p>
                        <p>③ 100人の結果と性能分析を確認し、次の設計を考えます。</p>
                        <p>性能を下げると研究開発費に余裕ができます。何度でも再設計できます。</p>
                    </>
                ) : modal === 'mechanism' ? (
                    <>
                        <h2>新しい作用機序</h2>
                        <p>耐性菌は薬の分解や排出、標的の変化などにより作用を受けにくくなります。新しい作用機序で耐性機構を回避します。</p>
                    </>
                ) : (
                    <>
                        <h2>このゲームの科学的背景</h2>
                        {science.map(([title, text]) => (
                            <article className="science-card" key={title}><h3>{title}</h3><p>{text}</p></article>
                        ))}
                        <h3>モデルについて</h3>
                        <p className="tiny">{adult}</p><Glossary/>
                    </>
                )}
                <button className="wide" onClick={() => setModal('')}>とじる</button>
            </div>
        </dialog>
    );
}
