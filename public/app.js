const loginView = document.querySelector("#login-view");
const appView = document.querySelector("#app-view");
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
const cancelEditButton = document.querySelector("#cancel-edit-button");
const saveTaskButton = document.querySelector("#save-task-button");

const fields = {
  id: document.querySelector("#task-id"),
  title: document.querySelector("#task-title"),
  description: document.querySelector("#task-description"),
  priority: document.querySelector("#task-priority"),
  dueDate: document.querySelector("#task-due-date")
};

let tasks = [];
let showAllCompleted = false;

const priorityLabels = {
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة"
};

function show(view) {
  loginView.hidden = view !== "login";
  appView.hidden = view !== "app";
}

function setLoginMode(mode) {
  const pinMode = mode === "pin";
  pinLoginForm.hidden = !pinMode;
  otpLoginForm.hidden = pinMode;
  pinTab.classList.toggle("is-active", pinMode);
  otpTab.classList.toggle("is-active", !pinMode);
  pinTab.setAttribute("aria-selected", String(pinMode));
  otpTab.setAttribute("aria-selected", String(!pinMode));
  pinLoginMessage.textContent = "";
  otpLoginMessage.textContent = "";
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
  const response = await fetch(path, {
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
  saveTaskButton.textContent = "إضافة المهمة";
  cancelEditButton.hidden = true;
  taskMessage.textContent = "";
}

function resetLoginForms() {
  pinLoginForm.reset();
  otpLoginForm.reset();
  otpCodeGroup.hidden = true;
  verifyOtpButton.hidden = true;
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

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(value));
}

function makeTaskCard(task) {
  const card = document.createElement("article");
  card.className = "task-card";

  const header = document.createElement("header");
  const title = document.createElement("h3");
  title.textContent = task.title;
  header.append(title);

  const body = document.createElement("div");
  body.className = "task-body";
  if (task.description) {
    const description = document.createElement("p");
    description.textContent = task.description;
    body.append(description);
  }

  const meta = document.createElement("div");
  meta.className = "task-meta";
  const priority = document.createElement("span");
  priority.className = `pill ${task.priority}`;
  priority.textContent = `الأولوية: ${priorityLabels[task.priority]}`;
  const status = document.createElement("span");
  status.className = `pill ${task.status === "completed" ? "completed" : ""}`;
  status.textContent = task.status === "completed" ? "مكتملة" : "نشطة";
  meta.append(priority, status);

  if (task.dueDate) {
    const due = document.createElement("span");
    due.className = "pill";
    due.textContent = `التسليم: ${formatDate(task.dueDate)}`;
    meta.append(due);
  }

  const actions = document.createElement("div");
  actions.className = "task-actions";

  if (task.status !== "completed") {
    const complete = document.createElement("button");
    complete.type = "button";
    complete.textContent = "تحديد كمكتملة";
    complete.addEventListener("click", () => completeTask(task.id));

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "ghost-button";
    edit.textContent = "تعديل";
    edit.addEventListener("click", () => startEdit(task));
    actions.append(complete, edit);
  }

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "danger-button";
  remove.textContent = "حذف";
  remove.addEventListener("click", () => deleteTask(task.id));
  actions.append(remove);

  card.append(header, body, meta, actions);
  return card;
}

function renderTasks() {
  const active = tasks.filter((task) => task.status === "active");
  const completed = tasks
    .filter((task) => task.status === "completed")
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  activeTasksEl.replaceChildren(...active.map(makeTaskCard));
  activeEmpty.hidden = active.length > 0;

  const visibleCompleted = showAllCompleted ? completed : completed.slice(0, 3);
  completedTasksEl.replaceChildren(...visibleCompleted.map(makeTaskCard));
  completedEmpty.hidden = completed.length > 0;
  toggleCompleted.hidden = completed.length <= 3;
  toggleCompleted.textContent = showAllCompleted ? "Show less" : "Show more";
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
  saveTaskButton.textContent = "حفظ التعديل";
  cancelEditButton.hidden = false;
  fields.title.focus();
}

async function completeTask(id) {
  await api(`/api/tasks/${id}/complete`, { method: "POST" });
  await loadTasks();
}

async function deleteTask(id) {
  await api(`/api/tasks/${id}`, { method: "DELETE" });
  await loadTasks();
}

pinTab.addEventListener("click", () => setLoginMode("pin"));
otpTab.addEventListener("click", () => setLoginMode("otp"));

pinLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  pinLoginMessage.textContent = "";
  const submit = pinLoginForm.querySelector("button");
  setButtonBusy(submit, true, "Signing in...", "Sign in");
  try {
    await api("/api/login/pin", {
      method: "POST",
      body: JSON.stringify({ pin: pinLoginForm.pin.value })
    });
    resetLoginForms();
    show("app");
    await loadTasks();
  } catch (error) {
    pinLoginMessage.textContent = loginErrorMessage(error);
  } finally {
    setButtonBusy(submit, false, "Signing in...", "Sign in");
  }
});

sendOtpButton.addEventListener("click", async () => {
  otpLoginMessage.textContent = "";
  setButtonBusy(sendOtpButton, true, "Sending...", "Send OTP");
  try {
    await api("/api/login/otp/request", {
      method: "POST",
      body: JSON.stringify({ email: otpEmail.value.trim() })
    });
    otpCodeGroup.hidden = false;
    verifyOtpButton.hidden = false;
    otpCode.required = true;
    otpLoginMessage.textContent = "OTP sent. Check your email to continue.";
    otpCode.focus();
  } catch (error) {
    otpLoginMessage.textContent = loginErrorMessage(error);
  } finally {
    setButtonBusy(sendOtpButton, false, "Sending...", "Send OTP");
  }
});

otpLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  otpLoginMessage.textContent = "";
  setButtonBusy(verifyOtpButton, true, "Verifying...", "Verify OTP");
  try {
    await api("/api/login/otp/verify", {
      method: "POST",
      body: JSON.stringify({
        email: otpEmail.value.trim(),
        otp: otpCode.value.trim()
      })
    });
    resetLoginForms();
    show("app");
    await loadTasks();
  } catch (error) {
    otpLoginMessage.textContent = loginErrorMessage(error);
  } finally {
    setButtonBusy(verifyOtpButton, false, "Verifying...", "Verify OTP");
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
    resetTaskForm();
    await loadTasks();
  } catch (error) {
    taskMessage.textContent = error.message;
  }
});

cancelEditButton.addEventListener("click", resetTaskForm);

toggleCompleted.addEventListener("click", () => {
  showAllCompleted = !showAllCompleted;
  renderTasks();
});

logoutButton.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  tasks = [];
  resetTaskForm();
  show("login");
});

async function init() {
  try {
    const session = await api("/api/session");
    if (session.authenticated) {
      show("app");
      await loadTasks();
    } else {
      show("login");
    }
  } catch {
    show("login");
  }
}

init();
