import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertsGrid } from './components/AlertsGrid';
import { AllocationChart } from './components/AllocationChart';
import { Header } from './components/Header';
import { HistoricalTrendChart } from './components/HistoricalTrendChart';
import { KpiGrid } from './components/KpiGrid';
import { NotificationCenter } from './components/NotificationCenter';
import { PositionsLedger } from './components/PositionsLedger';
import { StressSimulator } from './components/StressSimulator';
import { SyncDrawer } from './components/SyncDrawer';
import {
  evaluateFedTelemetryAlerts,
  formatMetricsSummary,
  loadAlertLog,
  loadNotificationSettings,
  loadSeenAlertKeys,
  saveAlertLog,
  saveNotificationSettings,
  saveSeenAlertKeys,
  sendBrowserNotification,
  sendNtfyPush,
} from './services/notificationEngine';
import {
  fetchNYFed30DayHistory,
  fetchNYFedTelemetry,
  generateFallback30DayHistory,
  NYFedTelemetryResult,
  parseWalletAddresses,
  scanEthereumDeFiPositions,
} from './services/telemetryService';
import {
  AlertLogEntry,
  BadgeVariant,
  ConnectionSettings,
  HistoricalTrendPoint,
  MacroState,
  NoticeMessage,
  NotificationSettings,
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

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export const App: React.FC = () => {
  const [state, setState] = useState<MacroState>(() => {
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
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(() =>
    loadNotificationSettings()
  );
  const [alertLog, setAlertLog] = useState<AlertLogEntry[]>(() => loadAlertLog());
  const [seenAlertKeys, setSeenAlertKeys] = useState<Record<string, boolean>>(() =>
    loadSeenAlertKeys()
  );
  const [latestTelemetry, setLatestTelemetry] = useState<NYFedTelemetryResult | null>(null);

  const [historyData, setHistoryData] = useState<HistoricalTrendPoint[]>(() =>
    generateFallback30DayHistory()
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<{ variant: BadgeVariant; text: string } | null>(
    null
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScanningDeFi, setIsScanningDeFi] = useState(false);
  const [srfCeiling, setSrfCeiling] = useState(4.0);
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

  const notifSettingsRef = useRef(notifSettings);
  notifSettingsRef.current = notifSettings;

  const seenAlertKeysRef = useRef(seenAlertKeys);
  seenAlertKeysRef.current = seenAlertKeys;

  useEffect(() => {
    saveStoredState(state);
  }, [state]);

  useEffect(() => {
    saveStoredConnections(connections);
  }, [connections]);

  useEffect(() => {
    saveNotificationSettings(notifSettings);
  }, [notifSettings]);

  useEffect(() => {
    saveAlertLog(alertLog);
  }, [alertLog]);

  useEffect(() => {
    saveSeenAlertKeys(seenAlertKeys);
  }, [seenAlertKeys]);

  const metrics = useMemo(() => computeMacroMetrics(state), [state]);

  const unreadAlertCount = useMemo(
    () => alertLog.filter((entry) => !entry.read).length,
    [alertLog]
  );

  const processIncomingTelemetryAlerts = useCallback(
    async (telemetry: NYFedTelemetryResult, options?: { forceMorningPreview?: boolean; pushNtfy?: boolean }) => {
      const currentSettings = notifSettingsRef.current;
      const evaluation = evaluateFedTelemetryAlerts(
        telemetry,
        currentSettings,
        seenAlertKeysRef.current,
        { forceMorningPreview: options?.forceMorningPreview }
      );

      if (evaluation.newEntries.length === 0) {
        return;
      }

      setSeenAlertKeys(evaluation.updatedSeenKeys);
      seenAlertKeysRef.current = evaluation.updatedSeenKeys;

      setAlertLog((prev) => [...evaluation.newEntries, ...prev].slice(0, 30));

      for (const entry of evaluation.newEntries) {
        if (currentSettings.browserNotificationsEnabled) {
          sendBrowserNotification(entry.title, entry.body);
        }

        const shouldPushNtfy =
          Boolean(options?.pushNtfy) ||
          (currentSettings.autoPushFromBrowser && Boolean(currentSettings.ntfyTopic.trim()));

        if (shouldPushNtfy && currentSettings.ntfyTopic.trim()) {
          const isUrgent = entry.kind === 'breach';
          const res = await sendNtfyPush({
            topic: currentSettings.ntfyTopic,
            title: entry.title,
            message: `${entry.body}\n\n${entry.metricsSummary}`,
            priority: isUrgent ? 5 : 3,
            tags: isUrgent ? ['rotating_light', 'warning'] : ['sunny', 'chart_with_upwards_trend'],
          });
          if (options?.pushNtfy) {
            setPushFeedback(
              res.ok
                ? {
                    variant: BadgeVariant.Green,
                    text: `Morning briefing logged & pushed to ntfy topic "${currentSettings.ntfyTopic.trim()}".`,
                  }
                : {
                    variant: BadgeVariant.Red,
                    text: `Briefing logged locally, but ntfy push failed: ${res.error}`,
                  }
            );
          }
        } else if (options?.forceMorningPreview) {
          setPushFeedback({
            variant: BadgeVariant.Blue,
            text: 'Morning briefing generated from live NY Fed data and added to the Alert Log below.',
          });
        }
      }
    },
    []
  );

  const handleFetchNYFed = useCallback(async () => {
    try {
      const telemetry = await fetchNYFedTelemetry();
      if (telemetry) {
        setLatestTelemetry(telemetry);
        setState((prev) => ({
          ...prev,
          sofrRate: telemetry.sofrRate,
          effrRate: telemetry.effrRate,
          sofrSpreadBps: telemetry.sofrSpreadBps,
          sofrDailyChangeBps: telemetry.sofrDailyChangeBps,
          srfUsageBillions: telemetry.srfUsageBillions,
          monthOffset: calcRealMonthOffset(),
        }));
        setSrfCeiling(telemetry.srfRateCeiling);
        setSyncBadge({
          variant: BadgeVariant.Green,
          text: `NY Fed Live (${telemetry.effectiveDate})`,
        });
        await processIncomingTelemetryAlerts(telemetry);
      }
    } catch {
      setSyncBadge({
        variant: BadgeVariant.Amber,
        text: 'Cached Telemetry',
      });
    }
  }, [processIncomingTelemetryAlerts]);

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
      try {
        const hist = await fetchNYFed30DayHistory();
        if (hist && hist.length > 0) {
          setHistoryData(hist);
        }
      } catch {
        // Retain current series
      }
      if (connectionsRef.current.walletAddress.includes('0x')) {
        await handleScanDeFi(true);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [handleFetchNYFed, handleScanDeFi]);

  // Initial load + 30-minute background NY Fed telemetry poll while tab is open
  useEffect(() => {
    void handleRefreshAllFeeds();
    const intervalId = window.setInterval(() => {
      void handleFetchNYFed();
    }, THIRTY_MINUTES_MS);
    return () => window.clearInterval(intervalId);
  }, [handleRefreshAllFeeds, handleFetchNYFed]);

  const buildCurrentTelemetrySnapshot = useCallback((): NYFedTelemetryResult => {
    if (latestTelemetry) {
      return {
        ...latestTelemetry,
        sofrSpreadBps: state.sofrSpreadBps,
        srfUsageBillions: state.srfUsageBillions,
      };
    }
    const sofrRate = Number((state.effrRate + state.sofrSpreadBps / 100).toFixed(2));
    const delta = state.sofrDailyChangeBps ?? 0;
    return {
      sofrRate,
      prevSofrRate: Number((sofrRate - delta / 100).toFixed(2)),
      sofrDailyChangeBps: delta,
      effrRate: state.effrRate,
      sofrSpreadBps: state.sofrSpreadBps,
      srfUsageBillions: state.srfUsageBillions,
      srfRateCeiling: srfCeiling,
      effectiveDate: new Date().toISOString().split('T')[0],
    };
  }, [latestTelemetry, state, srfCeiling]);

  const handleSendTestPush = useCallback(async () => {
    const topic = notifSettingsRef.current.ntfyTopic.trim();
    if (!topic) {
      setPushFeedback({
        variant: BadgeVariant.Red,
        text: 'Enter or generate a private ntfy topic name first, then subscribe to it in the Android ntfy app.',
      });
      return;
    }

    setIsSendingTestPush(true);
    setPushFeedback(null);
    try {
      const snap = buildCurrentTelemetrySnapshot();
      const summary = formatMetricsSummary(snap, metrics.stressScore);
      const res = await sendNtfyPush({
        topic,
        title: 'Macro Command — Tablet Push Connected',
        message: `Test notification delivered cleanly.\nLive NY Fed Snapshot (${snap.effectiveDate}):\n${summary}`,
        priority: 3,
        tags: ['white_check_mark', 'bell'],
      });

      if (res.ok) {
        const testEntry: AlertLogEntry = {
          id: `test-${Date.now()}`,
          timestamp: new Date().toISOString(),
          effectiveDate: snap.effectiveDate,
          kind: 'test',
          severity: BadgeVariant.Green,
          title: 'Tablet Push Test Delivered',
          body: `Verified live HTTPS push delivery to ntfy.sh topic "${topic}". Tap notifications on your Galaxy Tab to jump straight back to the dashboard.`,
          metricsSummary: summary,
          read: true,
        };
        setAlertLog((prev) => [testEntry, ...prev].slice(0, 30));
        setPushFeedback({
          variant: BadgeVariant.Green,
          text: `Delivered to ntfy.sh/${topic}! Check your Samsung Galaxy Tab notification shade.`,
        });
      } else {
        setPushFeedback({
          variant: BadgeVariant.Red,
          text: `Push failed: ${res.error}`,
        });
      }
    } finally {
      setIsSendingTestPush(false);
    }
  }, [buildCurrentTelemetrySnapshot, metrics.stressScore]);

  const handlePreviewMorningBriefing = useCallback(
    async (alsoPushNtfy: boolean) => {
      setIsSendingTestPush(true);
      setPushFeedback(null);
      try {
        const snap = buildCurrentTelemetrySnapshot();
        await processIncomingTelemetryAlerts(snap, {
          forceMorningPreview: true,
          pushNtfy: alsoPushNtfy,
        });
      } finally {
        setIsSendingTestPush(false);
      }
    },
    [buildCurrentTelemetrySnapshot, processIncomingTelemetryAlerts]
  );

  const handleMarkAllAlertsRead = useCallback(() => {
    setAlertLog((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);

  const handleClearAlertLog = useCallback(() => {
    setAlertLog([]);
    setPushFeedback(null);
  }, []);

  const handleToggleNotifDrawer = useCallback(() => {
    setIsNotifOpen((prev) => {
      const next = !prev;
      if (next) {
        setAlertLog((logs) => logs.map((a) => ({ ...a, read: true })));
      }
      return next;
    });
  }, []);

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

  const handleExportJson = useCallback(() => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(stateRef.current, null, 2));
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

  const currentNotifReadings = {
    effectiveDate: latestTelemetry?.effectiveDate ?? 'Live',
    sofrRate: Number(metrics.impliedSofr),
    sofrDailyChangeBps: state.sofrDailyChangeBps ?? 0,
    sofrSpreadBps: state.sofrSpreadBps,
    srfUsageBillions: state.srfUsageBillions,
    stressScore: metrics.stressScore,
  };

  return (
    <main className="mx-auto max-w-[1180px] p-4">
      <Header
        monthName={metrics.monthName}
        monthOffset={state.monthOffset}
        syncBadge={syncBadge}
        activePhase={metrics.activePhase}
        phaseBannerText={metrics.phaseBannerText}
        isDrawerOpen={isDrawerOpen}
        isNotifOpen={isNotifOpen}
        unreadAlertCount={unreadAlertCount}
        isSyncing={isSyncing || isScanningDeFi}
        onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
        onToggleNotif={handleToggleNotifDrawer}
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

      <NotificationCenter
        isOpen={isNotifOpen}
        settings={notifSettings}
        alertLog={alertLog}
        currentReadings={currentNotifReadings}
        isSendingTest={isSendingTestPush}
        pushFeedback={pushFeedback}
        onChangeSettings={setNotifSettings}
        onSendTestPush={() => void handleSendTestPush()}
        onPreviewMorningBriefing={(alsoPush) => void handlePreviewMorningBriefing(alsoPush)}
        onMarkAllRead={handleMarkAllAlertsRead}
        onClearLog={handleClearAlertLog}
      />

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
        sofrDailyChangeBps={state.sofrDailyChangeBps ?? 0}
        srfUsageBillions={state.srfUsageBillions}
        srfRateCeiling={srfCeiling}
        stressScore={metrics.stressScore}
        stressColor={metrics.stressColor}
        stressSub={metrics.stressSub}
      />

      <HistoricalTrendChart data={historyData} isLoading={isSyncing} />

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
