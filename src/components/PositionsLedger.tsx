import React, { useMemo, useState } from 'react';
import {
  BadgeVariant,
  BucketCategory,
  CustodyHygiene,
  Position,
} from '../types/macro';
import { Badge } from './Badge';

interface PositionsLedgerProps {
  positions: Position[];
  grossAssets: number;
  onAddPosition: (pos: Omit<Position, 'id'>) => void;
  onRemovePosition: (id: number) => void;
}

interface BucketGroup {
  bucket: BucketCategory;
  isDebt: boolean;
  positions: Position[];
  subtotal: number;
  weightPct: number;
  avgApy?: number;
  avgUtilization?: number;
}

const ORDERED_BUCKETS: BucketCategory[] = [
  BucketCategory.DryPowder,
  BucketCategory.HardAssets,
  BucketCategory.Equities,
  BucketCategory.SelfCustodyDeFi,
  BucketCategory.MarginBorrow,
];

const BUCKET_DESCRIPTIONS: Record<BucketCategory, string> = {
  [BucketCategory.DryPowder]: 'T-Bills & Cash Equivalents — Liquidity Buffer',
  [BucketCategory.HardAssets]: '1x Spot Bitcoin & Bullion — Core Self-Custody Wealth',
  [BucketCategory.Equities]: 'Real Assets & Producers — Inflation Hedge',
  [BucketCategory.SelfCustodyDeFi]: '1x Yield Sponges — Morpho, Pendle & Merkl Vaults',
  [BucketCategory.MarginBorrow]: 'On-Chain Borrow Debt & Leveraged PT Loops',
};

export const PositionsLedger: React.FC<PositionsLedgerProps> = ({
  positions,
  grossAssets,
  onAddPosition,
  onRemovePosition,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [name, setName] = useState('');
  const [bucket, setBucket] = useState<string>(BucketCategory.HardAssets);
  const [custody, setCustody] = useState<string>(CustodyHygiene.ColdSelfCustody);
  const [valStr, setValStr] = useState('');
  const [apyStr, setApyStr] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const toggleGroup = (bucketName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [bucketName]: !prev[bucketName],
    }));
  };

  const { groups, borrowTotal, defiCollateral, ltvOnDeFi, ltvOnGross, ltvStatus } = useMemo(() => {
    let totalBorrow = 0;
    let totalDeFi = 0;

    const groupedMap: Record<BucketCategory, Position[]> = {
      [BucketCategory.DryPowder]: [],
      [BucketCategory.HardAssets]: [],
      [BucketCategory.Equities]: [],
      [BucketCategory.SelfCustodyDeFi]: [],
      [BucketCategory.MarginBorrow]: [],
    };

    positions.forEach((p) => {
      const b = p.bucket as BucketCategory;
      if (groupedMap[b]) {
        groupedMap[b].push(p);
      } else {
        groupedMap[BucketCategory.SelfCustodyDeFi].push(p);
      }

      if (b === BucketCategory.MarginBorrow) {
        totalBorrow += p.value;
      } else if (b === BucketCategory.SelfCustodyDeFi) {
        totalDeFi += p.value;
      }
    });

    const computedGroups: BucketGroup[] = ORDERED_BUCKETS.map((b) => {
      const list = groupedMap[b];
      const isDebt = b === BucketCategory.MarginBorrow;
      const subtotal = list.reduce((sum, item) => sum + item.value, 0);
      const weightPct = (subtotal / Math.max(1, grossAssets)) * 100;

      // Calculate weighted APY & Utilization
      let weightedApySum = 0;
      let apyWeightBase = 0;
      let weightedUtilSum = 0;
      let utilWeightBase = 0;

      list.forEach((p) => {
        if (typeof p.apy === 'number') {
          weightedApySum += p.value * p.apy;
          apyWeightBase += p.value;
        }
        if (typeof p.utilization === 'number') {
          weightedUtilSum += p.value * p.utilization;
          utilWeightBase += p.value;
        }
      });

      const avgApy = apyWeightBase > 0 ? Math.round((weightedApySum / apyWeightBase) * 10) / 10 : undefined;
      const avgUtilization =
        utilWeightBase > 0 ? Math.round((weightedUtilSum / utilWeightBase) * 10) / 10 : undefined;

      return {
        bucket: b,
        isDebt,
        positions: list,
        subtotal,
        weightPct,
        avgApy,
        avgUtilization,
      };
    });

    const ltvDeFi = totalDeFi > 0 ? (totalBorrow / totalDeFi) * 100 : totalBorrow > 0 ? 100 : 0;
    const ltvGross = (totalBorrow / Math.max(1, grossAssets)) * 100;

    let statusVariant = BadgeVariant.Green;
    let statusText = 'Zero Debt Risk';
    let statusNote = 'No active margin debt or looped borrows detected.';

    if (totalBorrow > 0) {
      if (ltvDeFi > 65) {
        statusVariant = BadgeVariant.Red;
        statusText = '⚠️ High Liquidation Risk (LTV > 65%)';
        statusNote = 'Dangerous leverage! In a repo squeeze, borrow rate spikes and 100% money-market utilization will trigger forced liquidations.';
      } else if (ltvDeFi >= 50) {
        statusVariant = BadgeVariant.Amber;
        statusText = '⚡ Moderate Leverage (LTV 50%–65%)';
        statusNote = 'Monitor borrow rates closely. Keep an unwind transaction ready before repo spread exceeds +15 bps.';
      } else {
        statusVariant = BadgeVariant.Green;
        statusText = 'Conservative LTV (< 50%)';
        statusNote = 'Healthy collateral cushion. Harvest fixed PT carry while monitoring Standing Repo Facility usage.';
      }
    }

    return {
      groups: computedGroups,
      borrowTotal: totalBorrow,
      defiCollateral: totalDeFi,
      ltvOnDeFi: ltvDeFi,
      ltvOnGross: ltvGross,
      ltvStatus: {
        variant: statusVariant,
        text: statusText,
        note: statusNote,
      },
    };
  }, [positions, grossAssets]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const numericVal = parseFloat(valStr);
    const numericApy = apyStr.trim() !== '' ? parseFloat(apyStr) : undefined;

    if (!trimmedName || Number.isNaN(numericVal) || numericVal <= 0) {
      setFormError('Enter a position name and positive dollar value.');
      return;
    }
    setFormError(null);
    onAddPosition({
      name: trimmedName,
      bucket,
      custody,
      value: numericVal,
      apy: numericApy !== undefined && !Number.isNaN(numericApy) ? numericApy : undefined,
      isMorpho: false,
    });
    setName('');
    setValStr('');
    setApyStr('');
  };

  return (
    <section className="mb-4 rounded-[10px] border border-[#334155] bg-[#111827] p-4">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[0.98rem] font-bold text-[#f8fafc]">
            Self-Custody, DeFi Lend, PendleLoop &amp; Margin Borrow Holdings
          </h2>
          <p className="text-[0.78rem] text-[#94a3b8]">
            Grouped by category with live APY, LTV, pool utilization percentages, and subtotals
          </p>
        </div>
      </div>

      {/* LTV & DEBT RISK BANNER */}
      {borrowTotal > 0 && (
        <div
          className={`mb-4 rounded-[8px] border p-3 ${
            ltvStatus.variant === BadgeVariant.Red
              ? 'border-[#ef4444]/50 bg-[#ef4444]/10 text-[#fca5a5]'
              : ltvStatus.variant === BadgeVariant.Amber
              ? 'border-[#f59e0b]/50 bg-[#f59e0b]/10 text-[#fcd34d]'
              : 'border-[#10b981]/50 bg-[#10b981]/10 text-[#6ee7b7]'
          }`}
        >
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[0.82rem] font-bold">On-Chain Borrow &amp; Leverage Monitor</span>
              <Badge variant={ltvStatus.variant}>{ltvStatus.text}</Badge>
            </div>
            <div className="font-mono text-[0.78rem] font-bold">
              Debt: -${borrowTotal.toLocaleString()} vs ${defiCollateral.toLocaleString()} Collateral | LTV: {ltvOnDeFi.toFixed(1)}% | Net: {ltvOnGross.toFixed(1)}%
            </div>
          </div>
          <div className="text-[0.76rem] opacity-90">{ltvStatus.note}</div>
        </div>
      )}

      {/* CATEGORY-GROUPED ACCORDION */}
      <div className="space-y-3">
        {groups.map((group) => {
          const isCollapsed = !!collapsedGroups[group.bucket];
          const hasItems = group.positions.length > 0;
          const badgeVariant = group.isDebt
            ? BadgeVariant.Red
            : group.bucket === BucketCategory.SelfCustodyDeFi
            ? BadgeVariant.Green
            : group.bucket === BucketCategory.HardAssets
            ? BadgeVariant.Amber
            : BadgeVariant.Blue;

          const isDeFiBucket = group.bucket === BucketCategory.SelfCustodyDeFi;
          const isMarginBucket = group.bucket === BucketCategory.MarginBorrow;

          return (
            <div
              key={group.bucket}
              className="overflow-hidden rounded-[8px] border border-[#334155] bg-[#0b1120]/60"
            >
              {/* GROUP HEADER & ACCORDION TOGGLE WITH APY, LTV & UTILIZATION BADGES */}
              <button
                type="button"
                onClick={() => toggleGroup(group.bucket)}
                className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 bg-[#1e293b]/70 px-3.5 py-2.5 text-left transition-colors hover:bg-[#1e293b]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[0.8rem] text-[#94a3b8] transition-transform duration-200">
                    {isCollapsed ? '▶' : '▼'}
                  </span>
                  <Badge variant={badgeVariant}>{group.bucket}</Badge>
                  <span className="text-[0.84rem] font-bold text-[#f8fafc]">
                    {BUCKET_DESCRIPTIONS[group.bucket]}
                  </span>
                  <span className="rounded bg-[#0f172a] px-1.5 py-0.5 text-[0.68rem] text-[#94a3b8]">
                    {group.positions.length} {group.positions.length === 1 ? 'holding' : 'holdings'}
                  </span>

                  {/* APY Rate Badge for Self-Custody DeFi */}
                  {isDeFiBucket && group.avgApy !== undefined && (
                    <span className="rounded border border-[#10b981]/40 bg-[#10b981]/15 px-2 py-0.5 font-mono text-[0.72rem] font-bold text-[#6ee7b7]">
                      Avg Yield: {group.avgApy.toFixed(1)}% APY
                    </span>
                  )}

                  {/* APY, LTV & Util Badges for Margin / Borrow */}
                  {isMarginBucket && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {group.avgApy !== undefined && (
                        <span className="rounded border border-[#ef4444]/40 bg-[#ef4444]/15 px-2 py-0.5 font-mono text-[0.72rem] font-bold text-[#fca5a5]">
                          Borrow APY: {group.avgApy.toFixed(1)}%
                        </span>
                      )}
                      <span className="rounded border border-[#38bdf8]/40 bg-[#38bdf8]/15 px-2 py-0.5 font-mono text-[0.72rem] font-bold text-[#38bdf8]">
                        LTV: {ltvOnDeFi.toFixed(1)}%
                      </span>
                      {group.avgUtilization !== undefined && (
                        <span
                          className={`rounded border px-2 py-0.5 font-mono text-[0.72rem] font-bold ${
                            group.avgUtilization >= 90
                              ? 'border-[#ef4444]/50 bg-[#ef4444]/20 text-[#fca5a5]'
                              : group.avgUtilization >= 80
                              ? 'border-[#f59e0b]/50 bg-[#f59e0b]/20 text-[#fcd34d]'
                              : 'border-[#38bdf8]/40 bg-[#38bdf8]/15 text-[#38bdf8]'
                          }`}
                        >
                          Pool Util: {group.avgUtilization.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 font-mono text-[0.82rem]">
                  <span
                    className={
                      group.isDebt && group.subtotal > 0
                        ? 'font-bold text-[#ef4444]'
                        : 'font-bold text-[#f8fafc]'
                    }
                  >
                    Subtotal: {group.isDebt && group.subtotal > 0 ? '-$' : '$'}
                    {group.subtotal.toLocaleString()}
                  </span>
                  <span className="text-[#94a3b8]">
                    ({group.isDebt ? '-' : ''}
                    {group.weightPct.toFixed(1)}%)
                  </span>
                </div>
              </button>

              {/* GROUP ROWS */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[0.82rem]">
                    <thead>
                      <tr className="border-b border-[#334155]/60 bg-[#111827]/40">
                        <th className="px-3 py-2 text-left text-[0.7rem] uppercase tracking-wider text-[#94a3b8]">
                          Holding / Instrument &amp; Rates
                        </th>
                        <th className="px-3 py-2 text-left text-[0.7rem] uppercase tracking-wider text-[#94a3b8]">
                          Custody Hygiene
                        </th>
                        <th className="px-3 py-2 text-left text-[0.7rem] uppercase tracking-wider text-[#94a3b8]">
                          Value (USD)
                        </th>
                        <th className="px-3 py-2 text-left text-[0.7rem] uppercase tracking-wider text-[#94a3b8]">
                          Weight
                        </th>
                        <th className="px-3 py-2 text-right text-[0.7rem] uppercase tracking-wider text-[#94a3b8]" />
                      </tr>
                    </thead>
                    <tbody>
                      {!hasItems ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 py-3 text-center text-[0.78rem] text-[#64748b]"
                          >
                            No holdings in {group.bucket}. Add one below or scan your Ethereum wallet.
                          </td>
                        </tr>
                      ) : (
                        group.positions.map((p) => {
                          const w = ((p.value / Math.max(1, grossAssets)) * 100).toFixed(1);
                          const isDebtRow = group.isDebt;
                          const valPrefix = isDebtRow ? '-$' : '$';
                          const valClasses = isDebtRow
                            ? 'font-mono font-bold text-[#ef4444]'
                            : 'font-mono text-[#f8fafc]';

                          return (
                            <tr
                              key={p.id}
                              className={`border-b border-[#334155]/40 transition-colors last:border-b-0 hover:bg-[#1e293b]/40 ${
                                isDebtRow ? 'bg-[#ef4444]/[0.03]' : ''
                              }`}
                            >
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-[#f8fafc]">{p.name}</span>
                                  {p.isMorpho && (
                                    <span className="rounded bg-[#38bdf8]/15 px-1.5 py-0.5 text-[0.68rem] text-[#38bdf8]">
                                      DeFi Feed
                                    </span>
                                  )}

                                  {/* Individual APY Pill */}
                                  {p.apy !== undefined && (
                                    <span
                                      className={`rounded px-1.5 py-0.5 font-mono text-[0.7rem] font-bold ${
                                        isDebtRow
                                          ? 'border border-[#ef4444]/40 bg-[#ef4444]/15 text-[#fca5a5]'
                                          : 'border border-[#10b981]/40 bg-[#10b981]/15 text-[#6ee7b7]'
                                      }`}
                                    >
                                      {isDebtRow ? 'Borrow: ' : 'APY: '}
                                      {p.apy.toFixed(1)}%
                                    </span>
                                  )}

                                  {/* Individual LTV Pill */}
                                  {p.ltv !== undefined && (
                                    <span className="rounded border border-[#38bdf8]/40 bg-[#38bdf8]/15 px-1.5 py-0.5 font-mono text-[0.7rem] font-bold text-[#38bdf8]">
                                      LLTV: {p.ltv.toFixed(1)}%
                                    </span>
                                  )}

                                  {/* Individual Utilization Pill */}
                                  {p.utilization !== undefined && (
                                    <span
                                      className={`rounded border px-1.5 py-0.5 font-mono text-[0.7rem] font-bold ${
                                        p.utilization >= 90
                                          ? 'border-[#ef4444]/50 bg-[#ef4444]/20 text-[#fca5a5]'
                                          : p.utilization >= 80
                                          ? 'border-[#f59e0b]/50 bg-[#f59e0b]/20 text-[#fcd34d]'
                                          : 'border-[#334155] bg-[#1e293b] text-[#94a3b8]'
                                      }`}
                                    >
                                      Util: {p.utilization.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-[#94a3b8]">{p.custody}</td>
                              <td className={`px-3 py-2.5 ${valClasses}`}>
                                {valPrefix}
                                {p.value.toLocaleString()}
                              </td>
                              <td className={`px-3 py-2.5 ${valClasses}`}>
                                {isDebtRow ? '-' : ''}
                                {w}%
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => onRemovePosition(p.id)}
                                  aria-label={`Remove ${p.name}`}
                                  className="cursor-pointer rounded-[4px] border border-[#ef4444]/40 bg-[#ef4444]/15 px-2 py-0.5 text-[0.75rem] font-semibold text-[#fca5a5] transition-colors hover:border-[#ef4444]"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* QUICK ADD POSITION FORM WITH OPTIONAL APY INPUT */}
      <form
        onSubmit={handleSubmit}
        className="mt-4 grid grid-cols-1 gap-2 border-t border-[#334155] pt-3.5 min-[540px]:grid-cols-2 min-[880px]:grid-cols-[1.5fr_1.2fr_1.1fr_0.9fr_0.8fr_auto]"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (formError) setFormError(null);
          }}
          placeholder="Instrument name (e.g. Cold BTC, T-Bills, Morpho Lend)"
          className="w-full rounded-[6px] border border-[#334155] bg-[#1e293b] px-2.5 py-2 text-[0.82rem] text-[#f8fafc] placeholder-[#94a3b8] focus:border-[#38bdf8] focus:outline-none"
        />

        <select
          value={bucket}
          onChange={(e) => setBucket(e.target.value)}
          className="w-full rounded-[6px] border border-[#334155] bg-[#1e293b] px-2.5 py-2 text-[0.82rem] text-[#f8fafc] focus:border-[#38bdf8] focus:outline-none"
        >
          <option value={BucketCategory.HardAssets}>Hard Assets (1x Spot)</option>
          <option value={BucketCategory.DryPowder}>Dry Powder (T-Bills/Cash)</option>
          <option value={BucketCategory.Equities}>Equities / Real Assets</option>
          <option value={BucketCategory.SelfCustodyDeFi}>Self-Custody DeFi (1x Lend/Vault)</option>
          <option value={BucketCategory.MarginBorrow}>Margin / Borrow (Debt &amp; Loops)</option>
        </select>

        <select
          value={custody}
          onChange={(e) => setCustody(e.target.value)}
          className="w-full rounded-[6px] border border-[#334155] bg-[#1e293b] px-2.5 py-2 text-[0.82rem] text-[#f8fafc] focus:border-[#38bdf8] focus:outline-none"
        >
          <option value={CustodyHygiene.ColdSelfCustody}>Cold / Self-Custody</option>
          <option value={CustodyHygiene.DirectTreasury}>Direct Treasury</option>
          <option value={CustodyHygiene.CustodialExchange}>Custodial Exchange</option>
        </select>

        <input
          type="number"
          step="any"
          min="0"
          value={valStr}
          onChange={(e) => {
            setValStr(e.target.value);
            if (formError) setFormError(null);
          }}
          placeholder="Value ($)"
          className="w-full rounded-[6px] border border-[#334155] bg-[#1e293b] px-2.5 py-2 text-[0.82rem] text-[#f8fafc] placeholder-[#94a3b8] focus:border-[#38bdf8] focus:outline-none"
        />

        <input
          type="number"
          step="any"
          value={apyStr}
          onChange={(e) => setApyStr(e.target.value)}
          placeholder="APY % (opt)"
          className="w-full rounded-[6px] border border-[#334155] bg-[#1e293b] px-2.5 py-2 text-[0.82rem] text-[#f8fafc] placeholder-[#94a3b8] focus:border-[#38bdf8] focus:outline-none"
        />

        <button
          type="submit"
          className="cursor-pointer rounded-[6px] border border-[#38bdf8] bg-[#0284c7] px-3.5 py-2 text-[0.8rem] font-semibold text-white transition-opacity hover:opacity-95 min-[540px]:col-span-2 min-[880px]:col-span-1"
        >
          + Add
        </button>
      </form>

      {formError && (
        <div className="mt-2 rounded-[6px] border border-[#f59e0b]/40 bg-[#f59e0b]/15 px-3 py-2 text-[0.78rem] text-[#fcd34d]">
          {formError}
        </div>
      )}
    </section>
  );
};
