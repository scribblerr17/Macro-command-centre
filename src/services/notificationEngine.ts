import {
  AlertLogEntry,
  BadgeVariant,
  NotificationSettings,
  NotificationThresholds,
} from '../types/macro';
import { NYFedTelemetryResult } from './telemetryService';

const NOTIF_SETTINGS_KEY = 'macro_defi_notif_settings_v1';
const ALERT_LOG_KEY = 'macro_defi_alert_log_v1';
const SEEN_ALERTS_KEY = 'macro_defi_seen_alerts_v1';
const MAX_ALERT_LOG_ENTRIES = 30;

export const DEFAULT_DASHBOARD_URL = 'https://scribblerr17.github.io/Macro-command-centre/';

export function createDefaultThresholds(): NotificationThresholds {
  return {
    morningBriefingEnabled: true,
    spreadEnabled: true,
    spreadBpsThreshold: 15,
    srfEnabled: true,
    srfBillionsThreshold: 25,
    sofrJumpEnabled: true,
    sofrJumpBpsThreshold: 5,
    stressScoreEnabled: true,
    stressScoreThreshold: 65,
  };
}

export function createDefaultNotificationSettings(): NotificationSettings {
  return {
    ntfyTopic: '',
    browserNotificationsEnabled: false,
    autoPushFromBrowser: false,
    thresholds: createDefaultThresholds(),
  };
}

export function loadNotificationSettings(): NotificationSettings {
  try {
    const raw = window.localStorage.getItem(NOTIF_SETTINGS_KEY);
    if (!raw) return createDefaultNotificationSettings();
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    const def = createDefaultNotificationSettings();
    return {
      ntfyTopic: typeof parsed.ntfyTopic === 'string' ? parsed.ntfyTopic : def.ntfyTopic,
      browserNotificationsEnabled: Boolean(parsed.browserNotificationsEnabled),
      autoPushFromBrowser: Boolean(parsed.autoPushFromBrowser),
      thresholds: {
        ...def.thresholds,
        ...(parsed.thresholds ?? {}),
      },
    };
  } catch {
    return createDefaultNotificationSettings();
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    window.localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadAlertLog(): AlertLogEntry[] {
  try {
    const raw = window.localStorage.getItem(ALERT_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AlertLogEntry[]).slice(0, MAX_ALERT_LOG_ENTRIES) : [];
  } catch {
    return [];
  }
}

export function saveAlertLog(entries: AlertLogEntry[]): void {
  try {
    window.localStorage.setItem(
      ALERT_LOG_KEY,
      JSON.stringify(entries.slice(0, MAX_ALERT_LOG_ENTRIES))
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSeenAlertKeys(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(SEEN_ALERTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function saveSeenAlertKeys(seen: Record<string, boolean>): void {
  try {
    // Prune if map exceeds 200 keys
    const keys = Object.keys(seen);
    const trimmed: Record<string, boolean> = {};
    const slice = keys.length > 200 ? keys.slice(keys.length - 150) : keys;
    slice.forEach((k) => {
      trimmed[k] = true;
    });
    window.localStorage.setItem(SEEN_ALERTS_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage quota errors
  }
}

export function generateRandomNtfyTopic(): string {
  const bytes = new Uint8Array(5);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `macro-fed-plumbing-${hex}`;
}

export function computePlumbingStressScore(
  sofrSpreadBps: number,
  srfUsageBillions: number
): number {
  const l1 = Math.min(10, Math.max(1, (sofrSpreadBps + 5) / 2.5));
  const l2 = Math.min(10, srfUsageBillions / 7.5);
  return Math.round((l1 * 0.4 + l2 * 0.3 + 7.8 * 0.3) * 10);
}

export function formatMetricsSummary(
  telemetry: NYFedTelemetryResult,
  stressScore: number
): string {
  const jumpSign = telemetry.sofrDailyChangeBps >= 0 ? '+' : '';
  const spreadSign = telemetry.sofrSpreadBps >= 0 ? '+' : '';
  return `SOFR ${telemetry.sofrRate.toFixed(2)}% (${jumpSign}${telemetry.sofrDailyChangeBps} bps d/d) | Spread ${spreadSign}${telemetry.sofrSpreadBps} bps | SRF $${telemetry.srfUsageBillions.toFixed(1)}B | Stress ${stressScore}/100`;
}

export interface AlertEvaluationResult {
  newEntries: AlertLogEntry[];
  updatedSeenKeys: Record<string, boolean>;
}

export function evaluateFedTelemetryAlerts(
  telemetry: NYFedTelemetryResult,
  settings: NotificationSettings,
  seenKeys: Record<string, boolean>,
  options?: { forceMorningPreview?: boolean }
): AlertEvaluationResult {
  const stressScore = computePlumbingStressScore(
    telemetry.sofrSpreadBps,
    telemetry.srfUsageBillions
  );
  const metricsSummary = formatMetricsSummary(telemetry, stressScore);
  const effectiveDate = telemetry.effectiveDate || new Date().toISOString().split('T')[0];
  const updatedSeenKeys: Record<string, boolean> = { ...seenKeys };
  const newEntries: AlertLogEntry[] = [];
  const { thresholds } = settings;

  const breachReasons: string[] = [];
  const newlyTriggeredBreachKeys: string[] = [];

  if (thresholds.spreadEnabled && telemetry.sofrSpreadBps >= thresholds.spreadBpsThreshold) {
    const key = `${effectiveDate}:spread:${thresholds.spreadBpsThreshold}`;
    if (!updatedSeenKeys[key]) {
      const sign = telemetry.sofrSpreadBps >= 0 ? '+' : '';
      breachReasons.push(
        `SOFR–EFFR spread reached ${sign}${telemetry.sofrSpreadBps} bps (threshold >= +${thresholds.spreadBpsThreshold} bps)`
      );
      newlyTriggeredBreachKeys.push(key);
    }
  }

  if (thresholds.srfEnabled && telemetry.srfUsageBillions >= thresholds.srfBillionsThreshold) {
    const key = `${effectiveDate}:srf:${thresholds.srfBillionsThreshold}`;
    if (!updatedSeenKeys[key]) {
      breachReasons.push(
        `NY Fed SRF usage surged to $${telemetry.srfUsageBillions.toFixed(1)}B (threshold >= $${thresholds.srfBillionsThreshold.toFixed(1)}B)`
      );
      newlyTriggeredBreachKeys.push(key);
    }
  }

  if (
    thresholds.sofrJumpEnabled &&
    telemetry.sofrDailyChangeBps >= thresholds.sofrJumpBpsThreshold
  ) {
    const key = `${effectiveDate}:jump:${thresholds.sofrJumpBpsThreshold}`;
    if (!updatedSeenKeys[key]) {
      breachReasons.push(
        `Single-day SOFR jumped +${telemetry.sofrDailyChangeBps} bps from ${telemetry.prevSofrRate.toFixed(2)}% to ${telemetry.sofrRate.toFixed(2)}% (threshold >= +${thresholds.sofrJumpBpsThreshold} bps)`
      );
      newlyTriggeredBreachKeys.push(key);
    }
  }

  if (thresholds.stressScoreEnabled && stressScore >= thresholds.stressScoreThreshold) {
    const key = `${effectiveDate}:stress:${thresholds.stressScoreThreshold}`;
    if (!updatedSeenKeys[key]) {
      breachReasons.push(
        `Plumbing Stress Score hit ${stressScore}/100 (threshold >= ${thresholds.stressScoreThreshold}/100)`
      );
      newlyTriggeredBreachKeys.push(key);
    }
  }

  if (breachReasons.length > 0) {
    newlyTriggeredBreachKeys.forEach((k) => {
      updatedSeenKeys[k] = true;
    });
    newEntries.push({
      id: `breach-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      effectiveDate,
      kind: 'breach',
      severity: BadgeVariant.Red,
      title: `NY Fed Plumbing Alert (${effectiveDate})`,
      body: `${breachReasons.join(' • ')}. Review DeFi borrow utilization, LTV buffers, and Treasury dry powder.`,
      metricsSummary,
      read: false,
    });
  }

  const briefingKey = `${effectiveDate}:morning_briefing`;
  if (
    options?.forceMorningPreview ||
    (thresholds.morningBriefingEnabled && !updatedSeenKeys[briefingKey])
  ) {
    if (!options?.forceMorningPreview) {
      updatedSeenKeys[briefingKey] = true;
    }

    const regimeLabel =
      stressScore >= 65
        ? 'Elevated Funding Tightness (Phase 2 Watch)'
        : stressScore >= 48
        ? 'Moderate Repo Pressure'
        : 'Calm Plumbing (Phase 1 Normal)';

    const jumpSign = telemetry.sofrDailyChangeBps >= 0 ? '+' : '';
    const spreadSign = telemetry.sofrSpreadBps >= 0 ? '+' : '';

    newEntries.push({
      id: `briefing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      effectiveDate,
      kind: 'briefing',
      severity: stressScore >= 65 ? BadgeVariant.Red : BadgeVariant.Blue,
      title: options?.forceMorningPreview
        ? `Morning Briefing Preview (${effectiveDate})`
        : `NY Fed Morning Briefing (${effectiveDate})`,
      body: `Regime: ${regimeLabel}. Overnight SOFR printed ${telemetry.sofrRate.toFixed(2)}% (${jumpSign}${telemetry.sofrDailyChangeBps} bps d/d) vs EFFR ${telemetry.effrRate.toFixed(2)}% (${spreadSign}${telemetry.sofrSpreadBps} bps spread). Standing Repo Facility accepted $${telemetry.srfUsageBillions.toFixed(1)}B at ${telemetry.srfRateCeiling.toFixed(2)}% ceiling.`,
      metricsSummary,
      read: false,
    });
  }

  return {
    newEntries,
    updatedSeenKeys,
  };
}

export interface NtfyPushPayload {
  topic: string;
  title: string;
  message: string;
  priority?: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
  clickUrl?: string;
}

export async function sendNtfyPush(payload: NtfyPushPayload): Promise<{ ok: boolean; error?: string }> {
  const cleanTopic = payload.topic.trim().replace(/^https?:\/\/ntfy\.sh\//i, '').replace(/^\/+/, '');
  if (!cleanTopic) {
    return { ok: false, error: 'Enter a private ntfy topic name first.' };
  }

  try {
    // Sending JSON body to root https://ntfy.sh without custom headers uses a CORS-safe simple POST request
    const res = await fetch('https://ntfy.sh', {
      method: 'POST',
      body: JSON.stringify({
        topic: cleanTopic,
        title: payload.title,
        message: payload.message,
        priority: payload.priority ?? 3,
        tags: payload.tags ?? ['chart_with_upwards_trend'],
        click: payload.clickUrl ?? DEFAULT_DASHBOARD_URL,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        ok: false,
        error: `ntfy.sh returned HTTP ${res.status}${errText ? `: ${errText.slice(0, 80)}` : ''}`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error reaching ntfy.sh',
    };
  }
}

export type BrowserPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function getBrowserNotificationPermission(): BrowserPermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserPermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await window.Notification.requestPermission();
    return result;
  } catch {
    return window.Notification.permission;
  }
}

export function sendBrowserNotification(title: string, body: string): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (window.Notification.permission !== 'granted') {
    return false;
  }
  try {
    new window.Notification(title, {
      body,
      tag: `nyfed-${Date.now()}`,
    });
    return true;
  } catch {
    // Fallback for mobile browsers that require ServiceWorkerRegistration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(title, { body }))
        .catch(() => undefined);
      return true;
    }
    return false;
  }
}
