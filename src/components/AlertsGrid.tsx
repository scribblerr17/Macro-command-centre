import React from 'react';
import {
  BadgeVariant,
  ContagionMonitorState,
  RebalanceDirectiveState,
} from '../types/macro';
import { Badge } from './Badge';

interface AlertsGridProps {
  contagion: ContagionMonitorState;
  directive: RebalanceDirectiveState;
}

function getStatusBoxClasses(status: 'green' | 'amber' | 'red'): string {
  if (status === 'red') {
    return 'border border-[#334155] border-l-4 border-l-[#ef4444] bg-[#ef4444]/[0.06]';
  }
  if (status === 'amber') {
    return 'border border-[#334155] border-l-4 border-l-[#f59e0b] bg-[#111827]';
  }
  return 'border border-[#334155] border-l-4 border-l-[#10b981] bg-[#111827]';
}

export const AlertsGrid: React.FC<AlertsGridProps> = ({ contagion, directive }) => {
  return (
    <section className="mb-4 grid grid-cols-1 gap-4 min-[901px]:grid-cols-2">
      {/* EXPANDED DEFI CONTAGION MONITOR WITH ACTIONABLE NUMBERED STEPS */}
      <div className={`flex flex-col justify-between rounded-[10px] p-4 ${getStatusBoxClasses(contagion.status)}`}>
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-[0.98rem] font-bold text-[#f8fafc]">DeFi Contagion Monitor</h2>
              <span className="rounded bg-[#1e293b] px-2 py-0.5 text-[0.7rem] font-bold text-[#38bdf8]">
                Auto-Detected
              </span>
            </div>
            <Badge variant={contagion.badgeVariant}>{contagion.badgeText}</Badge>
          </div>

          <div className="mb-1 text-[0.85rem] font-bold text-[#38bdf8]">
            {contagion.strategyTitle}
          </div>

          <div className="mb-2.5 text-[0.74rem] font-mono font-semibold text-[#94a3b8]">
            {contagion.exposureSummary}
          </div>

          <p className="mb-3 text-[0.82rem] leading-relaxed text-[#f8fafc]/90">
            {contagion.body}
          </p>
        </div>

        {contagion.actionSteps && contagion.actionSteps.length > 0 && (
          <div className="mt-2 border-t border-[#334155] pt-3">
            <div className="mb-2 text-[0.76rem] font-bold uppercase tracking-wider text-[#94a3b8]">
              Portfolio Action Plan (As Repo Shifts):
            </div>
            <div className="space-y-2">
              {contagion.actionSteps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="flex items-start gap-2.5 rounded-[6px] border border-[#334155]/60 bg-[#1e293b]/70 p-2 text-[0.8rem]"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[0.72rem] font-bold ${
                      contagion.status === 'red'
                        ? 'bg-[#ef4444]/25 text-[#fca5a5] border border-[#ef4444]/50'
                        : contagion.status === 'amber'
                        ? 'bg-[#f59e0b]/25 text-[#fcd34d] border border-[#f59e0b]/50'
                        : 'bg-[#10b981]/25 text-[#6ee7b7] border border-[#10b981]/50'
                    }`}
                  >
                    {step.stepNumber}
                  </span>
                  <div>
                    <div className="font-semibold text-[#f8fafc]">{step.title}</div>
                    <div className="text-[0.76rem] text-[#94a3b8]">{step.instruction}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TACTICAL REBALANCE DIRECTIVE */}
      <div className={`flex flex-col justify-between rounded-[10px] p-4 ${getStatusBoxClasses(directive.status)}`}>
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[0.98rem] font-bold text-[#f8fafc]">
              Tactical Rebalance Directive
            </h2>
            <Badge variant={BadgeVariant.Blue}>{directive.maxDriftTxt}</Badge>
          </div>
          <div className="mb-1.5 text-[0.85rem] font-bold text-[#f8fafc]">{directive.title}</div>
          <p className="text-[0.82rem] leading-relaxed text-[#94a3b8]">{directive.body}</p>
        </div>

        <div className="mt-3 rounded-[6px] border border-[#334155]/60 bg-[#1e293b]/50 p-2.5 text-[0.76rem] text-[#94a3b8]">
          <div className="font-semibold text-[#f8fafc] mb-1">Execution Rule:</div>
          <div>
            Adjust dry powder buffers in 1–3M T-Bills before touching core Bitcoin cold storage. Margin debt should reach $0 before rotating into risk assets.
          </div>
        </div>
      </div>
    </section>
  );
};
