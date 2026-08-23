// Page Time Tracker — background service worker
// Owns the persisted per-site, per-day time totals so multiple tabs never race each other.

const HISTORY_KEY = "ptt_history"; // { [date: "YYYY-MM-DD"]: { [hostname]: seconds } }
const ENABLED_KEY = "ptt_enabled";
const HISTORY_RETENTION_DAYS = 90;

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

async function addTime(hostname, seconds) {
  const history = await getHistory();
  const today = todayString();
  if (!history[today]) history[today] = {};
  history[today][hostname] = (history[today][hostname] || 0) + seconds;
  const saved = await setHistory(history);
  return saved[today][hostname];
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
        const [enabled, todayTotal] = await Promise.all([
          getEnabled(),
          getTodaySeconds(message.hostname),
        ]);
        sendResponse({ enabled, todayTotal });
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
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (tab.id == null) continue;
          chrome.tabs
            .sendMessage(tab.id, { type: "ENABLED_CHANGED", enabled: message.enabled })
            .catch(() => {});
        }
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
