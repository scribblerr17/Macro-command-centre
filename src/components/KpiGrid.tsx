import React from 'react';

interface KpiGridProps {
  effrRate: number;
  impliedSofr: string;
  spSign: string;
  sofrSpreadBps: number;
  sofrDailyChangeBps?: number;
  srfUsageBillions: number;
  srfRateCeiling?: number;
  stressScore: number;
  stressColor: 'red' | 'amber' | 'green';
  stressSub: string;
}

export const KpiGrid: React.FC<KpiGridProps> = ({
  effrRate,
  impliedSofr,
  spSign,
  sofrSpreadBps,
  sofrDailyChangeBps = 0,
  srfUsageBillions,
  srfRateCeiling = 4.0,
  stressScore,
  stressColor,
  stressSub,
}) => {
  const stressColorClass =
    stressColor === 'red'
      ? 'text-[#ef4444]'
      : stressColor === 'amber'
      ? 'text-[#f59e0b]'
      : 'text-[#10b981]';

  const srfColorClass = srfUsageBillions >= 25 ? 'text-[#ef4444]' : 'text-[#f8fafc]';
  const jumpSign = sofrDailyChangeBps >= 0 ? '+' : '';
  const jumpColorClass =
    sofrDailyChangeBps >= 5
      ? 'text-[#ef4444] font-bold'
      : sofrDailyChangeBps >= 3
      ? 'text-[#f59e0b] font-semibold'
      : 'text-[#94a3b8]';

  return (
    <section className="mb-4 grid grid-cols-1 gap-3 min-[481px]:grid-cols-2 min-[901px]:grid-cols-4">
      <div className="rounded-[10px] border border-[#334155] bg-[#111827] p-3.5">
        <div className="mb-1.5 text-[0.75rem] font-semibold text-[#94a3b8]">
          SOFR vs EFFR ({effrRate.toFixed(2)}%)
        </div>
        <div className="mb-1 font-mono text-[1.3rem] font-extrabold text-[#38bdf8] tabular-nums">
          {impliedSofr}% ({spSign}
          {sofrSpreadBps} bps)
        </div>
        <div className="flex items-center justify-between gap-2 font-mono text-[0.73rem] text-[#94a3b8] tabular-nums">
          <span>IORB: 3.90%</span>
          <span className={jumpColorClass}>
            1D &Delta;: {jumpSign}
            {sofrDailyChangeBps} bps
          </span>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#334155] bg-[#111827] p-3.5">
        <div className="mb-1.5 text-[0.75rem] font-semibold text-[#94a3b8]">
          NY Fed SRF Usage
        </div>
        <div className={`mb-1 font-mono text-[1.3rem] font-extrabold ${srfColorClass}`}>
          ${srfUsageBillions.toFixed(1)}B
        </div>
        <div className="text-[0.73rem] text-[#94a3b8]">
          {srfRateCeiling.toFixed(2)}% Ceiling (52W Hi $74.6B)
        </div>
      </div>

      <div className="rounded-[10px] border border-[#334155] bg-[#111827] p-3.5">
        <div className="mb-1.5 text-[0.75rem] font-semibold text-[#94a3b8]">
          10Y TIPS / Real Spread
        </div>
        <div className="mb-1 font-mono text-[1.3rem] font-extrabold text-[#f59e0b]">
          +2.65% / -3.10%
        </div>
        <div className="text-[0.73rem] text-[#94a3b8]">4.90% Nom vs 8.0% True Inf</div>
      </div>

      <div className="rounded-[10px] border border-[#334155] bg-[#111827] p-3.5">
        <div className="mb-1.5 text-[0.75rem] font-semibold text-[#94a3b8]">
          Plumbing Stress Score
        </div>
        <div className={`mb-1 font-mono text-[1.3rem] font-extrabold ${stressColorClass}`}>
          {stressScore} / 100
        </div>
        <div className="text-[0.73rem] text-[#94a3b8]">{stressSub}</div>
      </div>
    </section>
  );
};
