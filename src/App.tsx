import { useEffect, useState } from 'react';
import { canAfford, keys, runDesign, type Design, type Result as ModelResult } from './model';
import { initial, type Screen } from './game/types';
import { decode, encode, trimName } from './share';
import { resultImage } from './share/card';
import { GameDialog } from './ui/components/GameDialog';
import { Title } from './ui/screens/Title';
import { Lab } from './ui/screens/Lab';
import { Simulation } from './ui/screens/Simulation';
import { Result } from './ui/screens/Result';
import { Save } from './ui/screens/Save';

const shared = decode(location.hash);

export function App() {
    const [screen, setScreen] = useState<Screen>(shared ? 'result' : 'title');
    const [design, setDesign] = useState<Design>(shared?.design || initial);
    const [name, setName] = useState(shared?.name || 'ピカピカ・キラリン');
    const [result, setResult] = useState<ModelResult | null>(() => shared ? runDesign(shared.design) : null);
    const [modal, setModal] = useState('');
    const [notice, setNotice] = useState('');
    const [hour, setHour] = useState(0);
    const [image, setImage] = useState('');
    const [busy, setBusy] = useState(false);
    const [shake, setShake] = useState(false);
    const url = location.origin + location.pathname + encode(design, name);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [screen]);

    useEffect(() => {
        function onHash() {
            const value = decode(location.hash);
            if (!value) return;
            setDesign(value.design);
            setName(value.name);
            setResult(runDesign(value.design));
            setScreen('result');
        }
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    useEffect(() => {
        if (screen !== 'sim') return;
        const start = performance.now();
        const timer = window.setInterval(() => {
            const nextHour = Math.min(72, (performance.now() - start) / 14000 * 72);
            setHour(nextHour);
            if (nextHour >= 72) setScreen('result');
        }, 80);
        return () => clearInterval(timer);
    }, [screen]);

    async function save() {
        if (!result) return;
        setScreen('save');
        setBusy(true);
        setImage('');
        try {
            setImage(await resultImage(design, result, name, url));
        } catch {
            setNotice('画像をつくれなかったよ。もう一度ためしてね。');
        } finally {
            setBusy(false);
        }
    }

    function change(key: typeof keys[number], level: number) {
        if (level < 1 || level > 5) return;
        const next = { ...design, [key]: level };
        if (!canAfford(next)) {
            setNotice('コインがたりないよ！ ほかの性能を下げるとつかえるよ');
            setShake(true);
            setTimeout(() => setShake(false), 500);
            return;
        }
        setDesign(next);
        setNotice('');
    }

    function newName() {
        const prefix = design.mech >= 3 ? 'まもりやぶり' : design.gentle >= 4 ? 'やさしい' : 'ピカピカ';
        const suffix = ['キラリン', 'スッキリン', 'ゲンキン'][Math.floor(Math.random() * 3)];
        setName(trimName(prefix + suffix));
    }

    function finish() {
        if (!name.trim()) setName('キラリン');
        setModal('');
        setBusy(true);
        setTimeout(() => {
            setResult(runDesign(design));
            setHour(0);
            setScreen('sim');
            setBusy(false);
        }, 30);
    }

    return (
        <>
            <header>
                <button className="brand" onClick={() => setScreen('title')}>⚗ おくすり発明ラボ</button>
                <span>ちいさな工夫で、大きな発明。</span>
            </header>
            <main>
                {screen === 'title' && <Title setScreen={setScreen} setModal={setModal} />}
                {screen === 'develop' && <Lab design={design} shake={shake} busy={busy} change={change} newName={newName} setModal={setModal} />}
                {screen === 'sim' && result && <Simulation r={result} hour={hour} design={design} setScreen={setScreen} />}
                {screen === 'result' && result && <Result r={result} name={name} design={design} save={save} setScreen={setScreen} setDesign={setDesign} setModal={setModal} />}
                {screen === 'save' && result && <Save r={result} name={name} busy={busy} image={image} save={save} setScreen={setScreen} setNotice={setNotice} url={url} />}
                {notice && (
                    <div role="status" className="notice">
                        {notice}
                        <button aria-label="とじる" onClick={() => setNotice('')}>×</button>
                    </div>
                )}
                {busy && screen !== 'save' && <p role="status">けいさんしているよ…</p>}
            </main>
            <footer>
                おくすり発明ラボ <span>｜</span> 科学を学ぶためのゲーム<br />
                <small>個人情報は集めません。教育用の簡単なモデルです。</small>
            </footer>
            <GameDialog modal={modal} setModal={setModal} name={name} setName={setName} newName={newName} finish={finish} />
        </>
    );
}
