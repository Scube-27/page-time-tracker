<div align="center">

<img src="icons/icon128.png" width="88" alt="Page Time Tracker icon" />

# Page Time Tracker

**See exactly where your browsing time goes, without your data leaving the device.**

A small, always-visible timer on every page, daily per-site totals, limit alerts and a statistics dashboard, all stored locally in your browser.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-4ade80?style=flat-square)
![Version](https://img.shields.io/badge/version-1.0.0-34d399?style=flat-square)
![Data](https://img.shields.io/badge/data-local%20only-10b981?style=flat-square)
![Dependencies](https://img.shields.io/badge/dependencies-none-059669?style=flat-square)

[Features](#features) · [Installation](#installation) · [Permissions](#permissions) · [Privacy](#privacy) · [Development](#development)

<br />

<img src="docs/screenshots/widget.png" width="820" alt="The floating timer widget in the corner of a web page" />

</div>

---

## Features

| | |
|---|---|
| ⏱️ **Floating timer** | A compact, draggable widget showing time on the current visit and today's total for the site. It remembers where you put it. |
| 🎯 **Honest counting** | Time is counted only while the tab is visible *and* focused. Background tabs and minimised windows are ignored. |
| 🔔 **Daily limit alerts** | A native notification when any site passes your daily limit (default 30 minutes; set `0` to turn it off). |
| 📊 **Statistics dashboard** | Today, last 7 days, all-time totals and top sites, updating live. |
| 🔒 **Private by design** | No accounts, no servers, no analytics. Everything stays in your browser. |

## Screenshots

<table>
  <tr>
    <td width="34%" valign="top" align="center">
      <img src="docs/screenshots/popup.png" alt="Toolbar popup" /><br />
      <sub><b>Toolbar popup</b>: today's ranking, tracking toggle, alert threshold</sub>
    </td>
    <td width="66%" valign="top" align="center">
      <img src="docs/screenshots/stats.png" alt="Statistics dashboard" /><br />
      <sub><b>Statistics</b>: totals, today by site, 7-day trend, all-time top sites</sub>
    </td>
  </tr>
</table>

## Installation

### Chrome Web Store

*Coming soon.*

### From source

1. Clone the repository:
   ```bash
   git clone https://github.com/Scube-27/page-time-tracker.git
   ```
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the cloned folder.

It works in Google Chrome and Chromium-based browsers with Manifest V3 support, including Microsoft Edge, Brave and Opera.

## Usage

- **Widget:** drag it anywhere on the page. Click `×` to hide it on the current page, and hover over it to see the hostname.
- **Popup:** click the toolbar icon to switch tracking on or off, see today's ranking, set the alert threshold or reset today's data.
- **Statistics:** open it from the popup to see the full dashboard.

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Saves time history, settings and widget position on the device. |
| `notifications` | Shows the daily limit alert. |
| Content script on all sites | Displays the widget and counts time on the page you are viewing. |

The extension makes no network requests and runs no remote code.

## Privacy

Page Time Tracker records only the **hostname** of each site and the **number of seconds** spent on it each day. It stores that data in `chrome.storage.local`, and nothing is ever transmitted. History older than 90 days is deleted automatically. Uninstalling the extension removes everything.

See the full [Privacy Policy](PRIVACY.md).

## Development

There is no build step and no dependencies; it's plain JavaScript, HTML and CSS.

```
├── manifest.json        Extension manifest (MV3)
├── background.js        Service worker: per-day/per-site history, alerts
├── content.js           Floating widget and visibility-aware timer
├── popup.{html,js,css}  Toolbar popup
├── stats.{html,js,css}  Statistics dashboard
├── icons/               16 / 48 / 128 px icons
└── docs/screenshots/    README images (not shipped)
```

After editing, click **Reload** on the extension card at `chrome://extensions`. Content-script changes also need the open tabs to be refreshed.

<details>
<summary><b>Storage schema</b></summary>

| Key | Shape |
|---|---|
| `ptt_history` | `{ "YYYY-MM-DD": { "<hostname>": seconds } }`, kept for 90 days |
| `ptt_enabled` | `boolean`; tracking on or off (default `true`) |
| `ptt_alert_minutes` | `number`; daily limit per site, `0` = off (default `30`) |
| `ptt_widget_pos` | `{ top, left }`; last widget position |

</details>

### Packaging a release

1. Increase `version` in `manifest.json`.
2. Build the upload archive:
   ```bash
   zip -r page-time-tracker.zip manifest.json *.js *.html *.css icons
   ```
3. Upload it in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
