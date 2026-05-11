const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const taskStore = require("./src/storage/taskStore");
const EmailReminderService = require("./src/services/EmailReminderService");

loadEnvFile();

const PORT = Number(process.env.APP_PORT || 3000);
const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const AUTHORIZED_EMAIL = process.env.AUTHORIZED_EMAIL || LOGIN_EMAIL;
const LOGIN_PIN = process.env.LOGIN_PIN;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const PUBLIC_DIR = path.join(process.cwd(), "public");

const sessions = new Map();
const attempts = new Map();
const otpChallenges = new Map();
const lockDurations = [5 * 60 * 1000, 20 * 60 * 1000, 60 * 60 * 1000];
const OTP_TTL_MS = 10 * 60 * 1000;

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  try {
    const raw = require("fs").readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // The app can still start in managed environments where variables are injected.
  }
}

function assertAuthConfig() {
  if (!AUTHORIZED_EMAIL || !LOGIN_PIN) {
    throw new Error("AUTHORIZED_EMAIL and LOGIN_PIN must be configured in .env or environment variables.");
  }
}

function authMessage(language, key) {
  const messages = {
    ar: {
      invalidAuthorizedEmail: "البريد الإلكتروني غير مصرح"
    },
    en: {
      invalidAuthorizedEmail: "Invalid authorized email"
    }
  };
  const lang = language === "ar" ? "ar" : "en";
  return messages[lang][key] || messages.en[key];
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key, value]) => key && value)
  );
}

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}

function createSession(res) {
  const id = crypto.randomBytes(24).toString("hex");
  sessions.set(id, { createdAt: Date.now() });
  const cookieValue = `${id}.${sign(id)}`;
  res.setHeader("Set-Cookie", `tdt_session=${cookieValue}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);
}

function clearSession(req, res) {
  const session = getSession(req);
  if (session) sessions.delete(session.id);
  res.setHeader("Set-Cookie", "tdt_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
}

function getSession(req) {
  const raw = parseCookies(req).tdt_session;
  if (!raw) return null;
  const [id, signature] = raw.split(".");
  if (!id || signature !== sign(id) || !sessions.has(id)) return null;
  return { id, ...sessions.get(id) };
}

function requireAuth(req, res) {
  if (getSession(req)) return true;
  sendJson(res, 401, { error: "Unauthorized" });
  return false;
}

function getClientKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || req.socket.remoteAddress || "local");
  return ip.split(",")[0].trim();
}

function getAttemptState(key) {
  if (!attempts.has(key)) {
    attempts.set(key, { failures: 0, lockLevel: 0, lockedUntil: 0 });
  }
  return attempts.get(key);
}

function registerFailedAttempt(key) {
  const state = getAttemptState(key);
  state.failures += 1;
  if (state.failures >= 5) {
    const duration = lockDurations[Math.min(state.lockLevel, lockDurations.length - 1)];
    state.lockedUntil = Date.now() + duration;
    state.lockLevel += 1;
    state.failures = 0;
  }
  attempts.set(key, state);
  return state;
}

function checkLock(req, res) {
  const key = getClientKey(req);
  const state = getAttemptState(key);
  const remainingLockMs = state.lockedUntil - Date.now();
  if (remainingLockMs > 0) {
    sendJson(res, 423, { error: "Account temporarily locked.", remainingMs: remainingLockMs });
    return { locked: true, key };
  }
  return { locked: false, key };
}

function sendLoginFailure(res, key, message) {
  const nextState = registerFailedAttempt(key);
  const lockMs = Math.max(0, nextState.lockedUntil - Date.now());
  sendJson(res, lockMs > 0 ? 423 : 401, {
    error: lockMs > 0 ? "Account temporarily locked." : message,
    remainingMs: lockMs,
    remainingAttempts: lockMs > 0 ? 0 : Math.max(0, 5 - nextState.failures)
  });
}

function timingSafeEqualText(a, b) {
  const aBuffer = Buffer.from(String(a));
  const bBuffer = Buffer.from(String(b));
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}

function createOtpCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function hashOtp(email, code) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(`${email}:${code}`).digest("hex");
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Invalid JSON body.");
    error.statusCode = 400;
    throw error;
  }
}

function activeStats(tasks) {
  const now = Date.now();
  return {
    total: tasks.length,
    active: tasks.filter((task) => task.status === "active").length,
    completed: tasks.filter((task) => task.status === "completed").length,
    highPriority: tasks.filter((task) => task.status === "active" && task.priority === "high").length,
    overdue: tasks.filter((task) => {
      if (task.status !== "active" || !task.dueDate) return false;
      return new Date(task.dueDate).getTime() < now;
    }).length
  };
}

function escapeCsv(value) {
  const text = String(value || "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatCsvDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

function isTaskOverdueForReport(task) {
  if (task.status !== "active" || !task.dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${task.dueDate}T00:00:00`).getTime() < today.getTime();
}

function makeCsv(tasks, language = "ar") {
  const ar = language === "ar";
  const priorityLabels = ar
    ? { high: "عالية", medium: "متوسطة", low: "منخفضة" }
    : { high: "High", medium: "Medium", low: "Low" };
  const statusLabels = ar
    ? { active: "نشطة", completed: "مكتملة", overdue: "متأخرة" }
    : { active: "Active", completed: "Completed", overdue: "Overdue" };
  const headers = ar
    ? ["رقم المهمة", "العنوان", "الوصف", "الأولوية", "تاريخ الإنشاء", "تاريخ التسليم", "الحالة", "تاريخ الإكمال"]
    : ["Task No.", "Title", "Description", "Priority", "Created Date", "Due Date", "Status", "Completed Date"];
  const rows = [
    headers,
    ...tasks.map((task, index) => {
      const status = isTaskOverdueForReport(task) ? "overdue" : task.status;
      return [
        index + 1,
        task.title,
        task.description,
        priorityLabels[task.priority] || task.priority,
        formatCsvDate(task.createdAt),
        formatCsvDate(task.dueDate),
        statusLabels[status] || status,
        formatCsvDate(task.completedAt)
      ];
    })
  ];
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\n")}`;
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".svg": "image/svg+xml"
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/session" && req.method === "GET") {
    sendJson(res, 200, { authenticated: Boolean(getSession(req)) });
    return;
  }

  if (url.pathname === "/api/login/pin" && req.method === "POST") {
    const lock = checkLock(req, res);
    if (lock.locked) return;
    const body = await readBody(req);
    const ok = timingSafeEqualText(body.pin || "", LOGIN_PIN);
    if (!ok) {
      sendLoginFailure(res, lock.key, "Invalid PIN.");
      return;
    }

    attempts.delete(lock.key);
    createSession(res);
    sendJson(res, 200, { authenticated: true });
    return;
  }

  if (url.pathname === "/api/login" && req.method === "POST") {
    const lock = checkLock(req, res);
    if (lock.locked) return;
    const body = await readBody(req);
    const ok = timingSafeEqualText(body.pin || "", LOGIN_PIN);
    if (!ok) {
      sendLoginFailure(res, lock.key, "Invalid PIN.");
      return;
    }

    attempts.delete(lock.key);
    createSession(res);
    sendJson(res, 200, { authenticated: true });
    return;
  }

  if (url.pathname === "/api/login/otp/request" && req.method === "POST") {
    const lock = checkLock(req, res);
    if (lock.locked) return;
    const body = await readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    if (email !== AUTHORIZED_EMAIL.toLowerCase()) {
      sendLoginFailure(res, lock.key, authMessage(body.language, "invalidAuthorizedEmail"));
      return;
    }

    if (!reminderService.hasSmtpConfig()) {
      sendJson(res, 503, { error: "Email OTP is not available because SMTP settings are missing." });
      return;
    }

    const code = createOtpCode();
    otpChallenges.set(email, {
      hash: hashOtp(email, code),
      expiresAt: Date.now() + OTP_TTL_MS
    });

    try {
      await reminderService.sendLoginOtpEmail({
        to: email,
        code,
        language: body.language
      });
      sendJson(res, 200, { ok: true });
    } catch {
      otpChallenges.delete(email);
      sendJson(res, 502, { error: "Unable to send OTP email right now." });
    }
    return;
  }

  if (url.pathname === "/api/login/otp/verify" && req.method === "POST") {
    const lock = checkLock(req, res);
    if (lock.locked) return;
    const body = await readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const otp = String(body.otp || "").trim();
    const challenge = otpChallenges.get(email);

    if (email !== AUTHORIZED_EMAIL.toLowerCase() || !challenge || challenge.expiresAt < Date.now()) {
      otpChallenges.delete(email);
      sendLoginFailure(res, lock.key, "Invalid or expired OTP.");
      return;
    }

    if (!/^\d{6}$/.test(otp) || !timingSafeEqualText(hashOtp(email, otp), challenge.hash)) {
      sendLoginFailure(res, lock.key, "Invalid or expired OTP.");
      return;
    }

    otpChallenges.delete(email);
    attempts.delete(lock.key);
    createSession(res);
    sendJson(res, 200, { authenticated: true });
    return;
  }

  if (url.pathname === "/api/logout" && req.method === "POST") {
    clearSession(req, res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/tasks" && req.method === "GET") {
    if (!requireAuth(req, res)) return;
    const tasks = await taskStore.listTasks();
    sendJson(res, 200, { tasks, stats: activeStats(tasks) });
    return;
  }

  if (url.pathname === "/api/tasks" && req.method === "POST") {
    if (!requireAuth(req, res)) return;
    const task = await taskStore.addTask(await readBody(req));
    sendJson(res, 201, { task });
    return;
  }

  const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)(?:\/(complete))?$/);
  if (taskMatch && !requireAuth(req, res)) return;
  if (taskMatch && req.method === "PUT") {
    const task = await taskStore.updateTask(taskMatch[1], await readBody(req));
    sendJson(res, task ? 200 : 404, task ? { task } : { error: "Task not found." });
    return;
  }

  if (taskMatch && req.method === "DELETE") {
    const deleted = await taskStore.deleteTask(taskMatch[1]);
    sendJson(res, deleted ? 200 : 404, deleted ? { ok: true } : { error: "Task not found." });
    return;
  }

  if (taskMatch && taskMatch[2] === "complete" && req.method === "POST") {
    const body = await readBody(req);
    const task = await taskStore.completeTask(taskMatch[1]);
    if (task) {
      reminderService.sendTaskCompletedEmail(task, body.language).catch((error) => {
        console.warn("Task completion email failed:", error.message);
      });
    }
    sendJson(res, task ? 200 : 404, task ? { task } : { error: "Task not found." });
    return;
  }

  if (url.pathname === "/api/report.csv" && req.method === "GET") {
    if (!requireAuth(req, res)) return;
    const language = url.searchParams.get("lang") === "en" ? "en" : "ar";
    const tasks = await taskStore.listTasks();
    const filename = language === "ar" ? "تقرير-المهام.csv" : "tasks-report.csv";
    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store"
    });
    res.end(makeCsv(tasks, language));
    return;
  }

  if (url.pathname === "/api/reminders/test" && req.method === "POST") {
    if (!requireAuth(req, res)) return;
    const result = await reminderService.sendTestReminderEmail();
    sendJson(res, result.sent ? 200 : 503, result.sent ? { ok: true } : { error: "Email reminder service is not configured." });
    return;
  }

  sendJson(res, 404, { error: "Not found." });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || "Server error." });
  }
});

assertAuthConfig();

const reminderService = new EmailReminderService({ taskStore });
reminderService.start();

server.listen(PORT, () => {
  console.log(`To Do Task is running at http://localhost:${PORT}`);
});
