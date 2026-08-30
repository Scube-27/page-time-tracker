const ENABLED_KEY = "ptt_enabled";
const ALERT_MINUTES_KEY = "ptt_alert_minutes";
const ANIMAL_ENABLED_KEY = "ptt_animal_enabled";
const ANIMAL_TYPE_KEY = "ptt_animal_type";
const DEFAULT_ALERT_MINUTES = 30;
const DEFAULT_ANIMAL_TYPE = "🐱";

function fmt(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

async function loadEnabled() {
  const { [ENABLED_KEY]: enabled } = await chrome.storage.local.get(ENABLED_KEY);
  return enabled !== false;
}

async function loadStats() {
  const res = await chrome.runtime.sendMessage({ type: "GET_ALL_STATS" });
  return res?.stats || [];
}

async function loadAlertMinutes() {
  const { [ALERT_MINUTES_KEY]: minutes } = await chrome.storage.local.get(ALERT_MINUTES_KEY);
  return typeof minutes === "number" ? minutes : DEFAULT_ALERT_MINUTES;
}

async function loadAnimalSettings() {
  const { [ANIMAL_ENABLED_KEY]: enabled, [ANIMAL_TYPE_KEY]: type } = await chrome.storage.local.get([
    ANIMAL_ENABLED_KEY,
    ANIMAL_TYPE_KEY,
  ]);
  return { enabled: enabled === true, type: type || DEFAULT_ANIMAL_TYPE };
}

async function render() {
  const [enabled, stats, alertMinutes, animal] = await Promise.all([
    loadEnabled(),
    loadStats(),
    loadAlertMinutes(),
    loadAnimalSettings(),
  ]);

  document.getElementById("enabledToggle").checked = enabled;
  document.getElementById("alertMinutes").value = alertMinutes;
  document.getElementById("animalToggle").checked = animal.enabled;
  document.getElementById("animalType").value = animal.type;
  document.getElementById("animalPreview").textContent = animal.type;

  const list = document.getElementById("siteList");
  const empty = document.getElementById("emptyState");
  list.innerHTML = "";

  if (stats.length === 0) {
    empty.hidden = false;
    list.hidden = true;
  } else {
    empty.hidden = true;
    list.hidden = false;
    for (const { hostname, seconds } of stats) {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.className = "site-name";
      name.textContent = hostname;
      name.title = hostname;
      const time = document.createElement("span");
      time.className = "site-time";
      time.textContent = fmt(seconds);
      li.appendChild(name);
      li.appendChild(time);
      list.appendChild(li);
    }
  }
}

document.getElementById("enabledToggle").addEventListener("change", async (e) => {
  await chrome.runtime.sendMessage({ type: "SET_ENABLED", enabled: e.target.checked });
});

document.getElementById("resetBtn").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "RESET_TODAY" });
  render();
});

document.getElementById("alertMinutes").addEventListener("change", async (e) => {
  const minutes = Math.max(0, parseInt(e.target.value, 10) || 0);
  e.target.value = minutes;
  await chrome.storage.local.set({ [ALERT_MINUTES_KEY]: minutes });
});

document.getElementById("animalToggle").addEventListener("change", async (e) => {
  await chrome.runtime.sendMessage({ type: "SET_ANIMAL_ENABLED", enabled: e.target.checked });
});

document.getElementById("animalType").addEventListener("change", async (e) => {
  document.getElementById("animalPreview").textContent = e.target.value;
  await chrome.runtime.sendMessage({ type: "SET_ANIMAL_TYPE", animalType: e.target.value });
});

document.getElementById("statsBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("stats.html") });
});

render();
