function fmt(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ key: dateKey(d), label: WEEKDAYS[d.getDay()], dayOfMonth: d.getDate() });
  }
  return days;
}

function siteTotalsForDay(history, dayKey) {
  return history[dayKey] || {};
}

function sumValues(obj) {
  return Object.values(obj).reduce((a, b) => a + b, 0);
}

function renderCard(container, value, label) {
  const card = document.createElement("div");
  card.className = "card";
  const v = document.createElement("div");
  v.className = "value";
  v.textContent = value;
  v.title = value;
  const l = document.createElement("div");
  l.className = "label";
  l.textContent = label;
  card.appendChild(v);
  card.appendChild(l);
  container.appendChild(card);
}

function renderBarList(container, emptyEl, entries, limit) {
  container.innerHTML = "";
  const rows = entries.slice(0, limit || entries.length);
  if (rows.length === 0) {
    if (emptyEl) emptyEl.hidden = false;
    container.hidden = true;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;
  container.hidden = false;
  const max = rows[0].seconds || 1;
  for (const { hostname, seconds } of rows) {
    const row = document.createElement("div");
    row.className = "bar-row";

    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = hostname;
    label.title = hostname;

    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${Math.max(2, (seconds / max) * 100)}%`;
    track.appendChild(fill);

    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = fmt(seconds);

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);
    container.appendChild(row);
  }
}

function renderWeekChart(container, days, totalsByDay) {
  container.innerHTML = "";
  const max = Math.max(1, ...days.map((d) => totalsByDay[d.key] || 0));
  for (const day of days) {
    const total = totalsByDay[day.key] || 0;
    const col = document.createElement("div");
    col.className = "day-col";

    const value = document.createElement("div");
    value.className = "day-value";
    value.textContent = total > 0 ? fmt(total) : "";

    const track = document.createElement("div");
    track.className = "day-bar-track";
    const fill = document.createElement("div");
    fill.className = "day-bar-fill";
    fill.style.height = `${total > 0 ? Math.max(4, (total / max) * 100) : 0}%`;
    track.appendChild(fill);

    const label = document.createElement("div");
    label.className = "day-label";
    label.textContent = day.label;

    const sub = document.createElement("div");
    sub.className = "day-sub";
    sub.textContent = day.dayOfMonth;

    col.appendChild(value);
    col.appendChild(track);
    col.appendChild(label);
    col.appendChild(sub);
    container.appendChild(col);
  }
}

async function render() {
  const res = await chrome.runtime.sendMessage({ type: "GET_HISTORY" });
  const history = res?.history || {};
  const today = res?.today || dateKey(new Date());

  const todaySites = siteTotalsForDay(history, today);
  const todayEntries = Object.entries(todaySites)
    .filter(([, s]) => s > 0)
    .map(([hostname, seconds]) => ({ hostname, seconds }))
    .sort((a, b) => b.seconds - a.seconds);
  const todayTotal = sumValues(todaySites);

  const days = lastNDays(7);
  const totalsByDay = {};
  for (const day of days) {
    totalsByDay[day.key] = sumValues(siteTotalsForDay(history, day.key));
  }
  const weekTotal = Object.values(totalsByDay).reduce((a, b) => a + b, 0);

  const allTimeSiteTotals = {};
  let allTimeTotal = 0;
  for (const sites of Object.values(history)) {
    for (const [hostname, seconds] of Object.entries(sites)) {
      allTimeSiteTotals[hostname] = (allTimeSiteTotals[hostname] || 0) + seconds;
      allTimeTotal += seconds;
    }
  }
  const allTimeEntries = Object.entries(allTimeSiteTotals)
    .filter(([, s]) => s > 0)
    .map(([hostname, seconds]) => ({ hostname, seconds }))
    .sort((a, b) => b.seconds - a.seconds);

  const cards = document.getElementById("cards");
  cards.innerHTML = "";
  renderCard(cards, fmt(todayTotal), "Today total");
  renderCard(cards, fmt(weekTotal), "Last 7 days");
  renderCard(cards, fmt(allTimeTotal), "All-time total");
  renderCard(
    cards,
    todayEntries.length ? todayEntries[0].hostname : "—",
    todayEntries.length ? `Top site today · ${fmt(todayEntries[0].seconds)}` : "Top site today"
  );

  renderBarList(document.getElementById("todayChart"), document.getElementById("todayEmpty"), todayEntries);
  renderWeekChart(document.getElementById("weekChart"), days, totalsByDay);
  renderBarList(
    document.getElementById("allTimeChart"),
    document.getElementById("allTimeEmpty"),
    allTimeEntries,
    10
  );
}

render();

// Keep the dashboard live: re-render whenever the background script persists
// new tracked time (or a reset happens), without needing a manual page reload.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.ptt_history) {
    render();
  }
});

// Belt-and-suspenders refresh in case a storage event is ever missed
// (e.g. the page was restored from bfcache).
setInterval(render, 5000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") render();
});
