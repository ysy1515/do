const loginView = document.querySelector("#login-view");
const appView = document.querySelector("#app-view");
const loginFormSlot = document.querySelector("#login-form-slot");
const pinLoginForm = document.querySelector("#pin-login-form");
const otpLoginForm = document.querySelector("#otp-login-form");
const pinLoginMessage = document.querySelector("#pin-login-message");
const otpLoginMessage = document.querySelector("#otp-login-message");
const pinTab = document.querySelector("#pin-tab");
const otpTab = document.querySelector("#otp-tab");
const sendOtpButton = document.querySelector("#send-otp-button");
const verifyOtpButton = document.querySelector("#verify-otp-button");
const otpCodeGroup = document.querySelector("#otp-code-group");
const otpEmail = document.querySelector("#otp-email");
const otpCode = document.querySelector("#otp-code");
const taskForm = document.querySelector("#task-form");
const taskMessage = document.querySelector("#task-message");
const activeTasksEl = document.querySelector("#active-tasks");
const completedTasksEl = document.querySelector("#completed-tasks");
const activeEmpty = document.querySelector("#active-empty");
const completedEmpty = document.querySelector("#completed-empty");
const toggleCompleted = document.querySelector("#toggle-completed");
const logoutButton = document.querySelector("#logout-button");
const languageToggle = document.querySelector("#language-toggle");
const languageToggleText = document.querySelector("#language-toggle-text");
const reportLink = document.querySelector("#report-link");
const footerCopy = document.querySelector("#footer-copy");
const cancelEditButton = document.querySelector("#cancel-edit-button");
const saveTaskButton = document.querySelector("#save-task-button");
const openTaskModalButton = document.querySelector("#open-task-modal-button");
const openTaskModalText = document.querySelector("#open-task-modal-text");
const taskModal = document.querySelector("#task-modal");
const taskModalOverlay = document.querySelector("#task-modal-overlay");
const closeTaskModalButton = document.querySelector("#close-task-modal-button");
const taskModalTitle = document.querySelector("#task-modal-title");
const settingsButton = document.querySelector("#settings-button");
const settingsPanel = document.querySelector("#settings-panel");
const settingsOverlay = document.querySelector("#settings-overlay");
const closeSettingsButton = document.querySelector("#close-settings-button");
const settingsForm = document.querySelector("#settings-form");
const settingsMessage = document.querySelector("#settings-message");
const pushMessage = document.querySelector("#push-message");
const enablePushButton = document.querySelector("#enable-push-button");
const screenAnchor = document.createComment("active-screen");
document.body.insertBefore(screenAnchor, document.querySelector("script"));

const BASE_PATH = window.location.pathname.startsWith("/do") ? "/do" : "";
const apiPath = (path) => `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;

const fields = {
  id: document.querySelector("#task-id"),
  title: document.querySelector("#task-title"),
  description: document.querySelector("#task-description"),
  priority: document.querySelector("#task-priority"),
  dueDate: document.querySelector("#task-due-date")
};

const PIN_LENGTH = 6;

let tasks = [];
let showAllCompleted = false;
let isAuthenticated = false;
let authMode = "pin";
let otpSent = false;
let language = localStorage.getItem("todo_language") || "ar";
let settings = null;

const settingsFields = {
  dailyActiveTasksEnabled: document.querySelector("#daily-report-enabled"),
  dailyActiveTasksTime: document.querySelector("#daily-report-time"),
  taskCompletedEmailEnabled: document.querySelector("#task-completed-email-enabled"),
  overdueEnabled: document.querySelector("#overdue-enabled"),
  overdueFrequency: document.querySelector("#overdue-frequency"),
  deadlineRemindersEnabled: document.querySelector("#deadline-reminders-enabled"),
  priority: {
    high: {
      enabled: document.querySelector("#priority-high-enabled"),
      count: document.querySelector("#priority-high-count")
    },
    medium: {
      enabled: document.querySelector("#priority-medium-enabled"),
      count: document.querySelector("#priority-medium-count")
    },
    low: {
      enabled: document.querySelector("#priority-low-enabled"),
      count: document.querySelector("#priority-low-count")
    }
  }
};

const translations = {
  ar: {
    dashboardTitle: "لوحة المهام",
    report: "تحميل التقرير",
    logout: "تسجيل خروج",
    totalTasks: "إجمالي المهام",
    activeTasks: "المهام النشطة",
    completedTasks: "المهام المكتملة",
    highPriorityTasks: "عالية الأولوية",
    overdueTasks: "المهام المتأخرة",
    addNewTask: "إضافة مهمة جديدة",
    addTaskCta: "إضافة مهمة",
    composerSubtitle: "أنشئ مهمة جديدة عند الحاجة بدون ازدحام الصفحة.",
    editTask: "تعديل المهمة",
    cancel: "إلغاء",
    otpEmailLabel: "البريد الإلكتروني",
    otpEmailPlaceholder: "أدخل البريد الإلكتروني المصرح",
    otpHelper: "أدخل البريد الإلكتروني المصرح لاستلام رمز التحقق",
    sendOtp: "إرسال رمز التحقق",
    sendingOtp: "جارٍ الإرسال...",
    otpSent: "تم إرسال رمز التحقق. تحقق من بريدك الإلكتروني.",
    invalidAuthorizedEmail: "البريد الإلكتروني غير مصرح",
    taskTitle: "عنوان المهمة",
    description: "وصف اختياري",
    priority: "الأولوية",
    dueDate: "تاريخ التسليم",
    addTask: "إضافة المهمة",
    saveEdit: "حفظ التعديل",
    cancelEdit: "إلغاء التعديل",
    currentTasks: "المهام الحالية",
    completedSection: "المهام المكتملة",
    noActive: "لا توجد مهام حالية",
    noCompleted: "لا توجد مهام مكتملة",
    high: "عالية",
    medium: "متوسطة",
    low: "منخفضة",
    active: "نشطة",
    completed: "مكتملة",
    overdue: "متأخرة",
    priorityPrefix: "الأولوية",
    duePrefix: "التسليم",
    completedPrefix: "الإكمال",
    markCompleted: "تحديد كمكتملة",
    edit: "تعديل",
    delete: "حذف",
    showMore: "عرض المزيد",
    showLess: "عرض أقل",
    footer: "© 2026 جميع الحقوق محفوظة ليحيى الشهراني",
    langToggle: "EN",
    reportFile: "تقرير-المهام.csv",
    settings: "الإعدادات",
    account: "الحساب",
    name: "الاسم",
    email: "البريد الإلكتروني",
    timezone: "المنطقة الزمنية",
    riyadhTimezone: "توقيت الرياض",
    notificationSettings: "إعدادات الإشعارات",
    dailyReport: "تقرير يومي للمهام الحالية",
    sendTime: "وقت الإرسال",
    taskCompletedEmail: "إرسال بريد عند اكتمال المهمة",
    taskCompletedEmailHelp: "يرسل بريدًا عند تحويل أي مهمة إلى مكتملة",
    overdueAlerts: "إشعارات المهام المتأخرة",
    overdueAlertsHelp: "لا ترسل إذا لا توجد مهام متأخرة",
    frequency: "التكرار",
    hourly: "كل ساعة",
    every2hours: "كل ساعتين",
    daily: "مرة يوميًا",
    deadlineReminders: "تذكير قبل تاريخ التسليم",
    deadlineRemindersHelp: "قبل 3 أيام، قبل يومين، وقبل يوم",
    priorityReminders: "إشعارات حسب الأولوية",
    dailyReminders: "عدد الإشعارات اليومية",
    pushNotifications: "إشعارات الجوال",
    pushDescription: "تفعيل إشعارات المتصفح حيثما كانت مدعومة.",
    enablePush: "تفعيل إشعارات الجوال",
    pushEnabled: "تم تفعيل إشعارات الجوال",
    pushDenied: "تم رفض صلاحية الإشعارات من المتصفح.",
    pushUnsupported: "المتصفح لا يدعم إشعارات الجوال.",
    pushIosNote: "لإشعارات iPhone، قد تحتاج إضافة التطبيق إلى الشاشة الرئيسية.",
    saveSettings: "حفظ الإعدادات",
    settingsSaved: "تم حفظ الإعدادات",
    settingsSaveFailed: "تعذر حفظ الإعدادات.",
    loadingSettings: "جارٍ تحميل الإعدادات..."
  },
  en: {
    dashboardTitle: "Task Dashboard",
    report: "Download Report",
    logout: "Logout",
    totalTasks: "Total Tasks",
    activeTasks: "Active Tasks",
    completedTasks: "Completed Tasks",
    highPriorityTasks: "High Priority",
    overdueTasks: "Overdue Tasks",
    addNewTask: "Add New Task",
    addTaskCta: "Add Task",
    composerSubtitle: "Create a task only when you need it and keep the board clear.",
    editTask: "Edit Task",
    cancel: "Cancel",
    otpEmailLabel: "Authorized email",
    otpEmailPlaceholder: "Enter authorized email",
    otpHelper: "Enter your authorized email to receive the OTP",
    sendOtp: "Send OTP",
    sendingOtp: "Sending...",
    otpSent: "OTP sent. Check your email to continue.",
    invalidAuthorizedEmail: "Invalid authorized email",
    taskTitle: "Task Title",
    description: "Optional Description",
    priority: "Priority",
    dueDate: "Due Date",
    addTask: "Add Task",
    saveEdit: "Save Edit",
    cancelEdit: "Cancel Edit",
    currentTasks: "Current Tasks",
    completedSection: "Completed Tasks",
    noActive: "No active tasks",
    noCompleted: "No completed tasks",
    high: "High",
    medium: "Medium",
    low: "Low",
    active: "Active",
    completed: "Completed",
    overdue: "Overdue",
    priorityPrefix: "Priority",
    duePrefix: "Due",
    completedPrefix: "Completed",
    markCompleted: "Mark as Completed",
    edit: "Edit",
    delete: "Delete",
    showMore: "Show more",
    showLess: "Show less",
    footer: "© 2026 All rights reserved to Yahya Alshahrani",
    langToggle: "AR",
    reportFile: "tasks-report.csv",
    settings: "Settings",
    account: "Account",
    name: "Name",
    email: "Email",
    timezone: "Timezone",
    riyadhTimezone: "Riyadh timezone",
    notificationSettings: "Notification Settings",
    dailyReport: "Daily active tasks report",
    sendTime: "Send time",
    taskCompletedEmail: "Task completed email",
    taskCompletedEmailHelp: "Send email when a task is completed",
    overdueAlerts: "Overdue alerts",
    overdueAlertsHelp: "Only send when overdue tasks exist",
    frequency: "Frequency",
    hourly: "Hourly",
    every2hours: "Every two hours",
    daily: "Daily",
    deadlineReminders: "Deadline reminders",
    deadlineRemindersHelp: "3 days, 2 days, and 1 day before due date",
    priorityReminders: "Priority reminders",
    dailyReminders: "Daily reminders",
    pushNotifications: "Push Notifications",
    pushDescription: "Enable browser push notifications where supported.",
    enablePush: "Enable Push Notifications",
    pushEnabled: "Push notifications enabled",
    pushDenied: "Notification permission was denied by the browser.",
    pushUnsupported: "This browser does not support push notifications.",
    pushIosNote: "For iPhone notifications, you may need to add the app to the Home Screen.",
    saveSettings: "Save Settings",
    settingsSaved: "Settings saved",
    settingsSaveFailed: "Unable to save settings.",
    loadingSettings: "Loading settings..."
  }
};

function t(key) {
  return translations[language][key] || translations.ar[key] || key;
}

function isTaskOverdue(task) {
  if (task.status !== "active" || !task.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${task.dueDate}T00:00:00`);
  return due.getTime() < today.getTime();
}

function formatDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function setText(id, value) {
  const element = document.querySelector(`#${id}`);
  if (element) element.textContent = value;
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  appView.dir = language === "ar" ? "rtl" : "ltr";
  localStorage.setItem("todo_language", language);
  setText("dashboard-title", t("dashboardTitle"));
  setText("stat-total-label", t("totalTasks"));
  setText("stat-active-label", t("activeTasks"));
  setText("stat-completed-label", t("completedTasks"));
  setText("stat-high-label", t("highPriorityTasks"));
  setText("stat-overdue-label", t("overdueTasks"));
  setText("composer-title", t("addNewTask"));
  setText("composer-subtitle", t("composerSubtitle"));
  setText("open-task-modal-text", t("addTaskCta"));
  taskModalTitle.textContent = fields.id.value ? t("editTask") : t("addNewTask");
  setText("task-title-label", t("taskTitle"));
  setText("task-description-label", t("description"));
  setText("task-priority-label", t("priority"));
  setText("task-due-date-label", t("dueDate"));
  setText("active-title", t("currentTasks"));
  setText("completed-title", t("completedSection"));
  setText("active-empty", t("noActive"));
  setText("completed-empty", t("noCompleted"));
  setText("footer-copy", t("footer"));
  setText("otp-email-label", t("otpEmailLabel"));
  setText("otp-helper-text", t("otpHelper"));
  otpEmail.placeholder = t("otpEmailPlaceholder");
  languageToggleText.textContent = t("langToggle");
  taskModal.dir = language === "ar" ? "rtl" : "ltr";
  reportLink.textContent = t("report");
  reportLink.href = apiPath(`/api/report.csv?lang=${language}`);
  reportLink.setAttribute("download", t("reportFile"));
  logoutButton.textContent = t("logout");
  cancelEditButton.textContent = t("cancelEdit");
  cancelEditButton.textContent = t("cancel");
  saveTaskButton.textContent = fields.id.value ? t("saveEdit") : t("addTask");
  for (const option of fields.priority.options) option.textContent = t(option.value);
  settingsButton.setAttribute("aria-label", t("settings"));
  setText("settings-kicker", "To Do Task");
  setText("settings-title", t("settings"));
  setText("account-title", t("account"));
  setText("account-name-label", t("name"));
  setText("account-email-label", t("email"));
  setText("account-timezone-label", t("timezone"));
  setText("account-timezone", t("riyadhTimezone"));
  setText("notification-settings-title", t("notificationSettings"));
  setText("daily-report-label", t("dailyReport"));
  setText("daily-report-help", t("sendTime"));
  setText("daily-report-time-label", t("sendTime"));
  setText("task-completed-email-label", t("taskCompletedEmail"));
  setText("task-completed-email-help", t("taskCompletedEmailHelp"));
  setText("overdue-alerts-label", t("overdueAlerts"));
  setText("overdue-alerts-help", t("overdueAlertsHelp"));
  setText("overdue-frequency-label", t("frequency"));
  setText("deadline-reminders-label", t("deadlineReminders"));
  setText("deadline-reminders-help", t("deadlineRemindersHelp"));
  setText("priority-high-label", t("high"));
  setText("priority-medium-label", t("medium"));
  setText("priority-low-label", t("low"));
  setText("priority-high-help", t("dailyReminders"));
  setText("priority-medium-help", t("dailyReminders"));
  setText("priority-low-help", t("dailyReminders"));
  setText("push-title", t("pushNotifications"));
  setText("push-description", t("pushDescription"));
  setText("enable-push-button", t("enablePush"));
  setText("push-ios-note", t("pushIosNote"));
  setText("save-settings-button", t("saveSettings"));
  settingsPanel.dir = language === "ar" ? "rtl" : "ltr";
  for (const option of settingsFields.overdueFrequency.options) option.textContent = t(option.value);
  toggleCompleted.textContent = showAllCompleted ? t("showLess") : t("showMore");
  renderTasks();
}

function renderAuthState() {
  loginView.remove();
  appView.remove();
  const activeScreen = isAuthenticated ? appView : loginView;
  activeScreen.hidden = false;
  screenAnchor.parentNode.insertBefore(activeScreen, screenAnchor);
  document.body.dataset.auth = isAuthenticated ? "authenticated" : "guest";
  applyLanguage();
  if (!isAuthenticated && authMode === "pin") {
    window.setTimeout(() => pinLoginForm.pin.focus(), 30);
  }
}

function setAuthenticated(value) {
  isAuthenticated = Boolean(value);
  if (isAuthenticated) {
    localStorage.setItem("todo_auth", "true");
  } else {
    localStorage.removeItem("todo_auth");
  }
  renderAuthState();
}

function show(view) {
  setAuthenticated(view === "app");
}

function renderLoginMode() {
  const pinMode = authMode === "pin";
  pinLoginForm.remove();
  otpLoginForm.remove();
  loginFormSlot.append(pinMode ? pinLoginForm : otpLoginForm);
  pinLoginForm.hidden = !pinMode;
  otpLoginForm.hidden = pinMode;
  pinLoginForm.classList.toggle("is-hidden", !pinMode);
  otpLoginForm.classList.toggle("is-hidden", pinMode);
  pinLoginForm.setAttribute("aria-hidden", String(!pinMode));
  otpLoginForm.setAttribute("aria-hidden", String(pinMode));
  pinTab.classList.toggle("is-active", pinMode);
  otpTab.classList.toggle("is-active", !pinMode);
  pinTab.setAttribute("aria-selected", String(pinMode));
  otpTab.setAttribute("aria-selected", String(!pinMode));
  otpCodeGroup.remove();
  verifyOtpButton.remove();
  if (otpSent && !pinMode) {
    otpCodeGroup.hidden = false;
    verifyOtpButton.hidden = false;
    otpCodeGroup.classList.remove("is-hidden");
    verifyOtpButton.classList.remove("is-hidden");
    otpLoginForm.insertBefore(otpCodeGroup, otpLoginMessage);
    otpLoginForm.insertBefore(verifyOtpButton, otpLoginMessage);
  } else {
    otpCodeGroup.hidden = true;
    verifyOtpButton.hidden = true;
    otpCodeGroup.classList.add("is-hidden");
    verifyOtpButton.classList.add("is-hidden");
  }
  otpCode.required = otpSent;
}

function clearLoginUiState() {
  pinLoginMessage.textContent = "";
  otpLoginMessage.textContent = "";
  setButtonBusy(pinLoginForm.querySelector("button"), false, "Signing in...", "Sign in");
  setButtonBusy(sendOtpButton, false, t("sendingOtp"), t("sendOtp"));
  setButtonBusy(verifyOtpButton, false, "Verifying...", "Verify and Sign in");
}

function setLoginMode(mode) {
  authMode = mode === "otp" ? "otp" : "pin";
  otpSent = false;
  if (authMode === "pin") {
    otpCode.value = "";
  }
  clearLoginUiState();
  renderLoginMode();
  pinLoginMessage.textContent = "";
  otpLoginMessage.textContent = "";
  if (authMode === "pin") {
    window.setTimeout(() => pinLoginForm.pin.focus(), 30);
  }
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours}h${rest ? ` ${rest}m` : ""}`;
  }
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

async function api(path, options = {}) {
  const response = await fetch(apiPath(path), {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(payload?.error || "حدث خطأ غير متوقع.");
    error.payload = payload;
    error.status = response.status;
    throw error;
  }
  return payload;
}

function fillSettingsForm(value) {
  settings = value;
  const notifications = settings.notifications;
  settingsFields.dailyActiveTasksEnabled.checked = notifications.dailyActiveTasksEnabled;
  settingsFields.dailyActiveTasksTime.value = notifications.dailyActiveTasksTime;
  settingsFields.taskCompletedEmailEnabled.checked = notifications.taskCompletedEmailEnabled;
  settingsFields.overdueEnabled.checked = notifications.overdueEnabled;
  settingsFields.overdueFrequency.value = notifications.overdueFrequency;
  settingsFields.deadlineRemindersEnabled.checked = notifications.deadlineRemindersEnabled;
  for (const priority of ["high", "medium", "low"]) {
    settingsFields.priority[priority].enabled.checked = notifications.priorityReminders[priority].enabled;
    settingsFields.priority[priority].count.value = notifications.priorityReminders[priority].dailyCount;
  }
}

function collectSettingsForm() {
  return {
    ...settings,
    notifications: {
      dailyActiveTasksEnabled: settingsFields.dailyActiveTasksEnabled.checked,
      dailyActiveTasksTime: settingsFields.dailyActiveTasksTime.value || "11:00",
      taskCompletedEmailEnabled: settingsFields.taskCompletedEmailEnabled.checked,
      overdueEnabled: settingsFields.overdueEnabled.checked,
      overdueFrequency: settingsFields.overdueFrequency.value,
      deadlineRemindersEnabled: settingsFields.deadlineRemindersEnabled.checked,
      priorityReminders: {
        high: {
          enabled: settingsFields.priority.high.enabled.checked,
          dailyCount: Number(settingsFields.priority.high.count.value || 0)
        },
        medium: {
          enabled: settingsFields.priority.medium.enabled.checked,
          dailyCount: Number(settingsFields.priority.medium.count.value || 0)
        },
        low: {
          enabled: settingsFields.priority.low.enabled.checked,
          dailyCount: Number(settingsFields.priority.low.count.value || 0)
        }
      },
      pushEnabled: Boolean(settings?.notifications?.pushEnabled)
    }
  };
}

async function loadSettings() {
  const payload = await api("/api/settings");
  fillSettingsForm(payload);
  return payload;
}

async function saveSettings(nextSettings = collectSettingsForm()) {
  const payload = await api("/api/settings", {
    method: "PUT",
    body: JSON.stringify(nextSettings)
  });
  fillSettingsForm(payload);
  settingsMessage.textContent = t("settingsSaved");
  return payload;
}

async function openSettingsPanel() {
  settingsMessage.textContent = t("loadingSettings");
  pushMessage.textContent = "";
  settingsPanel.hidden = false;
  settingsPanel.dir = language === "ar" ? "rtl" : "ltr";
  document.body.classList.add("modal-open");
  try {
    await loadSettings();
    settingsMessage.textContent = "";
  } catch (error) {
    settingsMessage.textContent = error.message;
  }
}

function closeSettingsPanel() {
  settingsPanel.hidden = true;
  settingsMessage.textContent = "";
  pushMessage.textContent = "";
  document.body.classList.remove("modal-open");
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

async function enablePushNotifications() {
  pushMessage.textContent = "";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    pushMessage.textContent = t("pushUnsupported");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    pushMessage.textContent = t("pushDenied");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(`${BASE_PATH}/service-worker.js`);
    await navigator.serviceWorker.ready;
    await api("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify({
        endpoint: `local-permission:${Date.now()}`,
        permission,
        userAgent: navigator.userAgent
      })
    });
    settings.notifications.pushEnabled = true;
    await saveSettings(settings);
    pushMessage.textContent = t("pushEnabled");
    if (registration.active) {
      registration.active.postMessage({ type: "PUSH_ENABLED" });
    }
  } catch (error) {
    pushMessage.textContent = error.message || t("pushUnsupported");
  }
}

function loginErrorMessage(error) {
  const remaining = error.payload?.remainingMs;
  if (remaining > 0) return `Access is temporarily locked. Try again in ${formatRemaining(remaining)}.`;
  const attempts = error.payload?.remainingAttempts;
  return attempts ? `${error.message} Attempts remaining: ${attempts}.` : error.message;
}

function setButtonBusy(button, busy, busyText, readyText) {
  button.disabled = busy;
  button.setAttribute("aria-busy", String(busy));
  button.textContent = busy ? busyText : readyText;
}

function taskPayload() {
  return {
    title: fields.title.value.trim(),
    description: fields.description.value.trim(),
    priority: fields.priority.value,
    dueDate: fields.dueDate.value
  };
}

function resetTaskForm() {
  taskForm.reset();
  fields.id.value = "";
  fields.priority.value = "medium";
  saveTaskButton.textContent = t("addTask");
  taskModalTitle.textContent = t("addNewTask");
  taskMessage.textContent = "";
}

function openTaskModal(mode = "add") {
  if (mode === "add") {
    resetTaskForm();
  }
  taskModal.hidden = false;
  taskModal.dir = language === "ar" ? "rtl" : "ltr";
  document.body.classList.add("modal-open");
  taskModalTitle.textContent = fields.id.value ? t("editTask") : t("addNewTask");
  saveTaskButton.textContent = fields.id.value ? t("saveEdit") : t("addTask");
  window.setTimeout(() => fields.title.focus(), 30);
}

function closeTaskModal({ reset = true } = {}) {
  taskModal.hidden = true;
  document.body.classList.remove("modal-open");
  taskMessage.textContent = "";
  if (reset) resetTaskForm();
}

function resetLoginForms() {
  pinLoginForm.reset();
  otpLoginForm.reset();
  otpSent = false;
  renderLoginMode();
  pinLoginMessage.textContent = "";
  otpLoginMessage.textContent = "";
}

function setStats(stats) {
  document.querySelector("#stat-total").textContent = stats.total;
  document.querySelector("#stat-active").textContent = stats.active;
  document.querySelector("#stat-completed").textContent = stats.completed;
  document.querySelector("#stat-high").textContent = stats.highPriority;
  document.querySelector("#stat-overdue").textContent = stats.overdue;
}

function makeTaskCard(task, index, variant = "active") {
  const card = document.createElement("article");
  card.className = `task-card task-card-${variant} priority-${task.priority}`;

  const main = document.createElement("div");
  main.className = "task-main";
  const number = document.createElement("span");
  number.className = variant === "completed" ? "task-number completed-check" : "task-number";
  number.textContent = variant === "completed" ? "\u2713" : String(index + 1);
  const content = document.createElement("div");
  content.className = "task-content";
  const title = document.createElement("h3");
  title.textContent = task.title;
  content.append(title);
  if (task.description) {
    const description = document.createElement("p");
    description.textContent = task.description;
    content.append(description);
  }
  main.append(number, content);

  const meta = document.createElement("div");
  meta.className = "task-meta";
  const priority = document.createElement("span");
  priority.className = `pill ${task.priority}`;
  priority.textContent = `${t("priorityPrefix")}: ${t(task.priority)}`;
  const status = document.createElement("span");
  status.className = `pill ${task.status === "completed" ? "completed" : ""}`;
  status.textContent = task.status === "completed" ? t("completed") : t("active");
  meta.append(priority, status);

  if (task.dueDate) {
    const due = document.createElement("span");
    due.className = "pill";
    due.innerHTML = `${t("duePrefix")}: <span class="date-text">${formatDate(task.dueDate)}</span>`;
    meta.append(due);
  }

  if (isTaskOverdue(task)) {
    const overdue = document.createElement("span");
    overdue.className = "pill overdue";
    overdue.textContent = t("overdue");
    meta.append(overdue);
  }

  if (task.status === "completed" && task.completedAt) {
    const completedAt = document.createElement("span");
    completedAt.className = "pill completed";
    completedAt.innerHTML = `${t("completedPrefix")}: <span class="date-text">${formatDate(task.completedAt)}</span>`;
    meta.append(completedAt);
  }

  const actions = document.createElement("div");
  actions.className = "task-actions";

  if (task.status !== "completed") {
    const complete = document.createElement("button");
    complete.type = "button";
    complete.textContent = t("markCompleted");
    complete.addEventListener("click", () => completeTask(task.id));

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "ghost-button";
    edit.textContent = t("edit");
    edit.addEventListener("click", () => startEdit(task));
    actions.append(complete, edit);
  }

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "danger-button";
  remove.textContent = t("delete");
  remove.addEventListener("click", () => deleteTask(task.id));
  actions.append(remove);

  card.append(main, meta, actions);
  return card;
}

function renderTasks() {
  const active = tasks.filter((task) => task.status === "active");
  const completed = tasks
    .filter((task) => task.status === "completed")
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  activeTasksEl.replaceChildren(...active.map((task, index) => makeTaskCard(task, index, "active")));
  activeEmpty.hidden = active.length > 0;

  const visibleCompleted = showAllCompleted ? completed : completed.slice(0, 3);
  completedTasksEl.replaceChildren(...visibleCompleted.map((task, index) => makeTaskCard(task, index, "completed")));
  completedEmpty.hidden = completed.length > 0;
  toggleCompleted.hidden = completed.length <= 3;
  toggleCompleted.textContent = showAllCompleted ? t("showLess") : t("showMore");
}

async function loadTasks() {
  const payload = await api("/api/tasks");
  tasks = payload.tasks;
  setStats(payload.stats);
  renderTasks();
}

function startEdit(task) {
  fields.id.value = task.id;
  fields.title.value = task.title;
  fields.description.value = task.description;
  fields.priority.value = task.priority;
  fields.dueDate.value = task.dueDate;
  saveTaskButton.textContent = t("saveEdit");
  taskModalTitle.textContent = t("editTask");
  openTaskModal("edit");
}

async function completeTask(id) {
  await api(`/api/tasks/${id}/complete`, {
    method: "POST",
    body: JSON.stringify({ language })
  });
  await loadTasks();
}

async function deleteTask(id) {
  await api(`/api/tasks/${id}`, { method: "DELETE" });
  await loadTasks();
}

pinTab.addEventListener("click", () => setLoginMode("pin"));
otpTab.addEventListener("click", () => setLoginMode("otp"));

async function submitPinLogin() {
  pinLoginMessage.textContent = "";
  const submit = pinLoginForm.querySelector("button");
  if (submit.disabled) return;
  setButtonBusy(submit, true, "Signing in...", "Sign in");
  try {
    await api("/api/login/pin", {
      method: "POST",
      body: JSON.stringify({ pin: pinLoginForm.pin.value })
    });
    resetLoginForms();
    setAuthenticated(true);
    await loadTasks();
  } catch (error) {
    pinLoginMessage.textContent = loginErrorMessage(error);
  } finally {
    setButtonBusy(submit, false, "Signing in...", "Sign in");
  }
}

pinLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await submitPinLogin();
});

pinLoginForm.pin.addEventListener("input", () => {
  const digits = pinLoginForm.pin.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
  if (pinLoginForm.pin.value !== digits) {
    pinLoginForm.pin.value = digits;
  }
  if (digits.length === PIN_LENGTH) {
    submitPinLogin();
  }
});

sendOtpButton.addEventListener("click", async () => {
  otpLoginMessage.textContent = "";
  setButtonBusy(sendOtpButton, true, t("sendingOtp"), t("sendOtp"));
  try {
    await api("/api/login/otp/request", {
      method: "POST",
      body: JSON.stringify({ email: otpEmail.value.trim(), language })
    });
    otpSent = true;
    renderLoginMode();
    otpLoginMessage.textContent = t("otpSent");
    otpCode.focus();
  } catch (error) {
    otpLoginMessage.textContent = loginErrorMessage(error);
  } finally {
  setButtonBusy(sendOtpButton, false, t("sendingOtp"), t("sendOtp"));
  }
});

otpLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  otpLoginMessage.textContent = "";
  setButtonBusy(verifyOtpButton, true, "Verifying...", "Verify and Sign in");
  try {
    await api("/api/login/otp/verify", {
      method: "POST",
      body: JSON.stringify({
        email: otpEmail.value.trim(),
        otp: otpCode.value.trim()
      })
    });
    resetLoginForms();
    setAuthenticated(true);
    await loadTasks();
  } catch (error) {
    otpLoginMessage.textContent = loginErrorMessage(error);
  } finally {
    setButtonBusy(verifyOtpButton, false, "Verifying...", "Verify and Sign in");
  }
});

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  taskMessage.textContent = "";
  try {
    const id = fields.id.value;
    const method = id ? "PUT" : "POST";
    const path = id ? `/api/tasks/${id}` : "/api/tasks";
    await api(path, { method, body: JSON.stringify(taskPayload()) });
    closeTaskModal({ reset: true });
    await loadTasks();
  } catch (error) {
    taskMessage.textContent = error.message;
  }
});

openTaskModalButton.addEventListener("click", () => openTaskModal("add"));
cancelEditButton.addEventListener("click", () => closeTaskModal({ reset: true }));
closeTaskModalButton.addEventListener("click", () => closeTaskModal({ reset: true }));
taskModalOverlay.addEventListener("click", () => closeTaskModal({ reset: true }));
settingsButton.addEventListener("click", openSettingsPanel);
closeSettingsButton.addEventListener("click", closeSettingsPanel);
settingsOverlay.addEventListener("click", closeSettingsPanel);
enablePushButton.addEventListener("click", enablePushNotifications);

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  settingsMessage.textContent = "";
  setButtonBusy(document.querySelector("#save-settings-button"), true, t("saveSettings"), t("saveSettings"));
  try {
    await saveSettings();
  } catch (error) {
    settingsMessage.textContent = error.message || t("settingsSaveFailed");
  } finally {
    setButtonBusy(document.querySelector("#save-settings-button"), false, t("saveSettings"), t("saveSettings"));
  }
});

if (isIosDevice()) {
  document.querySelector("#push-ios-note").hidden = false;
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !taskModal.hidden) {
    closeTaskModal({ reset: true });
  }
  if (event.key === "Escape" && !settingsPanel.hidden) {
    closeSettingsPanel();
  }
});

toggleCompleted.addEventListener("click", () => {
  showAllCompleted = !showAllCompleted;
  renderTasks();
});

languageToggle.addEventListener("click", () => {
  language = language === "ar" ? "en" : "ar";
  applyLanguage();
});

logoutButton.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  tasks = [];
  resetTaskForm();
  setAuthenticated(false);
  setLoginMode("pin");
});

async function init() {
  renderAuthState();
  setLoginMode("pin");
  try {
    const session = await api("/api/session");
    if (session.authenticated) {
      setAuthenticated(true);
      await loadSettings();
      await loadTasks();
    } else {
      setAuthenticated(false);
    }
  } catch {
    setAuthenticated(false);
  }
}

init();
