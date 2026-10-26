import {
  BadgeVariant,
  BarAllocationItem,
  BucketCategory,
  ConnectionSettings,
  ContagionMonitorState,
  CustodyHygiene,
  DeFiStrategy,
  MacroState,
  RebalanceDirectiveState,
} from '../types/macro';

export const STORAGE_KEY = 'macro_defi_command_v7';
export const CONN_KEY = 'macro_defi_conn_v7';

export const BUCKETS_ORDER: BucketCategory[] = [
  BucketCategory.DryPowder,
  BucketCategory.HardAssets,
  BucketCategory.Equities,
  BucketCategory.SelfCustodyDeFi,
  BucketCategory.MarginBorrow,
];

export function calcRealMonthOffset(): number {
  const now = new Date();
  const diff = (now.getFullYear() - 2026) * 12 + (now.getMonth() - 9);
  return Math.max(0, Math.min(36, diff));
}

export function createBaselineState(): MacroState {
  return {
    monthOffset: calcRealMonthOffset(),
    sofrRate: 3.9,
    effrRate: 3.88,
    sofrSpreadBps: 2,
    srfUsageBillions: 0.0,
    slrRelief: false,
    defiStrategy: DeFiStrategy.StableLp,
    positions: [
      {
        id: 1,
        name: '1-3 Month Treasury Bills (3.88% Yield)',
        bucket: BucketCategory.DryPowder,
        custody: CustodyHygiene.DirectTreasury,
        value: 35000,
      },
      {
        id: 2,
        name: 'Bitcoin (Hardware Cold Storage)',
        bucket: BucketCategory.HardAssets,
        custody: CustodyHygiene.ColdSelfCustody,
        value: 40000,
      },
      {
        id: 3,
        name: 'Physical Bullion & Energy Equities',
        bucket: BucketCategory.Equities,
        custody: CustodyHygiene.DirectTreasury,
        value: 17000,
      },
    ],
  };
}

export function loadStoredState(): MacroState {
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem('macro_defi_command_v6') ||
      window.localStorage.getItem('macro_defi_command_v5');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MacroState>;
      if (parsed && Array.isArray(parsed.positions)) {
        const baseline = createBaselineState();
        return {
          monthOffset: typeof parsed.monthOffset === 'number' ? parsed.monthOffset : baseline.monthOffset,
          sofrRate: typeof parsed.sofrRate === 'number' ? parsed.sofrRate : baseline.sofrRate,
          effrRate: typeof parsed.effrRate === 'number' ? parsed.effrRate : baseline.effrRate,
          sofrSpreadBps: typeof parsed.sofrSpreadBps === 'number' ? parsed.sofrSpreadBps : baseline.sofrSpreadBps,
          srfUsageBillions:
            typeof parsed.srfUsageBillions === 'number' ? parsed.srfUsageBillions : baseline.srfUsageBillions,
          slrRelief: Boolean(parsed.slrRelief),
          defiStrategy: (parsed.defiStrategy as DeFiStrategy) || baseline.defiStrategy,
          positions: parsed.positions,
        };
      }
    }
  } catch {
    // Fallback to baseline if storage is unavailable or malformed
  }
  return createBaselineState();
}

export function saveStoredState(state: MacroState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadStoredConnections(): ConnectionSettings {
  const defaultFbUrl = import.meta.env.VITE_DEFAULT_FIREBASE_DB_URL || '';
  try {
    const raw =
      window.localStorage.getItem(CONN_KEY) ||
      window.localStorage.getItem('macro_defi_conn_v6') ||
      window.localStorage.getItem('macro_defi_conn_v5');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ConnectionSettings>;
      return {
        firebaseUrl: parsed.firebaseUrl ?? defaultFbUrl,
        walletAddress: parsed.walletAddress ?? '',
      };
    }
  } catch {
    // Fallback to empty connection settings
  }
  return { firebaseUrl: defaultFbUrl, walletAddress: '' };
}

export function saveStoredConnections(conn: ConnectionSettings): void {
  try {
    window.localStorage.setItem(CONN_KEY, JSON.stringify(conn));
  } catch {
    // Ignore storage quota errors
  }
}

export function formatMonthName(offset: number): string {
  const total = 2026 * 12 + 9 + offset;
  const y = Math.floor(total / 12);
  const m = total % 12;
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[m]} ${y}`;
}

export function computeMacroMetrics(state: MacroState) {
  const monthName = formatMonthName(state.monthOffset);
  const spSign = state.sofrSpreadBps >= 0 ? '+' : '';

  const l1 = Math.min(10, Math.max(1, (state.sofrSpreadBps + 5) / 2.5));
  const l2 = Math.min(10, state.srfUsageBillions / 7.5);
  const stressScore = Math.round((l1 * 0.4 + l2 * 0.3 + 7.8 * 0.3) * 10);

  let activePhase: 1 | 2 | 3 = 1;
  if (state.slrRelief || state.monthOffset >= 21) {
    activePhase = 3;
  } else if (
    state.sofrSpreadBps >= 15 ||
    state.srfUsageBillions >= 25 ||
    (state.monthOffset >= 12 && state.monthOffset <= 20)
  ) {
    activePhase = 2;
  }

  let phaseBannerText = 'Phase 1: Liquidity Attrition — Harvest Safe Yield';
  if (activePhase === 2) {
    phaseBannerText = '⚠️ Phase 2: Forced Liquidation Shock — Deploy Dry Powder';
  } else if (activePhase === 3) {
    phaseBannerText = '🚀 Phase 3: Central Bank QE Pivot — Max Scarce Hard Assets';
  }

  const impliedSofr = (state.effrRate + state.sofrSpreadBps / 100).toFixed(2);

  let stressColor: 'red' | 'amber' | 'green' = 'green';
  let stressSub = 'Calm Plumbing — Phase 1';
  if (stressScore >= 65 || activePhase === 2) {
    stressColor = 'red';
    stressSub = 'Elevated Funding Tightness';
  } else if (stressScore >= 48) {
    stressColor = 'amber';
    stressSub = 'Moderate Repo Pressure';
  }

  const bucketTotals: Record<string, number> = {
    [BucketCategory.DryPowder]: 0,
    [BucketCategory.HardAssets]: 0,
    [BucketCategory.Equities]: 0,
    [BucketCategory.SelfCustodyDeFi]: 0,
    [BucketCategory.MarginBorrow]: 0,
  };
  let custodialVal = 0;

  state.positions.forEach((p) => {
    bucketTotals[p.bucket] = (bucketTotals[p.bucket] || 0) + p.value;
    if (p.custody === CustodyHygiene.CustodialExchange) {
      custodialVal += p.value;
    }
  });

  const grossAssets =
    bucketTotals[BucketCategory.DryPowder] +
    bucketTotals[BucketCategory.HardAssets] +
    bucketTotals[BucketCategory.Equities] +
    bucketTotals[BucketCategory.SelfCustodyDeFi];
  const borrowTotal = bucketTotals[BucketCategory.MarginBorrow] || 0;
  const netEquity = Math.max(1, grossAssets - borrowTotal);
  const directPct = Math.max(0, Math.round(((grossAssets - custodialVal) / Math.max(1, grossAssets)) * 100));

  let targets: Record<BucketCategory, number> = {
    [BucketCategory.DryPowder]: 35,
    [BucketCategory.HardAssets]: 40,
    [BucketCategory.Equities]: 17,
    [BucketCategory.SelfCustodyDeFi]: 8,
    [BucketCategory.MarginBorrow]: 0,
  };

  if (activePhase === 2) {
    const defiTarget = state.defiStrategy === DeFiStrategy.NativeStaking ? 8 : 0;
    targets = {
      [BucketCategory.DryPowder]: 15,
      [BucketCategory.HardAssets]: 60 - defiTarget,
      [BucketCategory.Equities]: 25,
      [BucketCategory.SelfCustodyDeFi]: defiTarget,
      [BucketCategory.MarginBorrow]: 0,
    };
  } else if (activePhase === 3) {
    targets = {
      [BucketCategory.DryPowder]: 5,
      [BucketCategory.HardAssets]: 62,
      [BucketCategory.Equities]: 25,
      [BucketCategory.SelfCustodyDeFi]: 8,
      [BucketCategory.MarginBorrow]: 0,
    };
  }

  const barItems: BarAllocationItem[] = BUCKETS_ORDER.map((b) => {
    const isDebt = b === BucketCategory.MarginBorrow;
    const val = bucketTotals[b] || 0;
    const actualPct = (val / Math.max(1, grossAssets)) * 100;
    const targetPct = targets[b];
    const drift = actualPct - targetPct;
    const driftTxt = drift >= 0 ? `+${drift.toFixed(1)}%` : `${drift.toFixed(1)}%`;
    return {
      bucket: b,
      isDebt,
      value: val,
      actualPct,
      targetPct,
      drift,
      driftTxt,
    };
  });

  const defiVal = bucketTotals[BucketCategory.SelfCustodyDeFi] || 0;
  let contagion: ContagionMonitorState;

  if (state.defiStrategy === DeFiStrategy.LoopedBorrow || borrowTotal > 10) {
    contagion = {
      status: 'red',
      badgeVariant: BadgeVariant.Red,
      badgeText: `Active Borrow: -$${borrowTotal.toLocaleString()}`,
      strategyTitle: 'PendleLoop / Morpho Leveraged PT (On-Chain Margin Debt)',
      body: `($${borrowTotal.toLocaleString()} borrowed against $${defiVal.toLocaleString()} DeFi/PT Collateral) WARNING: In a Phase 2 repo shock, money-market utilization hits 100% and borrow rates spike above fixed PT yield. Unwind loop leverage before Phase 2!`,
    };
  } else if (state.defiStrategy === DeFiStrategy.StableLp) {
    if (activePhase === 2) {
      contagion = {
        status: 'red',
        badgeVariant: BadgeVariant.Red,
        badgeText: 'Repo Reserve Contagion',
        strategyTitle: 'Stablecoin Lending / LP (Morpho, Pendle PT/LP, Merkl)',
        body: `($${defiVal.toLocaleString()} exposed) REPO FREEZE ALERT: Stablecoin T-Bill/repo reserves face redemption gates during dealer stress. Withdraw vault liquidity and rotate to Spot BTC.`,
      };
    } else {
      contagion = {
        status: 'green',
        badgeVariant: BadgeVariant.Green,
        badgeText: 'Optimal Harvest (~9–14% APY)',
        strategyTitle: 'Stablecoin Lending / LP (Morpho, Pendle PT/LP, Merkl)',
        body: `($${defiVal.toLocaleString()} deployed) Plumbing is calm (+${state.sofrSpreadBps} bps spread). Safe to harvest unleveraged 1x Morpho, Pendle, and Merkl yield while watching SRF usage.`,
      };
    }
  } else if (state.defiStrategy === DeFiStrategy.PerpFunding) {
    contagion = {
      status: activePhase === 2 ? 'amber' : 'green',
      badgeVariant: activePhase === 2 ? BadgeVariant.Amber : BadgeVariant.Green,
      badgeText: activePhase === 2 ? 'Funding Flip Warning' : 'Optimal Harvest (~14% APY)',
      strategyTitle: 'Perp DEX Vault / Delta-Neutral (1x Self-Custody)',
      body:
        activePhase === 2
          ? `($${defiVal.toLocaleString()} exposed) Negative funding flip & trader short PnL drawdown during forced liquidations. Unwind delta-neutral vaults into Spot BTC.`
          : `($${defiVal.toLocaleString()} deployed) Positive funding carry in calm plumbing. Harvest cash flow and sweep profits into Cold BTC or T-Bills.`,
    };
  } else {
    contagion = {
      status: 'green',
      badgeVariant: BadgeVariant.Green,
      badgeText: 'Zero Plumbing Contagion',
      strategyTitle: 'Native 1x Spot Staking (Zero Fiat/Debt Link)',
      body: `($${defiVal.toLocaleString()} deployed) No liquidation threshold and zero stablecoin reserve backing. Behaves as pure Hard Asset through all 3 phases.`,
    };
  }

  let maxDrift = 0;
  BUCKETS_ORDER.forEach((b) => {
    const actualPct = ((bucketTotals[b] || 0) / Math.max(1, grossAssets)) * 100;
    const d = Math.abs(actualPct - targets[b]);
    if (d > maxDrift) maxDrift = d;
  });

  let directive: RebalanceDirectiveState;
  if (activePhase === 2) {
    directive = {
      status: 'red',
      maxDriftTxt: `Max Drift: ${maxDrift.toFixed(1)}%`,
      title: 'Deploy T-Bill Dry Powder & Unwind PT Loops',
      body: `Repo shock active (SOFR spread ${spSign}${state.sofrSpreadBps} bps, SRF $${state.srfUsageBillions.toFixed(1)}B). Clear Margin/Borrow debt to $0 and rotate Dry Powder down to 15% into spot Bitcoin & Bullion.`,
    };
  } else if (activePhase === 3) {
    directive = {
      status: 'green',
      maxDriftTxt: `Max Drift: ${maxDrift.toFixed(1)}%`,
      title: 'Central Bank Liquidity Wave Active — Maximize Hard Assets',
      body: `SLR relief / QE expansion active. Rotate remaining T-Bill Dry Powder down to 5% and ride 62% Hard Assets + 8% DeFi yield sponge.`,
    };
  } else {
    directive = {
      status: 'green',
      maxDriftTxt: `Max Drift: ${maxDrift.toFixed(1)}%`,
      title: 'Maintain Phase 1 Dry Powder Buffer & Harvest Yield',
      body: `Overnight repo is calm (${spSign}${state.sofrSpreadBps} bps). Keep Dry Powder near 35% in 1–3M T-Bills and Core Cold BTC at 40% while harvesting Morpho, PendleLoop & Merkl yield.`,
    };
  }

  return {
    monthName,
    spSign,
    stressScore,
    activePhase,
    phaseBannerText,
    impliedSofr,
    stressColor,
    stressSub,
    grossAssets,
    borrowTotal,
    netEquity,
    directPct,
    barItems,
    contagion,
    directive,
  };
}
