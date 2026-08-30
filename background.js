// Page Time Tracker — background service worker
// Owns the persisted per-site, per-day time totals so multiple tabs never race each other.

const HISTORY_KEY = "ptt_history"; // { [date: "YYYY-MM-DD"]: { [hostname]: seconds } }
const ENABLED_KEY = "ptt_enabled";
const ALERT_MINUTES_KEY = "ptt_alert_minutes"; // 0 (or unset) = alerts off
const ANIMAL_ENABLED_KEY = "ptt_animal_enabled";
const ANIMAL_TYPE_KEY = "ptt_animal_type";
const HISTORY_RETENTION_DAYS = 90;
const DEFAULT_ALERT_MINUTES = 30;
const DEFAULT_ANIMAL_TYPE = "🐱";

async function broadcastToTabs(message) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id == null) continue;
    chrome.tabs.sendMessage(tab.id, message).catch(() => {});
  }
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function dateStringDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

async function getHistory() {
  const { [HISTORY_KEY]: history } = await chrome.storage.local.get(HISTORY_KEY);
  return history || {};
}

async function setHistory(history) {
  // Keep storage bounded — drop days older than the retention window.
  const cutoff = dateStringDaysAgo(HISTORY_RETENTION_DAYS);
  const pruned = {};
  for (const [date, sites] of Object.entries(history)) {
    if (date >= cutoff) pruned[date] = sites;
  }
  await chrome.storage.local.set({ [HISTORY_KEY]: pruned });
  return pruned;
}

async function getEnabled() {
  const { [ENABLED_KEY]: enabled } = await chrome.storage.local.get(ENABLED_KEY);
  return enabled !== false; // default true
}

async function getAlertMinutes() {
  const { [ALERT_MINUTES_KEY]: minutes } = await chrome.storage.local.get(ALERT_MINUTES_KEY);
  return typeof minutes === "number" ? minutes : DEFAULT_ALERT_MINUTES;
}

async function getAnimalEnabled() {
  const { [ANIMAL_ENABLED_KEY]: enabled } = await chrome.storage.local.get(ANIMAL_ENABLED_KEY);
  return enabled === true; // default off — opt-in companion
}

async function getAnimalType() {
  const { [ANIMAL_TYPE_KEY]: type } = await chrome.storage.local.get(ANIMAL_TYPE_KEY);
  return type || DEFAULT_ANIMAL_TYPE;
}

async function maybeNotifyThresholdCrossed(hostname, prevTotal, newTotal) {
  const minutes = await getAlertMinutes();
  if (!minutes || minutes <= 0) return;
  const thresholdSeconds = minutes * 60;
  // Totals only climb through the day, so this window is crossed exactly once
  // per site per day — no separate "already alerted" bookkeeping needed.
  if (prevTotal < thresholdSeconds && newTotal >= thresholdSeconds) {
    chrome.notifications.create(`ptt-${hostname}-${todayString()}`, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Page Time Tracker",
      message: `You've spent ${minutes} min on ${hostname} today.`,
      priority: 1,
    });
  }
}

async function addTime(hostname, seconds) {
  const history = await getHistory();
  const today = todayString();
  if (!history[today]) history[today] = {};
  const prevTotal = history[today][hostname] || 0;
  const newTotal = prevTotal + seconds;
  history[today][hostname] = newTotal;
  const saved = await setHistory(history);
  const finalTotal = saved[today][hostname];
  await maybeNotifyThresholdCrossed(hostname, prevTotal, finalTotal);
  return finalTotal;
}

async function getTodaySeconds(hostname) {
  const history = await getHistory();
  const today = todayString();
  return history[today]?.[hostname] || 0;
}

async function getAllStatsToday() {
  const history = await getHistory();
  const today = todayString();
  const todaySites = history[today] || {};
  return Object.entries(todaySites)
    .filter(([, seconds]) => seconds > 0)
    .map(([hostname, seconds]) => ({ hostname, seconds }))
    .sort((a, b) => b.seconds - a.seconds);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "ADD_TIME": {
        const total = await addTime(message.hostname, message.seconds);
        sendResponse({ total });
        break;
      }
      case "GET_STATE": {
        const [enabled, todayTotal, animalEnabled, animalType] = await Promise.all([
          getEnabled(),
          getTodaySeconds(message.hostname),
          getAnimalEnabled(),
          getAnimalType(),
        ]);
        sendResponse({ enabled, todayTotal, animalEnabled, animalType });
        break;
      }
      case "GET_ALL_STATS": {
        const stats = await getAllStatsToday();
        sendResponse({ stats });
        break;
      }
      case "GET_HISTORY": {
        const history = await getHistory();
        sendResponse({ history, today: todayString() });
        break;
      }
      case "SET_ENABLED": {
        await chrome.storage.local.set({ [ENABLED_KEY]: message.enabled });
        await broadcastToTabs({ type: "ENABLED_CHANGED", enabled: message.enabled });
        sendResponse({ ok: true });
        break;
      }
      case "SET_ANIMAL_ENABLED": {
        await chrome.storage.local.set({ [ANIMAL_ENABLED_KEY]: message.enabled });
        await broadcastToTabs({ type: "ANIMAL_ENABLED_CHANGED", enabled: message.enabled });
        sendResponse({ ok: true });
        break;
      }
      case "SET_ANIMAL_TYPE": {
        await chrome.storage.local.set({ [ANIMAL_TYPE_KEY]: message.animalType });
        await broadcastToTabs({ type: "ANIMAL_TYPE_CHANGED", animalType: message.animalType });
        sendResponse({ ok: true });
        break;
      }
      case "RESET_TODAY": {
        const history = await getHistory();
        delete history[todayString()];
        await setHistory(history);
        sendResponse({ ok: true });
        break;
      }
      default:
        sendResponse({ error: "unknown message" });
    }
  })();
  return true; // keep the message channel open for the async response
});
