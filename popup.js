const ENABLED_KEY = "ptt_enabled";

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

async function render() {
  const [enabled, stats] = await Promise.all([loadEnabled(), loadStats()]);

  document.getElementById("enabledToggle").checked = enabled;

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

document.getElementById("statsBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("stats.html") });
});

render();
