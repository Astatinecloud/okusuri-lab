import type { Advice } from '../../game/advice';
export type PartState<T> = {value: T | null; error: boolean};
function Pending({error, retry, children}: {error: boolean; retry?: () => void; children: string}) {
    return error ? <div role="status" aria-live="polite"><p>うまく計算できませんでした。</p><button onClick={retry}>もう一度ためす</button></div>
        : <p className="advice-loading" role="status" aria-live="polite"><span className="loading-spinner" aria-hidden="true"/>{children}</p>;
}
export function ResultAdvice({advice=null, diagnosis, recommendation, retryDiagnosis, retryRecommendation}: {
    advice?: Pick<Advice,'diagnosis'|'recommendation'> | null;
    diagnosis?: PartState<Advice['diagnosis']>;
    recommendation?: PartState<Advice['recommendation']>;
    retryDiagnosis?: () => void;
    retryRecommendation?: () => void;
}) {
    const diagnosisValue = diagnosis?.value ?? advice?.diagnosis;
    const recommendationValue = recommendation?.value ?? advice?.recommendation;
    return <>
        <section className="card advice-section" aria-labelledby="diagnosis-title">
            <h2 id="diagnosis-title">今回のお薬はどうだった？</h2>
            {diagnosisValue?diagnosisValue.map((text,i)=><p key={i}>{text}</p>):<Pending error={diagnosis?.error ?? false} retry={retryDiagnosis}>お薬の結果をまとめています…</Pending>}
        </section>
        <section className="card advice-section" aria-labelledby="recommendation-title">
            <h2 id="recommendation-title">次に改良するなら？</h2>
            {recommendationValue?<>
                {recommendationValue.parameter&&<h3 className="recommendation-name">{recommendationValue.parameter}</h3>}
                {recommendationValue.sentences.map((text,i)=><p key={i}>{text}</p>)}
            </>:<Pending error={recommendation?.error ?? false} retry={retryRecommendation}>次の改良ポイントを考えています…</Pending>}
        </section>
    </>;
}
