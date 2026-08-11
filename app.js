/* ============================================================
   PUSH-UP TRACKER
   Complete application JavaScript
============================================================ */

"use strict";


/* ============================================================
   STORAGE
============================================================ */

const STORAGE_KEY = "pushupTrackerData_v5";


/* ============================================================
   DEFAULT DATA
============================================================ */

const DEFAULT_DATA = {
  settings: {
    defaultAmount: 10,
    dailyGoal: 100,
    restTimer: 60
  },

  history: {},

  activities: [],

  selectedType: "standard"
};


/* ============================================================
   LOAD DATA
============================================================ */

function loadData() {

  try {

    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return structuredClone(DEFAULT_DATA);
    }

    const parsed = JSON.parse(saved);

    return {
      ...structuredClone(DEFAULT_DATA),
      ...parsed,

      settings: {
        ...DEFAULT_DATA.settings,
        ...(parsed.settings || {})
      },

      history: parsed.history || {},

      activities: Array.isArray(parsed.activities)
        ? parsed.activities
        : [],

      selectedType: parsed.selectedType || "standard"
    };

  } catch (error) {

    console.error("Could not load saved data:", error);

    return structuredClone(DEFAULT_DATA);

  }

}


let data = loadData();


/* ============================================================
   SAVE DATA
============================================================ */

function saveData() {

  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );

  } catch (error) {

    console.error("Could not save data:", error);

  }

}


/* ============================================================
   DATE HELPERS
============================================================ */

function pad(number) {

  return String(number).padStart(2, "0");

}


function todayKey() {

  const now = new Date();

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join("-");

}


function dateKey(date) {

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-");

}


function parseDateKey(key) {

  const parts = key.split("-").map(Number);

  return new Date(
    parts[0],
    parts[1] - 1,
    parts[2]
  );

}


function formatDate(key) {

  const date = parseDateKey(key);

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

}


function formatShortDate(key) {

  const date = parseDateKey(key);

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });

}


function formatTime(timestamp) {

  const date = new Date(timestamp);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

}


function formatFullTimestamp(timestamp) {

  const date = new Date(timestamp);

  return date.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

}


/* ============================================================
   TODAY
============================================================ */

function getTodayTotal() {

  return Number(data.history[todayKey()] || 0);

}


/* ============================================================
   ADD PUSH-UPS
============================================================ */

function addPushups(amount) {

  amount = Number(amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  amount = Math.floor(amount);

  const key = todayKey();

  if (!data.history[key]) {
    data.history[key] = 0;
  }

  data.history[key] += amount;


  /* Activity entry */

  data.activities.push({
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    date: key,
    amount: amount,
    type: data.selectedType || "standard"
  });


  saveData();

  render();

  showToast(`+${amount} push-ups`);

}


/* ============================================================
   UNDO
============================================================ */

function undoLastAddition() {

  if (!data.activities.length) {

    showToast("Nothing to undo");

    return;

  }


  const activity = data.activities[data.activities.length - 1];

  const key = activity.date;

  if (data.history[key]) {

    data.history[key] -= Number(activity.amount);

    if (data.history[key] <= 0) {

      delete data.history[key];

    }

  }


  data.activities.pop();

  saveData();

  render();

  showToast("Last addition undone");

}


/* ============================================================
   RENDER EVERYTHING
============================================================ */

function render() {

  renderHome();

  renderHistory();

  renderActivityLog();

  renderStats();

  renderCalendar();

  renderFullHistory();

  renderSelectedDay();

  updateSettingsUI();

}


/* ============================================================
   HOME
============================================================ */

function renderHome() {

  const total = getTodayTotal();

  const totalElement =
    document.getElementById("todayTotal");

  const amountElement =
    document.getElementById("addAmount");

  const goalText =
    document.getElementById("goalText");

  const progressBar =
    document.getElementById("progressBar");


  if (totalElement) {

    totalElement.textContent =
      total.toLocaleString();

  }


  if (amountElement) {

    amountElement.textContent =
      Number(data.settings.defaultAmount);

  }


  const goal =
    Math.max(
      1,
      Number(data.settings.dailyGoal) || 100
    );


  if (goalText) {

    goalText.textContent =
      `${total.toLocaleString()} / ${goal.toLocaleString()}`;

  }


  if (progressBar) {

    const percentage =
      Math.min(
        100,
        (total / goal) * 100
      );

    progressBar.style.width =
      `${percentage}%`;

  }

}


/* ============================================================
   HISTORY
============================================================ */

function renderHistory() {

  const historyElement =
    document.getElementById("history");

  if (!historyElement) {
    return;
  }


  const entries =
    Object.entries(data.history)
      .filter(([, count]) => Number(count) > 0)
      .sort(([a], [b]) => b.localeCompare(a));


  if (!entries.length) {

    historyElement.innerHTML = `
      <div class="empty">
        No push-ups logged yet.
      </div>
    `;

    return;

  }


  historyElement.innerHTML =
    entries
      .slice(0, 30)
      .map(([date, count]) => {

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

      })
      .join("");

}


/* ============================================================
   ACTIVITY LOG
============================================================ */

function renderActivityLog() {

  const activityElement =
    document.getElementById("activityLog");

  if (!activityElement) {
    return;
  }


  const today =
    todayKey();


  const activities =
    data.activities
      .filter(activity => activity.date === today)
      .sort(
        (a, b) =>
          new Date(b.timestamp) -
          new Date(a.timestamp)
      );


  if (!activities.length) {

    activityElement.innerHTML = `
      <div class="empty">
        No push-ups logged today.
      </div>
    `;

    return;

  }


  activityElement.innerHTML =
    activities
      .map(activity => {

        const type =
          capitalize(activity.type || "standard");


        return `
          <div class="activity-row">

            <div class="activity-info">

              <strong>
                +${Number(activity.amount).toLocaleString()}
              </strong>

              <span>
                ${type} push-ups
              </span>

            </div>

            <div class="activity-time">
              ${formatTime(activity.timestamp)}
            </div>

          </div>
        `;

      })
      .join("");

}


/* ============================================================
   STATISTICS
============================================================ */

function getAllTimeTotal() {

  return Object.values(data.history)
    .reduce(
      (sum, value) =>
        sum + Number(value || 0),
      0
    );

}


function getAverage() {

  const values =
    Object.values(data.history)
      .map(Number)
      .filter(value => value > 0);


  if (!values.length) {
    return 0;
  }


  return Math.round(
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  );

}


function getBestDay() {

  const values =
    Object.values(data.history)
      .map(Number);


  if (!values.length) {
    return 0;
  }


  return Math.max(...values);

}


function getStreak() {

  let streak = 0;

  const current = new Date();

  const today = todayKey();


  /*
    If today has no workout, allow the streak to
    begin yesterday.
  */

  if (!data.history[today]) {

    current.setDate(
      current.getDate() - 1
    );

  }


  while (true) {

    const key = dateKey(current);

    if (!data.history[key]) {
      break;
    }

    streak++;

    current.setDate(
      current.getDate() - 1
    );

  }


  return streak;

}


function renderStats() {

  const total =
    getAllTimeTotal();

  const average =
    getAverage();

  const best =
    getBestDay();

  const streak =
    getStreak();


  setText(
    "allTime",
    total.toLocaleString()
  );

  setText(
    "average",
    average.toLocaleString()
  );

  setText(
    "best",
    best.toLocaleString()
  );

  setText(
    "streak",
    `${streak} 🔥`
  );


  setText(
    "statsAllTime",
    total.toLocaleString()
  );

  setText(
    "statsAverage",
    average.toLocaleString()
  );

  setText(
    "statsBest",
    best.toLocaleString()
  );

  setText(
    "statsStreak",
    `${streak} 🔥`
  );


  renderWeeklyChart();

}


/* ============================================================
   WEEKLY CHART
============================================================ */

function renderWeeklyChart() {

  const chart =
    document.getElementById("weeklyChart");

  if (!chart) {
    return;
  }


  const days = [];


  for (let i = 6; i >= 0; i--) {

    const date = new Date();

    date.setHours(0, 0, 0, 0);

    date.setDate(
      date.getDate() - i
    );


    const key =
      dateKey(date);


    days.push({
      key,
      label:
        date.toLocaleDateString(
          undefined,
          { weekday: "short" }
        ),
      value:
        Number(data.history[key] || 0)
    });

  }


  const max =
    Math.max(
      ...days.map(day => day.value),
      1
    );


  chart.innerHTML =
    days
      .map(day => {

        const height =
          Math.max(
            4,
            (day.value / max) * 100
          );


        return `
          <div class="chart-column">

            <div class="chart-value">
              ${day.value || ""}
            </div>

            <div class="chart-bar-wrap">

              <div
                class="chart-bar"
                style="height:${height}%"
              ></div>

            </div>

            <span>
              ${day.label}
            </span>

          </div>
        `;

      })
      .join("");

}


/* ============================================================
   CALENDAR
============================================================ */

let calendarDate = new Date();


function renderCalendar() {

  const calendar =
    document.getElementById("calendar");

  const monthLabel =
    document.getElementById("calendarMonth");


  if (!calendar || !monthLabel) {
    return;
  }


  const year =
    calendarDate.getFullYear();

  const month =
    calendarDate.getMonth();


  monthLabel.textContent =
    calendarDate.toLocaleDateString(
      undefined,
      {
        month: "long",
        year: "numeric"
      }
    );


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


  let html = "";


  for (let i = 0; i < firstDay; i++) {

    html += `
      <div class="calendar-day blank"></div>
    `;

  }


  for (let day = 1; day <= daysInMonth; day++) {

    const key =
      dateKey(
        new Date(
          year,
          month,
          day
        )
      );


    const count =
      Number(data.history[key] || 0);


    const today =
      key === todayKey();


    html += `
      <button
        type="button"
        class="calendar-day
          ${count > 0 ? "has-workout" : ""}
          ${today ? "today" : ""}"
        data-date="${key}"
      >

        <span>
          ${day}
        </span>

        ${
          count > 0
            ? `<small>${count}</small>`
            : ""
        }

      </button>
    `;

  }


  calendar.innerHTML = html;


  calendar
    .querySelectorAll(
      ".calendar-day[data-date]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          selectedCalendarDate =
            button.dataset.date;

          renderCalendar();

          renderSelectedDay();

        }
      );

    });

}


/* ============================================================
   SELECTED CALENDAR DAY
============================================================ */

let selectedCalendarDate = todayKey();


function renderSelectedDay() {

  const title =
    document.getElementById("selectedDate");

  const total =
    document.getElementById("selectedDateTotal");

  const activity =
    document.getElementById("selectedDayActivity");


  if (!title || !total || !activity) {
    return;
  }


  const key =
    selectedCalendarDate;


  title.textContent =
    formatDate(key);


  const count =
    Number(data.history[key] || 0);


  total.textContent =
    `${count.toLocaleString()} PUSH-UPS`;


  const activities =
    data.activities
      .filter(item => item.date === key)
      .sort(
        (a, b) =>
          new Date(b.timestamp) -
          new Date(a.timestamp)
      );


  if (!activities.length) {

    activity.innerHTML = `
      <div class="empty">
        No activity logged on this day.
      </div>
    `;

    return;

  }


  activity.innerHTML =
    activities
      .map(item => {

        return `
          <div class="activity-row">

            <div class="activity-info">

              <strong>
                +${Number(item.amount).toLocaleString()}
              </strong>

              <span>
                ${capitalize(item.type || "standard")}
              </span>

            </div>

            <div class="activity-time">
              ${formatTime(item.timestamp)}
            </div>

          </div>
        `;

      })
      .join("");

}


/* ============================================================
   FULL HISTORY
============================================================ */

function renderFullHistory() {

  const element =
    document.getElementById("fullHistory");

  if (!element) {
    return;
  }


  const entries =
    Object.entries(data.history)
      .filter(([, value]) => Number(value) > 0)
      .sort(([a], [b]) => b.localeCompare(a));


  if (!entries.length) {

    element.innerHTML = `
      <div class="empty">
        No workout history yet.
      </div>
    `;

    return;

  }


  element.innerHTML =
    entries
      .map(([date, count]) => {

        const dayActivities =
          data.activities.filter(
            activity =>
              activity.date === date
          );


        return `
          <div class="full-history-day">

            <div class="history-row">

              <span class="history-date">
                ${formatDate(date)}
              </span>

              <strong>
                ${Number(count).toLocaleString()}
              </strong>

            </div>

            ${
              dayActivities.length
                ? `
                  <div class="history-activities">

                    ${dayActivities
                      .sort(
                        (a, b) =>
                          new Date(a.timestamp) -
                          new Date(b.timestamp)
                      )
                      .map(activity => `
                        <span>
                          +${Number(activity.amount)}
                          · ${formatTime(activity.timestamp)}
                        </span>
                      `)
                      .join("")}

                  </div>
                `
                : ""
            }

          </div>
        `;

      })
      .join("");

}


/* ============================================================
   SETTINGS
============================================================ */

function updateSettingsUI() {

  const defaultAmount =
    document.getElementById("defaultAmount");

  const dailyGoal =
    document.getElementById("dailyGoal");

  const restTimer =
    document.getElementById("restTimerSetting");


  if (defaultAmount) {

    defaultAmount.value =
      data.settings.defaultAmount;

  }


  if (dailyGoal) {

    dailyGoal.value =
      data.settings.dailyGoal;

  }


  if (restTimer) {

    restTimer.value =
      data.settings.restTimer;

  }


  document
    .querySelectorAll(".preset")
    .forEach(button => {

      button.classList.toggle(
        "selected",
        Number(button.dataset.preset) ===
        Number(data.settings.defaultAmount)
      );

    });


  document
    .querySelectorAll(
      "#pushupTypes button"
    )
    .forEach(button => {

      button.classList.toggle(
        "selected",
        button.dataset.type ===
        data.selectedType
      );

    });

}


/* ============================================================
   SETTINGS DIALOG
============================================================ */

function openSettings() {

  const dialog =
    document.getElementById(
      "settingsDialog"
    );


  if (!dialog) {
    return;
  }


  updateSettingsUI();

  dialog.showModal();

}


function closeSettings() {

  const dialog =
    document.getElementById(
      "settingsDialog"
    );


  if (!dialog) {
    return;
  }


  dialog.close();

}


/* ============================================================
   SAVE SETTINGS
============================================================ */

function saveSettings() {

  const defaultAmount =
    Number(
      document.getElementById(
        "defaultAmount"
      )?.value
    );


  const dailyGoal =
    Number(
      document.getElementById(
        "dailyGoal"
      )?.value
    );


  const restTimer =
    Number(
      document.getElementById(
        "restTimerSetting"
      )?.value
    );


  if (
    !Number.isFinite(defaultAmount) ||
    defaultAmount < 1
  ) {

    showToast(
      "Enter a valid default amount"
    );

    return;

  }


  if (
    !Number.isFinite(dailyGoal) ||
    dailyGoal < 1
  ) {

    showToast(
      "Enter a valid daily goal"
    );

    return;

  }


  if (
    !Number.isFinite(restTimer) ||
    restTimer < 5
  ) {

    showToast(
      "Rest timer must be at least 5 seconds"
    );

    return;

  }


  data.settings.defaultAmount =
    Math.floor(defaultAmount);

  data.settings.dailyGoal =
    Math.floor(dailyGoal);

  data.settings.restTimer =
    Math.floor(restTimer);


  saveData();

  render();

  closeSettings();

  showToast("Settings saved");

}


/* ============================================================
   PRESETS
============================================================ */

function selectPreset(amount) {

  amount = Number(amount);

  if (!Number.isFinite(amount) || amount < 1) {
    return;
  }


  data.settings.defaultAmount =
    Math.floor(amount);


  const input =
    document.getElementById(
      "defaultAmount"
    );


  if (input) {
    input.value =
      data.settings.defaultAmount;
  }


  updateSettingsUI();

}


/* ============================================================
   PUSH-UP TYPES
============================================================ */

function selectPushupType(type) {

  if (!type) {
    return;
  }


  data.selectedType = type;

  saveData();

  updateSettingsUI();

  showToast(
    `${capitalize(type)} push-ups selected`
  );

}


/* ============================================================
   REST TIMER
============================================================ */

let timerInterval = null;

let timerRemaining = 60;


function updateTimerDisplay() {

  const element =
    document.getElementById(
      "restTimer"
    );


  if (!element) {
    return;
  }


  const minutes =
    Math.floor(
      timerRemaining / 60
    );


  const seconds =
    timerRemaining % 60;


  element.textContent =
    `${pad(minutes)}:${pad(seconds)}`;

}


function startTimer() {

  if (timerInterval) {
    return;
  }


  if (
    timerRemaining <= 0
  ) {

    timerRemaining =
      Number(data.settings.restTimer) || 60;

  }


  timerInterval =
    setInterval(() => {

      timerRemaining--;

      updateTimerDisplay();


      if (timerRemaining <= 0) {

        stopTimer();

        showToast("Rest complete!");

        if (
          navigator.vibrate
        ) {

          navigator.vibrate(
            [200, 100, 200]
          );

        }

      }

    }, 1000);

}


function stopTimer() {

  if (timerInterval) {

    clearInterval(
      timerInterval
    );

    timerInterval = null;

  }

}


function resetTimer() {

  stopTimer();

  timerRemaining =
    Number(data.settings.restTimer) || 60;

  updateTimerDisplay();

}


/* ============================================================
   NAVIGATION
============================================================ */

function switchScreen(screenId) {

  const screens =
    document.querySelectorAll(
      ".app-screen"
    );


  const buttons =
    document.querySelectorAll(
      ".nav-button"
    );


  screens.forEach(screen => {

    screen.hidden =
      screen.id !== screenId;

  });


  buttons.forEach(button => {

    button.classList.toggle(
      "active",
      button.dataset.screen === screenId
    );

  });


  if (screenId === "calendarScreen") {

    renderCalendar();

    renderSelectedDay();

  }


  if (screenId === "statsScreen") {

    renderStats();

  }


  if (screenId === "historyScreen") {

    renderFullHistory();

  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* ============================================================
   CLEAR DATA
============================================================ */

function clearAllHistory() {

  const confirmed =
    confirm(
      "Are you sure you want to delete all push-up history? This cannot be undone."
    );


  if (!confirmed) {
    return;
  }


  data.history = [];

  /*
    Correct the history object after clearing.
  */

  data.history = {};

  data.activities = [];

  saveData();

  render();

  showToast("All history cleared");

}


function resetEverything() {

  const confirmed =
    confirm(
      "This will permanently delete ALL Push-Up Tracker data. Continue?"
    );


  if (!confirmed) {
    return;
  }


  data =
    structuredClone(
      DEFAULT_DATA
    );


  saveData();

  render();

  resetTimer();

  closeSettings();

  showToast("All data reset");

}


/* ============================================================
   EXPORT DATA
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
        type: "application/json"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");


  link.href = url;

  link.download =
    `pushup-tracker-backup-${todayKey()}.json`;


  document.body.appendChild(link);

  link.click();

  link.remove();


  URL.revokeObjectURL(url);

  showToast("Data exported");

}


/* ============================================================
   IMPORT DATA
============================================================ */

function importDataFromFile(file) {

  if (!file) {
    return;
  }


  const reader =
    new FileReader();


  reader.onload = event => {

    try {

      const imported =
        JSON.parse(
          event.target.result
        );


      if (
        !imported ||
        typeof imported !== "object"
      ) {

        throw new Error(
          "Invalid backup"
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
        },

        history:
          imported.history || {},

        activities:
          Array.isArray(
            imported.activities
          )
            ? imported.activities
            : []

      };


      saveData();

      render();

      showToast(
        "Data imported successfully"
      );


    } catch (error) {

      console.error(error);

      showToast(
        "Invalid backup file"
      );

    }

  };


  reader.readAsText(file);

}


/* ============================================================
   CLEAR CURRENT DAY
============================================================ */

function clearToday() {

  const key =
    todayKey();


  delete data.history[key];


  data.activities =
    data.activities.filter(
      activity =>
        activity.date !== key
    );


  saveData();

  render();

  showToast("Today's data cleared");

}


/* ============================================================
   TOAST
============================================================ */

let toastTimeout = null;


function showToast(message) {

  const toast =
    document.getElementById(
      "toast"
    );


  if (!toast) {
    return;
  }


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    toastTimeout
  );


  toastTimeout =
    setTimeout(() => {

      toast.classList.remove(
        "show"
      );

    }, 1800);

}


/* ============================================================
   UTILITY
============================================================ */

function setText(id, value) {

  const element =
    document.getElementById(id);


  if (element) {

    element.textContent =
      value;

  }

}


function capitalize(value) {

  if (!value) {
    return "";
  }


  return value.charAt(0).toUpperCase()
    + value.slice(1);

}


/* ============================================================
   EVENT LISTENERS
============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  () => {


    /* Main button */

    const addBtn =
      document.getElementById(
        "addBtn"
      );


    if (addBtn) {

      addBtn.addEventListener(
        "click",
        () => {

          addPushups(
            data.settings.defaultAmount
          );

        }
      );

    }


    /* Quick buttons */

    document
      .querySelectorAll(
        ".quick-btn"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            addPushups(
              Number(
                button.dataset.amount
              )
            );

          }
        );

      });


    /* Undo */

    const undoBtn =
      document.getElementById(
        "undoBtn"
      );


    if (undoBtn) {

      undoBtn.addEventListener(
        "click",
        undoLastAddition
      );

    }


    /* Navigation */

    document
      .querySelectorAll(
        ".nav-button"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            switchScreen(
              button.dataset.screen
            );

          }
        );

      });


    /* Settings */

    const settingsBtn =
      document.getElementById(
        "settingsBtn"
      );


    if (settingsBtn) {

      settingsBtn.addEventListener(
        "click",
        openSettings
      );

    }


    const closeSettingsBtn =
      document.getElementById(
        "closeSettings"
      );


    if (closeSettingsBtn) {

      closeSettingsBtn.addEventListener(
        "click",
        closeSettings
      );

    }


    const saveSettingsBtn =
      document.getElementById(
        "saveSettings"
      );


    if (saveSettingsBtn) {

      saveSettingsBtn.addEventListener(
        "click",
        saveSettings
      );

    }


    /* Presets */

    document
      .querySelectorAll(
        ".preset"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            selectPreset(
              button.dataset.preset
            );

          }
        );

      });


    /* Push-up types */

    document
      .querySelectorAll(
        "#pushupTypes button"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            selectPushupType(
              button.dataset.type
            );

          }
        );

      });


    /* Calendar navigation */

    const previousMonth =
      document.getElementById(
        "previousMonth"
      );


    if (previousMonth) {

      previousMonth.addEventListener(
        "click",
        () => {

          calendarDate =
            new Date(
              calendarDate.getFullYear(),
              calendarDate.getMonth() - 1,
              1
            );

          renderCalendar();

        }
      );

    }


    const nextMonth =
      document.getElementById(
        "nextMonth"
      );


    if (nextMonth) {

      nextMonth.addEventListener(
        "click",
        () => {

          calendarDate =
            new Date(
              calendarDate.getFullYear(),
              calendarDate.getMonth() + 1,
              1
            );

          renderCalendar();

        }
      );

    }


    /* Rest timer */

    const startTimerButton =
      document.getElementById(
        "startTimer"
      );


    if (startTimerButton) {

      startTimerButton.addEventListener(
        "click",
        startTimer
      );

    }


    const resetTimerButton =
      document.getElementById(
        "resetTimer"
      );


    if (resetTimerButton) {

      resetTimerButton.addEventListener(
        "click",
        resetTimer
      );

    }


    /* Clear history */

    const clearBtn =
      document.getElementById(
        "clearBtn"
      );


    if (clearBtn) {

      clearBtn.addEventListener(
        "click",
        clearAllHistory
      );

    }


    const clearHistoryBtn =
      document.getElementById(
        "clearHistoryBtn"
      );


    if (clearHistoryBtn) {

      clearHistoryBtn.addEventListener(
        "click",
        clearAllHistory
      );

    }


    /* Export */

    const exportButton =
      document.getElementById(
        "exportData"
      );


    if (exportButton) {

      exportButton.addEventListener(
        "click",
        exportData
      );

    }


    /* Import */

    const importButton =
      document.getElementById(
        "importData"
      );


    const importFile =
      document.getElementById(
        "importFile"
      );


    if (
      importButton &&
      importFile
    ) {

      importButton.addEventListener(
        "click",
        () => {

          importFile.click();

        }
      );


      importFile.addEventListener(
        "change",
        event => {

          importDataFromFile(
            event.target.files[0]
          );

          event.target.value = "";

        }
      );

    }


    /* Reset */

    const resetButton =
      document.getElementById(
        "resetData"
      );


    if (resetButton) {

      resetButton.addEventListener(
        "click",
        resetEverything
      );

    }


    /* Initial timer */

    resetTimer();


    /* Initial render */

    render();


    /* Start on Home */

    switchScreen(
      "homeScreen"
    );

  }
);
