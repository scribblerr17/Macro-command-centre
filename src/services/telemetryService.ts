import {
  BucketCategory,
  CustodyHygiene,
  MacroState,
  Position,
} from '../types/macro';

export interface NYFedTelemetryResult {
  sofrRate: number;
  effrRate: number;
  sofrSpreadBps: number;
  effectiveDate: string;
}

export interface DeFiScanResult {
  rows: Position[];
  totalSup: number;
  totalBor: number;
  counts: {
    morpho: number;
    pendle: number;
    merkl: number;
  };
}

export async function fetchNYFedTelemetry(): Promise<NYFedTelemetryResult | null> {
  const [sofrRes, effrRes] = await Promise.all([
    fetch('https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json'),
    fetch('https://markets.newyorkfed.org/api/rates/unsecured/effr/last/1.json'),
  ]);
  const sData = await sofrRes.json();
  const eData = await effrRes.json();
  const sRate = parseFloat(sData?.refRates?.[0]?.percentRate);
  const eRate = parseFloat(eData?.refRates?.[0]?.percentRate);
  if (!Number.isNaN(sRate) && !Number.isNaN(eRate)) {
    return {
      sofrRate: sRate,
      effrRate: eRate,
      sofrSpreadBps: Math.round((sRate - eRate) * 100),
      effectiveDate: String(sData?.refRates?.[0]?.effectiveDate || 'Live'),
    };
  }
  return null;
}

export function parseWalletAddresses(rawInput: string): string[] {
  return rawInput
    .trim()
    .split(/[\s,]+/)
    .filter((a) => a.startsWith('0x') && a.length >= 40);
}

// Unified Morpho + PendleLoop + Pendle V2 + Aave V3 Loop + Merkl V4 Scanner
export async function scanEthereumDeFiPositions(addresses: string[]): Promise<DeFiScanResult> {
  const newDeFiRows: Position[] = [];
  let totalSup = 0;
  let totalBor = 0;
  const counts = { morpho: 0, pendle: 0, merkl: 0 };

  const symMap: Record<string, string> = {};
  const priceMap: Record<string, number> = {};

  try {
    const assetsRes = await fetch('https://api-v2.pendle.finance/core/v1/1/assets/all');
    if (assetsRes.ok) {
      const aJson = await assetsRes.json();
      const assetsList = Array.isArray(aJson?.assets) ? aJson.assets : Array.isArray(aJson) ? aJson : [];
      assetsList.forEach((a: Record<string, unknown>) => {
        const ad = String(a?.address || '').toLowerCase();
        if (ad) {
          symMap[ad] = String(a.symbol || a.name || 'Pendle');
          const priceField = a?.price as Record<string, unknown> | number | string | undefined;
          const rawPrice =
            typeof priceField === 'object' && priceField !== null ? priceField.usd : priceField;
          priceMap[ad] = parseFloat(String(rawPrice ?? 0)) || 0;
        }
      });
    }
  } catch {
    // Non-fatal: proceed without Pendle symbol pre-lookup
  }

  for (const addr of addresses) {
    const lowerAddr = addr.toLowerCase();

    // 1. MORPHO BLUE (Ethereum Mainnet V1 Vaults, V2 Vaults & Markets)
    try {
      const morphoQuery = `
        query GetDetailedMorphoEth($address: String!) {
          userByAddress(chainId: 1, address: $address) {
            vaultPositions { state { assetsUsd } vault { name symbol asset { symbol } } }
            vaultV2Positions { assetsUsd vault { name symbol asset { symbol } } }
            marketPositions {
              state { supplyAssetsUsd borrowAssetsUsd collateralUsd }
              market { loanAsset { symbol address } collateralAsset { symbol address } }
            }
          }
        }
      `;
      const res = await fetch('https://api.morpho.org/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: morphoQuery, variables: { address: addr } }),
      });
      const json = await res.json();
      const user = json?.data?.userByAddress;

      if (user) {
        (user.vaultPositions || []).forEach((v: Record<string, unknown>, idx: number) => {
          const stateObj = v?.state as Record<string, unknown> | undefined;
          const vaultObj = v?.vault as Record<string, unknown> | undefined;
          const assetObj = vaultObj?.asset as Record<string, unknown> | undefined;
          const usd = Math.round(parseFloat(String(stateObj?.assetsUsd || 0)));
          if (usd > 1) {
            totalSup += usd;
            counts.morpho++;
            const sym = String(assetObj?.symbol || vaultObj?.symbol || 'Vault');
            newDeFiRows.push({
              id: Date.now() + idx + 1,
              name: `Morpho Vault Lend: ${String(vaultObj?.name || sym)} (${sym})`,
              bucket: BucketCategory.SelfCustodyDeFi,
              custody: CustodyHygiene.ColdSelfCustody,
              value: usd,
              isMorpho: true,
            });
          }
        });

        (user.vaultV2Positions || []).forEach((v2: Record<string, unknown>, idx: number) => {
          const vaultObj = v2?.vault as Record<string, unknown> | undefined;
          const assetObj = vaultObj?.asset as Record<string, unknown> | undefined;
          const usd = Math.round(parseFloat(String(v2?.assetsUsd || 0)));
          if (usd > 1) {
            totalSup += usd;
            counts.morpho++;
            const sym = String(assetObj?.symbol || vaultObj?.symbol || 'Vault V2');
            newDeFiRows.push({
              id: Date.now() + idx + 100,
              name: `Morpho V2 Lend: ${String(vaultObj?.name || sym)} (${sym})`,
              bucket: BucketCategory.SelfCustodyDeFi,
              custody: CustodyHygiene.ColdSelfCustody,
              value: usd,
              isMorpho: true,
            });
          }
        });

        (user.marketPositions || []).forEach((m: Record<string, unknown>, idx: number) => {
          const marketObj = m?.market as Record<string, unknown> | undefined;
          const loanAsset = marketObj?.loanAsset as Record<string, unknown> | undefined;
          const collateralAsset = marketObj?.collateralAsset as Record<string, unknown> | undefined;
          const stateObj = m?.state as Record<string, unknown> | undefined;

          const loanSym = String(loanAsset?.symbol || 'Loan');
          const collAddr = String(collateralAsset?.address || '').toLowerCase();
          const collSym = String(collateralAsset?.symbol || symMap[collAddr] || 'Collateral');
          const pair = `${collSym}/${loanSym}`;
          const isPendlePt = /^PT[-_]|^YT[-_]|PENDLE/i.test(collSym);

          const supUsd = Math.round(parseFloat(String(stateObj?.supplyAssetsUsd || 0)));
          const colUsd = Math.round(parseFloat(String(stateObj?.collateralUsd || 0)));
          const borUsd = Math.round(parseFloat(String(stateObj?.borrowAssetsUsd || 0)));

          if (supUsd > 1) {
            totalSup += supUsd;
            counts.morpho++;
            newDeFiRows.push({
              id: Date.now() + idx + 200,
              name: `Morpho Market Lend: ${loanSym} (${pair})`,
              bucket: BucketCategory.SelfCustodyDeFi,
              custody: CustodyHygiene.ColdSelfCustody,
              value: supUsd,
              isMorpho: true,
            });
          }
          if (colUsd > 1) {
            totalSup += colUsd;
            if (isPendlePt) counts.pendle++;
            else counts.morpho++;
            const isHardCol = ['WBTC', 'CBBTC', 'TBTC', 'WETH', 'WSTETH', 'RETH', 'WEETH'].includes(
              collSym.toUpperCase()
            );
            newDeFiRows.push({
              id: Date.now() + idx + 300,
              name: isPendlePt
                ? `PendleLoop PT Collateral (Morpho): ${collSym}`
                : `Morpho Collateral: ${collSym} (in ${pair})`,
              bucket: isHardCol ? BucketCategory.HardAssets : BucketCategory.SelfCustodyDeFi,
              custody: CustodyHygiene.ColdSelfCustody,
              value: colUsd,
              isMorpho: true,
            });
          }
          if (borUsd > 1) {
            totalBor += borUsd;
            counts.morpho++;
            newDeFiRows.push({
              id: Date.now() + idx + 400,
              name: isPendlePt
                ? `PendleLoop Borrow Debt (Morpho): ${loanSym} vs ${collSym}`
                : `Morpho Margin Borrow: ${loanSym} Debt (vs ${collSym})`,
              bucket: BucketCategory.MarginBorrow,
              custody: CustodyHygiene.ColdSelfCustody,
              value: borUsd,
              isMorpho: true,
            });
          }
        });
      }
    } catch (e) {
      console.warn('Morpho scan error:', e);
    }

    // 2A. PENDLELOOP DEDICATED ENDPOINT (/core/v1/pt-looping/loop/positions)
    try {
      const loopUrls = [
        `https://api-v2.pendle.finance/core/v1/pt-looping/loop/positions?owner=${addr}&chainId=1`,
        `https://api-v2.pendle.finance/core/v1/pt-looping/loop/positions?userAddress=${addr}&chainId=1`,
        `https://api-v2.pendle.finance/core/v1/pt-looping/loop/positions?owner=${lowerAddr}`,
      ];
      let loopData: Record<string, unknown>[] | null = null;
      for (const u of loopUrls) {
        const r = await fetch(u).catch(() => null);
        if (r && r.ok) {
          const j = await r.json();
          const arr = Array.isArray(j)
            ? j
            : j?.positions || j?.results || j?.items || j?.data || [];
          if (Array.isArray(arr) && arr.length > 0) {
            loopData = arr;
            break;
          }
        }
      }

      if (loopData) {
        loopData.forEach((lp, idx) => {
          const ptObj = lp?.pt as Record<string, unknown> | undefined;
          const debtTokenObj = lp?.debtToken as Record<string, unknown> | undefined;
          const ptAddr = String(lp?.ptAddress || lp?.collateralAsset || ptObj?.address || '').toLowerCase();
          const ptSym = String(lp?.ptSymbol || ptObj?.symbol || symMap[ptAddr] || 'PT-Loop');
          const debtSym = String(lp?.debtSymbol || debtTokenObj?.symbol || 'Stable Debt');

          const colUsd = Math.round(
            parseFloat(
              String(
                lp?.collateralUsd ??
                  lp?.supplyUsd ??
                  lp?.ptValuationUsd ??
                  lp?.totalSupplyUsd ??
                  lp?.netValueUsd ??
                  0
              )
            )
          );
          const debtUsd = Math.round(
            parseFloat(String(lp?.debtUsd ?? lp?.borrowUsd ?? lp?.totalDebtUsd ?? 0))
          );

          const alreadyInMorpho = newDeFiRows.some(
            (r) => r.name.includes(ptSym) && Math.abs(r.value - colUsd) < 50
          );
          if (!alreadyInMorpho && colUsd > 1) {
            totalSup += colUsd;
            counts.pendle++;
            newDeFiRows.push({
              id: Date.now() + 450 + idx,
              name: `PendleLoop Leveraged PT: ${ptSym}`,
              bucket: BucketCategory.SelfCustodyDeFi,
              custody: CustodyHygiene.ColdSelfCustody,
              value: colUsd,
              isMorpho: true,
            });
          }
          if (!alreadyInMorpho && debtUsd > 1) {
            totalBor += debtUsd;
            newDeFiRows.push({
              id: Date.now() + 480 + idx,
              name: `PendleLoop Borrow Debt: ${debtSym} (vs ${ptSym})`,
              bucket: BucketCategory.MarginBorrow,
              custody: CustodyHygiene.ColdSelfCustody,
              value: debtUsd,
              isMorpho: true,
            });
          }
        });
      }
    } catch (e) {
      console.warn('PendleLoop endpoint error:', e);
    }

    // 2B. PENDLE V2 SPOT DASHBOARD POSITIONS
    try {
      const extractUsd = (obj: unknown, tokenAddr: string): number => {
        if (!obj) return 0;
        if (typeof obj === 'number') return obj;
        const rec = obj as Record<string, unknown>;
        const v = rec.valuation ?? rec.valuationUsd ?? rec.usdValue ?? rec.balanceUsd ?? rec.value;
        if (typeof v === 'number') return v;
        if (v && typeof v === 'object') {
          const vObj = v as Record<string, unknown>;
          return parseFloat(String(vObj.usd ?? vObj.total ?? vObj.value ?? vObj.amount ?? 0)) || 0;
        }
        const numV = parseFloat(String(v));
        if (!Number.isNaN(numV) && numV > 0) return numV;
        const bal = parseFloat(String(rec.balance ?? rec.activeBalance ?? rec.amount ?? 0));
        const p = priceMap[String(tokenAddr || rec.address || '').toLowerCase()] || 0;
        return bal > 0 && p > 0 ? bal * p : 0;
      };

      const posRes = await fetch(
        `https://api-v2.pendle.finance/core/v1/dashboard/positions/database/${addr}?filterUsd=0.5`
      )
        .then((r) =>
          r.ok
            ? r
            : fetch(
                `https://api-v2.pendle.finance/core/v1/dashboard/positions/database/${lowerAddr}?filterUsd=0.5`
              )
        )
        .catch(() => null);

      if (posRes && posRes.ok) {
        const pData = await posRes.json();
        const topList: Record<string, unknown>[] = Array.isArray(pData)
          ? pData
          : pData?.positions || pData?.results || [pData];
        let pIdx = 0;

        topList.forEach((group) => {
          const openList: Record<string, unknown>[] = [
            ...(Array.isArray(group?.openPositions) ? group.openPositions : []),
            ...(Array.isArray(group?.syPositions) ? group.syPositions : []),
            ...(Array.isArray(group?.positions) ? group.positions : []),
            ...(group?.lp || group?.pt || group?.yt ? [group] : []),
          ];
          openList.forEach((pos) => {
            const rawId = String(
              pos?.marketId || pos?.syId || pos?.marketAddress || pos?.address || ''
            ).toLowerCase();
            const cleanAddr = (rawId.includes('-') ? rawId.split('-').pop() : rawId) || '';
            const mktLabel = String(
              pos?.symbol || pos?.name || symMap[cleanAddr] || (cleanAddr ? cleanAddr.slice(0, 8) : 'Pendle')
            );

            const ptUsd = Math.round(extractUsd(pos?.pt, cleanAddr));
            const ytUsd = Math.round(extractUsd(pos?.yt, cleanAddr));
            const lpUsd = Math.round(extractUsd(pos?.lp, cleanAddr));
            const directUsd = Math.round(extractUsd(pos, cleanAddr));

            if (ptUsd > 1) {
              totalSup += ptUsd;
              counts.pendle++;
              pIdx++;
              newDeFiRows.push({
                id: Date.now() + 500 + pIdx,
                name: `Pendle PT (Fixed Yield): ${mktLabel}`,
                bucket: BucketCategory.SelfCustodyDeFi,
                custody: CustodyHygiene.ColdSelfCustody,
                value: ptUsd,
                isMorpho: true,
              });
            }
            if (ytUsd > 1) {
              totalSup += ytUsd;
              counts.pendle++;
              pIdx++;
              newDeFiRows.push({
                id: Date.now() + 500 + pIdx,
                name: `Pendle YT (Yield Token): ${mktLabel}`,
                bucket: BucketCategory.SelfCustodyDeFi,
                custody: CustodyHygiene.ColdSelfCustody,
                value: ytUsd,
                isMorpho: true,
              });
            }
            if (lpUsd > 1) {
              totalSup += lpUsd;
              counts.pendle++;
              pIdx++;
              newDeFiRows.push({
                id: Date.now() + 500 + pIdx,
                name: `Pendle LP Pool: ${mktLabel}`,
                bucket: BucketCategory.SelfCustodyDeFi,
                custody: CustodyHygiene.ColdSelfCustody,
                value: lpUsd,
                isMorpho: true,
              });
            }
            if (ptUsd <= 1 && ytUsd <= 1 && lpUsd <= 1 && directUsd > 1) {
              totalSup += directUsd;
              counts.pendle++;
              pIdx++;
              newDeFiRows.push({
                id: Date.now() + 500 + pIdx,
                name: `Pendle Position: ${mktLabel}`,
                bucket: BucketCategory.SelfCustodyDeFi,
                custody: CustodyHygiene.ColdSelfCustody,
                value: directUsd,
                isMorpho: true,
              });
            }
          });
        });
      }
    } catch (e) {
      console.warn('Pendle spot scan error:', e);
    }

    // 2C. AAVE V3 ETHEREUM POOL FALLBACK (Catches PendleLoop PT E-Mode Loops on Aave V3)
    try {
      const paddedAddr = lowerAddr.replace('0x', '').padStart(64, '0');
      const rpcRes = await fetch('https://ethereum-rpc.publicnode.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [
            {
              to: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
              data: '0xbf92857c' + paddedAddr,
            },
            'latest',
          ],
        }),
      });
      const rpcJson = await rpcRes.json();
      const hex = String(rpcJson?.result || '');
      if (hex && hex.length >= 130) {
        const colBase = Number(BigInt('0x' + hex.slice(2, 66))) / 1e8;
        const debtBase = Number(BigInt('0x' + hex.slice(66, 130))) / 1e8;
        const aaveColUsd = Math.round(colBase);
        const aaveDebtUsd = Math.round(debtBase);

        if (aaveColUsd > 5) {
          totalSup += aaveColUsd;
          counts.pendle++;
          newDeFiRows.push({
            id: Date.now() + 610,
            name: `PendleLoop / Aave V3 PT Collateral (${addr.slice(0, 6)}...)`,
            bucket: BucketCategory.SelfCustodyDeFi,
            custody: CustodyHygiene.ColdSelfCustody,
            value: aaveColUsd,
            isMorpho: true,
          });
        }
        if (aaveDebtUsd > 5) {
          totalBor += aaveDebtUsd;
          newDeFiRows.push({
            id: Date.now() + 620,
            name: `PendleLoop / Aave V3 Borrow Debt (${addr.slice(0, 6)}...)`,
            bucket: BucketCategory.MarginBorrow,
            custody: CustodyHygiene.ColdSelfCustody,
            value: aaveDebtUsd,
            isMorpho: true,
          });
        }
      }
    } catch (e) {
      console.warn('Aave V3 loop check error:', e);
    }

    // 3. MERKL V4 REWARDS API
    try {
      const merklRes = await fetch(`https://api.merkl.xyz/v4/users/${lowerAddr}/rewards?chainId=1`);
      if (merklRes.ok) {
        const merklData = await merklRes.json();
        const chainEntries: Record<string, unknown>[] = Array.isArray(merklData)
          ? merklData
          : merklData?.rewards
          ? [merklData]
          : [];
        let rIdx = 0;

        chainEntries.forEach((entry) => {
          const rewardsArr = Array.isArray(entry?.rewards) ? entry.rewards : [];
          rewardsArr.forEach((rw: Record<string, unknown>) => {
            const tokenObj = rw?.token as Record<string, unknown> | undefined;
            const sym = String(tokenObj?.symbol || 'Reward');
            const dec = Number(tokenObj?.decimals ?? 18);
            const price = parseFloat(String(tokenObj?.price || rw?.price || 0));

            let unclaimedTokens = 0;
            try {
              const amtBig = BigInt(String(rw?.amount || '0').split('.')[0]);
              const clmBig = BigInt(String(rw?.claimed || '0').split('.')[0]);
              const pndBig = BigInt(String(rw?.pending || '0').split('.')[0]);
              const netBig = (amtBig > clmBig ? amtBig - clmBig : 0n) + pndBig;
              unclaimedTokens = Number(netBig) / Math.pow(10, dec);
            } catch {
              unclaimedTokens = Math.max(
                0,
                (parseFloat(String(rw?.amount || 0)) - parseFloat(String(rw?.claimed || 0))) /
                  Math.pow(10, dec)
              );
            }

            const usdVal = Math.round(
              parseFloat(String(rw?.usdValue || rw?.amountUSD || 0)) || unclaimedTokens * price
            );
            if (usdVal >= 1 || unclaimedTokens >= 0.01) {
              const finalUsd = usdVal >= 1 ? usdVal : Math.max(1, Math.round(unclaimedTokens));
              totalSup += finalUsd;
              counts.merkl++;
              rIdx++;
              newDeFiRows.push({
                id: Date.now() + 800 + rIdx,
                name: `Merkl Claimable Reward: ${unclaimedTokens.toFixed(2)} ${sym}`,
                bucket: BucketCategory.SelfCustodyDeFi,
                custody: CustodyHygiene.ColdSelfCustody,
                value: finalUsd,
                isMorpho: true,
              });
            }
          });
        });
      }
    } catch (e) {
      console.warn('Merkl V4 scan error:', e);
    }
  }

  return {
    rows: newDeFiRows,
    totalSup,
    totalBor,
    counts,
  };
}

export function buildFirebaseDbEndpoint(rawFirebaseUrl: string): string | null {
  let u = rawFirebaseUrl.trim();
  if (!u) return null;
  if (!u.endsWith('/')) u += '/';
  return `${u}macro_command_v7.json`;
}

export async function pushStateToFirebase(rawFirebaseUrl: string, state: MacroState): Promise<boolean> {
  const endpoint = buildFirebaseDbEndpoint(rawFirebaseUrl);
  if (!endpoint) return false;
  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  return res.ok;
}

export async function pullStateFromFirebase(rawFirebaseUrl: string): Promise<MacroState | null> {
  const endpoint = buildFirebaseDbEndpoint(rawFirebaseUrl);
  if (!endpoint) return null;
  const res = await fetch(endpoint);
  if (!res.ok) return null;
  const data = await res.json();
  if (data && Array.isArray(data.positions)) {
    return data as MacroState;
  }
  return null;
}
