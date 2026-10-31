import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { canAfford, cost, keys, runDesign, type Design, type Result } from './model';
import { adult, badge, comments, descriptions, labels, rank, ranks, science } from './config/game';
import { decode, encode, trimName } from './share';
import { makeQR, resultImage } from './share/card';
import { Body, Chart, Flask, Germ } from './ui/Visuals';
import './style.css';
const initial: Design = { pot: 1, mech: 1, dur: 1, gentle: 1 };
const shared = decode(location.hash);
const number = (n: number) => `約${n >= 1e8 ? (n / 1e8).toLocaleString('ja', { maximumFractionDigits: 2 }) + '億' : n >= 1e4 ? (n / 1e4).toLocaleString('ja', { maximumFractionDigits: 2 }) + '万' : Math.round(n).toLocaleString('ja')}個`;
function App() {
    const [screen, setScreen] = useState(shared ? 'result' : 'title'), [design, setDesign] = useState<Design>(shared?.design || initial), [name, setName] = useState(shared?.name || 'ピカピカ・キラリン'), [result, setResult] = useState<Result | null>(() => shared ? runDesign(shared.design) : null), [modal, setModal] = useState(''), [notice, setNotice] = useState(''), [hour, setHour] = useState(0), [image, setImage] = useState(''), [busy, setBusy] = useState(false), [shake, setShake] = useState(false);
    const dialog = useRef<HTMLDialogElement>(null);
    const url = location.origin + location.pathname + encode(design, name);
    useEffect(() => { if (modal)
        dialog.current?.showModal();
    else
        dialog.current?.close(); }, [modal]);
    useEffect(() => { window.scrollTo(0, 0); }, [screen]);
    useEffect(() => { const onHash = () => { const s = decode(location.hash); if (s) {
        setDesign(s.design);
        setName(s.name);
        setResult(runDesign(s.design));
        setScreen('result');
    } }; window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash); }, []);
    useEffect(() => { if (screen !== 'sim')
        return; const start = performance.now(); const timer = window.setInterval(() => { const h = Math.min(72, (performance.now() - start) / 14000 * 72); setHour(h); if (h >= 72)
        setScreen('result'); }, 80); return () => clearInterval(timer); }, [screen]);
    async function save() { setScreen('save'); setBusy(true); setImage(''); try {
        setImage(await resultImage(design, result!, name, url));
    }
    catch {
        setNotice('画像をつくれなかったよ。もう一度ためしてね。');
    }
    finally {
        setBusy(false);
    } }
    function change(k: typeof keys[number], v: number) { if (v < 1 || v > 5)
        return; const next = { ...design, [k]: v }; if (!canAfford(next)) {
        setNotice('コインがたりないよ！ ほかの性能を下げるとつかえるよ');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
    } setDesign(next); setNotice(''); }
    function newName() { const a = design.mech >= 3 ? 'まもりやぶり' : design.gentle >= 4 ? 'やさしい' : 'ピカピカ'; setName(trimName(a + ['キラリン', 'スッキリン', 'ゲンキン'][Math.floor(Math.random() * 3)])); }
    function finish() { setModal(''); setBusy(true); setTimeout(() => { setResult(runDesign(design)); setHour(0); setScreen('sim'); setBusy(false); }, 30); }
    const r = result, rep = r?.representative;
    return <><header><button className="brand" onClick={() => setScreen('title')}>⚗ おくすり発明ラボ</button><span>ちいさな工夫で、大きな発明。</span></header><main>
    {screen === 'title' && <section className="hero"><div className="eyebrow">ようこそ、きみの けんきゅう室へ</div><div className="hero-art"><span className="hero-germ"><Germ /></span><Flask /><i className="capsule hero-capsule"/><span className="hero-res"><Germ res/></span><span className="spark">✧</span></div><h1>おくすり<span>発明ラボ</span></h1><h2>きみだけの薬で100人を助けよう！</h2><p>きみは今日からおくすり研究者！<br />薬のつよさやしくみを工夫して、<br />たくさんの人を元気にしよう！</p><button className="primary start" onClick={() => setScreen('develop')}>はじめる <span>→</span></button><div className="links"><button onClick={() => setModal('how')}>あそびかた</button><button onClick={() => setModal('science')}>ばい菌と薬のおはなし</button></div><small>あそびながら、薬のひみつを見つけよう。</small></section>}
    {screen === 'develop' && <><div className="heading"><small>STEP 01 / けんきゅう</small><h1>どんな薬をつくる？</h1><p>9まいのコインで、工夫してみよう！</p></div><div className={'coins card ' + (shake ? 'shake' : '')}><strong>けんきゅうコイン 🪙 のこり {9 - cost(design)} / 9</strong><div aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span className={i < 9 - cost(design) ? '' : 'spent'} key={i}>●</span>)}</div></div><div className="design-grid">{keys.map((k, i) => <section className={'card setting setting-' + k} key={k}><h2><span>{['💪', '🔑', '⏰', '💚'][i]}</span> {labels[k]}{k === 'mech' && <button className="info" aria-label="新しいしくみのおはなし" onClick={() => setModal('mechanism')}>ⓘ</button>}</h2><p>{descriptions[k]}</p><div className="levels"><button aria-label={`${labels[k]}を下げる`} disabled={design[k] === 1} onClick={() => change(k, design[k] - 1)}>−</button>{[1, 2, 3, 4, 5].map(v => { const locked = !canAfford({ ...design, [k]: v }); return <button key={v} aria-label={`${labels[k]} レベル${v}${locked ? ' コインがたりない' : ''}`} aria-pressed={design[k] === v} className={`${v <= design[k] ? 'selected' : ''} ${locked ? 'locked' : ''}`} onClick={() => change(k, v)}>{locked ? <><span>{v}</span><small>🔒</small></> : v}</button>; })}<button aria-label={`${labels[k]}を上げる`} disabled={design[k] === 5} onClick={() => change(k, design[k] + 1)}>＋</button></div></section>)}</div><button className="primary wide" disabled={busy} onClick={() => { newName(); setModal('name'); }}>薬を完成させる！ ✨</button></>}
    {screen === 'sim' && r && <><div className="heading"><small>STEP 02 / ためしてみよう</small><h1>{Math.min(3, Math.floor(hour / 24) + 1)}日目のようす</h1><p>{hour < 24 ? '薬がばい菌のところへとどくよ。' : hour < 48 ? '新しいしくみで、まもりをくぐれるかな？' : 'かくれがのばい菌も、少しずつ目をさますよ。'}</p></div><section className="card"><Body point={r.representative.trace[Math.min(72, Math.floor(hour))]} design={design}/><p className="tiny">画面のばい菌1ぴきは、本当はたくさんのばい菌をあらわしているよ</p><div className="legend"><span>🟢 ふつうのばい菌</span><span>🟣 薬がききにくいばい菌</span></div><p className="tiny">つよいわけじゃなくて、薬がききにくいだけ</p><Chart trace={r.representative.trace} hour={hour}/><progress max="72" value={hour}/></section><button className="primary wide" onClick={() => setScreen('result')}>けっかを見る →</button></>}
    {screen === 'result' && r && rep && <><div className="heading"><small>けんきゅう けっか</small><h1>100人中、<em>{r.recovered}</em>人が<br />元気になった！</h1><p>「{name}」の発明、おめでとう！</p></div><section className="card result-main"><div className="people" aria-label={`元気 ${r.recovered}人、薬が体に合わなかった ${r.seDrop}人、まだなおらない ${100 - r.recovered - r.seDrop}人`}>{r.outcomes.map((o, i) => <span key={i} className={'person ' + o} aria-hidden="true">{o === 'side' ? '⊕' : o === 'well' ? '☺' : '•'}</span>)}</div><div className="legend"><span>🟢 元気</span><span>⚪ まだなおらない</span><span>🔵 薬が体に合わなかった</span></div><div className="rank"><div>{'★'.repeat(rank(r.recovered).stars)}</div><h2>{rank(r.recovered).name}</h2>{badge(design, r) && <p>🏅 せつやく名人</p>}</div><details><summary>ランクのきまり</summary>{ranks.map((r, i) => <p key={r.min}>{r.min}〜{i === 0 ? 100 : ranks[i - 1].min - 1}人：{'★'.repeat(r.stars)} {r.name}</p>)}</details></section><section className="card feedback"><h2>🔎 はっけんしたこと</h2>{comments(design, r).map((c, i) => <p key={i}>{c}</p>)}</section><div className="stats">{[false, true].map(res => { const start = res ? rep.resStart : rep.normStart, end = res ? rep.resEnd : rep.normEnd; return <section className="card" key={String(res)}><h2><Germ res={res}/>{res ? 'つよいばい菌' : 'ふつうのばい菌'}</h2><p>{number(start)} → <strong>{number(end)}</strong></p><h3>{end < start ? `約${Math.round(start / end).toLocaleString()}分の1にへった！` : `約${(end / start).toLocaleString('ja', { maximumFractionDigits: 1 })}倍にふえちゃった…`}</h3><small>減少割合 {((1 - end / start) * 100).toFixed(2)}%</small></section>; })}</div><p className="remain">でも、薬がとどきにくいところに、まだ少しのこっているみたい。</p><section className="card"><h2>⚗ {name}</h2><p>使ったコイン {cost(design)} / 9</p>{keys.map(k => <div className="spec" key={k}><span>{labels[k]}</span><b>{'●'.repeat(design[k])}{'○'.repeat(5 - design[k])}</b></div>)}<Chart trace={rep.trace}/></section><div className="actions"><button className="primary" onClick={save}>けっかを保存する</button><button onClick={() => { history.replaceState(null, '', location.pathname + location.search); setScreen('develop'); }}>もう一度つくる</button><button onClick={() => { setDesign(initial); setScreen('develop'); history.replaceState(null, '', location.pathname + location.search); }}>さいしょから</button><button onClick={() => setModal('science')}>もっと知りたい</button></div></>}
    {screen === 'save' && r && <><div className="heading"><small>STEP 03 / はっけんを のこそう</small><h1>きみの発明カード</h1><p>長押しで保存してね</p></div>{busy ? <p role="status">カードをつくっているよ…</p> : image ? <img className="result-image" src={image} alt={`${name}の結果カード。100人中${r.recovered}人が元気になった`}/> : <button onClick={save}>もう一度ためす</button>}<div className="actions">{image && <a className="primary button" href={image} download="okusuri-lab.png">画像をダウンロード</a>}{image && <button onClick={async () => { try {
        const blob = await (await fetch(image)).blob(), file = new File([blob], 'okusuri-lab.png', { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] }))
            await navigator.share({ files: [file], title: 'おくすり発明ラボ' });
        else
            setNotice('画像を長押しか、ダウンロードで保存してね。');
    }
    catch (e) {
        if ((e as Error).name !== 'AbortError')
            setNotice('画像をダウンロードして保存してね。');
    } }}>画像を共有する</button>}<button onClick={() => setScreen('result')}>けっかにもどる</button></div><section className="card share"><h2>このけっかをひらく</h2><QR url={url}/><label>共有URL<input readOnly value={url} onFocus={e => e.target.select()}/></label><button onClick={async () => { try {
        await navigator.clipboard.writeText(url);
        setNotice('URLをコピーしたよ！');
    }
    catch {
        setNotice('URLをえらんでコピーしてね。');
    } }}>URLをコピー</button></section></>}
    {notice && <div role="status" className="notice" onClick={() => setNotice('')}>{notice} <button aria-label="とじる" onClick={() => setNotice('')}>×</button></div>}{busy && screen !== 'save' && <p role="status">けいさんしているよ…</p>}
    </main><footer>おくすり発明ラボ <span>｜</span> 科学を学ぶためのゲーム<br /><small>個人情報は集めません。教育用の簡単なモデルです。</small></footer><dialog ref={dialog} onCancel={() => setModal('')} onClick={e => { if (e.target === e.currentTarget)
        setModal(''); }}><div className="dialog-content"><button className="close" aria-label="とじる" onClick={() => setModal('')}>×</button>{modal === 'name' ? <><h2>薬の名前をつけよう！</h2><label>きみの薬の名前<input autoFocus value={name} onChange={e => setName(trimName(e.target.value))}/></label><small>10文字まで。じぶんの名前は入れないでね。</small><button onClick={newName}>ほかの名前 ↻</button><button className="primary" onClick={() => { if (!name.trim())
        setName('キラリン'); finish(); }}>この薬でためす！</button></> : modal === 'how' ? <><h2>あそびかた</h2><p>① 9まいのコインで、4つの性能をえらぼう。</p><p>② 薬の名前をつけて、3日間ためしてみよう。</p><p>③ 100人のけっかを見て、工夫を見つけよう！</p><p>性能を下げるとコインがもどるよ。何度でもつくってみてね。</p></> : modal === 'mechanism' ? <><h2>🔑 新しいしくみ</h2><p>つよいばい菌は、薬をこわしたり外に出したりして、薬からみをまもっているよ。新しいしくみの薬は、そのまもりをくぐりぬけられるんだ。</p></> : <><h2>ばい菌と薬のおはなし</h2>{science.map(([title, text]) => <article className="science-card" key={title}><h3>{title}</h3><p>{text}</p></article>)}<h3>おうちの方へ</h3><p className="tiny">{adult}</p></>}<button className="wide" onClick={() => setModal('')}>とじる</button></div></dialog></>;
}
function QR({ url }: {
    url: string;
}) { const qr = makeQR(url), n = qr.getModuleCount(); return <svg className="qr" viewBox={`-4 -4 ${n + 8} ${n + 8}`} role="img" aria-label="この結果をひらくQRコード"><rect x="-4" y="-4" width={n + 8} height={n + 8} fill="white"/>{Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c) ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1"/> : null))}</svg>; }
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
