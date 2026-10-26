import React from 'react';
import { ConnectionSettings } from '../types/macro';

interface SyncDrawerProps {
  isOpen: boolean;
  connections: ConnectionSettings;
  isScanning: boolean;
  onChangeConnections: (next: ConnectionSettings) => void;
  onScanDeFi: () => void;
  onSaveCloud: () => void;
  onLoadCloud: () => void;
}

export const SyncDrawer: React.FC<SyncDrawerProps> = ({
  isOpen,
  connections,
  isScanning,
  onChangeConnections,
  onScanDeFi,
  onSaveCloud,
  onLoadCloud,
}) => {
  if (!isOpen) return null;

  return (
    <section className="mb-4 rounded-[10px] border border-[#334155] bg-[#111827] p-3.5">
      <div className="mb-2.5 text-[0.82rem] font-bold text-[#38bdf8]">
        ☁️ Firebase DB &amp; Ethereum DeFi Scanner (Morpho + PendleLoop + Aave V3 + Merkl V4)
      </div>

      <div className="grid grid-cols-1 items-end gap-2.5 min-[821px]:grid-cols-[1.3fr_1.5fr_auto]">
        <div>
          <label
            htmlFor="firebaseUrl"
            className="mb-1 block text-[0.72rem] text-[#94a3b8]"
          >
            Firebase Realtime Database URL
          </label>
          <input
            id="firebaseUrl"
            type="text"
            value={connections.firebaseUrl}
            onChange={(e) =>
              onChangeConnections({
                ...connections,
                firebaseUrl: e.target.value,
              })
            }
            placeholder="https://macro-command-centre-default-rtdb.firebaseio.com/"
            className="w-full rounded-[6px] border border-[#334155] bg-[#1e293b] px-2.5 py-2 text-[0.82rem] text-[#f8fafc] placeholder-[#64748b] focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

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
            placeholder="0x... (supports comma-separated sub-accounts)"
            className="w-full rounded-[6px] border border-[#334155] bg-[#1e293b] px-2.5 py-2 text-[0.82rem] text-[#f8fafc] placeholder-[#64748b] focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onScanDeFi}
            disabled={isScanning}
            className="cursor-pointer rounded-[6px] border border-[#38bdf8] bg-[#0284c7] px-3 py-2 text-[0.8rem] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-wait disabled:opacity-65"
          >
            {isScanning ? '⚡ Scanning...' : '⚡ Scan All DeFi & Loops'}
          </button>
          <button
            type="button"
            onClick={onSaveCloud}
            className="cursor-pointer rounded-[6px] border border-[#334155] bg-[#1e293b] px-3 py-2 text-[0.8rem] font-semibold text-[#f8fafc] transition-colors hover:border-[#38bdf8]"
          >
            ☁️ Save Cloud
          </button>
          <button
            type="button"
            onClick={onLoadCloud}
            className="cursor-pointer rounded-[6px] border border-[#334155] bg-[#1e293b] px-3 py-2 text-[0.8rem] font-semibold text-[#f8fafc] transition-colors hover:border-[#38bdf8]"
          >
            📥 Load Cloud
          </button>
        </div>
      </div>
    </section>
  );
};
