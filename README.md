# Page Time Tracker

A Chrome (Manifest V3) extension that shows a small floating widget on every page, tracking how long you've spent on the current page load plus your cumulative time on that site today.

## Features

- **Floating widget** — a small, draggable, glassy green HUD pinned to the top-right corner of every page. Shows the current page-view session time and today's running total for that site.
- **Accurate tracking** — only counts time while the tab is actually visible *and* focused, so background tabs don't inflate your numbers.
- **Popup dashboard** — toggle tracking on/off, see today's sites ranked by time spent, reset today's data, and set a per-site time alert threshold.
- **Site time alerts** — get a native browser notification the moment any site crosses your configured minutes-per-day threshold (set to `0` to disable).
- **Statistics page** — a full dashboard with:
  - Today's total, last-7-days total, all-time total, and top site today
  - A bar chart of today's time by site
  - A 7-day trend chart
  - All-time top sites
  - Live updates via `chrome.storage.onChanged` — no need to reload the tab

## Install (unpacked, for development)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this folder

## Project structure

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (MV3) |
| `content.js` | Injects and drives the floating widget on every page |
| `background.js` | Service worker; owns the persisted per-day, per-site time history |
| `popup.html` / `popup.js` / `popup.css` | Toolbar popup dashboard |
| `stats.html` / `stats.js` / `stats.css` | Full statistics page |
| `icons/` | Extension icons |

## Data model

Time is stored in `chrome.storage.local` under `ptt_history`, keyed by date and hostname:

```json
{
  "2026-08-23": { "example.com": 1423, "github.com": 302 }
}
```

History is pruned to the last 90 days automatically.
