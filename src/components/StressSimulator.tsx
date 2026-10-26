import React from 'react';
import { DeFiStrategy } from '../types/macro';

interface StressSimulatorProps {
  monthOffset: number;
  monthName: string;
  sofrSpreadBps: number;
  spSign: string;
  srfUsageBillions: number;
  slrRelief: boolean;
  defiStrategy: DeFiStrategy;
  onChangeSimulation: (patch: {
    monthOffset?: number;
    sofrSpreadBps?: number;
    srfUsageBillions?: number;
    slrRelief?: boolean;
    defiStrategy?: DeFiStrategy;
  }) => void;
}

const STRATEGY_OPTIONS: { id: DeFiStrategy; label: string }[] = [
  { id: DeFiStrategy.PerpFunding, label: 'Perp DEX / Funding Rate' },
  { id: DeFiStrategy.StableLp, label: 'Stablecoin Lending / LP (Morpho & Pendle)' },
  { id: DeFiStrategy.NativeStaking, label: 'Native 1x Spot Staking' },
  { id: DeFiStrategy.LoopedBorrow, label: 'Looped / Borrowed Margin' },
];

export const StressSimulator: React.FC<StressSimulatorProps> = ({
  monthOffset,
  monthName,
  sofrSpreadBps,
  spSign,
  srfUsageBillions,
  slrRelief,
  defiStrategy,
  onChangeSimulation,
}) => {
  return (
    <section className="mb-4 rounded-[10px] border border-[#334155] bg-[#111827] p-4">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[0.98rem] font-bold text-[#f8fafc]">
            Plumbing &amp; Timeline Stress Simulator
          </h2>
          <p className="text-[0.78rem] text-[#94a3b8]">
            Scrub 36-month horizon or spike repo rates (+15 bps / $25B SRF triggers Phase 2 Shock)
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-[6px] border border-[#334155] bg-[#1e293b] px-3 py-[7px] text-[0.8rem] font-semibold text-[#f8fafc]">
          <input
            type="checkbox"
            checked={slrRelief}
            onChange={(e) => onChangeSimulation({ slrRelief: e.target.checked })}
            className="h-4 w-4 accent-[#10b981]"
          />
          <span>SLR Relief / QE Pivot Active</span>
        </label>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 min-[821px]:grid-cols-3">
        <div className="rounded-[8px] border border-[#334155] bg-[#1e293b]/55 p-3">
          <div className="mb-2 flex justify-between text-[0.8rem] font-semibold">
            <span>Timeline Horizon (Oct 2026 – Oct 2029)</span>
            <span className="font-mono font-bold text-[#38bdf8]">
              Month {monthOffset} ({monthName})
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={36}
            step={1}
            value={monthOffset}
            onChange={(e) =>
              onChangeSimulation({ monthOffset: parseInt(e.target.value, 10) || 0 })
            }
            className="w-full"
          />
        </div>

        <div className="rounded-[8px] border border-[#334155] bg-[#1e293b]/55 p-3">
          <div className="mb-2 flex justify-between text-[0.8rem] font-semibold">
            <span>SOFR - EFFR Spread (bps)</span>
            <span className="font-mono font-bold text-[#38bdf8]">
              {spSign}
              {sofrSpreadBps} bps
            </span>
          </div>
          <input
            type="range"
            min={-5}
            max={40}
            step={1}
            value={sofrSpreadBps}
            onChange={(e) =>
              onChangeSimulation({ sofrSpreadBps: parseInt(e.target.value, 10) || 0 })
            }
            className="w-full"
          />
        </div>

        <div className="rounded-[8px] border border-[#334155] bg-[#1e293b]/55 p-3">
          <div className="mb-2 flex justify-between text-[0.8rem] font-semibold">
            <span>Standing Repo Facility ($B)</span>
            <span className="font-mono font-bold text-[#38bdf8]">
              ${srfUsageBillions.toFixed(1)}B
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={80}
            step={0.5}
            value={srfUsageBillions}
            onChange={(e) =>
              onChangeSimulation({ srfUsageBillions: parseFloat(e.target.value) || 0 })
            }
            className="w-full"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#334155] pt-3">
        <div className="text-[0.8rem] font-semibold text-[#94a3b8]">
          Self-Custody DeFi Strategy Mechanism (Applies to DeFi Bucket):
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STRATEGY_OPTIONS.map((opt) => {
            const isActive = defiStrategy === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeSimulation({ defiStrategy: opt.id })}
                className={`cursor-pointer rounded-[6px] border px-[11px] py-[7px] text-[0.78rem] font-semibold transition-colors ${
                  isActive
                    ? 'border-[#38bdf8] bg-[#38bdf8]/18 text-[#38bdf8]'
                    : 'border-[#334155] bg-[#1e293b] text-[#94a3b8] hover:border-[#38bdf8]/60 hover:text-[#f8fafc]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
