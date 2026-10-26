import React, { useState } from 'react';
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

export const PositionsLedger: React.FC<PositionsLedgerProps> = ({
  positions,
  grossAssets,
  onAddPosition,
  onRemovePosition,
}) => {
  const [name, setName] = useState('');
  const [bucket, setBucket] = useState<string>(BucketCategory.HardAssets);
  const [custody, setCustody] = useState<string>(CustodyHygiene.ColdSelfCustody);
  const [valStr, setValStr] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const numericVal = parseFloat(valStr);
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
      isMorpho: false,
    });
    setName('');
    setValStr('');
  };

  return (
    <section className="mb-4 rounded-[10px] border border-[#334155] bg-[#111827] p-4">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[0.98rem] font-bold text-[#f8fafc]">
            Self-Custody, DeFi Lend, PendleLoop &amp; Margin Borrow Positions
          </h2>
          <p className="text-[0.78rem] text-[#94a3b8]">
            Scans Morpho, PendleLoop, Aave V3 E-Mode, and Merkl V4 without overwriting manual
            entries
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.83rem]">
          <thead>
            <tr>
              <th className="border-b border-[#334155] px-2 py-2.5 text-left text-[0.72rem] uppercase tracking-[0.04em] text-[#94a3b8]">
                Position / Instrument
              </th>
              <th className="border-b border-[#334155] px-2 py-2.5 text-left text-[0.72rem] uppercase tracking-[0.04em] text-[#94a3b8]">
                Bucket / Category
              </th>
              <th className="border-b border-[#334155] px-2 py-2.5 text-left text-[0.72rem] uppercase tracking-[0.04em] text-[#94a3b8]">
                Custody Hygiene
              </th>
              <th className="border-b border-[#334155] px-2 py-2.5 text-left text-[0.72rem] uppercase tracking-[0.04em] text-[#94a3b8]">
                Value (USD)
              </th>
              <th className="border-b border-[#334155] px-2 py-2.5 text-left text-[0.72rem] uppercase tracking-[0.04em] text-[#94a3b8]">
                Weight
              </th>
              <th className="border-b border-[#334155] px-2 py-2.5 text-left text-[0.72rem] uppercase tracking-[0.04em] text-[#94a3b8]" />
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="border-b border-[#334155] px-2 py-4 text-center text-[0.82rem] text-[#94a3b8]"
                >
                  No positions recorded. Add a position below or scan an Ethereum wallet.
                </td>
              </tr>
            ) : (
              positions.map((p) => {
                const isDebt = p.bucket === BucketCategory.MarginBorrow;
                const w = ((p.value / Math.max(1, grossAssets)) * 100).toFixed(1);
                const badgeVariant = isDebt
                  ? BadgeVariant.Red
                  : p.bucket === BucketCategory.SelfCustodyDeFi
                  ? BadgeVariant.Green
                  : BadgeVariant.Blue;
                const valPrefix = isDebt ? '-$' : '$';
                const valClasses = isDebt
                  ? 'font-mono font-bold text-[#ef4444]'
                  : 'font-mono text-[#f8fafc]';

                return (
                  <tr key={p.id}>
                    <td className="border-b border-[#334155] px-2 py-2.5 font-semibold text-[#f8fafc]">
                      {p.name}
                    </td>
                    <td className="border-b border-[#334155] px-2 py-2.5">
                      <Badge variant={badgeVariant}>{p.bucket}</Badge>
                    </td>
                    <td className="border-b border-[#334155] px-2 py-2.5 text-[#f8fafc]">
                      {p.custody}
                    </td>
                    <td className={`border-b border-[#334155] px-2 py-2.5 ${valClasses}`}>
                      {valPrefix}
                      {p.value.toLocaleString()}
                    </td>
                    <td className={`border-b border-[#334155] px-2 py-2.5 ${valClasses}`}>
                      {isDebt ? '-' : ''}
                      {w}%
                    </td>
                    <td className="border-b border-[#334155] px-2 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onRemovePosition(p.id)}
                        aria-label={`Remove ${p.name}`}
                        className="cursor-pointer rounded-[6px] border border-[#ef4444]/40 bg-[#ef4444]/15 px-[9px] py-1 text-[0.8rem] font-semibold text-[#fca5a5] transition-colors hover:border-[#ef4444]"
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

      <form
        onSubmit={handleSubmit}
        className="mt-3.5 grid grid-cols-1 gap-2 border-t border-[#334155] pt-3 min-[481px]:grid-cols-2 min-[781px]:grid-cols-[1.6fr_1.3fr_1.2fr_1fr_auto]"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (formError) setFormError(null);
          }}
          placeholder="Instrument name (e.g. Cold BTC, T-Bills)"
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

        <button
          type="submit"
          className="cursor-pointer rounded-[6px] border border-[#38bdf8] bg-[#0284c7] px-3 py-2 text-[0.8rem] font-semibold text-white transition-opacity hover:opacity-95 min-[481px]:col-span-2 min-[781px]:col-span-1"
        >
          + Add Position
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
