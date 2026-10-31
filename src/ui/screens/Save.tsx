import type { Result } from '../../model';
import type { Screen } from '../../game/types';
import { QR } from '../components/QR';

type Props = {
    r: Result;
    name: string;
    busy: boolean;
    image: string;
    save: () => void;
    setScreen: (screen: Screen) => void;
    setNotice: (notice: string) => void;
    url: string;
};

export function Save({ r, name, busy, image, save, setScreen, setNotice, url }: Props) {
    async function shareImage() {
        try {
            const blob = await (await fetch(image)).blob();
            const file = new File([blob], 'okusuri-lab.png', { type: 'image/png' });
            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: 'おくすり発明ラボ' });
            } else {
                setNotice('画像を長押しか、ダウンロードで保存してね。');
            }
        } catch (error) {
            if ((error as Error).name !== 'AbortError') setNotice('画像をダウンロードして保存してね。');
        }
    }

    async function copyURL() {
        try {
            await navigator.clipboard.writeText(url);
            setNotice('URLをコピーしたよ！');
        } catch {
            setNotice('URLをえらんでコピーしてね。');
        }
    }

    return (
        <>
            <div className="heading">
                <small>STEP 03 / はっけんを のこそう</small>
                <h1>きみの発明カード</h1>
                <p>長押しで保存してね</p>
            </div>
            {busy ? (
                <p role="status">カードをつくっているよ…</p>
            ) : image ? (
                <img className="result-image" src={image} alt={`${name}の結果カード。100人中${r.recovered}人が元気になった`} />
            ) : <button onClick={save}>もう一度ためす</button>}
            <div className="actions">
                {image && <a className="primary button" href={image} download="okusuri-lab.png">画像をダウンロード</a>}
                {image && <button onClick={shareImage}>画像を共有する</button>}
                <button onClick={() => setScreen('result')}>けっかにもどる</button>
            </div>
            <section className="card share">
                <h2>このけっかをひらく</h2>
                <QR url={url} />
                <label>共有URL<input readOnly value={url} onFocus={event => event.target.select()} /></label>
                <button onClick={copyURL}>URLをコピー</button>
            </section>
        </>
    );
}
