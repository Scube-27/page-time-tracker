// Page Time Tracker — content script
// Renders a small draggable, glass-green HUD in the corner of the page showing
// time spent on this page load ("session") and cumulative time on this site today.

(() => {
  if (window.__pttInjected) return;
  window.__pttInjected = true;

  const HOSTNAME = location.hostname || location.href;
  const POS_KEY = "ptt_widget_pos";
  const FLUSH_INTERVAL_MS = 5000;
  const BUDDY_SIZE = 44;
  const BUDDY_GAP = 8;
  const BUDDY_TIPS = [
    "You're doing great!",
    "Stay focused 🌱",
    "Small steps count.",
    "Take a breath.",
    "Keep going!",
    "Proud of you today.",
  ];

  let enabled = true;
  let todayBaseSeconds = 0; // last known-flushed total from background
  let pendingDelta = 0; // seconds accumulated locally, not yet flushed
  let sessionSeconds = 0; // time on this particular page load
  let tickTimer = null;
  let flushTimer = null;
  let hidden = false;

  let root = null; // shadow host element
  let shadow = null;
  let els = {};

  let animalEnabled = false;
  let animalType = "🐱";
  let animalRoot = null; // buddy shadow host element, stuck beside `root`
  let animalShadow = null;
  let animalEls = {};
  let speechInterval = null;

  function fmt(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  function isActive() {
    return document.visibilityState === "visible" && document.hasFocus();
  }

  function buildWidget() {
    if (root) return;

    root = document.createElement("div");
    root.style.all = "initial";
    root.style.position = "fixed";
    root.style.top = "16px";
    root.style.right = "16px";
    root.style.zIndex = "2147483647";
    document.documentElement.appendChild(root);

    shadow = root.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .wrap {
          font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
          position: relative;
          width: 64px;
          height: 64px;
          padding: 6px;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          background: rgba(6, 12, 10, 0.55);
          backdrop-filter: blur(10px) saturate(140%);
          -webkit-backdrop-filter: blur(10px) saturate(140%);
          border: 1px solid rgba(74, 222, 128, 0.4);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35), 0 0 14px rgba(16, 185, 129, 0.14) inset;
          color: #4ade80;
          user-select: none;
          cursor: grab;
          transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .wrap:active { cursor: grabbing; }
        .wrap.dragging { transition: none; }
        .dot {
          position: absolute;
          top: 6px;
          left: 7px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 6px #34d399;
        }
        .close {
          position: absolute;
          top: 1px;
          right: 1px;
          appearance: none;
          border: none;
          background: transparent;
          color: #6ee7b7;
          font-size: 12px;
          line-height: 1;
          cursor: pointer;
          padding: 3px 5px;
          border-radius: 6px;
          opacity: 0.55;
        }
        .close:hover {
          opacity: 1;
          color: #f87171;
          background: rgba(248, 113, 113, 0.12);
        }
        .session {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: #4ade80;
          text-shadow: 0 0 10px rgba(74, 222, 128, 0.65), 0 1px 3px rgba(0, 0, 0, 0.85);
          line-height: 1.1;
          margin-top: 4px;
        }
        .today {
          font-size: 8.5px;
          font-weight: 700;
          color: #a7f3d0;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
          letter-spacing: 0.02em;
        }
      </style>
      <div class="wrap" part="wrap" title="${HOSTNAME}">
        <span class="dot"></span>
        <button class="close" title="Hide widget for this page">&times;</button>
        <div class="session">0:00</div>
        <div class="today">0s today</div>
      </div>
    `;

    els.wrap = shadow.querySelector(".wrap");
    els.session = shadow.querySelector(".session");
    els.today = shadow.querySelector(".today");
    els.close = shadow.querySelector(".close");

    els.close.addEventListener("click", (e) => {
      e.stopPropagation();
      hideWidget();
    });

    setupDrag();
    restorePosition();
  }

  function hideWidget() {
    hidden = true;
    if (root) root.style.display = "none";
    positionBuddy();
  }

  function showWidget() {
    hidden = false;
    if (root) root.style.display = "block";
    positionBuddy();
  }

  function destroyWidget() {
    stopTimers();
    if (root) {
      root.remove();
      root = null;
      shadow = null;
      els = {};
    }
    destroyBuddy();
  }

  function buildBuddy() {
    if (animalRoot || !root) return;

    animalRoot = document.createElement("div");
    animalRoot.style.all = "initial";
    animalRoot.style.position = "fixed";
    animalRoot.style.zIndex = "2147483647";
    document.documentElement.appendChild(animalRoot);

    animalShadow = animalRoot.attachShadow({ mode: "open" });
    animalShadow.innerHTML = `
      <style>
        :host { all: initial; }
        .buddy {
          position: relative;
          width: ${BUDDY_SIZE}px;
          height: ${BUDDY_SIZE}px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(6, 12, 10, 0.55);
          backdrop-filter: blur(10px) saturate(140%);
          -webkit-backdrop-filter: blur(10px) saturate(140%);
          border: 1px solid rgba(74, 222, 128, 0.4);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 14px rgba(16, 185, 129, 0.14) inset;
          font-size: 22px;
          line-height: 1;
          user-select: none;
          animation: buddy-bob 2.4s ease-in-out infinite;
        }
        @keyframes buddy-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .bubble {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          width: max-content;
          max-width: 140px;
          transform: translateX(-50%) translateY(4px);
          text-align: center;
          background: rgba(6, 12, 10, 0.92);
          border: 1px solid rgba(74, 222, 128, 0.4);
          color: #a7f3d0;
          font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
          font-size: 10px;
          padding: 5px 9px;
          border-radius: 8px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s ease, transform 0.25s ease;
        }
        .bubble.show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      </style>
      <div class="buddy" title="Your buddy">
        <div class="bubble"></div>
        <span class="emoji">${animalType}</span>
      </div>
    `;

    animalEls.wrap = animalShadow.querySelector(".buddy");
    animalEls.emoji = animalShadow.querySelector(".emoji");
    animalEls.bubble = animalShadow.querySelector(".bubble");

    positionBuddy();
    startSpeechBubble();
  }

  function destroyBuddy() {
    stopSpeechBubble();
    if (animalRoot) {
      animalRoot.remove();
      animalRoot = null;
      animalShadow = null;
      animalEls = {};
    }
  }

  function positionBuddy() {
    if (!animalRoot) return;
    if (!root || hidden) {
      animalRoot.style.display = "none";
      return;
    }
    animalRoot.style.display = "block";
    const rect = root.getBoundingClientRect();
    let left = rect.left - BUDDY_SIZE - BUDDY_GAP;
    if (left < 4) {
      // Not enough room on the left — stick to the right side instead.
      left = rect.right + BUDDY_GAP;
    }
    left = Math.min(Math.max(4, left), window.innerWidth - BUDDY_SIZE - 4);
    let top = rect.top + (rect.height - BUDDY_SIZE) / 2;
    top = Math.min(Math.max(4, top), window.innerHeight - BUDDY_SIZE - 4);
    animalRoot.style.top = `${top}px`;
    animalRoot.style.left = `${left}px`;
  }

  function showRandomTip() {
    if (!animalEls.bubble) return;
    const tip = BUDDY_TIPS[Math.floor(Math.random() * BUDDY_TIPS.length)];
    animalEls.bubble.textContent = tip;
    animalEls.bubble.classList.add("show");
    setTimeout(() => {
      if (animalEls.bubble) animalEls.bubble.classList.remove("show");
    }, 4000);
  }

  function startSpeechBubble() {
    stopSpeechBubble();
    speechInterval = setInterval(showRandomTip, 17000);
    setTimeout(showRandomTip, 3000);
  }

  function stopSpeechBubble() {
    if (speechInterval) clearInterval(speechInterval);
    speechInterval = null;
  }

  function setupDrag() {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startTop = 0;
    let startLeft = 0;

    els.wrap.addEventListener("pointerdown", (e) => {
      if (e.target === els.close) return;
      dragging = true;
      els.wrap.classList.add("dragging");
      els.wrap.setPointerCapture(e.pointerId);
      const rect = root.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startTop = rect.top;
      startLeft = rect.left;
    });

    els.wrap.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let top = startTop + dy;
      let left = startLeft + dx;
      const rect = root.getBoundingClientRect();
      const maxTop = window.innerHeight - rect.height;
      const maxLeft = window.innerWidth - rect.width;
      top = Math.min(Math.max(0, top), Math.max(0, maxTop));
      left = Math.min(Math.max(0, left), Math.max(0, maxLeft));
      root.style.top = `${top}px`;
      root.style.left = `${left}px`;
      root.style.right = "auto";
      positionBuddy();
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      els.wrap.classList.remove("dragging");
      savePosition();
      positionBuddy();
    }

    els.wrap.addEventListener("pointerup", endDrag);
    els.wrap.addEventListener("pointercancel", endDrag);
  }

  function savePosition() {
    const rect = root.getBoundingClientRect();
    chrome.storage.local.set({
      [POS_KEY]: { top: rect.top, left: rect.left },
    });
  }

  async function restorePosition() {
    try {
      const { [POS_KEY]: pos } = await chrome.storage.local.get(POS_KEY);
      if (pos && typeof pos.top === "number" && typeof pos.left === "number") {
        const maxTop = Math.max(0, window.innerHeight - 76);
        const maxLeft = Math.max(0, window.innerWidth - 76);
        root.style.top = `${Math.min(pos.top, maxTop)}px`;
        root.style.left = `${Math.min(pos.left, maxLeft)}px`;
        root.style.right = "auto";
      }
    } catch (_) {
      /* ignore */
    } finally {
      positionBuddy();
    }
  }

  function render() {
    if (!els.session) return;
    els.session.textContent = fmt(sessionSeconds);
    els.today.textContent = `${fmt(todayBaseSeconds + pendingDelta)} today`;
  }

  function tick() {
    if (isActive()) {
      sessionSeconds += 1;
      pendingDelta += 1;
    }
    render();
  }

  async function flush() {
    if (pendingDelta === 0) return;
    const delta = pendingDelta;
    pendingDelta = 0;
    try {
      const res = await chrome.runtime.sendMessage({
        type: "ADD_TIME",
        hostname: HOSTNAME,
        seconds: delta,
      });
      if (res && typeof res.total === "number") {
        todayBaseSeconds = res.total;
      } else {
        todayBaseSeconds += delta;
      }
    } catch (_) {
      // extension context may have gone away (e.g. reload) — keep it local
      todayBaseSeconds += delta;
    }
    render();
  }

  function startTimers() {
    if (tickTimer) return;
    tickTimer = setInterval(tick, 1000);
    flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  }

  function stopTimers() {
    if (tickTimer) clearInterval(tickTimer);
    if (flushTimer) clearInterval(flushTimer);
    tickTimer = null;
    flushTimer = null;
  }

  window.addEventListener("beforeunload", () => {
    flush();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });

  async function init() {
    try {
      const state = await chrome.runtime.sendMessage({
        type: "GET_STATE",
        hostname: HOSTNAME,
      });
      enabled = state?.enabled !== false;
      todayBaseSeconds = state?.todayTotal || 0;
      animalEnabled = state?.animalEnabled === true;
      animalType = state?.animalType || animalType;
    } catch (_) {
      enabled = true;
      todayBaseSeconds = 0;
    }

    if (!enabled) return;
    buildWidget();
    render();
    startTimers();
    if (animalEnabled) buildBuddy();
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "ENABLED_CHANGED") {
      enabled = message.enabled;
      if (enabled) {
        if (!root) {
          buildWidget();
          render();
        } else {
          showWidget();
        }
        startTimers();
        if (animalEnabled && !animalRoot) buildBuddy();
      } else {
        destroyWidget();
      }
    } else if (message?.type === "ANIMAL_ENABLED_CHANGED") {
      animalEnabled = message.enabled;
      if (animalEnabled && enabled && !animalRoot) {
        buildBuddy();
      } else if (!animalEnabled) {
        destroyBuddy();
      }
    } else if (message?.type === "ANIMAL_TYPE_CHANGED") {
      animalType = message.animalType;
      if (animalEls.emoji) animalEls.emoji.textContent = animalType;
    }
  });

  window.addEventListener("resize", () => positionBuddy());

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
