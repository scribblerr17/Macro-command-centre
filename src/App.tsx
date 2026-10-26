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
  pullStateFromFirebase,
  pushStateToFirebase,
  scanEthereumDeFiPositions,
} from './services/telemetryService';
import {
  BadgeVariant,
  ConnectionSettings,
  DeFiStrategy,
  MacroState,
  NoticeMessage,
  Position,
  SyncBadgeState,
} from './types/macro';
import {
  calcRealMonthOffset,
  computeMacroMetrics,
  createBaselineState,
  loadStoredConnections,
  loadStoredState,
  saveStoredConnections,
  saveStoredState,
} from './utils/calculations';

export const App: React.FC = () => {
  const [state, setState] = useState<MacroState>(() => loadStoredState());
  const [connections, setConnections] = useState<ConnectionSettings>(() => loadStoredConnections());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScanningDeFi, setIsScanningDeFi] = useState(false);
  const [syncBadge, setSyncBadge] = useState<SyncBadgeState>({
    variant: BadgeVariant.Blue,
    text: 'Ready',
  });
  const [notice, setNotice] = useState<NoticeMessage | null>(null);

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

  const handlePushCloud = useCallback(async (silent: boolean, customState?: MacroState) => {
    const fbUrl = connectionsRef.current.firebaseUrl.trim();
    if (!fbUrl) {
      if (!silent) {
        setIsDrawerOpen(true);
        setNotice({
          variant: BadgeVariant.Amber,
          text: 'Enter your Firebase Realtime DB URL in the setup drawer first.',
        });
      }
      return;
    }

    try {
      const ok = await pushStateToFirebase(fbUrl, customState ?? stateRef.current);
      if (ok) {
        setSyncBadge({ variant: BadgeVariant.Green, text: '☁️ Cloud Saved' });
        if (!silent) {
          setNotice(null);
        }
      }
    } catch {
      if (!silent) {
        setNotice({
          variant: BadgeVariant.Red,
          text: 'Unable to save to Firebase Realtime Database. Verify your URL and database rules.',
        });
      }
    }
  }, []);

  const handlePullCloud = useCallback(async (silent = false) => {
    const fbUrl = connectionsRef.current.firebaseUrl.trim();
    if (!fbUrl) {
      if (!silent) {
        setIsDrawerOpen(true);
        setNotice({
          variant: BadgeVariant.Amber,
          text: 'Enter your Firebase Realtime DB URL in the setup drawer first.',
        });
      }
      return;
    }

    try {
      const remoteState = await pullStateFromFirebase(fbUrl);
      if (remoteState) {
        setState(remoteState);
        setSyncBadge({ variant: BadgeVariant.Green, text: '☁️ Cloud Loaded' });
        if (!silent) {
          setNotice(null);
        }
      } else if (!silent) {
        setNotice({
          variant: BadgeVariant.Amber,
          text: 'No saved portfolio state found at that Firebase Realtime DB URL yet.',
        });
      }
    } catch {
      if (!silent) {
        setNotice({
          variant: BadgeVariant.Red,
          text: 'Unable to load from Firebase Realtime Database. Check your URL and network connection.',
        });
      }
    }
  }, []);

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

  const handleScanDeFi = useCallback(
    async (silentIfEmptyWallet = false) => {
      const addresses = parseWalletAddresses(connectionsRef.current.walletAddress);
      if (addresses.length === 0) {
        if (!silentIfEmptyWallet) {
          setIsDrawerOpen(true);
          setNotice({
            variant: BadgeVariant.Amber,
            text: 'Paste your 0x wallet address (or comma-separated main + proxy addresses) in the Cloud & DeFi Setup drawer.',
          });
        }
        return;
      }

      setIsScanningDeFi(true);
      setNotice(null);
      setSyncBadge({
        variant: BadgeVariant.Blue,
        text: 'Scanning Morpho, PendleLoop, Aave & Merkl...',
      });

      try {
        const result = await scanEthereumDeFiPositions(addresses);
        if (result.rows.length > 0) {
          const nextStrategy =
            result.totalBor > 10 ? DeFiStrategy.LoopedBorrow : DeFiStrategy.StableLp;

          let updatedSnapshot: MacroState | undefined;
          setState((prev) => {
            const manualPositions = prev.positions.filter((p) => !p.isMorpho && !p.isDeFi);
            const nextState: MacroState = {
              ...prev,
              positions: [...manualPositions, ...result.rows],
              defiStrategy: nextStrategy,
            };
            updatedSnapshot = nextState;
            return nextState;
          });

          setSyncBadge({
            variant: BadgeVariant.Green,
            text: `Synced (M:${result.counts.morpho} P:${result.counts.pendle} R:${result.counts.merkl}) +$${result.totalSup.toLocaleString()}`,
          });

          if (updatedSnapshot) {
            await handlePushCloud(true, updatedSnapshot);
          }
        } else {
          setSyncBadge({
            variant: BadgeVariant.Amber,
            text: 'DeFi: $0 Found',
          });
          setNotice({
            variant: BadgeVariant.Amber,
            text: 'Scanned Morpho, PendleLoop, Aave V3 & Merkl on Ethereum and found 0 positions.',
          });
        }
      } finally {
        setIsScanningDeFi(false);
      }
    },
    [handlePushCloud]
  );

  const handleRefreshAllFeeds = useCallback(async () => {
    setIsSyncing(true);
    setNotice(null);
    try {
      await handlePullCloud(true);
      await handleFetchNYFed();
      if (connectionsRef.current.walletAddress.includes('0x')) {
        await handleScanDeFi(true);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [handlePullCloud, handleFetchNYFed, handleScanDeFi]);

  useEffect(() => {
    void handleRefreshAllFeeds();
  }, [handleRefreshAllFeeds]);

  const handleChangeSimulation = useCallback(
    (patch: {
      monthOffset?: number;
      sofrSpreadBps?: number;
      srfUsageBillions?: number;
      slrRelief?: boolean;
      defiStrategy?: DeFiStrategy;
    }) => {
      setState((prev) => ({
        ...prev,
        ...patch,
      }));
    },
    []
  );

  const handleAddPosition = useCallback(
    (pos: Omit<Position, 'id'>) => {
      const newPosition: Position = {
        ...pos,
        id: Date.now(),
      };
      let nextSnapshot: MacroState | undefined;
      setState((prev) => {
        const next: MacroState = {
          ...prev,
          positions: [...prev.positions, newPosition],
        };
        nextSnapshot = next;
        return next;
      });
      if (nextSnapshot) {
        void handlePushCloud(true, nextSnapshot);
      }
    },
    [handlePushCloud]
  );

  const handleRemovePosition = useCallback(
    (id: number) => {
      let nextSnapshot: MacroState | undefined;
      setState((prev) => {
        const next: MacroState = {
          ...prev,
          positions: prev.positions.filter((p) => p.id !== id),
        };
        nextSnapshot = next;
        return next;
      });
      if (nextSnapshot) {
        void handlePushCloud(true, nextSnapshot);
      }
    },
    [handlePushCloud]
  );

  const handleResetBaseline = useCallback(() => {
    setState(createBaselineState());
    setNotice(null);
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
        onSaveCloud={() => void handlePushCloud(false)}
        onLoadCloud={() => void handlePullCloud(false)}
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
        defiStrategy={state.defiStrategy}
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
