# Macro Collateral & DeFi Command

Macro liquidity plumbing monitor, 36-month repo stress simulator, tactical portfolio allocation advisor, and Ethereum DeFi position scanner — rewritten as a modular **React + TypeScript + Vite + Tailwind CSS** application with touch-friendly tablet and mobile responsiveness.

## Core Features

- **NY Fed Live Telemetry**: Automatically fetches latest overnight SOFR and EFFR reference rates from the Federal Reserve Bank of New York Markets API.
- **36-Month Plumbing & Timeline Stress Simulator**: Interactive sliders for timeline horizon (Oct 2026 – Oct 2029), SOFR–EFFR spread (bps), Standing Repo Facility (SRF) usage ($B), SLR Relief / QE Pivot toggle, and DeFi yield mechanism selection.
- **Portfolio Allocation vs. Phase Target Weights**: Tracks Dry Powder, Hard Assets, Equities, Self-Custody DeFi, and Margin/Borrow debt against Phase 1, Phase 2, and Phase 3 target weights, self-custody hygiene percentage, and drift metrics.
- **DeFi Contagion Monitor & Tactical Rebalance Directives**: Real-time warnings for repo reserve contagion, funding rate flips, and leveraged PT loop borrow rate spikes.
- **Unified Ethereum DeFi Scanner**: Scans Morpho Blue (V1/V2 vaults & markets), PendleLoop leveraged PT positions, Pendle V2 spot PT/YT/LP positions, Aave V3 Ethereum Pool collateral/debt, and Merkl V4 claimable rewards across comma-separated `0x` wallet addresses without overwriting manual portfolio entries.
- **Persistence & Cloud Sync**: Saves state locally (`localStorage`) with optional one-click sync to a Firebase Realtime Database URL.

## Deployment to GitHub Pages

This repository includes an automated GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and deploys the site whenever you push changes to `main`.

### One-Time Setup in GitHub

1. Open your repository on GitHub: [scribblerr17/Macro-command-centre](https://github.com/scribblerr17/Macro-command-centre)
2. Go to **Settings** (tab at the top) → **Pages** (in the left sidebar).
3. Under **Build and deployment** > **Source**, change the dropdown from **Deploy from a branch** to **GitHub Actions**.
4. That's it! Any push to `main` will trigger the workflow automatically, and your site will be live at:
   **https://scribblerr17.github.io/Macro-command-centre/**

## Local Development & Build

```bash
npm install
npm run dev     # Starts Vite dev server on 0.0.0.0:3000
npm run build   # Typechecks and builds production static bundle in dist/
npm run lint    # Runs TypeScript compiler check (tsc --noEmit)
```
