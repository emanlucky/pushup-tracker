const STORAGE_KEY = "pushupTrackerV1";

const defaults = {
  defaultAmount: 10,
  dailyGoal: 100,
  history: {},
  activity: [],
  undo: []
};

let data = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaults, ...(saved || {}) };
  } catch {
    return { ...defaults };
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function add(amount) {
  amount = Number(amount);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const key = todayKey();
  const added = Math.round(amount);

  // Add to today's total
  data.history[key] = (data.history[key] || 0) + added;

  // Record exactly when this addition happened
  data.activity = data.activity || [];
  data.activity.push({
    timestamp: new Date().toISOString(),
    amount: added
  });

  // Save information needed for Undo
  data.undo.push({
    key,
    amount: added
  });

  if (data.undo.length > 50) data.undo.shift();

  save();
  render();
  navigator.vibrate?.(25);
}

function undo() {
  const last = data.undo.pop();
  if (!last) {
    toast("Nothing to undo");
    return;
  }

  data.history[last.key] = Math.max(0, (data.history[last.key] || 0) - last.amount);
  if (data.history[last.key] === 0) delete data.history[last.key];

  save();
  render();
  toast(`Removed ${last.amount} push-ups`);
}

function formatDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  });
}

function render() {
  const today = data.history[todayKey()] || 0;
  document.getElementById("todayTotal").textContent = today.toLocaleString();
  document.getElementById("addAmount").textContent = data.defaultAmount;

  const goal = Math.max(1, Number(data.dailyGoal) || 100);
  document.getElementById("goalText").textContent =
    `${today.toLocaleString()} / ${goal.toLocaleString()}`;

  document.getElementById("progressBar").style.width =
    `${Math.min(100, (today / goal) * 100)}%`;

  const entries = Object.entries(data.history)
    .sort(([a], [b]) => b.localeCompare(a));

  const history = document.getElementById("history");
  if (!entries.length) {
    history.innerHTML = `<div class="empty">No push-ups logged yet.</div>`;
  } else {
    history.innerHTML = entries.slice(0, 30).map(([date, count]) => `
      <div class="history-row">
        <span class="history-date">${formatDate(date)}</span>
        <span class="history-count">${Number(count).toLocaleString()}</span>
      </div>
    `).join("");
  }

  const values = Object.values(data.history).map(Number);
  const total = values.reduce((a, b) => a + b, 0);
  const average = values.length ? Math.round(total / values.length) : 0;
  const best = values.length ? Math.max(...values) : 0;

  document.getElementById("allTime").textContent = total.toLocaleString();
  document.getElementById("average").textContent = average.toLocaleString();
  document.getElementById("best").textContent = best.toLocaleString();
  document.getElementById("streak").textContent = `${calculateStreak()} 🔥`;
}

function calculateStreak() {
  let streak = 0;
  const d = new Date();

  while (true) {
    const key = dateKeyFromDate(d);
    if ((data.history[key] || 0) <= 0) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function dateKeyFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => el.classList.remove("show"), 1600);
}

const dialog = document.getElementById("settingsDialog");

document.getElementById("addBtn").addEventListener("click", () => add(data.defaultAmount));
document.getElementById("undoBtn").addEventListener("click", undo);

document.querySelectorAll(".quick-btn").forEach(btn => {
  btn.addEventListener("click", () => add(btn.dataset.amount));
});

document.getElementById("settingsBtn").addEventListener("click", () => {
  document.getElementById("defaultAmount").value = data.defaultAmount;
  document.getElementById("dailyGoal").value = data.dailyGoal;
  dialog.showModal();
});

document.getElementById("closeSettings").addEventListener("click", () => dialog.close());

document.querySelectorAll(".preset").forEach(btn => {
  btn.addEventListener("click", () => {
    document.getElementById("defaultAmount").value = btn.dataset.preset;
  });
});

document.getElementById("saveSettings").addEventListener("click", () => {
  const amount = Math.max(1, Math.round(Number(document.getElementById("defaultAmount").value) || 10));
  const goal = Math.max(1, Math.round(Number(document.getElementById("dailyGoal").value) || 100));

  data.defaultAmount = amount;
  data.dailyGoal = goal;
  save();
  render();
  dialog.close();
  toast("Settings saved");
});

document.getElementById("clearBtn").addEventListener("click", () => {
  if (!Object.keys(data.history).length) return;
  if (!confirm("Delete all push-up history? This cannot be undone.")) return;

  data.history = {};
  data.undo = [];
  save();
  render();
  toast("History cleared");
});

window.addEventListener("storage", render);

render();

// Allows the app to be installed on supported browsers.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
