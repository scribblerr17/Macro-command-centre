import React from 'react';
import { BarAllocationItem } from '../types/macro';

interface AllocationChartProps {
  netEquity: number;
  grossAssets: number;
  borrowTotal: number;
  directPct: number;
  barItems: BarAllocationItem[];
}

export const AllocationChart: React.FC<AllocationChartProps> = ({
  netEquity,
  grossAssets,
  borrowTotal,
  directPct,
  barItems,
}) => {
  return (
    <section className="mb-4 rounded-[10px] border border-[#334155] bg-[#111827] p-4">
      <svg width="0" height="0" className="absolute overflow-hidden" aria-hidden="true">
        <defs>
          <linearGradient id="grad-actual" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          <linearGradient id="grad-debt" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[0.98rem] font-bold text-[#f8fafc]">
            Portfolio Allocation vs. Phase Target Weights (%)
          </h2>
          <p className="text-[0.78rem] text-[#94a3b8]">
            Net Portfolio Equity: ${netEquity.toLocaleString()} (Gross: $
            {grossAssets.toLocaleString()} | Margin Debt: -${borrowTotal.toLocaleString()}) |{' '}
            {directPct}% Self-Custody Hygiene
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-[0.78rem] text-[#94a3b8]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-[3px] bg-[#38bdf8]" />
            <span>Actual Bucket Weight (%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-[3px] border border-dashed border-[#cbd5e1] bg-[#64748b]" />
            <span>Phase Target Weight (%)</span>
          </div>
        </div>
      </div>

      <div>
        {barItems.map((item) => {
          const actualClamped = Math.min(100, Math.max(0, item.actualPct));
          const targetClamped = Math.min(100, Math.max(0, item.targetPct));
          const gradId = item.isDebt ? 'grad-debt' : 'grad-actual';

          return (
            <div key={item.bucket} className="mb-[13px] last:mb-0">
              <div className="mb-[5px] flex flex-wrap justify-between gap-1 text-[0.81rem] font-semibold">
                <span className={item.isDebt && item.value > 0 ? 'text-[#ef4444]' : 'text-[#f8fafc]'}>
                  {item.bucket} ({item.isDebt && item.value > 0 ? '-$' : '$'}
                  {item.value.toLocaleString()})
                </span>
                <span className="font-mono text-[#f8fafc]">
                  Actual: {item.actualPct.toFixed(1)}% | Target: {item.targetPct}.0% (Drift:{' '}
                  {item.driftTxt})
                </span>
              </div>

              <div className="mb-1 h-[11px] overflow-hidden rounded-[4px] bg-[#0f172a]">
                <svg className="block h-full w-full" preserveAspectRatio="none">
                  <rect
                    x="0"
                    y="0"
                    width={`${actualClamped}%`}
                    height="100%"
                    rx="4"
                    fill={`url(#${gradId})`}
                  />
                </svg>
              </div>

              <div className="h-[7px] overflow-hidden rounded-[4px] bg-[#0f172a]">
                <svg className="block h-full w-full" preserveAspectRatio="none">
                  <rect
                    x="0"
                    y="0"
                    width={`${targetClamped}%`}
                    height="100%"
                    rx="4"
                    fill="#475569"
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
