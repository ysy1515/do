const fs = require("fs/promises");
const path = require("path");
const nodemailer = require("nodemailer");
const {
  renderDailyReportEmail,
  renderDueReminderEmail,
  renderOtpEmail,
  renderOverdueAlertEmail,
  renderTaskCompletedEmail
} = require("../email/templates");

class EmailReminderService {
  constructor({ taskStore, settingsStore, env = process.env, logger = console }) {
    this.taskStore = taskStore;
    this.settingsStore = settingsStore;
    this.env = env;
    this.logger = logger;
    this.tickTimer = null;
    this.tickInterval = null;
    this.transporter = null;
    this.missingConfigLogged = false;
    this.missingOverdueConfigLogged = false;
    this.logFile = path.join(process.cwd(), "data", "reminder-log.json");
    this.reminderDays = [3, 2, 1];
    this.defaultLanguage = env.TODO_EMAIL_LANGUAGE === "en" ? "en" : "ar";
  }

  start() {
    this.scheduleNotificationTick();
  }

  stop() {
    if (this.tickTimer) clearTimeout(this.tickTimer);
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  refreshSettings() {
    // The tick reads settings from storage every run, so no restart is required.
  }

  getConfig() {
    return {
      host: this.env.SMTP_HOST,
      port: Number(this.env.SMTP_PORT || 587),
      user: this.env.SMTP_USER,
      pass: this.env.SMTP_PASS,
      from: this.env.SMTP_FROM,
      to: this.env.REMINDER_TO || "yalshahrani@asda.gov.sa"
    };
  }

  hasSmtpConfig() {
    const config = this.getConfig();
    return Boolean(config.host && config.port && config.user && config.pass && config.from);
  }

  getTransporter() {
    if (!this.hasSmtpConfig()) {
      if (!this.missingConfigLogged) {
        this.logger.info("Email notifications are disabled because SMTP settings are missing.");
        this.missingConfigLogged = true;
      }
      return null;
    }

    if (!this.transporter) {
      const config = this.getConfig();
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.user,
          pass: config.pass
        }
      });
    }

    return this.transporter;
  }

  scheduleNotificationTick() {
    const delay = this.msUntilNextMinute();
    this.tickTimer = setTimeout(() => {
      this.runNotificationTick().catch((error) => {
        this.logger.warn("Email notification tick failed:", error.message);
      });
      this.tickInterval = setInterval(() => {
        this.runNotificationTick().catch((error) => {
          this.logger.warn("Email notification tick failed:", error.message);
        });
      }, 60 * 1000);
    }, delay);
  }

  msUntilNextMinute(now = new Date()) {
    const next = new Date(now);
    next.setSeconds(0, 0);
    next.setMinutes(next.getMinutes() + 1);
    return next.getTime() - now.getTime();
  }

  getRiyadhDateParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      year: Number(values.year),
      month: Number(values.month),
      day: Number(values.day)
    };
  }

  getRiyadhDateKey(date = new Date()) {
    const parts = this.getRiyadhDateParts(date);
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  }

  getRiyadhHourKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}T${values.hour}`;
  }

  getRiyadhTimeKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.hour}:${values.minute}`;
  }

  getRiyadhHourNumber(date = new Date()) {
    return Number(this.getRiyadhTimeKey(date).slice(0, 2));
  }

  daysUntilDue(dueDate, now = new Date()) {
    if (!dueDate) return null;
    const [dueYear, dueMonth, dueDay] = String(dueDate).split("-").map(Number);
    if (!dueYear || !dueMonth || !dueDay) return null;
    const today = this.getRiyadhDateParts(now);
    const dueUtc = Date.UTC(dueYear, dueMonth - 1, dueDay);
    const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
    return Math.round((dueUtc - todayUtc) / (24 * 60 * 60 * 1000));
  }

  async readReminderLog() {
    try {
      const raw = await fs.readFile(this.logFile, "utf8");
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  async writeReminderLog(log) {
    await fs.mkdir(path.dirname(this.logFile), { recursive: true });
    await fs.writeFile(this.logFile, `${JSON.stringify(log, null, 2)}\n`, "utf8");
  }

  async getSettings() {
    return this.settingsStore ? this.settingsStore.getSettings() : {};
  }

  async runNotificationTick(now = new Date()) {
    const settings = await this.getSettings();
    const tasks = await this.taskStore.listTasks();
    const log = await this.readReminderLog();
    const timeKey = this.getRiyadhTimeKey(now);

    if (timeKey === settings.notifications.dailyActiveTasksTime) {
      if (settings.notifications.deadlineRemindersEnabled) {
        await this.sendPreDueReminders(tasks, log);
      }
      if (settings.notifications.dailyActiveTasksEnabled) {
        await this.sendDailyActiveTasksReport(tasks, log);
      }
    }

    if (this.shouldRunOverdue(settings, now)) {
      await this.sendOverdueTasksAlert({ settings, tasks, log, now });
    }

    await this.sendPriorityReminders({ settings, tasks, log, now });
    await this.writeReminderLog(log);
  }

  async runDailyNotifications() {
    const settings = await this.getSettings();
    const tasks = await this.taskStore.listTasks();
    const log = await this.readReminderLog();
    if (settings.notifications.deadlineRemindersEnabled) await this.sendPreDueReminders(tasks, log);
    if (settings.notifications.dailyActiveTasksEnabled) await this.sendDailyActiveTasksReport(tasks, log);
    await this.writeReminderLog(log);
  }

  async sendPreDueReminders(tasks, log) {
    const language = this.defaultLanguage;
    const todayKey = this.getRiyadhDateKey();
    const activeTasks = tasks.filter((task) => task.status === "active" && task.dueDate);
    for (const task of activeTasks) {
      const days = this.daysUntilDue(task.dueDate);
      if (!this.reminderDays.includes(days)) continue;
      const logKey = `due:${task.id}:${days}:${todayKey}`;
      if (log[logKey]) continue;

      const result = await this.sendMail({
        to: this.getConfig().to,
        subject: `To Do Task - Task Due in ${days} Day${days === 1 ? "" : "s"}`,
        body: [
          `Task: ${task.title}`,
          task.description ? `Description: ${task.description}` : "",
          `Priority: ${task.priority}`,
          `Due date: ${task.dueDate}`,
          "Status: active"
        ].filter(Boolean).join("\n"),
        html: renderDueReminderEmail({ language, task, days })
      });

      if (result.sent) log[logKey] = new Date().toISOString();
    }
  }

  async sendDailyActiveTasksReport(tasks, log) {
    const language = this.defaultLanguage;
    const todayKey = this.getRiyadhDateKey();
    const logKey = `daily-active-report:${todayKey}`;
    if (log[logKey]) return;

    const activeTasks = tasks.filter((task) => task.status === "active");
    if (activeTasks.length === 0) return;

    const overdueTasks = activeTasks.filter((task) => task.dueDate && this.daysUntilDue(task.dueDate) < 0);
    const highPriorityTasks = activeTasks.filter((task) => task.priority === "high");
    const rows = activeTasks.map((task, index) => {
      return `${index + 1}. ${task.title} | ${task.priority} | due: ${task.dueDate || "No due date"} | active`;
    });

    const result = await this.sendMail({
      to: this.getConfig().to,
      subject: "To Do Task - Daily Active Tasks Report",
      body: [
        `Total active tasks: ${activeTasks.length}`,
        `High priority tasks: ${highPriorityTasks.length}`,
        `Overdue tasks: ${overdueTasks.length}`,
        "",
        "Active tasks:",
        ...rows
      ].join("\n"),
      html: renderDailyReportEmail({
        language,
        tasks: activeTasks,
        counts: {
          total: activeTasks.length,
          high: highPriorityTasks.length,
          overdue: overdueTasks.length
        }
      })
    });

    if (result.sent) log[logKey] = new Date().toISOString();
  }

  prioritySlots(dailyCount) {
    if (dailyCount <= 0) return [];
    const start = 9;
    const end = 17;
    if (dailyCount === 1) return [11];
    return Array.from({ length: dailyCount }, (_, index) => {
      return Math.round(start + ((end - start) * index) / (dailyCount - 1));
    });
  }

  async sendPriorityReminders({ settings, tasks, log, now = new Date() }) {
    if (!this.hasSmtpConfig()) return;
    const hour = this.getRiyadhHourNumber(now);
    const todayKey = this.getRiyadhDateKey(now);
    const activeTasks = tasks.filter((task) => task.status === "active");

    for (const priority of ["high", "medium", "low"]) {
      const config = settings.notifications.priorityReminders[priority];
      if (!config.enabled || config.dailyCount <= 0) continue;
      if (!this.prioritySlots(config.dailyCount).includes(hour)) continue;

      const logKey = `priority:${priority}:${todayKey}:${hour}`;
      if (log[logKey]) continue;

      const priorityTasks = activeTasks.filter((task) => task.priority === priority);
      if (priorityTasks.length === 0) continue;

      const result = await this.sendMail({
        to: this.getConfig().to,
        subject: `To Do Task - ${priority} priority active tasks`,
        body: [
          `${priority} priority active tasks: ${priorityTasks.length}`,
          "",
          ...priorityTasks.map((task, index) => `${index + 1}. ${task.title} | due: ${task.dueDate || "No due date"}`)
        ].join("\n"),
        html: renderDailyReportEmail({
          language: this.defaultLanguage,
          tasks: priorityTasks,
          counts: {
            total: priorityTasks.length,
            high: priorityTasks.filter((task) => task.priority === "high").length,
            overdue: priorityTasks.filter((task) => task.dueDate && this.daysUntilDue(task.dueDate) < 0).length
          }
        })
      });

      if (result.sent) log[logKey] = new Date().toISOString();
    }
  }

  getOverdueTasks(tasks) {
    return tasks.filter((task) => task.status !== "completed" && task.dueDate && this.daysUntilDue(task.dueDate) < 0);
  }

  shouldRunOverdue(settings, now = new Date()) {
    if (!settings.notifications.overdueEnabled) return false;
    const hour = this.getRiyadhHourNumber(now);
    if (settings.notifications.overdueFrequency === "daily") {
      return this.getRiyadhTimeKey(now) === settings.notifications.dailyActiveTasksTime;
    }
    if (settings.notifications.overdueFrequency === "every2hours") {
      return now.getUTCMinutes() === 0 && hour % 2 === 0;
    }
    return now.getUTCMinutes() === 0;
  }

  overdueLogKey(settings, now = new Date()) {
    if (settings.notifications.overdueFrequency === "daily") return `overdue-alert:${this.getRiyadhDateKey(now)}`;
    if (settings.notifications.overdueFrequency === "every2hours") {
      const hour = this.getRiyadhHourNumber(now);
      return `overdue-alert:${this.getRiyadhDateKey(now)}:${Math.floor(hour / 2) * 2}`;
    }
    return `overdue-alert:${this.getRiyadhHourKey(now)}`;
  }

  async sendOverdueTasksAlert({ settings, tasks, log, now = new Date() } = {}) {
    settings = settings || await this.getSettings();
    if (!settings.notifications.overdueEnabled) return { sent: false, reason: "DISABLED" };

    if (!this.hasSmtpConfig()) {
      if (!this.missingOverdueConfigLogged) {
        this.logger.info("Overdue email alerts are disabled because SMTP settings are missing.");
        this.missingOverdueConfigLogged = true;
      }
      return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
    }

    tasks = tasks || await this.taskStore.listTasks();
    const overdueTasks = this.getOverdueTasks(tasks);
    if (overdueTasks.length === 0) return { sent: false, reason: "NO_OVERDUE_TASKS" };

    log = log || await this.readReminderLog();
    const logKey = this.overdueLogKey(settings, now);
    if (log[logKey]) return { sent: false, reason: "ALREADY_SENT_THIS_HOUR" };

    const rows = overdueTasks.map((task, index) => {
      const daysOverdue = Math.abs(this.daysUntilDue(task.dueDate));
      return [
        `${index + 1}. ${task.title}`,
        task.description ? `   Description: ${task.description}` : "",
        `   Priority: ${task.priority}`,
        `   Due date: ${task.dueDate}`,
        `   Days overdue: ${daysOverdue}`
      ].filter(Boolean).join("\n");
    });
    const htmlTasks = overdueTasks.map((task) => ({
      ...task,
      daysOverdue: Math.abs(this.daysUntilDue(task.dueDate))
    }));

    try {
      const result = await this.sendMail({
        to: this.getConfig().to,
        subject: "To Do Task - Overdue Tasks Alert",
        body: [
          `Total overdue tasks: ${overdueTasks.length}`,
          "",
          "Overdue tasks:",
          ...rows
        ].join("\n"),
        html: renderOverdueAlertEmail({ language: this.defaultLanguage, tasks: htmlTasks })
      });

      if (result.sent) {
        log[logKey] = new Date().toISOString();
        log.lastOverdueAlertSentAt = log[logKey];
        if (!arguments[0]?.log) await this.writeReminderLog(log);
      }
      return result;
    } catch (error) {
      this.logger.warn("Overdue email alert failed:", error.message);
      return { sent: false, reason: "SEND_FAILED" };
    }
  }

  async sendDueSummary() {
    const settings = await this.getSettings();
    if (!settings.notifications.deadlineRemindersEnabled) return;
    const tasks = await this.taskStore.listTasks();
    const log = await this.readReminderLog();
    await this.sendPreDueReminders(tasks, log);
    await this.writeReminderLog(log);
  }

  async sendTaskCompletedEmail(task, language = this.defaultLanguage) {
    const settings = await this.getSettings();
    if (!settings.notifications.taskCompletedEmailEnabled) {
      return { sent: false, reason: "DISABLED" };
    }
    try {
      return await this.sendMail({
        to: this.getConfig().to,
        subject: "To Do Task - Task Completed",
        body: [
          `Title: ${task.title}`,
          task.description ? `Description: ${task.description}` : "",
          `Priority: ${task.priority}`,
          task.dueDate ? `Due date: ${task.dueDate}` : "",
          `Completed at: ${task.completedAt || new Date().toISOString()}`
        ].filter(Boolean).join("\n"),
        html: renderTaskCompletedEmail({ language, task })
      });
    } catch (error) {
      this.logger.warn("Task completion email failed:", error.message);
      return { sent: false, reason: "SEND_FAILED" };
    }
  }

  async sendLoginOtpEmail({ to, code, language = this.defaultLanguage }) {
    return this.sendMail({
      to,
      subject: "To Do Task - Login OTP",
      body: `Your OTP code is: ${code}\nThis code will expire in 10 minutes.`,
      html: renderOtpEmail({ language, code })
    });
  }

  async sendTestReminderEmail(language = this.defaultLanguage) {
    return this.sendMail({
      to: this.getConfig().to,
      subject: "To Do Task - Email Reminder Test",
      body: "Email reminder service is configured successfully.",
      html: renderDailyReportEmail({
        language,
        tasks: [],
        counts: { total: 0, high: 0, overdue: 0 }
      })
    });
  }

  async sendMail(message) {
    const transporter = this.getTransporter();
    if (!transporter) {
      return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
    }

    const config = this.getConfig();
    await transporter.sendMail({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.body,
      html: message.html
    });
    return { sent: true };
  }
}

module.exports = EmailReminderService;
