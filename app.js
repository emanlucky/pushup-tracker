/* =====================================================
   PUSH-UP TRACKER
   Complete application
===================================================== */

"use strict";


/* =====================================================
   STORAGE
===================================================== */

const USERS_KEY = "pushupTrackerUsersV1";
const SESSION_KEY = "pushupTrackerSessionV1";

let currentUser = null;
let data = null;


/* =====================================================
   DEFAULT DATA
===================================================== */

function createDefaultData() {

  return {

    defaultAmount: 10,

    dailyGoal: 100,

    dayStart: "00:00",

    theme: "dark",

    restDays: {},

    history: {},

    activity: [],

    achievements: {}

  };

}


/* =====================================================
   ELEMENT HELPER
===================================================== */

const $ = id =>
  document.getElementById(id);


/* =====================================================
   USER SYSTEM
===================================================== */

function getUsers() {

  try {

    return JSON.parse(
      localStorage.getItem(USERS_KEY)
    ) || {};

  } catch {

    return {};

  }

}


function saveUsers(users) {

  localStorage.setItem(
    USERS_KEY,
    JSON.stringify(users)
  );

}


function hashPassword(password) {

  /*
    This is NOT cryptographically secure.
    It is only used to avoid storing the plain
    password directly.

    For a real online login system, use Firebase
    or Supabase authentication.
  */

  let hash = 0;

  for (let i = 0; i < password.length; i++) {

    hash =
      ((hash << 5) - hash)
      + password.charCodeAt(i);

    hash |= 0;

  }

  return String(hash);

}


function createAccount() {

  const username =
    $("loginUsername").value.trim();

  const password =
    $("loginPassword").value;

  if (username.length < 3) {

    showLoginMessage(
      "Username must be at least 3 characters."
    );

    return;

  }

  if (password.length < 4) {

    showLoginMessage(
      "Password must be at least 4 characters."
    );

    return;

  }

  const users = getUsers();

  const key =
    username.toLowerCase();

  if (users[key]) {

    showLoginMessage(
      "That username already exists."
    );

    return;

  }

  users[key] = {

    username,

    password:
      hashPassword(password),

    data:
      createDefaultData()

  };

  saveUsers(users);

  currentUser = key;

  localStorage.setItem(
    SESSION_KEY,
    key
  );

  data =
    users[key].data;

  showApp();

}


function login() {

  const username =
    $("loginUsername").value.trim();

  const password =
    $("loginPassword").value;

  const users =
    getUsers();

  const key =
    username.toLowerCase();

  if (
    !users[key] ||
    users[key].password !== hashPassword(password)
  ) {

    showLoginMessage(
      "Incorrect username or password."
    );

    return;

  }

  currentUser = key;

  data =
    users[key].data;

  localStorage.setItem(
    SESSION_KEY,
    key
  );

  showApp();

}


function logout() {

  saveCurrentUser();

  currentUser = null;

  data = null;

  localStorage.removeItem(
    SESSION_KEY
  );

  $("appScreen").classList.add("hidden");

  $("loginScreen").classList.remove("hidden");

  $("loginPassword").value = "";

}


function saveCurrentUser() {

  if (!currentUser || !data) {
    return;
  }

  const users =
    getUsers();

  if (!users[currentUser]) {
    return;
  }

  users[currentUser].data =
    data;

  saveUsers(users);

}


function showLoginMessage(message) {

  $("loginMessage").textContent =
    message;

}


function showApp() {

  $("loginScreen").classList.add("hidden");

  $("appScreen").classList.remove("hidden");

  $("welcomeText").textContent =
    `Welcome back, ${dataUsername()}`;

  $("accountUsername").textContent =
    dataUsername();

  applyTheme();

  render();

}


function dataUsername() {

  const users =
    getUsers();

  return users[currentUser]?.username ||
    currentUser ||
    "User";

}


/* =====================================================
   DATE FUNCTIONS
===================================================== */

function pad(num) {

  return String(num).padStart(2, "0");

}


function getDayStartMinutes() {

  const parts =
    (data.dayStart || "00:00")
      .split(":")
      .map(Number);

  return (
    (parts[0] || 0) * 60 +
    (parts[1] || 0)
  );

}


function getEffectiveDate(date = new Date()) {

  const result =
    new Date(date);

  const minutes =
    result.getHours() * 60 +
    result.getMinutes();

  if (
    minutes <
    getDayStartMinutes()
  ) {

    result.setDate(
      result.getDate() - 1
    );

  }

  return result;

}


function dateKey(date = new Date()) {

  const d =
    getEffectiveDate(date);

  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate())
  );

}


function normalDateKey(date = new Date()) {

  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate())
  );

}


function parseKey(key) {

  const [year, month, day] =
    key.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day
  );

}


function formatDate(key) {

  return parseKey(key).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );

}


function formatTime(timestamp) {

  return new Date(timestamp)
    .toLocaleTimeString(
      undefined,
      {
        hour: "numeric",
        minute: "2-digit"
      }
    );

}


/* =====================================================
   PUSH-UP ADDING
===================================================== */

function addPushups(amount) {

  amount =
    Number(amount);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return;
  }

  amount =
    Math.round(amount);

  const key =
    dateKey();

  if (!data.history[key]) {

    data.history[key] = 0;

  }

  data.history[key] += amount;

  const entry = {

    id:
      crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now() + "-" + Math.random(),

    timestamp:
      new Date().toISOString(),

    amount,

    date:
      key,

    totalAfter:
      data.history[key]

  };

  data.activity.unshift(entry);

  saveCurrentUser();

  vibrate();

  animateCounter();

  render();

  checkGoalCelebration(key);

  showToast(
    `+${amount} push-ups`
  );

}


function undoLast() {

  if (!data.activity.length) {

    showToast(
      "Nothing to undo."
    );

    return;

  }

  const entry =
    data.activity[0];

  const key =
    entry.date;

  if (data.history[key]) {

    data.history[key] -=
      entry.amount;

    if (
      data.history[key] <= 0
    ) {

      delete data.history[key];

    }

  }

  data.activity.shift();

  saveCurrentUser();

  render();

  showToast(
    `Removed ${entry.amount} push-ups`
  );

}


/* =====================================================
   DELETE ACTIVITY
===================================================== */

function deleteActivity(id) {

  const index =
    data.activity.findIndex(
      item => item.id === id
    );

  if (index === -1) {
    return;
  }

  const entry =
    data.activity[index];

  if (
    !confirm(
      `Delete +${entry.amount} push-ups from ${formatTime(entry.timestamp)}?`
    )
  ) {
    return;
  }

  if (data.history[entry.date]) {

    data.history[entry.date] -=
      entry.amount;

    if (
      data.history[entry.date] <= 0
    ) {

      delete data.history[entry.date];

    }

  }

  data.activity.splice(
    index,
    1
  );

  saveCurrentUser();

  render();

  showToast(
    "Activity deleted."
  );

}


/* =====================================================
   RENDER
===================================================== */

function render() {

  if (!data) {
    return;
  }

  renderHome();

  renderHistory();

  renderActivity();

  renderStats();

  renderCalendar();

  renderAchievements();

  updateSettingsUI();

}


/* =====================================================
   HOME
===================================================== */

function renderHome() {

  const today =
    data.history[dateKey()] || 0;

  $("todayTotal").textContent =
    today.toLocaleString();

  $("addAmount").textContent =
    data.defaultAmount;

  const goal =
    Math.max(
      1,
      Number(data.dailyGoal) || 100
    );

  $("goalText").textContent =
    `${today.toLocaleString()} / ${goal.toLocaleString()}`;

  const percent =
    Math.min(
      100,
      (today / goal) * 100
    );

  $("progressBar").style.width =
    `${percent}%`;

  $("restDay").checked =
    !!data.restDays[dateKey()];

}


/* =====================================================
   ACTIVITY RENDER
===================================================== */

function renderActivity(
  targetId = "activityLog",
  filterDate = null
) {

  const container =
    $(targetId);

  if (!container) {
    return;
  }

  let entries =
    [...data.activity];

  if (filterDate) {

    entries =
      entries.filter(
        entry =>
          entry.date === filterDate
      );

  }

  if (!entries.length) {

    container.innerHTML =
      `<div class="empty">
        No push-ups logged.
      </div>`;

    return;

  }

  container.innerHTML =
    entries.map(
      entry => {

        const running =
          entry.totalAfter;

        return `
          <div class="activity-row">

            <div class="activity-left">

              <div class="activity-amount">
                +${Number(entry.amount).toLocaleString()} push-ups
              </div>

              <div class="activity-time">
                ${formatDate(entry.date)}
                •
                ${formatTime(entry.timestamp)}
              </div>

              <div class="activity-running">
                Running total: ${Number(running).toLocaleString()}
              </div>

            </div>

            <button
              class="delete-activity"
              data-delete-id="${entry.id}"
              aria-label="Delete activity"
            >
              🗑️
            </button>

          </div>
        `;

      }
    ).join("");

}


function renderTodayActivity() {

  renderActivity(
    "todayActivityLog",
    dateKey()
  );

}


/* =====================================================
   HISTORY
===================================================== */

function renderHistory() {

  const entries =
    Object.entries(
      data.history
    )
      .sort(
        ([a], [b]) =>
          b.localeCompare(a)
      );

  const container =
    $("history");

  if (!entries.length) {

    container.innerHTML =
      `<div class="empty">
        No push-ups logged yet.
      </div>`;

    return;

  }

  container.innerHTML =
    entries
      .slice(0, 100)
      .map(
        ([date, count]) => {

          const goal =
            Number(data.dailyGoal) || 100;

          const percent =
            Math.min(
              100,
              (Number(count) / goal) * 100
            );

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

        }
      )
      .join("");

}


/* =====================================================
   STATS
===================================================== */

function getAllTimeTotal() {

  return Object.values(
    data.history
  ).reduce(
    (sum, value) =>
      sum + Number(value),
    0
  );

}


function getDateDifference(a, b) {

  const one =
    parseKey(a);

  const two =
    parseKey(b);

  return Math.round(
    (
      two - one
    ) /
    86400000
  );

}


function calculateCurrentStreak() {

  const keys =
    Object.keys(data.history)
      .filter(
        key =>
          Number(data.history[key]) > 0
      )
      .sort();

  if (!keys.length) {
    return 0;
  }

  let streak = 0;

  let current =
    getEffectiveDate();

  while (true) {

    const key =
      normalDateKey(current);

    if (
      data.history[key] > 0 ||
      data.restDays[key]
    ) {

      streak++;

      current.setDate(
        current.getDate() - 1
      );

    } else {

      break;

    }

  }

  return streak;

}


function calculateLongestStreak() {

  const keys =
    Object.keys(data.history)
      .filter(
        key =>
          Number(data.history[key]) > 0 ||
          data.restDays[key]
      )
      .sort();

  if (!keys.length) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (
    let i = 1;
    i < keys.length;
    i++
  ) {

    if (
      getDateDifference(
        keys[i - 1],
        keys[i]
      ) === 1
    ) {

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


function getWeekDates() {

  const today =
    getEffectiveDate();

  const day =
    today.getDay();

  const sunday =
    new Date(today);

  sunday.setDate(
    today.getDate() - day
  );

  const dates = [];

  for (
    let i = 0;
    i < 7;
    i++
  ) {

    const date =
      new Date(sunday);

    date.setDate(
      sunday.getDate() + i
    );

    dates.push(date);

  }

  return dates;

}


function getMonthTotal() {

  const today =
    getEffectiveDate();

  const year =
    today.getFullYear();

  const month =
    today.getMonth();

  return Object.entries(
    data.history
  )
    .filter(
      ([key]) => {

        const d =
          parseKey(key);

        return (
          d.getFullYear() === year &&
          d.getMonth() === month
        );

      }
    )
    .reduce(
      (sum, [, value]) =>
        sum + Number(value),
      0
    );

}


function renderStats() {

  const allTime =
    getAllTimeTotal();

  const days =
    Object.values(
      data.history
    ).filter(
      value =>
        Number(value) > 0
    );

  const average =
    days.length
      ? Math.round(
          allTime / days.length
        )
      : 0;

  const best =
    days.length
      ? Math.max(
          ...days.map(Number)
        )
      : 0;

  const weekTotal =
    getWeekDates()
      .reduce(
        (sum, date) =>
          sum +
          Number(
            data.history[
              normalDateKey(date)
            ] || 0
          ),
        0
      );

  $("allTime").textContent =
    allTime.toLocaleString();

  $("average").textContent =
    average.toLocaleString();

  $("best").textContent =
    best.toLocaleString();

  $("weekTotal").textContent =
    weekTotal.toLocaleString();

  $("monthTotal").textContent =
    getMonthTotal().toLocaleString();

  $("streak").textContent =
    `${calculateCurrentStreak()} 🔥`;

  $("longestStreak").textContent =
    `${calculateLongestStreak()} 🔥`;

  renderWeeklyChart();

}


/* =====================================================
   WEEKLY CHART
===================================================== */

function renderWeeklyChart() {

  const dates =
    getWeekDates();

  const values =
    dates.map(
      date =>
        Number(
          data.history[
            normalDateKey(date)
          ] || 0
        )
    );

  const max =
    Math.max(
      1,
      ...values
    );

  $("weeklyChart").innerHTML =
    dates.map(
      (date, index) => {

        const value =
          values[index];

        const height =
          value
            ? Math.max(
                3,
                (value / max) * 100
              )
            : 2;

        return `
          <div class="chart-column">

            <span class="chart-value">
              ${value ? value.toLocaleString() : ""}
            </span>

            <div class="chart-bar-container">

              <div
                class="chart-bar"
                style="height:${height}%"
              ></div>

            </div>

            <span class="chart-day">
              ${date.toLocaleDateString(
                undefined,
                { weekday: "short" }
              ).slice(0, 1)}
            </span>

          </div>
        `;

      }
    ).join("");

}


/* =====================================================
   CALENDAR
===================================================== */

let calendarDate =
  new Date();


function renderCalendar() {

  const year =
    calendarDate.getFullYear();

  const month =
    calendarDate.getMonth();

  $("calendarTitle").textContent =
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

  const container =
    $("calendar");

  let html = "";

  for (
    let i = 0;
    i < firstDay;
    i++
  ) {

    html +=
      `<div class="calendar-day empty-day"></div>`;

  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {

    const key =
      `${year}-${pad(month + 1)}-${pad(day)}`;

    const count =
      Number(
        data.history[key] || 0
      );

    const today =
      key === dateKey();

    let status = "";

    if (
      count >=
      Number(data.dailyGoal)
    ) {

      status = "completed";

    } else if (count > 0) {

      status = "partial";

    }

    html += `
      <button
        class="calendar-day ${status} ${today ? "today" : ""}"
        data-calendar-date="${key}"
      >

        <span>
          ${day}
        </span>

        ${
          count
            ? `<span class="calendar-count">${count}</span>`
            : ""
        }

      </button>
    `;

  }

  container.innerHTML =
    html;

}


function showCalendarDay(key) {

  const count =
    Number(
      data.history[key] || 0
    );

  $("selectedDayCard")
    .classList.remove("hidden");

  $("selectedDayTitle").textContent =
    formatDate(key);

  $("selectedDayTotal").textContent =
    `${count.toLocaleString()} push-ups`;

  renderActivity(
    "selectedDayActivity",
    key
  );

}


/* =====================================================
   ACHIEVEMENTS
===================================================== */

const ACHIEVEMENT_LIST = [

  {
    id: "first100",
    icon: "🟢",
    name: "First 100",
    description: "Complete 100 total push-ups.",
    check: total => total >= 100
  },

  {
    id: "fiveHundred",
    icon: "🔵",
    name: "500 Club",
    description: "Reach 500 total push-ups.",
    check: total => total >= 500
  },

  {
    id: "oneThousand",
    icon: "🟣",
    name: "1,000 Club",
    description: "Reach 1,000 total push-ups.",
    check: total => total >= 1000
  },

  {
    id: "sevenDay",
    icon: "🔥",
    name: "7 Day Warrior",
    description: "Reach a 7-day streak.",
    check: (total, streak) => streak >= 7
  },

  {
    id: "tenThousand",
    icon: "💪",
    name: "10K Push-Ups",
    description: "Reach 10,000 total push-ups.",
    check: total => total >= 10000
  },

  {
    id: "hundredThousand",
    icon: "👑",
    name: "100K Push-Ups",
    description: "Reach 100,000 total push-ups.",
    check: total => total >= 100000
  },

  {
    id: "best500",
    icon: "🏆",
    name: "500 Day",
    description: "Complete 500 push-ups in one day.",
    check: (total, streak, best) => best >= 500
  },

  {
    id: "thirtyDay",
    icon: "⚡",
    name: "30 Day Warrior",
    description: "Reach a 30-day streak.",
    check: (total, streak, best, longest) =>
      longest >= 30
  }

];


function getUnlockedAchievements() {

  const total =
    getAllTimeTotal();

  const current =
    calculateCurrentStreak();

  const longest =
    calculateLongestStreak();

  const best =
    Object.values(
      data.history
    ).reduce(
      (max, value) =>
        Math.max(
          max,
          Number(value)
        ),
      0
    );

  const unlocked = {};

  ACHIEVEMENT_LIST.forEach(
    achievement => {

      unlocked[achievement.id] =
        achievement.check(
          total,
          current,
          best,
          longest
        );

    }
  );

  return unlocked;

}


function renderAchievements() {

  const unlocked =
    getUnlockedAchievements();

  const count =
    Object.values(unlocked)
      .filter(Boolean)
      .length;

  $("achievementCount").textContent =
    `${count}/${ACHIEVEMENT_LIST.length}`;

  $("achievements").innerHTML =
    ACHIEVEMENT_LIST.map(
      achievement => {

        const isUnlocked =
          unlocked[achievement.id];

        return `
          <div
            class="achievement ${isUnlocked ? "unlocked" : ""}"
          >

            <div class="achievement-icon">
              ${achievement.icon}
            </div>

            <div class="achievement-name">
              ${achievement.name}
            </div>

            <div class="achievement-description">
              ${achievement.description}
            </div>

          </div>
        `;

      }
    ).join("");

}


/* =====================================================
   GOAL CELEBRATION
===================================================== */

function checkGoalCelebration(key) {

  const goal =
    Number(data.dailyGoal) || 100;

  const total =
    Number(data.history[key] || 0);

  if (
    total >= goal &&
    !data.achievements[
      `goal-${key}`
    ]
  ) {

    data.achievements[
      `goal-${key}`
    ] = true;

    saveCurrentUser();

    $("celebration")
      .classList.remove("hidden");

  }

}


/* =====================================================
   SETTINGS
===================================================== */

function updateSettingsUI() {

  $("defaultAmount").value =
    data.defaultAmount;

  $("dailyGoal").value =
    data.dailyGoal;

  $("dayStart").value =
    data.dayStart || "00:00";

  $("themeSelect").value =
    data.theme || "dark";

  $("restDay").checked =
    !!data.restDays[dateKey()];

  document
    .querySelectorAll(".preset")
    .forEach(
      button => {

        button.classList.toggle(
          "selected",
          Number(
            button.dataset.preset
          ) ===
          Number(
            data.defaultAmount
          )
        );

      }
    );

}


function saveSettings() {

  const amount =
    Math.max(
      1,
      Math.round(
        Number(
          $("defaultAmount").value
        ) || 10
      )
    );

  const goal =
    Math.max(
      1,
      Math.round(
        Number(
          $("dailyGoal").value
        ) || 100
      )
    );

  data.defaultAmount =
    amount;

  data.dailyGoal =
    goal;

  data.dayStart =
    $("dayStart").value ||
    "00:00";

  data.theme =
    $("themeSelect").value;

  const key =
    dateKey();

  if (
    $("restDay").checked
  ) {

    data.restDays[key] =
      true;

  } else {

    delete data.restDays[key];

  }

  saveCurrentUser();

  applyTheme();

  render();

  $("settingsDialog").close();

  showToast(
    "Settings saved."
  );

}


function applyTheme() {

  let theme =
    data?.theme || "dark";

  if (theme === "system") {

    theme =
      window.matchMedia(
        "(prefers-color-scheme: light)"
      ).matches
        ? "light"
        : "dark";

  }

  document.body.classList.toggle(
    "light",
    theme === "light"
  );

}


/* =====================================================
   EXPORT / IMPORT
===================================================== */

function exportData() {

  const payload = {

    app:
      "Push-Up Tracker",

    version:
      1,

    username:
      dataUsername(),

    exportedAt:
      new Date().toISOString(),

    data

  };

  const blob =
    new Blob(
      [
        JSON.stringify(
          payload,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    `pushup-backup-${dateKey()}.json`;

  a.click();

  URL.revokeObjectURL(url);

  showToast(
    "Backup exported."
  );

}


function importData(file) {

  const reader =
    new FileReader();

  reader.onload =
    event => {

      try {

        const payload =
          JSON.parse(
            event.target.result
          );

        if (
          !payload.data ||
          typeof payload.data !== "object"
        ) {

          throw new Error(
            "Invalid backup."
          );

        }

        data =
          Object.assign(
            createDefaultData(),
            payload.data
          );

        saveCurrentUser();

        render();

        showToast(
          "Backup imported."
        );

      } catch {

        showToast(
          "Invalid backup file."
        );

      }

    };

  reader.readAsText(file);

}


/* =====================================================
   NAVIGATION
===================================================== */

function switchTab(tab) {

  document
    .querySelectorAll(".tab-content")
    .forEach(
      section => {

        section.classList.remove(
          "active"
        );

      }
    );

  document
    .querySelectorAll(".nav-btn")
    .forEach(
      button => {

        button.classList.toggle(
          "active",
          button.dataset.tab === tab
        );

      }
    );

  const target =
    $(`${tab}Tab`);

  if (target) {

    target.classList.add(
      "active"
    );

  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =====================================================
   VISIBILITY CSS
===================================================== */

const style =
  document.createElement("style");

style.textContent = `
  .tab-content {
    display: none;
  }

  .tab-content.active {
    display: block;
  }
`;

document.head.appendChild(style);


/* =====================================================
   UI HELPERS
===================================================== */

let toastTimer;

function showToast(message) {

  const toast =
    $("toast");

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );

  clearTimeout(
    toastTimer
  );

  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      1800
    );

}


function vibrate() {

  if (
    navigator.vibrate
  ) {

    navigator.vibrate(
      12
    );

  }

}


function animateCounter() {

  const total =
    $("todayTotal");

  total.classList.remove(
    "pop"
  );

  void total.offsetWidth;

  total.classList.add(
    "pop"
  );

}


/* =====================================================
   EVENT LISTENERS
===================================================== */

$("loginBtn")
  .addEventListener(
    "click",
    login
  );


$("createAccountBtn")
  .addEventListener(
    "click",
    createAccount
  );


$("loginPassword")
  .addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        login();

      }

    }
  );


$("addBtn")
  .addEventListener(
    "click",
    () => {

      addPushups(
        data.defaultAmount
      );

    }
  );


document.addEventListener(
  "click",
  event => {

    const quick =
      event.target.closest(
        ".quick-btn"
      );

    if (quick) {

      addPushups(
        Number(
          quick.dataset.amount
        )
      );

      return;

    }

    const deleteButton =
      event.target.closest(
        "[data-delete-id]"
      );

    if (deleteButton) {

      deleteActivity(
        deleteButton.dataset.deleteId
      );

      return;

    }

    const calendarButton =
      event.target.closest(
        "[data-calendar-date]"
      );

    if (calendarButton) {

      showCalendarDay(
        calendarButton.dataset.calendarDate
      );

    }

  }
);


$("undoBtn")
  .addEventListener(
    "click",
    undoLast
  );


$("settingsBtn")
  .addEventListener(
    "click",
    () => {

      $("settingsDialog").showModal();

    }
  );


$("closeSettings")
  .addEventListener(
    "click",
    () => {

      $("settingsDialog").close();

    }
  );


$("saveSettings")
  .addEventListener(
    "click",
    saveSettings
  );


document
  .querySelectorAll(".preset")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          $("defaultAmount").value =
            button.dataset.preset;

        }
      );

    }
  );


document
  .querySelectorAll(".nav-btn")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          switchTab(
            button.dataset.tab
          );

        }
      );

    }
  );


$("prevMonth")
  .addEventListener(
    "click",
    () => {

      calendarDate.setMonth(
        calendarDate.getMonth() - 1
      );

      renderCalendar();

      $("selectedDayCard")
        .classList.add(
          "hidden"
        );

    }
  );


$("nextMonth")
  .addEventListener(
    "click",
    () => {

      calendarDate.setMonth(
        calendarDate.getMonth() + 1
      );

      renderCalendar();

      $("selectedDayCard")
        .classList.add(
          "hidden"
        );

    }
  );


$("clearBtn")
  .addEventListener(
    "click",
    () => {

      if (
        !confirm(
          "Are you sure you want to delete ALL push-up history?"
        )
      ) {

        return;

      }

      data.history = [];

      data.history = {};

      data.activity = [];

      data.achievements = {};

      saveCurrentUser();

      render();

      showToast(
        "All history cleared."
      );

    }
  );


$("exportBtn")
  .addEventListener(
    "click",
    exportData
  );


$("importBtn")
  .addEventListener(
    "click",
    () => {

      $("importFile").click();

    }
  );


$("importFile")
  .addEventListener(
    "change",
    event => {

      const file =
        event.target.files[0];

      if (file) {

        importData(file);

      }

      event.target.value = "";

    }
  );


$("logoutBtn")
  .addEventListener(
    "click",
    () => {

      if (
        confirm(
          "Log out of Push-Up Tracker?"
        )
      ) {

        logout();

      }

    }
  );


$("closeCelebration")
  .addEventListener(
    "click",
    () => {

      $("celebration")
        .classList.add(
          "hidden"
        );

    }
  );


$("restDay")
  .addEventListener(
    "change",
    () => {

      const key =
        dateKey();

      if (
        $("restDay").checked
      ) {

        data.restDays[key] =
          true;

      } else {

        delete data.restDays[key];

      }

      saveCurrentUser();

      render();

    }
  );


/* =====================================================
   INITIALIZATION
===================================================== */

function initialize() {

  const session =
    localStorage.getItem(
      SESSION_KEY
    );

  const users =
    getUsers();

  if (
    session &&
    users[session]
  ) {

    currentUser =
      session;

    data =
      Object.assign(
        createDefaultData(),
        users[session].data
      );

    users[session].data =
      data;

    saveUsers(users);

    showApp();

  } else {

    $("loginScreen")
      .classList.remove(
        "hidden"
      );

    $("appScreen")
      .classList.add(
        "hidden"
      );

  }

}


initialize();


/* =====================================================
   AUTO SAVE WHEN LEAVING
===================================================== */

window.addEventListener(
  "beforeunload",
  saveCurrentUser
);


document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState ===
      "hidden"
    ) {

      saveCurrentUser();

    }

  }
);
