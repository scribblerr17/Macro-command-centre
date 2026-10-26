import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertsGrid } from './components/AlertsGrid';
import { AllocationChart } from './components/AllocationChart';
import { Header } from './components/Header';
import { KpiGrid } from './components/KpiGrid';
import { PositionsLedger } from './components/PositionsLedger';
import { StressSimulator } from './components/StressSimulator';
import { SyncDrawer } from './components/SyncDrawer';
import {
  fetchNYFedTelemetry,
  parseWalletAddresses,
  scanEthereumDeFiPositions,
} from './services/telemetryService';
import {
  BadgeVariant,
  ConnectionSettings,
  MacroState,
  NoticeMessage,
  Position,
  SyncBadgeState,
} from './types/macro';
import {
  calcRealMonthOffset,
  computeMacroMetrics,
  createBaselineState,
  createDemoState,
  decodeStateFromUrl,
  encodeStateToShareUrl,
  loadStoredConnections,
  loadStoredState,
  saveStoredConnections,
  saveStoredState,
} from './utils/calculations';

export const App: React.FC = () => {
  const [state, setState] = useState<MacroState>(() => {
    // Check if user arrived via a shared URL link
    const shared = decodeStateFromUrl();
    if (shared) {
      const baseline = createBaselineState();
      return {
        ...baseline,
        ...shared,
        positions: shared.positions ?? baseline.positions,
      };
    }
    return loadStoredState();
  });

  const [connections, setConnections] = useState<ConnectionSettings>(() => loadStoredConnections());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScanningDeFi, setIsScanningDeFi] = useState(false);
  const [syncBadge, setSyncBadge] = useState<SyncBadgeState>({
    variant: BadgeVariant.Blue,
    text: 'Ready',
  });
  const [notice, setNotice] = useState<NoticeMessage | null>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('p=')) {
      return {
        variant: BadgeVariant.Green,
        text: 'Shared portfolio loaded successfully from URL link!',
      };
    }
    return null;
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const connectionsRef = useRef(connections);
  connectionsRef.current = connections;

  useEffect(() => {
    saveStoredState(state);
  }, [state]);

  useEffect(() => {
    saveStoredConnections(connections);
  }, [connections]);

  const metrics = useMemo(() => computeMacroMetrics(state), [state]);

  const handleFetchNYFed = useCallback(async () => {
    try {
      const telemetry = await fetchNYFedTelemetry();
      if (telemetry) {
        setState((prev) => ({
          ...prev,
          sofrRate: telemetry.sofrRate,
          effrRate: telemetry.effrRate,
          sofrSpreadBps: telemetry.sofrSpreadBps,
          monthOffset: calcRealMonthOffset(),
        }));
        setSyncBadge({
          variant: BadgeVariant.Green,
          text: `NY Fed Live (${telemetry.effectiveDate})`,
        });
      }
    } catch {
      setSyncBadge({
        variant: BadgeVariant.Amber,
        text: 'Cached Telemetry',
      });
    }
  }, []);

  const handleScanDeFi = useCallback(async (silentIfEmptyWallet = false) => {
    const addresses = parseWalletAddresses(connectionsRef.current.walletAddress);
    if (addresses.length === 0) {
      if (!silentIfEmptyWallet) {
        setIsDrawerOpen(true);
        setNotice({
          variant: BadgeVariant.Amber,
          text: 'Paste your 0x wallet address in the DeFi Wallet & Tools drawer.',
        });
      }
      return;
    }

    setIsScanningDeFi(true);
    setNotice(null);
    setSyncBadge({
      variant: BadgeVariant.Blue,
      text: 'Scanning DeFi...',
    });

    try {
      const result = await scanEthereumDeFiPositions(addresses);
      if (result.rows.length > 0) {
        setState((prev) => {
          const manualPositions = prev.positions.filter((p) => !p.isMorpho && !p.isDeFi);
          return {
            ...prev,
            positions: [...manualPositions, ...result.rows],
          };
        });

        setSyncBadge({
          variant: BadgeVariant.Green,
          text: `Synced (M:${result.counts.morpho} P:${result.counts.pendle} R:${result.counts.merkl}) +$${result.totalSup.toLocaleString()}`,
        });
      } else {
        setSyncBadge({
          variant: BadgeVariant.Amber,
          text: 'DeFi: $0 Found',
        });
        setNotice({
          variant: BadgeVariant.Amber,
          text: 'Scanned Morpho, PendleLoop, Aave V3 & Merkl on Ethereum and found 0 positions for this wallet.',
        });
      }
    } finally {
      setIsScanningDeFi(false);
    }
  }, []);

  const handleRefreshAllFeeds = useCallback(async () => {
    setIsSyncing(true);
    setNotice(null);
    try {
      await handleFetchNYFed();
      if (connectionsRef.current.walletAddress.includes('0x')) {
        await handleScanDeFi(true);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [handleFetchNYFed, handleScanDeFi]);

  useEffect(() => {
    void handleRefreshAllFeeds();
  }, [handleRefreshAllFeeds]);

  const handleChangeSimulation = useCallback(
    (patch: {
      monthOffset?: number;
      sofrSpreadBps?: number;
      srfUsageBillions?: number;
      slrRelief?: boolean;
    }) => {
      setState((prev) => ({
        ...prev,
        ...patch,
      }));
    },
    []
  );

  const handleAddPosition = useCallback((pos: Omit<Position, 'id'>) => {
    const newPosition: Position = {
      ...pos,
      id: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      positions: [...prev.positions, newPosition],
    }));
  }, []);

  const handleRemovePosition = useCallback((id: number) => {
    setState((prev) => ({
      ...prev,
      positions: prev.positions.filter((p) => p.id !== id),
    }));
  }, []);

  const handleResetBaseline = useCallback(() => {
    setState(createBaselineState());
    setNotice({
      variant: BadgeVariant.Blue,
      text: 'Reset to baseline allocation and live NY Fed telemetry.',
    });
  }, []);

  // Zero-database Export / Import / Share tools
  const handleExportJson = useCallback(() => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(stateRef.current, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'macro_portfolio_backup.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setNotice({
      variant: BadgeVariant.Green,
      text: 'Backup file (macro_portfolio_backup.json) downloaded successfully.',
    });
  }, []);

  const handleImportJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result));
        if (parsed && Array.isArray(parsed.positions)) {
          setState((prev) => ({
            ...prev,
            ...parsed,
          }));
          setNotice({
            variant: BadgeVariant.Green,
            text: `Imported backup with ${parsed.positions.length} positions successfully.`,
          });
        } else {
          setNotice({
            variant: BadgeVariant.Red,
            text: 'Invalid backup file format.',
          });
        }
      } catch {
        setNotice({
          variant: BadgeVariant.Red,
          text: 'Failed to read JSON backup file.',
        });
      }
    };
    reader.readAsText(file);
  }, []);

  const handleCopyShareLink = useCallback(() => {
    const shareUrl = encodeStateToShareUrl(stateRef.current);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(
        () => {
          setNotice({
            variant: BadgeVariant.Green,
            text: 'Shareable link copied to clipboard! Anyone with this link will see your exact scenario.',
          });
        },
        () => {
          setNotice({
            variant: BadgeVariant.Blue,
            text: `Share URL: ${shareUrl}`,
          });
        }
      );
    } else {
      setNotice({
        variant: BadgeVariant.Blue,
        text: `Share URL: ${shareUrl}`,
      });
    }
  }, []);

  const handleLoadDemo = useCallback(() => {
    setState(createDemoState());
    setNotice({
      variant: BadgeVariant.Amber,
      text: 'Demo portfolio loaded (includes sample Morpho USDC & Pendle PT positions).',
    });
  }, []);

  return (
    <main className="mx-auto max-w-[1180px] p-4">
      <Header
        monthName={metrics.monthName}
        monthOffset={state.monthOffset}
        syncBadge={syncBadge}
        activePhase={metrics.activePhase}
        phaseBannerText={metrics.phaseBannerText}
        isDrawerOpen={isDrawerOpen}
        isSyncing={isSyncing || isScanningDeFi}
        onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
        onSyncAll={() => void handleRefreshAllFeeds()}
        onResetBaseline={handleResetBaseline}
      />

      {notice && (
        <div
          className={`mb-4 flex items-center justify-between gap-3 rounded-[8px] border px-3.5 py-2.5 text-[0.82rem] ${
            notice.variant === BadgeVariant.Red
              ? 'border-[#ef4444]/45 bg-[#ef4444]/15 text-[#fca5a5]'
              : notice.variant === BadgeVariant.Green
              ? 'border-[#10b981]/45 bg-[#10b981]/15 text-[#6ee7b7]'
              : notice.variant === BadgeVariant.Blue
              ? 'border-[#38bdf8]/45 bg-[#38bdf8]/15 text-[#38bdf8]'
              : 'border-[#f59e0b]/45 bg-[#f59e0b]/15 text-[#fcd34d]'
          }`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="cursor-pointer rounded px-2 py-0.5 text-[0.78rem] font-bold hover:opacity-80"
          >
            ✕
          </button>
        </div>
      )}

      <SyncDrawer
        isOpen={isDrawerOpen}
        connections={connections}
        isScanning={isScanningDeFi}
        onChangeConnections={setConnections}
        onScanDeFi={() => void handleScanDeFi(false)}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onCopyShareLink={handleCopyShareLink}
        onLoadDemo={handleLoadDemo}
      />

      <KpiGrid
        effrRate={state.effrRate}
        impliedSofr={metrics.impliedSofr}
        spSign={metrics.spSign}
        sofrSpreadBps={state.sofrSpreadBps}
        srfUsageBillions={state.srfUsageBillions}
        stressScore={metrics.stressScore}
        stressColor={metrics.stressColor}
        stressSub={metrics.stressSub}
      />

      <StressSimulator
        monthOffset={state.monthOffset}
        monthName={metrics.monthName}
        sofrSpreadBps={state.sofrSpreadBps}
        spSign={metrics.spSign}
        srfUsageBillions={state.srfUsageBillions}
        slrRelief={state.slrRelief}
        onChangeSimulation={handleChangeSimulation}
      />

      <AllocationChart
        netEquity={metrics.netEquity}
        grossAssets={metrics.grossAssets}
        borrowTotal={metrics.borrowTotal}
        directPct={metrics.directPct}
        barItems={metrics.barItems}
      />

      <AlertsGrid contagion={metrics.contagion} directive={metrics.directive} />

      <PositionsLedger
        positions={state.positions}
        grossAssets={metrics.grossAssets}
        onAddPosition={handleAddPosition}
        onRemovePosition={handleRemovePosition}
      />
    </main>
  );
};

export default App;
