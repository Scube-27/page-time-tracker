# Publishing Guide

How to publish Page Time Tracker to the Chrome Web Store and ship updates later.

**Prerequisite:** a registered Chrome Web Store developer account with the fee paid, 2-step verification on, a verified contact email, and the trader / non-trader declaration completed (**Account** tab in the dashboard).

---

## 1. Prepare the release

1. **Bump the version** in `manifest.json`. Every upload must have a higher `version` than the last published one (e.g. `1.0.0` → `1.0.1`).
2. **Test the build** before you package it:
   - Load the folder unpacked at `chrome://extensions` and click **Reload**.
   - Check that the widget appears and counts, the popup lists sites, the alert fires (set the threshold to `1` minute), and the statistics page loads.
   - Make sure the extension card shows no **Errors** button.
3. **Build the package** from the project root:
   ```bash
   rm -f page-time-tracker.zip
   zip -r page-time-tracker.zip manifest.json *.js *.html *.css icons
   unzip -l page-time-tracker.zip   # confirm: manifest.json at the root, no docs/ or .git
   ```
   `*.zip` is gitignored, so the package is never committed.

## 2. Prepare the store assets

| Asset | Size | Required | Notes |
|---|---|---|---|
| Store icon | 128×128 PNG | Yes | Use `icons/icon128.png` |
| Screenshots | 1280×800 or 640×400 PNG/JPEG | At least 1, up to 5 | Widget on a page, popup, statistics page |
| Small promo tile | 440×280 PNG/JPEG | Yes | Icon + name on the brand green-on-dark background |
| Marquee promo tile | 1400×560 PNG/JPEG | No | Only needed if Google features the item |

Screenshots must show the real UI. Don't use mock-ups of features that don't exist, and don't show personal data.

## 3. Create the item

1. Open the [Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Click **New item** and upload `page-time-tracker.zip`.
3. The item opens as a draft. Fill in the tabs below, then submit.

## 4. Store listing tab

| Field | Value |
|---|---|
| **Description** | Use the text below |
| **Category** | Productivity → Tools |
| **Language** | English |
| **Graphic assets** | Store icon, screenshots and small promo tile from step 2 |
| **Official URL / Homepage** | `https://github.com/Scube-27/page-time-tracker` |
| **Support URL** | `https://github.com/Scube-27/page-time-tracker/issues` |

The short summary comes from `description` in `manifest.json` (132 characters max).

**Description** (paste as is):

```
See exactly where your browsing time goes — without your data ever leaving your device.

Page Time Tracker adds a small, draggable timer to the corner of every page showing how long you've been on it and your total time on that site today.

FEATURES
• Floating timer — current visit and today's total for the site, at a glance
• Honest counting — only counts while the tab is visible and focused
• Daily limit alerts — get notified when a site passes your limit
• Statistics dashboard — today, last 7 days, all-time totals and top sites
• One-click on/off and reset from the toolbar popup

PRIVATE BY DESIGN
• Records only the site name and seconds spent — never full URLs or page content
• All data stays in your browser; nothing is sent anywhere
• No accounts, no analytics, no ads
• History older than 90 days is deleted automatically
```

## 5. Privacy practices tab

Reviewers read this tab most closely, so fill in every field.

**Single purpose description**

```
Shows how much time the user spends on the current page and website, with daily per-site totals, optional time-limit alerts and a local statistics dashboard.
```

**Permission justifications**

| Permission | Justification to paste |
|---|---|
| `storage` | Stores the user's daily per-site time totals, settings (tracking on/off, alert threshold) and widget position locally on the device. |
| `notifications` | Shows a notification when the user's time on a site passes the daily limit they set. |
| Host permission (content script on all sites) | The timer widget must appear on, and measure time for, whichever website the user is viewing. It reads only the page's hostname and whether the tab is visible; it does not read or modify page content. |

**Remote code:** select **No, I am not using remote code**.

**Data usage**

- Tick **Web history**. The extension records hostnames and time spent, which counts as browsing activity even though it stays on the device. Leave every other category unticked.
- Tick all three certifications: not sold to third parties, not used for unrelated purposes, not used for creditworthiness or lending.

**Privacy policy URL**

```
https://github.com/Scube-27/page-time-tracker/blob/main/PRIVACY.md
```

## 6. Distribution tab

| Setting | Recommended |
|---|---|
| Payments | Free |
| Visibility | **Public**. Choose **Unlisted** for a soft launch where only people with the link can install it. |
| Regions | All regions |

## 7. Submit for review

1. Click **Submit for review**.
2. Leave **Publish automatically after review** ticked to go live as soon as it's approved. Untick it to choose the moment yourself; you then have 30 days to press **Publish**.
3. Review usually takes a few days. Extensions that run on all sites get extra scrutiny and can take a week or more.
4. The status and any reviewer emails appear on the item page and at the account's contact email.

## 8. After approval

1. Copy the store URL from the item page (`https://chromewebstore.google.com/detail/<id>`).
2. Replace *Coming soon* under **Chrome Web Store** in the README with that link.
3. Tag the release in git:
   ```bash
   git tag v1.0.0 && git push origin v1.0.0
   ```

## Publishing an update

1. Make the change and bump `version` in `manifest.json`.
2. Repeat steps 1.2–1.3 (test and package).
3. Dashboard → the item → **Package** → **Upload new package**.
4. Update the listing or privacy answers if the change affects them. **A new permission always needs a new justification** and shows users a warning when they update.
5. **Submit for review.** Users are updated automatically within a few hours of approval.

## If the submission is rejected

The rejection email names the policy and a violation ID. The usual causes and fixes:

| Reason | Fix |
|---|---|
| Missing or vague permission justification | Use the specific wording from step 5 |
| Data usage doesn't match behaviour | Make sure **Web history** is ticked and the privacy policy matches |
| Description is keyword-stuffed or misleading | Keep to the description in step 4 |
| Screenshots don't reflect the product | Use real captures of the current UI |

Fix the issue, upload a new package if code changed (with a bumped version), and resubmit. If you think the rejection was wrong, reply through the **One Stop Support** link in the email.
