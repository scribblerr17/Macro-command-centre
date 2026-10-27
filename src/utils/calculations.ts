import {
  BadgeVariant,
  BarAllocationItem,
  BucketCategory,
  ConnectionSettings,
  ContagionActionStep,
  ContagionMonitorState,
  CustodyHygiene,
  MacroState,
  Position,
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
    positions: [
      {
        id: 1,
        name: '1-3 Month Treasury Bills (3.88% Yield)',
        bucket: BucketCategory.DryPowder,
        custody: CustodyHygiene.DirectTreasury,
        value: 35000,
        apy: 3.88,
      },
      {
        id: 2,
        name: 'Bitcoin (Hardware Cold Storage)',
        bucket: BucketCategory.HardAssets,
        custody: CustodyHygiene.ColdSelfCustody,
        value: 40000,
        apy: 0,
      },
      {
        id: 3,
        name: 'Physical Bullion & Energy Equities',
        bucket: BucketCategory.Equities,
        custody: CustodyHygiene.DirectTreasury,
        value: 17000,
        apy: 2.5,
      },
    ],
  };
}

export function createDemoState(): MacroState {
  return {
    monthOffset: calcRealMonthOffset(),
    sofrRate: 3.9,
    effrRate: 3.88,
    sofrSpreadBps: 2,
    srfUsageBillions: 0.0,
    slrRelief: false,
    positions: [
      {
        id: 1,
        name: '1-3 Month Treasury Bills (US Treasury Direct)',
        bucket: BucketCategory.DryPowder,
        custody: CustodyHygiene.DirectTreasury,
        value: 35000,
        apy: 3.88,
      },
      {
        id: 2,
        name: 'Bitcoin (Cold Card Hardware Wallet)',
        bucket: BucketCategory.HardAssets,
        custody: CustodyHygiene.ColdSelfCustody,
        value: 42000,
        apy: 0,
      },
      {
        id: 3,
        name: 'Physical Gold & Energy Producers',
        bucket: BucketCategory.Equities,
        custody: CustodyHygiene.DirectTreasury,
        value: 18000,
        apy: 2.5,
      },
      {
        id: 4,
        name: 'Morpho Blue USDC Supply (MetaMorpho)',
        bucket: BucketCategory.SelfCustodyDeFi,
        custody: CustodyHygiene.ColdSelfCustody,
        value: 6000,
        apy: 8.9,
        utilization: 86.4,
        isMorpho: true,
      },
      {
        id: 5,
        name: 'Pendle PT-sUSDe Dec 2026 (Fixed APY)',
        bucket: BucketCategory.SelfCustodyDeFi,
        custody: CustodyHygiene.ColdSelfCustody,
        value: 6000,
        apy: 12.4,
        isMorpho: true,
      },
      {
        id: 6,
        name: 'Morpho Margin Borrow: USDC Debt (vs PT-sUSDe)',
        bucket: BucketCategory.MarginBorrow,
        custody: CustodyHygiene.ColdSelfCustody,
        value: 2500,
        apy: 5.2,
        ltv: 77.0,
        utilization: 88.5,
        isMorpho: true,
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
          positions: parsed.positions,
        };
      }
    }
  } catch {
    // Fallback
  }
  return createBaselineState();
}

export function saveStoredState(state: MacroState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors
  }
}

export function loadStoredConnections(): ConnectionSettings {
  try {
    const raw =
      window.localStorage.getItem(CONN_KEY) ||
      window.localStorage.getItem('macro_defi_conn_v6') ||
      window.localStorage.getItem('macro_defi_conn_v5');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ConnectionSettings>;
      return {
        walletAddress: parsed.walletAddress ?? '',
      };
    }
  } catch {
    // Fallback
  }
  return { walletAddress: '' };
}

export function saveStoredConnections(conn: ConnectionSettings): void {
  try {
    window.localStorage.setItem(CONN_KEY, JSON.stringify(conn));
  } catch {
    // Ignore quota errors
  }
}

export function formatMonthName(offset: number): string {
  const total = 2026 * 12 + 9 + offset;
  const y = Math.floor(total / 12);
  const m = total % 12;
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[m]} ${y}`;
}

export function encodeStateToShareUrl(state: MacroState): string {
  try {
    const minified = {
      m: state.monthOffset,
      sp: state.sofrSpreadBps,
      srf: state.srfUsageBillions,
      slr: state.slrRelief ? 1 : 0,
      pos: state.positions.map((p) => [
        p.name,
        p.bucket,
        p.custody,
        p.value,
        p.apy ?? null,
        p.ltv ?? null,
        p.utilization ?? null,
      ]),
    };
    const json = JSON.stringify(minified);
    const b64 = btoa(encodeURIComponent(json));
    const url = new URL(window.location.href);
    url.searchParams.set('p', b64);
    return url.toString();
  } catch {
    return window.location.href;
  }
}

export function decodeStateFromUrl(): Partial<MacroState> | null {
  try {
    const url = new URL(window.location.href);
    const b64 = url.searchParams.get('p');
    if (!b64) return null;
    const json = decodeURIComponent(atob(b64));
    const parsed = JSON.parse(json);
    if (parsed && Array.isArray(parsed.pos)) {
      const positions: Position[] = parsed.pos.map(
        (item: [string, string, string, number, number?, number?, number?], idx: number) => ({
          id: Date.now() + idx,
          name: item[0],
          bucket: item[1],
          custody: item[2],
          value: item[3],
          apy: typeof item[4] === 'number' ? item[4] : undefined,
          ltv: typeof item[5] === 'number' ? item[5] : undefined,
          utilization: typeof item[6] === 'number' ? item[6] : undefined,
          isMorpho: false,
        })
      );
      return {
        monthOffset: typeof parsed.m === 'number' ? parsed.m : 0,
        sofrSpreadBps: typeof parsed.sp === 'number' ? parsed.sp : 2,
        srfUsageBillions: typeof parsed.srf === 'number' ? parsed.srf : 0,
        slrRelief: Boolean(parsed.slr),
        positions,
      };
    }
  } catch {
    // Ignore malformed query param
  }
  return null;
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
  const defiVal = bucketTotals[BucketCategory.SelfCustodyDeFi] || 0;
  const netEquity = Math.max(1, grossAssets - borrowTotal);
  const directPct = Math.max(0, Math.round(((grossAssets - custodialVal) / Math.max(1, grossAssets)) * 100));

  // Auto-detect exposure characteristics from actual positions
  const hasBorrowDebt = borrowTotal > 0;
  const hasPtOrLoops = state.positions.some((p) =>
    /loop|pt[-_\s]|borrow|margin/i.test(p.name)
  );
  const hasLendingOrVaults = state.positions.some(
    (p) =>
      p.bucket === BucketCategory.SelfCustodyDeFi &&
      /morpho|lend|vault|merkl|pendle|usdc|usdt|dai|susde/i.test(p.name)
  );

  let targets: Record<BucketCategory, number> = {
    [BucketCategory.DryPowder]: 35,
    [BucketCategory.HardAssets]: 40,
    [BucketCategory.Equities]: 17,
    [BucketCategory.SelfCustodyDeFi]: 8,
    [BucketCategory.MarginBorrow]: 0,
  };

  if (activePhase === 2) {
    // If user has zero debt and pure spot/staking, keep safe DeFi allocation
    const defiTarget = hasBorrowDebt ? 0 : 4;
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

  // LEDGER-DRIVEN CONTAGION MONITOR WITH ACTIONABLE NUMBERED STEPS
  let contagionStatus: 'green' | 'amber' | 'red' = 'green';
  let contagionBadgeVariant = BadgeVariant.Green;
  let contagionBadgeText = 'Optimal Harvest';
  let strategyTitle = 'Stablecoin Lending & Yield (1x Unleveraged)';
  let detectedCategory = '1x Self-Custody Lending / Unleveraged Harvest';
  let exposureSummary = `$${defiVal.toLocaleString()} deployed in DeFi | $0 Borrow Debt`;
  let bodyText = '';
  const actionSteps: ContagionActionStep[] = [];

  if (hasBorrowDebt || (hasPtOrLoops && borrowTotal > 0)) {
    strategyTitle = 'Leveraged PT / Borrow Debt Detected (Morpho & PendleLoop)';
    detectedCategory = 'Active On-Chain Margin Debt';
    exposureSummary = `Active Borrow Debt: -$${borrowTotal.toLocaleString()} against $${defiVal.toLocaleString()} collateral`;

    if (activePhase === 2) {
      contagionStatus = 'red';
      contagionBadgeVariant = BadgeVariant.Red;
      contagionBadgeText = `Critical Unwind: -$${borrowTotal.toLocaleString()}`;
      bodyText = `REPO SHOCK IN PROGRESS (+${state.sofrSpreadBps} bps, $${state.srfUsageBillions.toFixed(1)}B SRF): Money market utilization spikes toward 100%, causing variable borrow rates to exceed fixed PT yields and forcing collateral liquidations.`;
      actionSteps.push(
        {
          stepNumber: 1,
          title: 'Unwind PT & Margin Loops Immediately',
          instruction: `Flash-unwind or close all $${borrowTotal.toLocaleString()} in borrowed stablecoins before lending market utilization hits 100% and halts withdrawals.`,
        },
        {
          stepNumber: 2,
          title: 'Redeem Stable Vaults to Spot Cold Storage',
          instruction: 'Withdraw underlying stablecoin liquidity into Spot Bitcoin (hardware cold storage) or physical gold/T-Bills.',
        },
        {
          stepNumber: 3,
          title: 'Zero Out Margin Debt to $0',
          instruction: 'Ensure 0% debt exposure so repo dealer freeze cascades cannot liquidate your core assets during volatility.',
        }
      );
    } else {
      contagionStatus = 'amber';
      contagionBadgeVariant = BadgeVariant.Amber;
      contagionBadgeText = `Leverage Active: -$${borrowTotal.toLocaleString()}`;
      bodyText = `Plumbing is currently calm (+${state.sofrSpreadBps} bps spread), but you have -$${borrowTotal.toLocaleString()} in active debt. Carry is positive today, but monitor overnight repo spreads closely.`;
      actionSteps.push(
        {
          stepNumber: 1,
          title: 'Track SOFR-EFFR Spread & Borrow Rates',
          instruction: 'Watch for SOFR spikes above +15 bps or SRF drawings above $25B, which signal early money-market tightness.',
        },
        {
          stepNumber: 2,
          title: 'Sweep Borrow Carry into Dry Powder',
          instruction: 'Harvest fixed PT yield differentials and sweep profits into 1–3M T-Bills or Cold BTC rather than increasing leverage.',
        },
        {
          stepNumber: 3,
          title: 'Prepare Pre-Set Unwind Limits',
          instruction: 'Keep Health Factor / LTV safely conservative (sub-65%) and have an unwind transaction prepared before Phase 2 hits.',
        }
      );
    }
  } else if (hasLendingOrVaults || defiVal > 0) {
    strategyTitle = 'Unleveraged Stablecoin Lending & Yield (Morpho, Pendle & Merkl)';
    detectedCategory = '1x Self-Custody Yield Sponge';
    exposureSummary = `$${defiVal.toLocaleString()} deployed in 1x DeFi Yield | $0 Borrow Debt`;

    if (activePhase === 2) {
      contagionStatus = 'red';
      contagionBadgeVariant = BadgeVariant.Red;
      contagionBadgeText = 'Repo Reserve Contagion Alert';
      bodyText = `REPO FREEZE WARNING: In Phase 2, stablecoin backing reserves (T-Bills and overnight reverse repos) face dealer redemption friction. Yield drops while redemption risk rises.`;
      actionSteps.push(
        {
          stepNumber: 1,
          title: 'Withdraw Vault Liquidity',
          instruction: `Exit $${defiVal.toLocaleString()} in Morpho MetaMorpho and stablecoin pools into native cash or direct T-Bills.`,
        },
        {
          stepNumber: 2,
          title: 'Rotate Into Discounted Hard Assets',
          instruction: 'Deploy freed dry powder into Spot Bitcoin and bullion during liquidation sell-offs.',
        },
        {
          stepNumber: 3,
          title: 'Hold 15% Safe Dry Powder Buffer',
          instruction: 'Maintain a minimum 15% buffer in direct 1–3M Treasury Bills until central bank QE is declared.',
        }
      );
    } else if (activePhase === 3) {
      contagionStatus = 'green';
      contagionBadgeVariant = BadgeVariant.Green;
      contagionBadgeText = 'QE Yield Sponge Active';
      bodyText = 'CENTRAL BANK QE EXPANSION ACTIVE: Overnight plumbing has been re-liquified. Ideal conditions for harvesting 1x unleveraged DeFi yield while riding scarce hard assets.';
      actionSteps.push(
        {
          stepNumber: 1,
          title: 'Re-Deploy Dry Powder into 1x Yield Vaults',
          instruction: 'Deploy 8% of portfolio into high-reputation MetaMorpho or fixed-yield Pendle PT pools.',
        },
        {
          stepNumber: 2,
          title: 'Channel Cash Flow Directly to Hard Assets',
          instruction: 'Sweep all generated yield into Spot BTC and real assets to compound during currency debasement.',
        },
        {
          stepNumber: 3,
          title: 'Maintain 100% Self-Custody Hygiene',
          instruction: 'Keep zero borrow leverage and store majority wealth in cold hardware storage.',
        }
      );
    } else {
      contagionStatus = 'green';
      contagionBadgeVariant = BadgeVariant.Green;
      contagionBadgeText = 'Optimal Harvest (~9–14% APY)';
      bodyText = `Overnight repo plumbing is calm (+${state.sofrSpreadBps} bps spread). You have $${defiVal.toLocaleString()} safely deployed without leverage.`;
      actionSteps.push(
        {
          stepNumber: 1,
          title: 'Harvest 1x Yield Spreads',
          instruction: `Earn ~9–14% APY across Morpho, Pendle PT, and Merkl without taking on debt or liquidation risk.`,
        },
        {
          stepNumber: 2,
          title: 'Sweep Yield into 1–3M Treasury Bills',
          instruction: 'Preserve dry powder buffer by sweeping monthly yields into direct US Treasury bills.',
        },
        {
          stepNumber: 3,
          title: 'Watch Standing Repo Facility (SRF)',
          instruction: 'If SRF usage breaches $25B, prepare to rotate vault liquidity to Spot BTC.',
        }
      );
    }
  } else {
    strategyTitle = 'Pure 1x Hard Assets & Treasury Direct (Zero Debt Link)';
    detectedCategory = 'Zero Plumbing Contagion / Full Self-Custody';
    exposureSummary = '$0 DeFi Exposure | $0 Borrow Debt | 100% Direct Assets';

    if (activePhase === 2) {
      contagionStatus = 'green';
      contagionBadgeVariant = BadgeVariant.Green;
      contagionBadgeText = 'Shielded from Liquidation';
      bodyText = 'ZERO PLUMBING CONTAGION: With zero on-chain borrow debt and zero stablecoin vault exposure, your portfolio is fully insulated from repo dealer freeze cascades.';
      actionSteps.push(
        {
          stepNumber: 1,
          title: 'Deploy T-Bill Dry Powder on Dips',
          instruction: 'Rotate dry powder down to 15% by buying Spot Bitcoin and bullion as forced liquidations occur.',
        },
        {
          stepNumber: 2,
          title: 'Keep Assets in Cold Hardware Storage',
          instruction: 'Ensure private keys remain offline to avoid exchange withdrawal halts.',
        }
      );
    } else if (activePhase === 3) {
      contagionStatus = 'green';
      contagionBadgeVariant = BadgeVariant.Green;
      contagionBadgeText = 'Max Scarce Assets';
      bodyText = 'QE EXPANSION: Central banks expanding balance sheet. Hard asset allocations (BTC & Gold) maximize purchasing power preservation.';
      actionSteps.push(
        {
          stepNumber: 1,
          title: 'Ride Hard Assets to 62%',
          instruction: 'Maintain 62% Hard Assets and 25% Equities while fiat liquidity floods the system.',
        },
        {
          stepNumber: 2,
          title: 'Optional: Deploy 8% to 1x DeFi Yield Sponge',
          instruction: 'If desired, allocate up to 8% in Morpho/Pendle PT for cash flow generation.',
        }
      );
    } else {
      contagionStatus = 'green';
      contagionBadgeVariant = BadgeVariant.Green;
      contagionBadgeText = 'Zero Debt Risk';
      bodyText = 'Calm plumbing conditions (+2 bps spread). Portfolio is defensively positioned in direct T-Bills, Bitcoin, and real assets with zero counterparty leverage.';
      actionSteps.push(
        {
          stepNumber: 1,
          title: 'Maintain 35% Dry Powder Yield',
          instruction: 'Earn ~3.88% risk-free yield in 1–3M T-Bills while awaiting repo liquidity signals.',
        },
        {
          stepNumber: 2,
          title: 'Optional: Deploy Small DeFi Harvest',
          instruction: 'Can deploy up to 8% in 1x Morpho or Pendle PT to boost overall portfolio yield.',
        }
      );
    }
  }

  const contagion: ContagionMonitorState = {
    status: contagionStatus,
    badgeVariant: contagionBadgeVariant,
    badgeText: contagionBadgeText,
    strategyTitle,
    detectedCategory,
    exposureSummary,
    body: bodyText,
    actionSteps,
  };

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
