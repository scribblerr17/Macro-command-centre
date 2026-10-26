import React from 'react';

interface StressSimulatorProps {
  monthOffset: number;
  monthName: string;
  sofrSpreadBps: number;
  spSign: string;
  srfUsageBillions: number;
  slrRelief: boolean;
  onChangeSimulation: (patch: {
    monthOffset?: number;
    sofrSpreadBps?: number;
    srfUsageBillions?: number;
    slrRelief?: boolean;
  }) => void;
}

export const StressSimulator: React.FC<StressSimulatorProps> = ({
  monthOffset,
  monthName,
  sofrSpreadBps,
  spSign,
  srfUsageBillions,
  slrRelief,
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

      <div className="grid grid-cols-1 gap-4 min-[821px]:grid-cols-3">
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
    </section>
  );
};
