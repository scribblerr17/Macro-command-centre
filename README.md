# Macro Collateral & DeFi Command

Macro liquidity plumbing monitor, 36-month repo stress simulator, 30-day D3 historical telemetry chart, NY Fed push notification engine, and Ethereum DeFi position scanner — built with **React 19 + TypeScript + Vite + Tailwind CSS + D3** for responsive tablet and desktop workflows.

## Core Features

- **NY Fed Live Telemetry & 30-Day D3 Trend Chart**: Automatically fetches latest overnight SOFR (including 1-day basis-point velocity), EFFR, and Standing Repo Facility (SRF) daily volume & offering rate ceiling from the Federal Reserve Bank of New York Markets API, plus an interactive dual-axis 30-day historical trend chart.
- **NY Fed Notification Engine (`ntfy` Push + Scheduled GitHub Actions)**:
  - **In-App Notification Center**: Customize alert thresholds, preview morning briefings, inspect chronological alert logs, and send live one-tap test pushes to Android/iOS via `ntfy.sh`.
  - **24/7 Background Monitor**: Scheduled weekday GitHub Actions workflow (`.github/workflows/fed-alerts.yml`) evaluates NY Fed morning SOFR/EFFR prints and afternoon SRF repo operations even when your tablet or browser is asleep.
  - **5 Built-In Triggers**: (1) Weekday Morning Briefing, (2) SOFR–EFFR spread `>= +15 bps`, (3) Standing Repo Facility usage `>= $25.0B`, (4) Single-day SOFR jump `>= +5 bps`, and (5) Plumbing Stress Score `>= 65 / 100`.
- **36-Month Plumbing & Timeline Stress Simulator**: Interactive sliders for timeline horizon (Oct 2026 – Oct 2029), SOFR–EFFR spread (bps), Standing Repo Facility usage ($B), and SLR Relief / QE Pivot toggle.
- **Auto-Detected DeFi Contagion & Leverage Monitor**: Automatically classifies ledger holdings, weights APY & borrow utilization, flags elevated LTV positions, and generates phase-specific action checklists.
- **Unified Ethereum DeFi Scanner**: Scans Morpho Blue (V1/V2 vaults & markets), PendleLoop leveraged PT positions, Pendle V2 spot PT/YT/LP positions, Aave V3 Ethereum Pool collateral/debt, and Merkl V4 claimable rewards across comma-separated `0x` wallet addresses.
- **100% Private Zero-Database Persistence**: Saves state strictly in browser `localStorage` with JSON backup export/import, URL `?p=` scenario sharing, and a 1-click Demo Portfolio preset.

## Setting Up 24/7 Galaxy Tab Push Notifications (`ntfy` + GitHub Actions)

1. **Subscribe on Android (`ntfy`)**:
   - Install the free **ntfy** app on your Samsung Galaxy Tab from Google Play or F-Droid.
   - Open `🔔 Fed Alerts` in the dashboard header, click **🎲 Generate Private Topic**, and subscribe to that exact topic string inside the `ntfy` app.
   - Tap **📲 Send Test Push to Tablet** in the dashboard to confirm instant delivery.
2. **Add `NTFY_TOPIC` Secret in GitHub**:
   - In your GitHub repository, navigate to **Settings → Secrets and variables → Actions → New repository secret**.
   - Name: `NTFY_TOPIC`
   - Secret: paste your private `ntfy` topic string.
3. **Verify Scheduled Background Workflow**:
   - Open the **Actions** tab in GitHub, select **NY Fed Macro Alert Monitor**, and click **Run workflow** (with mode `test`) to verify end-to-end cloud push delivery.
   - Thereafter, it runs automatically every US weekday after the morning NY Fed release and afternoon SRF settlement.

## Deployment to GitHub Pages

1. Open your repository **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Every push to `main` automatically builds and deploys via `.github/workflows/deploy.yml`.

## Local Development & Verification

```bash
npm install
npm run dev               # Starts Vite dev server on 0.0.0.0:3000
npm run build             # Typechecks and builds production static bundle in dist/
npm run lint              # Runs TypeScript compiler check (tsc --noEmit)
npm run check:fed-alerts  # Dry-runs the headless NY Fed monitor against live Fed APIs
```
