const fs = require("fs/promises");
const path = require("path");
const nodemailer = require("nodemailer");

class EmailReminderService {
  constructor({ taskStore, env = process.env, logger = console }) {
    this.taskStore = taskStore;
    this.env = env;
    this.logger = logger;
    this.interval = null;
    this.transporter = null;
    this.missingConfigLogged = false;
    this.logFile = path.join(process.cwd(), "data", "reminder-log.json");
    this.repeatWindowMs = Number(env.REMINDER_REPEAT_HOURS || 12) * 60 * 60 * 1000;
    this.dueSoonWindowMs = Number(env.REMINDER_DUE_SOON_HOURS || 24) * 60 * 60 * 1000;
  }

  start() {
    this.sendDueSummary().catch((error) => {
      this.logger.warn("Reminder check failed:", error.message);
    });

    this.interval = setInterval(() => {
      this.sendDueSummary().catch((error) => {
        this.logger.warn("Reminder check failed:", error.message);
      });
    }, 2 * 60 * 60 * 1000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
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
        this.logger.info("Email reminders are disabled because SMTP settings are missing.");
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

  shouldSendTaskReminder(task, log, now) {
    if (task.status === "completed" || !task.dueDate) return false;
    const dueTime = new Date(task.dueDate).getTime();
    if (!Number.isFinite(dueTime)) return false;
    if (dueTime > now + this.dueSoonWindowMs) return false;

    const lastSent = log[task.id] ? new Date(log[task.id]).getTime() : 0;
    return !lastSent || now - lastSent >= this.repeatWindowMs;
  }

  async sendDueSummary() {
    const tasks = await this.taskStore.listTasks();
    const now = Date.now();
    const log = await this.readReminderLog();
    const dueTasks = tasks.filter((task) => this.shouldSendTaskReminder(task, log, now));

    if (dueTasks.length === 0) return;

    const subject = `To Do Task reminder: ${dueTasks.length} task(s) due soon`;
    const body = dueTasks
      .map((task) => `- ${task.title} | ${task.priority} | due ${task.dueDate}`)
      .join("\n");

    await this.sendMail({
      to: this.env.REMINDER_TO || "yalshahrani@asda.gov.sa",
      subject,
      body
    });

    const sentAt = new Date(now).toISOString();
    for (const task of dueTasks) log[task.id] = sentAt;
    await this.writeReminderLog(log);
  }

  async sendTestReminderEmail() {
    return this.sendMail({
      to: this.getConfig().to,
      subject: "To Do Task - Email Reminder Test",
      body: "Email reminder service is configured successfully."
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
      text: message.body
    });
    return { sent: true };
  }
}

module.exports = EmailReminderService;
