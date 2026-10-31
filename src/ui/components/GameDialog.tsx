import { useEffect, useRef } from 'react';
import { adult, science } from '../../config/game';
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
                        <h2>薬の名前をつけよう！</h2>
                        <label>きみの薬の名前<input autoFocus value={name} onChange={event => setName(trimName(event.target.value))} /></label>
                        <small>10文字まで。じぶんの名前は入れないでね。</small>
                        <button onClick={newName}>ほかの名前 ↻</button>
                        <button className="primary" onClick={finish}>この薬でためす！</button>
                    </>
                ) : modal === 'how' ? (
                    <>
                        <h2>あそびかた</h2>
                        <p>① 9まいのコインで、4つの性能をえらぼう。</p>
                        <p>② 薬の名前をつけて、3日間ためしてみよう。</p>
                        <p>③ 100人のけっかを見て、工夫を見つけよう！</p>
                        <p>性能を下げるとコインがもどるよ。何度でもつくってみてね。</p>
                    </>
                ) : modal === 'mechanism' ? (
                    <>
                        <h2>🔑 新しいしくみ</h2>
                        <p>つよいばい菌は、薬をこわしたり外に出したりして、薬からみをまもっているよ。新しいしくみの薬は、そのまもりをくぐりぬけられるんだ。</p>
                    </>
                ) : (
                    <>
                        <h2>ばい菌と薬のおはなし</h2>
                        {science.map(([title, text]) => (
                            <article className="science-card" key={title}><h3>{title}</h3><p>{text}</p></article>
                        ))}
                        <h3>おうちの方へ</h3>
                        <p className="tiny">{adult}</p>
                    </>
                )}
                <button className="wide" onClick={() => setModal('')}>とじる</button>
            </div>
        </dialog>
    );
}
