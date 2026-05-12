const fs = require("fs/promises");
const path = require("path");

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const PUSH_SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "push-subscriptions.json");

const defaultSettings = {
  profile: {
    name: "Yahya Alshahrani",
    email: "yalshahrani@asda.gov.sa",
    timezone: "Asia/Riyadh"
  },
  notifications: {
    dailyActiveTasksEnabled: true,
    dailyActiveTasksTime: "11:00",
    taskCompletedEmailEnabled: true,
    overdueEnabled: true,
    overdueFrequency: "hourly",
    deadlineRemindersEnabled: true,
    priorityReminders: {
      high: { enabled: true, dailyCount: 3 },
      medium: { enabled: true, dailyCount: 2 },
      low: { enabled: true, dailyCount: 1 }
    },
    pushEnabled: false
  }
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function booleanValue(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function timeValue(value, fallback) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
}

function countValue(value, fallback, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(max, Math.round(number)));
}

function sanitizeSettings(input = {}) {
  const defaults = deepClone(defaultSettings);
  const notifications = input.notifications && typeof input.notifications === "object" ? input.notifications : {};
  const priority = notifications.priorityReminders && typeof notifications.priorityReminders === "object"
    ? notifications.priorityReminders
    : {};

  return {
    profile: defaults.profile,
    notifications: {
      dailyActiveTasksEnabled: booleanValue(notifications.dailyActiveTasksEnabled, defaults.notifications.dailyActiveTasksEnabled),
      dailyActiveTasksTime: timeValue(notifications.dailyActiveTasksTime, defaults.notifications.dailyActiveTasksTime),
      taskCompletedEmailEnabled: booleanValue(notifications.taskCompletedEmailEnabled, defaults.notifications.taskCompletedEmailEnabled),
      overdueEnabled: booleanValue(notifications.overdueEnabled, defaults.notifications.overdueEnabled),
      overdueFrequency: ["hourly", "every2hours", "daily"].includes(notifications.overdueFrequency)
        ? notifications.overdueFrequency
        : defaults.notifications.overdueFrequency,
      deadlineRemindersEnabled: booleanValue(notifications.deadlineRemindersEnabled, defaults.notifications.deadlineRemindersEnabled),
      priorityReminders: {
        high: {
          enabled: booleanValue(priority.high?.enabled, defaults.notifications.priorityReminders.high.enabled),
          dailyCount: countValue(priority.high?.dailyCount, defaults.notifications.priorityReminders.high.dailyCount, 6)
        },
        medium: {
          enabled: booleanValue(priority.medium?.enabled, defaults.notifications.priorityReminders.medium.enabled),
          dailyCount: countValue(priority.medium?.dailyCount, defaults.notifications.priorityReminders.medium.dailyCount, 4)
        },
        low: {
          enabled: booleanValue(priority.low?.enabled, defaults.notifications.priorityReminders.low.enabled),
          dailyCount: countValue(priority.low?.dailyCount, defaults.notifications.priorityReminders.low.dailyCount, 2)
        }
      },
      pushEnabled: booleanValue(notifications.pushEnabled, defaults.notifications.pushEnabled)
    }
  };
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempFile = `${filePath}.tmp`;
  await fs.writeFile(tempFile, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(tempFile, filePath);
}

async function getSettings() {
  return sanitizeSettings(await readJson(SETTINGS_FILE, defaultSettings));
}

async function saveSettings(input) {
  const settings = sanitizeSettings(input);
  await writeJson(SETTINGS_FILE, settings);
  return settings;
}

async function savePushSubscription(subscription) {
  const subscriptions = await readJson(PUSH_SUBSCRIPTIONS_FILE, []);
  const list = Array.isArray(subscriptions) ? subscriptions : [];
  const endpoint = typeof subscription?.endpoint === "string" ? subscription.endpoint : "";
  if (!endpoint) {
    const error = new Error("Invalid push subscription.");
    error.statusCode = 400;
    throw error;
  }
  const next = [
    ...list.filter((item) => item.endpoint !== endpoint),
    {
      endpoint,
      subscription,
      updatedAt: new Date().toISOString()
    }
  ];
  await writeJson(PUSH_SUBSCRIPTIONS_FILE, next);
  return { ok: true };
}

module.exports = {
  defaultSettings,
  getSettings,
  sanitizeSettings,
  savePushSubscription,
  saveSettings
};
