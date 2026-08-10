const STORAGE_KEY = "pushupTrackerV1";

const defaults = {
  defaultAmount: 10,
  dailyGoal: 100,
  history: {},
  activity: [],
  undo: []
};

let data = load();


// =========================
// DATA / STORAGE
// =========================

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    return {
      ...defaults,
      ...(saved || {}),
      history: saved?.history || {},
      activity: saved?.activity || [],
      undo: saved?.undo || []
    };
  } catch (error) {
    console.error("Could not load saved data:", error);
    return {
      ...defaults,
      history: {},
      activity: [],
      undo: []
    };
  }
}


function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


// =========================
// DATE FUNCTIONS
// =========================

function todayKey() {
  return dateKeyFromDate(new Date());
}


function dateKeyFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}


function formatDate(key) {
  const [y, m, d] = key.split("-").map(Number);

  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}


// =========================
// ADD PUSH-UPS
// =========================

function add(amount) {
  amount = Number(amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  const added = Math.round(amount);
  const key = todayKey();
  const timestamp = new Date().toISOString();

  // Add to today's total
  data.history[key] = (data.history[key] || 0) + added;

  // Record the exact time and amount
  data.activity.push({
    id: Date.now() + Math.random(),
    timestamp: timestamp,
    amount: added,
    date: key
  });

  // Save information for Undo
  data.undo.push({
    activityId: data.activity[data.activity.length - 1].id,
    key: key,
    amount: added
  });

  // Keep the undo list reasonable
  if (data.undo.length > 50) {
    data.undo.shift();
  }

  save();
  render();

  // Small phone vibration if supported
  if (navigator.vibrate) {
    navigator.vibrate(25);
  }

  toast(`+${added} push-ups`);
}


// =========================
// UNDO
// =========================

function undo() {
  const last = data.undo.pop();

  if (!last) {
    toast("Nothing to undo");
    return;
  }

  // Remove from daily total
  data.history[last.key] =
    Math.max(0, (data.history[last.key] || 0) - last.amount);

  if (data.history[last.key] === 0) {
    delete data.history[last.key];
  }

  // Remove the corresponding activity entry
  data.activity = data.activity.filter(
    item => item.id !== last.activityId
  );

  save();
  render();

  toast(`Removed ${last.amount} push-ups`);
}


// =========================
// MAIN RENDER
// =========================

function render() {

  // -------------------------
  // Today's total
  // -------------------------

  const today = data.history[todayKey()] || 0;

  const todayTotal = document.getElementById("todayTotal");

  if (todayTotal) {
    todayTotal.textContent = today.toLocaleString();
  }


  // -------------------------
  // Button amount
  // -------------------------

  const addAmount = document.getElementById("addAmount");

  if (addAmount) {
    addAmount.textContent = data.defaultAmount;
  }


  // -------------------------
  // Daily goal
  // -------------------------

  const goal = Math.max(
    1,
    Number(data.dailyGoal) || 100
  );

  const goalText = document.getElementById("goalText");

  if (goalText) {
    goalText.textContent =
      `${today.toLocaleString()} / ${goal.toLocaleString()}`;
  }


  // -------------------------
  // Progress bar
  // -------------------------

  const progressBar =
    document.getElementById("progressBar");

  if (progressBar) {
    progressBar.style.width =
      `${Math.min(100, (today / goal) * 100)}%`;
  }


  // -------------------------
  // History
  // -------------------------

  const entries = Object.entries(data.history)
    .sort(([a], [b]) => b.localeCompare(a));

  const history =
    document.getElementById("history");

  if (history) {

    if (!entries.length) {

      history.innerHTML =
        `<div class="empty">
          No push-ups logged yet.
        </div>`;

    } else {

      history.innerHTML =
        entries.slice(0, 30).map(([date, count]) => {

          return `
            <div class="history-row">
              <span class="history-date">
                ${formatDate(date)}
              </span>

              <span class="history-count">
                ${Number(count).toLocaleString()}
              </span>
            </div>
          `;

        }).join("");
    }
  }


  // -------------------------
  // Activity Log
  // -------------------------

  renderActivityLog();


  // -------------------------
  // Statistics
  // -------------------------

  const values =
    Object.values(data.history).map(Number);

  const total =
    values.reduce((a, b) => a + b, 0);

  const average =
    values.length
      ? Math.round(total / values.length)
      : 0;

  const best =
    values.length
      ? Math.max(...values)
      : 0;


  const allTime =
    document.getElementById("allTime");

  if (allTime) {
    allTime.textContent =
      total.toLocaleString();
  }


  const averageElement =
    document.getElementById("average");

  if (averageElement) {
    averageElement.textContent =
      average.toLocaleString();
  }


  const bestElement =
    document.getElementById("best");

  if (bestElement) {
    bestElement.textContent =
      best.toLocaleString();
  }


  const streakElement =
    document.getElementById("streak");

  if (streakElement) {
    streakElement.textContent =
      `${calculateStreak()} 🔥`;
  }
}


// =========================
// ACTIVITY LOG
// =========================

function renderActivityLog() {

  const log =
    document.getElementById("activityLog");

  // If the HTML doesn't contain the activity log yet,
  // don't crash the rest of the app.
  if (!log) {
    return;
  }


  const today = todayKey();


  // Only show today's activity
  const todayActivity =
    data.activity
      .filter(item => {

        const date =
          item.date ||
          dateKeyFromDate(
            new Date(item.timestamp)
          );

        return date === today;

      })
      .sort(
        (a, b) =>
          new Date(b.timestamp) -
          new Date(a.timestamp)
      );


  if (!todayActivity.length) {

    log.innerHTML =
      `<div class="empty">
        No push-ups logged today.
      </div>`;

    return;
  }


  log.innerHTML =
    todayActivity.map(item => {

      const time =
        new Date(item.timestamp)
          .toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit"
          });


      return `
        <div class="activity-row">

          <div>
            <strong>
              +${Number(item.amount).toLocaleString()}
            </strong>

            <span>
              ${time}
            </span>
          </div>

        </div>
      `;

    }).join("");
}


// =========================
// STREAK
// =========================

function calculateStreak() {

  let streak = 0;

  const d = new Date();


  while (true) {

    const key =
      dateKeyFromDate(d);

    if ((data.history[key] || 0) <= 0) {
      break;
    }

    streak++;

    d.setDate(
      d.getDate() - 1
    );
  }


  return streak;
}


// =========================
// TOAST
// =========================

function toast(message) {

  const el =
    document.getElementById("toast");

  if (!el) {
    return;
  }

  el.textContent = message;

  el.classList.add("show");

  clearTimeout(window.toastTimer);

  window.toastTimer =
    setTimeout(() => {

      el.classList.remove("show");

    }, 1600);
}


// =========================
// SETTINGS
// =========================

const dialog =
  document.getElementById("settingsDialog");


// Settings button
const settingsBtn =
  document.getElementById("settingsBtn");

if (settingsBtn) {

  settingsBtn.addEventListener(
    "click",
    () => {

      document.getElementById(
        "defaultAmount"
      ).value = data.defaultAmount;

      document.getElementById(
        "dailyGoal"
      ).value = data.dailyGoal;

      dialog.showModal();
    }
  );
}


// Close settings
const closeSettings =
  document.getElementById("closeSettings");

if (closeSettings) {

  closeSettings.addEventListener(
    "click",
    () => dialog.close()
  );
}


// Preset buttons
document
  .querySelectorAll(".preset")
  .forEach(btn => {

    btn.addEventListener(
      "click",
      () => {

        document.getElementById(
          "defaultAmount"
        ).value = btn.dataset.preset;

      }
    );

  });


// Save settings
const saveSettings =
  document.getElementById("saveSettings");

if (saveSettings) {

  saveSettings.addEventListener(
    "click",
    () => {

      const amount =
        Math.max(
          1,
          Math.round(
            Number(
              document.getElementById(
                "defaultAmount"
              ).value
            ) || 10
          )
        );


      const goal =
        Math.max(
          1,
          Math.round(
            Number(
              document.getElementById(
                "dailyGoal"
              ).value
            ) || 100
          )
        );


      data.defaultAmount = amount;
      data.dailyGoal = goal;

      save();
      render();

      dialog.close();

      toast("Settings saved");
    }
  );
}


// =========================
// MAIN ADD BUTTON
// =========================

const addBtn =
  document.getElementById("addBtn");

if (addBtn) {

  addBtn.addEventListener(
    "click",
    () => {

      add(data.defaultAmount);

    }
  );
}


// =========================
// QUICK BUTTONS
// =========================

document
  .querySelectorAll(".quick-btn")
  .forEach(btn => {

    btn.addEventListener(
      "click",
      () => {

        add(btn.dataset.amount);

      }
    );

  });


// =========================
// UNDO BUTTON
// =========================

const undoBtn =
  document.getElementById("undoBtn");

if (undoBtn) {

  undoBtn.addEventListener(
    "click",
    undo
  );
}


// =========================
// CLEAR HISTORY
// =========================

const clearBtn =
  document.getElementById("clearBtn");

if (clearBtn) {

  clearBtn.addEventListener(
    "click",
    () => {

      if (
        !Object.keys(data.history).length
      ) {
        return;
      }


      if (
        !confirm(
          "Delete all push-up history? This cannot be undone."
        )
      ) {
        return;
      }


      data.history = {};
      data.activity = [];
      data.undo = [];

      save();
      render();

      toast("History cleared");
    }
  );
}


// =========================
// OTHER TABS / WINDOWS
// =========================

window.addEventListener(
  "storage",
  render
);


// =========================
// START APP
// =========================

render();


// =========================
// SERVICE WORKER
// =========================

if ("serviceWorker" in navigator) {

  navigator.serviceWorker
    .register("sw.js")
    .catch(error => {

      console.log(
        "Service worker registration failed:",
        error
      );

    });
}
