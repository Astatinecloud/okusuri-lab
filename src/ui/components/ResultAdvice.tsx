import type { Advice } from '../../game/advice';
export function ResultAdvice({advice,error=false}: {advice:Pick<Advice,'diagnosis'|'recommendation'>|null;error?:boolean}) {
    return <>
        <section className="card advice-section" aria-labelledby="diagnosis-title">
            <h2 id="diagnosis-title">今回のお薬はどうだった？</h2>
            {advice?advice.diagnosis.map((text,i)=><p key={i}>{text}</p>):<p role="status">{error?'お薬の振り返りを読み込めませんでした。結果画面を開き直してください。':'考え中…'}</p>}
        </section>
        <section className="card advice-section" aria-labelledby="recommendation-title">
            <h2 id="recommendation-title">次に改良するなら？</h2>
            {advice?<>
                {advice.recommendation.parameter&&<h3 className="recommendation-name">{advice.recommendation.parameter}</h3>}
                {advice.recommendation.sentences.map((text,i)=><p key={i}>{text}</p>)}
            </>:<p role="status">{error?'改良の提案を読み込めませんでした。結果画面を開き直してください。':'考え中…'}</p>}
        </section>
    </>;
}
