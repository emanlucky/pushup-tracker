/* ============================================================
   PUSH-UP TRACKER
   Complete app.js replacement
   ============================================================ */

const STORAGE_KEY = "pushupTrackerV3";

const DEFAULT_DATA = {
  defaultAmount: 10,
  dailyGoal: 100,

  // Available push-up types
  pushupTypes: [
    "Regular",
    "Diamond",
    "Wide",
    "Decline",
    "Archer"
  ],

  selectedType: "Regular",

  // Daily totals:
  // {
  //   "2026-08-10": 150
  // }
  history: {},

  // Every individual button press:
  // {
  //   id,
  //   timestamp,
  //   amount,
  //   type
  // }
  activity: [],

  // Used by Undo
  undo: [],

  // Settings
  settings: {
    theme: "dark",
    haptics: true,
    notifications: false,
    restTime: 60
  }
};


/* ============================================================
   LOAD / SAVE
   ============================================================ */

let data = loadData();

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!saved) {
      return structuredClone(DEFAULT_DATA);
    }

    const merged = {
      ...structuredClone(DEFAULT_DATA),
      ...saved,
      settings: {
        ...DEFAULT_DATA.settings,
        ...(saved.settings || {})
      }
    };

    /*
      Migration for your OLD app.

      Your old app stored:

      history: {
        "2026-08-10": 150
      }

      but didn't have activity timestamps.

      We preserve those totals instead of deleting them.
    */

    if (!Array.isArray(merged.activity)) {
      merged.activity = [];
    }

    if (!Array.isArray(merged.undo)) {
      merged.undo = [];
    }

    return merged;

  } catch (error) {
    console.error("Could not load saved data:", error);
    return structuredClone(DEFAULT_DATA);
  }
}


function saveData() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
  );
}


/* ============================================================
   DATE / TIME HELPERS
   ============================================================ */

function todayKey() {
  return dateKeyFromDate(new Date());
}


function dateKeyFromDate(date) {
  const y = date.getFullYear();

  const m = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const d = String(
    date.getDate()
  ).padStart(2, "0");

  return `${y}-${m}-${d}`;
}


function formatDate(key) {
  const [year, month, day] =
    key.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}


function formatShortDate(key) {
  const [year, month, day] =
    key.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}


function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit"
    }
  );
}


function formatNumber(number) {
  return Number(number || 0).toLocaleString();
}


/* ============================================================
   ADD PUSH-UPS
   ============================================================ */

function addPushups(amount, type = data.selectedType) {

  amount = Number(amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  amount = Math.round(amount);

  const key = todayKey();

  // Update today's total
  data.history[key] =
    (data.history[key] || 0) + amount;

  // Create activity record
  const activity = {
    id:
      `${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`,

    timestamp:
      new Date().toISOString(),

    amount,

    type: type || "Regular"
  };

  data.activity.push(activity);

  // Undo information
  data.undo.push({
    activityId: activity.id,
    key,
    amount
  });

  if (data.undo.length > 100) {
    data.undo.shift();
  }

  saveData();

  renderEverything();

  if (data.settings.haptics) {
    navigator.vibrate?.(30);
  }

  showToast(`+${amount} ${type}`);

  checkGoalCompletion();
}


/* ============================================================
   UNDO
   ============================================================ */

function undoLast() {

  const last = data.undo.pop();

  if (!last) {
    showToast("Nothing to undo");
    return;
  }

  data.history[last.key] =
    Math.max(
      0,
      (data.history[last.key] || 0)
      - last.amount
    );

  if (data.history[last.key] === 0) {
    delete data.history[last.key];
  }

  data.activity =
    data.activity.filter(
      item => item.id !== last.activityId
    );

  saveData();

  renderEverything();

  showToast(
    `Removed ${last.amount} push-ups`
  );
}


/* ============================================================
   GOAL COMPLETION
   ============================================================ */

function checkGoalCompletion() {

  const today =
    data.history[todayKey()] || 0;

  const goal =
    Number(data.dailyGoal) || 100;

  if (
    today >= goal &&
    today - Number(
      data.activity[data.activity.length - 1]?.amount || 0
    ) < goal
  ) {

    showToast(
      `🎉 Daily goal complete! ${today} push-ups`
    );

    if (
      data.settings.notifications &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification(
        "Push-Up Goal Complete! 🎉",
        {
          body:
            `You reached ${today} push-ups today!`
        }
      );
    }
  }
}


/* ============================================================
   STREAKS
   ============================================================ */

function calculateCurrentStreak() {

  let streak = 0;

  const date = new Date();

  while (true) {

    const key =
      dateKeyFromDate(date);

    if (
      Number(data.history[key] || 0)
      <= 0
    ) {
      break;
    }

    streak++;

    date.setDate(
      date.getDate() - 1
    );
  }

  return streak;
}


function calculateLongestStreak() {

  const dates =
    Object.keys(data.history)
      .filter(
        key => Number(data.history[key]) > 0
      )
      .sort();

  if (!dates.length) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {

    const previous =
      new Date(dates[i - 1]);

    const currentDate =
      new Date(dates[i]);

    const difference =
      (
        currentDate - previous
      ) /
      (1000 * 60 * 60 * 24);

    if (difference === 1) {

      current++;

      longest =
        Math.max(
          longest,
          current
        );

    } else {

      current = 1;
    }
  }

  return longest;
}


/* ============================================================
   TOTALS / STATISTICS
   ============================================================ */

function getAllTimeTotal() {

  return Object.values(
    data.history
  ).reduce(
    (total, value) =>
      total + Number(value || 0),
    0
  );
}


function getBestDay() {

  const values =
    Object.values(data.history)
      .map(Number);

  return values.length
    ? Math.max(...values)
    : 0;
}


function getAveragePerDay() {

  const values =
    Object.values(data.history)
      .map(Number)
      .filter(value => value > 0);

  if (!values.length) {
    return 0;
  }

  return Math.round(
    values.reduce(
      (a, b) => a + b,
      0
    ) / values.length
  );
}


function getWeekTotal() {

  let total = 0;

  const date = new Date();

  for (let i = 0; i < 7; i++) {

    total += Number(
      data.history[
        dateKeyFromDate(date)
      ] || 0
    );

    date.setDate(
      date.getDate() - 1
    );
  }

  return total;
}


function getMonthTotal() {

  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    now.getMonth();

  return Object.entries(
    data.history
  )
    .filter(([key]) => {

      const [y, m] =
        key.split("-").map(Number);

      return (
        y === year &&
        m === month + 1
      );
    })
    .reduce(
      (sum, [, value]) =>
        sum + Number(value || 0),
      0
    );
}


function getLargestSet() {

  if (!data.activity.length) {
    return 0;
  }

  return Math.max(
    ...data.activity.map(
      item => Number(item.amount || 0)
    )
  );
}


function getMostSetsDay() {

  if (!data.activity.length) {
    return 0;
  }

  const counts = {};

  data.activity.forEach(item => {

    const key =
      dateKeyFromDate(
        new Date(item.timestamp)
      );

    counts[key] =
      (counts[key] || 0) + 1;
  });

  return Math.max(
    ...Object.values(counts)
  );
}


/* ============================================================
   SET GROUPING
   Groups activity that happens close together
   ============================================================ */

function getGroupedSets(dateKey) {

  const entries =
    data.activity
      .filter(item =>
        dateKeyFromDate(
          new Date(item.timestamp)
        ) === dateKey
      )
      .sort(
        (a, b) =>
          new Date(a.timestamp)
          - new Date(b.timestamp)
      );

  if (!entries.length) {
    return [];
  }

  const groups = [];

  let currentGroup = {
    timestamp:
      entries[0].timestamp,

    amount:
      entries[0].amount,

    type:
      entries[0].type
  };

  for (let i = 1; i < entries.length; i++) {

    const previous =
      new Date(
        entries[i - 1].timestamp
      );

    const current =
      new Date(
        entries[i].timestamp
      );

    const difference =
      (current - previous) /
      1000;

    /*
      If button presses happen within
      5 minutes, group them together.
    */

    if (difference <= 300) {

      currentGroup.amount +=
        entries[i].amount;

    } else {

      groups.push(currentGroup);

      currentGroup = {
        timestamp:
          entries[i].timestamp,

        amount:
          entries[i].amount,

        type:
          entries[i].type
      };
    }
  }

  groups.push(currentGroup);

  return groups;
}


/* ============================================================
   ACTIVITY LOG
   ============================================================ */

function renderActivityLog() {

  const log =
    document.getElementById(
      "activityLog"
    );

  if (!log) {
    return;
  }

  const today =
    todayKey();

  const activity =
    data.activity
      .filter(item =>
        dateKeyFromDate(
          new Date(item.timestamp)
        ) === today
      )
      .reverse();

  if (!activity.length) {

    log.innerHTML = `
      <div class="empty">
        No push-ups logged today.
      </div>
    `;

    return;
  }

  log.innerHTML =
    activity.map(item => {

      return `
        <div class="activity-row">

          <div>
            <strong>
              +${formatNumber(item.amount)}
            </strong>

            <span>
              ${item.type || "Regular"}
            </span>
          </div>

          <div>
            <strong>
              ${formatTime(item.timestamp)}
            </strong>
          </div>

        </div>
      `;

    }).join("");
}


/* ============================================================
   HISTORY
   ============================================================ */

function renderHistory() {

  const history =
    document.getElementById(
      "history"
    );

  if (!history) {
    return;
  }

  const entries =
    Object.entries(data.history)
      .sort(
        ([a], [b]) =>
          b.localeCompare(a)
      );

  if (!entries.length) {

    history.innerHTML = `
      <div class="empty">
        No push-ups logged yet.
      </div>
    `;

    return;
  }

  history.innerHTML =
    entries
      .slice(0, 100)
      .map(([date, count]) => {

        return `
          <div class="history-row">

            <span class="history-date">
              ${formatDate(date)}
            </span>

            <strong>
              ${formatNumber(count)}
            </strong>

          </div>
        `;

      })
      .join("");
}


/* ============================================================
   HOME DASHBOARD
   ============================================================ */

function renderHome() {

  const today =
    Number(
      data.history[todayKey()] || 0
    );

  const goal =
    Math.max(
      1,
      Number(data.dailyGoal) || 100
    );

  const total =
    document.getElementById(
      "todayTotal"
    );

  if (total) {
    total.textContent =
      formatNumber(today);
  }

  const addAmount =
    document.getElementById(
      "addAmount"
    );

  if (addAmount) {
    addAmount.textContent =
      data.defaultAmount;
  }

  const goalText =
    document.getElementById(
      "goalText"
    );

  if (goalText) {
    goalText.textContent =
      `${formatNumber(today)} / ${formatNumber(goal)}`;
  }

  const progress =
    document.getElementById(
      "progressBar"
    );

  if (progress) {

    progress.style.width =
      `${Math.min(
        100,
        today / goal * 100
      )}%`;
  }

  const allTime =
    document.getElementById(
      "allTime"
    );

  if (allTime) {
    allTime.textContent =
      formatNumber(
        getAllTimeTotal()
      );
  }

  const average =
    document.getElementById(
      "average"
    );

  if (average) {
    average.textContent =
      formatNumber(
        getAveragePerDay()
      );
  }

  const best =
    document.getElementById(
      "best"
    );

  if (best) {
    best.textContent =
      formatNumber(
        getBestDay()
      );
  }

  const streak =
    document.getElementById(
      "streak"
    );

  if (streak) {
    streak.textContent =
      `${calculateCurrentStreak()} 🔥`;
  }
}


/* ============================================================
   CALENDAR
   ============================================================ */

let calendarDate =
  new Date();


function renderCalendar() {

  const container =
    document.getElementById(
      "calendar"
    );

  if (!container) {
    return;
  }

  const year =
    calendarDate.getFullYear();

  const month =
    calendarDate.getMonth();

  const firstDay =
    new Date(
      year,
      month,
      1
    ).getDay();

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  let html = `
    <div class="calendar-header">

      <button onclick="changeCalendar(-1)">
        ‹
      </button>

      <strong>
        ${calendarDate.toLocaleDateString(
          undefined,
          {
            month: "long",
            year: "numeric"
          }
        )}
      </strong>

      <button onclick="changeCalendar(1)">
        ›
      </button>

    </div>

    <div class="calendar-weekdays">

      <span>Sun</span>
      <span>Mon</span>
      <span>Tue</span>
      <span>Wed</span>
      <span>Thu</span>
      <span>Fri</span>
      <span>Sat</span>

    </div>

    <div class="calendar-grid">
  `;

  for (let i = 0; i < firstDay; i++) {

    html += `
      <div class="calendar-empty"></div>
    `;
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {

    const date =
      new Date(
        year,
        month,
        day
      );

    const key =
      dateKeyFromDate(date);

    const amount =
      Number(
        data.history[key] || 0
      );

    const isToday =
      key === todayKey();

    html += `
      <button
        class="calendar-day ${
          isToday
            ? "today"
            : ""
        } ${
          amount > 0
            ? "completed"
            : ""
        }"
        onclick="showDayDetails('${key}')"
      >

        <span>${day}</span>

        ${
          amount > 0
            ? `<small>${formatNumber(amount)}</small>`
            : ""
        }

      </button>
    `;
  }

  html += `
    </div>
  `;

  container.innerHTML = html;
}


function changeCalendar(amount) {

  calendarDate.setMonth(
    calendarDate.getMonth() + amount
  );

  renderCalendar();
}


function showDayDetails(key) {

  const entries =
    data.activity
      .filter(item =>
        dateKeyFromDate(
          new Date(item.timestamp)
        ) === key
      )
      .sort(
        (a, b) =>
          new Date(a.timestamp)
          - new Date(b.timestamp)
      );

  const total =
    Number(
      data.history[key] || 0
    );

  let message =
    `${formatDate(key)}\n\n` +
    `Total: ${total} push-ups\n\n`;

  if (!entries.length) {

    message +=
      "No individual activity records.";

  } else {

    message +=
      entries
        .map(item =>
          `+${item.amount} ${
            item.type || "Regular"
          } — ${formatTime(
            item.timestamp
          )}`
        )
        .join("\n");
  }

  alert(message);
}


/* ============================================================
   STATS SCREEN
   ============================================================ */

function renderStats() {

  const stats =
    document.getElementById(
      "statsContent"
    );

  if (!stats) {
    return;
  }

  const week =
    getWeekTotal();

  const month =
    getMonthTotal();

  const total =
    getAllTimeTotal();

  const best =
    getBestDay();

  const longest =
    calculateLongestStreak();

  const current =
    calculateCurrentStreak();

  const largestSet =
    getLargestSet();

  const mostSets =
    getMostSetsDay();

  stats.innerHTML = `

    <div class="stats-cards">

      <div class="stat-card">
        <span>All Time</span>
        <strong>${formatNumber(total)}</strong>
      </div>

      <div class="stat-card">
        <span>This Week</span>
        <strong>${formatNumber(week)}</strong>
      </div>

      <div class="stat-card">
        <span>This Month</span>
        <strong>${formatNumber(month)}</strong>
      </div>

      <div class="stat-card">
        <span>Best Day</span>
        <strong>${formatNumber(best)}</strong>
      </div>

      <div class="stat-card">
        <span>Average / Day</span>
        <strong>${formatNumber(
          getAveragePerDay()
        )}</strong>
      </div>

      <div class="stat-card">
        <span>Current Streak</span>
        <strong>${current} 🔥</strong>
      </div>

      <div class="stat-card">
        <span>Longest Streak</span>
        <strong>${longest} 🔥</strong>
      </div>

      <div class="stat-card">
        <span>Largest Set</span>
        <strong>${formatNumber(
          largestSet
        )}</strong>
      </div>

      <div class="stat-card">
        <span>Most Sets / Day</span>
        <strong>${mostSets}</strong>
      </div>

    </div>

    <h3>Last 7 Days</h3>

    <div class="weekly-chart">
      ${renderWeeklyChart()}
    </div>

  `;
}


function renderWeeklyChart() {

  const days = [];

  const date =
    new Date();

  for (let i = 6; i >= 0; i--) {

    const d =
      new Date(date);

    d.setDate(
      date.getDate() - i
    );

    const key =
      dateKeyFromDate(d);

    days.push({
      key,
      amount:
        Number(
          data.history[key] || 0
        ),
      label:
        d.toLocaleDateString(
          undefined,
          {
            weekday: "short"
          }
        )
    });
  }

  const max =
    Math.max(
      1,
      ...days.map(
        day => day.amount
      )
    );

  return days.map(day => {

    const height =
      Math.max(
        5,
        day.amount / max * 100
      );

    return `
      <div class="chart-column">

        <div class="chart-value">
          ${day.amount}
        </div>

        <div
          class="chart-bar"
          style="height:${height}%"
        ></div>

        <span>
          ${day.label}
        </span>

      </div>
    `;

  }).join("");
}


/* ============================================================
   SETTINGS
   ============================================================ */

function openSettings() {

  const dialog =
    document.getElementById(
      "settingsDialog"
    );

  if (!dialog) {
    return;
  }

  const defaultAmount =
    document.getElementById(
      "defaultAmount"
    );

  const dailyGoal =
    document.getElementById(
      "dailyGoal"
    );

  if (defaultAmount) {
    defaultAmount.value =
      data.defaultAmount;
  }

  if (dailyGoal) {
    dailyGoal.value =
      data.dailyGoal;
  }

  dialog.showModal();
}


function saveSettings() {

  const amount =
    Math.max(
      1,
      Math.round(
        Number(
          document.getElementById(
            "defaultAmount"
          )?.value
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
          )?.value
        ) || 100
      )
    );

  data.defaultAmount =
    amount;

  data.dailyGoal =
    goal;

  saveData();

  renderEverything();

  const dialog =
    document.getElementById(
      "settingsDialog"
    );

  if (dialog) {
    dialog.close();
  }

  showToast(
    "Settings saved"
  );
}


/* ============================================================
   PUSH-UP TYPE
   ============================================================ */

function selectPushupType(type) {

  data.selectedType =
    type;

  saveData();

  renderTypeSelector();

  showToast(
    `${type} selected`
  );
}


function renderTypeSelector() {

  const container =
    document.getElementById(
      "pushupTypes"
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    data.pushupTypes
      .map(type => {

        return `
          <button
            class="${
              data.selectedType === type
                ? "selected"
                : ""
            }"
            onclick="selectPushupType('${type}')"
          >
            ${type}
          </button>
        `;

      })
      .join("");
}


/* ============================================================
   REST TIMER
   ============================================================ */

let restInterval = null;
let restSeconds = 0;


function startRestTimer(seconds = data.settings.restTime) {

  clearInterval(restInterval);

  restSeconds =
    Number(seconds) || 60;

  updateRestTimer();

  restInterval =
    setInterval(() => {

      restSeconds--;

      updateRestTimer();

      if (restSeconds <= 0) {

        clearInterval(
          restInterval
        );

        showToast(
          "⏰ Rest finished!"
        );

        if (
          data.settings.haptics
        ) {
          navigator.vibrate?.([
            200,
            100,
            200
          ]);
        }
      }

    }, 1000);
}


function stopRestTimer() {

  clearInterval(
    restInterval
  );

  restSeconds = 0;

  updateRestTimer();
}


function updateRestTimer() {

  const timer =
    document.getElementById(
      "restTimer"
    );

  if (!timer) {
    return;
  }

  const minutes =
    Math.floor(
      restSeconds / 60
    );

  const seconds =
    String(
      restSeconds % 60
    ).padStart(2, "0");

  timer.textContent =
    `${minutes}:${seconds}`;
}


/* ============================================================
   EXPORT / IMPORT
   ============================================================ */

function exportData() {

  const json =
    JSON.stringify(
      data,
      null,
      2
    );

  const blob =
    new Blob(
      [json],
      {
        type:
          "application/json"
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;

  link.download =
    `pushup-tracker-${todayKey()}.json`;

  link.click();

  URL.revokeObjectURL(url);

  showToast(
    "Data exported"
  );
}


function importData(file) {

  if (!file) {
    return;
  }

  const reader =
    new FileReader();

  reader.onload =
    event => {

      try {

        const imported =
          JSON.parse(
            event.target.result
          );

        if (
          !imported.history
        ) {
          throw new Error(
            "Invalid file"
          );
        }

        data = {
          ...structuredClone(
            DEFAULT_DATA
          ),
          ...imported,
          settings: {
            ...DEFAULT_DATA.settings,
            ...(imported.settings || {})
          }
        };

        saveData();

        renderEverything();

        showToast(
          "Data imported successfully"
        );

      } catch {

        alert(
          "That file is not a valid Push-Up Tracker backup."
        );
      }
    };

  reader.readAsText(file);
}


/* ============================================================
   DELETE ALL DATA
   ============================================================ */

function deleteAllData() {

  const confirmed =
    confirm(
      "Delete ALL push-up history, activity, statistics and settings? This cannot be undone."
    );

  if (!confirmed) {
    return;
  }

  localStorage.removeItem(
    STORAGE_KEY
  );

  data =
    structuredClone(
      DEFAULT_DATA
    );

  saveData();

  renderEverything();

  showToast(
    "All data deleted"
  );
}


/* ============================================================
   NOTIFICATIONS
   ============================================================ */

async function requestNotifications() {

  if (
    !("Notification" in window)
  ) {
    alert(
      "Notifications are not supported by this browser."
    );

    return;
  }

  const permission =
    await Notification.requestPermission();

  data.settings.notifications =
    permission === "granted";

  saveData();

  showToast(
    data.settings.notifications
      ? "Notifications enabled"
      : "Notifications disabled"
  );
}


/* ============================================================
   THEME
   ============================================================ */

function applyTheme() {

  const theme =
    data.settings.theme;

  document.documentElement
    .setAttribute(
      "data-theme",
      theme
    );
}


/* ============================================================
   TOAST
   ============================================================ */

function showToast(message) {

  let toast =
    document.getElementById(
      "toast"
    );

  if (!toast) {

    toast =
      document.createElement(
        "div"
      );

    toast.id =
      "toast";

    toast.className =
      "toast";

    document.body.appendChild(
      toast
    );
  }

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );

  clearTimeout(
    window.toastTimer
  );

  window.toastTimer =
    setTimeout(() => {

      toast.classList.remove(
        "show"
      );

    }, 1800);
}


/* ============================================================
   NAVIGATION
   ============================================================ */

function switchScreen(screen) {

  document
    .querySelectorAll(
      ".app-screen"
    )
    .forEach(element => {

      element.style.display =
        element.dataset.screen === screen
          ? "block"
          : "none";
    });

  document
    .querySelectorAll(
      ".nav-button"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.screen === screen
      );
    });

  if (screen === "calendar") {
    renderCalendar();
  }

  if (screen === "stats") {
    renderStats();
  }

  if (screen === "history") {
    renderHistoryScreen();
  }
}


/* ============================================================
   HISTORY SCREEN
   ============================================================ */

function renderHistoryScreen() {

  const container =
    document.getElementById(
      "fullHistory"
    );

  if (!container) {
    return;
  }

  const entries =
    Object.keys(data.history)
      .sort()
      .reverse();

  if (!entries.length) {

    container.innerHTML =
      `<div class="empty">No history yet.</div>`;

    return;
  }

  container.innerHTML =
    entries.map(key => {

      const total =
        Number(
          data.history[key] || 0
        );

      const activity =
        data.activity
          .filter(item =>
            dateKeyFromDate(
              new Date(item.timestamp)
            ) === key
          )
          .sort(
            (a, b) =>
              new Date(a.timestamp)
              - new Date(b.timestamp)
          );

      return `
        <div class="history-day">

          <div class="history-day-header">

            <strong>
              ${formatDate(key)}
            </strong>

            <strong>
              ${formatNumber(total)}
            </strong>

          </div>

          ${
            activity.length
              ? activity.map(item => `
                  <div class="history-activity">

                    <span>
                      +${item.amount}
                      ${
                        item.type
                          ? ` ${item.type}`
                          : ""
                      }
                    </span>

                    <span>
                      ${formatTime(
                        item.timestamp
                      )}
                    </span>

                  </div>
                `).join("")
              : `
                <div class="empty">
                  Older total — no timestamp data
                  was recorded.
                </div>
              `
          }

        </div>
      `;

    }).join("");
}


/* ============================================================
   DYNAMIC APP UI
   ============================================================ */

function createExtraUI() {

  const app =
    document.querySelector(
      ".app"
    );

  if (!app) {
    return;
  }

  /*
    Add navigation if it doesn't exist.
  */

  if (
    !document.getElementById(
      "appNavigation"
    )
  ) {

    const nav =
      document.createElement(
        "nav"
      );

    nav.id =
      "appNavigation";

    nav.innerHTML = `

      <button
        class="nav-button active"
        data-screen="home"
        onclick="switchScreen('home')"
      >
        🏠
        <span>Home</span>
      </button>

      <button
        class="nav-button"
        data-screen="history"
        onclick="switchScreen('history')"
      >
        📜
        <span>History</span>
      </button>

      <button
        class="nav-button"
        data-screen="calendar"
        onclick="switchScreen('calendar')"
      >
        📅
        <span>Calendar</span>
      </button>

      <button
        class="nav-button"
        data-screen="stats"
        onclick="switchScreen('stats')"
      >
        📊
        <span>Stats</span>
      </button>

    `;

    app.appendChild(
      nav
    );
  }


  /*
    Add Activity Log
  */

  if (
    !document.getElementById(
      "activityLog"
    )
  ) {

    const section =
      document.createElement(
        "section"
      );

    section.className =
      "card";

    section.innerHTML = `

      <div class="section-title">

        <h2>
          Today's Activity
        </h2>

        <span class="small-label">
          TIME + AMOUNT
        </span>

      </div>

      <div id="activityLog"></div>

    `;

    app.appendChild(
      section
    );
  }


  /*
    Push-up types
  */

  if (
    !document.getElementById(
      "pushupTypes"
    )
  ) {

    const section =
      document.createElement(
        "section"
      );

    section.className =
      "card";

    section.innerHTML = `

      <div class="section-title">

        <h2>
          Push-Up Type
        </h2>

      </div>

      <div id="pushupTypes"
           class="type-buttons">
      </div>

    `;

    app.appendChild(
      section
    );
  }


  /*
    Rest Timer
  */

  if (
    !document.getElementById(
      "restTimer"
    )
  ) {

    const section =
      document.createElement(
        "section"
      );

    section.className =
      "card";

    section.innerHTML = `

      <div class="section-title">

        <h2>
          Rest Timer
        </h2>

      </div>

      <div
        id="restTimer"
        class="rest-timer"
      >
        1:00
      </div>

      <div class="timer-buttons">

        <button onclick="startRestTimer()">
          Start
        </button>

        <button onclick="stopRestTimer()">
          Reset
        </button>

      </div>

    `;

    app.appendChild(
      section
    );
  }


  /*
    Calendar screen
  */

  if (
    !document.getElementById(
      "calendar"
    )
  ) {

    const screen =
      document.createElement(
        "section"
      );

    screen.className =
      "app-screen card";

    screen.dataset.screen =
      "calendar";

    screen.style.display =
      "none";

    screen.innerHTML = `

      <h2>
        Calendar
      </h2>

      <div id="calendar"></div>

    `;

    app.appendChild(
      screen
    );
  }


  /*
    Stats screen
  */

  if (
    !document.getElementById(
      "statsContent"
    )
  ) {

    const screen =
      document.createElement(
        "section"
      );

    screen.className =
      "app-screen card";

    screen.dataset.screen =
      "stats";

    screen.style.display =
      "none";

    screen.innerHTML = `

      <h2>
        Statistics
      </h2>

      <div id="statsContent"></div>

    `;

    app.appendChild(
      screen
    );
  }


  /*
    Full history screen
  */

  if (
    !document.getElementById(
      "fullHistory"
    )
  ) {

    const screen =
      document.createElement(
        "section"
      );

    screen.className =
      "app-screen card";

    screen.dataset.screen =
      "history";

    screen.style.display =
      "none";

    screen.innerHTML = `

      <div class="section-title">

        <h2>
          Full History
        </h2>

      </div>

      <div id="fullHistory"></div>

    `;

    app.appendChild(
      screen
    );
  }


  /*
    Data controls
  */

  if (
    !document.getElementById(
      "dataControls"
    )
  ) {

    const section =
      document.createElement(
        "section"
      );

    section.className =
      "card";

    section.id =
      "dataControls";

    section.innerHTML = `

      <div class="section-title">

        <h2>
          Data
        </h2>

      </div>

      <button
        class="wide-button"
        onclick="exportData()"
      >
        💾 Export Backup
      </button>

      <label class="wide-button">

        📥 Import Backup

        <input
          type="file"
          accept=".json,application/json"
          onchange="importData(this.files[0])"
          style="display:none"
        >

      </label>

      <button
        class="wide-button danger"
        onclick="deleteAllData()"
      >
        🗑️ Delete All Data
      </button>

    `;

    app.appendChild(
      section
    );
  }
}


/* ============================================================
   BUTTON EVENT SETUP
   ============================================================ */

function setupEvents() {

  const addButton =
    document.getElementById(
      "addBtn"
    );

  if (addButton) {

    addButton.onclick =
      () => {

        addPushups(
          data.defaultAmount,
          data.selectedType
        );

      };
  }


  /*
    Quick buttons
  */

  document
    .querySelectorAll(
      ".quick-btn"
    )
    .forEach(button => {

      button.onclick =
        () => {

          addPushups(
            Number(
              button.dataset.amount
            ),
            data.selectedType
          );

        };
    });


  /*
    Undo
  */

  const undo =
    document.getElementById(
      "undoBtn"
    );

  if (undo) {
    undo.onclick =
      undoLast;
  }


  /*
    Settings
  */

  const settings =
    document.getElementById(
      "settingsBtn"
    );

  if (settings) {
    settings.onclick =
      openSettings;
  }


  const closeSettings =
    document.getElementById(
      "closeSettings"
    );

  if (closeSettings) {

    closeSettings.onclick =
      () => {

        document
          .getElementById(
            "settingsDialog"
          )
          ?.close();

      };
  }


  const saveSettingsButton =
    document.getElementById(
      "saveSettings"
    );

  if (saveSettingsButton) {

    saveSettingsButton.onclick =
      saveSettings;
  }


  /*
    Clear history
  */

  const clear =
    document.getElementById(
      "clearBtn"
    );

  if (clear) {

    clear.onclick =
      () => {

        if (
          !Object.keys(
            data.history
          ).length
        ) {
          return;
        }

        if (
          !confirm(
            "Delete all push-up history?"
          )
        ) {
          return;
        }

        data.history = {};
        data.activity = [];
        data.undo = [];

        saveData();

        renderEverything();

        showToast(
          "History cleared"
        );
      };
  }
}


/* ============================================================
   RENDER EVERYTHING
   ============================================================ */

function renderEverything() {

  applyTheme();

  renderHome();

  renderHistory();

  renderActivityLog();

  renderTypeSelector();

  renderCalendar();

  renderStats();

  renderHistoryScreen();

  updateRestTimer();
}


/* ============================================================
   INITIALIZE
   ============================================================ */

createExtraUI();

setupEvents();

renderEverything();


/* ============================================================
   SERVICE WORKER
   ============================================================ */

if (
  "serviceWorker" in navigator
) {

  navigator.serviceWorker
    .register("sw.js")
    .catch(
      error =>
        console.log(
          "Service worker error:",
          error
        )
    );
}


/* ============================================================
   GLOBAL FUNCTIONS
   Needed because HTML onclick attributes
   call these functions.
   ============================================================ */

window.addPushups =
  addPushups;

window.undoLast =
  undoLast;

window.switchScreen =
  switchScreen;

window.changeCalendar =
  changeCalendar;

window.showDayDetails =
  showDayDetails;

window.selectPushupType =
  selectPushupType;

window.startRestTimer =
  startRestTimer;

window.stopRestTimer =
  stopRestTimer;

window.exportData =
  exportData;

window.importData =
  importData;

window.deleteAllData =
  deleteAllData;

window.requestNotifications =
  requestNotifications;
