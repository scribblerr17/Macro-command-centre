import React, { useState } from 'react';
import {
  BrowserPermissionStatus,
  createDefaultThresholds,
  generateRandomNtfyTopic,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
} from '../services/notificationEngine';
import {
  AlertLogEntry,
  BadgeVariant,
  NotificationSettings,
  NotificationThresholds,
} from '../types/macro';
import { Badge } from './Badge';

interface NotificationCenterProps {
  isOpen: boolean;
  settings: NotificationSettings;
  alertLog: AlertLogEntry[];
  currentReadings: {
    effectiveDate: string;
    sofrRate: number;
    sofrDailyChangeBps: number;
    sofrSpreadBps: number;
    srfUsageBillions: number;
    stressScore: number;
  };
  isSendingTest: boolean;
  pushFeedback: { variant: BadgeVariant; text: string } | null;
  onChangeSettings: (next: NotificationSettings) => void;
  onSendTestPush: () => void;
  onPreviewMorningBriefing: (alsoPushNtfy: boolean) => void;
  onMarkAllRead: () => void;
  onClearLog: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  settings,
  alertLog,
  currentReadings,
  isSendingTest,
  pushFeedback,
  onChangeSettings,
  onSendTestPush,
  onPreviewMorningBriefing,
  onMarkAllRead,
  onClearLog,
}) => {
  const [showTopic, setShowTopic] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [copiedField, setCopiedField] = useState<'topic' | 'secret' | null>(null);
  const [browserPerm, setBrowserPerm] = useState<BrowserPermissionStatus>(() =>
    getBrowserNotificationPermission()
  );

  if (!isOpen) return null;

  const updateThresholds = (patch: Partial<NotificationThresholds>) => {
    onChangeSettings({
      ...settings,
      thresholds: {
        ...settings.thresholds,
        ...patch,
      },
    });
  };

  const handleGenerateTopic = () => {
    const generated = generateRandomNtfyTopic();
    onChangeSettings({
      ...settings,
      ntfyTopic: generated,
    });
    setShowTopic(true);
  };

  const handleCopyText = (value: string, field: 'topic' | 'secret') => {
    if (!value || !navigator.clipboard) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => undefined);
  };

  const handleToggleBrowserNotifications = async () => {
    if (settings.browserNotificationsEnabled) {
      onChangeSettings({
        ...settings,
        browserNotificationsEnabled: false,
      });
      return;
    }

    const perm = await requestBrowserNotificationPermission();
    setBrowserPerm(perm);
    if (perm === 'granted') {
      onChangeSettings({
        ...settings,
        browserNotificationsEnabled: true,
      });
    }
  };

  const unreadCount = alertLog.filter((a) => !a.read).length;
  const { thresholds } = settings;
  const spreadSign = currentReadings.sofrSpreadBps >= 0 ? '+' : '';
  const jumpSign = currentReadings.sofrDailyChangeBps >= 0 ? '+' : '';

  const formatLogTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <section
      aria-label="NY Fed Notification Engine"
      className="mb-4 rounded-[10px] border border-[#38bdf8]/60 bg-[#111827] p-4"
    >
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[0.96rem] font-bold text-[#f8fafc]">
              🔔 NY Fed Macro Plumbing Notification Engine
            </h2>
            <Badge variant={settings.ntfyTopic.trim() ? BadgeVariant.Green : BadgeVariant.Blue}>
              {settings.ntfyTopic.trim() ? 'ntfy Topic Armed' : 'In-App Monitor Active'}
            </Badge>
            <span className="font-mono text-[0.72rem] text-[#94a3b8] tabular-nums">
              Effective Print: {currentReadings.effectiveDate}
            </span>
          </div>
          <p className="mt-0.5 text-[0.76rem] text-[#94a3b8]">
            Delivers weekday morning briefings &amp; urgent Fed plumbing stress alerts to your Galaxy Tab via free{' '}
            <span className="font-mono text-[#e2e8f0]">ntfy.sh</span> push + scheduled GitHub Actions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSetupGuide((prev) => !prev)}
          className="min-h-[38px] cursor-pointer rounded-[6px] border border-[#334155] bg-[#1e293b] px-3 py-1.5 text-[0.77rem] font-semibold text-[#38bdf8] transition-colors hover:border-[#38bdf8]"
        >
          {showSetupGuide ? '▾ Hide Galaxy Tab & GitHub Setup' : '▸ 24/7 Galaxy Tab & GitHub Setup (3 Steps)'}
        </button>
      </div>

      {showSetupGuide && (
        <div className="mb-4 rounded-[8px] border border-[#38bdf8]/35 bg-[#0b1120] p-3.5 text-[0.78rem] text-[#cbd5e1]">
          <div className="mb-2 font-bold uppercase tracking-[0.04em] text-[#38bdf8]">
            Zero-Server Background Push Setup (Works When Tablet Is Asleep)
          </div>
          <ol className="list-decimal space-y-2 pl-4">
            <li>
              <strong className="text-[#f8fafc]">Subscribe on Galaxy Tab:</strong> Install the free{' '}
              <span className="font-mono text-[#38bdf8]">ntfy</span> app on Android (Google Play / F-Droid), tap{' '}
              <span className="font-mono text-[#e2e8f0]">+</span>, and subscribe to your private topic below (use{' '}
              <em>Generate Private Topic</em> so nobody else can guess it).
            </li>
            <li>
              <strong className="text-[#f8fafc]">Add GitHub Repository Secret:</strong> In your GitHub repo, open{' '}
              <span className="font-mono text-[#e2e8f0]">Settings → Secrets and variables → Actions → New repository secret</span>.
              Set Name to{' '}
              <button
                type="button"
                onClick={() => handleCopyText('NTFY_TOPIC', 'secret')}
                className="inline-flex cursor-pointer items-center gap-1 rounded border border-[#334155] bg-[#1e293b] px-1.5 py-0.5 font-mono text-[0.73rem] text-[#38bdf8] hover:border-[#38bdf8]"
              >
                NTFY_TOPIC {copiedField === 'secret' ? '✓' : '📋'}
              </button>{' '}
              and Value to your exact topic string (never committed to public code).
            </li>
            <li>
              <strong className="text-[#f8fafc]">Automated Weekday Schedule:</strong> GitHub Actions runs{' '}
              <span className="font-mono text-[#e2e8f0]">NY Fed Macro Alert Monitor</span> every US banking weekday after the morning SOFR/EFFR release (Morning Briefing + Breach Check) and afternoon Standing Repo Facility settlement (Breach-Only Check), or anytime manually via{' '}
              <span className="font-mono text-[#e2e8f0]">Actions → Run workflow</span>.
            </li>
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Column: Delivery Channel + Test Console */}
        <div className="rounded-[8px] border border-[#334155] bg-[#0b1120] p-3.5 lg:col-span-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[0.8rem] font-bold uppercase tracking-[0.04em] text-[#f8fafc]">
              1. Delivery &amp; Tablet Test Console
            </h3>
            <button
              type="button"
              onClick={handleGenerateTopic}
              className="cursor-pointer rounded border border-[#334155] bg-[#1e293b] px-2 py-1 text-[0.71rem] font-semibold text-[#38bdf8] hover:border-[#38bdf8]"
            >
              🎲 Generate Private Topic
            </button>
          </div>

          <label className="mb-1 block text-[0.74rem] font-semibold text-[#94a3b8]">
            Private ntfy.sh Topic Name (Stored Only on This Device)
          </label>
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            <input
              type={showTopic ? 'text' : 'password'}
              value={settings.ntfyTopic}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  ntfyTopic: e.target.value,
                })
              }
              placeholder="e.g. macro-fed-plumbing-9a4f2c1b"
              className="min-h-[40px] min-w-[180px] flex-1 rounded-[6px] border border-[#334155] bg-[#111827] px-3 py-2 font-mono text-[0.8rem] text-[#f8fafc] focus:border-[#38bdf8] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowTopic((prev) => !prev)}
              className="min-h-[40px] cursor-pointer rounded-[6px] border border-[#334155] bg-[#1e293b] px-2.5 text-[0.75rem] font-semibold text-[#cbd5e1] hover:border-[#38bdf8]"
            >
              {showTopic ? 'Hide' : 'Show'}
            </button>
            <button
              type="button"
              disabled={!settings.ntfyTopic.trim()}
              onClick={() => handleCopyText(settings.ntfyTopic.trim(), 'topic')}
              className="min-h-[40px] cursor-pointer rounded-[6px] border border-[#334155] bg-[#1e293b] px-2.5 text-[0.75rem] font-semibold text-[#cbd5e1] hover:border-[#38bdf8] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {copiedField === 'topic' ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSendingTest}
              onClick={onSendTestPush}
              className="min-h-[40px] flex-1 cursor-pointer rounded-[6px] border border-[#38bdf8] bg-[#0284c7] px-3 py-2 text-[0.78rem] font-bold text-white transition-opacity hover:opacity-95 disabled:cursor-wait disabled:opacity-60"
            >
              {isSendingTest ? 'Sending Push...' : '📲 Send Test Push to Tablet'}
            </button>
            <button
              type="button"
              disabled={isSendingTest}
              onClick={() => onPreviewMorningBriefing(Boolean(settings.ntfyTopic.trim()))}
              className="min-h-[40px] flex-1 cursor-pointer rounded-[6px] border border-[#334155] bg-[#1e293b] px-3 py-2 text-[0.78rem] font-semibold text-[#f8fafc] transition-colors hover:border-[#38bdf8] disabled:cursor-wait disabled:opacity-60"
            >
              ☀️ Run Morning Briefing Now
            </button>
          </div>

          {pushFeedback && (
            <div
              className={`mb-3 rounded-[6px] border px-2.5 py-2 text-[0.75rem] ${
                pushFeedback.variant === BadgeVariant.Red
                  ? 'border-[#ef4444]/45 bg-[#ef4444]/15 text-[#fca5a5]'
                  : pushFeedback.variant === BadgeVariant.Green
                  ? 'border-[#10b981]/45 bg-[#10b981]/15 text-[#6ee7b7]'
                  : 'border-[#38bdf8]/45 bg-[#38bdf8]/15 text-[#38bdf8]'
              }`}
            >
              {pushFeedback.text}
            </div>
          )}

          <div className="space-y-2 border-t border-[#1e293b] pt-2.5 text-[0.76rem]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-[#e2e8f0]">Browser Tab Notifications</div>
                <div className="text-[0.7rem] text-[#94a3b8]">
                  {browserPerm === 'unsupported'
                    ? 'Web Notifications unavailable in this view — use ntfy push'
                    : browserPerm === 'denied'
                    ? 'Blocked in browser site settings — use ntfy push'
                    : 'Desktop/tablet banner while dashboard tab is open'}
                </div>
              </div>
              <button
                type="button"
                disabled={browserPerm === 'unsupported' || browserPerm === 'denied'}
                onClick={() => void handleToggleBrowserNotifications()}
                className={`min-h-[36px] shrink-0 cursor-pointer rounded-[6px] border px-2.5 py-1 text-[0.73rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  settings.browserNotificationsEnabled
                    ? 'border-[#10b981]/60 bg-[#10b981]/20 text-[#6ee7b7]'
                    : 'border-[#334155] bg-[#1e293b] text-[#cbd5e1] hover:border-[#38bdf8]'
                }`}
              >
                {settings.browserNotificationsEnabled ? 'Enabled' : 'Enable'}
              </button>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-2 pt-1">
              <div>
                <div className="font-semibold text-[#e2e8f0]">Auto-Push Browser Polls to ntfy</div>
                <div className="text-[0.7rem] text-[#94a3b8]">
                  Keep off if GitHub Actions is active to avoid duplicate pushes
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPushFromBrowser}
                onChange={(e) =>
                  onChangeSettings({
                    ...settings,
                    autoPushFromBrowser: e.target.checked,
                  })
                }
                className="h-4 w-4 cursor-pointer accent-[#38bdf8]"
              />
            </label>
          </div>
        </div>

        {/* Right Column: 5 NY Fed Alert Rules & Threshold Matrix */}
        <div className="rounded-[8px] border border-[#334155] bg-[#0b1120] p-3.5 lg:col-span-7">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[0.8rem] font-bold uppercase tracking-[0.04em] text-[#f8fafc]">
              2. NY Fed Alert Triggers &amp; Thresholds
            </h3>
            <button
              type="button"
              onClick={() => updateThresholds(createDefaultThresholds())}
              className="cursor-pointer rounded border border-[#334155] bg-[#1e293b] px-2.5 py-1 text-[0.71rem] font-semibold text-[#94a3b8] hover:border-[#38bdf8] hover:text-[#f8fafc]"
            >
              ↺ Restore Default Thresholds
            </button>
          </div>

          <div className="divide-y divide-[#1e293b] text-[0.78rem]">
            {/* Rule 1: Daily Morning Briefing */}
            <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={thresholds.morningBriefingEnabled}
                  onChange={(e) =>
                    updateThresholds({ morningBriefingEnabled: e.target.checked })
                  }
                  className="h-4 w-4 cursor-pointer accent-[#38bdf8]"
                />
                <div>
                  <div className="font-semibold text-[#f8fafc]">
                    Daily Morning Briefing (After NY Fed Print)
                  </div>
                  <div className="text-[0.71rem] text-[#94a3b8]">
                    Weekday summary of SOFR, 1D delta, EFFR spread, SRF volume &amp; Stress Score
                  </div>
                </div>
              </label>
              <span className="font-mono text-[0.74rem] text-[#38bdf8] tabular-nums">
                SOFR {currentReadings.sofrRate.toFixed(2)}%
              </span>
            </div>

            {/* Rule 2: SOFR - EFFR Spread */}
            <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={thresholds.spreadEnabled}
                  onChange={(e) => updateThresholds({ spreadEnabled: e.target.checked })}
                  className="h-4 w-4 cursor-pointer accent-[#38bdf8]"
                />
                <div>
                  <div className="font-semibold text-[#f8fafc]">SOFR − EFFR Spread Breach</div>
                  <div className="font-mono text-[0.71rem] text-[#94a3b8] tabular-nums">
                    Live: {spreadSign}
                    {currentReadings.sofrSpreadBps} bps
                  </div>
                </div>
              </label>
              <div className="flex items-center gap-1.5 font-mono tabular-nums">
                <span className="text-[0.73rem] text-[#94a3b8]">&ge; +</span>
                <input
                  type="number"
                  step={1}
                  min={1}
                  max={200}
                  value={thresholds.spreadBpsThreshold}
                  onChange={(e) =>
                    updateThresholds({
                      spreadBpsThreshold: Math.max(1, Number(e.target.value) || 0),
                    })
                  }
                  className="min-h-[36px] w-[68px] rounded border border-[#334155] bg-[#111827] px-2 py-1 text-right font-mono text-[0.8rem] text-[#f8fafc] tabular-nums focus:border-[#38bdf8] focus:outline-none"
                />
                <span className="w-[28px] text-[0.73rem] text-[#94a3b8]">bps</span>
              </div>
            </div>

            {/* Rule 3: Standing Repo Facility Usage */}
            <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={thresholds.srfEnabled}
                  onChange={(e) => updateThresholds({ srfEnabled: e.target.checked })}
                  className="h-4 w-4 cursor-pointer accent-[#38bdf8]"
                />
                <div>
                  <div className="font-semibold text-[#f8fafc]">
                    Standing Repo Facility (SRF) Surge
                  </div>
                  <div className="font-mono text-[0.71rem] text-[#94a3b8] tabular-nums">
                    Live: ${currentReadings.srfUsageBillions.toFixed(1)}B
                  </div>
                </div>
              </label>
              <div className="flex items-center gap-1.5 font-mono tabular-nums">
                <span className="text-[0.73rem] text-[#94a3b8]">&ge; $</span>
                <input
                  type="number"
                  step={1}
                  min={0.5}
                  max={500}
                  value={thresholds.srfBillionsThreshold}
                  onChange={(e) =>
                    updateThresholds({
                      srfBillionsThreshold: Math.max(0.5, Number(e.target.value) || 0),
                    })
                  }
                  className="min-h-[36px] w-[68px] rounded border border-[#334155] bg-[#111827] px-2 py-1 text-right font-mono text-[0.8rem] text-[#f8fafc] tabular-nums focus:border-[#38bdf8] focus:outline-none"
                />
                <span className="w-[28px] text-[0.73rem] text-[#94a3b8]">B</span>
              </div>
            </div>

            {/* Rule 4: Single-Day SOFR Jump */}
            <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={thresholds.sofrJumpEnabled}
                  onChange={(e) => updateThresholds({ sofrJumpEnabled: e.target.checked })}
                  className="h-4 w-4 cursor-pointer accent-[#38bdf8]"
                />
                <div>
                  <div className="font-semibold text-[#f8fafc]">Single-Day SOFR Rate Jump</div>
                  <div className="font-mono text-[0.71rem] text-[#94a3b8] tabular-nums">
                    Live 1D &Delta;: {jumpSign}
                    {currentReadings.sofrDailyChangeBps} bps
                  </div>
                </div>
              </label>
              <div className="flex items-center gap-1.5 font-mono tabular-nums">
                <span className="text-[0.73rem] text-[#94a3b8]">&ge; +</span>
                <input
                  type="number"
                  step={1}
                  min={1}
                  max={100}
                  value={thresholds.sofrJumpBpsThreshold}
                  onChange={(e) =>
                    updateThresholds({
                      sofrJumpBpsThreshold: Math.max(1, Number(e.target.value) || 0),
                    })
                  }
                  className="min-h-[36px] w-[68px] rounded border border-[#334155] bg-[#111827] px-2 py-1 text-right font-mono text-[0.8rem] text-[#f8fafc] tabular-nums focus:border-[#38bdf8] focus:outline-none"
                />
                <span className="w-[28px] text-[0.73rem] text-[#94a3b8]">bps</span>
              </div>
            </div>

            {/* Rule 5: Plumbing Stress Score */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={thresholds.stressScoreEnabled}
                  onChange={(e) => updateThresholds({ stressScoreEnabled: e.target.checked })}
                  className="h-4 w-4 cursor-pointer accent-[#38bdf8]"
                />
                <div>
                  <div className="font-semibold text-[#f8fafc]">Plumbing Stress Score Breach</div>
                  <div className="font-mono text-[0.71rem] text-[#94a3b8] tabular-nums">
                    Live Score: {currentReadings.stressScore} / 100
                  </div>
                </div>
              </label>
              <div className="flex items-center gap-1.5 font-mono tabular-nums">
                <span className="text-[0.73rem] text-[#94a3b8]">&ge;</span>
                <input
                  type="number"
                  step={1}
                  min={20}
                  max={100}
                  value={thresholds.stressScoreThreshold}
                  onChange={(e) =>
                    updateThresholds({
                      stressScoreThreshold: Math.min(100, Math.max(10, Number(e.target.value) || 0)),
                    })
                  }
                  className="min-h-[36px] w-[68px] rounded border border-[#334155] bg-[#111827] px-2 py-1 text-right font-mono text-[0.8rem] text-[#f8fafc] tabular-nums focus:border-[#38bdf8] focus:outline-none"
                />
                <span className="w-[28px] text-[0.73rem] text-[#94a3b8]">/100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Zone: Alert Feed & Dispatch History */}
      <div className="mt-4 rounded-[8px] border border-[#334155] bg-[#0b1120] p-3.5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-[0.8rem] font-bold uppercase tracking-[0.04em] text-[#f8fafc]">
              3. Recent Briefings &amp; Alert Log
            </h3>
            <span className="font-mono text-[0.72rem] text-[#94a3b8] tabular-nums">
              ({alertLog.length} logged{unreadCount > 0 ? `, ${unreadCount} new` : ''})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="cursor-pointer rounded border border-[#334155] bg-[#1e293b] px-2.5 py-1 text-[0.72rem] font-semibold text-[#38bdf8] hover:border-[#38bdf8]"
              >
                ✓ Mark All Read
              </button>
            )}
            {alertLog.length > 0 && (
              <button
                type="button"
                onClick={onClearLog}
                className="cursor-pointer rounded border border-[#334155] bg-[#1e293b] px-2.5 py-1 text-[0.72rem] font-semibold text-[#94a3b8] hover:border-[#ef4444] hover:text-[#fca5a5]"
              >
                Clear History
              </button>
            )}
          </div>
        </div>

        {alertLog.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-[#1e293b] bg-[#111827] px-3.5 py-3 text-[0.77rem] text-[#94a3b8]">
            <span>
              No alerts logged yet for this session. Morning briefings and NY Fed threshold breaches will appear here automatically.
            </span>
            <button
              type="button"
              onClick={() => onPreviewMorningBriefing(false)}
              className="cursor-pointer rounded-[6px] border border-[#334155] bg-[#1e293b] px-3 py-1.5 text-[0.75rem] font-semibold text-[#38bdf8] hover:border-[#38bdf8]"
            >
              Generate Briefing Snapshot
            </button>
          </div>
        ) : (
          <div className="max-h-[250px] space-y-2 overflow-y-auto pr-1">
            {alertLog.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-[6px] border px-3 py-2.5 text-[0.77rem] ${
                  entry.severity === BadgeVariant.Red
                    ? 'border-[#ef4444]/40 bg-[#ef4444]/10'
                    : entry.severity === BadgeVariant.Green
                    ? 'border-[#10b981]/35 bg-[#10b981]/10'
                    : 'border-[#1e293b] bg-[#111827]'
                }`}
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={entry.severity}>
                      {entry.kind === 'breach'
                        ? 'URGENT BREACH'
                        : entry.kind === 'test'
                        ? 'PUSH TEST'
                        : 'MORNING BRIEFING'}
                    </Badge>
                    <span className="font-bold text-[#f8fafc]">{entry.title}</span>
                    {!entry.read && (
                      <span className="rounded bg-[#38bdf8]/20 px-1.5 py-0.5 font-mono text-[0.66rem] font-bold text-[#38bdf8]">
                        NEW
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[0.7rem] text-[#94a3b8] tabular-nums">
                    {formatLogTimestamp(entry.timestamp)}
                  </span>
                </div>
                <p className="mb-1 text-[#cbd5e1]">{entry.body}</p>
                <div className="font-mono text-[0.7rem] text-[#94a3b8] tabular-nums">
                  {entry.metricsSummary}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
