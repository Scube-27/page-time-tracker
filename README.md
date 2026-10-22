# Page Time Tracker

A lightweight Chrome extension that shows how long you've been on the current page and how much time you've spent on that site today. It runs entirely on your device.

![Manifest V3](https://img.shields.io/badge/manifest-v3-4ade80) ![Version](https://img.shields.io/badge/version-1.0.0-34d399) ![No tracking](https://img.shields.io/badge/data-local%20only-10b981)

---

## Features

- **Floating widget**: a small, draggable HUD in the corner of every page. It shows the time for the current visit and today's running total for the site, and it remembers where you put it.
- **Accurate counting**: time is counted only while the tab is visible and focused. Background tabs and minimised windows don't add to your totals.
- **Popup dashboard**: turn tracking on or off, see today's sites ranked by time, set an alert threshold and reset today's data.
- **Site time alerts**: a native notification when a site passes your daily limit (default 30 min; set `0` to turn alerts off).
- **Statistics page**:
  - Today's total, last 7 days, all-time total and today's top site
  - Today's time by site
  - 7-day trend
  - All-time top 10 sites
  - Updates live while open

## Installation

### From source (developer mode)

1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select the project folder.

It works in Chrome and any Chromium-based browser with Manifest V3 support, including Edge, Brave and Opera.

### Packaging for the Chrome Web Store

From the project root:

```bash
zip -r page-time-tracker.zip manifest.json *.js *.html *.css icons
```

Upload `page-time-tracker.zip` in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). Bump `version` in `manifest.json` before each new upload.

## Usage

| Where | What you can do |
|---|---|
| **Widget** | Drag it anywhere. Click `×` to hide it on the current page. Hover over it to see the hostname. |
| **Toolbar popup** | Toggle tracking, view today's ranking, set the alert threshold (minutes per site), reset today. |
| **Statistics** | Open it from the popup for the full dashboard. |

## Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Saves your time history, settings and widget position on your device. |
| `notifications` | Shows the alert when a site passes your daily limit. |
| Content script on all sites | Displays the widget and counts time on the pages you visit. |

The extension makes **no network requests** and loads no remote code.

## Privacy

- All data is stored locally in `chrome.storage.local` and never leaves your browser.
- The only thing recorded is the **hostname** and the **seconds spent** on it each day. Page titles, full URLs and page content are never recorded.
- History older than **90 days** is deleted automatically.
- **Reset today's data** in the popup clears the current day. Uninstalling the extension removes everything.

## Project structure

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (MV3) |
| `content.js` | Injects and drives the floating widget on each page |
| `background.js` | Service worker that owns the saved per-day, per-site history and sends alerts |
| `popup.html` / `popup.js` / `popup.css` | Toolbar popup dashboard |
| `stats.html` / `stats.js` / `stats.css` | Full statistics page |
| `icons/` | Extension icons (16, 48, 128 px) |

## Data model

Time is stored under `ptt_history`, keyed by date and hostname, in seconds:

```json
{
  "2026-08-23": { "example.com": 1423, "github.com": 302 }
}
```

Other keys: `ptt_enabled` (tracking on/off), `ptt_alert_minutes` (alert threshold) and `ptt_widget_pos` (widget position).

## Contributing

There is no build step or dependency. Edit the files, then click **Reload** on the extension card at `chrome://extensions`. Content-script changes also need the open tabs to be refreshed.
