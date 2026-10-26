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
    <section className="mb-4 grid grid-cols-1 gap-4 min-[781px]:grid-cols-2">
      <div className={`rounded-[10px] p-4 ${getStatusBoxClasses(contagion.status)}`}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[0.98rem] font-bold text-[#f8fafc]">DeFi Contagion Monitor</h2>
          <Badge variant={contagion.badgeVariant}>{contagion.badgeText}</Badge>
        </div>
        <div className="mb-1.5 text-[0.85rem] font-bold text-[#38bdf8]">
          {contagion.strategyTitle}
        </div>
        <p className="text-[0.82rem] text-[#94a3b8]">{contagion.body}</p>
      </div>

      <div className={`rounded-[10px] p-4 ${getStatusBoxClasses(directive.status)}`}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[0.98rem] font-bold text-[#f8fafc]">
            Tactical Rebalance Directive
          </h2>
          <Badge variant={BadgeVariant.Blue}>{directive.maxDriftTxt}</Badge>
        </div>
        <div className="mb-1.5 text-[0.85rem] font-bold text-[#f8fafc]">{directive.title}</div>
        <p className="text-[0.82rem] text-[#94a3b8]">{directive.body}</p>
      </div>
    </section>
  );
};
