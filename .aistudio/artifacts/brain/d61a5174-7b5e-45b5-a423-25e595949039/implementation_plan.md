# Implementation Plan: 30-Day D3 Dual-Axis Telemetry Chart

Integrate a D3-powered dual-axis line chart inside a collapsible historical telemetry card to plot the last 30 days of NY Fed SOFR rate (%) and Standing Repo Facility (SRF) usage ($B) with touch-friendly crosshair tooltips.

## Status: Completed

All proposed changes for the 30-day D3 telemetry chart have been implemented, tested, and compiled.

---

## Completed Changes

### Dependencies
- [x] Installed `d3` and `@types/d3` for rendering the dual-axis chart.

### Telemetry & Historical Data Layer
- [x] **`/src/types/macro.ts`**: Added `HistoricalTrendPoint` and enhanced `Position` types.
- [x] **`/src/services/telemetryService.ts`**: Added `fetchNYFed30DayHistory()` to query 30 days of daily SOFR reference rates and matching repo facility operations from the NY Fed Markets API, with fallback handling.

### D3 Visualization Component
- [x] **`/src/components/HistoricalTrendChart.tsx`**: Built a responsive dual-axis D3 chart:
  - Left Y-Axis (Cyan): SOFR Overnight Rate (%) with area gradient and circular markers.
  - Right Y-Axis (Amber): Standing Repo Facility volume ($B) with step line and daily volume bars.
  - Bottom X-Axis: Chronological dates.
  - Interactive Crosshair: Touch and mouse tracking tooltip displaying exact date, rate, and facility usage.
  - Collapsible Accordion Header: Toggle (`▼` / `▶`) with 30-day statistics chips (SOFR min/max and SRF peak).

### App Integration
- [x] **`/src/App.tsx`**: Integrated historical data fetching on mount and sync, rendering `<HistoricalTrendChart />` directly beneath `<KpiGrid />`.

---

## Verification Results
- `npm run lint` (`tsc --noEmit`): Passed with 0 errors.
- `compile_applet` (`npm run build`): Build succeeded, generating optimized production bundle.
