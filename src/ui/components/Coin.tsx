import { cost, type Design } from '../../model';

export function Coin() {
    return (
        <svg className="coin-icon" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="14" fill="#f4d77f" stroke="#b68a35" strokeWidth="2" />
            <circle cx="16" cy="16" r="10" fill="none" stroke="#c89c43" />
            <path d="M16 9v14m-4-11h6a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6" fill="none" stroke="#8a6421" strokeWidth="2" />
        </svg>
    );
}

export function ResearchCoinBudget({ design }: { design: Design }) {
    const used = cost(design);
    return (
        <>
            <strong>研究コイン 残り {9 - used} / 9</strong>
            <p className="tiny">1段階1枚。研究コインはゲーム上の単位で、実際の費用ではありません。</p>
            <div aria-hidden="true">
                {Array.from({ length: 9 }, (_, index) => (
                    <span key={index} className={index < used ? 'spent' : ''}><Coin /></span>
                ))}
            </div>
        </>
    );
}
