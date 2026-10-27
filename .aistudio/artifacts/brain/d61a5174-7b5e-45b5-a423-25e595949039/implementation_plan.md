# NY Fed Macro Plumbing Notification Engine

Adds a dual-layer Federal Reserve liquidity alert engine that delivers weekday morning briefings and urgent funding-stress push alerts straight to your Samsung Galaxy Tab via `ntfy`, paired with an interactive in-app Notification Center for real-time monitoring, threshold customization, alert history, and one-tap push testing.

## User Review & Critical Decisions

> [!IMPORTANT]
> All core preferences from our clarification step are locked in below. Review the scheduled NY Fed check windows and secret-handling approach before approving execution.

- **Confirmed Execution Architecture**: Hybrid dual-engine setup — **In-App Alert Engine** (live polling, browser notifications, alert log, and test push sender while the dashboard is open) plus **Scheduled GitHub Actions Monitor** (headless background checks that push alerts even when your tablet browser is closed or asleep).
- **Confirmed Mobile Delivery Channel**: **Free `ntfy` Android push topic** (`ntfy.sh`) with tap-to-open deep linking back to your live dashboard, alongside native Web Notifications when viewing in a browser.
- **Confirmed Default Alert Triggers (All 5 Active)**:
  1. **Daily Morning Briefing**: Weekday summary of SOFR, EFFR, SOFR–EFFR spread, Standing Repo Facility (SRF) volume, single-day SOFR change, and Plumbing Stress Score after NY Fed publication.
  2. **SOFR–EFFR Spread Breach**: Urgent alert when spread reaches **+15 bps or higher**.
  3. **Standing Repo Facility Surge**: Urgent alert when daily SRF drawings reach **$25.0B or higher**.
  4. **Single-Day SOFR Rate Jump**: Urgent alert when SOFR jumps **+5 bps (+0.05%) or more** in a single session.
  5. **Plumbing Stress Score Breach**: Urgent alert when composite Plumbing Stress Score reaches **65 / 100 or higher**.
- **Recommended Schedule & Privacy Defaults**:
  - **Weekday Release Windows**: Scheduled checks aligned to NY Fed publication windows on US banking weekdays — **8:35 AM ET** (captures the ~8:00 AM ET SOFR/EFFR print + morning Repo settlement for the Morning Briefing & rate shock checks) and **2:00 PM ET** (captures afternoon Standing Repo Facility operations for intraday SRF surge checks), plus a manual "Run Now" workflow dispatch option.
  - **Zero-Leak Topic Security**: Your private `ntfy` topic name is stored only in a **GitHub Repository Secret** for background runs and in **device-local storage** inside the dashboard (never committed to public repository code).

---

## 1. Overview & Core Concept

- **What It Does**: Continuously tracks official Federal Reserve Bank of New York reference rates (SOFR, EFFR, prior-day SOFR delta) and Standing Repo Facility operations, evaluating them against five macro liquidity rules to dispatch structured morning briefings and high-priority shock alerts.
- **Target Audience / Persona**: Self-custody DeFi and macro portfolio operator managing collateral, Treasury dry powder, and leveraged lending loops from a Samsung Galaxy Tab who needs early warning of repo tightness without manually checking NY Fed releases every morning.
- **Key Value**: Bridges passive dashboard telemetry into proactive operational awareness — ensuring sudden overnight funding spikes or SRF liquidity draws immediately surface on your tablet lock screen before on-chain borrow rates or collateral haircuts react.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Header Alert Bell & Unread Indicator**: A dedicated Notification Engine trigger button sits in the top command bar beside the Wallet & Backup button, displaying live armed status and an unread badge count whenever new morning briefings or threshold breaches are logged.
  2. **Notification Center Drawer**: Tapping the alert button expands a collapsible command panel divided into three clean operational zones:
     - **Delivery & Test Console**: Input field for your private `ntfy` topic (masked by default with a show/hide toggle), Browser Notification permission toggle, **Send Test Push to Tablet** button (fires a real `ntfy` message immediately to verify Android subscription), and **Preview Morning Briefing** button (simulates and logs a live briefing from current NY Fed readings).
     - **Rule & Threshold Matrix**: Individual enable/disable switches and editable numeric inputs for all five triggers (Morning Briefing toggle, Spread bps threshold, SRF `$B` threshold, 1-Day SOFR Jump bps threshold, and Stress Score threshold), plus a reset-to-defaults action.
     - **Recent Alert Feed & Setup Guide**: Chronological log of triggered briefings and severe alerts with severity badges, exact tabular telemetry snapshots, clear/mark-read controls, and a concise 3-step collapsible checklist showing how to subscribe on the Android `ntfy` app and add the `NTFY_TOPIC` repository secret on GitHub.
  3. **KPI Delta Enhancement**: The SOFR KPI card surfaces the newly fetched **1-Day SOFR Delta** (e.g., `0 bps d/d` or `+6 bps d/d`) alongside the EFFR spread so single-day rate velocity is immediately visible on the main canvas.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Utilitarian institutional macro terminal matching the existing dark slate command center — flat single-elevation surfaces, crisp 1px structural borders, and zero decorative clutter.
  - *Color Palette & Mood*: Deep slate canvas (`#0b1120`) and panel surfaces (`#111827`, `#1e293b`) with hairline borders (`#334155`). Semantic status accents strictly encode urgency: Sky Blue (`#38bdf8`) for routine morning briefings, Emerald (`#10b981`) for armed/nominal status, Amber (`#f59e0b`) for approaching thresholds or single-day rate drift, and Crimson (`#ef4444`) for severe Fed plumbing breaches.
  - *Typography & Hierarchy*: Crisp geometric sans-serif headings and compact control labels paired with strict monospace tabular numerals (`tabular-nums`) for all basis-point thresholds, `$B` repo figures, stress scores, and UTC/ET timestamps.
  - *Component Styling & Layout*: Touch-optimized controls ($\ge 40\text{px}$ tap targets for comfortable Galaxy Tab interaction), responsive two-column configuration grid on tablet/desktop collapsing cleanly to a single column on narrow viewports, and zero nested card sandwiches.

- **Interactive Feedback & Motion**:
  - Instant inline status confirmation when sending a test `ntfy` push (e.g., *"Sending push..."* $\rightarrow$ *"Delivered to ntfy.sh"* or actionable network error message) — never using blocking browser popups.
  - Deduplicated alert evaluation so refreshing the page or polling on the same NY Fed effective date never spams repeat notifications for an already-acknowledged reading.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual Engine (Scheduled GitHub Actions + Client-Side Poller)**
  - *Chosen Approach*: Pair a standalone Node.js monitor executed on a weekday GitHub Actions schedule with an in-app client-side evaluator and configuration console.
  - *Why*: Pure browser apps stop executing timers when Android puts Chrome or a PWA tab to sleep. Running a scheduled headless check on GitHub's runners guarantees morning briefings and severe Fed alerts arrive on your tablet even when powered standby, while the in-app engine gives instant visual feedback, custom threshold testing, and live polling during active trading sessions.
  - *Alternatives Considered*: Dedicated cloud backend server or Firebase Cloud Messaging — rejected because they introduce ongoing infrastructure maintenance, service-account keys, or database dependencies for what is otherwise a fast, private static application.

- **Decision 2: `ntfy.sh` JSON Publish Protocol with Priority Routing**
  - *Chosen Approach*: Dispatch routine morning briefings at normal priority (`priority: 3`) and severe threshold breaches at max urgent priority (`priority: 5`) with semantic tags and a one-tap dashboard deep link.
  - *Why*: Urgent priority on Android `ntfy` can break through Do Not Disturb / battery optimization for genuine liquidity shocks (like SOFR spiking +15 bps over EFFR), whereas calm daily morning summaries arrive politely without alarm fatigue.
  - *Alternatives Considered*: Email gateways or Telegram bot tokens — rejected because `ntfy` requires zero account registration, zero bot API keys, and takes 10 seconds to subscribe to a private topic string on Android.

- **Decision 3: Privacy-Preserving Secret Split**
  - *Chosen Approach*: Keep the web UI 100% `localStorage`-backed for personal topic testing and custom thresholds, while reading `NTFY_TOPIC` (and optional custom threshold overrides) from GitHub Actions Secrets/Variables during scheduled background runs.
  - *Why*: Because the dashboard is hosted on a public GitHub Pages repository, hardcoding the `ntfy` topic in client code would expose your notification channel to anyone viewing page source. Storing it in GitHub Secrets + local tablet storage keeps your alert stream completely private.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                   PUBLIC NY FED MARKETS REST ENDPOINTS                      │
│   • Secured SOFR (last 2 sessions -> current rate + 1-day bps jump)         │
│   • Unsecured EFFR (latest session -> SOFR-EFFR spread in bps)              │
│   • Repo Operations (latest 5 results -> daily SRF $B & ceiling rate)       │
└───────────────────┬─────────────────────────────────────┬───────────────────┘
                    │                                     │
     (Weekday Cron: 8:35 AM & 2:00 PM ET                  │ (On Load + 30m Poll
      + Manual Workflow Dispatch)                         │  + Manual Refresh)
                    ▼                                     ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────────┐
│   GITHUB ACTIONS BACKGROUND MONITOR   │ │     IN-APP NOTIFICATION ENGINE    │
│  ┌─────────────────────────────────┐  │ │  ┌─────────────────────────────┐  │
│  │ Headless Fed Telemetry Evaluator│  │ │  │ Rule Evaluator & Dedupe     │  │
│  │ • Computes Spread, 1d Jump,     │  │ │  │ • Compares live NY Fed data │  │
│  │   SRF $B & Plumbing Stress Score│  │ │  │   vs user thresholds        │  │
│  │ • Morning mode vs Breach-only   │  │ │  │ • Deduplicates by Fed date  │  │
│  └────────────────┬────────────────┘  │ │  └──────┬───────────────┬──────┘  │
│                   │                   │ │         │               │         │
│         Reads Secret: NTFY_TOPIC      │ │         ▼               ▼         │
└───────────────────┼───────────────────┘ │  ┌──────────────┐ ┌────────────┐  │
                    │                     │  │ Alert Center │ │ Web Notify │  │
                    │                     │  │ UI & History │ │ + Test Push│  │
                    │                     │  │ (localStorage│ │ Dispatcher │  │
                    │                     │  └──────────────┘ └─────┬──────┘  │
                    │                     └─────────────────────────┼─────────┘
                    │                                               │
                    └───────────────────────┬───────────────────────┘
                                            │ HTTPS POST (JSON payload,
                                            │ priority 3 or 5, click URL)
                                            ▼
                            ┌───────────────────────────────┐
                            │     ntfy.sh PUSH RELAY        │
                            │  Private Topic Subscription   │
                            └───────────────┬───────────────┘
                                            ▼
                            ┌───────────────────────────────┐
                            │   SAMSUNG GALAXY TAB (ntfy)   │
                            │ Lock-Screen Alert + Deep Link │
                            └───────────────────────────────┘
```

- **Data Model & State**:
  - **Extended Telemetry Snapshot**: Expands the live NY Fed telemetry payload with `prevSofrRate`, `sofrDailyChangeBps` (computed from the two most recent SOFR effective dates), and `effectiveDate` so both single-day jumps and date-keyed deduplication are deterministic.
  - **Notification Preferences Store (`localStorage`)**: Persists `ntfyTopic` (local to the user's browser), `browserNotificationsEnabled`, `autoPushFromBrowser` (optional toggle), and structured rule thresholds (`morningBriefingEnabled`, `spreadBpsThreshold: 15`, `srfBillionsThreshold: 25`, `sofrJumpBpsThreshold: 5`, `stressScoreThreshold: 65`).
  - **Alert Log Store (`localStorage`)**: Retains up to 30 recent alert records (`id`, `timestamp`, `effectiveDate`, `kind: 'briefing' | 'breach' | 'test'`, `severity: 'blue' | 'amber' | 'red'`, `title`, `body`, `metricsSnapshot`, `read`) plus a `seenAlertKeys` map (`<effectiveDate>:<ruleId>`) to prevent duplicate alerts on page reload.

- **Interactive Component & State Mapping**:
  - **Header Notification Button**: Toggles the Notification Center drawer open/closed and displays an unread counter pill when `unreadCount > 0`. Opening the drawer or clicking *Mark All Read* clears unread badges.
  - **Topic & Test Push Controls**: Validates that a non-empty `ntfy` topic is entered, disables the button during flight, dispatches a live JSON `POST` to `https://ntfy.sh`, appends a `'test'` entry to the Alert Log, and renders inline delivery confirmation or error recovery guidance.
  - **Browser Notification Permission Handler**: Checks `Notification.permission`, requests permission cleanly on user click when supported, and gracefully informs the user if the current iframe/browser context blocks native Web Notifications (directing them to `ntfy` push).
  - **Threshold & Rule Editors**: Live controlled toggles and numeric inputs immediately persist to `localStorage` and re-evaluate current NY Fed telemetry so users can test sensitivity changes on the spot.
  - **Scheduled Background Monitor**: Executes via Node 20 native `fetch` with zero external runtime dependencies. Accepts an execution mode (`morning` for daily briefing + breach check, or `intraday` for afternoon SRF/breach-only check, or `force_test` via manual workflow dispatch) so afternoon runs only notify you if a severe threshold actually trips.
