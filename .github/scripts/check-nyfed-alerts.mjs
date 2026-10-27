#!/usr/bin/env node
/**
 * Headless NY Fed Macro Plumbing Alert Monitor
 * Executed by GitHub Actions (.github/workflows/fed-alerts.yml) on US banking weekdays.
 * Zero external runtime dependencies — uses Node 20+ native fetch.
 */

const DASHBOARD_URL =
  process.env.DASHBOARD_URL || 'https://scribblerr17.github.io/Macro-command-centre/';
const NTFY_TOPIC = (process.env.NTFY_TOPIC || '')
  .trim()
  .replace(/^https?:\/\/ntfy\.sh\//i, '')
  .replace(/^\/+/, '');
const ALERT_MODE = (process.env.ALERT_MODE || 'morning').toLowerCase(); // 'morning' | 'intraday' | 'test'
const IS_DRY_RUN = process.argv.includes('--dry-run');

const THRESHOLDS = {
  spreadBps: Number(process.env.SPREAD_BPS_THRESHOLD || 15),
  srfBillions: Number(process.env.SRF_BILLIONS_THRESHOLD || 25),
  sofrJumpBps: Number(process.env.SOFR_JUMP_BPS_THRESHOLD || 5),
  stressScore: Number(process.env.STRESS_SCORE_THRESHOLD || 65),
};

function computePlumbingStressScore(sofrSpreadBps, srfUsageBillions) {
  const l1 = Math.min(10, Math.max(1, (sofrSpreadBps + 5) / 2.5));
  const l2 = Math.min(10, srfUsageBillions / 7.5);
  return Math.round((l1 * 0.4 + l2 * 0.3 + 7.8 * 0.3) * 10);
}

async function fetchJsonWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLiveNYFedReadings() {
  const [sData, eData, rData] = await Promise.all([
    fetchJsonWithTimeout('https://markets.newyorkfed.org/api/rates/secured/sofr/last/2.json'),
    fetchJsonWithTimeout('https://markets.newyorkfed.org/api/rates/unsecured/effr/last/1.json'),
    fetchJsonWithTimeout('https://markets.newyorkfed.org/api/rp/all/all/results/last/5.json').catch(
      () => null
    ),
  ]);

  const sofrRate = parseFloat(sData?.refRates?.[0]?.percentRate);
  const prevSofrRaw = parseFloat(sData?.refRates?.[1]?.percentRate);
  const prevSofrRate = Number.isNaN(prevSofrRaw) ? sofrRate : prevSofrRaw;
  const effrRate = parseFloat(eData?.refRates?.[0]?.percentRate);

  if (Number.isNaN(sofrRate) || Number.isNaN(effrRate)) {
    throw new Error('Invalid SOFR or EFFR reading returned by NY Fed API');
  }

  const effectiveDate = String(sData?.refRates?.[0]?.effectiveDate || 'Live');
  const sofrSpreadBps = Math.round((sofrRate - effrRate) * 100);
  const sofrDailyChangeBps = Math.round((sofrRate - prevSofrRate) * 100);

  let srfUsageBillions = 0.0;
  let srfRateCeiling = 4.0;
  let latestRepoDate = effectiveDate;

  if (rData && Array.isArray(rData?.repo?.operations)) {
    const repoOps = rData.repo.operations.filter((o) => o?.operationType === 'Repo');
    if (repoOps.length > 0) {
      latestRepoDate = String(repoOps[0]?.operationDate || effectiveDate);
      const todayOps = repoOps.filter((o) => String(o?.operationDate || '') === latestRepoDate);
      const totalAccepted = todayOps.reduce(
        (sum, o) => sum + (Number(o?.totalAmtAccepted) || 0),
        0
      );
      srfUsageBillions = Math.round((totalAccepted / 1e9) * 10) / 10;

      const parsedCeiling = parseFloat(String(todayOps[0]?.details?.[0]?.percentOfferingRate || ''));
      if (!Number.isNaN(parsedCeiling) && parsedCeiling > 0) {
        srfRateCeiling = parsedCeiling;
      }
    }
  }

  const stressScore = computePlumbingStressScore(sofrSpreadBps, srfUsageBillions);

  return {
    effectiveDate,
    latestRepoDate,
    sofrRate,
    prevSofrRate,
    sofrDailyChangeBps,
    effrRate,
    sofrSpreadBps,
    srfUsageBillions,
    srfRateCeiling,
    stressScore,
  };
}

async function sendNtfyNotification({ title, message, priority, tags }) {
  if (IS_DRY_RUN) {
    console.log('\n[DRY RUN] Would publish to ntfy.sh:');
    console.log(JSON.stringify({ title, priority, tags, click: DASHBOARD_URL, message }, null, 2));
    return;
  }

  if (!NTFY_TOPIC) {
    console.log(
      '::warning::NTFY_TOPIC secret is not configured yet. Add NTFY_TOPIC in GitHub Settings -> Secrets and variables -> Actions to enable push delivery.'
    );
    console.log('Evaluated payload:', { title, priority, message });
    return;
  }

  const res = await fetch('https://ntfy.sh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: NTFY_TOPIC,
      title,
      message,
      priority,
      tags,
      click: DASHBOARD_URL,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`ntfy.sh publish failed with HTTP ${res.status}: ${errText}`);
  }

  console.log(`Successfully delivered push notification ("${title}") to configured ntfy topic.`);
}

async function main() {
  console.log(`Running NY Fed Macro Alert Monitor (mode=${ALERT_MODE}, dryRun=${IS_DRY_RUN})...`);
  const readings = await fetchLiveNYFedReadings();

  const jumpSign = readings.sofrDailyChangeBps >= 0 ? '+' : '';
  const spreadSign = readings.sofrSpreadBps >= 0 ? '+' : '';
  const metricsLine = `SOFR ${readings.sofrRate.toFixed(2)}% (${jumpSign}${readings.sofrDailyChangeBps} bps d/d) | Spread ${spreadSign}${readings.sofrSpreadBps} bps | SRF $${readings.srfUsageBillions.toFixed(1)}B | Stress ${readings.stressScore}/100`;

  console.log(`Live NY Fed Telemetry (${readings.effectiveDate}): ${metricsLine}`);

  const breaches = [];
  if (readings.sofrSpreadBps >= THRESHOLDS.spreadBps) {
    breaches.push(
      `SOFR-EFFR spread at ${spreadSign}${readings.sofrSpreadBps} bps (>= +${THRESHOLDS.spreadBps} bps)`
    );
  }
  if (readings.srfUsageBillions >= THRESHOLDS.srfBillions) {
    breaches.push(
      `Standing Repo Facility usage at $${readings.srfUsageBillions.toFixed(1)}B (>= $${THRESHOLDS.srfBillions.toFixed(1)}B)`
    );
  }
  if (readings.sofrDailyChangeBps >= THRESHOLDS.sofrJumpBps) {
    breaches.push(
      `1-Day SOFR jump of +${readings.sofrDailyChangeBps} bps from ${readings.prevSofrRate.toFixed(2)}% to ${readings.sofrRate.toFixed(2)}% (>= +${THRESHOLDS.sofrJumpBps} bps)`
    );
  }
  if (readings.stressScore >= THRESHOLDS.stressScore) {
    breaches.push(
      `Plumbing Stress Score at ${readings.stressScore}/100 (>= ${THRESHOLDS.stressScore}/100)`
    );
  }

  if (breaches.length > 0) {
    await sendNtfyNotification({
      title: `URGENT: NY Fed Liquidity Alert (${readings.effectiveDate})`,
      message: `${breaches.map((b) => `• ${b}`).join('\n')}\n\n${metricsLine}\nTap to open Macro Command & inspect DeFi borrow LTV.`,
      priority: 5,
      tags: ['rotating_light', 'warning'],
    });
    return;
  }

  if (ALERT_MODE === 'morning') {
    const regime =
      readings.stressScore >= 48 ? 'Moderate Repo Pressure' : 'Calm Plumbing (Phase 1)';
    await sendNtfyNotification({
      title: `NY Fed Morning Briefing (${readings.effectiveDate})`,
      message: `Regime: ${regime}\n• SOFR: ${readings.sofrRate.toFixed(2)}% (${jumpSign}${readings.sofrDailyChangeBps} bps d/d)\n• EFFR: ${readings.effrRate.toFixed(2)}% (Spread ${spreadSign}${readings.sofrSpreadBps} bps)\n• SRF Usage: $${readings.srfUsageBillions.toFixed(1)}B (${readings.srfRateCeiling.toFixed(2)}% ceiling)\n• Stress Score: ${readings.stressScore}/100`,
      priority: 3,
      tags: ['sunny', 'chart_with_upwards_trend'],
    });
    return;
  }

  if (ALERT_MODE === 'test') {
    await sendNtfyNotification({
      title: `GitHub Actions Fed Monitor Connected (${readings.effectiveDate})`,
      message: `Background push check succeeded! All 4 Fed stress triggers are currently nominal.\n\n${metricsLine}`,
      priority: 3,
      tags: ['white_check_mark', 'bell'],
    });
    return;
  }

  console.log(
    'Intraday breach-only check complete: all NY Fed readings within normal thresholds. No push sent.'
  );
}

main().catch((err) => {
  console.error('NY Fed Alert Monitor failed:', err);
  process.exitCode = 1;
});
