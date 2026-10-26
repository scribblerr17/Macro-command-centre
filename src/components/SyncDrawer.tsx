import React, { useRef } from 'react';
import { ConnectionSettings } from '../types/macro';

interface SyncDrawerProps {
  isOpen: boolean;
  connections: ConnectionSettings;
  isScanning: boolean;
  onChangeConnections: (next: ConnectionSettings) => void;
  onScanDeFi: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onCopyShareLink: () => void;
  onLoadDemo: () => void;
}

export const SyncDrawer: React.FC<SyncDrawerProps> = ({
  isOpen,
  connections,
  isScanning,
  onChangeConnections,
  onScanDeFi,
  onExportJson,
  onImportJson,
  onCopyShareLink,
  onLoadDemo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <section className="mb-4 rounded-[10px] border border-[#334155] bg-[#111827] p-3.5">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[0.82rem] font-bold text-[#38bdf8]">
          ⚡ DeFi Scanner &amp; Private Portfolio Backup Tools
        </div>
        <div className="text-[0.72rem] text-[#94a3b8]">
          🔒 100% Client-Side &bull; No Database &bull; Stored Locally in Your Browser
        </div>
      </div>

      <div className="mb-3.5 grid grid-cols-1 items-end gap-2.5 min-[721px]:grid-cols-[1fr_auto]">
        <div>
          <label
            htmlFor="walletAddress"
            className="mb-1 block text-[0.72rem] text-[#94a3b8]"
          >
            Ethereum Wallet(s) — Main 0x... (or Main 0x..., Proxy 0x...)
          </label>
          <input
            id="walletAddress"
            type="text"
            value={connections.walletAddress}
            onChange={(e) =>
              onChangeConnections({
                ...connections,
                walletAddress: e.target.value,
              })
            }
            placeholder="0x... (supports comma-separated sub-accounts for Morpho, Pendle & Aave)"
            className="w-full rounded-[6px] border border-[#334155] bg-[#1e293b] px-2.5 py-2 text-[0.82rem] text-[#f8fafc] placeholder-[#64748b] focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={onScanDeFi}
            disabled={isScanning}
            className="w-full cursor-pointer rounded-[6px] border border-[#38bdf8] bg-[#0284c7] px-3.5 py-2 text-[0.8rem] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-wait disabled:opacity-65 min-[721px]:w-auto"
          >
            {isScanning ? '⚡ Scanning DeFi...' : '⚡ Scan All DeFi & Loops'}
          </button>
        </div>
      </div>

      <div className="border-t border-[#334155] pt-3">
        <div className="mb-2 text-[0.75rem] font-semibold text-[#94a3b8]">
          Backup &amp; Sharing (Zero-Database):
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExportJson}
            className="cursor-pointer rounded-[6px] border border-[#334155] bg-[#1e293b] px-3 py-1.5 text-[0.78rem] font-semibold text-[#f8fafc] transition-colors hover:border-[#38bdf8]"
          >
            📤 Export Backup (.json)
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-[6px] border border-[#334155] bg-[#1e293b] px-3 py-1.5 text-[0.78rem] font-semibold text-[#f8fafc] transition-colors hover:border-[#38bdf8]"
          >
            📥 Import Backup (.json)
          </button>

          <button
            type="button"
            onClick={onCopyShareLink}
            className="cursor-pointer rounded-[6px] border border-[#334155] bg-[#1e293b] px-3 py-1.5 text-[0.78rem] font-semibold text-[#38bdf8] transition-colors hover:border-[#38bdf8]"
          >
            🔗 Copy Shareable Link
          </button>

          <button
            type="button"
            onClick={onLoadDemo}
            className="cursor-pointer rounded-[6px] border border-[#f59e0b]/40 bg-[#f59e0b]/15 px-3 py-1.5 text-[0.78rem] font-semibold text-[#fcd34d] transition-colors hover:border-[#f59e0b]"
          >
            📊 Load Demo Preset
          </button>
        </div>
      </div>
    </section>
  );
};
