# Implementation Plan: Category Grouping, Subtotals & LTV Risk Metrics for Positions Ledger

Upgrade the **Self-Custody, DeFi Lend, PendleLoop & Margin Borrow Positions** ledger to group positions by bucket with subtotals, collapsible headers, and real-time Loan-to-Value (LTV) and debt-to-collateral risk warnings on borrowed holdings.

## Status: Completed

All proposed changes for the Positions Ledger have been implemented, tested, and verified.

---

## Completed Changes

### Calculation & Grouping Architecture
- [x] **`/src/components/PositionsLedger.tsx`**: Grouped holdings by category (Dry Powder, Hard Assets, Equities, Self-Custody DeFi, Margin / Borrow) with subtotal dollar values and portfolio weight percentages.
- [x] **Collapsible Sections**: Added smooth expand/collapse toggles (`▼` / `▶`) on group headers for effortless tablet navigation.
- [x] **LTV & Leverage Monitor**: Implemented real-time on-chain debt monitoring displaying active debt amount, debt-to-collateral ratio, gross portfolio LTV, and risk badges (Conservative < 50%, Caution 50%–65%, Danger > 65%).

---

## Verification Results
- `npm run lint` (`tsc --noEmit`): Passed with 0 errors.
- `compile_applet` (`npm run build`): Build succeeded, generating optimized production bundle.
