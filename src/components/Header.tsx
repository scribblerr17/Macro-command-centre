import React, { useState } from 'react';
import { SyncBadgeState } from '../types/macro';
import { Badge } from './Badge';

interface HeaderProps {
  monthName: string;
  monthOffset: number;
  syncBadge: SyncBadgeState;
  activePhase: 1 | 2 | 3;
  phaseBannerText: string;
  isDrawerOpen: boolean;
  isNotifOpen: boolean;
  unreadAlertCount: number;
  isSyncing: boolean;
  onToggleDrawer: () => void;
  onToggleNotif: () => void;
  onSyncAll: () => void;
  onResetBaseline: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  monthName,
  monthOffset,
  syncBadge,
  activePhase,
  phaseBannerText,
  isDrawerOpen,
  isNotifOpen,
  unreadAlertCount,
  isSyncing,
  onToggleDrawer,
  onToggleNotif,
  onSyncAll,
  onResetBaseline,
}) => {
  const [confirmingReset, setConfirmingReset] = useState(false);

  const phaseClasses =
    activePhase === 1
      ? 'bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/45'
      : activePhase === 2
      ? 'bg-[#ef4444]/18 text-[#fca5a5] border-[#ef4444]/50'
      : 'bg-[#10b981]/18 text-[#6ee7b7] border-[#10b981]/50';

  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#334155] pb-3.5">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2 text-[0.76rem] font-bold uppercase tracking-[0.06em] text-[#38bdf8]">
          <span>
            {monthName} — Month {monthOffset} of 36 (NY Fed Live Telemetry)
          </span>
          <Badge variant={syncBadge.variant}>{syncBadge.text}</Badge>
        </div>
        <h1 className="text-[1.45rem] font-extrabold tracking-[-0.02em] text-[#f8fafc]">
          Macro Collateral &amp; DeFi Command
        </h1>
      </div>

      <div className="flex w-full flex-col items-start gap-2 md:w-auto md:items-end">
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-[7px] text-[0.82rem] font-bold ${phaseClasses}`}
        >
          {phaseBannerText}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onToggleNotif}
            className={`inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-[6px] border px-3 py-2 text-[0.8rem] font-semibold transition-colors ${
              isNotifOpen
                ? 'border-[#38bdf8] bg-[#1e293b] text-[#38bdf8]'
                : 'border-[#334155] bg-[#1e293b] text-[#f8fafc] hover:border-[#38bdf8]'
            }`}
          >
            <span>🔔 Fed Alerts</span>
            {unreadAlertCount > 0 && (
              <span className="rounded bg-[#ef4444] px-1.5 py-0.5 font-mono text-[0.7rem] font-extrabold leading-none text-white tabular-nums">
                {unreadAlertCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleDrawer}
            className={`min-h-[38px] cursor-pointer rounded-[6px] border px-3 py-2 text-[0.8rem] font-semibold transition-colors ${
              isDrawerOpen
                ? 'border-[#38bdf8] bg-[#1e293b] text-[#38bdf8]'
                : 'border-[#334155] bg-[#1e293b] text-[#f8fafc] hover:border-[#38bdf8]'
            }`}
          >
            ⚙️ DeFi Wallet &amp; Tools
          </button>

          <button
            type="button"
            onClick={onSyncAll}
            disabled={isSyncing}
            className="min-h-[38px] cursor-pointer rounded-[6px] border border-[#38bdf8] bg-[#0284c7] px-3 py-2 text-[0.8rem] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-wait disabled:opacity-65"
          >
            {isSyncing ? '🔄 Syncing...' : '🔄 Sync NY Fed & DeFi'}
          </button>

          {!confirmingReset ? (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="cursor-pointer rounded-[6px] border border-[#334155] bg-[#1e293b] px-3 py-2 text-[0.8rem] font-semibold text-[#f8fafc] transition-colors hover:border-[#38bdf8]"
            >
              ↺ Reset Baseline
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onResetBaseline();
                  setConfirmingReset(false);
                }}
                className="cursor-pointer rounded-[6px] border border-[#ef4444]/60 bg-[#ef4444]/20 px-3 py-2 text-[0.8rem] font-semibold text-[#fca5a5] hover:border-[#ef4444]"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="cursor-pointer rounded-[6px] border border-[#334155] bg-[#1e293b] px-2.5 py-2 text-[0.8rem] font-semibold text-[#94a3b8] hover:border-[#38bdf8]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
