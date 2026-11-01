import { useEffect, useRef } from 'react';
import { titleScience, titleScienceNote } from '../../config/game';
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
        if (modal)
            dialog.current?.showModal();
        else
            dialog.current?.close();
    }, [modal]);
    return (<dialog className={modal === 'science' ? 'title-science-dialog' : undefined} ref={dialog} onCancel={() => setModal('')} onClick={event => {
            if (event.target === event.currentTarget)
                setModal('');
        }}>
            <div className="dialog-content">
                <button className="close" aria-label="とじる" onClick={() => setModal('')}>×</button>
                {modal === 'name' ? (<>
                        <h2>新薬に名前を付ける</h2>
                        <label>新薬の名前<input autoFocus value={name} onChange={event => setName(trimName(event.target.value))}/></label>
                        <small>16文字まで。個人名は入力しないでください。</small>
                        <button onClick={newName}>別の名前</button>
                        <button className="primary" onClick={finish}>シミュレーションを開始</button>
                    </>) : modal === 'how' ? (<>
                        <h2>遊び方</h2>
                        <p>① 9枚の研究コインで4つの性能を設計します。</p>
                        <p>② 新薬の名前を付けて、1年間（12か月）のシミュレーションを実行します。</p>
                        <p>③ 100人の回復と地域の耐性菌の広がりを確認し、次の設計を考えます。</p>
                        <p>性能を下げると研究コインに余裕ができます。何度でも再設計できます。</p>
                    </>) : modal === 'science' ? (<>
                        <h2>このゲームの科学的背景</h2>
                        {titleScience.map(([title, text]) => (<article className="science-card" key={title}><h3>{title}</h3><p>{text}</p></article>))}
                        <p className="tiny">{titleScienceNote}</p>
                    </>) : null}
                <button className="wide" onClick={() => setModal('')}>とじる</button>
            </div>
        </dialog>);
}
